#!/usr/bin/env node

import * as program from "commander";
import * as path from "path";
import { PackhostGenerator, WebpackRunner, FunctionDeploy } from "./";
import { ConfigLoader, IFuncpackConfig ,createLogger} from "./utils";
import {DEFAULT_OUTPUT} from "./CONSTANTS";

const logger = createLogger('azure.functions.webpack.main');

async function runCli() {
    const p = program
        .version("0.2.2")
        .option("-d, --debug", "Emits debug messages");

    // p.command("unpack <path>")
    //     .description("Will remove all traces of packing tool at the specified "
    //     + "path or the current directory if none is specified")
    //     .option("-o, --output <path>", "Path for output directory")
    //     .action(unpack);

    p.command("pack <path>")
        .description("Will pack the specified path or the current directory if none is specified")
        .option("-u, --uglify", "Uglify the project when webpacking")
        .option("-o, --output <path>", "Path for output directory")
        .action(pack);

    p.command("deploy <unique-app-name>")
        .option("-d --dir <path>", "bund directory")
        .description("Will pack the specified path or the current directory if none is specified")
        .action(deploy);

    p.command("*", null, { noHelp: true, isDefault: true })
        .action(() => {
            p.help();
        });

    p.parse(process.argv);

    if (!process.argv.slice(2).length) {
        p.help();
    }

}

// async function unpack(name: string, options: any) {
//     if (options.debug) {
//         process.env.DEBUG = "*";
//     }
//
//     // Grab the route either from the option, the argument (if there is only 1)
//     let projectRootPath = "";
//     try {
//         projectRootPath = name ?
//             path.resolve(process.cwd(), name) : process.cwd();
//     } catch (error) {
//         logger.error(error);
//         throw new Error("Could not determine route");
//     }
//
//     let outputPath = DEFAULT_OUTPUT;
//     try {
//         if (options.output) {
//             outputPath = path.join(options.output, outputPath);
//         }
//     } catch (e) {
//         winston.error(e);
//         throw new Error("Could not parse the output option");
//     }
//
//     winston.info("Unpacking project at: " + projectRootPath);
//     await Unpacker.unpack({ projectRootPath, outputPath });
//     winston.info("Complete!");
// }

async function pack(name: string, options: any) {
    // TBD - allow loadConfig to get a filename from options
    let config: IFuncpackConfig = await ConfigLoader.loadConfig();

    config = config || {
        ignoredModules: [],
    };

    if (options.debug) {
        process.env.DEBUG = "*";
    }

    // Grab the route either from the option, the argument (if there is only 1)
    let projectRootPath = "";
    try {
        projectRootPath = name ?
            path.join(process.cwd(), name) : process.cwd();
    } catch (error) {
        logger.error(error);
        throw new Error("Could not determine route");
    }

    let uglify = false;
    try {
        if (options.uglify) {
            uglify = true;
        }
    } catch (e) {
        logger.error(e);
        throw new Error("Could not parse the uglify option");
    }

    let outputPath = DEFAULT_OUTPUT;
    try {
        if (options.output) {
            outputPath = path.join(options.output, outputPath);
        }
    } catch (e) {
        logger.error(e);
        throw new Error("Could not parse the output option");
    }

    // Create new generator object with settings
    const generator = new PackhostGenerator({
        projectRootPath,
        outputPath,
    });

    // Attempt to generate the project
    try {
        logger.info("Generating project files/metadata");
        await generator.updateProject();
    } catch (error) {
        logger.error(error);
        throw new Error("Could not generate project");
    }

    // Webpack
    try {
        logger.info("Webpacking project");
        await WebpackRunner.run({
            projectRootPath,
            uglify,
            outputPath,
            ignoredModules: config.ignoredModules,
        });
    } catch (error) {
        logger.error(error);
        throw new Error("Could not webpack project");
    }

    logger.info("Complete!");
    process.exit(0);
}

async function deploy(name: string, options: any) {
  try{
    logger.info("Deploying project");
    const bundlePath = options.dir || DEFAULT_OUTPUT;
    const deploy = new FunctionDeploy({functionAppName:name,bundlePath});
    deploy.deploy();
    logger.info("Deployment complete");
  }catch (error) {
    logger.error(error);
    throw new Error("Could not create zip file");
  }

}
runCli();
