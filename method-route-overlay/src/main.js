import { app, BrowserWindow, globalShortcut } from 'electron';
import Store from 'electron-store';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const METHOD_DEFAULT_URL =
  'https://www.method.gg/fellowship/route-planner/cithrels-fall';

// Persistent config (opacity, url, hotkeys, css)
const store = new Store({
  defaults: {
    routeUrl: METHOD_DEFAULT_URL,
    overlayOpacity: 0.80,
    configureOpacity: 1.00,

    hotkeys: {
      toggleVisible: 'Alt+M',
      toggleMode: 'Alt+Shift+M',
      opacityUp: 'Alt+]',
      opacityDown: 'Alt+[',
      reload: 'Alt+R'
    },

    // You will likely tweak this using DevTools inspection.
    // Keep it conservative at first.
    overlayCss: `
      header, nav, footer { display: none !important; }
      body { overflow: hidden !important; }
    `
  }
});

let win;
let isOverlayMode = true;     // overlay vs configure
let overlayCssKey = null;     // key returned by insertCSS

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function applyOverlayCss() {
  try {
    if (!overlayCssKey && win) {
      overlayCssKey = await win.webContents.insertCSS(store.get('overlayCss'));
    }
  } catch (e) {
    console.error('insertCSS failed:', e);
  }
}

async function removeOverlayCss() {
  try {
    if (overlayCssKey && win) {
      await win.webContents.removeInsertedCSS(overlayCssKey);
      overlayCssKey = null;
    }
  } catch (e) {
    console.error('removeInsertedCSS failed:', e);
  }
}

async function setMode(overlayMode) {
  if (!win) return;
  isOverlayMode = overlayMode;

  if (isOverlayMode) {
    // Overlay mode: click-through, semi-transparent, no focus stealing
    win.setOpacity(store.get('overlayOpacity')); // setOpacity exists on BaseWindow
    win.setIgnoreMouseEvents(true, { forward: true }); // click-through
    win.setFocusable(false); // keep it from grabbing focus (method documented on BaseWindow)
    await applyOverlayCss();
  } else {
    // Configure mode: interactive, opaque, focusable
    win.setFocusable(true);
    win.setIgnoreMouseEvents(false);
    win.setOpacity(store.get('configureOpacity'));
    await removeOverlayCss();
    win.focus();
  }
}

function toggleVisible() {
  if (!win) return;
  if (win.isVisible()) {
    win.hide();
  } else {
    // showInactive shows without focusing (good for games)
    win.showInactive();
    win.moveTop(); // keep z-order high; BaseWindow method exists
  }
}

function bumpOpacity(delta) {
  const next = clamp(store.get('overlayOpacity') + delta, 0.15, 1.0);
  store.set('overlayOpacity', next);
  if (isOverlayMode && win) win.setOpacity(next);
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,

    // Transparent overlay basics
    frame: false,
    transparent: true, // transparent windows (frameless required on Windows)
    backgroundColor: '#00000000',

    // Always-on-top overlay
    alwaysOnTop: true,
    skipTaskbar: true,

    webPreferences: {
      // Security: keep Node out of the remote page
      contextIsolation: true, // recommended when loading remote content
      nodeIntegration: false
    }
  });

  // Stay above other windows. You can try 'screen-saver' for strong always-on-top.
  win.setAlwaysOnTop(true, 'screen-saver');

  // Load last used URL (or default)
  win.loadURL(store.get('routeUrl')); // webContents.loadURL exists (official docs)

  // Optional: persist URL if Method changes it (SPA navigation, etc.)
  win.webContents.on('did-navigate', () => store.set('routeUrl', win.webContents.getURL()));
  win.webContents.on('did-navigate-in-page', () => store.set('routeUrl', win.webContents.getURL()));

  // Reset CSS key on navigation/reload so it can be re-applied
  win.webContents.on('did-start-loading', () => {
    overlayCssKey = null;
  });

  win.webContents.on('did-finish-load', async () => {
    // Re-apply mode settings (including CSS) after load
    await setMode(isOverlayMode);

    // Ensure window is visible after load if it was meant to be shown (or just show it initially)
    if (!win.isVisible()) {
      win.showInactive();
    }
  });
}

function registerHotkeys() {
  const hk = store.get('hotkeys');

  // Global shortcuts work even if app does not have focus
  globalShortcut.register(hk.toggleVisible, toggleVisible);
  globalShortcut.register(hk.toggleMode, () => setMode(!isOverlayMode));
  globalShortcut.register(hk.opacityUp, () => bumpOpacity(+0.05));
  globalShortcut.register(hk.opacityDown, () => bumpOpacity(-0.05));
  globalShortcut.register(hk.reload, () => { if (win) win.webContents.reload(); });
}

app.whenReady().then(() => {
  createWindow();
  registerHotkeys();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll(); // recommended cleanup
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
