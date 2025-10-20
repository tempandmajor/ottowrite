import { describe, it, expect } from 'vitest'
import {
  stripHtml,
  stripHtmlWithDOM,
  splitSentences,
  countWords,
  computeWordDiff,
  calculateDiffStats,
  compareHtmlDocuments,
  hasSignificantChanges,
  renderDiffForTerminal,
} from '@/lib/utils/text-diff'

describe('stripHtml', () => {
  it('should remove basic HTML tags', () => {
    const html = '<p>Hello <strong>world</strong>!</p>'
    const result = stripHtml(html)
    expect(result).toBe('Hello world !')
  })

  it('should remove script tags and content', () => {
    const html = '<p>Before</p><script>alert("xss")</script><p>After</p>'
    const result = stripHtml(html)
    expect(result).toBe('Before After')
  })

  it('should remove style tags and content', () => {
    const html = '<p>Text</p><style>body { color: red; }</style><p>More</p>'
    const result = stripHtml(html)
    expect(result).toBe('Text More')
  })

  it('should decode HTML entities', () => {
    const html = '&lt;div&gt;&nbsp;Hello&nbsp;&amp;&nbsp;World&quot;test&#39;&lt;/div&gt;'
    const result = stripHtml(html)
    expect(result).toContain('Hello & World')
    expect(result).toContain('"test\'')
  })

  it('should normalize whitespace by default', () => {
    const html = '<p>Multiple    spaces   and\n\nnewlines</p>'
    const result = stripHtml(html)
    expect(result).toBe('Multiple spaces and newlines')
  })

  it('should preserve whitespace when requested', () => {
    const html = '<p>Multiple    spaces</p>'
    const result = stripHtml(html, true)
    expect(result).toContain('    ')
  })

  it('should handle empty string', () => {
    expect(stripHtml('')).toBe('')
  })

  it('should handle text with no HTML', () => {
    expect(stripHtml('Plain text')).toBe('Plain text')
  })

  it('should handle nested tags', () => {
    const html = '<div><p><span><strong>Nested</strong></span></p></div>'
    const result = stripHtml(html)
    expect(result).toBe('Nested')
  })

  it('should handle self-closing tags', () => {
    const html = '<p>Line 1<br/>Line 2<img src="test.jpg" />End</p>'
    const result = stripHtml(html)
    expect(result).toBe('Line 1 Line 2 End')
  })
})

describe('stripHtmlWithDOM', () => {
  it('should strip HTML using fallback (server environment)', () => {
    const html = '<p>Hello <em>world</em>!</p>'
    const result = stripHtmlWithDOM(html)
    expect(result).toContain('Hello')
    expect(result).toContain('world')
  })

  it('should handle complex HTML', () => {
    const html = `
      <article>
        <h1>Title</h1>
        <p>Paragraph with <a href="#">link</a> and <strong>bold</strong>.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </article>
    `
    const result = stripHtmlWithDOM(html)
    expect(result).toContain('Title')
    expect(result).toContain('Paragraph')
    expect(result).toContain('Item 1')
  })
})

describe('splitSentences', () => {
  it('should split on periods', () => {
    const text = 'First sentence. Second sentence. Third sentence.'
    const result = splitSentences(text)
    expect(result).toEqual(['First sentence', 'Second sentence', 'Third sentence.'])
  })

  it('should split on question marks', () => {
    const text = 'What is this? Another question? End.'
    const result = splitSentences(text)
    expect(result).toEqual(['What is this', 'Another question', 'End.'])
  })

  it('should split on exclamation marks', () => {
    const text = 'Wow! Amazing! Cool.'
    const result = splitSentences(text)
    expect(result).toEqual(['Wow', 'Amazing', 'Cool.'])
  })

  it('should handle mixed terminators', () => {
    const text = 'Statement. Question? Exclamation! End.'
    const result = splitSentences(text)
    expect(result).toHaveLength(4)
  })

  it('should filter empty sentences', () => {
    const text = 'Text..  . .More text.'
    const result = splitSentences(text)
    expect(result.every(s => s.length > 0)).toBe(true)
  })

  it('should handle single sentence', () => {
    const text = 'Only one sentence'
    const result = splitSentences(text)
    expect(result).toEqual(['Only one sentence'])
  })

  it('should handle empty string', () => {
    expect(splitSentences('')).toEqual([])
  })
})

describe('countWords', () => {
  it('should count words separated by spaces', () => {
    expect(countWords('one two three')).toBe(3)
  })

  it('should count words with multiple spaces', () => {
    expect(countWords('one    two     three')).toBe(3)
  })

  it('should count words with newlines', () => {
    expect(countWords('one\ntwo\nthree')).toBe(3)
  })

  it('should ignore empty strings in word count', () => {
    expect(countWords('  one  two  ')).toBe(2)
  })

  it('should return 0 for empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('should return 0 for whitespace only', () => {
    expect(countWords('   \n  \t  ')).toBe(0)
  })

  it('should count single word', () => {
    expect(countWords('word')).toBe(1)
  })

  it('should count hyphenated words as single word', () => {
    // Based on split by whitespace
    expect(countWords('one-two three')).toBe(2)
  })
})

describe('computeWordDiff', () => {
  it('should detect added words', () => {
    const oldText = 'Hello world'
    const newText = 'Hello beautiful world'
    const diff = computeWordDiff(oldText, newText)

    const added = diff.filter(d => d.added)
    expect(added).toHaveLength(1)
    expect(added[0].value).toContain('beautiful')
  })

  it('should detect removed words', () => {
    const oldText = 'Hello beautiful world'
    const newText = 'Hello world'
    const diff = computeWordDiff(oldText, newText)

    const removed = diff.filter(d => d.removed)
    expect(removed).toHaveLength(1)
    expect(removed[0].value).toContain('beautiful')
  })

  it('should detect unchanged words', () => {
    const oldText = 'Hello world'
    const newText = 'Hello universe'
    const diff = computeWordDiff(oldText, newText)

    const unchanged = diff.filter(d => !d.added && !d.removed)
    expect(unchanged.length).toBeGreaterThan(0)
  })

  it('should handle identical texts', () => {
    const text = 'Same text'
    const diff = computeWordDiff(text, text)

    expect(diff.every(d => !d.added && !d.removed)).toBe(true)
  })

  it('should handle completely different texts', () => {
    const oldText = 'First document'
    const newText = 'Second content'
    const diff = computeWordDiff(oldText, newText)

    const hasChanges = diff.some(d => d.added || d.removed)
    expect(hasChanges).toBe(true)
  })

  it('should handle empty strings', () => {
    const diff = computeWordDiff('', '')
    expect(diff).toHaveLength(0)
  })

  it('should detect addition from empty', () => {
    const diff = computeWordDiff('', 'New text')
    const added = diff.filter(d => d.added)
    expect(added.length).toBeGreaterThan(0)
  })

  it('should detect deletion to empty', () => {
    const diff = computeWordDiff('Old text', '')
    const removed = diff.filter(d => d.removed)
    expect(removed.length).toBeGreaterThan(0)
  })
})

describe('calculateDiffStats', () => {
  it('should calculate stats for additions', () => {
    const diff = computeWordDiff('Hello', 'Hello world')
    const stats = calculateDiffStats(diff)

    expect(stats.additions).toBe(1)
    expect(stats.deletions).toBe(0)
    expect(stats.unchanged).toBe(1)
    expect(stats.totalChanges).toBe(1)
  })

  it('should calculate stats for deletions', () => {
    const diff = computeWordDiff('Hello world', 'Hello')
    const stats = calculateDiffStats(diff)

    expect(stats.additions).toBe(0)
    expect(stats.deletions).toBe(1)
    expect(stats.unchanged).toBe(1)
    expect(stats.totalChanges).toBe(1)
  })

  it('should calculate stats for mixed changes', () => {
    const diff = computeWordDiff('Hello old world', 'Hello new world')
    const stats = calculateDiffStats(diff)

    expect(stats.additions).toBe(1)
    expect(stats.deletions).toBe(1)
    expect(stats.unchanged).toBe(2) // "Hello" and "world"
    expect(stats.totalChanges).toBe(2)
  })

  it('should calculate change percentage', () => {
    const diff = computeWordDiff('one two three four', 'one new three changed')
    const stats = calculateDiffStats(diff)

    expect(stats.changePercentage).toBeGreaterThan(0)
    expect(stats.changePercentage).toBeLessThanOrEqual(100)
  })

  it('should return 0% for identical texts', () => {
    const diff = computeWordDiff('same', 'same')
    const stats = calculateDiffStats(diff)

    expect(stats.changePercentage).toBe(0)
    expect(stats.totalChanges).toBe(0)
  })

  it('should return 100% for completely different texts', () => {
    const diff = computeWordDiff('old', 'new')
    const stats = calculateDiffStats(diff)

    expect(stats.changePercentage).toBe(100)
  })

  it('should handle empty diff', () => {
    const stats = calculateDiffStats([])

    expect(stats.additions).toBe(0)
    expect(stats.deletions).toBe(0)
    expect(stats.unchanged).toBe(0)
    expect(stats.totalChanges).toBe(0)
    expect(stats.changePercentage).toBe(0)
  })
})

describe('compareHtmlDocuments', () => {
  it('should compare HTML documents and return diff', () => {
    const oldHtml = '<p>Hello world</p>'
    const newHtml = '<p>Hello <strong>beautiful</strong> world</p>'
    const result = compareHtmlDocuments(oldHtml, newHtml)

    expect(result.diff).toBeDefined()
    expect(result.stats).toBeDefined()
    expect(result.stats.additions).toBeGreaterThan(0)
  })

  it('should ignore HTML tags in comparison', () => {
    const oldHtml = '<p>Text</p>'
    const newHtml = '<div><span>Text</span></div>'
    const result = compareHtmlDocuments(oldHtml, newHtml)

    expect(result.stats.totalChanges).toBe(0)
  })

  it('should detect content changes despite same structure', () => {
    const oldHtml = '<p>Original content</p>'
    const newHtml = '<p>Modified content</p>'
    const result = compareHtmlDocuments(oldHtml, newHtml)

    expect(result.stats.totalChanges).toBeGreaterThan(0)
  })

  it('should provide accurate statistics', () => {
    const oldHtml = '<article><h1>Title</h1><p>Old paragraph text.</p></article>'
    const newHtml = '<article><h1>Title</h1><p>New paragraph text with more words.</p></article>'
    const result = compareHtmlDocuments(oldHtml, newHtml)

    expect(result.stats.additions).toBeGreaterThan(0)
    expect(result.stats.deletions).toBeGreaterThan(0)
    expect(result.stats.unchanged).toBeGreaterThan(0)
    expect(result.stats.changePercentage).toBeGreaterThan(0)
  })

  it('should handle empty HTML', () => {
    const result = compareHtmlDocuments('', '')
    expect(result.stats.totalChanges).toBe(0)
  })

  it('should handle complex nested HTML', () => {
    const oldHtml = `
      <div class="content">
        <section>
          <h2>Chapter 1</h2>
          <p>First paragraph with some text.</p>
          <p>Second paragraph with <em>emphasis</em> and <strong>bold</strong>.</p>
        </section>
      </div>
    `
    const newHtml = `
      <div class="content">
        <section>
          <h2>Chapter 1</h2>
          <p>First paragraph with modified text.</p>
          <p>Second paragraph with <em>emphasis</em> and <strong>bold</strong>.</p>
        </section>
      </div>
    `
    const result = compareHtmlDocuments(oldHtml, newHtml)

    expect(result.diff.length).toBeGreaterThan(0)
    expect(result.stats.totalChanges).toBeGreaterThan(0)
  })
})

describe('hasSignificantChanges', () => {
  it('should return false for identical documents', () => {
    const html = '<p>Same content</p>'
    expect(hasSignificantChanges(html, html)).toBe(false)
  })

  it('should return true for significantly different documents', () => {
    const oldHtml = '<p>Original text</p>'
    const newHtml = '<p>Completely different text</p>'
    expect(hasSignificantChanges(oldHtml, newHtml, 1)).toBe(true)
  })

  it('should respect custom threshold', () => {
    const oldHtml = '<p>One two three four five</p>'
    const newHtml = '<p>One two three four changed</p>' // 2 changes / 5 words = 40% change

    expect(hasSignificantChanges(oldHtml, newHtml, 10)).toBe(true) // 40% > 10%
    expect(hasSignificantChanges(oldHtml, newHtml, 30)).toBe(true) // 40% > 30%
    expect(hasSignificantChanges(oldHtml, newHtml, 50)).toBe(false) // 40% < 50%
  })

  it('should return false for minor formatting changes', () => {
    const oldHtml = '<p>Text</p>'
    const newHtml = '<div><span>Text</span></div>'
    expect(hasSignificantChanges(oldHtml, newHtml)).toBe(false)
  })

  it('should return true when adding significant content', () => {
    const oldHtml = '<p>Short</p>'
    const newHtml = '<p>Short text with many additional words and content</p>'
    expect(hasSignificantChanges(oldHtml, newHtml, 1)).toBe(true)
  })

  it('should return true when removing significant content', () => {
    const oldHtml = '<p>Long text with many words and content</p>'
    const newHtml = '<p>Short</p>'
    expect(hasSignificantChanges(oldHtml, newHtml, 1)).toBe(true)
  })

  it('should use default threshold of 1%', () => {
    const oldHtml = '<p>' + 'word '.repeat(100) + '</p>'
    const newHtml = '<p>' + 'word '.repeat(99) + 'changed </p>' // ~1% change

    // Should detect even 1% change with default threshold
    expect(hasSignificantChanges(oldHtml, newHtml)).toBe(true)
  })
})

describe('renderDiffForTerminal', () => {
  it('should render additions with color code', () => {
    const diff = computeWordDiff('Hello', 'Hello world')
    const result = renderDiffForTerminal(diff)

    expect(result).toContain('\x1b[32m') // Green color
    expect(result).toContain('\x1b[0m')  // Reset
  })

  it('should render deletions with color code', () => {
    const diff = computeWordDiff('Hello world', 'Hello')
    const result = renderDiffForTerminal(diff)

    expect(result).toContain('\x1b[31m') // Red color
    expect(result).toContain('\x1b[0m')  // Reset
  })

  it('should render unchanged text without color', () => {
    const diff = computeWordDiff('same', 'same')
    const result = renderDiffForTerminal(diff)

    expect(result).toBe('same')
  })

  it('should handle mixed changes', () => {
    const diff = computeWordDiff('old text', 'new text')
    const result = renderDiffForTerminal(diff)

    expect(result).toContain('\x1b[32m') // Added
    expect(result).toContain('\x1b[31m') // Removed
  })

  it('should handle empty diff', () => {
    const result = renderDiffForTerminal([])
    expect(result).toBe('')
  })
})

describe('integration: autosave conflict scenario', () => {
  it('should accurately compare local and server versions', () => {
    const serverHtml = `
      <h1>Chapter 1</h1>
      <p>The hero walked through the dark forest, listening to the sounds of night.</p>
      <p>Suddenly, a branch snapped behind them.</p>
    `
    const localHtml = `
      <h1>Chapter 1</h1>
      <p>The hero walked through the dark ancient forest, listening to the mysterious sounds of night.</p>
      <p>Suddenly, a large branch snapped loudly behind them.</p>
    `

    const { stats } = compareHtmlDocuments(serverHtml, localHtml)

    // Should detect additions
    expect(stats.additions).toBeGreaterThan(0)

    // Should have some unchanged content
    expect(stats.unchanged).toBeGreaterThan(0)

    // Should calculate reasonable change percentage
    expect(stats.changePercentage).toBeGreaterThan(0)
    expect(stats.changePercentage).toBeLessThan(50)
  })

  it('should handle edge case of empty server content', () => {
    const serverHtml = ''
    const localHtml = '<p>New content typed by user</p>'

    const { stats } = compareHtmlDocuments(serverHtml, localHtml)

    expect(stats.additions).toBeGreaterThan(0)
    expect(stats.deletions).toBe(0)
    expect(stats.changePercentage).toBe(100)
  })

  it('should handle edge case of empty local content', () => {
    const serverHtml = '<p>Existing server content</p>'
    const localHtml = ''

    const { stats } = compareHtmlDocuments(serverHtml, localHtml)

    expect(stats.additions).toBe(0)
    expect(stats.deletions).toBeGreaterThan(0)
    expect(stats.changePercentage).toBe(100)
  })
})

describe('integration: analytics text processing', () => {
  it('should accurately count words after stripping HTML', () => {
    const html = `
      <article>
        <h1>Title With Three Words</h1>
        <p>This is a paragraph with exactly ten words in it.</p>
        <p>Another <strong>paragraph</strong> with <em>five</em> words.</p>
      </article>
    `

    const plainText = stripHtml(html)
    const wordCount = countWords(plainText)

    // 4 (title) + 10 (first p) + 5 (second p) = 19 words
    expect(wordCount).toBe(19)
  })

  it('should split sentences for readability analysis', () => {
    const html = `
      <p>First sentence here. Second sentence here! Third sentence here?</p>
    `

    const plainText = stripHtml(html)
    const sentences = splitSentences(plainText)

    expect(sentences.length).toBeGreaterThanOrEqual(3)
  })

  it('should handle screenplay format', () => {
    const html = `
      <div class="scene">INT. COFFEE SHOP - DAY</div>
      <div class="action">A writer sits alone, typing.</div>
      <div class="character">WRITER</div>
      <div class="dialogue">This is going to be great!</div>
    `

    const plainText = stripHtml(html)
    expect(plainText).toContain('INT. COFFEE SHOP - DAY')
    expect(plainText).toContain('writer sits alone')
    expect(plainText).toContain('WRITER')
    expect(plainText).toContain('This is going to be great')
  })
})
