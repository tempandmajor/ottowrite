/**
 * Scene Anchor Backfill Script
 *
 * Run with:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx docs/scripts/backfill-scene-anchors.ts --apply
 *
 * Defaults to dry-run mode (no writes). Use `--apply` to persist updates.
 */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

interface SceneMetadata {
  id: string
  title?: string
}

interface ChapterMetadata {
  id: string
  title?: string
  scenes?: SceneMetadata[]
}

interface DocumentRecord {
  id: string
  title: string
  type: string
  content: {
    html?: string
    structure?: ChapterMetadata[]
    [key: string]: any
  }
}

const sceneAnchorRegex = /<span\s+data-scene-anchor="true"\s+data-scene-id="([^"]+)"><\/span>/g

const PAGE_SIZE = Number(process.env.BACKFILL_PAGE_SIZE ?? 200)
const DRY_RUN = !process.argv.includes('--apply')
const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'scripts')

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function collectAnchors(html: string): Set<string> {
  const ids = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = sceneAnchorRegex.exec(html)) !== null) {
    ids.add(match[1])
  }
  return ids
}

function findInsertPosition(html: string, sceneTitle?: string): number | null {
  if (!sceneTitle || !sceneTitle.trim()) return null
  const lowered = sceneTitle.trim().toLowerCase()
  const stripTags = (value: string) => value.replace(/<[^>]+>/g, '').toLowerCase()

  const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(html)) !== null) {
    if (stripTags(match[1] ?? '').includes(lowered)) {
      return match.index
    }
  }

  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi
  while ((match = paragraphRegex.exec(html)) !== null) {
    if (stripTags(match[1] ?? '').includes(lowered)) {
      return match.index
    }
  }

  return null
}

function injectAnchor(html: string, sceneId: string, insertionIndex: number | null): string {
  const anchorMarkup = `<span data-scene-anchor="true" data-scene-id="${sceneId}"></span>`
  if (insertionIndex === null || insertionIndex < 0 || insertionIndex > html.length) {
    return anchorMarkup + html
  }
  return html.slice(0, insertionIndex) + anchorMarkup + html.slice(insertionIndex)
}

async function fetchDocuments(client: ReturnType<typeof createClient> | any, from: number, to: number) {
  const { data, error } = await client
    .from('documents')
    .select('id, title, type, content')
    .neq('type', 'screenplay')
    .neq('type', 'play')
    .not('content->structure', 'is', null)
    .range(from, to)

  if (error) throw error
  return data as DocumentRecord[]
}

async function updateDocument(
  client: ReturnType<typeof createClient> | any,
  documentId: string,
  updatedHtml: string,
  originalContent: DocumentRecord['content']
) {
  const newContent = {
    ...originalContent,
    html: updatedHtml,
  }

  const { error } = await (client as any)
    .from('documents')
    .update({ content: newContent, updated_at: new Date().toISOString() })
    .eq('id', documentId)

  if (error) throw error
}

async function main() {
  const supabaseUrl = assertEnv('SUPABASE_URL', process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = assertEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  let page = 0
  let processed = 0
  let updated = 0
  const updateLog: Array<{ id: string; title: string; insertedAnchors: string[] }> = []

  while (true) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const documents = await fetchDocuments(supabase, from, to)

    if (!documents.length) break
    page += 1

    for (const doc of documents) {
      processed += 1
      const structure = doc.content?.structure
      const html = doc.content?.html

      if (!html || !Array.isArray(structure) || structure.length === 0) {
        continue
      }

      const existingAnchors = collectAnchors(html)
      let updatedHtml = html
      const insertedAnchors: string[] = []

      for (const chapter of structure) {
        for (const scene of chapter.scenes ?? []) {
          if (!scene?.id || existingAnchors.has(scene.id)) continue

          const insertionPoint = findInsertPosition(updatedHtml, scene.title)
          updatedHtml = injectAnchor(updatedHtml, scene.id, insertionPoint)
          existingAnchors.add(scene.id)
          insertedAnchors.push(scene.id)
        }
      }

      if (insertedAnchors.length === 0 || updatedHtml === html) {
        continue
      }

      if (!DRY_RUN) {
        await updateDocument(supabase, doc.id, updatedHtml, doc.content)
      }

      updateLog.push({ id: doc.id, title: doc.title, insertedAnchors })
      updated += 1
    }
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const outputPath = path.join(
    OUTPUT_DIR,
    `backfill-scene-anchors-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  )
  fs.writeFileSync(outputPath, JSON.stringify({ DRY_RUN, processed, updated, updateLog }, null, 2))

  console.log(`Processed ${processed} documents; ${updated} ${DRY_RUN ? 'would be' : 'were'} updated.`)
  console.log(`Report written to ${outputPath}`)
  console.log(DRY_RUN ? 'Dry run complete. Re-run with --apply to persist changes.' : 'Updates applied successfully.')
}

main().catch((error) => {
  console.error('Backfill script failed:', error)
  process.exit(1)
})
