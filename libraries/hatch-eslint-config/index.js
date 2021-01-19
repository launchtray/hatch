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
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb-base',
  ],
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
    'dist',
    'dot-eslintrc.js',
    'dot-storybook',
    '.storybook',
  ],
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error', {
      variables: false
    }],
    'comma-dangle': ['error', 'always-multiline'],
    'no-unused-vars': 'off', // replaced by @typescript version
    '@typescript-eslint/no-unused-vars': ['error'],
    'complexity': ['error', {'max': 10}],
    'no-useless-constructor': 'off', // replaced by @typescript version
    '@typescript-eslint/no-useless-constructor': ['warn'],
    'import/extensions': 'off',
    'lines-between-class-members': ['warn', 'always', {
      exceptAfterSingleLine: true,
    }],
    'indent': ['warn', 2, {
      SwitchCase: 1,
    }],
    'max-len': ['warn', {
      code: 120,
    }],
    'function-call-argument-newline': ['warn', 'consistent'],
    'function-paren-newline': ['warn', 'multiline-arguments'],
    'no-spaced-func': 'off', // replaced by @typescript-eslint/func-call-spacing
    'func-call-spacing': 'off', // replaced by @typescript version
    '@typescript-eslint/func-call-spacing': ['warn', 'never'],
    'array-element-newline': ['warn', 'consistent'],
    'array-bracket-spacing': ['warn', 'never'],
    'array-bracket-newline': ['warn', 'consistent'],
    'object-curly-spacing': ['warn', 'never'],
    'object-curly-newline': ['warn', {consistent: true}],
    'max-statements-per-line': ['error', {
      max: 1,
    }],
    'block-spacing': ['warn', 'always'],
    'brace-style': ['warn', '1tbs'],
    'key-spacing': ['warn', {mode: 'minimum'}],
    'comma-style': ['warn', 'last'],
    'template-curly-spacing': ['warn', 'never'],
    'space-before-function-paren': ['warn', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always'
    }],
    'keyword-spacing': ['warn', {
      before: true,
      after: true,
    }],
    '@typescript-eslint/no-shadow': ['error'],
    'no-shadow': 'off',
    'camelcase': 'off', // Replaced by @typescript-eslint/naming-convention
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
      },
      {
        selector: 'variable',
        modifiers: ['global'],
        format: ['camelCase', 'UPPER_CASE', 'snake_case', 'PascalCase'],
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE', 'PascalCase'],
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'forbid',
        trailingUnderscore: 'forbid',
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        modifiers: ['unused'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
      },
      {
        selector: 'memberLike',
        format: ['camelCase'],
        leadingUnderscore: 'forbid',
        trailingUnderscore: 'forbid',
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
    ],
    'arrow-body-style': 'off',
    'class-methods-use-this': 'off',
    'eol-last': ['warn', 'always'],
    'generator-star-spacing': ['warn', 'after'],
    'global-require': 'off',
    'import/no-cycle': 'error',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'max-classes-per-file': 'off',
    'no-await-in-loop': 'off',
    'no-empty-function': 'off',
    'no-loop-func': 'off',
    'no-mixed-operators': 'error',
    'no-multi-spaces': 'warn',
    'no-nested-ternary': 'error',
    'no-restricted-properties': 'off',
    'no-restricted-syntax': 'off',
    'no-prototype-builtins': 'error',
    'guard-for-in': 'error',
    'no-return-await': 'off',
    'no-plusplus': ['error', {
      allowForLoopAfterthoughts: true
    }],
    'no-underscore-dangle': ['warn', {
      allowFunctionParams: true
    }],
    'no-useless-escape': 'error',
    'object-shorthand': 'warn',
    'padded-blocks': ['warn', 'never'],
    'prefer-template': 'warn',
    'quotes': ['warn', 'single'],
    'require-jsdoc': 'off',
    'require-yield': 'off',
    'spaced-comment': ['warn', 'always'],

    // TODO: review rules pulled in by plugins
    // TODO: review final list for error vs warn
  },
}
