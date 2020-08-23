# HATCH_CLI_TEMPLATE_VAR_monorepoName
This project is a TypeScript monorepo that contains various apps, libraries, and tools.

## Directory structure
**common:** directory containing [Rush](https://rushjs.io/pages/intro/welcome/) related files for managing the monorepo

**apps:** directory containing specific apps.

**libraries:** directory containing specific libraries

**tools:** directory containing specific tools

## Developer setup
These instructions are for developers who would like to contribute to HATCH_CLI_TEMPLATE_VAR_monorepoName projects.

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