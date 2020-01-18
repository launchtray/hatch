<p align="center"> 
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_parrot.png" width="10%">
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_dino.png" width="10%">
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_snake.png" width="10%">
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_eyes.png" width="10%">
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_bird.png" width="10%">
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_webbed_feet.png" width="10%">
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_penguin.png" width="10%">
  <img src="https://github.com/launchtray/hatch/raw/assets/hatch_platypus.png" width="10%">
</p>

# hatch
This repository contains tools and libraries to aid development of TypeScript applications.

The `hatch` command-line application is used to generate TypeScript projects that require minimal setup and boilerplate
to start developing application code. This is achieved by generating projects which delegate heavily to the `hatch-*` 
libraries in this repository. These libraries are highly opinionated, meaning they typically have several peer 
dependencies, and are intended to be used according to a specific architecture.

Hatch is for developers who are comfortable sacrificing flexibility in libraries and architecture in exchange for
reducing time to development of application features. Developers who are looking for more flexibility and don't mind the 
extra work to get things set up exactly how they want it should consider using tools which are less opinionated, like 
[create-react-app](https://github.com/facebook/create-react-app), [Expo](https://expo.io/), 
[electron](https://electronjs.org/), [express](http://expressjs.com/), or 
[Razzle](https://github.com/jaredpalmer/razzle). These are all great frameworks, some of which are used as a foundation 
for Hatch. 

## Installation
The `hatch` command-lin application can be installed via the npm registry, e.g. with npm:
```
npm install -g @launchtray/hatch-cli
```

## Usage
For up-to-date usage, issue the following:
```
hatch --help
```

## Developer setup
These instructions are for developers who would like to contribute to Hatch.

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
    
## Concepts

