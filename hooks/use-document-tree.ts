import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DocumentNode, FolderType } from '@/components/editor/document-tree'

interface UseDocumentTreeOptions {
  projectId: string
  enabled?: boolean
}

interface UseDocumentTreeReturn {
  nodes: DocumentNode[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  createDocument: (parentId?: string, title?: string) => Promise<void>
  createFolder: (parentId?: string, title?: string, folderType?: FolderType) => Promise<void>
  deleteNode: (id: string) => Promise<void>
  renameNode: (id: string, newTitle: string) => Promise<void>
  moveNode: (nodeId: string, newParentId: string | null, newPosition: number) => Promise<void>
}

export function useDocumentTree({
  projectId,
  enabled = true,
}: UseDocumentTreeOptions): UseDocumentTreeReturn {
  const [nodes, setNodes] = useState<DocumentNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchDocuments = useCallback(async () => {
    if (!enabled || !projectId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('id, title, type, is_folder, folder_type, word_count, status, position, parent_folder_id')
        .eq('project_id', projectId)
        .order('position', { ascending: true })

      if (fetchError) throw fetchError

      const documentNodes: DocumentNode[] = (data || []).map((doc) => ({
        id: doc.id,
        title: doc.title,
        isFolder: doc.is_folder || false,
        folderType: doc.folder_type as FolderType | undefined,
        documentType: doc.type as DocumentNode['documentType'],
        wordCount: doc.word_count || 0,
        status: doc.status as DocumentNode['status'],
        position: doc.position || 0,
        parentFolderId: doc.parent_folder_id,
      }))

      setNodes(documentNodes)
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch documents'))
    } finally {
      setIsLoading(false)
    }
  }, [projectId, enabled, supabase])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const createDocument = useCallback(
    async (parentId?: string, title?: string) => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error('Not authenticated')

        // Get max position for siblings
        const { data: siblings } = await supabase
          .from('documents')
          .select('position')
          .eq('project_id', projectId)
          .eq('parent_folder_id', parentId || null)
          .order('position', { ascending: false })
          .limit(1)

        const maxPosition = siblings?.[0]?.position ?? -1

        const { error: createError } = await supabase.from('documents').insert({
          user_id: userData.user.id,
          project_id: projectId,
          parent_folder_id: parentId || null,
          title: title || 'Untitled Document',
          type: 'novel', // Default type
          is_folder: false,
          position: maxPosition + 1,
          content: { html: '', structure: [] },
          word_count: 0,
        })

        if (createError) throw createError

        await fetchDocuments()
      } catch (err) {
        console.error('Error creating document:', err)
        throw err
      }
    },
    [projectId, supabase, fetchDocuments]
  )

  const createFolder = useCallback(
    async (parentId?: string, title?: string, folderType: FolderType = 'custom') => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) throw new Error('Not authenticated')

        // Get max position for siblings
        const { data: siblings } = await supabase
          .from('documents')
          .select('position')
          .eq('project_id', projectId)
          .eq('parent_folder_id', parentId || null)
          .order('position', { ascending: false })
          .limit(1)

        const maxPosition = siblings?.[0]?.position ?? -1

        const { error: createError } = await supabase.from('documents').insert({
          user_id: userData.user.id,
          project_id: projectId,
          parent_folder_id: parentId || null,
          title: title || 'New Folder',
          type: 'novel', // Required field even for folders
          is_folder: true,
          folder_type: folderType,
          position: maxPosition + 1,
          word_count: 0,
        })

        if (createError) throw createError

        await fetchDocuments()
      } catch (err) {
        console.error('Error creating folder:', err)
        throw err
      }
    },
    [projectId, supabase, fetchDocuments]
  )

  const deleteNode = useCallback(
    async (id: string) => {
      try {
        const { error: deleteError } = await supabase
          .from('documents')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError

        await fetchDocuments()
      } catch (err) {
        console.error('Error deleting node:', err)
        throw err
      }
    },
    [supabase, fetchDocuments]
  )

  const renameNode = useCallback(
    async (id: string, newTitle: string) => {
      try {
        const { error: updateError } = await supabase
          .from('documents')
          .update({ title: newTitle })
          .eq('id', id)

        if (updateError) throw updateError

        // Optimistic update
        setNodes((prev) =>
          prev.map((node) => (node.id === id ? { ...node, title: newTitle } : node))
        )
      } catch (err) {
        console.error('Error renaming node:', err)
        await fetchDocuments() // Revert on error
        throw err
      }
    },
    [supabase, fetchDocuments]
  )

  const moveNode = useCallback(
    async (nodeId: string, newParentId: string | null, newPosition: number) => {
      try {
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            parent_folder_id: newParentId,
            position: newPosition,
          })
          .eq('id', nodeId)

        if (updateError) throw updateError

        await fetchDocuments()
      } catch (err) {
        console.error('Error moving node:', err)
        throw err
      }
    },
    [supabase, fetchDocuments]
  )

  return {
    nodes,
    isLoading,
    error,
    refetch: fetchDocuments,
    createDocument,
    createFolder,
    deleteNode: deleteNode,
    renameNode,
    moveNode,
  }
}
