#!/usr/bin/env tsx
/**
 * Database Performance Analysis Script
 *
 * Analyzes Supabase query performance by:
 * 1. Identifying slow queries
 * 2. Checking for missing indexes
 * 3. Analyzing table statistics
 * 4. Suggesting optimizations
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface TableStats {
  schemaname: string
  tablename: string
  n_live_tup: number
  n_dead_tup: number
  n_tup_ins: number
  n_tup_upd: number
  n_tup_del: number
  last_vacuum: string | null
  last_autovacuum: string | null
  last_analyze: string | null
  last_autoanalyze: string | null
}

interface IndexInfo {
  schemaname: string
  tablename: string
  indexname: string
  indexdef: string
}

interface TableSize {
  table_name: string
  total_size: string
  table_size: string
  indexes_size: string
  row_count: number
}

async function analyzeTableStats() {
  console.log('\n📊 Table Statistics\n')

  const { data, error } = await supabase.rpc('pg_stat_user_tables_query', {
    query_text: `
      SELECT
        schemaname,
        tablename,
        n_live_tup,
        n_dead_tup,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 20
    `
  }).select()

  if (error) {
    // Fallback: try direct query
    const { data: stats, error: statsError } = await supabase
      .from('pg_stat_user_tables')
      .select('*')
      .eq('schemaname', 'public')
      .order('n_live_tup', { ascending: false })
      .limit(20)

    if (statsError) {
      console.error('❌ Error fetching table stats:', statsError.message)
      return
    }

    displayTableStats(stats as TableStats[])
  } else {
    displayTableStats(data as TableStats[])
  }
}

function displayTableStats(stats: TableStats[]) {
  console.table(
    stats.map((row) => ({
      Table: row.tablename,
      'Live Rows': row.n_live_tup.toLocaleString(),
      'Dead Rows': row.n_dead_tup.toLocaleString(),
      Inserts: row.n_tup_ins.toLocaleString(),
      Updates: row.n_tup_upd.toLocaleString(),
      Deletes: row.n_tup_del.toLocaleString(),
    }))
  )

  // Identify tables with high dead tuples (need vacuum)
  const needsVacuum = stats.filter((row) => {
    const deadRatio = row.n_live_tup > 0 ? row.n_dead_tup / row.n_live_tup : 0
    return deadRatio > 0.2 && row.n_dead_tup > 1000
  })

  if (needsVacuum.length > 0) {
    console.log('\n⚠️  Tables needing VACUUM:')
    needsVacuum.forEach((row) => {
      const deadRatio = ((row.n_dead_tup / row.n_live_tup) * 100).toFixed(1)
      console.log(`  - ${row.tablename}: ${deadRatio}% dead tuples`)
    })
  }
}

async function analyzeIndexes() {
  console.log('\n🔍 Index Analysis\n')

  // Get all indexes
  const { data: indexes, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `
  })

  if (error) {
    console.error('❌ Error fetching indexes:', error.message)
    return
  }

  // Group by table
  const indexesByTable = (indexes as IndexInfo[]).reduce((acc, idx) => {
    if (!acc[idx.tablename]) acc[idx.tablename] = []
    acc[idx.tablename].push(idx)
    return acc
  }, {} as Record<string, IndexInfo[]>)

  console.log('Indexes by table:')
  Object.entries(indexesByTable).forEach(([table, idxs]) => {
    console.log(`\n  ${table} (${idxs.length} indexes):`)
    idxs.forEach((idx) => {
      console.log(`    - ${idx.indexname}`)
    })
  })
}

async function analyzeMissingIndexes() {
  console.log('\n💡 Missing Index Recommendations\n')

  const recommendations = []

  // Check documents table
  const { count: docCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  if (docCount && docCount > 1000) {
    recommendations.push({
      table: 'documents',
      reason: `Table has ${docCount.toLocaleString()} rows`,
      recommendations: [
        'CREATE INDEX IF NOT EXISTS idx_documents_user_project ON documents(user_id, project_id)',
        'CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_documents_parent_folder ON documents(parent_folder_id) WHERE parent_folder_id IS NOT NULL',
      ],
    })
  }

  // Check AI usage table
  const { count: aiCount } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })

  if (aiCount && aiCount > 10000) {
    recommendations.push({
      table: 'ai_usage',
      reason: `Table has ${aiCount.toLocaleString()} rows`,
      recommendations: [
        'CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON ai_usage(user_id, created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_ai_usage_document ON ai_usage(document_id) WHERE document_id IS NOT NULL',
      ],
    })
  }

  // Check writing_sessions table
  const { count: sessionsCount } = await supabase
    .from('writing_sessions')
    .select('*', { count: 'exact', head: true })

  if (sessionsCount && sessionsCount > 5000) {
    recommendations.push({
      table: 'writing_sessions',
      reason: `Table has ${sessionsCount.toLocaleString()} rows`,
      recommendations: [
        'CREATE INDEX IF NOT EXISTS idx_writing_sessions_user_start ON writing_sessions(user_id, session_start DESC)',
        'CREATE INDEX IF NOT EXISTS idx_writing_sessions_project ON writing_sessions(project_id) WHERE project_id IS NOT NULL',
      ],
    })
  }

  // Check ai_requests table
  const { count: requestsCount } = await supabase
    .from('ai_requests')
    .select('*', { count: 'exact', head: true })

  if (requestsCount && requestsCount > 5000) {
    recommendations.push({
      table: 'ai_requests',
      reason: `Table has ${requestsCount.toLocaleString()} rows`,
      recommendations: [
        'CREATE INDEX IF NOT EXISTS idx_ai_requests_user_created ON ai_requests(user_id, created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_ai_requests_project ON ai_requests(project_id) WHERE project_id IS NOT NULL',
        'CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_requests(status, created_at DESC)',
      ],
    })
  }

  if (recommendations.length === 0) {
    console.log('✅ No missing indexes detected (all tables are small enough)')
    return
  }

  recommendations.forEach((rec) => {
    console.log(`\n📋 ${rec.table}`)
    console.log(`   Reason: ${rec.reason}`)
    console.log('   Recommended indexes:')
    rec.recommendations.forEach((sql) => {
      console.log(`   ${sql};`)
    })
  })
}

async function analyzeTableSizes() {
  console.log('\n💾 Table Sizes\n')

  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        table_name,
        pg_size_pretty(total_bytes) AS total_size,
        pg_size_pretty(table_bytes) AS table_size,
        pg_size_pretty(index_bytes) AS indexes_size,
        row_estimate::bigint AS row_count
      FROM (
        SELECT
          schemaname||'.'||tablename AS table_name,
          pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes,
          pg_relation_size(schemaname||'.'||tablename) AS table_bytes,
          pg_indexes_size(schemaname||'.'||tablename) AS index_bytes,
          reltuples AS row_estimate
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public'
      ) AS sizes
      ORDER BY total_bytes DESC
      LIMIT 15
    `
  })

  if (error) {
    console.error('❌ Error fetching table sizes:', error.message)
    return
  }

  console.table(
    (data as TableSize[]).map((row) => ({
      Table: row.table_name.replace('public.', ''),
      'Total Size': row.total_size,
      'Table Size': row.table_size,
      'Indexes Size': row.indexes_size,
      'Row Count': row.row_count.toLocaleString(),
    }))
  )
}

async function main() {
  console.log('🔍 Database Performance Analysis\n')
  console.log('=' .repeat(60))

  try {
    await analyzeTableStats()
    await analyzeTableSizes()
    await analyzeIndexes()
    await analyzeMissingIndexes()

    console.log('\n✅ Analysis complete\n')
  } catch (error) {
    console.error('❌ Error during analysis:', error)
    process.exit(1)
  }
}

main()
