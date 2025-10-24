#!/usr/bin/env tsx
/**
 * IDOR Vulnerability Fix Script
 *
 * Automatically adds user_id ownership checks to database queries
 * to prevent users from accessing other users' data.
 *
 * Pattern: Add `.eq('user_id', user.id)` after table queries
 */

import fs from 'fs';
import path from 'path';

// Routes that need IDOR fixes (from security audit)
const routesNeedingFixes = [
  'app/api/auth/sessions/[sessionId]/route.ts',
  'app/api/beat-sheets/route.ts',
  'app/api/v1/projects/route.ts',
  'app/api/analytics/sessions/route.ts',
  'app/api/analytics/enqueue/route.ts',
  'app/api/beat-board/route.ts',
  'app/api/branches/route.ts',
  'app/api/branches/commit/route.ts',
  'app/api/branches/merge/route.ts',
  'app/api/branches/switch/route.ts',
  'app/api/collaboration/access/route.ts',
  'app/api/projects/[id]/apply-template/route.ts',
  'app/api/research/search/route.ts',
  'app/api/templates/wizard/route.ts',
  'app/api/admin/rate-limits/route.ts',
];

// Tables that require user_id ownership checks
const tablesRequiringOwnership = [
  'projects',
  'documents',
  'beat_sheets',
  'user_sessions',
  'analytics_sessions',
  'branches',
  'collaboration_invites',
  'user_profiles',
];

interface OwnershipCheck {
  table: string;
  hasUserIdColumn: boolean;
  pattern: RegExp;
  fix: string;
}

const ownershipChecks: OwnershipCheck[] = tablesRequiringOwnership.map(table => ({
  table,
  hasUserIdColumn: true,
  pattern: new RegExp(
    `\\.from\\(['"\`]${table}['"\`]\\)\\s+\\.select\\([^)]+\\)(?!.*\\.eq\\(['"\`]user_id['"\`])`,
    'g'
  ),
  fix: `.eq('user_id', user.id)`,
}));

function analyzeFile(filePath: string): { needsFixes: boolean; fixes: string[] } {
  const content = fs.readFileSync(filePath, 'utf8');
  const fixes: string[] = [];

  // Check if file already has auth helpers
  if (!content.includes('requireAuth')) {
    fixes.push('Add requireAuth() helper');
  }

  // Check each table for ownership checks
  for (const check of ownershipChecks) {
    if (content.includes(`.from('${check.table}')`)) {
      // Check if ownership check exists
      const selectPattern = new RegExp(
        `\\.from\\(['"]${check.table}['"]\\)[^;]*\\.select\\([^)]+\\)`,
        'g'
      );
      const matches = content.match(selectPattern);

      if (matches) {
        matches.forEach(match => {
          if (!match.includes(".eq('user_id'") && !match.includes('.eq("user_id"')) {
            fixes.push(`Add ownership check to ${check.table} query`);
          }
        });
      }
    }
  }

  return {
    needsFixes: fixes.length > 0,
    fixes,
  };
}

function fixFile(filePath: string, dryRun: boolean = true): boolean {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add imports if missing
  if (!content.includes('@/lib/api/auth-helpers')) {
    const importMatch = content.match(/import.*from '@\/lib\/api\/error-response'/);
    if (importMatch) {
      content = content.replace(
        importMatch[0],
        `${importMatch[0]}\nimport { requireAuth } from '@/lib/api/auth-helpers';`
      );
      modified = true;
    }
  }

  if (!content.includes('@/lib/api/rate-limit-helpers')) {
    const importMatch = content.match(/import { requireAuth }/);
    if (importMatch) {
      content = content.replace(
        importMatch[0],
        `${importMatch[0]}\nimport { requireDefaultRateLimit } from '@/lib/api/rate-limit-helpers';`
      );
      modified = true;
    }
  }

  // Replace auth patterns
  const authPattern = /const supabase = await createClient\(\)\s+(?:\/\/ Check authentication\s+)?const\s+\{\s+data:\s+\{\s+user\s+\},?\s*(?:error:\s*\w+)?,?\s*\}\s*=\s*await supabase\.auth\.getUser\(\)\s+if\s+\((?:\w+\s+\|\|\s+)?!user\)\s+\{[^}]*return errorResponses\.unauthorized\([^)]*\)\s+\}/gs;

  if (authPattern.test(content)) {
    content = content.replace(
      authPattern,
      'const { user, supabase } = await requireAuth(request);\n    await requireDefaultRateLimit(request, user.id);'
    );
    modified = true;
  }

  // Add ownership checks to project queries
  const projectQueryPattern = /\.from\(['"]projects['"]\)\s+\.select\(([^)]+)\)\s+\.eq\(['"]id['"],\s*(\w+)\)\s+(?!.*\.eq\(['"]user_id)/g;
  if (projectQueryPattern.test(content)) {
    content = content.replace(
      /\.from\(['"]projects['"]\)\s+\.select\(([^)]+)\)\s+\.eq\(['"]id['"],\s*(\w+)\)/g,
      (match) => {
        if (!match.includes("eq('user_id'")) {
          return match + "\n      .eq('user_id', user.id)";
        }
        return match;
      }
    );
    modified = true;
  }

  // Add ownership checks to documents queries
  const documentQueryPattern = /\.from\(['"]documents['"]\)\s+\.select\(([^)]+)\)\s+\.eq\(['"]id['"],\s*(\w+)\)\s+(?!.*\.eq\(['"]user_id)/g;
  if (documentQueryPattern.test(content)) {
    content = content.replace(
      /\.from\(['"]documents['"]\)\s+\.select\(([^)]+)\)\s+\.eq\(['"]id['"],\s*(\w+)\)/g,
      (match) => {
        if (!match.includes("eq('user_id'")) {
          return match + "\n      .eq('user_id', user.id)";
        }
        return match;
      }
    );
    modified = true;
  }

  if (modified && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return modified;
}

// Main execution
console.log('🔍 IDOR Vulnerability Fix Script\n');

const dryRun = process.argv.includes('--dry-run');
const fix = process.argv.includes('--fix');

if (dryRun) {
  console.log('🏃 Running in DRY RUN mode - no files will be modified\n');
}

let totalRoutes = 0;
let routesWithIssues = 0;
let routesFixed = 0;

for (const routePath of routesNeedingFixes) {
  const fullPath = path.join(process.cwd(), routePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${routePath} - File not found`);
    continue;
  }

  totalRoutes++;
  const analysis = analyzeFile(fullPath);

  if (analysis.needsFixes) {
    routesWithIssues++;
    console.log(`\n📝 ${routePath}`);
    console.log(`   Issues found: ${analysis.fixes.length}`);
    analysis.fixes.forEach(fix => console.log(`   - ${fix}`));

    if (fix && !dryRun) {
      const wasFixed = fixFile(fullPath, false);
      if (wasFixed) {
        routesFixed++;
        console.log(`   ✅ Fixed`);
      }
    }
  } else {
    console.log(`✅ ${routePath} - Already secure`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 Summary:`);
console.log(`   Total routes analyzed: ${totalRoutes}`);
console.log(`   Routes needing fixes: ${routesWithIssues}`);
if (fix && !dryRun) {
  console.log(`   Routes fixed: ${routesFixed}`);
}
console.log(`${'='.repeat(60)}\n`);

if (dryRun && routesWithIssues > 0) {
  console.log('💡 Run with --fix to apply changes');
}
