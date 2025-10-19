# E2E Smoke Test Suite

## Overview

Comprehensive end-to-end smoke tests covering critical user flows in Ottowrite using Playwright.

## Test Coverage

### ✅ Authentication (`01-auth.spec.ts`)
- **Login flow** - Valid/invalid credentials, validation
- **Signup flow** - Account creation, form validation
- **Logout flow** - Session termination
- **Protected routes** - Unauthorized access prevention
- **Session persistence** - Page reload handling

### ✅ Document CRUD (`02-document-crud.spec.ts`)
- **Project creation** - Multiple project types (novel, screenplay, etc.)
- **Document creation** - Create documents within projects
- **Document editing** - Rich text editing, typing
- **Autosave** - Automatic content persistence
- **Word count tracking** - Real-time word count updates
- **Document navigation** - Switch between documents

### ✅ Autosave Conflict Resolution (`03-autosave-conflict.spec.ts`)
- **Conflict detection** - Multi-device editing detection
- **Conflict dialog** - User-friendly conflict UI
- **Diff visualization** - Word-level diff display
- **Resolution options** - Use local, use server, manual merge
- **Conflict telemetry** - Logging to autosave_failures table
- **Error handling** - Network failure, save errors

### ✅ Export Functionality (`04-export.spec.ts`)
- **PDF export** - Novel/general documents
- **DOCX export** - Microsoft Word format
- **Fountain export** - Screenplay industry standard
- **FDX export** - Final Draft format
- **Format preservation** - Formatting in exports
- **Export menu** - Format selection UI

### ✅ Billing Happy-Path (`05-billing.spec.ts`)
- **Pricing page** - Public pricing display
- **Subscription tiers** - Free, Hobbyist, Professional, Studio
- **Stripe checkout** - Payment flow integration
- **Customer portal** - Subscription management
- **Plan limits** - Feature gating enforcement
- **Payment history** - Invoice access

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure Playwright browsers are installed
npx playwright install
```

### Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e -- tests/e2e/01-auth.spec.ts

# Run in debug mode
npm run test:e2e:debug

# Run in UI mode (interactive)
npm run test:e2e:ui
```

### Environment Setup

Create `.env.test.local` for test environment:

```bash
# Test environment base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Supabase test instance (use separate test project!)
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key

# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

⚠️ **Important:** Always use a separate Supabase test project to avoid polluting production data!

## Test Data Setup

### Creating Test Users

Before running tests, create test users in your Supabase test instance:

```sql
-- Free tier test user
INSERT INTO auth.users (email, encrypted_password, ...)
VALUES ('test-free@ottowrite.test', ...);

-- Hobbyist tier test user
INSERT INTO auth.users (email, encrypted_password, ...)
VALUES ('test-hobbyist@ottowrite.test', ...);

-- Professional tier test user
INSERT INTO auth.users (email, encrypted_password, ...)
VALUES ('test-professional@ottowrite.test', ...);
```

Or use Supabase Dashboard:
1. Go to Authentication → Users
2. Click "Add User"
3. Create test users matching `fixtures/test-users.ts`

### Test Data Cleanup

Tests create projects and documents during execution. Clean up periodically:

```sql
-- Delete test data (be careful!)
DELETE FROM public.documents WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@ottowrite.test'
);

DELETE FROM public.projects WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@ottowrite.test'
);
```

## Test Structure

```
tests/e2e/
├── 01-auth.spec.ts                 # Authentication tests
├── 02-document-crud.spec.ts        # Document management tests
├── 03-autosave-conflict.spec.ts    # Conflict resolution tests
├── 04-export.spec.ts               # Export functionality tests
├── 05-billing.spec.ts              # Billing/subscription tests
├── fixtures/
│   └── test-users.ts               # Test user credentials
└── helpers/
    ├── auth.ts                     # Authentication helpers
    └── document.ts                 # Document operation helpers
```

## Helper Functions

### AuthHelper

```typescript
import { AuthHelper } from './helpers/auth'

const auth = new AuthHelper(page)

// Login
await auth.login(TEST_USERS.free)

// Signup
await auth.signup('email@test.com', 'password', 'Full Name')

// Logout
await auth.logout()

// Check if logged in
const loggedIn = await auth.isLoggedIn()
```

### DocumentHelper

```typescript
import { DocumentHelper } from './helpers/document'

const docHelper = new DocumentHelper(page)

// Create project
const projectId = await docHelper.createProject('My Project', 'novel')

// Create document
const docId = await docHelper.createDocument('Chapter 1', 'novel')

// Edit content
await docHelper.typeInEditor('Hello, world!')

// Wait for autosave
await docHelper.waitForAutosave()

// Get word count
const count = await docHelper.getWordCount()

// Export document
const download = await docHelper.exportDocument('pdf')

// Resolve conflict
await docHelper.resolveConflict('use-local')
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.TEST_BASE_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Tests

### Run in Headed Mode

```bash
# See browser while tests run
npm run test:e2e:headed
```

### Debug Mode

```bash
# Pause before each action
npm run test:e2e:debug

# Or use Playwright inspector
npx playwright test --debug
```

### Screenshots and Videos

Tests automatically capture:
- **Screenshots** on failure
- **Videos** on failure (retained)
- **Traces** on first retry

View reports:
```bash
npx playwright show-report
```

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test'
import { AuthHelper } from './helpers/auth'
import { TEST_USERS } from './fixtures/test-users'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup (e.g., login)
    const auth = new AuthHelper(page)
    await auth.login(TEST_USERS.free)
  })

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/some-page')

    // Act
    await page.getByRole('button', { name: /click me/i }).click()

    // Assert
    await expect(page.getByText(/success/i)).toBeVisible()
  })
})
```

### Best Practices

1. **Use semantic selectors**
   ```typescript
   // Good
   page.getByRole('button', { name: /submit/i })
   page.getByLabel('Email')

   // Avoid
   page.locator('#submit-btn')
   page.locator('.email-input')
   ```

2. **Wait for state, not time**
   ```typescript
   // Good
   await page.waitForURL('/dashboard')
   await expect(element).toBeVisible()

   // Avoid
   await page.waitForTimeout(3000)
   ```

3. **Use test data that's easy to clean up**
   ```typescript
   const projectName = `Test Project ${Date.now()}`
   ```

4. **Handle flakiness with proper waits**
   ```typescript
   await page.waitForLoadState('networkidle')
   await element.waitFor({ state: 'visible' })
   ```

## Test Maintenance

### Updating Test Users

When test user credentials change, update `fixtures/test-users.ts`:

```typescript
export const TEST_USERS = {
  free: {
    email: 'new-test-free@ottowrite.test',
    password: 'NewPassword123!',
    tier: 'free',
  },
  // ...
}
```

### Updating Selectors

If UI changes break tests, update selectors in helper functions rather than individual tests.

### Skipping Flaky Tests

```typescript
test.skip('flaky test that needs investigation', async ({ page }) => {
  // Test code...
})
```

## Troubleshooting

### Tests fail with "Target closed"

**Cause:** Page navigated away before action completed

**Solution:** Add proper waits:
```typescript
await page.waitForLoadState('networkidle')
```

### Tests fail with "Element not found"

**Cause:** Element selector is incorrect or element loads slowly

**Solution:**
1. Verify selector in headed mode
2. Add explicit wait:
```typescript
await page.getByRole('button').waitFor()
```

### Tests pass locally but fail in CI

**Cause:** Timing differences, viewport size, or environment

**Solution:**
1. Set consistent viewport in `playwright.config.ts`
2. Use `test.slow()` for tests that need more time
3. Check CI environment variables

### Can't connect to development server

**Cause:** Dev server not starting or port conflict

**Solution:**
```bash
# Verify dev server runs
npm run dev

# Check if port 3000 is available
lsof -i :3000
```

## Performance Tips

- Run tests in parallel: `workers: 4` in config
- Use test projects for different browsers
- Skip slow tests during development
- Use test fixtures to share setup

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Supabase Testing](https://supabase.com/docs/guides/getting-started/local-development)

---

**Last Updated:** 2025-10-19
**Test Suite Version:** 1.0.0
**Coverage:** 5 test suites, 50+ test cases
