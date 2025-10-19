import { Page, expect } from '@playwright/test'

/**
 * Document Helper Functions
 */

export class DocumentHelper {
  constructor(private page: Page) {}

  /**
   * Create a new project
   */
  async createProject(name: string, type: 'novel' | 'screenplay' | 'play' | 'short_story' = 'novel') {
    // Navigate to dashboard
    await this.page.goto('/dashboard')

    // Click create project button
    await this.page.getByRole('button', { name: /new project|create project/i }).click()

    // Fill in project details
    await this.page.getByLabel(/project name|name/i).fill(name)

    // Select project type
    const typeSelector = this.page.getByLabel(/project type|type/i)
    if (await typeSelector.isVisible()) {
      await typeSelector.click()
      await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click()
    }

    // Submit
    await this.page.getByRole('button', { name: /create|save/i }).click()

    // Wait for project to be created
    await this.page.waitForURL(/\/dashboard\/projects\/[a-f0-9-]+/, { timeout: 10000 })

    return this.getProjectIdFromUrl()
  }

  /**
   * Create a new document in current project
   */
  async createDocument(title: string, type: 'novel' | 'screenplay' | 'play' | 'short_story' = 'novel') {
    // Click new document button
    await this.page.getByRole('button', { name: /new document|add document/i }).click()

    // Fill in document details
    await this.page.getByLabel(/title|document name/i).fill(title)

    // Select document type if needed
    const typeSelector = this.page.getByLabel(/document type|type/i)
    if (await typeSelector.isVisible()) {
      await typeSelector.click()
      await this.page.getByRole('option', { name: new RegExp(type, 'i') }).click()
    }

    // Submit
    await this.page.getByRole('button', { name: /create|save/i }).click()

    // Wait for document to open in editor
    await this.page.waitForURL(/\/dashboard\/editor\/[a-f0-9-]+/, { timeout: 10000 })

    return this.getDocumentIdFromUrl()
  }

  /**
   * Type content into the editor
   */
  async typeInEditor(content: string) {
    // Find the editor (Tiptap or Monaco)
    const editor = this.page.locator('[contenteditable="true"]').first()
    await editor.waitFor({ state: 'visible' })

    // Click to focus
    await editor.click()

    // Type content
    await editor.fill(content)

    // Wait a moment for autosave to trigger
    await this.page.waitForTimeout(1000)
  }

  /**
   * Wait for autosave to complete
   */
  async waitForAutosave() {
    // Look for "Saved" or "All changes saved" indicator
    const saveIndicator = this.page.getByText(/saved|all changes saved/i)
    await expect(saveIndicator).toBeVisible({ timeout: 10000 })
  }

  /**
   * Get current word count from editor
   */
  async getWordCount(): Promise<number> {
    const wordCountElement = this.page.getByText(/\d+ words?/i)
    const text = await wordCountElement.textContent()
    const match = text?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Export document
   */
  async exportDocument(format: 'pdf' | 'docx' | 'fountain' | 'fdx') {
    // Open export menu
    await this.page.getByRole('button', { name: /export|download/i }).click()

    // Select format
    await this.page.getByRole('menuitem', { name: new RegExp(format, 'i') }).click()

    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download')
    const download = await downloadPromise

    return download
  }

  /**
   * Navigate to document by ID
   */
  async navigateToDocument(documentId: string) {
    await this.page.goto(`/dashboard/editor/${documentId}`)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get project ID from current URL
   */
  getProjectIdFromUrl(): string | null {
    const match = this.page.url().match(/\/projects\/([a-f0-9-]+)/)
    return match ? match[1] : null
  }

  /**
   * Get document ID from current URL
   */
  getDocumentIdFromUrl(): string | null {
    const match = this.page.url().match(/\/editor\/([a-f0-9-]+)/)
    return match ? match[1] : null
  }

  /**
   * Simulate autosave conflict by modifying document in separate session
   */
  async simulateConflict(documentId: string, conflictingContent: string) {
    // This would require API call or database manipulation
    // For now, we'll document the approach
    console.log(`Simulating conflict for document ${documentId} with content: ${conflictingContent}`)

    // In a real test, you would:
    // 1. Use Supabase client to directly update the document
    // 2. Or open the document in a separate browser context
    // 3. Make conflicting edits
  }

  /**
   * Resolve autosave conflict
   */
  async resolveConflict(action: 'use-local' | 'use-server' | 'manual-merge') {
    // Wait for conflict dialog to appear
    const conflictDialog = this.page.getByRole('dialog', { name: /conflict|save conflict/i })
    await expect(conflictDialog).toBeVisible({ timeout: 5000 })

    switch (action) {
      case 'use-local':
        await this.page.getByRole('button', { name: /use.*local|keep.*changes/i }).click()
        break
      case 'use-server':
        await this.page.getByRole('button', { name: /use.*server|discard.*changes/i }).click()
        break
      case 'manual-merge':
        // Click merge/review button
        await this.page.getByRole('button', { name: /review|merge/i }).click()
        // User would manually merge in diff view
        break
    }

    // Wait for conflict to be resolved
    await expect(conflictDialog).not.toBeVisible({ timeout: 5000 })
  }
}
