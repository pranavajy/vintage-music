const { contextBridge, ipcRenderer } = require('electron')

// Minimal, explicit bridge. Future integrations (music library, file
// dialogs) get added here as named methods, never raw ipcRenderer access.
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),

  spotify: {
    getState: () => ipcRenderer.invoke('spotify:getState'),
    command: (cmd) => ipcRenderer.invoke('spotify:command', cmd),
    query: (q) => ipcRenderer.invoke('spotify:query', q),
    onState: (listener) => {
      const handler = (_e, state) => listener(state)
      ipcRenderer.on('spotify:state', handler)
      return () => ipcRenderer.removeListener('spotify:state', handler)
    },
  },
})
