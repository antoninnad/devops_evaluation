const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['**/node_modules/**', 'actions-runner/**'] },
  {
    files: ['api/**/*.js', 'frontend/**/*.js'],
    rules: js.configs.recommended.rules,
  },
  {
    files: ['api/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['frontend/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
];
