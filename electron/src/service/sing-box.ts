import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { ipcMain } from 'electron';
import { SingBoxStatus } from '../data/const';

export class SingBoxManager {
  private process: ChildProcess | null = null;
  private logCallback: ((data: string, isError: boolean) => void) | null = null;
  private statusCallback: ((status: SingBoxStatus) => void) | null = null;
  private status: SingBoxStatus = "Idle";

  constructor(private singBoxPath: string) { }

  async start(configPath: string) {
    if (this.process) {
      throw new Error('Sing-box is already running');
    }

    this.process = spawn(this.singBoxPath, ["run", "-C", configPath], {
      env: {
        ...process.env,
        "ENABLE_DEPRECATED_TUN_ADDRESS_X": "true",
        "ENABLE_DEPRECATED_SPECIAL_OUTBOUNDS": "true",
      },
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });


    this.process.stdout?.on('data', (data) => {
      this.logCallback?.(`${data.toString()}`, false);
    });

    this.process.stderr?.on('data', (data) => {
      this.logCallback?.(`${data.toString()}`, false);
    });

    this.setStatus("Connected")

    this.process.on('close', (code) => {
      this.logCallback?.(`Process exited with code ${code}`, code != 0 && code != null);
      this.setStatus("Stopped")
      this.process = null;
      this.stop()
    });

    this.process.on('error', (err) => {
      this.logCallback?.(`Process error: ${err.message}`, true);
      this.setStatus("Stopped")
      this.process = null;
      this.stop()
    });
  }

  stop() {
    if (this.process) {
      this.process.kill('SIGINT');
      this.process = null;
      this.setStatus("Stopped")
    }
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  setStatus(status: SingBoxStatus) {
    if (status == this.status) return;
    this.status = status;
    this.statusCallback?.(status)
  }

  getStatus() {
    return this.status;
  }

  onLog(callback: (data: string, isError: boolean) => void) {
    this.logCallback = callback;
  }

  onStatus(callback: (data: SingBoxStatus) => void) {
    this.statusCallback = callback;
  }
}