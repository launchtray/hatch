'use strict';
const baseConfig = require('@launchtray/hatch-eslint-config');
module.exports = {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
};
