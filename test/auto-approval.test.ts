import type {Probot} from 'probot'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import appFn from '../src/app.js'

// Suppress console output in tests
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('Auto-approval bot', () => {
  let probot: Probot

  beforeEach(() => {
    // Create a simplified mock Probot instance
    probot = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        child: () => ({
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
          trace: vi.fn(),
        }),
      },
      on: vi.fn(),
      load: vi.fn(),
      receive: vi.fn(),
    } as unknown as Probot

    // Load our app into the mock probot
    appFn(probot)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers event handlers for pull requests and reviews', () => {
    // Verify that the app registered event handlers
    expect(probot.on).toHaveBeenCalledWith(['pull_request.opened', 'pull_request.synchronize'], expect.any(Function))
    expect(probot.on).toHaveBeenCalledWith('check_run.completed', expect.any(Function))
    expect(probot.on).toHaveBeenCalledWith('pull_request_review.dismissed', expect.any(Function))
  })

  it('approves pull requests from configured bots with the right trigger', async () => {
    // Mock the handler function
    const handler = (probot.on as ReturnType<typeof vi.fn>).mock.calls.find((call: unknown) =>
      String((call as any)[0]).includes('pull_request.opened'),
    )
    const openPrHandler = handler?.[1]

    // Mock the context
    const context = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
      repo: () => ({owner: 'test-owner', repo: 'test-repo'}),
      payload: {
        action: 'opened',
        pull_request: {
          number: 1,
          user: {login: 'renovate[bot]'},
          body: '**Automerge**: Enabled',
          head: {sha: 'test-sha'},
          labels: [],
        },
        sender: {login: 'renovate[bot]'},
      },
      config: async () => ({
        botUsernames: ['renovate[bot]'],
        approvalTriggers: ['**Automerge**: Enabled'],
        requirePassingChecks: true,
        requiredChecks: [],
        excludeLabels: [],
      }),
      octokit: {
        rest: {
          checks: {
            listForRef: vi.fn().mockResolvedValue({
              data: {
                check_runs: [{name: 'test-check', status: 'completed', conclusion: 'success'}],
              },
            }),
          },
          pulls: {
            createReview: vi.fn().mockResolvedValue({}),
          },
        },
      },
    }

    // Call the handler
    await openPrHandler(context)

    // Verify the approval call was made
    expect(context.octokit.rest.pulls.createReview).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      pull_number: 1,
      event: 'APPROVE',
      body: expect.any(String),
    })
  })

  it('does not approve if the PR has an excluded label', async () => {
    // Mock the handler function
    const handler = (probot.on as ReturnType<typeof vi.fn>).mock.calls.find((call: unknown) =>
      String((call as any)[0]).includes('pull_request.opened'),
    )
    const openPrHandler = handler?.[1]

    // Mock the context
    const context = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
      repo: () => ({owner: 'test-owner', repo: 'test-repo'}),
      payload: {
        action: 'opened',
        pull_request: {
          number: 1,
          user: {login: 'renovate[bot]'},
          body: '**Automerge**: Enabled',
          head: {sha: 'test-sha'},
          labels: [{name: 'do-not-merge'}],
        },
        sender: {login: 'renovate[bot]'},
      },
      config: async () => ({
        botUsernames: ['renovate[bot]'],
        approvalTriggers: ['**Automerge**: Enabled'],
        requirePassingChecks: true,
        requiredChecks: [],
        excludeLabels: ['do-not-merge'],
      }),
      octokit: {
        rest: {
          checks: {
            listForRef: vi.fn().mockResolvedValue({
              data: {
                check_runs: [{name: 'test-check', status: 'completed', conclusion: 'success'}],
              },
            }),
          },
          pulls: {
            createReview: vi.fn().mockResolvedValue({}),
          },
        },
      },
    }

    // Call the handler
    await openPrHandler(context)

    // Verify the approval call was NOT made
    expect(context.octokit.rest.pulls.createReview).not.toHaveBeenCalled()
  })

  it('only checks specific required checks when configured', async () => {
    // Mock the handler function
    const handler = (probot.on as ReturnType<typeof vi.fn>).mock.calls.find((call: unknown) =>
      String((call as any)[0]).includes('pull_request.opened'),
    )
    const openPrHandler = handler?.[1]

    // Mock the context
    const context = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
      repo: () => ({owner: 'test-owner', repo: 'test-repo'}),
      payload: {
        action: 'opened',
        pull_request: {
          number: 1,
          user: {login: 'renovate[bot]'},
          body: '**Automerge**: Enabled',
          head: {sha: 'test-sha'},
          labels: [],
        },
        sender: {login: 'renovate[bot]'},
      },
      config: async () => ({
        botUsernames: ['renovate[bot]'],
        approvalTriggers: ['**Automerge**: Enabled'],
        requirePassingChecks: true,
        requiredChecks: ['required-check'],
        excludeLabels: [],
      }),
      octokit: {
        rest: {
          checks: {
            listForRef: vi.fn().mockResolvedValue({
              data: {
                check_runs: [
                  {name: 'required-check', status: 'completed', conclusion: 'success'},
                  {name: 'other-check', status: 'completed', conclusion: 'failure'},
                ],
              },
            }),
          },
          pulls: {
            createReview: vi.fn().mockResolvedValue({}),
          },
        },
      },
    }

    // Call the handler
    await openPrHandler(context)

    // Verify the approval call was made
    expect(context.octokit.rest.pulls.createReview).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      pull_number: 1,
      event: 'APPROVE',
      body: expect.any(String),
    })
  })

  it('re-approves when a review is dismissed', async () => {
    // Mock the handler function
    const handler = (probot.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown) => String((call as any)[0]) === 'pull_request_review.dismissed',
    )
    const reviewDismissedHandler = handler?.[1]

    // Mock the context
    const context = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
      repo: () => ({owner: 'test-owner', repo: 'test-repo'}),
      payload: {
        action: 'dismissed',
        pull_request: {
          number: 1,
          user: {login: 'renovate[bot]'},
          body: '**Automerge**: Enabled',
          head: {sha: 'test-sha'},
        },
        review: {
          user: {login: 'auto-approve[bot]'},
        },
        sender: {login: 'test-user'},
      },
      config: async () => ({
        botUsernames: ['renovate[bot]', 'auto-approve[bot]'],
        approvalTriggers: ['**Automerge**: Enabled'],
        requirePassingChecks: true,
        requiredChecks: [],
        excludeLabels: [],
      }),
      octokit: {
        rest: {
          checks: {
            listForRef: vi.fn().mockResolvedValue({
              data: {
                check_runs: [{name: 'test-check', status: 'completed', conclusion: 'success'}],
              },
            }),
          },
          pulls: {
            createReview: vi.fn().mockResolvedValue({}),
          },
        },
      },
    }

    // Call the handler
    await reviewDismissedHandler(context)

    // Verify the approval call was made
    expect(context.octokit.rest.pulls.createReview).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      pull_number: 1,
      event: 'APPROVE',
      body: expect.any(String),
    })
  })
})
