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

  // From https://github.com/jaredpalmer/razzle/issues/689#issuecomment-480159678
  const allowedPackages = [
    '@launchtray/hatch-server',
    '@launchtray/hatch-server-middleware',
    '@launchtray/hatch-util',
    '@launchtray/hatch-web',
    '@launchtray/hatch-web-client',
    '@launchtray/hatch-web-injectables',
    '@launchtray/hatch-web-server',
  ];

  const allowedPackagePaths = [];
  allowedPackages.forEach((packageName) => {
    const path = './node_modules/' + packageName;
    if (fs.existsSync(path)) {
      allowedPackagePaths.push(fs.realpathSync(path));
    }
  });

  const tsRuleIndex = config.module.rules.findIndex(
    rule =>
      rule.use && rule.use[0].loader && rule.use[0].loader.includes('ts-loader')
  );

  if (tsRuleIndex === -1) {
    throw Error(
      'This component assumes that you are using ts-loader. If you are not using it, then you might need to check ' +
      'and test code for how would it work with other loaders'
    )
  }

  config.module.rules[tsRuleIndex] = {
    ...config.module.rules[tsRuleIndex],

    include: [
      ...config.module.rules[tsRuleIndex].include,
      ...allowedPackagePaths,
    ],
  };

  delete config.externals;
  config.resolve.alias['react-native'] = 'react-native-web';
  config.resolve.alias['react-native-svg'] = 'react-native-svg/lib/commonjs/ReactNativeSVG.web';

  config.performance = {
    maxAssetSize: 10000000,
    maxEntrypointSize: 10000000,
  };

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
