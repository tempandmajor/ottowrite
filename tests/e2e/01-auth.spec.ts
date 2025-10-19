import { test, expect } from '@playwright/test'
import { AuthHelper } from './helpers/auth'
import { TEST_USERS } from './fixtures/test-users'

/**
 * E2E Smoke Tests: Authentication
 *
 * Tests the critical authentication flows:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Signup (basic flow)
 * - Logout
 */

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      const auth = new AuthHelper(page)

      // Navigate to login page
      await page.goto('/login')

      // Verify we're on login page
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByRole('heading', { name: /log in|sign in/i })).toBeVisible()

      // Perform login
      await auth.login(TEST_USERS.free)

      // Verify successful login
      await expect(page).toHaveURL(/\/dashboard/)

      // Verify dashboard elements are visible
      await expect(page.getByText(/projects|my projects/i)).toBeVisible()
    })

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/login')

      // Fill in invalid credentials
      await page.getByLabel('Email').fill('invalid@example.com')
      await page.getByLabel('Password').fill('wrongpassword')

      // Submit
      await page.getByRole('button', { name: /log in|sign in/i }).click()

      // Verify error message appears
      await expect(page.getByText(/invalid.*credentials|incorrect.*password|login failed/i)).toBeVisible({
        timeout: 5000,
      })

      // Verify still on login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should require email and password', async ({ page }) => {
      await page.goto('/login')

      // Try to submit empty form
      await page.getByRole('button', { name: /log in|sign in/i }).click()

      // Verify validation errors
      const emailField = page.getByLabel('Email')
      const passwordField = page.getByLabel('Password')

      // Check for HTML5 validation or custom error messages
      await expect(emailField).toHaveAttribute('required', '')
      await expect(passwordField).toHaveAttribute('required', '')
    })
  })

  test.describe('Signup', () => {
    test('should navigate to signup page from login', async ({ page }) => {
      await page.goto('/login')

      // Click signup link
      await page.getByRole('link', { name: /sign up|create account/i }).click()

      // Verify on signup page
      await expect(page).toHaveURL(/\/signup/)
      await expect(page.getByRole('heading', { name: /sign up|create account/i })).toBeVisible()
    })

    test('should show signup form with required fields', async ({ page }) => {
      await page.goto('/signup')

      // Verify form fields exist
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel(/^Password/)).toBeVisible()

      // Verify signup button exists
      await expect(page.getByRole('button', { name: /sign up|create account/i })).toBeVisible()
    })

    // Note: Actual signup test would create a real user
    // This should be run against a test database
    test.skip('should create new account successfully', async ({ page }) => {
      const auth = new AuthHelper(page)
      const testEmail = `test-${Date.now()}@example.com`

      await auth.signup(testEmail, 'TestPassword123!', 'Test User')

      // Verify redirect (to dashboard or email verification)
      await expect(page).toHaveURL(/\/(dashboard|verify-email)/)
    })
  })

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      const auth = new AuthHelper(page)

      // Login first
      await auth.login(TEST_USERS.free)
      await expect(page).toHaveURL(/\/dashboard/)

      // Perform logout
      await auth.logout()

      // Verify logged out
      await expect(page).toHaveURL(/\/(login|$)/)

      // Verify cannot access protected route
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route while logged out', async ({ page }) => {
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })

    test('should redirect to login when accessing editor while logged out', async ({ page }) => {
      await page.goto('/dashboard/editor/test-id')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Session Persistence', () => {
    test('should persist session after page reload', async ({ page }) => {
      const auth = new AuthHelper(page)

      // Login
      await auth.login(TEST_USERS.free)
      await expect(page).toHaveURL(/\/dashboard/)

      // Reload page
      await page.reload()

      // Verify still logged in
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.getByText(/projects|my projects/i)).toBeVisible()
    })
  })
})
