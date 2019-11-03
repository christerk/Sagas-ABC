import { app, BrowserWindow } from 'electron'
import { Main } from './main'

let m = new Main(app);
m.initialize();
