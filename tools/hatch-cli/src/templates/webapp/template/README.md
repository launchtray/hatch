# HATCH_CLI_TEMPLATE_VAR_projectShortName
This project is a TypeScript [single-page web application](https://en.wikipedia.org/wiki/Single-page_application) built 
using the [hatch](https://github.com/@launchtray/hatch) tools and libraries.

## Key hatch dependencies
The following are key hatch libraries used by this project:
* [hatch-web-server](https://github.com/launchtray/hatch/tree/master/libraries/hatch-web-server) -- for composing the 
  web server application
* [hatch-web-client](https://github.com/launchtray/hatch/tree/master/libraries/hatch-web-client) -- for composing the 
  web client application
* [hatch-web](https://github.com/launchtray/hatch/tree/master/libraries/hatch-web) -- for utilties for building a 
  portable UI
* [hatch-util](https://github.com/launchtray/hatch/tree/master/libraries/hatch-util) -- for dependency injection and 
  logging
* [hatch-server-middleware](https://github.com/launchtray/hatch/tree/master/libraries/hatch-server-middleware) -- for 
  common, app-agnostic server middleware components
* [hatch-test](https://github.com/launchtray/hatch/tree/master/libraries/hatch-test) -- for testing tools, including a 
  Selenium WebDriver wrapper

## Technology stack
This project is directly dependent on the following technologies, as they are peer dependencies of the hatch libraries 
above:
* [Razzle](https://github.com/jaredpalmer/razzle) -- for server-side rendering, hot reloading setup, and so much more
* [express](https://expressjs.com) -- for server-side routing and request handling
* The following client-side UI libraries: 
  * [React](https://reactjs.org), 
  * [Redux](https://redux.js.org), 
  * [Redux-Saga](https://redux-saga.js.org), 
  * [React Native for Web](http://necolas.github.io/react-native-web), and
  * [React Router](https://reacttraining.com/react-router)
* [winston](https://github.com/winstonjs/winston) -- for logging, server-side
* [Sentry](https://sentry.io) -- for error reporting

## Key modules and patterns
The following subsections describe the key types of modules and architectural patterns used in this project:
* [server.ts](#serverts) -- main server entry point
* [client.ts](#clientts) -- main client entry point
* [composeCommon.ts](#composecommonts) -- composes common UI modules
* [composeServer.ts](#composeserverts) -- composes server modules
* [composeClient.ts](#composeclientts) -- composes client modules
* [Controllers](#Controllers) -- handle HTTP requests
* [Components](#Components) -- render UI
* [Containers](#Containers) -- connect UI components to routing logic 
* [Managers](#Managers) -- manage the UI state
* [Actions](#Actions) -- represent events triggered by and/or affecting the UI
* [Reducers](#Reducers) -- represents the UI state
* [Services](#Services) -- business logic
* [Utilities](#Utilities) -- app-agnostic utility modules

### server.ts
This is the entry point for the web server process. This file will likely never need to be changed. To change the
composition of the web server, instead edit the [composeServer.ts](#composeserverts) module.

### client.ts
This is the entry point for the web client running in the browser. This file will likely never need to be changed. 
To change the composition of the client, instead edit the [composeClient.ts](#composeclientts) module.

### composeCommon.ts
This module is responsible for registering modules used by both the client and server with the dependency injection
container, so that they can be found by other classes as they are instantiated and called. The ROOT_CONTAINER export  
from the `hatch-util` library should be used for this registration. 

The default export of this file is responsible for returning an object implementing the `WebCommonComposition` interface
from `hatch-web`. Conceptually, `WebCommonComposition` represents the entry points for the web UI, including the root 
component, and the [web app manager classes](#Managers) that manage the UI state. Note that the UI needs to be defined 
here, rather than in [composeClient.ts](#composeclientts) in order to support server-side rendering.

### composeServer.ts
This module is responsible for registering modules used by just the web server with the dependency injection container
container, so that they can be found by other classes as they are instantiated and called. The ROOT_CONTAINER export
from the `hatch-util` library should be used for this registration. 

The default export of this file is responsible for returning an object implementing the `WebServerComposition` interface
from `hatch-web-server`. Conceptually, `WebServerComposition` represents the entry points for HTTP API routes, in the 
form of the [controller](#Controllers) objects that manage those routes. Note that the web app UI routes are not managed
by these controllers, as they are instead defined via the structure of React components making use of 
[React Router](https://reacttraining.com/react-router), and by UI state logic managed by 
[web app manager classes](#Managers).

### composeClient.ts
This module is responsible for registering modules used by just the web client with the dependency injection container
container, so that they can be found by other classes as they are instantiated and called. The ROOT_CONTAINER export
from the `hatch-util` library should be used for this registration. 

The default export of this file is responsible for returning an object implementing the `WebClientComposition` interface
from `hatch-web-server`. Conceptually, `WebClientComposition` represents entry points for the client application which
are not already coverd by `WebCommonComposition`.

### Controllers
Controllers define HTTP routes that the server handles.

Controllers can be generated by running `hatch controller <ModuleName>`, and should live in the 
[controllers](src/controllers) directory (see more information there).

### Components
Components are presentational React Components.

Components can be generated by running `hatch component <ModuleName>`, and should live in the 
[components](src/components) directory (see more information there).

### Containers
Containers are React Components connected to the Redux store and/or concerned with routing.

Containers can be generated by running `hatch container <ModuleName>`, and should live in the 
[containers](src/containers) directory (see more information there).

### Managers
Managers tie the UI to business logic.

Managers can be generated by running `hatch manager <ModuleName>`, and should live in the [managers](src/managers) 
directory.

### Actions
Actions are simply [Redux actions](https://redux.js.org/basics/actions).

Actions should live in the [actions](src/actions) directory (see more information there).

### Reducers
Reducers are simply [Redux reducers](https://redux.js.org/basics/reducers).

Reducers can be generated by running `hatch reducer <moduleName>`, and should live in the [reducers](src/reducers) 
directory.

### Services
Services are business logic modules.

Services can be generated by running `hatch injectable <ModuleName>`, and should live in the [services](src/services) 
directory (see more information there).
 
### Utilities
Utilities are app-agnostic modules which contain reusable logic used by any of the above modules.

Utilities should live in the [utilities](src/utilities) directory (see more information there).

## Developer setup
1. First, ensure all dependencies are installed using your package manager, e.g. for npm:

    ```
    npm install
    ```
1. To run in development mode with hot reloading, run the `start` script with your package manager, e.g. for npm:

    ```
    npm start
    ```
    You can view your webpp at http://localhost:3000, unless a different port was selected via the PORT environment 
    variable, e.g. via:

    ```
    PORT=80 npm start
    ```
    If you'd like to restart the server while it's running, simply type `rs`
1. To build the app for production, run the `build` script, e.g. with npm:

    ```
    npm build
    ```
1. To run the production-built app, run the `start:prod` script, e.g. with npm:

    ```
    npm start:prod
    ```
1. To run tests, run the Jest test watcher via the `test` script, e.g. with npm:

    ```
    npm test
    ```
## Environment variables
The following environment variables can be set to impact the application:

`PORT`
- If set, the application will be served via the port specified. Otherwise, it will default to 3000.
- This can be set at build time or at run time. The run-time value will override the build-time value.

`STATIC_ASSETS_BASE_URL`
- If set, the contents of the public directory will not be served, with the expectation that they will be separately served at `$STATIC_ASSETS_BASE_URL` (e.g. via a CDN)
- If unset, the contents of the public directory (`$PROJECT_ROOT/public` for development `$PROJECT_ROOT/build/public` for production) will be served at `/`.

`STATIC_ASSETS_CROSS_ORIGIN`
- If set, the static JS bundle will be served with a `crossorigin` attribute.

`LOG_FILE`
- Specifies the file name that the application should log to on the server.
- The application can override how the log file is determined by injecting a filename using the `serverLogFile` token. If this is done, `LOG_FILE` will only be obeyed if the application makes use of it via the value injected as `serverLogFile`.
- If `serverLogFile` is not registered by the application, `LOG_FILE` will be used if set. Otherwise, `{app name}.log` will be used.

`LOG_LEVEL`
- Specifies the log level the application (via winston) should use for logging.
- The application can override how the logging level is determined by injecting a filename using the `logLevel` token. If this is done, `LOG_LEVEL` will only be obeyed if the application makes use of it via the value injected as `logLevel`.
- If `logLevel` is not registered by the application, `LOG_LEVEL` will be used if it set. Otherwise, `debug` will be used for development and `info` will be used for production.

`LOG_TO_CONSOLE`
- If set, production builds will log to stdout rather than the log file. 
