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
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
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
    'func-call-spacing': ['warn', 'never'],
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

    'arrow-body-style': 'off',
    'class-methods-use-this': 'off',
    'eol-last': 'off',
    'generator-star-spacing': 'off',
    'global-require': 'off',
    'import/no-cycle': 'error',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'max-classes-per-file': 'off',
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
    'object-shorthand': 'off',
    'padded-blocks': 'off',
    'prefer-template': 'off',
    'quotes': ['error', 'single'],
    'require-jsdoc': 'off',
    'require-yield': 'warn',
    'spaced-comment': 'off',
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
  },
}
