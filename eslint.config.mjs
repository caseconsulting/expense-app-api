export default [
  {
    files: ['**/*.js'],

    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {},
    },

    ignores: [
      'aurora/dist/**',
      '.aws-sam',
      '.nyc_output',
      'coverage',
      'logs',
      'node_modules',
    ],

    rules: {
      'max-len': [
        'error',
        {
          code: 120,
        },
      ],
      indent: ['error', 2, { SwitchCase: 1, flatTernaryExpressions: true }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'generator-star-spacing': 'off',
      'no-debugger': 'error',
      'no-console': 'off',
    },
  },
];
