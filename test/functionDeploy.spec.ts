import { FunctionDeploy } from '../src/functionDeploy';

describe('The function deploy', () => {
  it('should deploy the default folder', async () => {
    try {
      jest.setTimeout(999999);
      const deploy = new FunctionDeploy({ functionAppName: 'MyTestFunc456', bundlePath: './testproject/dist' })
      await deploy.deploy();
    } catch (error) {
      fail(error);
    }
  })
})
