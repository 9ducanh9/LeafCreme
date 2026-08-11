module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'off',
      { allowConstantExport: true },
    ],

    // Tôn trọng quy ước _prefix cho tham số/biến cố ý không dùng.
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],

    /**
     * Ranh giới VĨNH VIỄN giữa hai vùng UI:
     *   storefront -> Tailwind + component tự viết trong src/components/ui
     *   admin      -> MUI (có theme, xem spec 09 §3)
     *
     * Không có rule này thì việc bỏ MUI khỏi storefront sẽ trôi dần: chỉ cần một
     * import lọt vào là quay lại hai design system đánh nhau, và không ai phát hiện.
     * Override cho admin ở phần `overrides` bên dưới.
     */
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@mui/*', '@mui/**'],
          message:
            'Storefront dùng Tailwind + src/components/ui. MUI CHỈ được dùng trong ' +
            'src/pages/admin, src/components/admin, src/layout/admin, src/theme. ' +
            'Đây là ranh giới vĩnh viễn, không phải tạm thời.',
        },
        {
          group: ['@emotion/*'],
          message: 'Emotion chỉ đi kèm MUI ở vùng admin.',
        },
      ],
    }],
  },
  overrides: [
    {
      // Vùng admin được phép dùng MUI + emotion.
      files: [
        'src/pages/admin/**',
        'src/components/admin/**',
        'src/layout/admin/**',
        'src/theme/**',
      ],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      // File test không cần siết như code chạy production.
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
  ],
}
