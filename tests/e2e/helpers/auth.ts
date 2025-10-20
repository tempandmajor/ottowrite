import { Page, expect } from '@playwright/test'
import type { TestUser } from '../fixtures/test-users'

/**
 * Authentication Helper Functions
 */

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with email and password
   */
  async login(user: TestUser) {
    await this.page.goto('/login')

    // Fill in login form
    await this.page.getByLabel('Email').fill(user.email)
    await this.page.getByLabel('Password').fill(user.password)

    // Submit form
    await this.page.getByRole('button', { name: /log in|sign in/i }).click()

    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard', { timeout: 10000 })

    // Verify logged in state
    await expect(this.page).toHaveURL(/\/dashboard/)
  }

  /**
   * Sign up new user (for testing signup flow)
   */
  async signup(email: string, password: string, fullName?: string) {
    await this.page.goto('/signup')

    // Fill in signup form
    if (fullName) {
      const nameField = this.page.getByLabel(/full name|name/i)
      if (await nameField.isVisible()) {
        await nameField.fill(fullName)
      }
    }

    await this.page.getByLabel('Email').fill(email)
    await this.page.getByLabel(/^Password/).fill(password)

    // Handle confirm password if present
    const confirmPasswordField = this.page.getByLabel(/confirm password/i)
    if (await confirmPasswordField.isVisible()) {
      await confirmPasswordField.fill(password)
    }

    // Submit form
    await this.page.getByRole('button', { name: /sign up|create account/i }).click()

    // Wait for redirect (might be email confirmation or dashboard)
    await this.page.waitForURL(/\/(dashboard|verify-email)/, { timeout: 10000 })
  }

  /**
   * Logout current user
   */
  async logout() {
    // Click user menu
    await this.page.getByRole('button', { name: /account|profile|user menu/i }).click()

    // Click logout
    await this.page.getByRole('menuitem', { name: /log out|sign out/i }).click()

    // Verify logged out
    await this.page.waitForURL(/\/(login|$)/, { timeout: 5000 })
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url()
    return url.includes('/dashboard')
  }

  /**
   * Get stored auth state for reuse
   */
  async saveAuthState(path: string) {
    await this.page.context().storageState({ path })
  }

  /**
   * Restore auth state from file
   */
  static async restoreAuthState(page: Page, _path: string) {
    // Auth state is restored when creating the context
    // This is a helper for documentation
    return new AuthHelper(page)
  }
}

/**
 * Helper to setup authenticated session
 */
export async function setupAuth(page: Page, user: TestUser) {
  const auth = new AuthHelper(page)
  await auth.login(user)
  return auth
}
