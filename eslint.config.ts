import {defineConfig, type Config} from '@bfra.me/eslint-config'

const config: ReturnType<typeof defineConfig> = defineConfig({
  name: '@bfra.me/.github',
  ignores: ['**/dist/**', '**/node_modules/**'],
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
})

export default config as Config
