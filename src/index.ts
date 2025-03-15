// @ts-expect-error - Module resolution issue with @probot/adapter-github-actions
import {run} from '@probot/adapter-github-actions'
import app from './app.js'

run(app)
