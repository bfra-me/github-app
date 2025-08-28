import type {CheckRunEvent, PullRequestEvent, PullRequestReviewEvent} from '@octokit/webhooks-types'
import type {Context, Probot} from 'probot'
import process from 'node:process'
import {loadConfig} from './config.js'

// Constants for approval event
const APPROVE = 'APPROVE'

/**
 * Check if the PR is from a bot configured for auto-approval
 */
async function isValidBot(context: Context<'pull_request' | 'pull_request_review' | 'check_run'>): Promise<boolean> {
  try {
    const config = await loadConfig(context)
    const senderLogin = context.payload.sender?.login

    if (!senderLogin) {
      context.log.warn('No sender login found in payload')
      return false
    }

    return config.botUsernames.includes(senderLogin)
  } catch (error) {
    context.log.error({error}, 'Error checking if PR is from valid bot')
    return false
  }
}

/**
 * Check if the PR contains auto-approval triggers in its body
 */
async function hasApprovalTrigger(context: Context<'pull_request' | 'pull_request_review'>): Promise<boolean> {
  try {
    const config = await loadConfig(context)
    const prBody = (context.payload as PullRequestEvent).pull_request?.body ?? ''

    // Check if any configured trigger is present in the PR body
    return config.approvalTriggers.some(trigger => prBody.includes(trigger))
  } catch (error) {
    context.log.error({error}, 'Error checking for approval triggers')
    return false
  }
}

/**
 * Check if all required checks have passed for the PR
 */
async function haveChecksPassed(
  context: Context<'pull_request' | 'pull_request_review' | 'check_run'>,
): Promise<boolean> {
  try {
    const config = await loadConfig(context)

    // Skip check if not required
    if (!config.requirePassingChecks) {
      return true
    }

    const owner = context.repo().owner
    const repo = context.repo().repo

    // Get the head SHA, handling both PR and check_run events
    let ref: string | undefined
    if ('pull_request' in context.payload) {
      ref = context.payload.pull_request?.head.sha
    } else if ('check_run' in context.payload && context.payload.check_run?.pull_requests?.[0]) {
      ref = context.payload.check_run.head_sha
    }

    if (ref == null || ref.trim() === '') {
      context.log.warn('No head SHA found in payload')
      return false
    }

    const {data: checkRuns} = await context.octokit.checks.listForRef({
      owner,
      repo,
      ref,
    })

    // If there are no checks, consider it a pass
    if (checkRuns.check_runs.length === 0) {
      context.log.info('No checks found for this PR')
      return true
    }

    // If specific checks are configured, only verify those
    if (config.requiredChecks.length > 0) {
      // Check if all required checks have succeeded
      const requiredCheckMap = new Map(config.requiredChecks.map(name => [name.toLowerCase(), false]))

      for (const check of checkRuns.check_runs) {
        const checkName = check.name.toLowerCase()
        if (requiredCheckMap.has(checkName)) {
          requiredCheckMap.set(checkName, check.conclusion === 'success' || check.conclusion === 'neutral')
        }
      }

      // Ensure all required checks have been run and passed
      const allRequiredChecksPassed = Array.from(requiredCheckMap.values()).every(passed => passed)
      return allRequiredChecksPassed
    }

    // Otherwise, verify all checks have passed
    const hasFailedChecks = checkRuns.check_runs.some(
      check => check.conclusion !== 'success' && check.conclusion !== 'neutral' && check.conclusion !== null,
    )

    return !hasFailedChecks
  } catch (error) {
    context.log.error({error}, 'Error checking if checks have passed')
    return false
  }
}

/**
 * Check if the PR has any labels that should exclude it from auto-approval
 */
async function hasExcludedLabels(context: Context<'pull_request' | 'pull_request_review'>): Promise<boolean> {
  try {
    const config = await loadConfig(context)

    // If no excluded labels are configured, return false
    if (config.excludeLabels.length === 0) {
      return false
    }

    // Get the labels from the payload if available
    let labels: string[] = []

    if ('pull_request' in context.payload && context.payload.pull_request?.labels.length > 0) {
      labels = context.payload.pull_request.labels.map(label => label.name)
    } else {
      // If no labels in payload, fetch them
      const prNumber = 'pull_request' in context.payload ? context.payload.pull_request?.number : undefined

      // Explicitly handle null/undefined/NaN/zero/negative values
      if (prNumber == null || Number.isNaN(prNumber) || prNumber <= 0) {
        return false
      }

      const {data: prData} = await context.octokit.pulls.get({
        ...context.repo(),
        pull_number: prNumber,
      })

      labels = prData.labels.map(label => label.name)
    }

    // Check if any excluded labels are present
    return config.excludeLabels.some(excludeLabel =>
      labels.some(label => label.toLowerCase() === excludeLabel.toLowerCase()),
    )
  } catch (error) {
    context.log.error({error}, 'Error checking excluded labels')
    return false
  }
}

/**
 * Check if the user is our bot
 */
function isOurBot(context: Context, login: string): boolean {
  try {
    // Get the current bot login - using environment variable instead of payload
    // @ts-expect-error process.env.APP_LOGIN is not defined in the Node.js types
    const appLogin = process.env.APP_LOGIN ?? ''
    return appLogin ? login === appLogin : false
  } catch (error) {
    context.log.error({error}, 'Error checking if user is our bot')
    return false
  }
}

/**
 * Approve the pull request
 */
async function approvePR(
  context: Context<'pull_request' | 'pull_request_review' | 'check_run'>,
  pullNumber?: number,
): Promise<boolean> {
  try {
    // Use the provided pull number or try to get it from the payload
    const prNumber =
      pullNumber ?? ('pull_request' in context.payload ? context.payload.pull_request?.number : undefined)

    if (prNumber == null || prNumber <= 0 || Number.isNaN(prNumber)) {
      context.log.warn('No valid pull request number found in payload')
      return false
    }

    await context.octokit.pulls.createReview({
      ...context.repo(),
      pull_number: prNumber,
      event: APPROVE,
      body: 'Auto-approved by GitHub App',
    })

    context.log.info(`Successfully approved PR #${prNumber}`)
    return true
  } catch (error) {
    context.log.error({error}, 'Error approving pull request')
    return false
  }
}

/**
 * Auto-approval bot that approves pull requests from specified bots
 * that contain special triggers in the PR body.
 *
 * Supports configuration via .github/auto-approve.yml or .github/auto-approve.yaml
 *
 * @param {Probot} app - Probot instance
 */
export default (app: Probot): void => {
  app.log.info('Auto-approval bot loaded')

  // Handle opened pull requests
  app.on(['pull_request.opened', 'pull_request.synchronize'], async context => {
    const prEvent = context.payload as PullRequestEvent
    const action = prEvent.action
    const prNumber = prEvent.pull_request.number

    context.log.info(`Received ${action} event for PR #${prNumber}`)

    // Auto-approve if from valid bot and has approval trigger
    if ((await isValidBot(context)) && (await hasApprovalTrigger(context))) {
      context.log.info(`PR #${prNumber} is eligible for auto-approval`)

      // Check for excluded labels
      if (await hasExcludedLabels(context)) {
        context.log.info(`PR #${prNumber} has excluded labels, skipping auto-approval`)
        return
      }

      if (await haveChecksPassed(context)) {
        context.log.info(`All checks passed for PR #${prNumber}, proceeding with approval`)
        await approvePR(context)
      } else {
        context.log.info(`Waiting for checks to complete before approving PR #${prNumber}`)
      }
    } else {
      context.log.info(`PR #${prNumber} is not eligible for auto-approval`)
    }
  })

  // Handle check runs that complete
  app.on('check_run.completed', async context => {
    const checkRunEvent = context.payload as CheckRunEvent
    const pullRequests = checkRunEvent.check_run.pull_requests

    if (pullRequests.length === 0) {
      return
    }

    for (const pr of pullRequests) {
      try {
        // Get the full PR data
        const {data: pullRequest} = await context.octokit.pulls.get({
          ...context.repo(),
          pull_number: pr.number,
        })

        // Create a PR context with the PR data - this is a workaround to reuse the auth
        const prContext = Object.create(context) as Context<'pull_request'>
        prContext.payload = {
          ...context.payload,
          pull_request: pullRequest,
        } as unknown as PullRequestEvent

        // Auto-approve if from valid bot and has approval trigger
        if ((await isValidBot(prContext)) && (await hasApprovalTrigger(prContext))) {
          context.log.info(`Check run completed, verifying PR #${pr.number} for auto-approval`)

          if (await haveChecksPassed(prContext)) {
            context.log.info(`All checks passed for PR #${pr.number}, proceeding with approval`)
            await approvePR(context, pr.number)
          } else {
            context.log.info(`Not all checks have passed yet for PR #${pr.number}`)
          }
        }
      } catch (error) {
        context.log.error({error}, `Error processing check run for PR #${pr.number}`)
      }
    }
  })

  // Handle review dismissal
  app.on('pull_request_review.dismissed', async context => {
    const reviewEvent = context.payload as PullRequestReviewEvent
    const prNumber = reviewEvent.pull_request.number
    context.log.info(`Review dismissed for PR #${prNumber}`)

    // Get the PR author
    const prAuthor = reviewEvent.pull_request.user.login

    // Get review author
    const reviewAuthor = reviewEvent.review.user.login

    // Check if review is from this bot or our configured auto-approver
    const config = await loadConfig(context)
    const isOurReview = isOurBot(context, reviewAuthor) || config.botUsernames.includes(reviewAuthor)

    // Re-approve if this is dismissal of our approval for a bot PR
    if (isOurReview && config.botUsernames.includes(prAuthor) && (await hasApprovalTrigger(context))) {
      context.log.info(`Re-approving dismissed approval for PR #${prNumber}`)

      // Check for excluded labels
      if (await hasExcludedLabels(context)) {
        context.log.info(`PR #${prNumber} has excluded labels, skipping re-approval`)
        return
      }

      if (await haveChecksPassed(context)) {
        await approvePR(context)
      } else {
        context.log.info(`Waiting for checks to complete before re-approving PR #${prNumber}`)
      }
    }
  })
}
