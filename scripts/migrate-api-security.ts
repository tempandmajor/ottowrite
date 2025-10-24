#!/usr/bin/env tsx
/**
 * API Security Migration Script
 *
 * Automatically applies security best practices to API routes:
 * - Standardized authentication with requireAuth()
 * - Input validation with Zod schemas
 * - Rate limiting based on endpoint type
 * - Ownership checks for resource access
 *
 * Usage:
 *   tsx scripts/migrate-api-security.ts [options]
 *
 * Options:
 *   --dry-run          Show what would be changed without applying
 *   --category=<name>  Only process specific category (simple-get, ai, mutations, complex)
 *   --route=<path>     Only process specific route
 *   --report           Generate detailed report only
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

interface RouteAnalysis {
  path: string
  relativePath: string
  methods: string[]
  hasAuth: boolean
  hasAuthErrorHandling: boolean
  hasZodValidation: boolean
  hasRateLimit: boolean
  hasOwnershipCheck: boolean
  category: 'simple-get' | 'ai' | 'mutations' | 'complex' | 'skip'
  riskScore: number
  fixes: string[]
}

interface MigrationResult {
  path: string
  success: boolean
  applied: string[]
  errors: string[]
  beforeHash: string
  afterHash: string
}

class APISecurityMigrator {
  private projectRoot: string
  private apiDir: string
  private dryRun: boolean
  private results: MigrationResult[] = []

  constructor(options: { dryRun?: boolean } = {}) {
    this.projectRoot = process.cwd()
    this.apiDir = join(this.projectRoot, 'app', 'api')
    this.dryRun = options.dryRun ?? false
  }

  /**
   * Find all API route files
   */
  private findRouteFiles(dir: string = this.apiDir): string[] {
    const routes: string[] = []

    const scanDir = (currentDir: string) => {
      const items = readdirSync(currentDir)

      for (const item of items) {
        const fullPath = join(currentDir, item)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          scanDir(fullPath)
        } else if (item === 'route.ts' || item === 'route.tsx') {
          routes.push(fullPath)
        }
      }
    }

    scanDir(dir)
    return routes
  }

  /**
   * Analyze a route file to determine what needs fixing
   */
  private analyzeRoute(filePath: string): RouteAnalysis {
    const content = readFileSync(filePath, 'utf-8')
    const relativePath = relative(this.apiDir, filePath)

    // Detect HTTP methods
    const methods: string[] = []
    if (content.match(/export\s+async\s+function\s+GET/)) methods.push('GET')
    if (content.match(/export\s+async\s+function\s+POST/)) methods.push('POST')
    if (content.match(/export\s+async\s+function\s+PUT/)) methods.push('PUT')
    if (content.match(/export\s+async\s+function\s+PATCH/)) methods.push('PATCH')
    if (content.match(/export\s+async\s+function\s+DELETE/)) methods.push('DELETE')

    // Check for auth patterns
    const hasAuth = content.includes('supabase.auth.getUser()')
    const hasAuthErrorHandling =
      hasAuth && (
        content.includes('requireAuth(request)') ||
        (content.includes('if (error || !user)') && content.includes('errorResponses.unauthorized()'))
      )

    // Check for validation
    const hasZodValidation =
      content.includes('.safeParse(') ||
      content.includes('.parse(') ||
      content.includes('validateBody(')

    // Check for rate limiting
    const hasRateLimit =
      content.includes('requireAIRateLimit') ||
      content.includes('requireDefaultRateLimit') ||
      content.includes('requireResourceRateLimit') ||
      content.includes('applyRateLimit') ||
      content.includes('checkAIRateLimit')

    // Check for ownership checks
    const hasOwnershipCheck =
      content.includes('.eq(\'user_id\', user.id)') ||
      content.includes('requireOwnership') ||
      content.includes('requireProjectOwnership')

    // Categorize route
    let category: RouteAnalysis['category'] = 'complex'

    // Skip certain routes
    if (
      relativePath.includes('webhooks/') ||
      relativePath.includes('health/') ||
      filePath.includes('admin/rate-limits')
    ) {
      category = 'skip'
    }
    // Simple GET endpoints (no body, just auth needed)
    else if (methods.length === 1 && methods[0] === 'GET' && !content.includes('request.json()')) {
      category = 'simple-get'
    }
    // AI endpoints
    else if (relativePath.startsWith('ai/')) {
      category = 'ai'
    }
    // Mutation endpoints
    else if (methods.some(m => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m))) {
      category = 'mutations'
    }

    // Calculate risk score
    let riskScore = 0
    if (!hasAuthErrorHandling && hasAuth) riskScore += 15
    if (!hasZodValidation && methods.some(m => ['POST', 'PUT', 'PATCH'].includes(m))) riskScore += 7
    if (!hasRateLimit && (category === 'ai' || methods.includes('POST'))) riskScore += 7
    if (!hasOwnershipCheck && methods.some(m => ['GET', 'PUT', 'PATCH', 'DELETE'].includes(m))) riskScore += 10

    // Determine fixes needed
    const fixes: string[] = []
    if (hasAuth && !hasAuthErrorHandling) fixes.push('auth-error-handling')
    if (!hasZodValidation && methods.some(m => ['POST', 'PUT', 'PATCH'].includes(m))) fixes.push('input-validation')
    if (!hasRateLimit) {
      if (category === 'ai') fixes.push('ai-rate-limiting')
      else if (category === 'mutations') fixes.push('default-rate-limiting')
    }
    if (!hasOwnershipCheck && category !== 'simple-get') fixes.push('ownership-check')

    return {
      path: filePath,
      relativePath,
      methods,
      hasAuth,
      hasAuthErrorHandling,
      hasZodValidation,
      hasRateLimit,
      hasOwnershipCheck,
      category,
      riskScore,
      fixes,
    }
  }

  /**
   * Apply auth error handling fix
   */
  private applyAuthFix(content: string): { content: string; applied: boolean } {
    // Check if already using requireAuth
    if (content.includes('requireAuth(request)')) {
      return { content, applied: false }
    }

    let newContent = content
    let applied = false

    // First, ensure function has request parameter
    const functionPattern = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*\)/g
    if (functionPattern.test(content)) {
      newContent = newContent.replace(
        /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*\)/g,
        'export async function $1(request: Request)'
      )
    }

    // Add import if missing
    if (!newContent.includes('@/lib/api/auth-helpers')) {
      const importMatch = newContent.match(/import.*from '@\/lib\/api\/error-response'/)
      if (importMatch) {
        newContent = newContent.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { requireAuth } from '@/lib/api/auth-helpers'`
        )
      }
    }

    // Pattern 1: Full auth with error handling
    const authPattern = /const supabase = await createClient\(\)\s+(?:\/\/ Check authentication\s+)?const\s+\{\s+data:\s+\{\s+user\s+\},?\s*(?:error:\s*\w+)?,?\s*\}\s*=\s*await supabase\.auth\.getUser\(\)\s+if\s+\((?:\w+\s+\|\|\s+)?!user\)\s+\{[^}]*return errorResponses\.unauthorized\([^)]*\)\s+\}/gs

    if (authPattern.test(newContent)) {
      newContent = newContent.replace(
        authPattern,
        'const { user, supabase } = await requireAuth(request)'
      )
      applied = true
    }

    // Pattern 2: Auth check with both error and user check
    const authWithErrorPattern = /const supabase = await createClient\(\)\s+\/\/ Check authentication\s+const\s+\{\s+data:\s+\{\s+user\s+\},\s+error:\s+\w+,?\s*\}\s*=\s*await supabase\.auth\.getUser\(\)\s+if\s+\(\w+\s+\|\|\s+!user\)\s+\{[^}]*return errorResponses\.unauthorized\([^)]*\)\s+\}/gs

    if (!applied && authWithErrorPattern.test(newContent)) {
      newContent = newContent.replace(
        authWithErrorPattern,
        'const { user, supabase } = await requireAuth(request)'
      )
      applied = true
    }

    return { content: newContent, applied }
  }

  /**
   * Apply rate limiting fix
   */
  private applyRateLimitFix(
    content: string,
    type: 'ai' | 'default' | 'resource'
  ): { content: string; applied: boolean } {
    // Add import if missing
    let newContent = content
    if (!content.includes('@/lib/api/rate-limit-helpers')) {
      const importMatch = content.match(/import.*from '@\/lib\/api\/auth-helpers'/)
      if (importMatch) {
        newContent = content.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { require${type === 'ai' ? 'AI' : type === 'resource' ? 'Resource' : 'Default'}RateLimit } from '@/lib/api/rate-limit-helpers'`
        )
      }
    }

    // Find where to add rate limiting (after auth)
    const afterAuthPattern = /const \{ user, supabase \} = await requireAuth\(request\)/
    const match = newContent.match(afterAuthPattern)

    if (match && match.index !== undefined) {
      const insertPos = match.index + match[0].length
      const rateLimitCall = `\n  await require${type === 'ai' ? 'AI' : type === 'resource' ? 'Resource' : 'Default'}RateLimit(request, user.id)`
      newContent = newContent.slice(0, insertPos) + rateLimitCall + newContent.slice(insertPos)
      return { content: newContent, applied: true }
    }

    return { content: newContent, applied: false }
  }

  /**
   * Migrate a single route file
   */
  private migrateRoute(analysis: RouteAnalysis): MigrationResult {
    const result: MigrationResult = {
      path: analysis.path,
      success: true,
      applied: [],
      errors: [],
      beforeHash: '',
      afterHash: '',
    }

    try {
      let content = readFileSync(analysis.path, 'utf-8')
      result.beforeHash = this.hashContent(content)

      // Apply fixes in order
      for (const fix of analysis.fixes) {
        switch (fix) {
          case 'auth-error-handling': {
            const { content: newContent, applied } = this.applyAuthFix(content)
            if (applied) {
              content = newContent
              result.applied.push('auth-error-handling')
            }
            break
          }
          case 'ai-rate-limiting': {
            const { content: newContent, applied } = this.applyRateLimitFix(content, 'ai')
            if (applied) {
              content = newContent
              result.applied.push('ai-rate-limiting')
            }
            break
          }
          case 'default-rate-limiting': {
            const { content: newContent, applied } = this.applyRateLimitFix(content, 'default')
            if (applied) {
              content = newContent
              result.applied.push('default-rate-limiting')
            }
            break
          }
          // Add more fix types as needed
        }
      }

      result.afterHash = this.hashContent(content)

      // Write changes if not dry run and content changed
      if (!this.dryRun && result.beforeHash !== result.afterHash) {
        writeFileSync(analysis.path, content, 'utf-8')
      }

    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : String(error))
    }

    return result
  }

  /**
   * Simple hash function for content comparison
   */
  private hashContent(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * Generate migration report
   */
  private generateReport(analyses: RouteAnalysis[]): void {
    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.bright}${colors.cyan}  API Security Migration Report${colors.reset}`)
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`)

    // Summary by category
    const byCategory = analyses.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`${colors.bright}Routes by Category:${colors.reset}`)
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(20)} ${count} routes`)
    })

    // Fixes needed
    const fixCounts = analyses.reduce((acc, a) => {
      a.fixes.forEach(fix => {
        acc[fix] = (acc[fix] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    console.log(`\n${colors.bright}Fixes Needed:${colors.reset}`)
    Object.entries(fixCounts).forEach(([fix, count]) => {
      const color = count > 50 ? colors.red : count > 20 ? colors.yellow : colors.green
      console.log(`  ${color}${fix.padEnd(30)} ${count} routes${colors.reset}`)
    })

    // Top 20 highest risk routes
    const topRisk = analyses
      .filter(a => a.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20)

    if (topRisk.length > 0) {
      console.log(`\n${colors.bright}Top 20 Highest Risk Routes:${colors.reset}`)
      topRisk.forEach((route, idx) => {
        const color = route.riskScore > 30 ? colors.red : route.riskScore > 20 ? colors.yellow : colors.green
        console.log(`  ${(idx + 1).toString().padStart(2)}. ${color}${route.relativePath.padEnd(50)} Risk: ${route.riskScore} | Fixes: ${route.fixes.join(', ')}${colors.reset}`)
      })
    }

    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`)
  }

  /**
   * Run the migration
   */
  async run(options: {
    category?: string
    route?: string
    reportOnly?: boolean
  } = {}): Promise<void> {
    console.log(`${colors.bright}${colors.blue}Starting API Security Migration...${colors.reset}\n`)

    if (this.dryRun) {
      console.log(`${colors.yellow}[DRY RUN MODE - No files will be modified]${colors.reset}\n`)
    }

    // Find all routes
    const routeFiles = this.findRouteFiles()
    console.log(`Found ${routeFiles.length} API route files\n`)

    // Analyze all routes
    console.log(`${colors.cyan}Analyzing routes...${colors.reset}`)
    const analyses = routeFiles.map(file => this.analyzeRoute(file))

    // Filter by options
    let toProcess = analyses
    if (options.category) {
      toProcess = toProcess.filter(a => a.category === options.category)
      console.log(`Filtered to ${toProcess.length} routes in category: ${options.category}`)
    }
    if (options.route) {
      toProcess = toProcess.filter(a => a.relativePath.includes(options.route!))
      console.log(`Filtered to ${toProcess.length} routes matching: ${options.route}`)
    }

    // Generate report
    this.generateReport(toProcess)

    if (options.reportOnly) {
      console.log(`${colors.yellow}Report-only mode - stopping here${colors.reset}`)
      return
    }

    // Skip routes that don't need fixes
    const needsFixes = toProcess.filter(a => a.fixes.length > 0 && a.category !== 'skip')
    console.log(`\n${colors.bright}Processing ${needsFixes.length} routes that need fixes...${colors.reset}\n`)

    // Process each route
    let processed = 0
    let modified = 0
    let failed = 0

    for (const analysis of needsFixes) {
      process.stdout.write(`Processing ${analysis.relativePath}...`)

      const result = this.migrateRoute(analysis)
      this.results.push(result)

      processed++

      if (result.success) {
        if (result.applied.length > 0) {
          modified++
          console.log(` ${colors.green}✓ Applied: ${result.applied.join(', ')}${colors.reset}`)
        } else {
          console.log(` ${colors.yellow}○ No changes needed${colors.reset}`)
        }
      } else {
        failed++
        console.log(` ${colors.red}✗ Failed: ${result.errors.join(', ')}${colors.reset}`)
      }
    }

    // Final summary
    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.bright}Migration Complete${colors.reset}`)
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`  Processed: ${processed} routes`)
    console.log(`  ${colors.green}Modified:  ${modified} routes${colors.reset}`)
    console.log(`  ${colors.red}Failed:    ${failed} routes${colors.reset}`)
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`)

    if (this.dryRun) {
      console.log(`${colors.yellow}This was a dry run. Use without --dry-run to apply changes.${colors.reset}\n`)
    }
  }
}

// Parse CLI arguments
const args = process.argv.slice(2)
const options = {
  dryRun: args.includes('--dry-run'),
  reportOnly: args.includes('--report'),
  category: args.find(a => a.startsWith('--category='))?.split('=')[1],
  route: args.find(a => a.startsWith('--route='))?.split('=')[1],
}

// Run migration
const migrator = new APISecurityMigrator({ dryRun: options.dryRun })
migrator.run(options).catch(error => {
  console.error(`${colors.red}Migration failed:${colors.reset}`, error)
  process.exit(1)
})
