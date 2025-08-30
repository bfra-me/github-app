<h3 align="center">
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
  Auto-Approval Bot
  <img alt="transparent" src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
</h3>

<p align="center">
  <a href="https://github.com/bfra-me/github-app/actions?query=workflow%3Amain" title="Search GitHub Actions for Main workflow runs" ><img alt="Main GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/bfra-me/github-app/main.yaml?branch=main&style=for-the-badge&logo=github%20actions&logoColor=white&label=build"></a>
</p>

A GitHub App built with Probot that automatically approves pull requests from specific bots with configured trigger phrases. Perfect for handling Renovate, Dependabot or other automated PRs that can be safely merged without manual review.

## Features

- Automatically approves PRs from configured bot users
- Configurable approval triggers in PR bodies
- Option to require all checks to pass before approval
- Specify particular checks that must pass for approval
- Exclude PRs with specific labels from auto-approval
- Re-approves PRs when approvals are dismissed
- Works as a GitHub App or GitHub Action
- Fully tested and follows best practices

## Configuration

Create a `.github/auto-approve.yml` (or `.yaml`) with the following options:

```yaml
# Bot usernames whose PRs should be auto-approved
botUsernames:
  - renovate[bot]
  - dependabot[bot]
  - mend-for-github-com[bot]

# Phrases in PR body that indicate the PR should be auto-approved
approvalTriggers:
  - "**Automerge**: Enabled"

# Whether to require all checks to pass before approving
requirePassingChecks: true

# Specific checks that must pass for auto-approval (if empty and requirePassingChecks is true, all checks must pass)
requiredChecks:
  - build
  - test

# Labels that will prevent auto-approval if present on the PR
excludeLabels:
  - do-not-merge
  - wip
```

## Usage

### As a GitHub Action

Create a workflow file (e.g., `.github/workflows/auto-approve.yaml`):

```yaml
name: Auto Approve

on:
  pull_request:
    types: [opened, reopened, synchronize, labeled, edited]
  pull_request_review:
    types: [dismissed]
  check_run:
    types: [completed]

permissions:
  contents: read
  pull-requests: write
  checks: read

jobs:
  auto-approve:
    runs-on: ubuntu-latest
    name: Auto Approve PRs
    steps:
      - uses: bfra-me/github-app@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          # Optional: path to config file
          config-path: .github/auto-approve.yml
```

### As a Deployed App

You can deploy this app as a GitHub App on platforms like Vercel:

1. Create a GitHub App in your organization or account
2. Set the required permissions:
   - Pull requests: Read & Write
   - Checks: Read
   - Repository contents: Read
   - Repository metadata: Read
3. Subscribe to the webhook events:
   - Pull request
   - Pull request review
   - Check run
4. Deploy to a serverless platform like Vercel:

   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel
   ```

5. Set the webhook URL to your deployment URL

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm run dev

# Build
pnpm run build

# Run tests
pnpm test

# Type checking
pnpm run check-types

# Linting
pnpm run lint

# Fix and format code
pnpm run fix
```

## License

[MIT](LICENSE)
