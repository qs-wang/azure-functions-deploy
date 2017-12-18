# Azure Functions Pack

This is a tool to make it easy to package, and deploy your Azure Functions Node.js Functions for optimal performance on Azure Functions.
This is inspired by the original azure-functions-pack, and serverless-azure-function code. They're all great tools, however are all not 100% fit to my requirements.

## The problem addressed

Whenever an Azure Function App is recreated on demand (a so called "cold start") the node'js module cache for each Function will be empty. The current Functions file system is sluggish in dealing with many small file accesses so there is a significant delay as node reads all the module files. Fortunately, node caches the modules in memory so subsequent accesses are fast.

The azure-funciton-pack tool packs the JS module with webpack to address the issue above. Howeever it manipulates the original funciton.json file directly, which is not good for me. 

I'd like to separate the pack output to a separate folder, and generate the funciton.json file with right entry point points to the js bundle file. This way the output folder contains the minimal files, and is ready for deploy to azure.
The source code keeps untouched, so there's no requirement of unpack command anymore.

Another missing part of the azure-funciton-pack is that the user will need use Azure CLI to publish the function to Azure. It works great, but need user manages the resource group, storage accout, and etc. 

The servless-azure-functions manages the whole lifecycle of the serverless functions quit well, but its webpack plugins is not perfect for azure. 

I combied the webpack feature, and the serveless function app deploy feature together in this tool, so that the user can pack the code, and deploy it with just one tool.


## The solution
With the pack command, webpack is used to place all the modules in a single file to the output folder, 'dist' by default. 

The Function folder structures, and the `functions.json` files are also generated in the output folder.  

With the publish command, the output folder is zipped, and published to the azure cloud via kudu api.

With the deploy command, it run both of the above 2 steps.

:construction: This project is experimental; use with caution and be prepared for breaking changes. :construction:

NOde: This is a different version of the original azure's code. 

## How to run

In the Function App directory:
```
npm install -g azure-functions-deploy

funcdeploy pack ./
funcdeploy publish unique-function-name
funcdeploy deploy unique-function-name
```

## Example
```
npm install -g azure-functions-deploy
git clone https://github.com/qs-wang/azure-functions-deploy.git
cd azure-functions-deploy/sample
npm install
funcdeploy pack ./
funcdeploy publish mysamplefunction456
```
Node: you need have a valid azure subscription to run the publish command. For non-interactive login, you need install the Azure CLI and run the az login command beforehand. 

## API

```
Usage: main [options] [command]


  Commands:

    pack [options] <path>    Will pack the specified path or the current directory if none is specified

    publish [options] <name>    Will publish the bundle code to azure with given name.

    deploy [options] <name>  run pack, and publish sequentially.

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

Note: the uglify feature only supports some small amount of es6, so I recommend that if you get errors either don't uglify or drop your code down to es5.

### pack

```
Usage: pack [options] <path>

  Will pack the specified path or the current directory if none is specified

  Options:

    -h, --help           output usage information
    -u, --uglify         Uglify the project when webpacking
    -o, --output <path>  Path for output directory
```

### publish

```
Usage: publish [options] <name>

  Will publish the bundle folder to the azure with the given name.

  Options:

    -h, --help           output usage information
    -u, --uglify         Uglify the project when webpacking
    -d, --dir <path>     Path for bundle directory
    -l, --location <location> the host location,e.g. westus, australiaeast, and etc. Default value is westus.
```

### deploy

```
Usage: deploy [options] <name>

  Will pack, and deploy the project to the azure with the given name.

  Options:

    -h, --help           output usage information
    -u, --uglify         Uglify the project when webpacking
    -o, --output <path>  Path for output directory
```


git clone 
<!-- ### funcdeploy.config.json

Pack will optionally take in a config file that will let you further customize the behavior. The config file must be in the directory you run the command from and named `funcpack.config.json`.

Here are all the supported options:

```
{
  "ignoredModules":["chai"]
}
``` -->

## License

[MIT](LICENSE)