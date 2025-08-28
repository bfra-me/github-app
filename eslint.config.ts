import {defineConfig} from '@bfra.me/eslint-config'

export default defineConfig(
  {
    name: '@bfra.me/github-app',
    ignores: ['**/dist/**', '**/node_modules/**', '.github/copilot-instructions.md', '.ai/'],
    typescript: {
      tsconfigPath: './tsconfig.json',
    },
  },
  {
    name: '@bfra.me/github-app/tests',
    files: ['**/*.test.ts'],
    // @keep-sorted
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
)
