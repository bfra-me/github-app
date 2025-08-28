# GitHub Copilot Instructions

## Project Overview

This is a **GitHub App and Action** built with **Probot** that automatically approves pull requests from trusted bots (Renovate, Dependabot, etc.) based on configurable triggers and check requirements. It operates in dual mode: as a standalone GitHub App or as a GitHub Action.

## Key Architecture Patterns

### Dual Runtime Pattern
- **Entry point**: `src/index.ts` uses `@probot/adapter-github-actions` to bridge Probot apps with GitHub Actions
- **App logic**: `src/app.ts` contains pure Probot event handlers
- **Environment bridging**: `INPUT_GITHUB_TOKEN` environment variable handling for Actions compatibility

### Configuration Loading
- Uses `context.config('auto-approve.yml', defaultConfig)` pattern to load YAML config from `.github/`
- Config validation and sanitization in `src/config.ts` with fallback to sensible defaults
- Configuration interface defined in `src/types.ts` with comprehensive JSDoc

### Event-Driven Auto-Approval Logic
The bot listens to three webhook events:
- `pull_request.opened|synchronize` - Initial approval attempts
- `check_run.completed` - Re-evaluation when CI completes
- `pull_request_review.dismissed` - Re-approval when previous approvals are dismissed

**Core approval criteria** (all must be true):
1. PR from configured bot user (`botUsernames`)
2. PR body contains approval trigger phrase (`approvalTriggers`)
3. No excluded labels present (`excludeLabels`)
4. Required checks pass (`requirePassingChecks` + `requiredChecks`)

## Development Workflow

### Package Management
- **pnpm** is required (specified in `packageManager` field)
- Use `pnpm bootstrap` (not `pnpm install`) - custom script for offline-preferred installs
- Dependencies are locked to specific versions for GitHub Actions compatibility

### Build & Bundle
- **tsup** bundles everything into `dist/index.js` for GitHub Actions
- ESM modules throughout with `.js` extensions in imports (Node16 module resolution)
- Special handling for `@octokit/webhooks-types` via esbuild alias
- Production builds minify; development builds include sourcemaps

### Testing Strategy
- **Vitest** with extensive mocking of Probot contexts and GitHub API calls
- Tests verify event handler registration and approval logic paths
- Mock patterns for `context.octokit`, `context.config()`, and `context.log`

### Key Commands
```bash
pnpm bootstrap    # Install dependencies (preferred over pnpm install)
pnpm dev         # Watch mode build with tsup
pnpm build       # Production bundle
pnpm test        # Run test suite
pnpm fix         # Lint and auto-fix
```

## Project-Specific Conventions

### Import Patterns
- Always use `.js` extensions for local imports (required for ESM)
- Import types with `type` keyword: `import type {Context} from 'probot'`

### Error Handling
- All async functions include try-catch with `context.log.error({error}, 'message')`
- Functions return boolean success indicators, never throw exceptions
- Fallback to safe defaults (false for eligibility checks, empty arrays for configs)

### GitHub API Interactions
- Use `context.octokit` for all GitHub API calls
- Use `context.repo()` to get owner/repo from webhook context
- Handle both PR events and check_run events (different payload structures)

### Configuration Validation
- Always validate config fields with type checking and array validation
- Log warnings for invalid config but continue with defaults
- Sanitize user input (array checks, case-insensitive label matching)

## Integration Points

### GitHub App Permissions
- **Pull requests**: Read & Write (for approval)
- **Checks**: Read (for status verification)
- **Repository contents/metadata**: Read (for config loading)

### Webhook Events
Configure webhooks for: `pull_request`, `pull_request_review`, `check_run`

### CI/CD Integration
- **Semantic Release** on `release` branch with git assets plugin
- **Branch protection** requires CI, Release, Auto-approve, and Renovate checks
- **Release workflow** merges main→release→tags v1 for GitHub Actions marketplace

When extending this project, follow the established patterns for event handling, configuration validation, and dual-mode operation.
