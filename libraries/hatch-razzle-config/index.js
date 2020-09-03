'use strict';

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
      config.plugins[definePluginIndex] = new webpack.DefinePlugin(hatchDefinitions);
    }
  }
  return config;
};

module.exports = {
  plugins: ['typescript'],
  patchWebpackConfig,
  modify(config, {target, dev}, webpack) {
    return patchWebpackConfig(config, target !== 'web', webpack);
  },
};
