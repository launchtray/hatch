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
    'plugin:@typescript-eslint/recommended',
    'airbnb',
  ],
  rules: {
    ...baseConfig.rules,
    'react/destructuring-assignment': 'off',
    'react/jsx-boolean-value': 'off',
    'react/jsx-curly-brace-presence': 'off',
    'react/jsx-filename-extension': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/no-deprecated': 'warn',
    'react/no-did-update-set-state': 'warn',
    'react/no-multi-comp': 'off',
    'react/no-string-refs': 'warn',
    'react/prefer-stateless-function': 'off',
    'react/prop-types': [2, { 'ignore': ['children'] }],
    'react/static-property-placement': 'off',
    'react/jsx-tag-spacing': ['error', {
      'closingSlash': 'never',
      'beforeSelfClosing': 'never',
      'afterOpening': 'never',
      'beforeClosing': 'never'
    }],
  }
};
