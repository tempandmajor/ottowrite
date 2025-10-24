/**
 * Script to fix API error handling across all routes
 *
 * This script automatically updates API routes to properly handle
 * NextResponse objects thrown by auth helpers.
 *
 * Usage: npx tsx scripts/fix-api-error-handling.ts
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

const API_DIR = path.join(process.cwd(), 'app/api')

interface FileEdit {
  file: string
  needsImportUpdate: boolean
  needsCatchUpdate: boolean
}

async function main() {
  console.log('🔍 Finding API routes that use auth helpers...\n')

  // Find all API route files
  const files = await glob('app/api/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts'],
  })

  const edits: FileEdit[] = []
  let skipped = 0

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')

    // Check if file uses auth helpers
    const usesAuthHelpers = /requireAuth|requireOwnership|requireAdmin|requireSubmissionAccess|requireDocumentOwnership|requireProjectOwnership/.test(
      content
    )

    if (!usesAuthHelpers) {
      skipped++
      continue
    }

    // Check if already has handleAuthError import
    const hasHandleAuthError = /handleAuthError/.test(content)

    // Check if has catch blocks
    const hasCatchBlock = /catch \(error\)/g.test(content)

    if (!hasCatchBlock) {
      skipped++
      continue
    }

    // Check if catch blocks already use handleAuthError
    const alreadyFixed = /const authError = handleAuthError\(error\)/.test(content)

    if (alreadyFixed) {
      skipped++
      continue
    }

    edits.push({
      file,
      needsImportUpdate: !hasHandleAuthError,
      needsCatchUpdate: true,
    })
  }

  console.log(`📊 Analysis complete:`)
  console.log(`   - Total API route files: ${files.length}`)
  console.log(`   - Files needing fixes: ${edits.length}`)
  console.log(`   - Files already fixed or skipped: ${skipped}\n`)

  if (edits.length === 0) {
    console.log('✅ All files are already fixed!')
    return
  }

  console.log('🔧 Applying fixes...\n')

  for (const edit of edits) {
    let content = fs.readFileSync(edit.file, 'utf-8')
    let modified = false

    // Update imports if needed
    if (edit.needsImportUpdate) {
      // Find the requireAuth import line and add handleAuthError
      const importRegex = /import\s+{([^}]+)}\s+from\s+['"]@\/lib\/api\/auth-helpers['"]/

      if (importRegex.test(content)) {
        content = content.replace(importRegex, (match, imports) => {
          // Check if handleAuthError is already in imports
          if (imports.includes('handleAuthError')) {
            return match
          }

          // Add handleAuthError to imports
          const updatedImports = imports.trim() + ', handleAuthError'
          return match.replace(imports, updatedImports)
        })
        modified = true
        console.log(`   ✓ Updated imports in ${edit.file}`)
      }
    }

    // Update catch blocks
    if (edit.needsCatchUpdate) {
      // Find catch blocks and add handleAuthError check
      const catchRegex = /} catch \(error\) {(\r?\n)([ \t]*)/g
      const matches = [...content.matchAll(catchRegex)]

      if (matches.length > 0) {
        // Process in reverse order to maintain string positions
        for (let i = matches.length - 1; i >= 0; i--) {
          const match = matches[i]
          const indent = match[3] || '    '
          const newline = match[1]

          const insertPos = match.index! + match[0].length
          const authErrorCheck = `${indent}const authError = handleAuthError(error)${newline}${indent}if (authError) return authError${newline}${newline}${indent}`

          content = content.slice(0, insertPos) + authErrorCheck + content.slice(insertPos)
        }

        modified = true
        console.log(`   ✓ Updated ${matches.length} catch block(s) in ${edit.file}`)
      }
    }

    if (modified) {
      fs.writeFileSync(edit.file, content, 'utf-8')
    }
  }

  console.log(`\n✅ Successfully updated ${edits.length} files!`)
  console.log('\n💡 Next steps:')
  console.log('   1. Review changes with: git diff')
  console.log('   2. Test the changes')
  console.log('   3. Commit with: git add -A && git commit -m "Apply handleAuthError to all API routes"')
}

main().catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
