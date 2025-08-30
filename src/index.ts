import process from 'node:process'
import {run} from '@probot/adapter-github-actions'
import app from './app.js'

// Set the INPUT_GITHUB_TOKEN environment variable to the GitHub token passed as an input
process.env.INPUT_GITHUB_TOKEN ??= process.env.GITHUB_TOKEN ?? process.env['INPUT_GITHUB-TOKEN']

await run(app)
