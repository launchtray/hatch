# HATCH_CLI_TEMPLATE_VAR_monorepoName
This project is a TypeScript monorepo that contains various apps, libraries, and tools.

## Directory structure
**common:** directory containing [Rush](https://rushjs.io/pages/intro/welcome/) related files for managing the monorepo

**apps:** directory containing specific apps.

**libraries:** directory containing specific libraries

**tools:** directory containing specific tools

## Prerequisites
The following steps should be followed in order to get started developing projects for this monorepo.

1. Install the latest LTS version of node. e.g. for macOS:

    ```
    $ brew uninstall node
    $ brew install node@12
    $ brew link --force --overwrite node@12
    ```

1. Install [Rush](https://rushjs.io/pages/intro/welcome/):

    ```
    $ npm install -g @microsoft/rush
    ```
    
1. Install HATCH_CLI_TEMPLATE_VAR_monorepoName projects dependencies:

    ```
    $ rush install
    ```
    
1. Build HATCH_CLI_TEMPLATE_VAR_monorepoName projects:

    ```
    $ rush build
    ```
   
## Running all apps
This monorepo includes scripts for running all of its apps at once, e.g. for a microservice architecture with many web
services that share libraries and may or may not communicate with each other.

### Development mode
To run all apps in development mode, with hot reloading enabled, run the following:
```
rush dev
```
Note that libraries and tools will not be updated at runtime. If a library or tool is updated, you will need to restart
this command in order for those changes to take effect. 

### Production mode
To run all apps in production mode using Docker containers and with static assets served separately, run the following: 
```
rush prod
```
Note that libraries and tools will not be updated at runtime. If a library or tool is updated, you will need to restart
this command in order for those changes to take effect. 

## Running individual apps
To run an individual app in development mode, navigate to the individual app directory and run the following:
```
rushx start
```
