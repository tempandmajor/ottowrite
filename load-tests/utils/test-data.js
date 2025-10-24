/**
 * Test Data Generation Utilities
 *
 * Generates realistic test data for load testing.
 */

import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'

/**
 * Generate a random project payload
 */
export function generateProject() {
  const genres = ['fiction', 'non-fiction', 'mystery', 'romance', 'sci-fi', 'fantasy', 'thriller']
  const types = ['novel', 'short_story', 'screenplay', 'poem', 'article']

  return {
    title: `Load Test Project ${randomString(8)}`,
    description: `This is a test project created during load testing. ${randomString(20)}`,
    genre: randomItem(genres),
    type: randomItem(types),
    target_word_count: Math.floor(Math.random() * 50000) + 10000,
    settings: {
      autoSave: true,
      theme: 'light',
    },
  }
}

/**
 * Generate a random document payload
 */
export function generateDocument(projectId) {
  const types = ['chapter', 'scene', 'note', 'outline']

  return {
    project_id: projectId,
    title: `Test Document ${randomString(8)}`,
    content: generateRandomContent(),
    type: randomItem(types),
    order_index: Math.floor(Math.random() * 100),
  }
}

/**
 * Generate random content (markdown)
 */
export function generateRandomContent() {
  const paragraphs = Math.floor(Math.random() * 5) + 1
  let content = ''

  for (let i = 0; i < paragraphs; i++) {
    content += `## Heading ${i + 1}\n\n`
    content += generateRandomParagraph() + '\n\n'
  }

  return content
}

/**
 * Generate a random paragraph
 */
function generateRandomParagraph() {
  const sentences = Math.floor(Math.random() * 5) + 3
  const words = [
    'The', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
    'Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
    'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
  ]

  let paragraph = ''
  for (let i = 0; i < sentences; i++) {
    const sentenceLength = Math.floor(Math.random() * 10) + 5
    const sentence = []

    for (let j = 0; j < sentenceLength; j++) {
      sentence.push(randomItem(words))
    }

    paragraph += sentence.join(' ') + '. '
  }

  return paragraph
}

/**
 * Generate AI generation request payload
 */
export function generateAIRequest(documentId) {
  const types = ['continue', 'rewrite', 'expand', 'summarize']
  const models = ['claude-3-5-sonnet-20241022', 'gpt-4o', 'deepseek-chat']

  return {
    document_id: documentId,
    prompt: `Please ${randomItem(types)} this text: ${generateRandomParagraph()}`,
    type: randomItem(types),
    model: randomItem(models),
    max_tokens: Math.floor(Math.random() * 1000) + 500,
  }
}

/**
 * Generate a random character payload
 */
export function generateCharacter(projectId) {
  const roles = ['protagonist', 'antagonist', 'supporting', 'minor']
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry']

  return {
    project_id: projectId,
    name: randomItem(names) + ' ' + randomString(6),
    role: randomItem(roles),
    description: `A ${randomItem(roles)} character with ${generateRandomParagraph().substring(0, 100)}`,
    traits: {
      personality: randomString(20),
      background: randomString(30),
    },
  }
}

/**
 * Generate a random location payload
 */
export function generateLocation(projectId) {
  const categories = ['city', 'building', 'natural', 'fictional']
  const names = ['New York', 'Tokyo', 'London', 'Paris', 'Sydney', 'Moscow']

  return {
    project_id: projectId,
    name: randomItem(names) + ' ' + randomString(6),
    category: randomItem(categories),
    description: generateRandomParagraph().substring(0, 150),
  }
}

/**
 * Generate a random comment payload
 */
export function generateComment(documentId) {
  return {
    document_id: documentId,
    content: `Test comment: ${generateRandomParagraph().substring(0, 100)}`,
    position: {
      start: Math.floor(Math.random() * 1000),
      end: Math.floor(Math.random() * 1000) + 100,
    },
  }
}

/**
 * Generate batch of test items
 */
export function generateBatch(generator, count, ...args) {
  const items = []
  for (let i = 0; i < count; i++) {
    items.push(generator(...args))
  }
  return items
}
