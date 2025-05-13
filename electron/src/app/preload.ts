// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel: any, ...args: any[]) => ipcRenderer.send(channel, ...args),
        on: (channel: any, listener: (...args: any[]) => void) => {
            const subscription = (_event: any, ...args: unknown[]) =>
                listener(...args);
              ipcRenderer.on(channel, subscription);
            
              return () => {
                ipcRenderer.removeListener(channel, subscription);
              };
        },
        once: (channel: any, func: (...args: any[]) => void) => {
            ipcRenderer.once(channel, (_event:any, ...args:any[]) => func(...args));
        },
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
    }
});