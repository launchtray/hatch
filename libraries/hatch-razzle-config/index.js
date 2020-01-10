'use strict';

const fs = require('fs');
const path = require('path');
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

module.exports = {
  plugins: ['typescript'],
  modify(config, {target, dev}, webpack) {
    if (target === 'web') {
      if (config.node == null) {
        config.node = {};
      }
      config.node.fs = 'empty'; // Prevent winston from trying to load fs on the client.
    } else {
      config.entry = [resolveApp('src/server')]
    }
    // Since RN web takes care of CSS, we should remove it for a #perf boost
    config.module.rules = config.module.rules
      .filter((rule) =>
        !(rule.test && rule.test.exec && rule.test.exec('./something.css'))
      )
      .filter((rule) =>
        !(rule.test && rule.test.exec && rule.test.exec('./something.module.css'))
      );
    return config;
  },
};
