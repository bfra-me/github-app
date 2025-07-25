import process from 'node:process'
import {defineConfig} from 'tsup'

export default defineConfig({
  banner: {
    js: "import {createRequire} from 'node:module';const require=createRequire(import.meta.url);",
  },
  clean: true,
  entry: ['src/index.ts'],
  esbuildOptions(options) {
    options.alias = {
      '@octokit/webhooks-types': '@octokit/webhooks-types/schema.d.ts',
    }
  },
  format: 'esm',
  noExternal: ['@probot/adapter-github-actions', 'probot'],
  sourcemap: true,
  watch: process.argv.includes('--watch'),
  minify: process.env.NODE_ENV === 'production',
})
