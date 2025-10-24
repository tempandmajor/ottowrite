#!/usr/bin/env tsx
/**
 * API Security Audit Script
 *
 * Performs automated security analysis of all API routes.
 *
 * Checks:
 * - Authentication presence
 * - Authorization checks
 * - Input validation (Zod schemas)
 * - SQL injection protection
 * - Rate limiting
 * - Error handling
 * - CSRF protection
 *
 * Usage:
 *   npm run security:audit-api
 *   tsx scripts/security-audit.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
}

interface SecurityIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  category: string
  description: string
  line?: number
  code?: string
  recommendation: string
}

interface RouteAudit {
  path: string
  file: string
  methods: string[]
  issues: SecurityIssue[]
  hasAuth: boolean
  hasValidation: boolean
  hasRateLimit: boolean
  riskScore: number
}

// Security patterns to check
const securityPatterns = {
  // Authentication (updated to recognize new helpers)
  hasAuth: /supabase\.auth\.getUser\(\)|createClient\(\)|requireAuth\(request\)|optionalAuth\(/,
  checkAuthError: /if\s*\(\s*error\s*\|\|\s*!user\s*\)|requireAuth\(|optionalAuth\(/,

  // Authorization (updated to recognize new helpers)
  hasOwnershipCheck: /\.eq\(['"]user_id['"]\s*,\s*user\.id\)|requireOwnership\(|requireProjectOwnership\(|requireDocumentOwnership\(/,
  hasRLS: /RLS policy|Row Level Security/i,

  // Input validation
  hasZodValidation: /\.safeParse\(|\.parse\(/,
  hasZodImport: /from ['"]zod['"]/,

  // SQL injection (bad patterns)
  stringInterpolation: /\$\{.*\}.*\.eq\(|\.eq\(.*\$\{/,
  templateLiterals: /`.*\$\{.*\}`.*supabase/,

  // Rate limiting (updated to recognize new helpers)
  hasRateLimit: /checkRateLimit|applyRateLimit|RateLimiter|requireAIRateLimit|requireDefaultRateLimit|requireResourceRateLimit/,

  // Error handling
  hasErrorHandling: /try\s*\{|catch\s*\(/,
  hasSecureErrors: /errorResponses\.|NextResponse\.json/,

  // Dangerous patterns
  execSql: /\.sql\(|\.rawQuery\(|execute\(/,
  eval: /eval\(|Function\(/,

  // CSRF
  hasCsrfCheck: /verifyCSRFToken|csrf/i,
}

/**
 * Read and analyze a route file
 */
async function analyzeRoute(filePath: string): Promise<RouteAudit> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const issues: SecurityIssue[] = []

  // Extract route path from file path
  const routePath = filePath
    .replace(/.*\/app\/api\//, '/api/')
    .replace(/\/route\.ts$/, '')

  // Detect HTTP methods
  const methods: string[] = []
  if (content.includes('export async function GET')) methods.push('GET')
  if (content.includes('export async function POST')) methods.push('POST')
  if (content.includes('export async function PUT')) methods.push('PUT')
  if (content.includes('export async function PATCH')) methods.push('PATCH')
  if (content.includes('export async function DELETE')) methods.push('DELETE')

  // Check authentication
  const hasAuth = securityPatterns.hasAuth.test(content)
  const hasAuthCheck = securityPatterns.checkAuthError.test(content)

  // Check if route should be protected (not health/webhooks/public)
  const isPublicRoute =
    routePath.includes('/health') ||
    routePath.includes('/webhooks') ||
    routePath.includes('/contact') ||
    routePath.includes('/test-sentry')

  if (!isPublicRoute && !hasAuth) {
    issues.push({
      severity: 'CRITICAL',
      category: 'Authentication',
      description: 'Missing authentication check',
      recommendation: 'Add `const { data: { user }, error } = await supabase.auth.getUser()` and check if user exists',
    })
  }

  if (hasAuth && !hasAuthCheck) {
    issues.push({
      severity: 'HIGH',
      category: 'Authentication',
      description: 'Auth check present but error handling missing',
      recommendation: 'Add `if (error || !user) { return errorResponses.unauthorized() }`',
    })
  }

  // Check authorization (ownership checks)
  const hasOwnershipCheck = securityPatterns.hasOwnershipCheck.test(content)
  const hasUserIdInQuery = /\.eq\(['"]user_id['"]\s*,/.test(content)

  if (methods.some(m => ['GET', 'PUT', 'PATCH', 'DELETE'].includes(m)) &&
      hasAuth &&
      !hasOwnershipCheck &&
      !isPublicRoute) {
    issues.push({
      severity: 'HIGH',
      category: 'Authorization',
      description: 'Potential IDOR vulnerability - missing user_id ownership check',
      recommendation: 'Add `.eq(\'user_id\', user.id)` to database queries to ensure users can only access their own data',
    })
  }

  // Check input validation
  const hasValidation = securityPatterns.hasZodValidation.test(content)
  const hasZodImport = securityPatterns.hasZodImport.test(content)

  if (methods.some(m => ['POST', 'PUT', 'PATCH'].includes(m)) && !hasValidation) {
    issues.push({
      severity: 'MEDIUM',
      category: 'Input Validation',
      description: 'Missing input validation with Zod',
      recommendation: 'Add Zod schema validation for request body: `const validation = schema.safeParse(body)`',
    })
  }

  // Check for SQL injection vulnerabilities
  const hasStringInterpolation = securityPatterns.stringInterpolation.test(content)
  const hasTemplateLiterals = securityPatterns.templateLiterals.test(content)

  if (hasStringInterpolation || hasTemplateLiterals) {
    lines.forEach((line, index) => {
      if (securityPatterns.stringInterpolation.test(line) ||
          securityPatterns.templateLiterals.test(line)) {
        issues.push({
          severity: 'CRITICAL',
          category: 'SQL Injection',
          description: 'Potential SQL injection - string interpolation in query',
          line: index + 1,
          code: line.trim(),
          recommendation: 'Use parameterized queries only. Never use template literals or string interpolation with database queries',
        })
      }
    })
  }

  // Check for dangerous code patterns
  if (securityPatterns.eval.test(content)) {
    issues.push({
      severity: 'CRITICAL',
      category: 'Code Injection',
      description: 'Use of eval() or Function() constructor detected',
      recommendation: 'Remove eval() and Function() - these allow arbitrary code execution',
    })
  }

  // Check rate limiting
  const hasRateLimit = securityPatterns.hasRateLimit.test(content)
  const isExpensiveRoute =
    routePath.includes('/ai/') ||
    routePath.includes('/generate') ||
    routePath.includes('/analyze')

  if (isExpensiveRoute && !hasRateLimit && !isPublicRoute) {
    issues.push({
      severity: 'MEDIUM',
      category: 'Rate Limiting',
      description: 'Expensive endpoint without rate limiting',
      recommendation: 'Add rate limiting to prevent abuse: `await applyRateLimit(request, user?.id)`',
    })
  }

  // Check error handling
  const hasErrorHandling = securityPatterns.hasErrorHandling.test(content)
  const hasSecureErrors = securityPatterns.hasSecureErrors.test(content)

  if (!hasErrorHandling) {
    issues.push({
      severity: 'LOW',
      category: 'Error Handling',
      description: 'No try-catch blocks for error handling',
      recommendation: 'Add try-catch blocks to handle errors gracefully and prevent information leakage',
    })
  }

  if (hasErrorHandling && !hasSecureErrors) {
    issues.push({
      severity: 'LOW',
      category: 'Error Handling',
      description: 'Error handling present but may leak sensitive information',
      recommendation: 'Use `errorResponses.*` helpers to return safe error messages',
    })
  }

  // Calculate risk score
  const riskScore = calculateRiskScore(issues)

  return {
    path: routePath,
    file: filePath,
    methods,
    issues,
    hasAuth,
    hasValidation,
    hasRateLimit,
    riskScore,
  }
}

/**
 * Calculate risk score for a route (0-100)
 */
function calculateRiskScore(issues: SecurityIssue[]): number {
  const weights = {
    CRITICAL: 25,
    HIGH: 15,
    MEDIUM: 7,
    LOW: 3,
    INFO: 1,
  }

  return issues.reduce((score, issue) => {
    return score + weights[issue.severity]
  }, 0)
}

/**
 * Print colored severity label
 */
function printSeverity(severity: string): string {
  const labels: Record<string, string> = {
    CRITICAL: `${colors.red}CRITICAL${colors.reset}`,
    HIGH: `${colors.red}HIGH${colors.reset}`,
    MEDIUM: `${colors.yellow}MEDIUM${colors.reset}`,
    LOW: `${colors.blue}LOW${colors.reset}`,
    INFO: `${colors.cyan}INFO${colors.reset}`,
  }
  return labels[severity] || severity
}

/**
 * Main audit function
 */
async function runSecurityAudit() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.cyan}   API Security Audit${colors.reset}`)
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)

  // Find all API routes
  const routeFiles = await glob('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true,
  })

  console.log(`${colors.blue}ℹ${colors.reset} Found ${routeFiles.length} API routes to audit\n`)

  // Analyze each route
  const audits: RouteAudit[] = []
  for (const file of routeFiles) {
    const audit = await analyzeRoute(file)
    audits.push(audit)
  }

  // Sort by risk score (highest first)
  audits.sort((a, b) => b.riskScore - a.riskScore)

  // Categorize issues
  const criticalIssues: RouteAudit[] = []
  const highIssues: RouteAudit[] = []
  const mediumIssues: RouteAudit[] = []
  const lowIssues: RouteAudit[] = []
  const cleanRoutes: RouteAudit[] = []

  audits.forEach(audit => {
    const hasCritical = audit.issues.some(i => i.severity === 'CRITICAL')
    const hasHigh = audit.issues.some(i => i.severity === 'HIGH')
    const hasMedium = audit.issues.some(i => i.severity === 'MEDIUM')
    const hasLow = audit.issues.some(i => i.severity === 'LOW')

    if (hasCritical) {
      criticalIssues.push(audit)
    } else if (hasHigh) {
      highIssues.push(audit)
    } else if (hasMedium) {
      mediumIssues.push(audit)
    } else if (hasLow) {
      lowIssues.push(audit)
    } else {
      cleanRoutes.push(audit)
    }
  })

  // Print summary
  console.log(`${colors.cyan}━━━ Summary ━━━${colors.reset}\n`)
  console.log(`Total routes audited: ${audits.length}`)
  console.log(`${colors.red}Routes with CRITICAL issues: ${criticalIssues.length}${colors.reset}`)
  console.log(`${colors.red}Routes with HIGH issues: ${highIssues.length}${colors.reset}`)
  console.log(`${colors.yellow}Routes with MEDIUM issues: ${mediumIssues.length}${colors.reset}`)
  console.log(`${colors.blue}Routes with LOW issues: ${lowIssues.length}${colors.reset}`)
  console.log(`${colors.green}Clean routes: ${cleanRoutes.length}${colors.reset}\n`)

  // Print detailed findings
  if (criticalIssues.length > 0) {
    console.log(`${colors.cyan}━━━ CRITICAL Issues ━━━${colors.reset}\n`)
    printRouteIssues(criticalIssues, ['CRITICAL'])
  }

  if (highIssues.length > 0) {
    console.log(`\n${colors.cyan}━━━ HIGH Priority Issues ━━━${colors.reset}\n`)
    printRouteIssues(highIssues, ['HIGH'])
  }

  if (mediumIssues.length > 0) {
    console.log(`\n${colors.cyan}━━━ MEDIUM Priority Issues ━━━${colors.reset}\n`)
    printRouteIssues(mediumIssues, ['MEDIUM'])
  }

  // Generate report file
  await generateReport(audits)

  // Exit with error if critical or high issues found
  if (criticalIssues.length > 0 || highIssues.length > 0) {
    console.log(`\n${colors.red}✗ Security audit failed - critical or high severity issues found${colors.reset}`)
    process.exit(1)
  } else {
    console.log(`\n${colors.green}✓ Security audit passed - no critical or high severity issues${colors.reset}`)
    process.exit(0)
  }
}

/**
 * Print route issues
 */
function printRouteIssues(routes: RouteAudit[], severities: string[]) {
  routes.forEach(audit => {
    const relevantIssues = audit.issues.filter(i => severities.includes(i.severity))
    if (relevantIssues.length === 0) return

    console.log(`${colors.white}Route:${colors.reset} ${audit.path}`)
    console.log(`${colors.white}File:${colors.reset} ${audit.file.replace(process.cwd(), '.')}`)
    console.log(`${colors.white}Methods:${colors.reset} ${audit.methods.join(', ')}`)
    console.log(`${colors.white}Risk Score:${colors.reset} ${audit.riskScore}/100\n`)

    relevantIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${printSeverity(issue.severity)} - ${issue.category}`)
      console.log(`     ${colors.white}Issue:${colors.reset} ${issue.description}`)
      if (issue.line) {
        console.log(`     ${colors.white}Line:${colors.reset} ${issue.line}`)
      }
      if (issue.code) {
        console.log(`     ${colors.yellow}Code:${colors.reset} ${issue.code}`)
      }
      console.log(`     ${colors.green}Fix:${colors.reset} ${issue.recommendation}`)
      console.log()
    })

    console.log()
  })
}

/**
 * Generate detailed report file
 */
async function generateReport(audits: RouteAudit[]) {
  const timestamp = new Date().toISOString().split('T')[0]
  const reportPath = path.join(process.cwd(), 'docs', `SECURITY_AUDIT_REPORT_${timestamp}.md`)

  let report = `# API Security Audit Report\n\n`
  report += `**Date:** ${new Date().toISOString()}\n`
  report += `**Routes Audited:** ${audits.length}\n\n`

  // Summary statistics
  const totalIssues = audits.reduce((sum, a) => sum + a.issues.length, 0)
  const criticalCount = audits.reduce((sum, a) => sum + a.issues.filter(i => i.severity === 'CRITICAL').length, 0)
  const highCount = audits.reduce((sum, a) => sum + a.issues.filter(i => i.severity === 'HIGH').length, 0)
  const mediumCount = audits.reduce((sum, a) => sum + a.issues.filter(i => i.severity === 'MEDIUM').length, 0)
  const lowCount = audits.reduce((sum, a) => sum + a.issues.filter(i => i.severity === 'LOW').length, 0)

  report += `## Summary\n\n`
  report += `| Metric | Count |\n`
  report += `|--------|-------|\n`
  report += `| Total Issues | ${totalIssues} |\n`
  report += `| CRITICAL | ${criticalCount} |\n`
  report += `| HIGH | ${highCount} |\n`
  report += `| MEDIUM | ${mediumCount} |\n`
  report += `| LOW | ${lowCount} |\n`
  report += `| Clean Routes | ${audits.filter(a => a.issues.length === 0).length} |\n\n`

  // Security coverage
  const withAuth = audits.filter(a => a.hasAuth).length
  const withValidation = audits.filter(a => a.hasValidation).length
  const withRateLimit = audits.filter(a => a.hasRateLimit).length

  report += `## Security Coverage\n\n`
  report += `| Security Control | Routes | Percentage |\n`
  report += `|-----------------|--------|------------|\n`
  report += `| Authentication | ${withAuth}/${audits.length} | ${((withAuth/audits.length)*100).toFixed(1)}% |\n`
  report += `| Input Validation | ${withValidation}/${audits.length} | ${((withValidation/audits.length)*100).toFixed(1)}% |\n`
  report += `| Rate Limiting | ${withRateLimit}/${audits.length} | ${((withRateLimit/audits.length)*100).toFixed(1)}% |\n\n`

  // High-risk routes
  const highRiskRoutes = audits.filter(a => a.riskScore >= 15).slice(0, 20)
  if (highRiskRoutes.length > 0) {
    report += `## Top 20 High-Risk Routes\n\n`
    report += `| Route | Risk Score | Issues |\n`
    report += `|-------|------------|--------|\n`
    highRiskRoutes.forEach(audit => {
      const issuesSummary = audit.issues.map(i => i.severity).join(', ')
      report += `| \`${audit.path}\` | ${audit.riskScore} | ${issuesSummary} |\n`
    })
    report += `\n`
  }

  // Detailed findings
  report += `## Detailed Findings\n\n`

  const categorized = {
    'CRITICAL Issues': audits.filter(a => a.issues.some(i => i.severity === 'CRITICAL')),
    'HIGH Priority Issues': audits.filter(a => a.issues.some(i => i.severity === 'HIGH') && !a.issues.some(i => i.severity === 'CRITICAL')),
    'MEDIUM Priority Issues': audits.filter(a => a.issues.some(i => i.severity === 'MEDIUM') && !a.issues.some(i => ['CRITICAL', 'HIGH'].includes(i.severity))),
  }

  Object.entries(categorized).forEach(([category, routes]) => {
    if (routes.length === 0) return

    report += `### ${category}\n\n`

    routes.forEach(audit => {
      report += `#### ${audit.path}\n\n`
      report += `- **File:** \`${audit.file.replace(process.cwd(), '.')}\`\n`
      report += `- **Methods:** ${audit.methods.join(', ')}\n`
      report += `- **Risk Score:** ${audit.riskScore}/100\n\n`
      report += `**Issues:**\n\n`

      audit.issues.forEach((issue, index) => {
        report += `${index + 1}. **[${issue.severity}] ${issue.category}**\n`
        report += `   - **Issue:** ${issue.description}\n`
        if (issue.line) {
          report += `   - **Line:** ${issue.line}\n`
        }
        if (issue.code) {
          report += `   - **Code:** \`${issue.code}\`\n`
        }
        report += `   - **Recommendation:** ${issue.recommendation}\n\n`
      })
    })
  })

  // Recommendations
  report += `## Recommendations\n\n`
  report += `### Immediate Actions (Critical/High)\n\n`
  if (criticalCount + highCount > 0) {
    report += `1. Fix all CRITICAL issues immediately (${criticalCount} found)\n`
    report += `2. Address all HIGH priority issues (${highCount} found)\n`
    report += `3. Re-run security audit to verify fixes\n\n`
  } else {
    report += `No immediate critical or high-priority issues found.\n\n`
  }

  report += `### Short-term Improvements\n\n`
  report += `1. Add authentication to all protected endpoints\n`
  report += `2. Implement input validation with Zod for all POST/PUT/PATCH endpoints\n`
  report += `3. Add ownership checks (\`.eq('user_id', user.id)\`) to prevent IDOR\n`
  report += `4. Enable rate limiting on expensive endpoints (AI, analysis, generation)\n\n`

  report += `### Long-term Security Posture\n\n`
  report += `1. Regular security audits (monthly)\n`
  report += `2. Automated security testing in CI/CD\n`
  report += `3. Security code review process for new routes\n`
  report += `4. Developer security training\n`
  report += `5. Penetration testing before major releases\n\n`

  fs.writeFileSync(reportPath, report)
  console.log(`\n${colors.green}✓${colors.reset} Detailed report saved to: ${reportPath}`)
}

// Run audit
runSecurityAudit().catch((error) => {
  console.error(`${colors.red}✗ Audit failed:${colors.reset}`, error)
  process.exit(1)
})
