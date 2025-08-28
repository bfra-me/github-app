import process from 'node:process'
import {run} from '@probot/adapter-github-actions'
import app from './app.js'

// Set the INPUT_GITHUB_TOKEN environment variable to the GitHub token passed as an input
// @ts-expect-error INPUT_GITHUB_TOKEN is not defined in the Node.js types
process.env.INPUT_GITHUB_TOKEN ??= process.env.GITHUB_TOKEN ?? process.env['INPUT_GITHUB-TOKEN']

await run(app)
