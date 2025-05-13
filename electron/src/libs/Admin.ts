import { exec } from 'child_process';
var sudo = require('sudo-prompt');
/**
 * Проверяет, запущено ли приложение с правами администратора.
 * @returns {Promise<boolean>}
 */
export const isAdmin = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        switch (process.platform) {
            case 'win32': {
                exec('net session', (error) => {
                    resolve(error === null);
                });
                break;
            }
            case 'darwin':
            case 'linux': {
                exec('id -u', (error, stdout) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(stdout.trim() === '0');
                });
                break;
            }
            default: {
                resolve(false);
            }
        }
    });
};

export const RunAsAdmin = async (command: string): Promise<string> => {
    const options = {
        name: 'Electron',
    };

    return new Promise((resolve, reject) => {
        sudo.exec(command, options, (error: any, stdout: string, stderr: any) => {
            if (error) {
                reject(error);
                return;
            }
            console.log('stdout: ' + stdout);
            resolve(stdout);
        });
    });
};