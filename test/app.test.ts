import type {Context} from 'probot'
import process from 'node:process'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import app from '../src/app.js'

// Set up the env for tests
process.env.LOG_LEVEL = 'fatal'

// Mock the context with the necessary methods
const createMockContext = () => {
  return {
    issue: (params: any) => ({...params, owner: 'bfra-me', repo: 'github-app', issue_number: 1}),
    octokit: {
      issues: {
        createComment: vi.fn().mockResolvedValue({data: {}}),
      },
    },
    log: {
      info: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as Context
}

describe('GitHub App', () => {
  let mockProbot: any
  let mockContext: any
  let mockCreateComment: any

  beforeEach(() => {
    // Create mock context
    mockContext = createMockContext()
    mockCreateComment = mockContext.octokit.issues.createComment

    // Create mock app with events
    mockProbot = {
      on: vi.fn((event, callback) => {
        // Store the event callback for testing
        mockProbot.events[event] = callback
      }),
      events: {},
    }

    // Load our app
    app(mockProbot)
  })

  it('creates a comment when an issue is opened', async () => {
    // Get the event callback for issues.opened
    const eventCallback = mockProbot.events['issues.opened']
    expect(eventCallback).toBeDefined()

    // Trigger the event callback with our mock context
    await eventCallback(mockContext)

    // Verify the comment was created with the right params
    expect(mockCreateComment).toHaveBeenCalledWith({
      owner: 'bfra-me',
      repo: 'github-app',
      issue_number: 1,
      body: 'Hello, World!',
    })
  })
})
