import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    include: ['test/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
})
