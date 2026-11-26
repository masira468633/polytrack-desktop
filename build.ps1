# Construit l'application Windows portable (.exe).
# Pour un installateur classique : npm run dist:installer
# Usage : clic droit > "Exécuter avec PowerShell", ou :
#   powershell -ExecutionPolicy Bypass -File .\build.ps1

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not (Test-Path -LiteralPath 'node_modules')) {
    Write-Host 'Installation des dépendances...' -ForegroundColor Cyan
    npm install --no-audit --no-fund
}

Write-Host 'Génération de l''icône et des exécutables...' -ForegroundColor Cyan
npm run dist

Write-Host ''
Write-Host 'Terminé. Fichiers générés dans dist\ :' -ForegroundColor Green
Get-ChildItem -LiteralPath 'dist' -Filter '*.exe' | ForEach-Object {
    Write-Host ("  - " + $_.Name + " (" + [math]::Round($_.Length / 1MB, 1) + " Mo)")
}
