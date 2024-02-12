# hatch-webpack-config
This project is a library containing functions for easily configuring Webpack 5 for a TypeScript-based web 
application. The webpack configuration used by this library is based on the one used by the 
[Razzle](https://github.com/jaredpalmer/razzle) project, which as of this writing was no longer maintained. 
Up until creation of this library, Hatch relied heavily on the TypeScript features of Razzle directly. This library
is a paring down of Razzle (with some enhancements) to include only what is needed by Hatch. 

This library works best with the [Heft Webpack Plugin](https://heft.rushstack.io/pages/plugins/webpack/). Here is an
example Heft config using this plugin:
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/heft/v0/heft.schema.json",
  "aliasesByName": {
    "start": {
      "actionName": "build-watch",
      "defaultParameters": ["--clean", "--webpack5:serve"]
    }
  },
  "phasesByName": {
    "build": {
      "phaseDescription": "This phase compiles the project source code.",
      "cleanFiles": [{ "sourcePath": "dist" }, { "sourcePath": "build" }],
      "tasksByName": {
        "webpack": {
          "taskPlugin": {
            "pluginPackage": "@rushstack/heft-webpack5-plugin"
          }
        }
      }
    }
  }
}
```
And here is an example webpack.config.js file (which is the default filename used by the above plugin) which makes 
use of this library:
```js
'use strict';
const {createWebappConfig} = require("@launchtray/hatch-webpack-config");
module.exports = createWebappConfig({appDirectory: __dirname});
```

With the above setup, simple "build" and "start" scripts (to build production bundles, and to run a dev server,
respectively) can be added to a project's package.json using the following Heft commands:
```json
"start": "heft start",
"build": "heft build --clean",
```