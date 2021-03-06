import * as path from "path";

import { FileHelper, createLogger } from "./utils";
import { DEFAULT_OUTPUT, DEFAULT_INDEX, IFxFunction, IPackhostGeneratorOptions } from "./CONSTANTS";

const logger = createLogger('azure.functions.webpack.PackhostGenerator');

export class PackhostGenerator {

  private functionsMap: Map<string, IFxFunction> = new Map<string, IFxFunction>();
  private options: IPackhostGeneratorOptions;

  constructor(options: IPackhostGeneratorOptions) {
    this.options = options;
    this.options.indexFileName = this.options.indexFileName || DEFAULT_INDEX;
    this.options.outputPath = this.options.outputPath || DEFAULT_OUTPUT;
    logger.debug(`Created new PackhostGenerator for project at: ${this.options.projectRootPath}`);
  }

  // TODO: Should probably replace this whole class with a bunch of static methods. Don't need a class.
  public async updateProject() {
    logger.debug("Starting update of Project");
    await this.throwIfInFunction();
    await this.load();
    await this.createOutputDirectory();
    await this.createHostJSFile();
    await this.moveMetaFiles();
    await this.updateFunctionJSONs();
    logger.debug("Completed update of project");
  }


  private async throwIfInFunction() {
    logger.debug("Checking if we're in a function");
    if (await FileHelper.exists(path.resolve(this.options.projectRootPath, "function.json"))) {
      throw new Error("function.json detected: run this from "
        + "the root of your Function App, not inside of a Function");
    }
  }

  private async load() {
    this.functionsMap = await FileHelper.loadFunctionsFromDirectory(this.options.projectRootPath);
  }



  private async createOutputDirectory() {
    const outputDirPath = path.join(this.options.projectRootPath, this.options.outputPath);
    if (await FileHelper.exists(outputDirPath)) {
      logger.debug(`Deleting previous output directory: ${this.options.outputPath}`);
      await FileHelper.rimraf(outputDirPath);
    }

    logger.debug(`Creating output directory: ${outputDirPath}`);
    await FileHelper.mkDirP(outputDirPath);
  }

  // create the host js file to allow the webpack generate the all-in-one bundle file for
  // multiple functions
  private async createHostJSFile() {
    logger.debug("Generating host file");
    const exportStrings: string[] = [];

    const outputDirPath = path.join(this.options.projectRootPath, this.options.outputPath);
    const relPath = path.relative(outputDirPath, this.options.projectRootPath);
    const rootRelPath = (path.sep === "\\") ? relPath.replace(/\\/g, "/") : relPath;

    for (const [name, fx] of this.functionsMap) {
      const fxvar = this.safeFunctionName(fx.name);
      let exportStmt = `    "${fxvar}": require("${rootRelPath}/${name}/${fx._originalScriptFile}")`;
      logger.debug(`The export string is ${exportStmt}`);
      if (fx.entryPoint) {
        exportStmt += `.${fx.entryPoint}`;
      }
      exportStrings.push(exportStmt);
    }

    let exportString =
      exportStrings.reduce((p, c, i, a) => p + c + ((i !== exportStrings.length - 1) ? ",\n" : "\n"), "");

    exportString = "module.exports = {\n" + exportString + "}";

    const hostFilePath = path.join(this.options.projectRootPath, this.options.outputPath, this.options.indexFileName);
    logger.debug(`Writing contents to host file: ${hostFilePath}`);
    await FileHelper.writeFileUtf8(
      hostFilePath,
      exportString);
  }

  private async moveMetaFiles() {
    logger.debug("Moving meta fils, i.e host.json, funciton.json");

    await FileHelper.copy(path.resolve(this.options.projectRootPath, "host.json"),
      path.resolve(this.options.outputPath, "host.json"));

    for (const [name, fx] of this.functionsMap) {

      logger.debug(`Moving meta for function ${name}`);
      const fxJsonPath = path.resolve(this.options.projectRootPath, name, "function.json");

      const fxJsoneTargetFolderPath = path.resolve(this.options.projectRootPath,
        this.options.outputPath, name);
      if (! await FileHelper.exists(fxJsoneTargetFolderPath)) {
        await FileHelper.mkdir(fxJsoneTargetFolderPath);
      }

      await FileHelper.copy(fxJsonPath, path.resolve(fxJsoneTargetFolderPath, "function.json"), )
    }
  }

  private async updateFunctionJSONs() {
    logger.debug("Updating function.json file");
    for (const [name, fx] of this.functionsMap) {
      logger.debug(`Updating function${name}`);
      const fxJsonPath = path.resolve(this.options.projectRootPath,
        this.options.outputPath, name, "function.json");
      const fxvar = this.safeFunctionName(fx.name);
      const fxJson = await FileHelper.readFileAsJSON(fxJsonPath);

      fxJson._originalScriptFile = fx._originalScriptFile;
      fxJson.scriptFile = `../${this.options.indexFileName}`;
      fxJson.entryPoint = fxvar;
      await FileHelper.overwriteFileUtf8(fxJsonPath, JSON.stringify(fxJson, null, " "));
    }
  }

  private safeFunctionName(name: string): string {
    return name.replace("-", "$dash");
  }
}
