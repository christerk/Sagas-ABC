import * as fs from 'fs';
import * as path from 'path';
import { RemovePassword } from 'electron';
export class DataStore {
    public constructor() {

    }

    public setDataFolder(folder: string) {
        console.log("Setting Data Folder: " + folder);
        let baseFolder = folder;
        let defaultFolder = path.join(baseFolder, 'default');

        this.ensureFolderExists(baseFolder);
        this.ensureFolderExists(defaultFolder);
        this.ensureFilesExists(defaultFolder);
    }

    public enxureBookFolder(folder: string) {
        this.ensureFolderExists(folder);
        this.ensureFilesExists(folder);
    }

    public ensureFolderExists(folder: string) {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, {
                recursive: true
            });
        }
    }

    public ensureFilesExists(folder: string) {
        let baseFile = path.join(folder, 'base.txt');
        let repetitionFile = path.join(folder, 'repetition.txt');

        if (!fs.existsSync(baseFile)) {
            fs.closeSync(fs.openSync(baseFile, 'w'));
        }
        if (!fs.existsSync(repetitionFile)) {
            fs.closeSync(fs.openSync(repetitionFile, 'w'));
        }
    }

    public getBooks(folder: string) {
        if (fs.existsSync(folder)) {
            let folders = fs.readdirSync(folder, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name);

            return folders;
        }
        return null;
    }

    public loadBaseData(folder: string) {
        let filename = path.join(folder, "base.txt");
        if (fs.existsSync(filename)) {
            let data = fs.readFileSync(filename, 'utf8');

            let words = data.split(' ');

            for (let i=words.length-1; i>=0; i--) {
                words[i] = this.filterWord(words[i]);
                if (words[i].length == 0) {
                    console.log('Spliced');
                    words.splice(i, 1);
                }
            }
            return words;
        }
        return null;
    }

    public loadRepetitionData(folder: string): Record<string, number> {
        let words:Record<string, number> = {};
        let filename = path.join(folder, "repetition.txt");
        if (fs.existsSync(filename)) {
            let data = fs.readFileSync(filename, 'utf8');

            let rows = data.split("\n");

            for (let i=0; i<rows.length; i++) {
                let arr = rows[i].split("\t");
                let word = arr[0];
                let num = parseInt(arr[1]);

                words[word] = num;
            }
            return words;
        }
        return null;
    }

    public saveRepetitionData(folder: string, data: Record<string, number>) {
        let filename = path.join(folder, "repetition.txt");

        let content = Object.keys(data).map(k => {
            return k + "\t" + data[k];
        }).join("\n");

        fs.writeFileSync(filename, content, 'utf-8');
    }

    private filterWord(word: string) {
        return word.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, '').trim();
    }
}