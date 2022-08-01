const baseConfig = require('@launchtray/hatch-eslint-config');

module.exports = {
  ...baseConfig,
  plugins: [
    ...baseConfig.plugins,
    'jsx-a11y',
    'react',
    'react-native',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb',
    'plugin:react/recommended',
  ],
  rules: {
    ...baseConfig.rules,
    'react/prop-types': 'error',
    'react/require-default-props': 'off', // Replaced by TypeScript static type checking
    'jsx-quotes': 'off', // Replaced by react/jsx-no-literals
    'react/jsx-no-literals': ['error', {
      noStrings: false,
    }],
    'react/destructuring-assignment': 'off',
    'react/jsx-boolean-value': ['error', 'always'],
    'react/jsx-curly-brace-presence': ['error', 'always'],
    'react/jsx-filename-extension': ['error', {
      allow: 'as-needed',
      extensions: ['.tsx'],
    }],
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-indent': ['warn', 2, {
      checkAttributes: true,
      indentLogicalExpressions: true
    }],
    'react/no-deprecated': 'error',
    'react/no-did-update-set-state': 'error',
    'react/no-multi-comp': 'off',
    'react/no-string-refs': 'error',
    'react/prefer-stateless-function': ['warn', {
      ignorePureComponents: true,
    }],
    'react/static-property-placement': ['warn', 'static public field'],
    'react/jsx-tag-spacing': ['error', {
      closingSlash: 'never',
      beforeSelfClosing: 'never',
      afterOpening: 'never',
      beforeClosing: 'never'
    }],
    'react/display-name': 'off',
  }
};
