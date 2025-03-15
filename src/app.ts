import type {Context, Probot} from 'probot'

/**
 * GitHub App that responds to opened issues
 * @param {Probot} app - Probot instance
 */
export default (app: Probot): void => {
  app.on('issues.opened', async (context: Context) => {
    const issueComment = context.issue({body: 'Hello, World!'})
    return context.octokit.issues.createComment(issueComment)
  })
}
