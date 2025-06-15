import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { promises as fs } from 'fs';
import { RunAsAdmin } from '../libs/Admin';
import { argv, env, send } from 'process';
import { getPipePath, TCPServer } from '../libs/server-client';
import { APP_TEMP_DIR_NAME, NotificationType, PIE_NAME } from '../data/const';
import Store from 'electron-store';
import { wait } from '../libs/async'
;
const os = require('os')
const { updateElectronApp } = require('update-electron-app')

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow;
let server: TCPServer;

class MessageQueue {
  private queue: Array<{ channel: string; args: any[] }> = [];
  private isMainWindowReady = false;

  setMainWindowReady() {
    this.isMainWindowReady = true;
    this.flushQueue();
  }

  enqueue(channel: string, ...args: any[]) {
    this.queue.push({ channel, args });
    if (this.isMainWindowReady) {
      this.flushQueue();
    }
  }

  private flushQueue() {
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      if (message && mainWindow) {
        mainWindow.webContents.send(message.channel, ...message.args);
      }
    }
  }
}

const messageQueue = new MessageQueue();

function sendToWeb(channel: string, ...args: any[]) {
  if (mainWindow) {
    mainWindow.webContents.send(channel, ...args);
  } else {
    messageQueue.enqueue(channel, ...args);
  }
}

function sendNotification(type: NotificationType, title: string, content: string) {
  sendToWeb("notification", type, title, content)
}

async function createConfigFile(config: string) {
  try {
    const configPath = path.join(app.getPath("temp"), APP_TEMP_DIR_NAME);
    await fs.mkdir(configPath, { recursive: true });

    const configFilePath = path.join(configPath, "config.json");
    await fs.writeFile(
      configFilePath,
      config,
      'utf-8'
    );

    console.log(`Config file created at: ${configFilePath}`);
    return configFilePath;
  } catch (error) {
    console.error('Error creating config file:', error);
    throw error;
  }
}

export const App = () => {

  updateElectronApp()

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('paki', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('paki')
  }

  const createWindow = (): void => {
    if(mainWindow) return;

    mainWindow = new BrowserWindow({
      height: 700,
      width: 500,
      minHeight: 700,
      minWidth: 500,
      center: true,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
    });

    mainWindow.loadURL(env.DEV_WEB_URL || "https://pakivpn.github.io/")

    if(env.DEV) mainWindow.webContents.openDevTools();
    else  mainWindow.setMenu(null);
  };

  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    return app.quit()
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
      sendToWeb("deeplink",commandLine.pop())
    })

    try{
      const str = argv[1];
      if(str.startsWith("paki:"))
        sendToWeb("deeplink",str)
    }
    catch(ex)
    {

    }
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  ipcMain.on('ping-pong', (_, msg) => {
    sendToWeb("ping-pong", "Pong!")
    messageQueue.setMainWindowReady()
  })

  ipcMain.on('start', async (_, config: string) => {
    try {
      console.log(server.getClientsCount())
      if (config && config.length != 0) await createConfigFile(config);
      if (server.getClientsCount() == 0) {
        sendNotification("warning", "Запускаем сервис", `${process.execPath} ${env.DEV ? process.cwd() : "--"} --service`);
        await RunAsAdmin(`${process.execPath} ${env.DEV ? process.cwd() : "--"} --service`)
        await wait(4)
        sendNotification("success", "Сервис запушен", "");
      };
    }
    catch (ex) {
      return sendNotification("error", "Ошибка при запуске сервиса", ex.toString())
    }

    server.sendAll("start")
  })

  ipcMain.on('stop', async (_, config: string) => {
    server.sendAll("stop")
  })

  ipcMain.on('status', (_, msg) => {
    server.sendAll("status")
  })

  ipcMain.on('open', (_, msg) => {
    shell.openExternal(msg)
  })

  server = new TCPServer(getPipePath(PIE_NAME))

  server.receive("init", (client) => {
    server.send(client, "init", "Ping!")
  });

  server.receive("log", (client, data, isError) => {
    console.log("[SERVICE]:", data)
    if (isError) sendNotification("error", "Ошибка сервиса", data)
    sendToWeb("log", data)
  })

  server.receive("status", (client, status) => {
    sendToWeb("status", status)
  })

  const store = new Store();

  ipcMain.handle('storage_get', (event, key: string) => {
    try {
      return store.get(key);
    } catch (error) {
      console.error('Error getting from store:', error);
      return null;
    }
  });

  ipcMain.handle('storage_set', (event, key: string, value) => {
    try {
      store.set(key, value);
      return true;
    } catch (error) {
      console.error('Error setting store value:', error);
      return false;
    }
  });

  ipcMain.handle("getVersion",(event)=>{
    return app.getVersion();
  })

  ipcMain.handle("getPlatform",(event)=>{
    return os.platform()
  })

  app.on('ready', createWindow);
}
