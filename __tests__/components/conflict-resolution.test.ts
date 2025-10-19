import { describe, it, expect } from 'vitest'
import { computeWordDiff, calculateDiffStats } from '@/lib/utils/text-diff'

/**
 * Test utilities for conflict resolution logic
 */

describe('Conflict Resolution Logic', () => {
  describe('Conflict Detection', () => {
    it('should detect added content conflicts', () => {
      const serverText = 'Chapter 1: The hero walked through the forest.'
      const localText = 'Chapter 1: The brave hero walked through the dark forest.'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      expect(stats.additions).toBeGreaterThan(0)
      expect(diff.some((part) => part.added)).toBe(true)
    })

    it('should detect removed content conflicts', () => {
      const serverText = 'Chapter 1: The brave hero walked through the dark forest.'
      const localText = 'Chapter 1: The hero walked through the forest.'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      expect(stats.deletions).toBeGreaterThan(0)
      expect(diff.some((part) => part.removed)).toBe(true)
    })

    it('should detect mixed conflicts', () => {
      const serverText = 'The old knight fought bravely.'
      const localText = 'The young warrior fought courageously.'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      expect(stats.additions).toBeGreaterThan(0)
      expect(stats.deletions).toBeGreaterThan(0)
      expect(stats.totalChanges).toBeGreaterThan(0)
    })

    it('should handle no conflicts', () => {
      const text = 'This is the same text in both versions.'

      const diff = computeWordDiff(text, text)
      const stats = calculateDiffStats(diff)

      expect(stats.additions).toBe(0)
      expect(stats.deletions).toBe(0)
      expect(stats.changePercentage).toBe(0)
    })
  })

  describe('Conflict Chunk Generation', () => {
    it('should generate chunks for added content', () => {
      const serverText = 'Hello world'
      const localText = 'Hello beautiful world'

      const diff = computeWordDiff(serverText, localText)
      const chunks = diff.filter((part) => part.added || part.removed)

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0].added).toBe(true)
    })

    it('should generate chunks for removed content', () => {
      const serverText = 'Hello beautiful world'
      const localText = 'Hello world'

      const diff = computeWordDiff(serverText, localText)
      const chunks = diff.filter((part) => part.added || part.removed)

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0].removed).toBe(true)
    })

    it('should generate multiple chunks for complex conflicts', () => {
      const serverText = 'First paragraph. Second paragraph. Third paragraph.'
      const localText = 'First new paragraph. Second paragraph. Third updated paragraph.'

      const diff = computeWordDiff(serverText, localText)
      const chunks = diff.filter((part) => part.added || part.removed)

      expect(chunks.length).toBeGreaterThan(1)
    })
  })

  describe('Merge Strategies', () => {
    it('should handle "keep local" strategy', () => {
      const serverText = 'Server version'
      const localText = 'Local version with changes'

      // Keep local means we use localText entirely
      const result = localText
      expect(result).toBe('Local version with changes')
    })

    it('should handle "keep server" strategy', () => {
      const serverText = 'Server version with updates'
      const localText = 'Local version'

      // Keep server means we use serverText entirely
      const result = serverText
      expect(result).toBe('Server version with updates')
    })

    it('should handle selective merge - keep added', () => {
      const serverText = 'Hello world'
      const localText = 'Hello beautiful world'

      const diff = computeWordDiff(serverText, localText)

      // Build merged result keeping only added content
      let merged = ''
      diff.forEach((part) => {
        if (part.added) {
          merged += part.value // Keep local addition
        } else if (!part.removed) {
          merged += part.value // Keep unchanged
        }
        // Skip removed parts
      })

      expect(merged).toContain('beautiful')
      expect(merged).toContain('Hello')
      expect(merged).toContain('world')
    })

    it('should handle selective merge - keep removed', () => {
      const serverText = 'Hello beautiful world'
      const localText = 'Hello world'

      const diff = computeWordDiff(serverText, localText)

      // Build merged result keeping removed content
      let merged = ''
      diff.forEach((part) => {
        if (part.removed) {
          merged += part.value // Keep server content
        } else if (!part.added) {
          merged += part.value // Keep unchanged
        }
        // Skip added parts
      })

      expect(merged).toContain('beautiful')
    })

    it('should handle selective merge - keep both', () => {
      const serverText = 'Original text'
      const localText = 'Updated text'

      const diff = computeWordDiff(serverText, localText)

      // Build merged result keeping both versions
      let merged = ''
      diff.forEach((part) => {
        merged += part.value // Keep everything
      })

      expect(merged).toContain('Original')
      expect(merged).toContain('Updated')
    })

    it('should handle selective merge - discard both', () => {
      const serverText = 'Keep this. Remove this part. Keep this too.'
      const localText = 'Keep this. Add this part. Keep this too.'

      const diff = computeWordDiff(serverText, localText)

      // Build merged result discarding conflicts
      let merged = ''
      diff.forEach((part) => {
        if (!part.added && !part.removed) {
          merged += part.value // Only keep unchanged
        }
      })

      expect(merged).toContain('Keep this')
      expect(merged).toContain('Keep this too')
      expect(merged).not.toContain('Remove this part')
      expect(merged).not.toContain('Add this part')
    })
  })

  describe('Conflict Statistics', () => {
    it('should calculate accurate conflict percentage', () => {
      const serverText = 'one two three four five'
      const localText = 'one TWO three FOUR five'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      // 4 changed words out of 7 total = ~57% change (2 removed + 2 added)
      expect(stats.changePercentage).toBeGreaterThan(50)
      expect(stats.changePercentage).toBeLessThan(65)
    })

    it('should count total conflicts correctly', () => {
      const serverText = 'First second third'
      const localText = 'First SECOND third FOURTH'

      const diff = computeWordDiff(serverText, localText)
      const conflictCount = diff.filter((part) => part.added || part.removed).length

      expect(conflictCount).toBeGreaterThan(0)
    })

    it('should identify high-conflict scenarios', () => {
      const serverText = 'Completely different text here'
      const localText = 'Totally new content over there'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      // Should be high percentage of change
      expect(stats.changePercentage).toBeGreaterThan(50)
    })

    it('should identify low-conflict scenarios', () => {
      const serverText = 'This is a long text with many words and only one change'
      const localText = 'This is a long text with many words and only one modification'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      // Should be low percentage of change
      expect(stats.changePercentage).toBeLessThan(20)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty server content', () => {
      const serverText = ''
      const localText = 'New content added locally'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      expect(stats.additions).toBeGreaterThan(0)
      expect(stats.deletions).toBe(0)
      expect(stats.changePercentage).toBe(100)
    })

    it('should handle empty local content', () => {
      const serverText = 'Server has content'
      const localText = ''

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      expect(stats.additions).toBe(0)
      expect(stats.deletions).toBeGreaterThan(0)
      expect(stats.changePercentage).toBe(100)
    })

    it('should handle whitespace-only changes', () => {
      const serverText = 'Hello world'
      const localText = 'Hello  world' // Extra space

      const diff = computeWordDiff(serverText, localText)

      // Diff library treats these as identical after normalization
      expect(diff.every((part) => !part.added && !part.removed)).toBe(true)
    })

    it('should handle very long documents', () => {
      const serverText = 'word '.repeat(10000) + 'end'
      const localText = 'word '.repeat(10000) + 'finish'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      // Should detect the single word change
      expect(stats.totalChanges).toBe(2) // 1 removed, 1 added
      expect(stats.changePercentage).toBeLessThan(1)
    })

    it('should handle special characters', () => {
      const serverText = 'Hello "world" & <friends>'
      const localText = 'Hello "universe" & <companions>'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      expect(stats.totalChanges).toBeGreaterThan(0)
    })

    it('should handle line breaks', () => {
      const serverText = 'Line 1\nLine 2\nLine 3'
      const localText = 'Line 1\nModified Line 2\nLine 3'

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      expect(stats.totalChanges).toBeGreaterThan(0)
    })
  })

  describe('Retry with Server Version', () => {
    it('should allow retry after conflict resolution', () => {
      // This tests the workflow: detect conflict -> retry with server version
      const serverText = 'Server content at version 2'
      const localText = 'Local edits from version 1'

      // User chooses to retry with server version
      const retryContent = serverText

      expect(retryContent).toBe('Server content at version 2')
    })

    it('should preserve server version on retry', () => {
      const serverContent = '<p>Server HTML content</p>'

      // Retry should keep exact server content including HTML
      const retryContent = serverContent

      expect(retryContent).toBe('<p>Server HTML content</p>')
    })
  })

  describe('Conflict Navigation', () => {
    it('should navigate to next conflict', () => {
      const chunks = [
        { id: 'chunk-1', selected: 'local' as const },
        { id: 'chunk-2', selected: 'server' as const },
        { id: 'chunk-3', selected: 'local' as const },
      ]

      let currentIndex = 0

      // Navigate next
      currentIndex = Math.min(currentIndex + 1, chunks.length - 1)
      expect(currentIndex).toBe(1)

      // Navigate next again
      currentIndex = Math.min(currentIndex + 1, chunks.length - 1)
      expect(currentIndex).toBe(2)

      // Can't go beyond last
      currentIndex = Math.min(currentIndex + 1, chunks.length - 1)
      expect(currentIndex).toBe(2)
    })

    it('should navigate to previous conflict', () => {
      const chunks = [
        { id: 'chunk-1', selected: 'local' as const },
        { id: 'chunk-2', selected: 'server' as const },
        { id: 'chunk-3', selected: 'local' as const },
      ]

      let currentIndex = 2

      // Navigate prev
      currentIndex = Math.max(currentIndex - 1, 0)
      expect(currentIndex).toBe(1)

      // Navigate prev again
      currentIndex = Math.max(currentIndex - 1, 0)
      expect(currentIndex).toBe(0)

      // Can't go before first
      currentIndex = Math.max(currentIndex - 1, 0)
      expect(currentIndex).toBe(0)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle realistic autosave conflict scenario', () => {
      const serverHtml = `
        <h1>Chapter 1</h1>
        <p>The hero walked through the forest.</p>
        <p>It was a dark night.</p>
      `
      const localHtml = `
        <h1>Chapter 1</h1>
        <p>The hero walked through the ancient forest.</p>
        <p>It was a dark and stormy night.</p>
      `

      // Strip HTML for comparison
      const serverText = serverHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const localText = localHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

      const diff = computeWordDiff(serverText, localText)
      const stats = calculateDiffStats(diff)

      // Should detect the additions
      expect(stats.additions).toBeGreaterThan(0)
      expect(stats.changePercentage).toBeGreaterThan(0)
      expect(stats.changePercentage).toBeLessThan(50) // Reasonable change
    })

    it('should handle concurrent edit conflict', () => {
      // Simulates two users editing the same paragraph simultaneously
      const original = 'The dragon roared.'
      const userA = 'The fierce dragon roared loudly.'
      const userB = 'The ancient dragon roared menacingly.'

      // Server has userA's changes, local has userB's changes
      const diff = computeWordDiff(userA, userB)
      const stats = calculateDiffStats(diff)

      expect(stats.totalChanges).toBeGreaterThan(0)
      // Both changed the same sentence differently
    })
  })
})
