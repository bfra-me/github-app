/**
 * @param {import('probot').Probot} app
 */
export default app => {
  app.on('issues.opened', async context => {
    return context.octokit.issues.createComment(context.issue({body: 'Hello, World!'}))
  })
}
