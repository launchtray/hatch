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
    config.module.rules.push({
      include: [path.resolve(__dirname, '../src')],
      test: /\.(ts|tsx)$/,
      use: [{
        loader: require.resolve('ts-loader'),
      }],
    });
    config.resolve.extensions.push('.ts', '.tsx');
    return razzleConfig.patchWebpackConfig(config);
  },
};
