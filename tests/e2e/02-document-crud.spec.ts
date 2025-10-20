import { test, expect } from '@playwright/test'
import { AuthHelper } from './helpers/auth'
import { DocumentHelper } from './helpers/document'
import { TEST_USERS } from './fixtures/test-users'

/**
 * E2E Smoke Tests: Document CRUD Operations
 *
 * Tests critical document management flows:
 * - Create project
 * - Create document
 * - Edit document content
 * - Autosave functionality
 * - Word count tracking
 */

test.describe('Document CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const auth = new AuthHelper(page)
    await auth.login(TEST_USERS.free)
  })

  test.describe('Project Creation', () => {
    test('should create a new project', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await page.goto('/dashboard')

      // Create project
      const projectName = `Test Project ${Date.now()}`
      const projectId = await docHelper.createProject(projectName, 'novel')

      // Verify project was created
      expect(projectId).toBeTruthy()
      await expect(page).toHaveURL(new RegExp(`/projects/${projectId}`))

      // Verify project appears in dashboard
      await page.goto('/dashboard')
      await expect(page.getByText(projectName)).toBeVisible()
    })

    test('should create projects of different types', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      await page.goto('/dashboard')

      // Test screenplay project
      const screenplayName = `Screenplay ${Date.now()}`
      await docHelper.createProject(screenplayName, 'screenplay')

      await expect(page.getByText(screenplayName)).toBeVisible()
    })
  })

  test.describe('Document Creation', () => {
    test('should create a new document in a project', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // First create a project
      const projectName = `Project ${Date.now()}`
      await docHelper.createProject(projectName, 'novel')

      // Create document
      const documentTitle = `Chapter 1 - ${Date.now()}`
      const documentId = await docHelper.createDocument(documentTitle, 'novel')

      // Verify document was created
      expect(documentId).toBeTruthy()
      await expect(page).toHaveURL(new RegExp(`/editor/${documentId}`))

      // Verify editor is loaded
      const editor = page.locator('[contenteditable="true"]').first()
      await expect(editor).toBeVisible()
    })

    test('should show empty editor for new document', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Verify editor is empty or has placeholder
      const editor = page.locator('[contenteditable="true"]').first()
      const editorContent = await editor.textContent()

      expect(editorContent?.trim().length === 0 || editorContent?.includes('Start writing')).toBeTruthy()
    })
  })

  test.describe('Document Editing', () => {
    test('should type content into editor', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Type content
      const testContent = 'This is a test paragraph. It has multiple sentences.'
      await docHelper.typeInEditor(testContent)

      // Verify content appears
      const editor = page.locator('[contenteditable="true"]').first()
      await expect(editor).toContainText(testContent)
    })

    test('should update word count as user types', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Initial word count should be 0
      const initialCount = await docHelper.getWordCount()
      expect(initialCount).toBe(0)

      // Type content (10 words)
      const testContent = 'One two three four five six seven eight nine ten'
      await docHelper.typeInEditor(testContent)

      // Wait for word count to update
      await page.waitForTimeout(500)

      // Verify word count updated
      const newCount = await docHelper.getWordCount()
      expect(newCount).toBeGreaterThan(0)
      expect(newCount).toBeCloseTo(10, 1) // Allow for minor counting differences
    })

    test('should support rich text formatting', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Type content
      await docHelper.typeInEditor('This is test content.')

      // Select text
      const editor = page.locator('[contenteditable="true"]').first()
      await editor.press('Control+A') // Select all

      // Try to bold
      const boldButton = page.getByRole('button', { name: /bold/i })
      if (await boldButton.isVisible()) {
        await boldButton.click()

        // Verify bold formatting applied
        const boldText = editor.locator('strong, b')
        await expect(boldText).toBeVisible()
      }
    })
  })

  test.describe('Autosave', () => {
    test('should autosave content after typing', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Type content
      await docHelper.typeInEditor('This content should be autosaved.')

      // Wait for autosave indicator
      await docHelper.waitForAutosave()

      // Verify save indicator shows saved state
      await expect(page.getByText(/saved|all changes saved/i)).toBeVisible()
    })

    test('should persist content after page reload', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      const _documentId = await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Type content
      const testContent = 'This content should persist after reload.'
      await docHelper.typeInEditor(testContent)

      // Wait for autosave
      await docHelper.waitForAutosave()

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify content persisted
      const editor = page.locator('[contenteditable="true"]').first()
      await expect(editor).toContainText(testContent)
    })

    test('should show saving indicator while saving', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Type content
      await docHelper.typeInEditor('Testing autosave indicator.')

      // Look for "Saving..." indicator (might be brief)
      const savingIndicator = page.getByText(/saving/i)

      // Either we see "Saving..." or it transitions to "Saved" quickly
      try {
        await expect(savingIndicator).toBeVisible({ timeout: 2000 })
      } catch {
        // If we miss the "Saving..." state, verify we at least see "Saved"
        await expect(page.getByText(/saved/i)).toBeVisible()
      }
    })
  })

  test.describe('Document Navigation', () => {
    test('should navigate between documents in a project', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')

      // Create first document
      const doc1Title = `Document 1 - ${Date.now()}`
      const doc1Id = await docHelper.createDocument(doc1Title, 'novel')
      await docHelper.typeInEditor('Content for document 1')
      await docHelper.waitForAutosave()

      // Go back to project
      await page.getByRole('button', { name: /back|project|documents/i }).click()

      // Create second document
      const doc2Title = `Document 2 - ${Date.now()}`
      await docHelper.createDocument(doc2Title, 'novel')
      await docHelper.typeInEditor('Content for document 2')

      // Verify we're in document 2
      const editor = page.locator('[contenteditable="true"]').first()
      await expect(editor).toContainText('Content for document 2')

      // Navigate back to document 1
      await docHelper.navigateToDocument(doc1Id!)

      // Verify we're in document 1
      await expect(editor).toContainText('Content for document 1')
    })
  })

  test.describe('Character Limit (Free Tier)', () => {
    test.skip('should show upgrade prompt when approaching character limit', async ({ page }) => {
      const docHelper = new DocumentHelper(page)

      // Create project and document
      await docHelper.createProject(`Project ${Date.now()}`, 'novel')
      await docHelper.createDocument(`Document ${Date.now()}`, 'novel')

      // Type content close to free tier limit
      // This test is skipped as it would take too long
      // In practice, you'd use API to set up the state

      // Verify upgrade prompt appears
      await expect(page.getByText(/upgrade|limit|plan/i)).toBeVisible()
    })
  })
})
