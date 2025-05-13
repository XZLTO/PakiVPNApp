
import { app } from "electron";
import { App } from "./app";
import { isAdmin } from "./libs/Admin";
import { getArgs } from "./libs/Args";
import { Service } from "./service";

if (require('electron-squirrel-startup')) {
    app.quit();
}

const isService = getArgs()["service"];
if (isService)
    Service();
else
    App();
