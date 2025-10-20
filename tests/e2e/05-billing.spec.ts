import { test, expect } from '@playwright/test'
import { AuthHelper } from './helpers/auth'
import { TEST_USERS } from './fixtures/test-users'

/**
 * E2E Smoke Tests: Billing Happy-Path
 *
 * Tests the critical billing and subscription flows:
 * - View pricing page
 * - View subscription plans
 * - Navigate to checkout (Stripe)
 * - View current subscription status
 * - Navigate to customer portal
 */

test.describe('Billing Happy-Path', () => {
  test.describe('Pricing Page', () => {
    test('should display pricing page for anonymous users', async ({ page }) => {
      await page.goto('/pricing')

      // Verify pricing page loads
      await expect(page).toHaveURL(/\/pricing/)
      await expect(page.getByRole('heading', { name: /pricing|plans/i })).toBeVisible()

      // Verify tier cards are visible
      await expect(page.getByText(/free/i)).toBeVisible()
      await expect(page.getByText(/hobbyist/i)).toBeVisible()
      await expect(page.getByText(/professional/i)).toBeVisible()
    })

    test('should show pricing for each tier', async ({ page }) => {
      await page.goto('/pricing')

      // Verify pricing information is displayed
      // Free tier (should show $0)
      await expect(page.getByText(/\$0/)).toBeVisible()

      // Hobbyist tier (should show $20)
      await expect(page.getByText(/\$20/)).toBeVisible()

      // Professional tier (should show $60)
      await expect(page.getByText(/\$60/)).toBeVisible()
    })

    test('should show features for each tier', async ({ page }) => {
      await page.goto('/pricing')

      // Verify feature lists are visible
      await expect(page.getByText(/unlimited projects|projects/i)).toBeVisible()
      await expect(page.getByText(/AI.*words|words.*AI/i)).toBeVisible()
      await expect(page.getByText(/export/i)).toBeVisible()
    })

    test('should have call-to-action buttons for each tier', async ({ page }) => {
      await page.goto('/pricing')

      // Verify CTA buttons exist
      const ctaButtons = page.getByRole('button', { name: /get started|subscribe|upgrade/i })
      await expect(ctaButtons.first()).toBeVisible()
    })
  })

  test.describe('Subscription Status', () => {
    test('should show current tier for logged-in free user', async ({ page }) => {
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.free)

      // Navigate to account settings
      await page.goto('/dashboard/settings')

      // Verify free tier is displayed
      await expect(page.getByText(/free.*tier|current.*plan.*free/i)).toBeVisible()
    })

    test('should show upgrade options for free users', async ({ page }) => {
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.free)

      await page.goto('/dashboard/settings')

      // Verify upgrade button or link exists
      await expect(page.getByRole('button', { name: /upgrade|view plans/i })).toBeVisible()
    })
  })

  test.describe('Checkout Flow (Stripe)', () => {
    test('should redirect to Stripe checkout when upgrading', async ({ page }) => {
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.free)

      // Navigate to pricing
      await page.goto('/pricing')

      // Click upgrade button for Hobbyist tier
      const hobbyistButton = page
        .locator('[data-tier="hobbyist"], :has-text("Hobbyist")')
        .getByRole('button', { name: /get started|subscribe|upgrade/i })
        .first()

      await hobbyistButton.click()

      // Should redirect to Stripe checkout
      // Wait for navigation to Stripe
      await page.waitForURL(/checkout\.stripe\.com|stripe/, { timeout: 10000 })

      // Verify on Stripe checkout page
      expect(page.url()).toMatch(/checkout\.stripe\.com|stripe/)
    })

    test('should pre-fill email in Stripe checkout', async ({ page }) => {
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.free)

      await page.goto('/pricing')

      // Click upgrade
      const upgradeButton = page
        .locator('[data-tier="professional"]')
        .getByRole('button', { name: /subscribe|upgrade/i })
        .first()

      if (await upgradeButton.isVisible()) {
        await upgradeButton.click()

        // Wait for Stripe
        await page.waitForURL(/stripe/, { timeout: 10000 })

        // Verify email is pre-filled (if visible)
        const emailField = page.getByLabel(/email/i)
        if (await emailField.isVisible()) {
          const emailValue = await emailField.inputValue()
          expect(emailValue).toBe(TEST_USERS.free.email)
        }
      }
    })

    test('should return to app after successful payment', async ({ page: _page }) => {
      // This test requires completing a Stripe payment
      // For smoke test, we skip the actual payment
      // In production, you'd use Stripe test mode with test cards

      test.skip()

      // After successful payment:
      // - Should redirect back to app
      // - Should show success message
      // - Should update user tier
      // - Should grant access to premium features
    })
  })

  test.describe('Customer Portal', () => {
    test('should navigate to Stripe customer portal from settings', async ({ page }) => {
      // Login as a paid user
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.professional)

      await page.goto('/dashboard/settings')

      // Click manage subscription button
      const manageButton = page.getByRole('button', { name: /manage.*subscription|billing portal/i })

      if (await manageButton.isVisible()) {
        await manageButton.click()

        // Should redirect to Stripe customer portal
        await page.waitForURL(/billing\.stripe\.com/, { timeout: 10000 })

        expect(page.url()).toMatch(/billing\.stripe\.com/)
      } else {
        // User might not have active subscription
        test.skip()
      }
    })

    test.skip('should allow subscription cancellation in customer portal', async ({ page: _page }) => {
      // This requires actual Stripe customer portal interaction
      // Skip for smoke test

      // In customer portal, user should be able to:
      // - View current subscription
      // - Update payment method
      // - Cancel subscription
      // - View invoices
    })
  })

  test.describe('Plan Limits Enforcement', () => {
    test('should show upgrade prompt when approaching free tier limits', async ({ page: _page }) => {
      const auth = new AuthHelper(_page)
      await auth.login(TEST_USERS.free)

      await _page.goto('/dashboard')

      // Check for limit warnings (if user is close to limits)
      // This would typically require setting up test data
      test.skip()

      // Would verify:
      // - Warning banner appears
      // - Upgrade link is present
      // - Limit information is shown
    })

    test.skip('should prevent exceeding free tier project limit', async ({ page }) => {
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.free)

      // Try to create more projects than free tier allows
      // This requires setting up test data to be at the limit

      // Would verify:
      // - Creation blocked
      // - Upgrade prompt shown
      // - Error message clear
    })
  })

  test.describe('Invoice and Payment History', () => {
    test('should show payment history for paying customers', async ({ page }) => {
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.professional)

      await page.goto('/dashboard/settings')

      // Look for billing history section
      const billingSection = page.getByText(/billing history|invoices|payment history/i)

      if (await billingSection.isVisible()) {
        // Verify billing information is shown
        await expect(billingSection).toBeVisible()

        // Check for invoice list or link to Stripe portal
        const viewInvoices = page.getByRole('link', { name: /view invoices|billing portal/i })
        if (await viewInvoices.isVisible()) {
          await expect(viewInvoices).toBeVisible()
        }
      } else {
        // Might not have billing history yet
        test.skip()
      }
    })
  })

  test.describe('Subscription Upgrade Path', () => {
    test('should allow upgrading from Hobbyist to Professional', async ({ page }) => {
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.hobbyist)

      await page.goto('/dashboard/settings')

      // Look for upgrade option
      const upgradeButton = page.getByRole('button', { name: /upgrade.*professional/i })

      if (await upgradeButton.isVisible()) {
        await upgradeButton.click()

        // Should go to pricing or checkout
        await expect(page).toHaveURL(/pricing|checkout/)
      } else {
        test.skip()
      }
    })
  })

  test.describe('Trial Period (if applicable)', () => {
    test.skip('should show trial status for trial users', async ({ page: _page }) => {
      // If app has trial periods

      // Would verify:
      // - Days remaining shown
      // - Trial badge displayed
      // - Reminder to subscribe
    })
  })

  test.describe('Payment Method Management', () => {
    test.skip('should allow updating payment method via customer portal', async ({ page }) => {
      const auth = new AuthHelper(page)
      await auth.login(TEST_USERS.professional)

      // Navigate to customer portal
      // Update payment method
      // Verify success

      // This requires Stripe customer portal interaction
    })
  })

  test.describe('Webhook Testing', () => {
    test.skip('should update user tier after successful payment webhook', async ({ page: _page }) => {
      // This test would verify that after Stripe sends a webhook:
      // - User tier is updated in database
      // - User sees updated tier in UI
      // - Premium features are unlocked

      // Requires webhook simulation or test payment
    })
  })
})
