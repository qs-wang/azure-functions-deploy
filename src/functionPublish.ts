// import * as debugLib from "debug";
import { AzureProvider } from './provider';
import { FileHelper } from "./utils";
import * as winston from "winston";
import { createLogger } from './utils/logger';

const logger = createLogger('azure.functions.webpack.funcitonDeploy');

export class FunctionDeploy {

  azure: AzureProvider;
  bundlePath: string;

  constructor(options: any) {
    this.bundlePath = options.bundlePath;
    this.azure = new AzureProvider(options);
  }

  public async deploy() {
    await this.login();
    await this.cleanUpFunctions();
    await this.createResourceGroup();
    await this.createFunctionApp();
    const zipFile = await this.createZipFile();
    await this.zipDeploy(zipFile);
  }

  private async login() {
    return this.azure.login();
  }

  private async cleanUpFunctions() {
    const isExisting = await this.azure.isExistingFunctionApp();
    if (isExisting) {
      logger.debug(`Existing Function App found, trying to clean up...`);
      const functions = await FileHelper.loadFunctionsFromDirectory(this.bundlePath);
      if (functions && functions.size > 0) {
        await this.azure.getDeployedFunctionsNames();
        await this.azure.cleanUpFunctionsBeforeDeploy(Array.from(functions.keys()));
      }
    }
  }

  private async createResourceGroup() {
    return this.azure.createResourceGroup();
  }

  private async createFunctionApp() {
    return this.azure.createFunctionApp();
  }

  private async createZipFile() {
    await FileHelper.mkDirP('./.bundle');
    return FileHelper.zipFolder(this.bundlePath, './.bundle/app.zip');
  }

  private async zipDeploy(zipFile: string) {
    return this.azure.uploadFunction(zipFile);
  }

}
