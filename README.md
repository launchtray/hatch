<p align="center"> 
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_eyes.png" width="10%">
</p>

# hatch
This repository contains opinionated tools and libraries to jump start development of TypeScript applications for 
several platforms.

The `hatch` command-line application is used to "hatch" TypeScript projects that require minimal setup and boilerplate
to start developing application code. This is achieved by generating projects which delegate heavily to the `hatch-*` 
libraries in this repository. These libraries are highly opinionated, meaning they typically have several peer 
dependencies, and are intended to be used according specific architectural patterns.

## Disclaimer
This project is very much a work in progress. Until the first major release, there will likely be issues, sparse 
documentation, and APIs that are changing in backwards-incompatible ways. Please proceed at your own risk.

## Who is this for?
In short, probably just ourselves! But maybe you, too.

These tools were written so that we, the authors, could use them to jump start our own projects according to design
and architectural patterns that we've personally and professionally used successfully elsewhere.

That being said, it's possible that others developing TypeScript apps might find hatch useful. In particular, hatch
might be useful for developers who are comfortable sacrificing flexibility in libraries and architecture in exchange for
reducing time to development of application features. Developers who are looking for more flexibility and don't mind the
extra work to get things set up exactly how they want it should consider using tools which are less opinionated, like
[create-react-app](https://github.com/facebook/create-react-app), 
[Expo](https://expo.io/), 
[electron](https://electronjs.org), 
[express](http://expressjs.com), or 
[Razzle](https://github.com/jaredpalmer/razzle). 
These are all great frameworks, and some of them used heavily by hatch for its foundation. 

## Acknowledgements
This project would not be possible without the support of the initial contributors' employer, 
[Bigfoot Biomedical](https://www.bigfootbiomedical.com/), which has allowed us to work on the project both on our time 
and on Bigfoot's when it is mutually beneficial. Bigfoot Biomedical has deep roots in the open source community, and 
benefits greatly from it. We are proud to have Bigfoot's support as we contribute hatch back to this community.

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

### Supported templates
Currently, the hatch CLI supports hatching projects using the following templates:
* **[api](tools/hatch-cli/src/templates/api)** -- a project that defines or generates an 
  [OpenAPI Specification](https://swagger.io/resources/open-api/) using multiple input YAML or JSON API specifications
  and/or specifications using the [Spot](https://github.com/airtasker/spot) DSL.
* **[client-sdk](tools/hatch-cli/src/templates/client-sdk)** -- An auto-generated client SDK library that stays in sync 
  with a specified [OpenAPI Specification](https://swagger.io/resources/open-api/) and/or 
  [api](tools/hatch-cli/src/templates/api) project
* **[server-sdk](tools/hatch-cli/src/templates/server-sdk)** -- An auto-generated client SDK library that stays in sync
  with a specified [OpenAPI Specification](https://swagger.io/resources/open-api/) and/or
  [api](tools/hatch-cli/src/templates/api) project. This library contains TypeScript interfaces that a server must 
  implement in order to provide an API defined by the input OpenAPI spec, as well as functions to register those
  interfaces as middleware for the webapp or microservice projects described below. 
* **[webapp](tools/hatch-cli/src/templates/webapp)** --
a [single-page web application](https://en.wikipedia.org/wiki/Single-page_application) with:
    * Dependency injection, with the help of [tsyringe](https://github.com/microsoft/tsyringe)
    * An [express](https://expressjs.com)-based web server with server-side rendering (and much more), via a 
      [Razzle](https://github.com/jaredpalmer/razzle) foundation
    * Portable UI architectural patterns, using 
        [React](https://reactjs.org), 
        [Redux](https://redux.js.org), 
        [Redux-Saga](https://redux-saga.js.org), 
        [React Native for Web](http://necolas.github.io/react-native-web), and
        [React Router](https://reacttraining.com/react-router)
    * Flexible logging using [winston](https://github.com/winstonjs/winston)
    * Optional error reporting via [Sentry](https://sentry.io)
* **[microservice](tools/hatch-cli/src/templates/microservice)** -- a lighter server which uses similar design patterns
  to the webapp template, but does not include code for a client UI
* **[monorepo](tools/hatch-cli/src/templates/monorepo)** -- an (initially) empty monorepo using Rush and Hatch best 
  practices
    
Refer to documentation for the project types above for more details on what individual modules can be hatched for each
project type.

## Common concepts 
The following concepts and principles are employed throughout the hatch tools, libraries and template projects:
* ([SOLID principles](https://en.wikipedia.org/wiki/SOLID) in general)
* Dependency injection 
* Composition over inheritance
* Unidirectional dependencies / data flow
* Preference for pure UI components

## Packages
The hatch repository is split up into the packages below. Generally, these packages are used by the 
[templates](#supported-templates) generated by the `hatch` command-line application and are not typically used on their 
own outside of a project created by `hatch`.
* [hatch-cli](tools/hatch-cli) -- the source for the `hatch` command-line application
* [hatch-web-client](libraries/hatch-web-client) -- a library used for composing web client applications, including the 
  client-side part of the [webapp](tools/hatch-cli/src/templates/webapp) template
* [hatch-web-server](libraries/hatch-web-server) -- a library used for composing web server applications, including the 
  server-side part of the [webapp](tools/hatch-cli/src/templates/webapp) template
* [hatch-server](libraries/hatch-server) -- a library used for composing HTTP server applications, this is used by the
  [microservice](tools/hatch-cli/src/templates/microservice) template, as well as by hatch-web-server
* [hatch-web](libraries/hatch-web) -- a library with common webapp modules used by hatch-web-server and hatch-web-client
* [hatch-server-middleware](libraries/hatch-server-middleware) -- a library containing server middleware components that
  perform common tasks, like logging all requests, or parsing a request body as JSON, etc.
* [hatch-test](libraries/hatch-test) -- a library to aid writing of automated tests
* [hatch-util](libraries/hatch-util) -- a library of utilities used by many of the other hatch libraries, including
  modules for performing dependency injection
* [hatch-razzle-config](libraries/hatch-razzle-config) -- a helper method for creating a 
  [Razzle](https://github.com/jaredpalmer/razzle) config file that is compatible with the design of the 
  [webapp](tools/hatch-cli/src/templates/webapp) template
* [hatch-web-injectables](libraries/hatch-web-injectables) -- a library used for injecting useful web parameters
* [hatch-user-management-client](libraries/hatch-user-management-client) -- a library for client-side user management
* [hatch-server-user-management](libraries/hatch-server-user-management) -- a library for server-side user management 
  such as authentication, user registration, and password resetting that adheres to the interface defined in 
  [hatch-user-management-client](libraries/hatch-user-management-client)
* [hatch-rpc](libraries/hatch-rpc) -- a library that contains type definitions and helper classes for making remote 
  procedure calls (RPC).
* [hatch-rpc-node](libraries/hatch-rpc-node) -- library that provides remote procedure call (RPC) utilities
  for node-based projects. It includes RPC transport implementations (which can be used by classes in `hatch-rpc`) for
  worker threads and child processes, as well as higher-level utilities for sending a ReadableStream across an RPC
  interface.
* [hatch-api](libraries/hatch-api) -- a library for generating a single
  [OpenAPI Specification](https://swagger.io/resources/open-api/) using multiple input YAML or JSON API specifications
  and/or specifications using the [Spot](https://github.com/airtasker/spot) DSL.
* [hatch-sdk-generator](libraries/hatch-sdk-generator) -- a library for generating a client-sdk and/or server-sdk
  library from an [OpenAPI Specification](https://swagger.io/resources/open-api/). A project generated using this
  library can use a library created via [hatch-api](libraries/hatch-api) as its input specification.



## Developer setup
These instructions are for developers who would like to contribute to hatch libraries and tools. These steps are not 
necessary if you just want to use hatch.

1. Install the latest LTS version of node. e.g. for macOS:

    ```
    $ brew uninstall node
    $ brew install node@18
    $ brew link --force --overwrite node@12
    ```

1. Install [Rush](https://rushjs.io/pages/intro/welcome/):

    ```
    $ npm install -g @microsoft/rush
    ```
    
1. Install package dependencies:

    ```
    $ rush install
    ```
    
1. Build hatch libraries:

    ```
    $ rush build
    ```
    
1. Run an example app:

    ```
    $ cd examples/example-web
    $ rushx start
    ```
    
## Release process

1. Run `rush unlink && rush purge && rush install && rush rebuild` to ensure that everything is building as-is.
1. Run `rush change` and answer all prompts to generate change files.
1. Review the change files to ensure that they are accurate.
1. Commit the change files to your pull request.
1. Once all pull requests for a release are merged, run the following:
   - For an (e.g.) alpha release, either:
      - To bump patch: `rush version --bump --override-bump prerelease --override-prerelease-id alpha`, or
      - To bump minor: `rush version --bump --override-bump preminor --override-prerelease-id alpha`, or
      - To bump major (substituting X): `rush version --ensure-version-policy --version-policy hatchVersionPolicy --override-version X.0.0-alpha.0` 
   - For a non-prerelease release: `rush version --bump --override-bump [major/minor/patch]`
1. Review the locally generated version changes and changelog updates.
1. If everything looks right, commit the changes to a release branch e.g. `release/0.10.0`
1. Run `rush unlink && rush purge && rush install && rush rebuild && rush publish --include-all -b master -p` to publish to npm and merge to master.
1. Merge `master` back into `develop` to clear out change files from the latter.
1. Update your local installation of `hatch-cli` and hatch an app to make use of your new features.