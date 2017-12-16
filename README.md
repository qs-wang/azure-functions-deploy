# Azure Functions Pack

This is a tool to make it easy to package, and deploy your Azure Functions Node.js Functions for optimal performance on Azure Functions.
This is inspired by the original azure-functions-pack, and serverless-azure-function code. They're all great tools, however are all not 100% fit to my requirements.

## The problem addressed

Whenever an Azure Function App is recreated on demand (a so called "cold start") the node'js module cache for each Function will be empty. The current Functions file system is sluggish in dealing with many small file accesses so there is a significant delay as node reads all the module files. Fortunately, node caches the modules in memory so subsequent accesses are fast.

The azure-funciton-pack tool packs the JS module with webpack to address the issue above, but it manipulates the original funciton.json file directly.

I'd like to separate the pack output to a separate folder, and generate the funciton.json file with right entry point points to the generated JS code, so that the output folder contains the minimal files, and is ready for deploy to azure.
The developer can still work on the original source code without worry about pack/unpack.

The servless-azure-functions manages the whole lifecycle of the serverless functions, but the webpack plugins is not perfect for azure. I want a small tool just handles the pack and deploy tasks. The developer can use other tools, e.g. vs code, to manage the function creation, and other aspect of the whole lifecycle.

## The solution
With the pack command, a javascript module bundler (webpack) is used to place all the modules in a single file to the output folder, dist by default. The Function folder structures, and the right `functions.json` files are then generated so the output folder is exactly the structure will be uploaded to the azure server.




:construction: This project is experimental; use with caution and be prepared for breaking changes. [Q.S.]This is a patched version of the original azure's code. Use for my own requirements for now.:construction:

## How to run

In the Function App directory:

```
npm install -g stackchat@azure-functions-pack
funcpack pack ./
funcpack deploy unique-function-name
```

You can then test locally using the CLI tool: `func run <myfunc>`

When uploading your files, you need to include the single `dist` directory (in the Functions App root), but you don't need your `node_modules` directory.

## API

```
Usage: main [options] [command]


  Commands:

    pack [options] <path>    Will pack the specified path or the current directory if none is specified

    deploy [options] <name>  Will remove all traces of packing tool at the specified path or the current directory if none is specified

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -d, --debug    Emits debug messages
```

Note: the uglify feature only supports some small amount of es6, so I recommend that if you get errors either don't uglify or drop your code down to es5.

Uglify will minimize the sample project that's included from 27 MB to 9 MB.

### pack

```
Usage: pack [options] <path>

  Will pack the specified path or the current directory if none is specified

  Options:

    -h, --help           output usage information
    -u, --uglify         Uglify the project when webpacking
    -o, --output <path>  Path for output directory
```
### deploy

```
Usage: deploy [options] <name>

  Will deploy the 'dist' bundle folder to the azure with the given name.

  Options:

    -h, --help           output usage information
    -u, --uglify         Uglify the project when webpacking
    -d, --dir <path>     Path for bundle directory
```

### funcpack.config.json

Pack will optionally take in a config file that will let you further customize the behavior. The config file must be in the directory you run the command from and named `funcpack.config.json`.

Here are all the supported options:

```
{
  "ignoredModules":["chai"]
}
```

## License

[MIT](LICENSE)