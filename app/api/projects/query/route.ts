import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { logger } from '@/lib/monitoring/structured-logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }

    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('q')?.trim() ?? ''
    const type = searchParams.get('type')?.trim() ?? ''
    const folderParam = searchParams.get('folder')?.trim() ?? ''
    const folderFilter = folderParam === '__none' ? '__none' : folderParam
    const tagIdsParam = searchParams.get('tags')?.trim() ?? ''
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '20', 10)
    const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10)

    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
    const offset = (page - 1) * limit

    const tagIds = tagIdsParam
      ? tagIdsParam
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : []

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

    if (searchTerm.length > 2) {
      query = query.textSearch('search_vector', searchTerm, {
        type: 'websearch',
        config: 'english',
      })
    } else if (searchTerm.length > 0) {
      query = query.ilike('name', `%${searchTerm}%`)
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
    return errorResponses.internalError('Failed to query projects', { details: error })
  }
}
