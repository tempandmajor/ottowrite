import { logger } from '@/lib/monitoring/structured-logger'

/**
 * HTML Sanitization Utilities
 *
 * Protects against XSS attacks by sanitizing user-provided HTML content.
 * Uses regex-based approach for server-side sanitization.
 * Note: For client-side, use DOMPurify directly in the browser.
 */

/**
 * Dangerous HTML patterns to detect and remove
 */
const DANGEROUS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi, // Script tags
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi, // iframes
  /<object[^>]*>[\s\S]*?<\/object>/gi, // object tags
  /<embed[^>]*>/gi, // embed tags
  /javascript:/gi, // javascript: protocol
  /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc)
  /<style[^>]*>[\s\S]*?<\/style>/gi, // style tags (can contain expressions)
  /data:text\/html/gi, // data URLs with HTML
] as const

/**
 * Sanitize HTML content using regex-based approach
 *
 * @param html - Raw HTML string to sanitize
 * @param stripAll - If true, strips all HTML tags (plain text mode)
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```typescript
 * // Sanitize document editor content
 * const safe = sanitizeHTML(userContent)
 *
 * // Extract plain text
 * const text = sanitizeHTML(userContent, true)
 * ```
 */
export function sanitizeHTML(
  html: string,
  stripAll = false
): string {
  if (!html) return ''

  try {
    let sanitized = html

    // Strip all HTML if requested
    if (stripAll) {
      sanitized = sanitized.replace(/<[^>]*>/g, '')
      return sanitized.trim()
    }

    // Remove dangerous patterns
    DANGEROUS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '')
    })

    // Log if content was modified (potential XSS attempt)
    if (sanitized !== html) {
      logger.warn('HTML sanitization removed potentially dangerous content', {
        operation: 'sanitize:html',
        originalLength: html.length,
        sanitizedLength: sanitized.length,
        removed: html.length - sanitized.length,
      })
    }

    return sanitized
  } catch (error) {
    logger.error('HTML sanitization failed', {
      operation: 'sanitize:html',
    }, error instanceof Error ? error : undefined)

    // On error, return empty string (fail-safe)
    return ''
  }
}

/**
 * Sanitize plain text (remove all HTML tags)
 *
 * @param text - Text that may contain HTML
 * @returns Plain text with all HTML removed
 */
export function sanitizePlainText(text: string): string {
  return sanitizeHTML(text, true)
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 *
 * @param url - URL string to sanitize
 * @param allowedProtocols - Allowed URL protocols (default: http, https, mailto)
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeURL(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:', 'mailto:']
): string {
  if (!url) return ''

  try {
    const parsed = new URL(url)

    // Check if protocol is allowed
    if (!allowedProtocols.includes(parsed.protocol)) {
      logger.warn('Blocked URL with disallowed protocol', {
        operation: 'sanitize:url',
        protocol: parsed.protocol,
        allowedProtocols,
      })
      return ''
    }

    return url
  } catch (_error) {
    // Invalid URL
    logger.warn('Invalid URL format', {
      operation: 'sanitize:url',
      url: url.substring(0, 100), // Log first 100 chars only
    })
    return ''
  }
}

/**
 * Sanitize filename to prevent directory traversal attacks
 *
 * @param filename - Original filename
 * @returns Safe filename with no path traversal characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'untitled'

  // Remove path separators and special characters
  const safe = filename
    .replace(/[/\\]/g, '') // Remove slashes
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .replace(/^\.+/, '') // Remove leading dots
    .trim()

  // Ensure we have a valid filename
  return safe || 'untitled'
}

/**
 * Sanitize SQL-like input to prevent injection (basic protection)
 * Note: Always use parameterized queries! This is defense-in-depth only.
 *
 * @param input - User input that might be used in SQL context
 * @returns Input with SQL special characters escaped
 */
export function sanitizeSQLInput(input: string): string {
  if (!input) return ''

  // Escape single quotes and other SQL special characters
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons (command separator)
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
}

/**
 * Detect potential XSS patterns in text
 *
 * @param text - Text to check for XSS patterns
 * @returns True if suspicious patterns detected
 */
export function detectXSSPatterns(text: string): boolean {
  if (!text) return false

  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi, // Script tags
    /javascript:/gi, // javascript: protocol
    /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc)
    /<iframe/gi, // iframes
    /<object/gi, // object tags
    /<embed/gi, // embed tags
    /data:text\/html/gi, // data URLs with HTML
    /<svg[^>]*>.*?<\/svg>/gi, // SVG with potential scripts
  ]

  return xssPatterns.some(pattern => pattern.test(text))
}

/**
 * Detect potential SQL injection patterns
 *
 * @param text - Text to check for SQL injection
 * @returns True if suspicious patterns detected
 */
export function detectSQLInjection(text: string): boolean {
  if (!text) return false

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /UNION\s+SELECT/gi,
    /;\s*DROP\s+TABLE/gi,
    /--/g, // SQL comments
    /\/\*.*?\*\//g, // Block comments
    /'.*?OR.*?'.*?='/gi, // OR-based injection
  ]

  return sqlPatterns.some(pattern => pattern.test(text))
}

/**
 * Sanitization report for logging/debugging
 */
export interface SanitizationReport {
  original: string
  sanitized: string
  modified: boolean
  xssDetected: boolean
  sqlInjectionDetected: boolean
  stripAll: boolean
}

/**
 * Sanitize with detailed report (for auditing)
 *
 * @param html - HTML to sanitize
 * @param stripAll - Whether to strip all HTML tags
 * @returns Sanitization report with before/after
 */
export function sanitizeWithReport(
  html: string,
  stripAll = false
): SanitizationReport {
  const sanitized = sanitizeHTML(html, stripAll)
  const modified = sanitized !== html
  const xssDetected = detectXSSPatterns(html)
  const sqlInjectionDetected = detectSQLInjection(html)

  // Log if malicious patterns detected
  if (xssDetected || sqlInjectionDetected) {
    logger.warn('Malicious patterns detected in input', {
      operation: 'sanitize:report',
      xssDetected,
      sqlInjectionDetected,
      modified,
    })
  }

  return {
    original: html,
    sanitized,
    modified,
    xssDetected,
    sqlInjectionDetected,
    stripAll,
  }
}
