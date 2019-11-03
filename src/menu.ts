import { app, Menu } from 'electron';
import i18default from 'i18next';
import { Main } from './main';

export class AppMenu {
    private main: Main;
    private app: Electron.App;
    private i18n: typeof i18default;
    public constructor(main: Main, app: Electron.App, i18n: typeof i18default) {
        this.app = app;
        this.main = main;
        this.i18n = i18n;
    }

    public updateMenu(): Promise<any> {
        const isMac = process.platform === 'darwin'

        const template: Electron.MenuItemConstructorOptions[] = []

        // --- APP MENU ---
        if (isMac) {
            template.push({
                label: app.name,
                submenu: [
                    { label: this.i18n.t('About') + ' ' + app.name, role: 'about' },
                    { type: 'separator' },
                    { label: this.i18n.t('Preferences'), accelerator: 'Cmd+,', click: () => this.main.showPreferences() },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { label: this.i18n.t('Quit'), role: 'quit' }
                ]
            })
        }

        // --- FILE MENU ---
        template.push({
            label: this.i18n.t('File'),
            submenu: [
                { label: this.i18n.t('Preferences'), accelerator: 'Ctrl+,', click: () => this.main.showPreferences() },
                { type: 'separator' },
                isMac ? { label: this.i18n.t('Close'), role: 'close' } : { label: this.i18n.t('Quit'), role: 'quit' }
            ]
        })

        const menu = Menu.buildFromTemplate(template)
        if (isMac || this.main.appWindow.getWindow() === undefined) {
            Menu.setApplicationMenu(menu);
        } else {
            this.main.appWindow.getWindow().setMenu(menu);
        }
        return Promise.resolve();
    }
}