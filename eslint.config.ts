import {defineConfig} from '@bfra.me/eslint-config'

export default defineConfig({
  name: '@bfra.me/github-app',
  ignores: ['**/dist/**', '**/node_modules/**', '.github/copilot-instructions.md', '.ai/'],
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
})
