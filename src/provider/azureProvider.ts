//Originally from serverless.com's code. Converted to Typescript code, and made the changes to fit my requirement.
//Mojor changes except for typescript related
//1. Used kudu zipdeploy api, not the zip api.
//2. Removed the git template.
//3. Used nodejs sdk for checking existence of app.

import * as Promise from 'bluebird';
import * as ResourceManagement from 'azure-arm-resource';
import * as path from 'path';
import * as fs from 'fs';
import * as request from 'request';
import { createLogger } from '../utils';
import { error } from 'util';

//TODO: need understand type script's declear file. Seem it is there, but the import doesn't work
const WebSiteManagementClient = require('azure-arm-website');
const dns = require('dns');
const jsonpath = require('jsonpath');
const { login } = require('az-login');
const config = require('./config');
const pkg = require('../../package.json');
const logger = createLogger("azure.functions.webpack.azureProvider");

//FIXME: so far can only show the general error message which is dreictly returns from azure.
// figure the way to get the real, meaningful error message.
export class AzureProvider {
  functionAppName: string;
  resourceGroupName: string;
  deploymentName: string;
  location: string;
  principalCredentials: any;
  subscriptionId: string;
  functionsAdminKey: string;
  existingFunctionApp = false;
  deployedFunctionNames: string[] = [];
  invocationId: string;
  log: Function = console.log;

  constructor(options: any) {
    this.location = options.location || 'westus';
    this.functionAppName = options.functionAppName;

    this.resourceGroupName = `${this.functionAppName}-rg`;
    this.deploymentName = `${this.resourceGroupName}-deployment`;
  }

  public login() {
    logger.info(`Login to azure`);
    return login({
      interactiveLoginHandler: (code: string, message: string) => {
        // Override the interactive login handler, in order to be
        // able to append the Serverless prefix to the displayed message.
        //TODO: what is this really for???
        logger.info(message);
      }
    }).then((result: any) => {
      this.principalCredentials = result.credentials;
      this.subscriptionId = result.subscriptionId;
      logger.info(`Login to azure succesfully`);
      return this.principalCredentials;
    });
  }

  public createResourceGroup() {
    if (!this.functionAppName) {
      throw 'Must given a unique function App name';
    }

    const groupParameters = {
      location: this.location,
      tags: { sampletag: 'sampleValue' }
    };

    logger.info(`Creating resource group: ${this.resourceGroupName}`);
    const resourceClient = new ResourceManagement.ResourceManagementClient(
      this.principalCredentials, this.subscriptionId);

    resourceClient.addUserAgentInfo(`${pkg.name}/${pkg.version}`);

    return new Promise((resolve: Function, reject: Function) => {
      resourceClient.resourceGroups.createOrUpdate(this.resourceGroupName,
        groupParameters, (error: Error, result: any) => {
          if (error) return reject(error);
          resolve(result);
        })
    }).then((result) => {
      logger.info(`Created resource group: ${this.resourceGroupName}`);
      return result;
    });
  }

  public createFunctionApp() {
    logger.info(`Creating function app: ${this.functionAppName}`);
    const resourceClient = new ResourceManagement.ResourceManagementClient(this.principalCredentials, this.subscriptionId);
    let parameters = { functionAppName: { value: this.functionAppName } };
    resourceClient.addUserAgentInfo(`${pkg.name}/${pkg.version}`);

    let templateFilePath = path.join(__dirname, 'armTemplates', 'azuredeploy.json');

    let template = JSON.parse(fs.readFileSync(templateFilePath, 'utf8'));

    // Check if there are custom environment variables defined that need to be
    // added to the ARM template used in the deployment.

    //TODO: need figure this out later. So far ignore it.
    // const environmentVariables = process.env;
    // if (environmentVariables) {
    //   const appSettingsPath = '$.resources[?(@.kind=="functionapp")].properties.siteConfig.appSettings';
    //
    //   jsonpath.apply(template, appSettingsPath, function (appSettingsList:any[]) {
    //     Object.keys(environmentVariables).forEach(function (key) {
    //       appSettingsList.push({
    //         name: key,
    //         value: environmentVariables[key]
    //       });
    //     });
    //
    //     return appSettingsList;
    //   });
    // }

    const deploymentParameters = {
      properties: {
        mode: 'Incremental',
        parameters,
        template
      }
    };

    return new Promise((resolve: Function, reject: Function) => {
      resourceClient.deployments.createOrUpdate(this.resourceGroupName,
        this.deploymentName,
        deploymentParameters, (error: Error, result: any) => {
          if (error) return reject(error);

          logger.info('Waiting for Kudu endpoint...');

          setTimeout(() => {
            resolve(result);
          }, 10000);
        });
    })
      .then((result) => {
        logger.info(`Funciton App Created: ${this.resourceGroupName}`);
        return result;
      });
  }

  public deleteDeployment() {
    logger.info(`Deleting deployment: ${this.deploymentName}`);
    const resourceClient = new ResourceManagement.ResourceManagementClient(this.principalCredentials, this.subscriptionId);
    resourceClient.addUserAgentInfo(`${pkg.name}/${pkg.version}`);

    return new Promise((resolve: Function, reject: Function) => {
      resourceClient.deployments.deleteMethod(this.resourceGroupName,
        this.deploymentName, (error: Error, result: any) => {
          if (error) return reject(error);
          resolve(result);
        });
    });
  }

  public deleteResourceGroup() {
    logger.info(`Deleting resource group: ${this.resourceGroupName}`);
    const resourceClient = new ResourceManagement.ResourceManagementClient(this.principalCredentials, this.subscriptionId);
    resourceClient.addUserAgentInfo(`${pkg.name}/${pkg.version}`);

    return new Promise((resolve: Function, reject: Function) => {
      resourceClient.resourceGroups.deleteMethod(this.resourceGroupName, (error: Error, result: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  public isExistingFunctionApp() {
    const webSiteManagementClient = new WebSiteManagementClient(this.principalCredentials, this.subscriptionId, null, null);

    return webSiteManagementClient.webApps.get(this.resourceGroupName, this.functionAppName)
      .then((result: any) => {
        return result != null;
      })
      .then((result: any) => {
        logger.debug(`The function App ${this.functionAppName} existence is: ${result}`);
        this.existingFunctionApp = result;
        return result;
      })
      .catch((error: any) => {
        if (error.statusCode == 404) {
          return false;
        } else {
          throw error;
        }

      });
  }

  public getDeployedFunctionsNames() {
    const requestUrl = `https://${this.functionAppName}${config.scmDomain}${config.functionsApiPath}`;
    const options = {
      host: this.functionAppName + config.scmDomain,
      method: 'get',
      url: requestUrl,
      json: true,
      headers: {
        Authorization: config.bearer + this.principalCredentials.tokenCache._entries[0].accessToken,
        Accept: 'application/json,*/*'
      }
    };

    return new Promise((resolve: Function, reject: Function) => {
      if (this.existingFunctionApp) {
        logger.info('Looking for deployed functions that are not part of the current deployment...');
        request(options, (err: any, res: any, body: any) => {
          if (err) {
            if (err.message.includes('ENOTFOUND')) {
              resolve(res);
            } else {
              reject(err);
            }
          } else {
            if (res.statusCode === 200) {
              for (let functionNamesIndex = 0; functionNamesIndex < body.length; functionNamesIndex++) {
                const name = body[functionNamesIndex].name;
                logger.info(`Deployed function ${name} found`);
                this.deployedFunctionNames.push(name);
              }
            }
            resolve(res);
          }
        });
      } else {
        resolve('New Function App ...');
      }
    });
  }

  public getLogsStream(functionName: string) {
    const logOptions = {
      url: `https://${this.functionAppName}${config.scmDomain}${config.logStreamApiPath}${functionName}`,
      headers: {
        Authorization: config.bearer + this.principalCredentials.tokenCache._entries[0].accessToken,
        Accept: '*/*'
      }
    };

    request
      .get(logOptions)
      .on('error', () => {
        console.error('Disconnected from log streaming.');
      })
      .on('end', this.getLogsStream.bind(this))
      .pipe(process.stdout);
  }

  public getInvocationId(functionName: string) {
    const options = {
      url: `https://${this.functionAppName}${config.scmDomain}${config.logInvocationsApiPath + this.functionAppName}-${functionName}/invocations?limit=5`,
      method: 'GET',
      json: true,
      headers: {
        Authorization: config.bearer + this.principalCredentials.tokenCache._entries[0].accessToken
      }
    };

    return new Promise((resolve: Function, reject: Function) => {
      request(options, (err: any, response: any, body: any) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        this.invocationId = body.entries[0].id;

        resolve(body.entries[0].id);
      });
    });
  }

  public getLogsForInvocationId() {
    logger.info(`Logs for InvocationId: ${this.invocationId}`);
    const options = {
      url: `https://${this.functionAppName}${config.scmDomain}${config.logOutputApiPath}${this.invocationId}`,
      method: 'GET',
      json: true,
      headers: {
        Authorization: config.bearer + this.principalCredentials.tokenCache._entries[0].accessToken
      }
    };

    return new Promise((resolve: Function, reject: Function) => {
      request(options, (err: any, response: any, body: any) => {
        if (err) return reject(err);
        if (response.statusCode !== 200) return reject(body);

        resolve(body);
      });
    });
  }

  public cleanUpFunctionsBeforeDeploy(serverlessFunctions: string[]) {
    const deleteFunctionPromises: Promise<{}>[] = [];
    logger.debug(`Clean up functoins before Deploy`);
    this.deployedFunctionNames.forEach((functionName) => {
      logger.debug(`Checking function : ${functionName}`);
      if (serverlessFunctions.indexOf(functionName) < 0) {
        logger.info(`Deleting function : ${functionName}`);
        deleteFunctionPromises.push(this.deleteFunction(functionName));
      }
    });

    return Promise.all(deleteFunctionPromises);
  }

  public deleteFunction(functionName: string) {
    const requestUrl = `https://${this.functionAppName}${config.scmVfsPath}${functionName}/?recursive=true`;
    const options = {
      host: this.functionAppName + config.scmDomain,
      method: 'delete',
      url: requestUrl,
      json: true,
      headers: {
        Authorization: config.bearer + this.principalCredentials.tokenCache._entries[0].accessToken,
        Accept: '*/*'
      }
    };

    return new Promise((resolve: Function, reject: Function) => {
      request(options, (err: any, res: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  public uploadFunction(functionZipFile: string) {
    return new Promise((resolve: Function, reject: Function) => {
      logger.info(`Uploading function: ${this.functionAppName}`);

      //Using kudu zipdeploy api.
      const requestUrl = `https://${this.functionAppName}${config.scmZipApiPath}`;
      const options = {
        url: requestUrl,
        headers: {
          Authorization: config.bearer + this.principalCredentials.tokenCache._entries[0].accessToken,
          Accept: '*/*'
        }
      };

      logger.debug(`request url is: ${requestUrl}`);

      fs.createReadStream(functionZipFile)
        .pipe(request.post(options, (uploadZipErr: any, uploadZipResponse: any) => {
          if (uploadZipErr) {
            logger.info(`Uploading function ${this.functionAppName} failed`);
            reject(uploadZipErr);
          } else {
            logger.info(`Uploading function ${this.functionAppName} compelete`);
            resolve(uploadZipResponse);
          }
        }));
    });
  }
}
