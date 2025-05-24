export class NativeBridge {
  private static instance: NativeBridge;
  private callbacks: Record<string, ((...args: unknown[]) => void)[]> = {};

  private constructor() {
    if (!window.NativeBridgeCallbacks) {
      window.NativeBridgeCallbacks = {};
    }

    window.NativeBridge = this;

    window.NativeBridge.once('ping-pong', (msg: String) => {
      console.log(msg)
    })
  }

  public static getInstance(): NativeBridge {
    if (!NativeBridge.instance) {
      NativeBridge.instance = new NativeBridge();
    }
    return NativeBridge.instance;
  }

  public send(channel: string, ...args: any[]): void {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send(channel, ...args);
    }
    else if (window.AndroidBridge) {
      const message = JSON.stringify({ channel, args });
      window.AndroidBridge.postMessage(message);
    } else {
      console.warn(`NativeBridge: No bridge available for channel "${channel}"`);
    }
  }

  public on(channel: string, func: ((...args: any[]) => void) | string): () => void {
    const callback = typeof func === 'string' ?
      (...args: unknown[]) => {
        if (window.NativeBridgeCallbacks[func]) {
          window.NativeBridgeCallbacks[func](...args);
        }
      } : func;

    if (window.electron && window.electron.ipcRenderer) {
      return window.electron.ipcRenderer.on(channel, callback);
    }

    if (!this.callbacks[channel]) {
      this.callbacks[channel] = [];
    }

    this.callbacks[channel].push(callback);


    return () => {
      this.callbacks[channel] = this.callbacks[channel].filter(cb => cb !== callback);
    };
  }

  public once(channel: string, func: ((...args: any[]) => void) | string): void {
    const callback = typeof func === 'string' ?
      (...args: unknown[]) => {
        if (window.NativeBridgeCallbacks[func]) {
          window.NativeBridgeCallbacks[func](...args);
        }
      } : func;

    if (window.electron && window.electron.ipcRenderer) {
      return window.electron.ipcRenderer.once(channel, callback);
    }

    const onceWrapper = (...args: unknown[]) => {
      callback(...args);
      this.off(channel, onceWrapper);
    };

    this.on(channel, onceWrapper);
  }

  private off(channel: string, func: (...args: unknown[]) => void): void {
    if (this.callbacks[channel]) {
      this.callbacks[channel] = this.callbacks[channel].filter(cb => cb !== func);
    }
  }

  public ping(): void {
    console.log(`[NativeBridge Ping-Pong]`);
    this.send('ping-pong', "Ping!");
  }

  public receive(channel: string, ...args: unknown[]): void {
    if (this.callbacks[channel]) {
      this.callbacks[channel].forEach(callback => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`NativeBridge: Error in callback for channel "${channel}":`, e);
        }
      });
    }
  }

  public async get(key: string) {
    if (window.electron) {
      return await window.electron.ipcRenderer.invoke("storage_get", key);
    } else if (window.AndroidBridge) {
      try {
        const obj = window.AndroidBridge.get(key)
        return JSON.parse(obj);
      } catch {
        return null
      }
    }
    return null
  }

  public async set(key: string, value: any) {
    if (window.electron) {
      await window.electron.ipcRenderer.invoke("storage_set", key, value);
    } else if (window.AndroidBridge) {
      window.AndroidBridge.set(key, JSON.stringify(value));
    }
  }

  public async getVersion() {
    if (window.electron) {
      return await window.electron.ipcRenderer.invoke("getVersion") as string;
    } else if (window.AndroidBridge) {
      return window.AndroidBridge.getVersion();
    }
    return null;
  }

  public async getPlatform() {
    if (window.electron) {
      return await window.electron.ipcRenderer.invoke("getPlatform") as string;
    } else if (window.AndroidBridge) {
      return window.AndroidBridge.getPlatform();
    }
    return null;
  }

  public receiveJSON(jsonMessage: string): void {
    try {
      const parsed = JSON.parse(jsonMessage);

      if (!parsed.channel || !parsed.args) {
        console.error('NativeBridge: Invalid JSON message format. Expected {channel: string, args: any[]}');
        return;
      }

      const { channel, args } = parsed;

      this.receive(channel, ...args);

    } catch (e) {
      console.error('NativeBridge: Error parsing JSON message:', e);
    }
  }

}
