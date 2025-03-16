/**
 * Configuration for the auto-approval bot
 */
export interface AutoApproveConfig {
  /**
   * Usernames of bots whose PRs should be auto-approved
   */
  botUsernames: string[]

  /**
   * Phrases in PR body that indicate the PR should be auto-approved
   */
  approvalTriggers: string[]

  /**
   * Whether to require all checks to pass before approving
   */
  requirePassingChecks: boolean

  /**
   * Specific check names that must pass before auto-approval
   * If empty and requirePassingChecks is true, all checks must pass
   */
  requiredChecks: string[]

  /**
   * Labels that will prevent auto-approval if present on the PR
   */
  excludeLabels: string[]
}

/**
 * Default configuration for the auto-approval bot
 */
export const defaultConfig: AutoApproveConfig = {
  botUsernames: ['renovate[bot]', 'dependabot[bot]', 'mend-for-github-com[bot]'],
  approvalTriggers: ['**Automerge**: Enabled'],
  requirePassingChecks: true,
  requiredChecks: [],
  excludeLabels: ['do-not-merge', 'wip'],
}
