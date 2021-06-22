module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    'plugin:vue/essential',
    'standard'
  ],
  globals: {
    statics: 'true',
    $: 'true',
    _: 'true',
    service: 'true',
    splunkStack: 'true',
    splunkjs: 'true',
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
    parser: 'babel-eslint'
  },
  plugins: [
    'vue'
  ],
  ignorePatterns: ["html2canvas.js"],
  rules: {
    'template-curly-spacing': 'off',
    'indent': 'off',
    'comma-dangle': 'warn',
    'no-prototype-builtins': 'warn',
    'eqeqeq': 'warn',
    'no-trailing-spaces': 'warn',
    'space-before-function-paren': 'warn',
    'quotes': 'warn',
    'prefer-const': 'warn',
    'no-unused-vars': 'warn',
    'no-unused-expressions': 'warn',
    'vue/no-unused-components': 'warn',
    'vue/no-unused-vars': 'warn',
    'eol-last': 'warn',
    'quote-props': 'warn',
    'no-multiple-empty-lines': 'warn',
    'object-curly-newline': 'warn',
    'object-property-newline': 'warn',
    'standard/no-callback-literal': 'warn',
    'space-before-blocks': 'warn',
    'no-useless-escape': 'warn',
    'comma-spacing': 'warn',
    'padded-blocks': 'warn',
    'vue/no-dupe-keys': 'warn',
    'vue/no-mutating-props': 'warn',
    'no-new': 'warn',
    'key-spacing': 'warn',
    'vue/no-side-effects-in-computed-properties': 'warn',
    'no-multi-spaces': 'warn',
    'no-self-assign': 'warn',
    'space-infix-ops': 'warn',
    'object-curly-spacing': 'warn',
    'spaced-comment': 'warn',
    'handle-callback-err': 'warn',
    'semi': 'warn',
    'space-in-parens': 'warn',
  }
}
