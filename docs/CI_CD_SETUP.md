# CI/CD Setup Guide

This document provides comprehensive instructions for setting up the CI/CD pipeline, including visual regression testing with Chromatic and PR quality gates.

## Table of Contents

- [Overview](#overview)
- [PR Quality Gates](#pr-quality-gates)
- [Chromatic Setup](#chromatic-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Branch Protection Rules](#branch-protection-rules)
- [Local Testing](#local-testing)
- [Troubleshooting](#troubleshooting)

## Overview

Our CI/CD pipeline implements comprehensive quality gates to ensure code quality, security, and visual consistency. Every pull request is automatically tested against multiple criteria before being allowed to merge.

### Quality Gate Jobs

1. **Lint & Type Check** - ESLint and TypeScript compilation
2. **Unit Tests** - Vitest test suite with coverage reporting
3. **E2E Tests** - Playwright end-to-end tests
4. **Visual Tests** - Chromatic visual regression testing
5. **RLS Security Tests** - Supabase row-level security regression tests

All jobs must pass for a PR to be mergeable.

## PR Quality Gates

### Workflow File

The PR gate workflow is defined in `.github/workflows/pr-gate.yml` and runs on:
- Pull requests to `main` branch
- Direct pushes to `main` branch

### What Gets Tested

#### 1. Lint & Type Check (10 min timeout)
- Runs ESLint on all files
- Compiles TypeScript to verify type safety
- Ensures Next.js build completes successfully

#### 2. Unit Tests (10 min timeout)
- Runs all Vitest unit tests
- Generates coverage reports
- Uploads coverage to Codecov (optional)

#### 3. E2E Tests (30 min timeout)
- Installs Playwright browsers
- Runs all E2E test suites
- Uploads test reports as artifacts (30-day retention)
- Tests authentication, document CRUD, autosave conflicts, exports, and billing

#### 4. Visual Tests (15 min timeout)
- Builds Storybook
- Publishes to Chromatic
- Detects visual changes
- Auto-accepts changes on main branch
- Requires manual approval for PR visual changes

#### 5. RLS Security Tests (10 min timeout)
- Runs SQL-based RLS regression tests
- Verifies no cross-user data access
- Checks for service role key leaks

### Job Summary

After all jobs complete, a summary table is posted to the GitHub Actions summary showing the status of each gate.

## Chromatic Setup

Chromatic provides visual regression testing and Storybook hosting for your component library.

### Step 1: Create Chromatic Account

1. Go to [chromatic.com](https://www.chromatic.com/)
2. Sign up with your GitHub account
3. Click "Add Project"
4. Select your GitHub repository
5. Chromatic will provide a project token

### Step 2: Add Chromatic Project Token

Add the Chromatic project token to your GitHub repository secrets:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `CHROMATIC_PROJECT_TOKEN`
5. Value: Paste your Chromatic project token
6. Click **Add secret**

### Step 3: Configure Visual Testing Settings

The Chromatic configuration is in `.github/workflows/pr-gate.yml`:

```yaml
- name: Publish to Chromatic
  uses: chromaui/action@latest
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    buildScriptName: build-storybook
    exitZeroOnChanges: false  # Fail if visual changes detected
    onlyChanged: true          # Only test changed components
    autoAcceptChanges: ${{ github.ref == 'refs/heads/main' }}
```

### Step 4: Understanding Visual Test Workflow

**On Pull Requests:**
- Chromatic detects visual changes
- If changes are found, the PR check fails
- Review changes in Chromatic UI
- Accept or reject changes
- Once accepted, the PR check passes

**On Main Branch:**
- Visual changes are automatically accepted
- New baselines are created
- No manual review required

### Step 5: Reviewing Visual Changes

When visual changes are detected:

1. Click the Chromatic check details in your PR
2. Review the visual diffs in the Chromatic UI
3. For each change:
   - **Accept** - If the change is intentional
   - **Deny** - If the change is a regression
4. Once all changes are reviewed, the PR check updates

## GitHub Secrets Configuration

The following secrets must be configured in your GitHub repository:

### Required Secrets

| Secret Name | Description | Where to Get It |
|-------------|-------------|-----------------|
| `CHROMATIC_PROJECT_TOKEN` | Chromatic project token | [chromatic.com](https://www.chromatic.com/) project settings |
| `SUPABASE_TEST_URL` | Supabase test project URL | Supabase project settings |
| `SUPABASE_TEST_ANON_KEY` | Supabase test project anon key | Supabase project API settings |
| `SUPABASE_TEST_SERVICE_ROLE_KEY` | Supabase test service role key | Supabase project API settings |

### Optional Secrets

| Secret Name | Description | Where to Get It |
|-------------|-------------|-----------------|
| `CODECOV_TOKEN` | Codecov upload token | [codecov.io](https://codecov.io/) repository settings |

### Adding Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

### Supabase Test Project Setup

For E2E and RLS tests, you should use a dedicated test Supabase project:

1. Create a new Supabase project for testing
2. Apply all migrations from your main project
3. Use the test project credentials in GitHub secrets
4. **Never use production credentials in CI/CD**

## Branch Protection Rules

To enforce PR quality gates, configure branch protection rules:

### Step 1: Enable Branch Protection

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add branch protection rule**
4. Branch name pattern: `main`

### Step 2: Configure Protection Settings

Enable the following settings:

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Add required status checks:
    - `Lint & Type Check`
    - `Unit Tests`
    - `E2E Tests`
    - `Visual Regression Tests`
    - `RLS Security Tests`
    - `PR Gate Summary`

- ✅ **Require conversation resolution before merging**

- ✅ **Do not allow bypassing the above settings**

### Step 3: Save Protection Rule

Click **Create** or **Save changes** to apply the branch protection rule.

### Enforcement

Once configured:
- PRs cannot be merged until all status checks pass
- Force pushes to main are blocked
- Branch deletions are prevented
- Ensures code quality and security standards

## Local Testing

Before pushing your PR, run tests locally to catch issues early:

### Run All Tests Locally

```bash
# Lint and type check
npm run lint
npm run build

# Unit tests
npm test -- --run

# E2E tests (requires running dev server)
npm run test:e2e

# RLS security tests (requires Supabase credentials)
npm run test:rls

# Visual tests (requires Chromatic token)
npm run chromatic
```

### Run Individual Test Suites

```bash
# Unit tests for a specific file
npm test -- path/to/test.test.ts

# E2E tests for a specific suite
npm run test:e2e -- tests/e2e/01-auth.spec.ts

# E2E tests in headed mode (see browser)
npm run test:e2e:headed

# E2E tests in debug mode (step through)
npm run test:e2e:debug
```

### Preview Storybook Locally

```bash
# Start Storybook dev server
npm run storybook

# Build Storybook for production
npm run build-storybook
```

## Troubleshooting

### Chromatic Failures

**Issue:** Chromatic detects unexpected visual changes

**Solutions:**
1. Review changes in Chromatic UI
2. Check if CSS/component changes are intentional
3. Verify Storybook stories are up to date
4. Accept changes if intentional, fix code if regression

**Issue:** Chromatic build fails

**Solutions:**
1. Check Storybook builds locally: `npm run build-storybook`
2. Verify all story dependencies are installed
3. Check for TypeScript errors in stories
4. Review Chromatic build logs in GitHub Actions

### E2E Test Failures

**Issue:** E2E tests fail in CI but pass locally

**Solutions:**
1. Check if test data exists in test Supabase project
2. Verify environment variables are set correctly
3. Check for timing issues (increase timeouts if needed)
4. Review Playwright reports in GitHub Actions artifacts

**Issue:** Playwright browser installation fails

**Solutions:**
1. The workflow uses `npx playwright install --with-deps`
2. If issues persist, check Playwright version compatibility
3. Review GitHub Actions logs for specific errors

### RLS Test Failures

**Issue:** RLS tests fail in CI

**Solutions:**
1. Verify Supabase test project has all migrations applied
2. Check service role key is correct in secrets
3. Ensure test project RLS policies match production
4. Review RLS test output for specific policy failures

### Status Check Not Appearing

**Issue:** Required status check doesn't show up in PR

**Solutions:**
1. Verify workflow file is on the base branch (main)
2. Check workflow syntax is valid (YAML formatting)
3. Ensure workflow has run at least once on main branch
4. Re-push to PR to trigger workflow

### Workflow Timeouts

**Issue:** Jobs timeout before completing

**Solutions:**
1. Jobs have these timeouts:
   - Lint & Type Check: 10 minutes
   - Unit Tests: 10 minutes
   - E2E Tests: 30 minutes
   - Visual Tests: 15 minutes
   - RLS Tests: 10 minutes
2. Increase timeout in workflow file if needed
3. Optimize slow tests
4. Check for hanging processes

## Best Practices

### Writing Tests

1. **Unit Tests**
   - Keep tests fast (< 100ms per test)
   - Mock external dependencies
   - Test one thing per test
   - Use descriptive test names

2. **E2E Tests**
   - Test critical user paths only
   - Keep tests independent
   - Use test data that's reliable
   - Add explicit waits for async operations

3. **Visual Tests**
   - Create stories for all UI components
   - Keep stories simple and focused
   - Use consistent test data
   - Document story interactions

### Managing Secrets

1. **Never commit secrets to code**
2. Use separate test projects for CI/CD
3. Rotate secrets regularly
4. Use least-privilege credentials
5. Document required secrets

### PR Workflow

1. Run tests locally before pushing
2. Fix failing tests before requesting review
3. Keep PRs small and focused
4. Review visual changes carefully
5. Wait for all checks before merging

## Additional Resources

- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Storybook Documentation](https://storybook.js.org/)

## Support

If you encounter issues not covered in this guide:

1. Check GitHub Actions logs for error details
2. Review Chromatic build logs in their UI
3. Consult team documentation
4. Ask in team Slack/Discord channel
5. Create an issue in the repository
