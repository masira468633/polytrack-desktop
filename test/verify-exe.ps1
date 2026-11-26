# Verifies a packaged PolyTrack executable:
#  - starts the app
#  - waits for its local game server
#  - checks index.html, WASM, GLB and audio range requests
#  - checks the process/window
#  - closes the app
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\test\verify-exe.ps1 -Exe ".\dist\PolyTrack-0.6.0-portable.exe"

param(
    [Parameter(Mandatory = $true)][string]$Exe,
    [int]$Port = 47821
)

$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path -LiteralPath $Exe).Path
Write-Host "Testing: $Exe" -ForegroundColor Cyan

Get-Process -Name 'PolyTrack' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

$appProcess = Start-Process -FilePath $Exe -PassThru
$base = "http://127.0.0.1:$Port"
$deadline = (Get-Date).AddSeconds(120)
$index = $null

while ((Get-Date) -lt $deadline) {
    try {
        $index = Invoke-WebRequest -Uri "$base/index.html" -UseBasicParsing -TimeoutSec 3
        if ($index.StatusCode -eq 200) { break }
    } catch {
        Start-Sleep -Milliseconds 750
    }
}

if (-not $index -or $index.StatusCode -ne 200) {
    Get-Process -Name 'PolyTrack' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    throw "The game server did not respond on port $Port within 120 seconds."
}

$wasm = Invoke-WebRequest -Uri "$base/polytrack_physics.wasm" -UseBasicParsing -TimeoutSec 30
$model = Invoke-WebRequest -Uri "$base/models/car.glb" -UseBasicParsing -TimeoutSec 30
$rangeRequest = [System.Net.HttpWebRequest]::Create("$base/audio/music.mp3")
$rangeRequest.AddRange(0, 1023)
$rangeRequest.Timeout = 30000
$rangeResponse = $rangeRequest.GetResponse()
$rangeStatus = [int]$rangeResponse.StatusCode
$rangeContentRange = $rangeResponse.Headers['Content-Range']
$rangeBytes = $rangeResponse.ContentLength
$rangeResponse.Close()

$track = Invoke-WebRequest -Uri "$base/tracks/official/summer1.track" -UseBasicParsing -TimeoutSec 30
$processes = @(Get-Process -Name 'PolyTrack' -ErrorAction SilentlyContinue)
$windowTitles = @($processes | Where-Object { $_.MainWindowTitle } | ForEach-Object { $_.MainWindowTitle })
$totalMemoryMb = [math]::Round((($processes | Measure-Object -Property WorkingSet64 -Sum).Sum) / 1MB, 1)

$result = [pscustomobject]@{
    indexStatus       = $index.StatusCode
    indexBytes        = $index.RawContentLength
    wasmStatus        = $wasm.StatusCode
    wasmContentType   = $wasm.Headers['Content-Type']
    wasmBytes         = $wasm.RawContentLength
    modelStatus       = $model.StatusCode
    modelContentType  = $model.Headers['Content-Type']
    audioRangeStatus  = $rangeStatus
    audioRangeHeader  = $rangeContentRange
    audioRangeBytes   = $rangeBytes
    trackStatus       = $track.StatusCode
    processCount      = $processes.Count
    windowTitles      = $windowTitles
    totalMemoryMb     = $totalMemoryMb
    serverReadyBefore = -not $appProcess.HasExited
}

$result | Format-List

# Give the renderer a moment, then close everything.
Start-Sleep -Seconds 3
Get-Process -Name 'PolyTrack' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if ($index.StatusCode -ne 200 -or $wasm.StatusCode -ne 200 -or $model.StatusCode -ne 200 -or $rangeStatus -ne 206 -or $track.StatusCode -ne 200) {
    throw 'One or more game resources failed to load from the packaged application.'
}

Write-Host 'PACKAGED APPLICATION OK' -ForegroundColor Green
