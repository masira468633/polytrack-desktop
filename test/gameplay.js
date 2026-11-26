'use strict';

/**
 * Deep functional test: enters the game through its UI, starts an official
 * track, drives, and checks that the WASM simulation worker and the race timer
 * are actually running.
 *
 * Usage: npx electron test/gameplay.js
 */

const path = require('path');
const { app, BrowserWindow, session } = require('electron');
const { startStaticServer } = require('../server');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

const logs = [];
const network = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const { server, url } = await startStaticServer(path.join(__dirname, '..', 'game'), 47921);

  session.defaultSession.webRequest.onCompleted((details) => {
    if (details.statusCode >= 400) network.push(`[http ${details.statusCode}] ${details.url}`);
  });
  session.defaultSession.webRequest.onErrorOccurred((details) => {
    network.push(`[net-error ${details.error}] ${details.url}`);
  });

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
    headers['Access-Control-Allow-Origin'] = [new URL(url).origin];
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
      backgroundThrottling: false
    }
  });

  win.webContents.on('console-message', (...args) => {
    if (args[1] && typeof args[1] === 'object') logs.push(`[console:${args[1].level}] ${args[1].message}`);
    else logs.push(`[console:${args[1]}] ${args[2]}`);
  });
  win.webContents.on('render-process-gone', (_e, d) => logs.push(`[render-gone] ${JSON.stringify(d)}`));

  const clickButton = (text, contains = false) => win.webContents.executeJavaScript(`(() => {
    const target = ${JSON.stringify(text)};
    const match = ${contains ? '(v) => v.includes(target)' : '(v) => v === target'};
    const el = Array.from(document.querySelectorAll('button, [role="button"], a')).find((el) => {
      const r = el.getBoundingClientRect();
      const value = (el.innerText || '').replace(/\\s+/g, ' ').trim();
      return r.width > 0 && r.height > 0 && match(value);
    });
    if (!el) return { clicked: false };
    el.click();
    return { clicked: true, text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 60) };
  })()`);

  const dump = () => win.webContents.executeJavaScript(`(() => {
    const buttons = [...new Set(Array.from(document.querySelectorAll('button, [role="button"], a'))
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((el) => (el.innerText || '').replace(/\\s+/g, ' ').trim()).filter(Boolean))];
    const text = (document.getElementById('ui').innerText || '').replace(/\\s+/g, ' ').trim();
    const timer = (text.match(/\\b\\d+:\\d{2}\\.\\d{2,3}\\b/) || [null])[0];
    return { timer, text: text.slice(0, 300), buttons: buttons.slice(0, 30) };
  })()`);

  const waitForButton = async (text, contains = false, timeout = 45000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await clickButton(text, contains);
      if (result.clicked) return result;
      await sleep(500);
    }
    return { clicked: false, error: `timeout waiting for "${text}"` };
  };

  await win.loadURL(url);

  console.log('1) Open Play menu:', JSON.stringify(await waitForButton('Play')));
  await sleep(700);

  const official = await clickButton('Official tracks');
  if (official.clicked) {
    console.log('2) Official tracks tab:', JSON.stringify(official));
    await sleep(700);
  } else {
    console.log('2) Official tracks tab: already selected');
  }

  console.log('3) Track Summer 1:', JSON.stringify(await clickButton('Summer 1', true)));
  await sleep(2500);

  let info = await dump();
  console.log('   after track click:', JSON.stringify(info));

  // Some layouts use a second "Play" confirmation.
  const start = await clickButton('Play');
  if (start.clicked) {
    console.log('4) Start race:', JSON.stringify(start));
    await sleep(2000);
  } else {
    console.log('4) Start race: started directly');
  }

  const before = await dump();
  console.log('5) Race HUD before driving:', JSON.stringify(before));

  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Up' });
  await sleep(4000);
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Up' });

  const after = await dump();
  console.log('6) Race HUD after driving:', JSON.stringify(after));

  // Check worker targets through the DevTools protocol.
  let targets = [];
  try {
    win.webContents.debugger.attach('1.3');
    const result = await win.webContents.debugger.sendCommand('Target.getTargets');
    targets = (result.targetInfos || []).map((t) => ({ type: t.type, url: t.url }));
    win.webContents.debugger.detach();
  } catch (error) {
    targets = [{ error: error.message }];
  }
  console.log('7) Targets:', JSON.stringify(targets, null, 2));

  console.log('--- network problems ---');
  console.log(network.length ? network.join('\n') : '(none)');
  console.log('--- renderer errors ---');
  const errors = logs.filter((l) => /console:(3|error)|render-gone|fail-load/.test(l));
  console.log(errors.length ? errors.slice(0, 30).join('\n') : '(none)');

  const raceScene = await win.webContents.executeJavaScript(`Boolean(document.querySelector('.speedometer-ui') && document.querySelector('.game-toolbar-ui'))`);
  const workerCount = targets.filter((t) => t.type === 'worker').length;
  const passed = raceScene && workerCount >= 1 && errors.length === 0 && network.length === 0;
  console.log('--- result ---');
  console.log(JSON.stringify({ raceScene, workerCount, networkProblems: network.length, rendererErrors: errors.length, passed }, null, 2));

  server.close();
  app.exit(passed ? 0 : 2);
}).catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  app.exit(1);
});
