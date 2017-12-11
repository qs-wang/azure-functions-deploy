import * as fs from "fs";
import * as rimraf from "rimraf";
import * as path from "path";

export class FileHelper {
    public static readdir(path: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fs.readdir(path, (err, files) => {
                if (err) {
                    return reject(err);
                }
                resolve(files);
            });
        });
    }

    public static stat(path: string): Promise<fs.Stats> {
        return new Promise((resolve, reject) => {
            fs.stat(path, (err, stat) => {
                if (err) {
                    return reject(err);
                }
                resolve(stat);
            });
        });
    }

    public static readFileUtf8(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(path, "utf8", (err, content: string) => {
                if (err) {
                    return reject(err);
                }
                resolve(content);
            });
        });
    }

    public static exists(path: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            fs.access(path, (err) => {
                resolve(!err);
            });
        });
    }

    public static readFileAsJSON(path: string): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            try {
                const content = await FileHelper.readFileUtf8(path);
                resolve(JSON.parse(content));
            } catch (err) {
                reject(err);
            }

        });
    }

    public static overwriteFileUtf8(path: string, content: string): Promise<any> {
        return new Promise((resolve, reject) => {
            fs.truncate(path, async (err) => {
                if (err) {
                    return reject(err);
                }
                await this.writeFileUtf8(path, content).catch(reject).then(resolve, reject);
            });

        });
    }

    public static writeFileUtf8(path: string, content: string): Promise<any> {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, content, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    public static mkdir(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.mkdir(path, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    //Create the full path if any of the level is missing.
    public static mkDirP(targetPath: string): Promise<string> {
        const sep = path.sep;
        const initDir = path.isAbsolute(targetPath) ? sep : '';
        const baseDir = '.';
        return Promise.resolve(targetPath.split(sep))
        .then(data=>{
          return data.reduce((promise, childDir) => {
            return promise.then((parentDir)=>{
              const curDir = path.resolve(initDir,parentDir, childDir);

              return curDir;
            }).then(curDir=>{

              return Promise.all([FileHelper.exists(curDir),curDir]);
            }).then(([exists,curDir])=>{
              if(!exists){
                return FileHelper.mkdir(curDir)
                  .then(()=>{
                    return curDir;
                  })
              }else{
                return curDir;
              }

            })
          }, Promise.resolve(''));

        })
      }

    public static rimraf(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            rimraf(path, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    public static copy(source:string, target:string) : Promise<string>{
      return new Promise(function(resolve, reject) {
          const sourceStream = fs.createReadStream(source);
          const targetStream = fs.createWriteStream(target);

          const rejectCleanup = function (err:any) {
              sourceStream.destroy();
              targetStream.end();
              reject(err);
          }

          sourceStream.on('error', rejectCleanup);
          targetStream.on('error', rejectCleanup);
          targetStream.on('finish', resolve);
          sourceStream.pipe(targetStream);
      });
    }

    public static rename(pathOld: string, pathNew: string) {
        return new Promise((resolve, reject) => {
            fs.rename(pathOld, pathNew, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}
