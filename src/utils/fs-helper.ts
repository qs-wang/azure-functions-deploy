import * as fs from "fs";
import * as rimraf from "rimraf";
import * as path from "path";
import * as zip from 'archiver';
import { createLogger } from './logger';

import {DEFAULT_OUTPUT,DEFAULT_INDEX,IFxFunction,IPackhostGeneratorOptions} from "../CONSTANTS";

const logger = createLogger('azure.functions.webpack.FileHelper');

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
      .then((data: any[]) => {
        return data.reduce((promise, childDir) => {
          return promise.then((parentDir: string) => {
            const curDir = path.resolve(initDir, parentDir, childDir);

            return curDir;
          }).then((curDir: string) => {

            return Promise.all([FileHelper.exists(curDir), curDir]);
          }).then(([exists, curDir]: any[]) => {
            if (!exists) {
              return FileHelper.mkdir(curDir)
                .then(() => {
                  return curDir;
                })
            } else {
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

  public static copy(source: string, target: string): Promise<string> {
    return new Promise(function(resolve, reject) {
      const sourceStream = fs.createReadStream(source);
      const targetStream = fs.createWriteStream(target);

      const rejectCleanup = function(err: any) {
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

  public static async loadFunctionsFromDirectory(projectPath:string){
    const functionsMap: Map<string, IFxFunction> = new Map<string, IFxFunction>();
    const functions: string[] = (await FileHelper.readdir(projectPath))
        .filter(async (item) =>
            (await FileHelper.stat(path.resolve(projectPath, item))).isDirectory());
    logger.debug(`Found these directories in project root: ${functions.join(", ")}`);
    for (const item of functions) {
        if (await FileHelper.exists(path.resolve(projectPath, item, "function.json"))) {
            const fn = await FileHelper.loadFunction(path.resolve(projectPath, item));
            if (fn !== null) {
                functionsMap.set(item, fn);
            }
        }
    }

    return functionsMap;
  }

  public static async loadFunction(name: string): Promise<IFxFunction> {
      let entryPoint = null;
      let scriptFile = null;
      // let originalEntryPoint: string | boolean = false;
      let originalScriptFile: string | boolean = false;
      logger.debug("Found function: ${name}");
      const fxJsonPath = path.resolve(name, "function.json");
      const fxJson = await FileHelper.readFileAsJSON(fxJsonPath);

      // TODO: Have to overwite this scriptFile setting later on. Having to use temporary setting right now.
      if (fxJson._originalScriptFile) {
          logger.debug("Found originalScriptFile setting: ${fxJson._originalScriptFile}");
          scriptFile = fxJson._originalScriptFile;
          originalScriptFile = fxJson._originalScriptFile;
      } else if (fxJson.scriptFile && fxJson.scriptFile.endsWith(".js") && !fxJson._originalScriptFile) {
          scriptFile = fxJson.scriptFile;
          originalScriptFile = fxJson.scriptFile;
      } else if (fxJson.scriptFile && !fxJson.scriptFile.endsWith(".js") && !fxJson._originalScriptFile) {
          return null;
      } else {
          let dir: string[] = await FileHelper.readdir(name);
          dir = dir.filter((f) => f.endsWith(".js"));
          if (dir.length === 1) {
              scriptFile = dir[0];
          } else if (dir.find((v, i, o) => {
              return v === DEFAULT_INDEX;
          })) {
              scriptFile = DEFAULT_INDEX;
          } else {
              logger.debug(`Function ${name} does not have a valid start file inside ${dir}`)
              return null;
              // throw new Error(`Function ${name} does not have a valid start file`);
          }
          originalScriptFile = scriptFile;
      }

       // TODO: improve the logic for choosing entry point - failure sure not all scenarios are covered here.
       // TODO: Have to overwrite this entryPoint later on. Using temporary setting for now.
      // if (fxJson._originalEntryPoint) {
      //     logger.debug("Found originalEntryPoint setting: %s", fxJson._originalEntryPoint);
      //     entryPoint = fxJson._originalEntryPoint;
      //     originalEntryPoint = fxJson._originalEntryPoint;
      // } else

      if (fxJson.entryPoint) {
          entryPoint = fxJson.entryPoint;
          // originalEntryPoint = fxJson.entryPoint;
      }

      logger.debug(`Loaded function(${name}) using entryPoint: ${scriptFile} - scriptFile: ${entryPoint}`);
      return Promise.resolve({
          name,
          scriptFile,
          entryPoint,
          // _originalEntryPoint: originalEntryPoint,
          _originalScriptFile: originalScriptFile,
      });
  }


  public static zipFolder(directory: string, outputFile: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // create a file to stream archive data to.
        const output = fs.createWriteStream(outputFile);
        const archive = zip('zip', {
          zlib: { level: 9 } // Sets the compression level.
        });

        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on('close', function() {
          logger.info(archive.pointer() + ' total bytes');
          logger.info('archiver has been finalized and the output file descriptor has closed.');
          resolve(outputFile);
        });

        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_end
        output.on('end', function() {
          logger.info('Data has been drained');
        });

        output.on('error', function(err: any) {
          throw err;
        });

        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function(err: any) {
          if (err.code === 'ENOENT') {
            // log warning
          } else {
            // throw error
            throw err;
          }
        });

        // good practice to catch this error explicitly
        archive.on('error', function(err: any) {
          throw err;
        });

        // pipe archive data to the file
        archive.pipe(output);
        archive.directory(directory, false);
        archive.finalize();

      } catch (error) {
        reject(error);
      }
    });
  }
}
