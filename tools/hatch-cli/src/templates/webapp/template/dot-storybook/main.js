const path = require('path');
const razzleConfig = require('@launchtray/hatch-razzle-config');

module.exports = {
  stories: ['../src/**/*.stories.(ts|tsx)'],
  addons: ['@storybook/addon-actions', '@storybook/addon-links'],
  webpackFinal: config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [{
        loader: require.resolve('ts-loader'),
      }],
      include: [path.resolve(__dirname, '../src')],
    });
    config.resolve.extensions.push('.ts', '.tsx');
    return razzleConfig.patchWebpackConfig(config);
  },
};
