import type {Context} from 'probot'
import {defaultConfig, type AutoApproveConfig} from './types.js'

/**
 * Load configuration for the auto-approve bot
 *
 * Looks for a config file at:
 * - .github/auto-approve.yml
 * - .github/auto-approve.yaml
 *
 * @param context Probot context
 * @returns Configuration for the auto-approve bot
 */
export async function loadConfig(context: Context): Promise<AutoApproveConfig> {
  try {
    // Try loading from .yml or .yaml files
    const config = (await context.config('auto-approve.yml', defaultConfig)) as AutoApproveConfig

    // Validate and sanitize configuration
    return sanitizeConfig(config, context)
  } catch (error) {
    context.log.warn({error}, 'Error loading config, using defaults')
    return defaultConfig
  }
}

/**
 * Validate and sanitize the configuration
 *
 * @param config The loaded configuration
 * @param context Probot context for logging
 * @returns Sanitized configuration
 */
function sanitizeConfig(config: Partial<AutoApproveConfig>, context: Context): AutoApproveConfig {
  const sanitized = {...defaultConfig}

  // Validate and set botUsernames
  if (Array.isArray(config.botUsernames)) {
    sanitized.botUsernames = config.botUsernames
  } else if (config.botUsernames !== undefined) {
    context.log.warn('Invalid botUsernames in config, using defaults')
  }

  // Validate and set approvalTriggers
  if (Array.isArray(config.approvalTriggers)) {
    sanitized.approvalTriggers = config.approvalTriggers
  } else if (config.approvalTriggers !== undefined) {
    context.log.warn('Invalid approvalTriggers in config, using defaults')
  }

  // Validate and set requirePassingChecks
  if (typeof config.requirePassingChecks === 'boolean') {
    sanitized.requirePassingChecks = config.requirePassingChecks
  } else if (config.requirePassingChecks !== undefined) {
    context.log.warn('Invalid requirePassingChecks in config, using defaults')
  }

  // Validate and set requiredChecks
  if (Array.isArray(config.requiredChecks)) {
    sanitized.requiredChecks = config.requiredChecks
  } else if (config.requiredChecks !== undefined) {
    context.log.warn('Invalid requiredChecks in config, using defaults')
  }

  // Validate and set excludeLabels
  if (Array.isArray(config.excludeLabels)) {
    sanitized.excludeLabels = config.excludeLabels
  } else if (config.excludeLabels !== undefined) {
    context.log.warn('Invalid excludeLabels in config, using defaults')
  }

  return sanitized
}
