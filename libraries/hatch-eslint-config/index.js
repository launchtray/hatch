const fs = require('fs');
const path = require('path');
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    'import',
    'jest',
  ],
  env: {
    'jest/globals': true,
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'airbnb-base',
  ],
  settings: {
    react: {
      version: '16.0',
    },
  },
  parserOptions: {
    project: resolveApp('./tsconfig.json'),
    tsconfigRootDir: resolveApp('.'),
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    'import/extensions': [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
    ],
  },
  ignorePatterns: [
    '.eslintrc.js',
    'razzle.config.js',
    'build',
  ],
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-use-before-define': ['error', {'variables': false}],
    'no-unused-vars': 'off', // replaced by @typescript/no-unused-vars, which is more accurate for TypeScript
    'arrow-body-style': 'off',
    'class-methods-use-this': 'off',
    'comma-dangle': 'off',
    'eol-last': 'off',
    'generator-star-spacing': 'off',
    'global-require': 'off',
    'import/no-cycle': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'indent': 'off',
    'keyword-spacing': 'off',
    'max-classes-per-file': 'off',
    'max-len': 'off',
    'no-await-in-loop': 'off',
    'no-empty-function': 'off',
    'no-loop-func': 'off',
    'no-mixed-operators': 'off',
    'no-multi-spaces': 'off',
    'no-nested-ternary': 'off',
    'no-plusplus': 'off',
    'no-restricted-properties': 'off',
    'no-restricted-syntax': 'off',
    'no-return-await': 'off',
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    'no-useless-escape': 'off',
    'object-curly-newline': 'off',
    'object-curly-spacing': 'off',
    'object-shorthand': 'off',
    'padded-blocks': 'off',
    'prefer-template': 'off',
    'quotes': ['error', 'single'],
    'require-jsdoc': 'off',
    'require-yield': 'warn',
    'spaced-comment': 'off',
    'complexity': ['error', {'max': 10}],
    'no-useless-constructor': 'off',
    'import/extensions': 'off',
    'lines-between-class-members': ['error', 'always', {
      'exceptAfterSingleLine': true,
    }],
  },
};
