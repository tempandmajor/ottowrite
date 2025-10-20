#!/usr/bin/env tsx

/**
 * Migration Manager
 *
 * Comprehensive CLI tool for managing database migrations and rollbacks.
 * Provides safe migration operations with validation, dependencies, and snapshots.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============================================================================
// Types
// ============================================================================

interface Migration {
  migration_name: string
  migration_version: string
  applied_at: string
  has_rollback_sql: boolean
  can_rollback: boolean
  blocking_reason: string | null
}

interface RollbackResult {
  success: boolean
  message: string
  sql_executed: string | null
}

interface MigrationFile {
  filename: string
  version: string
  path: string
  content: string
  checksum: string
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate checksum of file content
 */
function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Read all migration files from directory
 */
function readMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`)
    return []
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  return files.map(filename => {
    const filePath = path.join(MIGRATIONS_DIR, filename)
    const content = fs.readFileSync(filePath, 'utf8')
    const version = filename.replace('.sql', '')

    return {
      filename,
      version,
      path: filePath,
      content,
      checksum: calculateChecksum(content),
    }
  })
}

/**
 * Extract rollback SQL from migration file
 */
function extractRollbackSQL(content: string): string | null {
  // Look for rollback section in comments
  const rollbackMatch = content.match(/--\s*ROLLBACK\s*START\s*\n([\s\S]*?)--\s*ROLLBACK\s*END/i)
  if (rollbackMatch) {
    return rollbackMatch[1].trim()
  }

  // Look for down migration section
  const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*?)(?:--\s*UP|\n\n)/i)
  if (downMatch) {
    return downMatch[1].trim()
  }

  return null
}

// ============================================================================
// Migration Commands
// ============================================================================

/**
 * List all rollbackable migrations
 */
async function listRollbackableMigrations(): Promise<void> {
  console.log('📋 Listing rollbackable migrations...\n')

  const { data, error } = await supabase.rpc('list_rollbackable_migrations')

  if (error) {
    console.error('❌ Error fetching migrations:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('No applied migrations found')
    return
  }

  const migrations = data as Migration[]

  console.log('Applied Migrations:\n')
  console.log('─'.repeat(120))
  console.log(
    sprintf(
      '%-50s %-12s %-20s %-12s %s',
      'Migration',
      'Can Rollback',
      'Applied At',
      'Has Rollback',
      'Blocking Reason'
    )
  )
  console.log('─'.repeat(120))

  migrations.forEach(m => {
    const canRollback = m.can_rollback ? '✅ Yes' : '❌ No'
    const hasRollback = m.has_rollback_sql ? '✅' : '❌'
    const appliedAt = new Date(m.applied_at).toLocaleString()
    const reason = m.blocking_reason || '-'

    console.log(
      sprintf(
        '%-50s %-12s %-20s %-12s %s',
        m.migration_name.substring(0, 47),
        canRollback,
        appliedAt,
        hasRollback,
        reason.substring(0, 40)
      )
    )
  })

  console.log('─'.repeat(120))
  console.log(`\nTotal: ${migrations.length} migrations`)
  console.log(`Rollbackable: ${migrations.filter(m => m.can_rollback).length}`)
}

/**
 * Check if a specific migration can be rolled back
 */
async function checkRollback(migrationName: string): Promise<void> {
  console.log(`🔍 Checking rollback status for: ${migrationName}\n`)

  const { data, error } = await supabase.rpc('can_rollback_migration', {
    p_migration_name: migrationName,
  })

  if (error) {
    console.error('❌ Error checking migration:', error.message)
    return
  }

  const result = data?.[0]

  if (!result) {
    console.error('❌ Migration not found')
    return
  }

  console.log('Status:', result.can_rollback ? '✅ Can rollback' : '❌ Cannot rollback')
  console.log('Reason:', result.reason)

  if (result.dependent_migrations && result.dependent_migrations.length > 0) {
    console.log('\nDependent migrations (must be rolled back first):')
    result.dependent_migrations.forEach((dep: string) => {
      console.log(`  - ${dep}`)
    })
  }
}

/**
 * Execute migration rollback
 */
async function rollbackMigration(migrationName: string, dryRun: boolean = false): Promise<void> {
  console.log(`${dryRun ? '🔍 DRY RUN:' : '⚠️'} Rolling back: ${migrationName}\n`)

  // First check if rollback is safe
  const { data: checkData } = await supabase.rpc('can_rollback_migration', {
    p_migration_name: migrationName,
  })

  const canRollback = checkData?.[0]

  if (!canRollback?.can_rollback) {
    console.error('❌ Cannot rollback migration')
    console.error('Reason:', canRollback?.reason || 'Unknown')
    return
  }

  if (!dryRun) {
    // Confirm with user
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const answer = await new Promise<string>(resolve => {
      readline.question(
        '⚠️  Are you sure you want to rollback this migration? (yes/no): ',
        (ans: string) => {
          readline.close()
          resolve(ans)
        }
      )
    })

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Rollback cancelled')
      return
    }
  }

  // Execute rollback
  const { data, error } = await supabase.rpc('execute_migration_rollback', {
    p_migration_name: migrationName,
    p_dry_run: dryRun,
  })

  if (error) {
    console.error('❌ Error executing rollback:', error.message)
    return
  }

  const result = data?.[0] as RollbackResult

  if (result.success) {
    console.log(`✅ ${result.message}\n`)
    if (result.sql_executed) {
      console.log('SQL executed:')
      console.log('─'.repeat(80))
      console.log(result.sql_executed)
      console.log('─'.repeat(80))
    }
  } else {
    console.error(`❌ ${result.message}`)
    if (result.sql_executed) {
      console.log('\nSQL that was attempted:')
      console.log('─'.repeat(80))
      console.log(result.sql_executed)
      console.log('─'.repeat(80))
    }
  }
}

/**
 * Register a migration in the tracking system
 */
async function registerMigration(migrationName: string): Promise<void> {
  console.log(`📝 Registering migration: ${migrationName}`)

  // Find migration file
  const migrations = readMigrationFiles()
  const migration = migrations.find(m => m.version === migrationName || m.filename === migrationName)

  if (!migration) {
    console.error('❌ Migration file not found')
    return
  }

  // Extract rollback SQL
  const rollbackSQL = extractRollbackSQL(migration.content)

  if (!rollbackSQL) {
    console.warn('⚠️  No rollback SQL found in migration file')
    console.warn('Add -- ROLLBACK START / -- ROLLBACK END comments to enable rollback')
  }

  // Insert into migration_history
  const { error } = await supabase.from('migration_history').insert({
    migration_name: migration.version,
    migration_version: migration.version,
    rollback_sql: rollbackSQL,
    checksum: migration.checksum,
    status: 'applied',
  })

  if (error) {
    console.error('❌ Error registering migration:', error.message)
    return
  }

  console.log('✅ Migration registered successfully')
  console.log(`   Rollback SQL: ${rollbackSQL ? '✅ Available' : '❌ Not available'}`)
}

/**
 * Generate rollback SQL template for a migration
 */
async function generateRollbackTemplate(migrationName: string): Promise<void> {
  console.log(`📝 Generating rollback template for: ${migrationName}\n`)

  const migrations = readMigrationFiles()
  const migration = migrations.find(m => m.version === migrationName || m.filename === migrationName)

  if (!migration) {
    console.error('❌ Migration file not found')
    return
  }

  // Analyze migration to suggest rollback SQL
  const content = migration.content.toLowerCase()

  let rollbackSQL = '-- ROLLBACK START\n\n'
  rollbackSQL += '-- TODO: Add SQL to undo this migration\n'
  rollbackSQL += '-- Common patterns:\n\n'

  if (content.includes('create table')) {
    rollbackSQL += "-- DROP TABLE IF EXISTS table_name CASCADE;\n"
  }

  if (content.includes('alter table') && content.includes('add column')) {
    rollbackSQL += "-- ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;\n"
  }

  if (content.includes('create index')) {
    rollbackSQL += "-- DROP INDEX IF EXISTS index_name;\n"
  }

  if (content.includes('create function')) {
    rollbackSQL += "-- DROP FUNCTION IF EXISTS function_name;\n"
  }

  rollbackSQL += '\n-- ROLLBACK END\n'

  console.log('Suggested rollback template:')
  console.log('─'.repeat(80))
  console.log(rollbackSQL)
  console.log('─'.repeat(80))
  console.log('\n💡 Add this to your migration file and adjust as needed')
}

/**
 * Sync migration files with database tracking
 */
async function syncMigrations(): Promise<void> {
  console.log('🔄 Syncing migration files with database...\n')

  const migrationFiles = readMigrationFiles()

  const { data: trackedMigrations, error } = await supabase
    .from('migration_history')
    .select('migration_name, checksum, status')

  if (error) {
    console.error('❌ Error fetching tracked migrations:', error.message)
    return
  }

  const tracked = new Set((trackedMigrations || []).map(m => m.migration_name))

  let registered = 0
  let skipped = 0

  for (const migration of migrationFiles) {
    if (tracked.has(migration.version)) {
      skipped++
      continue
    }

    console.log(`📝 Registering: ${migration.filename}`)

    const rollbackSQL = extractRollbackSQL(migration.content)

    const { error: insertError } = await supabase.from('migration_history').insert({
      migration_name: migration.version,
      migration_version: migration.version,
      rollback_sql: rollbackSQL,
      checksum: migration.checksum,
      status: 'applied',
    })

    if (insertError) {
      console.error(`   ❌ Error: ${insertError.message}`)
    } else {
      registered++
      console.log(`   ✅ Registered (Rollback: ${rollbackSQL ? 'Yes' : 'No'})`)
    }
  }

  console.log(`\n✅ Sync complete: ${registered} registered, ${skipped} skipped`)
}

// ============================================================================
// CLI
// ============================================================================

/**
 * Simple sprintf implementation for formatting
 */
function sprintf(format: string, ...args: any[]): string {
  let i = 0
  return format.replace(/%(-)?(\d+)?s/g, (match, leftAlign, width) => {
    const value = String(args[i++] || '')
    const w = parseInt(width || '0')
    if (w > 0) {
      if (leftAlign) {
        return value.padEnd(w)
      }
      return value.padStart(w)
    }
    return value
  })
}

async function main() {
  const command = process.argv[2]
  const arg = process.argv[3]
  const flag = process.argv[4]

  console.log('🔧 OttoWrite Migration Manager\n')

  switch (command) {
    case 'list':
      await listRollbackableMigrations()
      break

    case 'check':
      if (!arg) {
        console.error('❌ Usage: tsx migration-manager.ts check <migration-name>')
        process.exit(1)
      }
      await checkRollback(arg)
      break

    case 'rollback':
      if (!arg) {
        console.error('❌ Usage: tsx migration-manager.ts rollback <migration-name> [--dry-run]')
        process.exit(1)
      }
      await rollbackMigration(arg, flag === '--dry-run')
      break

    case 'register':
      if (!arg) {
        console.error('❌ Usage: tsx migration-manager.ts register <migration-name>')
        process.exit(1)
      }
      await registerMigration(arg)
      break

    case 'template':
      if (!arg) {
        console.error('❌ Usage: tsx migration-manager.ts template <migration-name>')
        process.exit(1)
      }
      await generateRollbackTemplate(arg)
      break

    case 'sync':
      await syncMigrations()
      break

    default:
      console.log('Usage: tsx migration-manager.ts <command> [arguments]')
      console.log('\nCommands:')
      console.log('  list                          List all rollbackable migrations')
      console.log('  check <migration-name>        Check if migration can be rolled back')
      console.log('  rollback <migration-name>     Execute migration rollback')
      console.log('  rollback <migration-name> --dry-run  Preview rollback without executing')
      console.log('  register <migration-name>     Register migration in tracking system')
      console.log('  template <migration-name>     Generate rollback SQL template')
      console.log('  sync                          Sync migration files with database')
      console.log('\nExamples:')
      console.log('  tsx migration-manager.ts list')
      console.log('  tsx migration-manager.ts check 20250120_migration_rollback_system')
      console.log('  tsx migration-manager.ts rollback 20250120_migration_rollback_system --dry-run')
      console.log('  tsx migration-manager.ts sync')
      process.exit(1)
  }
}

main().catch(console.error)
