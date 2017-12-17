import * as path from "path";
import * as webpack from "webpack";

import { FileHelper, createLogger } from "./utils";
import {DEFAULT_OUTPUT,DEFAULT_INDEX,TEMP_OUTPUT,IFxFunction,IPackhostGeneratorOptions} from "./CONSTANTS"

const logger = createLogger("azure.functions.webpack.WebpackRunner");

export interface IWebpackRunner {
    projectRootPath: string;
    indexFileName?: string;
    outputPath?: string;
    uglify?: boolean;
    ignoredModules?: string[];
}

export class WebpackRunner {
    public static run(options: IWebpackRunner): Promise<any> {
        options.indexFileName = options.indexFileName || DEFAULT_INDEX;
        options.outputPath = options.outputPath || DEFAULT_OUTPUT;
        options.uglify = options.uglify || false;
        options.ignoredModules = options.ignoredModules || [];

        return new Promise(async (resolve, reject) => {
            logger.debug("Setting up paths");
            const oldPath = path.join(options.projectRootPath, options.outputPath, options.indexFileName);
            const newPath = path.join(options.projectRootPath,
                options.outputPath, "original." + options.indexFileName);

            const outputPath = path.join(options.projectRootPath, options.outputPath, TEMP_OUTPUT);

            const ignoredModules: { [key: string]: string } = {};

            for (const mod of options.ignoredModules) {
                ignoredModules[mod.toLowerCase()] = mod;
            }

            logger.debug("Creating Webpack Configuration");
            const config: webpack.Configuration = {
                entry: oldPath,
                externals: ignoredModules,
                node: {
                    __dirname: false,
                    __filename: false,
                },
                output: {
                    filename: TEMP_OUTPUT,
                    library: "index",
                    libraryTarget: "commonjs2",
                    path: path.join(options.projectRootPath, options.outputPath),
                },
                plugins: [],
                target: "node",
            };

            if (options.uglify) {
                logger.debug("Adding uglify plugin");
                try {
                    config.plugins.push(new webpack.optimize.UglifyJsPlugin());
                } catch (e) {
                  logger.error(e);
                }
            }

            logger.debug("Creating Webpack instance");
            const compiler = webpack(config);
            logger.debug("Started webpack");
            compiler.run(async (err, stats) => {
              logger.debug("Webpack finished");
                if (err || stats.hasErrors()) {
                    return reject(err || stats.toString({ errors: true }));
                }
                logger.debug("\n" + stats.toString());

                logger.debug(`Saving the original the entry file: oldPath -> newPath"`);
                if (await FileHelper.exists(newPath)) {
                    await FileHelper.rimraf(newPath);
                }
                await FileHelper.rename(oldPath, newPath);

                logger.debug("Renaming the output file");
                await FileHelper.rename(outputPath, oldPath);
                resolve();
            });
        });
    }
}
