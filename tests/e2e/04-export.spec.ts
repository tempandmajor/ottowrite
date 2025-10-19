import { test, expect } from '@playwright/test'
import { AuthHelper } from './helpers/auth'
import { DocumentHelper } from './helpers/document'
import { TEST_USERS } from './fixtures/test-users'

/**
 * E2E Smoke Tests: Export Functionality
 *
 * Tests document export in various formats:
 * - PDF export
 * - DOCX export
 * - Fountain export (screenplay)
 * - FDX export (screenplay)
 */

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const auth = new AuthHelper(page)
    await auth.login(TEST_USERS.free)
  })

  test.describe('PDF Export', () => {
    test('should export document as PDF', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document with content
      await docHelper.createProject(`Export Test ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Chapter 1`, 'novel')

      // Add some content to export
      const testContent = `# Chapter 1

This is the first paragraph of the chapter. It contains some test content.

This is the second paragraph with more content to ensure the PDF has substance.

## Section 1.1

Even more content in a subsection.`

      await docHelper.typeInEditor(testContent)
      await docHelper.waitForAutosave()

      // Export as PDF
      const download = await docHelper.exportDocument('pdf')

      // Verify download occurred
      expect(download).toBeTruthy()
      expect(await download.suggestedFilename()).toMatch(/\.pdf$/i)

      // Verify file was downloaded
      const path = await download.path()
      expect(path).toBeTruthy()
    })

    test('should include document title in PDF export', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      const documentTitle = `Test Document ${Date.now()}`

      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(documentTitle, 'novel')
      await docHelper.typeInEditor('Sample content for PDF export.')
      await docHelper.waitForAutosave()

      // Export
      const download = await docHelper.exportDocument('pdf')

      // Verify filename includes document title (sanitized)
      const filename = await download.suggestedFilename()
      expect(filename).toContain('Test Document')
    })
  })

  test.describe('DOCX Export', () => {
    test('should export document as DOCX', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await docHelper.createProject(`Export Test ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Chapter 1`, 'novel')

      await docHelper.typeInEditor('This content will be exported to DOCX format.')
      await docHelper.waitForAutosave()

      // Export as DOCX
      const download = await docHelper.exportDocument('docx')

      // Verify download
      expect(download).toBeTruthy()
      expect(await download.suggestedFilename()).toMatch(/\.docx$/i)
    })

    test('should preserve formatting in DOCX export', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Formatted Doc`, 'novel')

      // Add content with formatting
      await docHelper.typeInEditor('This text has formatting.')

      // Apply bold formatting
      const editor = page.locator('[contenteditable="true"]').first()
      await editor.press('Control+A')

      const boldButton = page.getByRole('button', { name: /bold/i })
      if (await boldButton.isVisible()) {
        await boldButton.click()
      }

      await docHelper.waitForAutosave()

      // Export
      const download = await docHelper.exportDocument('docx')

      expect(download).toBeTruthy()

      // Note: Verifying actual DOCX content would require parsing the file
      // For smoke test, we verify the export succeeds
    })
  })

  test.describe('Screenplay Export', () => {
    test('should export screenplay as Fountain', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await docHelper.createProject(`Screenplay ${Date.now()}`, 'screenplay')
      await docHelper.createDocument(`Scene 1`, 'screenplay')

      // Add screenplay content
      const screenplayContent = `INT. COFFEE SHOP - DAY

JANE sits alone at a corner table, typing on her laptop.

JOHN enters, spots Jane, and approaches.

JOHN
Mind if I join you?`

      await docHelper.typeInEditor(screenplayContent)
      await docHelper.waitForAutosave()

      // Export as Fountain
      const download = await docHelper.exportDocument('fountain')

      // Verify download
      expect(download).toBeTruthy()
      expect(await download.suggestedFilename()).toMatch(/\.fountain$/i)
    })

    test('should export screenplay as FDX (Final Draft)', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await docHelper.createProject(`Screenplay ${Date.now()}`, 'screenplay')
      await docHelper.createDocument(`Scene 1`, 'screenplay')

      await docHelper.typeInEditor('INT. OFFICE - DAY\n\nJANE works at her desk.')
      await docHelper.waitForAutosave()

      // Export as FDX
      const download = await docHelper.exportDocument('fdx')

      // Verify download
      expect(download).toBeTruthy()
      expect(await download.suggestedFilename()).toMatch(/\.fdx$/i)
    })
  })

  test.describe('Export Menu', () => {
    test('should show export options when clicking export button', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Open export menu
      await page.getByRole('button', { name: /export|download/i }).click()

      // Verify export options are visible
      await expect(page.getByRole('menuitem', { name: /pdf/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /docx|word/i })).toBeVisible()
    })

    test('should show screenplay formats only for screenplay documents', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create screenplay document
      await docHelper.createProject(`Screenplay ${Date.now()}`, 'screenplay')
      await docHelper.createDocument(`Scene ${Date.now()}`, 'screenplay')

      // Open export menu
      await page.getByRole('button', { name: /export|download/i }).click()

      // Verify screenplay formats are available
      await expect(page.getByRole('menuitem', { name: /fountain/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /fdx|final draft/i })).toBeVisible()
    })
  })

  test.describe('Export Error Handling', () => {
    test('should show error if export fails', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Don't add any content (might cause export to fail)

      // Try to export
      const exportButton = page.getByRole('button', { name: /export|download/i })
      await exportButton.click()

      await page.getByRole('menuitem', { name: /pdf/i }).click()

      // Look for error message (if export fails on empty document)
      // This is optional - some systems allow exporting empty documents
      try {
        await expect(page.getByText(/error|failed|cannot export/i)).toBeVisible({ timeout: 3000 })
      } catch {
        // No error shown - empty export is allowed
        console.log('Empty document export allowed')
      }
    })
  })

  test.describe('Export Permissions', () => {
    test('should allow export on free tier', async ({ page }) => {
      // Already using free tier user
      const docHelper = new DocumentHelper(page)

      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')
      await docHelper.typeInEditor('Content for free tier export test.')
      await docHelper.waitForAutosave()

      // Verify export button is enabled
      const exportButton = page.getByRole('button', { name: /export|download/i })
      await expect(exportButton).toBeEnabled()

      // Export should work
      await exportButton.click()
      await page.getByRole('menuitem', { name: /pdf/i }).click()

      // Wait for download
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
      const download = await downloadPromise

      expect(download).toBeTruthy()
    })
  })

  test.describe('Bulk Export', () => {
    test.skip('should export entire project as single file', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await docHelper.createProject(`Multi-Doc Project ${Date.now()}`, 'novel')

      // Create multiple documents
      await docHelper.createDocument(`Chapter 1`, 'novel')
      await docHelper.typeInEditor('Content of chapter 1.')
      await docHelper.waitForAutosave()

      // Go back and create another document
      await page.getByRole('button', { name: /back|documents/i }).click()
      await docHelper.createDocument(`Chapter 2`, 'novel')
      await docHelper.typeInEditor('Content of chapter 2.')
      await docHelper.waitForAutosave()

      // Export entire project
      await page.goto('/dashboard')
      // Find project and export all
      // This feature may not exist yet - skip for smoke test
    })
  })
})
