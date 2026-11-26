'use strict';

const path = require('path');
const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  powerSaveBlocker,
  session,
  shell
} = require('electron');

const { startStaticServer } = require('./server');

const GAME_DIR = path.join(__dirname, 'game');
const APP_ICON = path.join(__dirname, 'build', 'icon.png');
const APP_ID = 'com.polytrack.desktop';

// The official PolyTrack API only accepts requests coming from its own website.
// The game is served locally, so for that single host we send the expected
// Origin and mirror the CORS response back to our local origin. This keeps the
// user profile / leaderboards working exactly like in the browser version.
const KODUB_API_URL_FILTER = { urls: ['https://vps.kodub.com/*'] };
const KODUB_API_ORIGIN = 'https://www.kodub.com';

// Make sure audio (music/engine sounds) can start without a click, like a
// real game would.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Smoother rendering for a fast-paced racing game.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

app.setAppUserModelId(APP_ID);

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {import('http').Server | null} */
let gameServer = null;
/** @type {string | null} */
let gameUrl = null;
let powerSaveBlockerId = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(bootstrap).catch(handleFatalError);
}

async function bootstrap() {
  Menu.setApplicationMenu(null);

  // The game only needs standard web APIs; deny every optional permission.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'fullscreen' || permission === 'pointerLock');
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'fullscreen' || permission === 'pointerLock';
  });

  try {
    const { server, url } = await startStaticServer(GAME_DIR);
    gameServer = server;
    gameUrl = url;
  } catch (error) {
    handleFatalError(
      new Error(
        `Impossible de démarrer le serveur local du jeu.\n\n${error && error.message ? error.message : error}`
      )
    );
    return;
  }

  installOnlineCompatibility(gameUrl);

  createMainWindow();

  // Keep the screen awake while playing.
  try {
    powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
  } catch {
    powerSaveBlockerId = null;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
}

function installOnlineCompatibility(gameUrlString) {
  const localOrigin = new URL(gameUrlString).origin;

  session.defaultSession.webRequest.onBeforeSendHeaders(KODUB_API_URL_FILTER, (details, callback) => {
    const requestHeaders = details.requestHeaders;
    requestHeaders.Origin = KODUB_API_ORIGIN;
    requestHeaders.Referer = `${KODUB_API_ORIGIN}/`;
    callback({ requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived(KODUB_API_URL_FILTER, (details, callback) => {
    const responseHeaders = details.responseHeaders || {};

    for (const name of Object.keys(responseHeaders)) {
      const lower = name.toLowerCase();
      if (lower === 'access-control-allow-origin' || lower === 'access-control-allow-credentials') {
        delete responseHeaders[name];
      }
    }

    responseHeaders['Access-Control-Allow-Origin'] = [localOrigin];
    responseHeaders['Access-Control-Allow-Credentials'] = ['true'];

    callback({ responseHeaders });
  });
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 540,
    title: 'PolyTrack',
    backgroundColor: '#28346a',
    show: false,
    autoHideMenuBar: true,
    icon: APP_ICON,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webgl: true,
      spellcheck: false,
      backgroundThrottling: false,
      devTools: true
    }
  });

  mainWindow = window;
  window.setMenuBarVisibility(false);

  // Open external links (Discord, terms, ...) in the user's browser, never
  // inside the game window.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!gameUrl || !url.startsWith(gameUrl)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  // Drop of a file onto the window should not replace the game.
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());

  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.key === 'F11') {
      event.preventDefault();
      window.setFullScreen(!window.isFullScreen());
      return;
    }

    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      event.preventDefault();
      window.webContents.toggleDevTools();
    }
  });

  window.webContents.on('did-finish-load', () => {
    window.webContents.focus();
  });

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // -3 (ABORTED) is normal when a navigation is superseded.
    if (!isMainFrame || errorCode === -3) return;
    dialog.showErrorBox(
      'PolyTrack',
      `Le jeu n'a pas pu se charger.\n\n${errorDescription} (${errorCode})\n${validatedURL}`
    );
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return;
    const choice = dialog.showMessageBoxSync(window, {
      type: 'error',
      title: 'PolyTrack',
      message: 'Le jeu a rencontré un problème et s\'est arrêté.',
      detail: `Raison : ${details.reason}${details.exitCode !== undefined ? ` (code ${details.exitCode})` : ''}`,
      buttons: ['Redémarrer le jeu', 'Fermer'],
      defaultId: 0,
      cancelId: 1
    });
    if (choice === 0) window.reload();
    else window.close();
  });

  window.once('ready-to-show', () => {
    window.maximize();
    window.show();
    window.focus();
  });

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  window.loadURL(gameUrl);
}

function handleFatalError(error) {
  const message = error && error.stack ? error.stack : String(error);
  console.error(message);
  try {
    dialog.showErrorBox('PolyTrack - Erreur', message);
  } catch {
    // Dialog may be unavailable if the app is not ready yet.
  }
  app.exit(1);
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  if (powerSaveBlockerId !== null) {
    try {
      powerSaveBlocker.stop(powerSaveBlockerId);
    } catch {
      // Ignore.
    }
    powerSaveBlockerId = null;
  }
  if (gameServer) {
    try {
      gameServer.close();
    } catch {
      // Ignore.
    }
    gameServer = null;
  }
});
