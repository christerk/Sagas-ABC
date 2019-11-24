import { app, BrowserWindow, screen, ipcMain, Menu, dialog, shell } from 'electron';
import * as settings from 'electron-settings';
import { translations } from "./i18n/translations";
import { AppWindow } from './windows/appwindow';
import * as path from 'path'
import { AppMenu } from './menu';

import i18default from 'i18next';
import { DataStore } from './datastore';
import { POINT_CONVERSION_COMPRESSED } from 'constants';
const i18next: typeof i18default = require('i18next');

enum AppMode {
    Start,
    Regular,
    Repetition
}

export class Main {
    private currentWords: string[];
    private shownWords: string[];
    private repetitionWords: Record<string, number>;

    private sessionInfo: {
        words: number,
        accepted: number,
        currentWord: string,
        wordHistory: string[],
        repetitionHistory: {word: string, change: number}[],
    };

    navUndo() {
        if (this.appMode == AppMode.Start) {
            return;
        }

        if (this.sessionInfo.repetitionHistory.length > 0) {
            let rep = this.sessionInfo.repetitionHistory.pop();
            if (rep.change != 0) {
                this.repetitionWords[rep.word] = this.repetitionWords[this.sessionInfo.currentWord] + rep.change;
            } else {
                delete this.repetitionWords[rep.word];
            }
            this.broadcast('Message', this.i18n('PERFORMED_UNDO', [ rep.word ]));
            this.saveRepetitionData();
        } else {
            this.broadcast('Message', i18next.t('UNDO_UNAVAILABLE'));
        }
    }
    navNextSuccess() {
        if (this.appMode != AppMode.Repetition) {
            this.broadcast('Message', i18next.t('ADD_IMPROVEMENT_WRONG_MODE'));
        } else {
            this.sessionInfo.accepted++;
            this.sessionInfo.words++;
            if (this.repetitionWords[this.sessionInfo.currentWord] == undefined) {
                this.repetitionWords[this.sessionInfo.currentWord] = 0;
            } else {
                this.repetitionWords[this.sessionInfo.currentWord] = this.repetitionWords[this.sessionInfo.currentWord] - 1;
            }

            this.sessionInfo.repetitionHistory.push({
                word: this.sessionInfo.currentWord,
                change: -1,
            });

            this.broadcast('Message', this.i18n('UPDATE_TO_REPETITIONFILE', [ this.sessionInfo.currentWord, this.repetitionWords[this.sessionInfo.currentWord].toString() ]));

            this.saveRepetitionData();

            let moreWords = this.nextWord();
            if (!moreWords) {
                this.setMode(AppMode.Start);
                this.setWord("👍", false);
            }
        }
    }
    navNextFail() {
        if (this.appMode != AppMode.Start) {
            this.sessionInfo.words++;
            
            let added = false;
            if (this.repetitionWords[this.sessionInfo.currentWord] == undefined) {
                this.repetitionWords[this.sessionInfo.currentWord] = 1;
                added = true;
            } else {
                this.repetitionWords[this.sessionInfo.currentWord] = this.repetitionWords[this.sessionInfo.currentWord] + 1;
            }

            this.sessionInfo.repetitionHistory.push({
                word: this.sessionInfo.currentWord,
                change: added ? 0 : 1,
            });

            this.saveRepetitionData();
            console.log(this.sessionInfo.currentWord + ' ' + this.repetitionWords[this.sessionInfo.currentWord]);

            this.broadcast('Message', this.i18n('WORD_TO_REPETITIONFILE', [ this.sessionInfo.currentWord, this.repetitionWords[this.sessionInfo.currentWord].toString() ]));
            let moreWords = this.nextWord();
            if (!moreWords) {
                this.setMode(AppMode.Start);
                this.setWord("👍", false);
            }
            this.sendSessionInfo();
        }
    }
    navNextOk() {
        if (this.appMode != AppMode.Start) {
            this.sessionInfo.accepted++;
            this.sessionInfo.words++;
            let moreWords = this.nextWord();
            if (!moreWords) {
                this.setMode(AppMode.Start);
                this.setWord("👍", false);
            }
            this.sendSessionInfo();
        }
    }
    navBack() {
        if (this.appMode == AppMode.Start) {
            return;
        }
        
        if (this.sessionInfo.wordHistory.length > 0) {
            this.setWord(this.sessionInfo.wordHistory.pop(), false);
        } else {
            this.broadcast('Message', i18next.t('No earlier words'));
        }
    }
    navEnd() {
        if (this.appMode != AppMode.Start) {
            this.setMode(AppMode.Start);
            this.setWord(i18next.t('Hello'), false);
        }
    }
    private application: Electron.App;
    public appWindow: AppWindow;
    private menu: AppMenu;
    private dataStore: DataStore;
 
    private appMode: AppMode;
    private selectedSessionText: string;

    public constructor(app: Electron.App) {
        this.currentWords = [];
        this.shownWords = [];
        this.repetitionWords = {};
        this.initializeSession();
        this.application = app;

        this.menu = new AppMenu(this, app, i18next);
        this.dataStore = new DataStore();
        this.appMode = AppMode.Start;

        ipcMain.on('SetLanguage', (event, message) => {
            console.log("Received SetLanguage: " + message);

            this.setLanguage(message);
            this.menu.updateMenu();
            this.setMode(this.appMode);

            this.broadcast('LanguageSet', i18next.getResourceBundle(message, 'translation'));

            this.broadcast('Message', null);
            this.broadcast('state', {
                "settings.language": settings.get('language')
            });
    
        });

        ipcMain.on('ChangeBookFolder', (event, message) => {
            dialog.showOpenDialog({
                properties: ['openDirectory'],
                title: i18next.t('Change data folder'),
                defaultPath: path.join(this.application.getPath('userData'), "data"),
            }).then(result => {
                console.log(result);
            })
        });

        ipcMain.on('OpenBookFolder', (evemt, message) => {
            shell.openItem(path.join(this.application.getPath('userData'), "data"));
        });

        ipcMain.on('StartClicked', (event, message) => {
            let books = this.dataStore.getBooks(path.join(this.application.getPath('userData'), 'data'));
            this.broadcast('state', {
                'app.selectedsessiontext': this.getSelectedSessionText()
            });
            this.broadcast('Books', books);
            this.broadcast('ShowDialog', 'startDialog');

        });

        ipcMain.on('SelectSessionText', (event, message) => {
            this.selectedSessionText = message;
            this.broadcast('state', {
                'app.selectedsessiontext': message
            });

            this.dataStore.enxureBookFolder(path.join(this.application.getPath('userData'), 'data', message));
        });

        ipcMain.on('StartSession', (event, message) => {
            let folder = this.getSelectedSessionText();
            console.log('Starting ' + message + ' session ' + folder);

            if (message == AppMode[AppMode.Regular]) {
                this.setMode(AppMode.Regular);
                this.currentWords = this.dataStore.loadBaseData(path.join(settings.get('datafolder').toString(), folder));
            } else if (message == AppMode[AppMode.Repetition]) {
                this.setMode(AppMode.Repetition);
                this.repetitionWords = this.dataStore.loadRepetitionData(path.join(settings.get('datafolder').toString(), folder));
                console.log(this.repetitionWords);
            }

            this.initializeSession();
            let moreWords = this.nextWord();
            if (!moreWords) {
                this.setMode(AppMode.Start);
                this.setWord("👍", false);
            }
            this.sendSessionInfo();
        });

        ipcMain.on('Nav', (event, message) => {
            switch(message) {
                case 'End':
                    this.navEnd();
                    break;
                case 'Back':
                    this.navBack();
                    break;
                case 'NextOk':
                    this.navNextOk();
                    break;
                case 'NextFail':
                    this.navNextFail();
                    break;
                case 'NextSuccess':
                    this.navNextSuccess();
                    break;
                case 'Undo':
                    this.navUndo();
                    break;
            }
            this.sendSessionInfo();
        })
    }

    private i18n(message: string, data:string[] = []) {
        message = i18next.t(message);
        for (let i=0; i<data.length; i++) {
            message = message.replace('%'+i, data[i]);
        }
        return message;
    }

    private saveRepetitionData() {
        this.dataStore.saveRepetitionData(path.join(settings.get('datafolder').toString(), this.getSelectedSessionText()), this.repetitionWords);
    }

    private nextWord(): boolean {
        let word: string;
        switch (this.appMode) {
            case AppMode.Regular:
                word = this.getRandomWord();
                break;
            case AppMode.Repetition:
                word = this.getRandomRepetitionWord();
                break;
        }
        if (word) {
            this.setWord(word);
            return true;
        }

        return false;
    }

    private initializeSession() {
        this.sessionInfo = {
            words: 0,
            accepted: 0,
            currentWord: '',
            wordHistory: [],
            repetitionHistory: [],
        };
    }

    private getSelectedSessionText() {
        return this.selectedSessionText ? this.selectedSessionText : 'Default';
    }

    public sendSessionInfo() {
        let pct = this.sessionInfo.words > 0 ? Math.floor( 100 * this.sessionInfo.accepted / this.sessionInfo.words) : 0;
        let remaining:string = null;
        if (this.appMode == AppMode.Regular) {
            remaining = this.currentWords.length + "/" + (this.currentWords.length + this.shownWords.length);
        } else {
            let words = Object.keys(this.repetitionWords);
            let repWords:number = 0;
            let sumWords:number = 0;
            words.forEach(w => {
                sumWords += this.repetitionWords[w] ? this.repetitionWords[w] : 0;
                repWords += this.repetitionWords[w] > 0 ? 1 : 0;
            });
            remaining = sumWords + " (" + repWords + ")";
        }
        this.broadcast('state', {
            'app.numberOfWords': this.sessionInfo.words,
            'app.correctWords': this.sessionInfo.accepted + " (" + pct + "%)",
            'app.remainingWords': remaining,
        })
    }    

    public getRandomWord() {

        let nextWord = null;
        do {
            // Cycle back word list
            if (this.currentWords.length == 0 && this.shownWords.length > 0) {
                this.currentWords = this.shownWords;
                this.shownWords = [];
            }

            // Are we out of words?
            if (this.currentWords.length == 0) {
                return null;
            }

            // Find next word
            nextWord = this.currentWords.splice(Math.floor(Math.random()*this.currentWords.length), 1)[0];
            if (nextWord) {
                this.shownWords.push(nextWord);
            }
        } while (nextWord != null && nextWord == this.sessionInfo.currentWord);

        return nextWord;
    }

    public getRandomRepetitionWord() {
        let numWords = 0;
        // Get sum of numbers
        for (let word in this.repetitionWords) {
            let num = this.repetitionWords[word];
            if (num > 0) {
                numWords += num;
            }
        }

        let nextWord = null;
        do {
            let x = Math.floor(Math.random()*numWords);
            for (let word in this.repetitionWords) {
                if (this.repetitionWords[word] > 0) {
                    x -= this.repetitionWords[word];

                    if (x <= 0) {
                        return word;
                    }
                }
            }
        } while (this.repetitionWords.length > 1 && nextWord == this.sessionInfo.currentWord);

        return null;
    }

    public broadcast(key: string, value: any) {
        this.appWindow.broadcast(key, value);
    }

    public initialize() {
        Promise.resolve()
        .then(() => this.createWindows())
        .then(() => this.initializeApplication())
        .then(() => this.loadSettings())
        .then(() => this.initializeTranslations())
        .then(() => this.menu.updateMenu())
        .then(() => this.setupApplication())
        .then(() => this.showApplication())      
    }

    private onWindowAllClosed() {
        console.log("WindowAllClosed");
        if (process.platform !== 'darwin') {
            this.application.quit();
        }
    }

    public onClose() {
        console.log("MainWindow close")
        // Dereference the window object. 
        this.appWindow = null;
    }

    private createWindows() {
        this.appWindow = new AppWindow(this, i18next);
    }

    private setMode(mode: AppMode) {
        let modeString:string = AppMode[mode];
        console.log(modeString);
        console.log(i18next.t(modeString));
        this.appMode = mode;
        this.broadcast('state', {
            'app.mode': modeString,
            'app.mode.label': i18next.t(modeString),
        });
    }

    private setWord(word: string, pushToHistory: boolean = true) {
        if (pushToHistory && this.sessionInfo.currentWord) {
            this.sessionInfo.wordHistory.push(this.sessionInfo.currentWord);
        }
        this.sessionInfo.currentWord = word;
        this.broadcast('state', {
            'app.word': word
        });
    }

    private setLanguage(lang: string) {
        console.log("Setting language: " + lang)
        settings.set("language", lang)
        i18next.changeLanguage(lang);
        this.menu.updateMenu();
        this.broadcast('state', {
            "settings.language": settings.get('language')
        });
        if (this.appMode == AppMode.Start) {
            this.setWord(i18next.t('Hello'), false);
        }
    }

    private initializeApplication(): Promise<any> {
        this.application.on('window-all-closed', () => {
            this.onWindowAllClosed();
        });

        return new Promise((resolve, reject) => {
            this.application.on('ready', () => {
                this.appWindow.initialize()
                .then(() => resolve());
            });
        });
    }

    private setupApplication() {
        let lang = settings.get('language').toString();
        this.broadcast('LanguageSet', i18next.getResourceBundle(lang, 'translation'));
        this.broadcast('state', {
            'settings.language': settings.get('language'),
            'app.word': i18next.t('Hello'),
            'app.mode': AppMode[this.appMode],
            'app.mode.label': i18next.t(AppMode[this.appMode]),
            'app.selectedsessiontext': 'Default',
        })
        return Promise.resolve();
    }

    private showApplication() {
        this.appWindow.show();
    }

    public showPreferences() {
        this.broadcast('ShowDialog', 'preferencesDialog');
    }
    private loadSettings(): Promise<any> {
        console.log('UserData: ' + this.application.getPath('userData'))
        console.log('Home: ' + this.application.getPath('home'))

        if (!settings.has('language') || settings.get('language') == null) {
            settings.set('language', 'en')
        }

        if (!settings.has('datafolder') || settings.get('datafolder') == null) {
            settings.set('datafolder', path.join(this.application.getPath('userData'), 'data'));
        }

        this.dataStore.setDataFolder(settings.get('datafolder').toString());

        this.broadcast('settings', {
            "setting.language": settings.get('language')
        })
        return Promise.resolve();
    }

    private initializeTranslations(): Promise<any> {
        return i18next.init({
            lng: settings.get('language').toString(),
            debug: false,
            ns: 'translation',
            resources: translations
        })
    }
}
