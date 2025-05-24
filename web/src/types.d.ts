import { NativeBridge } from "./NativeBridge";

declare global {
  interface Window {
      NativeBridgeCallbacks: Record<string, (...args: unknown[]) => void>;
      NativeBridge: NativeBridge;
      AndroidBridge?: {
          postMessage: (message: string) => void;
          get: (key:string)=>string
          set: (key:string,data:string) => void;
          getPlatform:()=>string;
          getVersion:()=>string;
      };
      electron?: {
          ipcRenderer: {
              send: (channel: string, ...args: unknown[]) => void;
              on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
              once: (channel: string, listener: (...args: unknown[]) => void) => void;
              invoke: (channel: string, ...args: any[]) => Promise<any>
          };
      };
  }
}