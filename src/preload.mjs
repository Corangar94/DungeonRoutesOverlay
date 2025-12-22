import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => {
        const validChannels = ['toggle-mode', 'opacity-change', 'minimize-app', 'quit-app'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    setIgnoreMouseEvents: (ignore, options) => {
        ipcRenderer.send('set-ignore-mouse-events', ignore, options);
    },
    getHotkeys: () => ipcRenderer.invoke('get-hotkeys'),
    updateHotkey: (action, shortcut) => ipcRenderer.invoke('update-hotkey', action, shortcut)
});
