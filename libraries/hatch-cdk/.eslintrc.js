'use strict';
const baseConfig = require('@launchtray/hatch-eslint-config');
module.exports = {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    'complexity': 'off', // Compositional nature of CDK makes this difficult with arguable gain
    'no-new': 'off', // CDK uses this pattern quite often
  },
};
