import nock from 'nock'
import {Probot, ProbotOctokit} from 'probot'

import {suite} from 'uvu'
import * as assert from 'uvu/assert'

import app from '../app.js'
nock.disableNetConnect()

// disable Probot logs
process.env.LOG_LEVEL = 'fatal'

/** @type {import('probot').Probot */
let probot
const test = suite('app')
test.before.each(() => {
  probot = new Probot({
    id: 1,
    githubToken: 'test',
    Octokit: ProbotOctokit.defaults({
      throttle: {enabled: false},
      retry: {enabled: false},
    }),
  })
  probot.load(app)
})

test('receives issues.opened event', async function () {
  const mock = nock('https://api.github.com')
    // create new check run
    .post('/repos/bfra-me/github-app/issues/1/comments', requestBody => {
      assert.equal(requestBody, {body: 'Hello, World!'})

      return true
    })
    .reply(201, {})

  await probot.receive({
    name: 'issues',
    id: '1',
    payload: {
      action: 'opened',
      repository: {
        owner: {
          login: 'bfra-me',
        },
        name: 'github-app',
      },
      issue: {
        number: 1,
      },
    },
  })

  assert.equal(mock.activeMocks(), [])
})

test.run()
