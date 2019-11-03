import { BrowserWindow, screen, app } from 'electron';
import * as path from 'path'
import { Main } from '../main';
import { BaseWindow } from './basewindow';
import i18next from 'i18next';

export class AppWindow extends BaseWindow {
    public initialize(): Promise<any> {
        const { width, height }  = screen.getPrimaryDisplay().workAreaSize
        this.window = new BrowserWindow({
            width: width * 0.8,
            height: height * 0.8,
            useContentSize: true,
            show: false,
            title: 'Sagas ABC',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: false,
                preload: path.join(__dirname, "../preload.js")
            },
        });

        this.window.loadURL('file://' + __dirname + '/../../htdocs/index.html');

        this.window.on('closed', this.main.onClose);
        this.window.webContents.on('will-navigate', (e) => {
            e.preventDefault()
        })

        this.window.setMinimumSize(640, 500)

        return new Promise((resolve, reject) => {
            this.window.once('ready-to-show', () => {
                resolve();
            })
        });
    }
}