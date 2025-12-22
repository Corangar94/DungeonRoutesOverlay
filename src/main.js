import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
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
    overlayCss_v2: `
      /* We used to display:none header/nav/footer, but now we relax it */
      body { overflow: hidden !important; } 
      /* Hide some common overlays that might block view */
      #consent-banner, .cookie-consent { display: none !important; }
    `,
    configureCss_v2: `
      /* Hide navbar to test if it's blocking clicks */
      .navbar, .navbar-header, .navbar-default { display: none !important; visibility: hidden !important; }
      
      /* Force all collapsed panels in sidebar to be visible */
      .route-planner-rail .collapse { display: block !important; height: auto !important; visibility: visible !important; }
      .route-planner-rail .collapse.in { display: block !important; }
      
      /* Ensure load buttons are clickable */
      .dungeon-guide-route__load { pointer-events: auto !important; cursor: pointer !important; }
      
      /* Make sidebar always visible and on top */
      .route-planner-rail { z-index: 99999 !important; }
    `
  }
});

// Force reset CSS values to ensure new CSS is applied (not cached old values)
store.reset('overlayCss_v2');
store.reset('configureCss_v2');

let win;
let isOverlayMode = false;     // Start in interactive "configure" mode
let overlayCssKey = null;     // key returned by insertCSS
let configureCssKey = null;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function applyCss(key) {
  try {
    if (win) {
      if (overlayCssKey) {
        await win.webContents.removeInsertedCSS(overlayCssKey);
        overlayCssKey = null;
      }
      if (configureCssKey) {
        await win.webContents.removeInsertedCSS(configureCssKey);
        configureCssKey = null;
      }

      const css = store.get(key);
      if (key === 'overlayCss_v2') {
        overlayCssKey = await win.webContents.insertCSS(css);
      } else {
        configureCssKey = await win.webContents.insertCSS(css);
      }
    }
  } catch (e) {
    console.error('applyCss failed:', e);
  }
}

async function setMode(overlayMode) {
  if (!win) return;
  isOverlayMode = overlayMode;

  if (isOverlayMode) {
    // Overlay mode: click-through, semi-transparent, no focus stealing
    win.setOpacity(store.get('overlayOpacity'));
    win.setIgnoreMouseEvents(true, { forward: true });
    win.setFocusable(false);
    await applyCss('overlayCss_v2');
  } else {
    // Configure mode: interactive, opaque, focusable, draggable
    win.setFocusable(true);
    win.setIgnoreMouseEvents(false);
    win.setOpacity(store.get('configureOpacity'));
    await applyCss('configureCss_v2');
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

const controlUiScript = `
  (function() {
    if (document.getElementById('mro-controls')) return;

    const div = document.createElement('div');
    div.id = 'mro-controls';
    div.innerHTML = \`
      <div class="mro-drag-handle">::</div>
      <button id="mro-btn-down" title="Lower Opacity">-</button>
      <button id="mro-btn-up" title="Higher Opacity">+</button>
      <button id="mro-btn-toggle" title="Toggle Overlay/Configure">M</button>
      <button id="mro-btn-settings" title="Settings">⚙</button>
      <button id="mro-btn-min" title="Minimize">_</button>
      <button id="mro-btn-quit" title="Quit" style="color: #ff5555">X</button>
    \`;

    const style = document.createElement('style');
    style.textContent = \`
      #mro-controls { position: fixed; top: 10px; right: 10px; z-index: 999999; background: rgba(40, 44, 52, 0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 4px 8px; display: flex; gap: 4px; align-items: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4); font-family: sans-serif; user-select: none; color: white; -webkit-app-region: drag; cursor: move; }
      .mro-drag-handle { color: rgba(255, 255, 255, 0.3); padding: 0 6px; font-weight: bold; }
      #mro-controls button { background: rgba(255, 255, 255, 0.1); border: none; color: white; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.2s; -webkit-app-region: no-drag; }
      #mro-controls button:hover { background: rgba(255, 255, 255, 0.2); }
      
      /* New Modal Styles */
      #mro-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 999998; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
      #mro-settings-modal { background: #282c34; border: 1px solid #444; border-radius: 8px; padding: 20px; width: 300px; color: white; font-family: sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
      #mro-settings-modal h2 { margin-top: 0; font-size: 18px; border-bottom: 1px solid #444; padding-bottom: 10px; }
      .mro-setting-row { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
      .mro-setting-label { font-size: 14px; color: #ccc; }
      .mro-keybind-btn { background: #1a1b26; border: 1px solid #555; color: #8bd; padding: 4px 8px; border-radius: 4px; cursor: pointer; min-width: 80px; text-align: center; }
      .mro-keybind-btn:hover { border-color: #8bd; }
      .mro-keybind-btn.recording { background: #853333; color: white; border-color: #ff5555; animation: pulse 1s infinite; }
      @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }
      #mro-modal-close { margin-top: 20px; width: 100%; padding: 8px; background: #444; border: none; color: white; border-radius: 4px; cursor: pointer; }
      #mro-modal-close:hover { background: #555; }
    \`;

    document.head.appendChild(style);
    document.body.appendChild(div);

    const send = (ch, data) => {
        if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send(ch, data);
        }
    };
    
    // Modal Logic
    let isRecording = false;
    
    async function showSettings() {
        if (document.getElementById('mro-modal-overlay')) return;
        
        // Disable ignore mouse events while in modal
        window.electronAPI.setIgnoreMouseEvents(false);
        div.style.display = 'none'; // hide control bar temporarily to avoid clutter

        const hotkeys = await window.electronAPI.getHotkeys();
        const overlay = document.createElement('div');
        overlay.id = 'mro-modal-overlay';
        
        const modal = document.createElement('div');
        modal.id = 'mro-settings-modal';
        
        let rowsHtml = '';
        const labels = {
            toggleVisible: 'Toggle Visibility',
            toggleMode: 'Toggle Mode',
            opacityUp: 'Opacity Up',
            opacityDown: 'Opacity Down',
            reload: 'Reload Page'
        };

        for (const [key, label] of Object.entries(labels)) {
            rowsHtml += \`
                <div class="mro-setting-row">
                    <span class="mro-setting-label">\${label}</span>
                    <button class="mro-keybind-btn" data-action="\${key}">\${hotkeys[key]}</button>
                </div>
            \`;
        }
        
        modal.innerHTML = \`
            <h2>Keybind Settings</h2>
            \${rowsHtml}
            <button id="mro-modal-close">Close</button>
        \`;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Handle Recording
        modal.querySelectorAll('.mro-keybind-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (isRecording) return;
                const action = btn.dataset.action;
                btn.classList.add('recording');
                btn.textContent = 'Press Key...';
                isRecording = true;
                
                const handler = async (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    
                    // Simple key mapper
                    let keys = [];
                    if (ev.ctrlKey) keys.push('Ctrl');
                    if (ev.shiftKey) keys.push('Shift');
                    if (ev.altKey) keys.push('Alt');
                    if (ev.metaKey) keys.push('Meta');
                    
                    let key = ev.key;
                    if (key === ' ') key = 'Space';
                    if (key.length === 1) key = key.toUpperCase();
                    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
                        keys.push(key);
                    }
                    
                    const shortcut = keys.join('+');
                    if (shortcut.length > 0 && !['Ctrl', 'Shift', 'Alt', 'Meta'].includes(shortcut)) {
                        btn.textContent = shortcut;
                        btn.classList.remove('recording');
                        isRecording = false;
                        document.removeEventListener('keydown', handler, true);
                        await window.electronAPI.updateHotkey(action, shortcut);
                    }
                };
                
                document.addEventListener('keydown', handler, true);
            });
        });

        document.getElementById('mro-modal-close').addEventListener('click', () => {
            if (isRecording) return;
            document.body.removeChild(overlay);
            div.style.display = 'flex'; // show control bar again
            // Re-apply ignore logic if needed (handled by mouseleave on control bar)
        });
    }

    document.getElementById('mro-btn-down').addEventListener('click', () => send('opacity-change', -0.1));
    document.getElementById('mro-btn-up').addEventListener('click', () => send('opacity-change', 0.1));
    document.getElementById('mro-btn-toggle').addEventListener('click', () => send('toggle-mode'));
    document.getElementById('mro-btn-settings').addEventListener('click', showSettings);
    document.getElementById('mro-btn-min').addEventListener('click', () => send('minimize-app'));
    document.getElementById('mro-btn-quit').addEventListener('click', () => send('quit-app'));

    // Enable interaction in overlay mode
    div.addEventListener('mouseenter', () => {
        window.electronAPI.setIgnoreMouseEvents(false);
    });
    div.addEventListener('mouseleave', () => {
        // Only return to ignore if we are in overlay mode
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    });
    
    // DEBUG: Log ALL clicks to diagnose blocked elements
    document.addEventListener('click', (e) => {
        console.log('[MRO DEBUG] Click detected on:', e.target.tagName, e.target.className, e.target.id);
        console.log('[MRO DEBUG] Full path:', e.composedPath().map(el => el.tagName + '.' + (el.className || '')).slice(0, 5).join(' > '));
    }, true);
    
    // DEBUG: Watch for clicks specifically on load route buttons
    setTimeout(() => {
        const loadBtns = document.querySelectorAll('.dungeon-guide-route__load');
        console.log('[MRO DEBUG] Found', loadBtns.length, 'load buttons');
        
        // Check what element is being rendered at each button's position
        loadBtns.forEach((btn, i) => {
            const rect = btn.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const elementAtPoint = document.elementFromPoint(centerX, centerY);
            
            console.log('[MRO DEBUG] Button', i, 'at', centerX.toFixed(0), centerY.toFixed(0));
            console.log('[MRO DEBUG] Element at that point:', elementAtPoint?.tagName, elementAtPoint?.className, elementAtPoint?.id);
            console.log('[MRO DEBUG] Is button blocked?', elementAtPoint !== btn && !btn.contains(elementAtPoint));
            
            btn.addEventListener('click', () => {
                console.log('[MRO DEBUG] Load button', i, 'clicked!');
            }, true);
        });
    }, 3000);
  })();
`;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(app.getAppPath(), '.vite/build/preload.mjs')
    }
  });

  win.setMenu(null); // Remove default menu bar

  // Ensure we load the correct URL, as store might be corrupted by previous about:blank test
  const targetUrl = METHOD_DEFAULT_URL;
  store.set('routeUrl', targetUrl);
  console.log('[MRO Main] Force loading URL:', targetUrl);

  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadURL(targetUrl);

  win.webContents.on('did-navigate', () => store.set('routeUrl', win.webContents.getURL()));
  win.webContents.on('did-navigate-in-page', () => store.set('routeUrl', win.webContents.getURL()));

  win.webContents.on('did-start-loading', () => {
    overlayCssKey = null;
    configureCssKey = null;
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[MRO Main] did-fail-load:', errorCode, errorDescription);
  });

  // Handle new windows (e.g. login popups, external links)
  win.webContents.setWindowOpenHandler(({ url }) => {
    // If it's a method.gg link, try to open in-app or system? 
    // Usually safest to open everything else in system browser to avoid breaking the overlay app
    // But for "Load Route" strictly, if it's a navigation, it should be fine. 
    // If it opens a popup, we allow it if it looks internal, otherwise system.
    if (url.startsWith('https://www.method.gg')) {
      return { action: 'allow' };
    }
    // External links open in browser
    import('electron').then(({ shell }) => shell.openExternal(url));
    return { action: 'deny' };
  });

  win.webContents.on('dom-ready', () => {
  });

  win.webContents.on('did-finish-load', async () => {
    await setMode(isOverlayMode);
    await win.webContents.executeJavaScript(controlUiScript);
    if (!win.isVisible()) {
      win.showInactive();
    }
  });
}

function registerIpc() {
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    if (isOverlayMode && win) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });
  ipcMain.on('toggle-mode', () => setMode(!isOverlayMode));
  ipcMain.on('opacity-change', (event, delta) => bumpOpacity(delta));
  ipcMain.on('minimize-app', () => { if (win) win.minimize(); });
  ipcMain.on('quit-app', () => app.quit());

  ipcMain.handle('get-hotkeys', () => store.get('hotkeys'));
  ipcMain.handle('update-hotkey', (event, action, shortcut) => {
    const hk = store.get('hotkeys');
    hk[action] = shortcut;
    store.set('hotkeys', hk);
    registerHotkeys(); // Re-register with new keys
    return true;
  });
}

function registerHotkeys() {
  globalShortcut.unregisterAll(); // Clear old keys before registering new ones
  const hk = store.get('hotkeys');
  try {
    globalShortcut.register(hk.toggleVisible, toggleVisible);
    globalShortcut.register(hk.toggleMode, () => setMode(!isOverlayMode));
    globalShortcut.register(hk.opacityUp, () => bumpOpacity(+0.05));
    globalShortcut.register(hk.opacityDown, () => bumpOpacity(-0.05));
    globalShortcut.register(hk.reload, () => { if (win) win.webContents.reload(); });
  } catch (e) {
    console.error('Failed to register hotkeys:', e);
  }
}

app.whenReady().then(() => {
  registerIpc();
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
