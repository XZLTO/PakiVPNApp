import { app } from "electron"
import { APP_TEMP_DIR_NAME, PIE_NAME } from "../data/const"
import { getPipePath, TCPClient } from "../libs/server-client"
import { SingBoxManager } from "./sing-box"
import { platform } from 'os';
import { join } from 'path';

const singBoxPath = join(app.getAppPath(), "sing-box")
const configPath = join(app.getPath("temp"), APP_TEMP_DIR_NAME)

function getPlatformBinary() {
    switch (platform()) {
        case 'win32':
            return join(singBoxPath, 'sing-box.exe');
        case 'linux':
            return join(singBoxPath, 'sing-box-linux');
        case 'darwin':
            return join(singBoxPath, 'sing-box-darwin');
        default:
            throw new Error(`Unsupported platform: ${platform()}`);
    }
}


export const Service = () => {
    const client: TCPClient = new TCPClient({
        pipeline:
            getPipePath(PIE_NAME),
        maxReconnectAttempts: 5,
        reconnectInterval: 2000,
    })

    const singBox = new SingBoxManager(
        getPlatformBinary()
    )

    client.receive("init", () => {
        LOG("Hi!", "Pong!")
    })

    client.receive("status", () => {
        client.send("status", singBox.getStatus())
    })

    client.receive("start", () => {
        const status = singBox.getStatus()
        if (status == "Stopped" || status == "Idle") singBox.start(join(app.getPath("temp"), APP_TEMP_DIR_NAME))
    })

    client.receive("stop", () => {
        const status = singBox.getStatus()
        if (status == "Connected") singBox.stop()
    })

    client.on("connect", () => {
        client.send("init")
    })

    client.on("reconnectFailed", () => {
        singBox.stop()
        process.kill(0)
    })
    let lastLog = ""
    singBox.onLog((data, isError) => {
        if (isError) LOG_ERR(`${data}\nLastlog:${lastLog}`); else LOG(data);
        lastLog = data
    })

    singBox.onStatus((status) => client.send("status", status))

    function LOG(...args: any[]) {
        let log = args.join(" ")
        console.log(log)
        client.send("log", log, false)
    }

    function LOG_ERR(...args: any[]) {
        let log = args.join(" ")
        console.warn(log)
        client.send("log", log, true)
    }
}