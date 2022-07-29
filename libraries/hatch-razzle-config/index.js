'use strict';
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const patchWebpackConfig = (config, isServer, webpack) => {
  if (!isServer) {
    if (config.node == null) {
      config.node = {};
    }
    config.node.fs = 'empty'; // Prevent winston from trying to load fs on the client.
  } else {
    config.entry.server[config.entry.server.length - 1] = resolveApp('src/server');
  }

  delete config.externals;
  config.resolve.alias['react-native'] = 'react-native-web';
  config.resolve.alias['react-native-svg'] = 'react-native-svg/lib/commonjs/ReactNativeSVG.web';

  if (isServer) {
    config.performance = {
      maxAssetSize: 100 * 1000 * 1000,
      maxEntrypointSize: 100 * 1000 * 1000,
    };
  } else {
    config.performance = {
      maxAssetSize: 10 * 1000 * 1000,
      maxEntrypointSize: 10 * 1000 * 1000,
    };
  }

  if (isServer) {
    config.optimization = {
      ...config.optimization,
      minimize: false,
    }
  }

  if (webpack) {
    // Ignore warning about express being bundled
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /\/express\//,
        (data) => {
          delete data.dependencies[0].critical;
          return data;
        },
      ),
    );

    const definePluginIndex = config.plugins.findIndex(
      plugin => plugin instanceof webpack.DefinePlugin && plugin.definitions,
    );
    if (typeof definePluginIndex !== 'undefined') {
      const razzleDefinitions = config.plugins[definePluginIndex].definitions;
      const hatchDefinitions = {};
      const keysToAllowAtRuntime = [
        'PORT',
        'HOSTNAME',
      ].map(key => `process.env.${key}`);
      Object.keys(razzleDefinitions).forEach((key) => {
        if (keysToAllowAtRuntime.includes(key)) {
          const updatedKey = key.replace('process.env.', 'process.env.HATCH_BUILDTIME_');
          hatchDefinitions[updatedKey] = razzleDefinitions[key];
        } else {
          hatchDefinitions[key] = razzleDefinitions[key];
        }
      });

      hatchDefinitions['process.env.HATCH_BUILDTIME_BUILD_DATE'] = JSON.stringify(new Date().toISOString());
      try {
        let commitId;
        if (process.env.COMMIT_ID != null) {
          commitId = process.env.COMMIT_ID;
        } else {
          commitId = childProcess.execSync('git rev-parse HEAD 2>/dev/null').toString().trim();
          let isDirty;
          try {
            childProcess.execSync('git diff --quiet 2>/dev/null');
            isDirty = false;
          } catch (err) {
            isDirty = true;
          }
          commitId = commitId + (isDirty ? '-dirty' : '');
        }
        hatchDefinitions['process.env.HATCH_BUILDTIME_COMMIT_ID'] = JSON.stringify(commitId);
      } catch (err) {
        console.log('Warning: could not embed build-time commit ID: ' + err.message);
      }
      try {
        let commitDate;
        if (process.env.COMMIT_DATE != null) {
          commitDate = process.env.COMMIT_DATE;
        } else {
          commitDate = childProcess.execSync('git show -s --format=%aI HEAD 2>/dev/null').toString().trim();
        }
        // Older versions of git don't support strict ISO strings and return %aI literally
        if (commitDate === '%aI') {
          commitDate = childProcess.execSync('git show -s --format=%ai HEAD 2>/dev/null').toString().trim();
        }
        hatchDefinitions['process.env.HATCH_BUILDTIME_COMMIT_DATE'] = JSON.stringify(commitDate);
      } catch (err) {
        console.log('Warning: could not embed build-time commit date: ' + err.message);
      }
      try {
        const packageJson = JSON.parse(fs.readFileSync(resolveApp('package.json')));
        hatchDefinitions['process.env.HATCH_BUILDTIME_PACKAGE_NAME'] = JSON.stringify(packageJson.name);
        hatchDefinitions['process.env.HATCH_BUILDTIME_PACKAGE_VERSION'] = JSON.stringify(packageJson.version);
      } catch (err) {
        console.log('Warning: could not embed build-time package.json info: ' + err.message);
      }
      config.plugins[definePluginIndex] = new webpack.DefinePlugin(hatchDefinitions);
    }
  }
  return config;
};

module.exports = {
  plugins: [
    {
      name: 'typescript',
      options: {
        useBabel: false,
        tsLoader: {
          configFile: resolveApp('tsconfig.json'),
          context: resolveApp('src'),
        },
        forkTsChecker: {
          eslint: {
            files: ['**/*.ts*'],
            memoryLimit: 2048,
          },
          typescript: {
            configFile: resolveApp('tsconfig.json'),
            context: resolveApp('src'),
          },
        },
      },
    },
  ],
  patchWebpackConfig,
  modifyWebpackConfig({
    env: {
      target, // the target 'node' or 'web'
      dev, // is this a development build? true or false
    },
    webpackConfig, // the created webpack config
    webpackObject, // the imported webpack node module
    options: {
      razzleOptions, // the modified options passed to Razzle in the `options` key in `razzle.config.js` (options: { key: 'value'})
      webpackOptions, // the modified options that was used to configure webpack/ webpack loaders and plugins
    },
    paths, // the modified paths that will be used by Razzle.
  }) {
    return patchWebpackConfig(webpackConfig, target !== 'web', webpackObject);
  },
};
