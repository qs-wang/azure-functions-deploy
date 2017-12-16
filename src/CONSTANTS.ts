export const DEFAULT_OUTPUT = "dist";
export const DEFAULT_INDEX = "index.js";
export const TEMP_OUTPUT = "output.js";

export interface IPackhostGeneratorOptions {
    projectRootPath: string;
    outputPath?: string;
    indexFileName?: string;
}

export interface IFxFunction {
    name: string;
    entryPoint: string;
    scriptFile: string;
    // _originalEntryPoint: string | boolean;
    _originalScriptFile: string | boolean;
}
