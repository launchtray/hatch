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
    config.entry[config.entry.length - 1] = resolveApp('src/server');
  }

  delete config.externals;
  config.resolve.alias['react-native'] = 'react-native-web';
  config.resolve.alias['react-native-svg'] = 'react-native-svg/lib/commonjs/ReactNativeSVG.web';

  config.performance = {
    maxAssetSize: 10000000,
    maxEntrypointSize: 10000000,
  };

  if (isServer) {
    config.optimization = {
      ...config.optimization,
      minimize: false,
    }
  }

  if (webpack) {
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
  plugins: ['typescript'],
  patchWebpackConfig, // Used by storybook convention used by hatch, not used by Razzle
  modifyWebpackConfig({webpackConfig, env: {target}, webpackObject}) {
    return patchWebpackConfig(webpackConfig, target !== 'web', webpackObject);
  },
};
