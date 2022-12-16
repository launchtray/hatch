const path = require('path');
const razzleConfig = require('@launchtray/hatch-razzle-config');

module.exports = {
  stories: [
    '../src/**/*.stories.mdx',
    '../src/**/*.stories.@(ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions'
  ],
  framework: '@storybook/react',
  webpackFinal: config => {
    return razzleConfig.patchWebpackConfig(config);
  },
};
