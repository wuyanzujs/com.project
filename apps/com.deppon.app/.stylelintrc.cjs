module.exports = {
  ignoreFiles: ['dist/**', 'android/**', 'ios/**', 'node_modules/**'],
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'use',
          'forward',
          'mixin',
          'include',
          'if',
          'else',
          'each',
          'for',
          'while',
          'function',
          'return',
          'debug',
          'warn',
          'error'
        ]
      }
    ],
    'block-no-empty': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': [
      true,
      { ignore: ['consecutive-duplicates-with-different-values'] }
    ],
    'declaration-no-important': true,
    'function-calc-no-unspaced-operator': true,
    'function-disallowed-list': [
      'linear-gradient',
      'repeating-linear-gradient',
      'radial-gradient',
      'repeating-radial-gradient',
      'conic-gradient',
      'repeating-conic-gradient'
    ],
    'no-empty-source': true,
    'property-disallowed-list': [
      'float',
      'inset',
      'background-image',
      'box-shadow'
    ],
    'selector-class-pattern':
      '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$',
    'selector-max-attribute': 0,
    'selector-max-combinators': 0,
    'selector-max-compound-selectors': 1,
    'selector-max-id': 0,
    'selector-max-pseudo-class': 0,
    'selector-max-type': 0,
    'selector-max-universal': 0,
    'string-no-newline': true,
    'unit-allowed-list': ['px', '%', 'deg'],
    'unit-no-unknown': true
  }
}
