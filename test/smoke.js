'use strict';

/**
 * Automated smoke test: loads the real game exactly like the packaged app and
 * verifies that it initializes: DOM UI, WebGL canvas, render loop, audio,
 * network requests and console errors.
 *
 * Usage:
 *   npx electron test/smoke.js
 *
 * Optional:
 *   SMOKE_WAIT_MS=15000   time to let the game load
 *   SMOKE_CAPTURE=1       also try to save test/smoke.png (needs a display)
 */

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, session } = require('electron');
const { startStaticServer } = require('../server');

const waitMs = Number(process.env.SMOKE_WAIT_MS || 15000);
const capture = process.env.SMOKE_CAPTURE === '1';

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

const logs = [];
const network = [];

app.whenReady().then(async () => {
  const { server, url } = await startStaticServer(path.join(__dirname, '..', 'game'), 47911);

  session.defaultSession.webRequest.onCompleted((details) => {
    if (details.statusCode >= 400) {
      network.push(`[http ${details.statusCode}] ${details.method} ${details.url}`);
    }
  });
  session.defaultSession.webRequest.onErrorOccurred((details) => {
    network.push(`[net-error ${details.error}] ${details.method} ${details.url}`);
  });

  // Same online-API compatibility layer as the real app (see main.js).
  const localOrigin = new URL(url).origin;
  const apiFilter = { urls: ['https://vps.kodub.com/*'] };
  session.defaultSession.webRequest.onBeforeSendHeaders(apiFilter, (details, callback) => {
    details.requestHeaders.Origin = 'https://www.kodub.com';
    details.requestHeaders.Referer = 'https://www.kodub.com/';
    callback({ requestHeaders: details.requestHeaders });
  });
  session.defaultSession.webRequest.onHeadersReceived(apiFilter, (details, callback) => {
    const headers = details.responseHeaders || {};
    for (const name of Object.keys(headers)) {
      const lower = name.toLowerCase();
      if (lower === 'access-control-allow-origin' || lower === 'access-control-allow-credentials') delete headers[name];
    }
    headers['Access-Control-Allow-Origin'] = [localOrigin];
    headers['Access-Control-Allow-Credentials'] = ['true'];
    callback({ responseHeaders: headers });
  });

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    backgroundColor: '#28346a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  win.webContents.on('console-message', (...args) => {
    if (args[1] && typeof args[1] === 'object') {
      logs.push(`[console:${args[1].level}] ${args[1].message}`);
    } else {
      logs.push(`[console:${args[1]}] ${args[2]}`);
    }
  });

  win.webContents.on('did-fail-load', (_event, code, description, failedUrl, isMainFrame) => {
    if (isMainFrame) logs.push(`[fail-load] ${code} ${description} ${failedUrl}`);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    logs.push(`[render-gone] ${JSON.stringify(details)}`);
  });

  await win.loadURL(url);
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const info = await win.webContents.executeJavaScript(`(async () => {
    const canvas = document.getElementById('screen');
    const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    let frames = 0;
    const start = performance.now();
    await Promise.race([
      new Promise((resolve) => {
        const tick = () => {
          frames += 1;
          if (performance.now() - start < 1000) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      }),
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);

    const ui = document.getElementById('ui');
    const buttons = ui ? Array.from(ui.querySelectorAll('button, [role="button"], .button')).map((el) => (el.innerText || '').trim()).filter(Boolean).slice(0, 30) : [];
    const storage = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      storage[key] = String(localStorage.getItem(key) || '').length;
    }

    return {
      title: document.title,
      href: location.href,
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      webgl: Boolean(gl),
      webgl2: Boolean(gl && typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext),
      glViewport: gl ? Array.from(gl.getParameter(gl.VIEWPORT)) : null,
      glProgram: gl ? Boolean(gl.getParameter(gl.CURRENT_PROGRAM)) : null,
      glError: gl ? gl.getError() : null,
      rafFramesPerSecond: frames,
      uiChildren: ui ? ui.childElementCount : -1,
      uiText: ui ? (ui.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 500) : '',
      buttons,
      localStorageKeys: Object.keys(storage),
      storage,
      hasAudio: Boolean(window.AudioContext || window.webkitAudioContext)
    };
  })()`);

  if (capture) {
    try {
      const image = await win.webContents.capturePage();
      const outputPath = path.join(__dirname, 'smoke.png');
      fs.writeFileSync(outputPath, image.toPNG());
      console.log('screenshot:', outputPath);
    } catch (error) {
      console.log('screenshot unavailable:', error.message);
    }
  }

  console.log('--- game info ---');
  console.log(JSON.stringify(info, null, 2));
  console.log('--- network problems ---');
  console.log(network.length ? network.join('\n') : '(none)');
  console.log('--- renderer logs ---');
  console.log(logs.length ? logs.join('\n') : '(no logs)');

  const errors = logs.filter((line) => /\[console:(3|error)\]|fail-load|render-gone/.test(line));
  server.close();
  app.exit(errors.length ? 2 : 0);
}).catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  app.exit(1);
});
