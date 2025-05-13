import net from 'net';
import * as os from 'os';
import { EventEmitter } from 'events';
import { SocketMessages } from '../data/const';

interface MessageHandler {
    (socket: net.Socket, ...args: any[]): void;
}


export function getPipePath(pipeName: string): string {
	if (os.platform() === 'win32') {
	  return `\\\\.\\pipe\\${pipeName}`;
	} else {
	  return `/tmp/${pipeName}.sock`;
	}
  }

class TCPServer extends EventEmitter {
    private server: net.Server;
    private handlers: Map<SocketMessages, MessageHandler> = new Map();
    private clients: Set<net.Socket> = new Set();

    constructor(Pipeline:string) {
        super();
        this.server = net.createServer(this.handleConnection.bind(this));
        this.server.listen(Pipeline, () => {
            console.log(`Server listening on port ${Pipeline}`);
        });
    }

    private handleConnection(socket: net.Socket) {
        console.log('Client connected');
        this.emit("clientConnected",socket)
        this.clients.add(socket);

        let buffer = '';
        socket.on('data', (data) => {
            buffer += data.toString('utf8');
            // Обрабатываем все завершенные сообщения (разделенные \n)
            while (buffer.includes('\n')) {
                const messageEnd = buffer.indexOf('\n');
                const message = buffer.substring(0, messageEnd);
                buffer = buffer.substring(messageEnd + 1);
                this.processMessage(socket, message);
            }
        });

        socket.on('end', () => {
            console.log('Client disconnected');
            this.clients.delete(socket)
        });

        socket.on('error', (err) => {
            console.log('Socket error:', err);
        });
    }

    private processMessage(socket: net.Socket, rawMessage: string) {
        try {
            const { name, args } = JSON.parse(rawMessage);
            const handler = this.handlers.get(name);
            if (handler) {
                handler(socket, ...args);
            } else {
                console.log(`No handler for message: ${name}`);
            }
        } catch (err) {
            console.log('Error processing message:', err);
        }
    }

    receive(name: SocketMessages, handler: MessageHandler) {
        this.handlers.set(name, handler);
    }

    send(socket: net.Socket, name: SocketMessages, ...args: any[]) {
        const message = JSON.stringify({ name, args }) + '\n';
        socket.write(message);
    }

    sendAll(name: SocketMessages, ...args: any[]) {
        const message = JSON.stringify({ name, args }) + '\n';
        this.clients.forEach(client => {
            if (!client.destroyed) {
                client.write(message);
            } else {
                this.clients.delete(client);
            }
        });
    }

    getClientsCount()
    {
        return this.clients.size;
    }
}

interface ClientMessageHandler {
    (...args: any[]): void;
}

interface TCPClientOptions {
    pipeline: string;
    reconnectInterval?: number; // ms
    maxReconnectAttempts?: number;
}

class TCPClient extends EventEmitter {
    private options: TCPClientOptions;
    private socket: net.Socket;
    private handlers: Map<SocketMessages, ClientMessageHandler> = new Map();
    private connected: boolean = false;
    private queue: string[] = [];
    private reconnectAttempts: number = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor(options: TCPClientOptions) {
        super();
        this.options = {
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            ...options
        };
        this.connect();
    }

    private connect() {
            this.socket = new net.Socket();

            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.flushQueue();
                this.emit('connect');
            });

            let buffer = '';
            this.socket.on('data', (data) => {
                buffer += data.toString();

                while (buffer.includes('\n')) {
                    const messageEnd = buffer.indexOf('\n');
                    const message = buffer.substring(0, messageEnd);
                    buffer = buffer.substring(messageEnd + 1);
                    this.processMessage(message);
                }
            });

            this.socket.on('close', () => {
                this.handleDisconnect();
                this.emit('close');
            });

            this.socket.on('error', (err) => {
                console.log('Socket error:', err);
                //this.handleDisconnect();
                //this.emit('error', err);
            });

            this.socket.connect(this.options.pipeline);
    }

    private processMessage(rawMessage: string) {
        try {
            const { name, args } = JSON.parse(rawMessage);
            const handler = this.handlers.get(name);
            if (handler) {
                handler(...args);
            } else {
                console.log(`No handler for message: ${name}`);
            }
        } catch (err) {
            console.log('Error processing message:', err);
        }
    }

    private handleDisconnect() {
        try {
            console.log('Disconnected from server');
            this.connected = false;
            this.socket = null;

            if (this.reconnectAttempts < (this.options.maxReconnectAttempts || 10)) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`);

                this.reconnectTimer = setTimeout(() => {
                    this.connect();
                }, this.options.reconnectInterval);
            } else {
                console.log('Max reconnection attempts reached');
                this.emit('reconnectFailed');
            }
        } catch { }
    }

    private flushQueue() {
        while (this.queue.length > 0 && this.connected) {
            const message = this.queue.shift();
            if (message) {
                this.socket.write(message);
            }
        }
    }

    receive(name: SocketMessages, handler: ClientMessageHandler) {
        this.handlers.set(name, handler);
    }

    send(name: SocketMessages, ...args: any[]) {
        const message = JSON.stringify({ name, args }) + '\n';
        if (this.connected) {
            this.socket.write(message);
        } else {
            this.queue.push(message);
        }
    }

    close() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            this.socket.end();
            this.socket.destroy();
            this.socket = null;
        }

        this.connected = false;
    }
}

export { TCPServer, TCPClient }