import { Main } from "../main";
import { BrowserWindow } from "electron";

import i18default from 'i18next';
const i18next: typeof i18default = require('i18next');

export class BaseWindow {
    protected main: Main;
    protected i18n: typeof i18default;
    protected window: BrowserWindow;

    public constructor(main: Main, i18n: typeof i18default) {
        this.main = main;
        this.i18n = i18n;
    }

    public getWindow() : BrowserWindow {
        return this.window;
    }

    public show() {
        this.window.show();
    }

    public broadcast(key: string, value: any) {
        if (this.window !== undefined) {
            this.window.webContents.send(key, value);
        }
    }
}