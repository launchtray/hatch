# hatch
## Developer setup
1. Install the latest LTS version of node. e.g. for macOS:

    ```
    $ brew uninstall node
    $ brew install node@12
    $ brew link --force --overwrite node@12
    ```

2. Install Rush:

    ```
    $ npm install -g @microsoft/rush
    ```
    
3. Install package dependencies:

    ```
    rush install
    ```
    
4. Build hatch libraries:

    ```
    rush build
    ```
    
4. Run example app:

    ```
    cd examples/example-web
    rushx start
    ```
    
