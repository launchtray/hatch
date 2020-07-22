const path = require("path");
const razzleConfig = require("@launchtray/hatch-razzle-config");

module.exports = {
  addons: ["@storybook/addon-actions", "@storybook/addon-links"],
  stories: ["../src/**/*.stories.(ts|tsx)"],
  webpackFinal: config => {
    config.module.rules.push({
      include: [path.resolve(__dirname, "../src")],
      test: /\.(ts|tsx)$/,
      use: [{
        loader: require.resolve("ts-loader"),
      }],
    });
    config.resolve.extensions.push(".ts", ".tsx");
    return razzleConfig.patchWebpackConfig(config);
  },
};
