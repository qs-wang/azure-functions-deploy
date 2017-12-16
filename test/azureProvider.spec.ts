//TODO: need understand the typescript for using import.
const AzureProvider = require('../src/provider').AzureProvider;

// console.log(AzureProvider);

describe('The azure client', () => {
  it('should not create the azure provider', async () => {
    try {
      const azure = new AzureProvider();
      fail('must provide options');
    } catch (error) {
      // console.log(error);
      //ignore error;
    }
  })

  it('should login with  azure provider', async () => {
    try {
      const azure = new AzureProvider({});
      // console.log(azure);
      const principalCredentials = await azure.login();
      expect(principalCredentials).not.toBeUndefined();

    } catch (error) {
      fail(error);
    }
  })

  it('should not create the resource group', async () => {
    try {
      const azure = new AzureProvider({});
      await azure.login();
      const result = await azure.CreateResourceGroup();
      fail('Should not be here');
    } catch (error) {
      //ignore error.
    }
  })

  it('should create the resource group', async () => {
    try {
      jest.setTimeout(100000);
      const azure = new AzureProvider({ functionAppName: 'mytest123' });
      await azure.login();
      const result = await azure.createResourceGroup();
      expect(result.name).toBe('mytest123-rg')
      await azure.deleteResourceGroup();

    } catch (error) {
      fail(error);
    }
  });


  it('should create the Function APP', async () => {
    try {
      jest.setTimeout(900000);
      const azure = new AzureProvider({ functionAppName: 'mytest456' });
      await azure.login();
      const result = await azure.createResourceGroup();
      expect(result.name).toBe('mytest456-rg')
      const app = await azure.createFunctionApp();
      expect(app.properties.parameters.functionAppName.value).toBe('mytest456');

      await azure.deleteResourceGroup();

    } catch (error) {
      fail(error);
    }
  });


  it('should find the Function APP', async () => {
    try {
      jest.setTimeout(900000);
      const azure = new AzureProvider({ functionAppName: 'mytest789' });
      await azure.login();
      let result = await azure.createResourceGroup();
      expect(result.name).toBe('mytest789-rg')

      const app = await azure.createFunctionApp();
      result = await azure.isExistingFunctionApp();
      expect(result).toBeTruthy();
      await azure.deleteResourceGroup();
    } catch (error) {
      fail(error);
    }
  });
})
