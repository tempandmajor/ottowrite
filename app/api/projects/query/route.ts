import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse, errorResponse } from '@/lib/api/error-response'
import { requireAuth } from '@/lib/api/auth-helpers'
import { logger } from '@/lib/monitoring/structured-logger'
import { projectQuerySchema } from '@/lib/validation/schemas/projects'
import { detectSQLInjection } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const escapeForILike = (value: string) =>
  value.replace(/[\\%_]/g, (match) => `\\${match}`)

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const rawSearch = searchParams.get('search') ?? searchParams.get('q') ?? ''
    const rawFolder = searchParams.get('folderId') ?? searchParams.get('folder') ?? undefined
    const rawTagsEntries = searchParams.getAll('tags')
    const tagList = rawTagsEntries
      .flatMap((entry) => entry.split(','))
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    const rawType = searchParams.get('type') ?? undefined
    const rawGenre = searchParams.get('genre') ?? undefined
    const rawStatus = searchParams.get('status') ?? undefined
    const rawSortBy = searchParams.get('sortBy') ?? searchParams.get('sort') ?? undefined
    const rawSortOrder = searchParams.get('sortOrder') ?? searchParams.get('order') ?? undefined
    const rawLimit = searchParams.get('limit') ?? undefined
    const rawOffset = searchParams.get('offset') ?? undefined

    const validationResult = projectQuerySchema.safeParse({
      search: rawSearch || undefined,
      folderId: rawFolder && rawFolder !== '__none' ? rawFolder : undefined,
      tags: tagList.length > 0 ? tagList : undefined,
      type: rawType || undefined,
      genre: rawGenre || undefined,
      status: rawStatus || undefined,
      sortBy: rawSortBy || undefined,
      sortOrder: rawSortOrder || undefined,
      limit: rawLimit,
      offset: rawOffset,
    })

    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))

      logger.warn('Query validation failed', {
        operation: 'projects:query:validation',
        userId: user.id,
        issues,
      })

      return errorResponses.validationError('Invalid project query parameters', {
        userId: user.id,
        details: { issues },
      })
    }

    const validated = validationResult.data
    const {
      search: rawValidatedSearch,
      folderId,
      tags,
      type,
      limit,
      offset,
    } = validated
    const searchTerm = (rawValidatedSearch ?? '').trim()

    // Security: Detect SQL injection attempts in search term
    if (searchTerm && detectSQLInjection(searchTerm)) {
      logger.warn('SQL injection attempt detected in project search', {
        operation: 'projects:query:sql_injection',
        userId: user.id,
        searchTerm: searchTerm.substring(0, 100),
      })
      // Still allow the request but use parameterized query (Supabase handles this safely)
    }

    const folderFilter = rawFolder === '__none' ? '__none' : folderId
    const tagIds = tags ? Array.from(new Set(tags)) : []
    const page = Math.floor(offset / limit) + 1

    let filteredProjectIds: string[] | null = null

    if (tagIds.length > 0) {
      const { data: tagLinks, error: tagFilterError } = await supabase
        .from('project_tag_links')
        .select('project_id, tag_id')
        .eq('user_id', user.id)
        .in('tag_id', tagIds)

      if (tagFilterError) throw tagFilterError

      if (!tagLinks || tagLinks.length === 0) {
        const [{ data: availableFolders }, { data: availableTags }] = await Promise.all([
          supabase
            .from('project_folders')
            .select('id, name, color, parent_id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('project_tags')
            .select('id, name, color, description')
            .eq('user_id', user.id)
            .order('name', { ascending: true }),
        ])

        return successResponse({
          projects: [],
          pagination: {
            total: 0,
            page,
            limit,
          },
          availableFolders: availableFolders ?? [],
          availableTags: availableTags ?? [],
        })
      }

      const counts = new Map<string, number>()
      for (const link of tagLinks) {
        counts.set(link.project_id, (counts.get(link.project_id) ?? 0) + 1)
      }
      filteredProjectIds = Array.from(counts.entries())
        .filter(([, count]) => count >= tagIds.length)
        .map(([projectId]) => projectId)

      if (filteredProjectIds.length === 0) {
        return successResponse({
          projects: [],
          pagination: {
            total: 0,
            page,
            limit,
          },
          availableFolders: [],
          availableTags: [],
        })
      }
    }

    let query = supabase
      .from('projects')
      .select('id, name, type, genre, description, created_at, updated_at, folder_id', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (filteredProjectIds) {
      query = query.in('id', filteredProjectIds)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (folderFilter === '__none') {
      query = query.is('folder_id', null)
    } else if (folderFilter) {
      query = query.eq('folder_id', folderFilter)
    }

    if (searchTerm.length > 0) {
      const pattern = `%${escapeForILike(searchTerm)}%`
      query = query.ilike('name', pattern)
    }

    const { data: projectRows, error: projectError, count } = await query.range(offset, offset + limit - 1)

    if (projectError) throw projectError

    const projectIds = projectRows?.map((project) => project.id) ?? []

    let projectTags: Record<string, Array<{ id: string; name: string; color: string | null }>> = {}
    if (projectIds.length > 0) {
      const { data: tagRows, error: tagError } = await supabase
        .from('project_tag_links')
        .select(
          `project_id,
           project_tags:project_tags ( id, name, color )`
        )
        .eq('user_id', user.id)
        .in('project_id', projectIds)

      if (tagError) throw tagError

      projectTags = (tagRows ?? []).reduce<typeof projectTags>((acc, row) => {
        const tagField = row.project_tags
        const tag = Array.isArray(tagField) ? tagField[0] : tagField
        if (!tag) return acc
        if (!acc[row.project_id]) {
          acc[row.project_id] = []
        }
        acc[row.project_id].push({
          id: String(tag.id),
          name: typeof tag.name === 'string' ? tag.name : String(tag.name ?? ''),
          color: tag.color ?? null,
        })
        return acc
      }, {})
    }

    const folderIds = Array.from(
      new Set(projectRows?.map((project) => project.folder_id).filter(Boolean) as string[])
    )

    let foldersById: Record<string, { id: string; name: string; color: string | null; parent_id: string | null }> = {}
    if (folderIds.length > 0) {
      const { data: folderRows, error: folderError } = await supabase
        .from('project_folders')
        .select('id, name, color, parent_id')
        .eq('user_id', user.id)
        .in('id', folderIds)

      if (folderError) throw folderError

      foldersById = (folderRows ?? []).reduce<typeof foldersById>((acc, folder) => {
        acc[folder.id] = {
          id: folder.id,
          name: folder.name,
          color: folder.color ?? null,
          parent_id: folder.parent_id ?? null,
        }
        return acc
      }, {})
    }

    const { data: availableFolders, error: availableFoldersError } = await supabase
      .from('project_folders')
      .select('id, name, color, parent_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (availableFoldersError) throw availableFoldersError

    const { data: availableTags, error: availableTagsError } = await supabase
      .from('project_tags')
      .select('id, name, color, description')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (availableTagsError) throw availableTagsError

    const projects = (projectRows ?? []).map((project) => ({
      ...project,
      tags: projectTags[project.id] ?? [],
      folder: project.folder_id ? foldersById[project.folder_id] ?? null : null,
    }))

    return successResponse({
      projects,
      pagination: {
        total: count ?? 0,
        page,
        limit,
      },
      availableFolders: availableFolders ?? [],
      availableTags: availableTags ?? [],
    })
  } catch (error) {
    logger.error('Project query failed', {
      operation: 'projects:query',
    }, error instanceof Error ? error : undefined)
    return errorResponse('Failed to query projects', { status: 500, details: error })
  }
}
