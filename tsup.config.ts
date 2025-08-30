import process from 'node:process'
import {defineConfig} from 'tsup'

export default defineConfig({
  banner: {
    js: "if (typeof require === 'undefined') {const {createRequire} = await import('node:module');globalThis.require=createRequire(import.meta.url);}",
  },
  clean: true,
  entry: ['src/index.ts'],
  format: 'esm',
  noExternal: ['@probot/adapter-github-actions', 'probot'],
  sourcemap: true,
  watch: process.argv.includes('--watch'),
  minify: process.env.NODE_ENV === 'production',
})
