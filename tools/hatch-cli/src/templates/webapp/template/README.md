# HATCH_CLI_TEMPLATE_VAR_projectName
This project is a TypeScript [single-page web application](https://en.wikipedia.org/wiki/Single-page_application) built 
using the [hatch](https://github.com/@launchtray/hatch) tools and libraries.

## Key hatch dependencies
The following are key hatch libraries used by this project:
* [hatch-web-server](../../../../../libraries/hatch-web-server) -- for composing the web server application
* [hatch-web-client](../../../../../libraries/hatch-web-client) -- for composing the web client application
* [hatch-web](../../../../../libraries/hatch-web) -- for utilties for building a portable UI
* [hatch-util](../../../../../libraries/hatch-util) -- for dependency injection and logging
* [hatch-server-middleware](../../../../../libraries/hatch-server-middleware) -- for common, app-agnostic server 
  middleware components
* [hatch-test](../../../../../libraries/hatch-test) -- for testing tools, including a Selenium WebDriver wrapper

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
The following subsections describe the key types of components and architectural patterns used in this project.
### client.ts
### server.ts
### composeCommon.ts
### composeClient.ts
### composeServer.ts
### Components
### Containers
### Managers
### Actions
### Reducers
### Controllers
### Services
### Utilities

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