<p align="center"> 
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_eyes.png" width="10%">
</p>

# hatch
This repository contains tools and libraries to jump start development of TypeScript applications of several types.

The `hatch` command-line application is used to generate TypeScript projects that require minimal setup and boilerplate
to start developing application code. This is achieved by generating projects which delegate heavily to the `hatch-*` 
libraries in this repository. These libraries are highly opinionated, meaning they typically have several peer 
dependencies, and are intended to be used according specific architectural patterns.

The hatch tools are intended for developers who are comfortable sacrificing flexibility in libraries and architecture in 
exchange for reducing time to development of application features. Developers who are looking for more flexibility and 
don't mind the extra work to get things set up exactly how they want it should consider using tools which are less 
opinionated, like [create-react-app](https://github.com/facebook/create-react-app), [Expo](https://expo.io/), 
[electron](https://electronjs.org), [express](http://expressjs.com), or [Razzle](https://github.com/jaredpalmer/razzle). 
These are all great frameworks, and some of them used heavily by hatch for its foundation. 

## Installation
The `hatch` command-line application can be installed via the npm registry, e.g. with npm:
```
npm install -g @launchtray/hatch-cli
```

## Usage
For up-to-date command-line usage, issue the following:
```
hatch --help
```

The `hatch` CLI can be used to "hatch" entire starter projects, as well as individual modules within an existing project that conform to
architectural patterns that hatch uses.

Currently, the hatch CLI supports generating projects using the following templates:
* **[webapp](tools/hatch-cli/src/templates/webapp)** --
a [single-page web application](https://en.wikipedia.org/wiki/Single-page_application) with:
    * Dependency injection, with the help of [tsyringe](https://github.com/microsoft/tsyringe)
    * An [express](https://expressjs.com)-based web server with server-side rendering (and much more), via a [Razzle](https://github.com/jaredpalmer/razzle) foundation
    * Portable UI architectural patterns, using 
        [React](https://reactjs.org), 
        [Redux](https://redux.js.org), 
        [Redux-Saga](https://redux-saga.js.org), 
        [React Native for Web](http://necolas.github.io/react-native-web), and
        [React Router](https://reacttraining.com/react-router)
    * Flexible logging using [winston](https://github.com/winstonjs/winston)
    
Refer to documentation for the project types above for more details on what individual modules can be generated for each
project type.

## Common concepts 
The following concepts and principles are employed throughout the hatch tools, libraries and template projects:
* ([SOLID principles](https://en.wikipedia.org/wiki/SOLID) in general)
* Dependency injection 
* Composition over inheritance
* Unidirectional dependencies / data flow
* Preference for pure UI components

## Developer setup
These instructions are for developers who would like to contribute to hatch libraries and tools. These steps are not 
necessary if you just want to use hatch.

1. Install the latest LTS version of node. e.g. for macOS:

    ```
    $ brew uninstall node
    $ brew install node@12
    $ brew link --force --overwrite node@12
    ```

2. Install [Rush](https://rushjs.io/pages/intro/welcome/):

    ```
    $ npm install -g @microsoft/rush
    ```
    
3. Install package dependencies:

    ```
    $ rush install
    ```
    
4. Build hatch libraries:

    ```
    $ rush build
    ```
    
4. Run an example app:

    ```
    $ cd examples/example-web
    $ rushx start
    ```
    