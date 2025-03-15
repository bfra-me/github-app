import type {Context, Probot} from 'probot'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import app from '../src/app.js'

// Set test name to match the event we're testing
describe('Issues webhooks', () => {
  let probot: Probot
  let mockCreateComment: any

  beforeEach(() => {
    // Create mock methods
    mockCreateComment = vi.fn().mockResolvedValue({data: {}})

    // Create a mock Probot instance that directly calls our event handlers
    probot = {
      on: vi.fn().mockImplementation((event, callback) => {
        // Store the event callback for testing
        ;(probot as any).events = (probot as any).events || {}
        ;(probot as any).events[event] = callback
      }),
    } as unknown as Probot

    // Load our app
    app(probot)
  })

  it('creates a comment when an issue is opened', async () => {
    // Get the event handler that was registered
    const handler = (probot as any).events['issues.opened']
    expect(handler).toBeDefined()

    // Create a mock context
    const context = {
      issue: (params: any) => ({
        owner: 'bfra-me',
        repo: 'github-app',
        issue_number: 42,
        ...params,
      }),
      octokit: {
        issues: {
          createComment: mockCreateComment,
        },
      },
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
    } as unknown as Context

    // Call the handler with our mock context
    await handler(context)

    // Verify the comment was created with correct parameters
    expect(mockCreateComment).toHaveBeenCalledWith({
      owner: 'bfra-me',
      repo: 'github-app',
      issue_number: 42,
      body: 'Hello, World!',
    })
  })
})
