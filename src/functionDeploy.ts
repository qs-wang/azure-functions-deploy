// import * as debugLib from "debug";
import {AzureProvider} from './provider';
import { FileHelper } from "./utils";
import * as winston from "winston";

// const debug = debugLib("azure-functions-pack:functionDeploy");

export class FunctionDeploy{

  azure:AzureProvider;
  bundlePath:string;
  //TODO: options??
  constructor(options:any){
    this.bundlePath = options.bundlePath;
    this.azure = new AzureProvider(options);
  }

  public async deploy(){
    await this.login();
    await this.cleanUpFunctions();
    await this.createResourceGroup();
    await this.createFunctionApp();
    const zipFile = await this.createZipFile();
    await this.zipDeploy(zipFile);
  }

  private async login(){
    return this.azure.login();
  }

  private async cleanUpFunctions(){
      const isExisting = await this.azure.isExistingFunctionApp();
      if(isExisting){
        await this.azure.getDeployedFunctionsNames();
        //tod load all functions
        await this.azure.cleanUpFunctionsBeforeDeploy(null);
      }
  }

  private async createResourceGroup(){
    return this.azure.createResourceGroup();
  }

  private async createFunctionApp(){
    return this.azure.createFunctionApp();
  }

  private async createZipFile(){
    await FileHelper.mkDirP('./.bundle');
    return FileHelper.zipFolder(this.bundlePath,'./.bundle/app.zip');
  }

  private async zipDeploy(zipFile:string){
    return this.azure.uploadFunction(zipFile);
  }

}
