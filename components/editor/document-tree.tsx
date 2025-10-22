'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  Copy,
  Film,
  Theater,
  BookOpen,
  Microscope,
  Users,
  Trash,
  StickyNote,
  FolderPlus,
  GripVertical,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/telemetry/track'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType = 'novel' | 'screenplay' | 'play' | 'short_story'
export type FolderType = 'manuscript' | 'research' | 'characters' | 'deleted' | 'notes' | 'custom'

export interface DocumentNode {
  id: string
  title: string
  isFolder: boolean
  folderType?: FolderType
  documentType?: DocumentType
  wordCount?: number
  position: number
  parentFolderId?: string | null
  children?: DocumentNode[]
}

export interface DocumentTreeProps {
  projectId: string
  nodes: DocumentNode[]
  activeDocumentId?: string
  onSelectDocument: (documentId: string) => void
  onCreateDocument: (parentId?: string, title?: string) => Promise<void>
  onCreateFolder: (parentId?: string, title?: string, folderType?: FolderType) => Promise<void>
  onDeleteNode: (id: string) => Promise<void>
  onRename: (id: string, newTitle: string) => Promise<void>
  onMove: (nodeId: string, newParentId: string | null, newPosition: number) => Promise<void>
  isLoading?: boolean
}

// ============================================================================
// ICON MAPPINGS
// ============================================================================

const FOLDER_ICONS: Record<FolderType, typeof Folder> = {
  manuscript: BookOpen,
  research: Microscope,
  characters: Users,
  deleted: Trash,
  notes: StickyNote,
  custom: Folder,
}

const FOLDER_COLORS: Record<FolderType, string> = {
  manuscript: 'text-blue-600 dark:text-blue-400',
  research: 'text-purple-600 dark:text-purple-400',
  characters: 'text-green-600 dark:text-green-400',
  deleted: 'text-muted-foreground',
  notes: 'text-yellow-600 dark:text-yellow-400',
  custom: 'text-foreground',
}

const DOCUMENT_ICONS: Record<DocumentType, typeof FileText> = {
  novel: BookOpen,
  screenplay: Film,
  play: Theater,
  short_story: FileText,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildTree(nodes: DocumentNode[]): DocumentNode[] {
  const nodeMap = new Map<string, DocumentNode>()
  const rootNodes: DocumentNode[] = []

  // First pass: create map of all nodes with children arrays
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] })
  })

  // Second pass: build parent-child relationships
  nodes.forEach((node) => {
    const nodeWithChildren = nodeMap.get(node.id)!
    if (!node.parentFolderId) {
      rootNodes.push(nodeWithChildren)
    } else {
      const parent = nodeMap.get(node.parentFolderId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(nodeWithChildren)
      } else {
        // Parent not found, treat as root
        rootNodes.push(nodeWithChildren)
      }
    }
  })

  // Sort by position
  const sortByPosition = (a: DocumentNode, b: DocumentNode) => a.position - b.position
  rootNodes.sort(sortByPosition)
  nodeMap.forEach((node) => {
    if (node.children) {
      node.children.sort(sortByPosition)
    }
  })

  return rootNodes
}

function filterTree(nodes: DocumentNode[], searchQuery: string): DocumentNode[] {
  if (!searchQuery.trim()) return nodes

  const query = searchQuery.toLowerCase()

  const matchesSearch = (node: DocumentNode): boolean => {
    return node.title.toLowerCase().includes(query)
  }

  const filterNode = (node: DocumentNode): DocumentNode | null => {
    const matches = matchesSearch(node)
    const filteredChildren = (node.children || [])
      .map(filterNode)
      .filter((child): child is DocumentNode => child !== null)

    if (matches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      }
    }

    return null
  }

  return nodes
    .map(filterNode)
    .filter((node): node is DocumentNode => node !== null)
}

// ============================================================================
// SORTABLE TREE NODE COMPONENT (DnD Wrapper)
// ============================================================================

interface SortableTreeNodeProps {
  node: DocumentNode
  level: number
  activeDocumentId?: string
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onDelete: (id: string) => void
  onCreateDocument: (parentId: string) => void
  onCreateFolder: (parentId: string) => void
}

function SortableTreeNode(props: SortableTreeNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TreeNode {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

interface TreeNodeProps {
  node: DocumentNode
  level: number
  activeDocumentId?: string
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  onDelete: (id: string) => void
  onCreateDocument: (parentId: string) => void
  onCreateFolder: (parentId: string) => void
  dragHandleProps?: any
}

function TreeNode({
  node,
  level,
  activeDocumentId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onRename,
  onDelete,
  onCreateDocument,
  onCreateFolder,
  dragHandleProps,
}: TreeNodeProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(node.title)

  const isExpanded = expandedIds.has(node.id)
  const isActive = activeDocumentId === node.id && !node.isFolder
  const hasChildren = node.children && node.children.length > 0

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== node.title) {
      onRename(node.id, renameValue.trim())
    }
    setIsRenaming(false)
  }

  const handleRenameCancel = () => {
    setRenameValue(node.title)
    setIsRenaming(false)
  }

  const Icon = node.isFolder
    ? FOLDER_ICONS[node.folderType || 'custom']
    : DOCUMENT_ICONS[node.documentType || 'novel']

  const iconColor = node.isFolder
    ? FOLDER_COLORS[node.folderType || 'custom']
    : 'text-muted-foreground'

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent',
          isActive && 'bg-accent font-medium',
          level > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Expand/Collapse Icon */}
        {node.isFolder && (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            className="flex h-4 w-4 shrink-0 items-center justify-center hover:bg-accent-foreground/10 rounded"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}

        {!node.isFolder && <div className="w-4" />}

        {/* Drag Handle */}
        <button
          type="button"
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* Icon */}
        <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />

        {/* Title or Rename Input */}
        {isRenaming ? (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') handleRenameCancel()
            }}
            className="h-6 flex-1 text-sm"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (node.isFolder) {
                onToggleExpand(node.id)
              } else {
                onSelect(node.id)
              }
            }}
            className="flex-1 truncate text-left"
            title={node.title}
          >
            {node.title}
          </button>
        )}

        {/* Word Count Badge */}
        {!node.isFolder && node.wordCount !== undefined && node.wordCount > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {node.wordCount >= 1000
              ? `${(node.wordCount / 1000).toFixed(1)}k`
              : node.wordCount}
          </span>
        )}

        {/* Context Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {node.isFolder && (
              <>
                <DropdownMenuItem onClick={() => onCreateDocument(node.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateFolder(node.id)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            {!node.isFolder && (
              <DropdownMenuItem onClick={() => {}}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(node.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {node.isFolder && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <SortableTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              activeDocumentId={activeDocumentId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onCreateDocument={onCreateDocument}
              onCreateFolder={onCreateFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentTree({
  projectId,
  nodes,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onCreateFolder,
  onDeleteNode,
  onRename,
  onMove,
  isLoading = false,
}: DocumentTreeProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`document-tree-expanded-${projectId}`)
      if (stored) {
        try {
          return new Set(JSON.parse(stored))
        } catch {
          return new Set()
        }
      }
    }
    return new Set()
  })

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px drag distance before activating
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Build tree structure
  const tree = useMemo(() => buildTree(nodes), [nodes])

  // Filter tree based on search
  const filteredTree = useMemo(
    () => filterTree(tree, searchQuery),
    [tree, searchQuery]
  )

  // Auto-expand folders when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allFolderIds = nodes.filter((n) => n.isFolder).map((n) => n.id)
      setExpandedIds(new Set(allFolderIds))
    }
  }, [searchQuery, nodes])

  // Persist expanded state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `document-tree-expanded-${projectId}`,
        JSON.stringify(Array.from(expandedIds))
      )
    }
  }, [expandedIds, projectId])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelect = useCallback(
    (id: string) => {
      onSelectDocument(id)
      trackEvent('editor.binder.document_select', { documentId: id, projectId })
    },
    [onSelectDocument, projectId]
  )

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      await onRename(id, newTitle)
      trackEvent('editor.binder.node_rename', { nodeId: id, projectId })
    },
    [onRename, projectId]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        await onDeleteNode(id)
        trackEvent('editor.binder.node_delete', { nodeId: id, projectId })
      }
    },
    [onDeleteNode, projectId]
  )

  const handleCreateDocument = useCallback(
    async (parentId?: string) => {
      await onCreateDocument(parentId)
      trackEvent('editor.binder.document_create', { parentId, projectId })
    },
    [onCreateDocument, projectId]
  )

  const handleCreateFolder = useCallback(
    async (parentId?: string) => {
      await onCreateFolder(parentId)
      trackEvent('editor.binder.folder_create', { parentId, projectId })
    },
    [onCreateFolder, projectId]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over || active.id === over.id) {
        return
      }

      const activeNode = nodes.find((n) => n.id === active.id)
      const overNode = nodes.find((n) => n.id === over.id)

      if (!activeNode || !overNode) {
        return
      }

      // Determine new parent and position
      let newParentId: string | null = null
      let newPosition = 0

      // If dropping on a folder, move inside it
      if (overNode.isFolder) {
        newParentId = overNode.id
        // Get children of the folder to determine position
        const folderChildren = nodes.filter((n) => n.parentFolderId === overNode.id)
        newPosition = folderChildren.length // Add to end
      } else {
        // Dropping on a document - place after it at same level
        newParentId = overNode.parentFolderId || null
        const siblings = nodes.filter((n) => (n.parentFolderId || null) === newParentId)
        const overIndex = siblings.findIndex((n) => n.id === over.id)
        newPosition = overIndex + 1
      }

      // Call the move handler
      await onMove(active.id as string, newParentId, newPosition)
      trackEvent('editor.binder.node_move', {
        nodeId: active.id,
        newParentId,
        newPosition,
        projectId,
      })
    },
    [nodes, onMove, projectId]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // Get the node being dragged for overlay
  const activeNode = activeId ? nodes.find((n) => n.id === activeId) : null

  // Flatten tree to get all IDs for sortable
  const allIds = useMemo(() => nodes.map((n) => n.id), [nodes])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Binder</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">New</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCreateDocument()}>
                  <FileText className="mr-2 h-4 w-4" />
                  New Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateFolder()}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Tree */}
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Folder className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  {searchQuery.trim() ? 'No documents found' : 'No documents yet'}
                </p>
                {!searchQuery.trim() && (
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    Create your first document or folder to get started
                  </p>
                )}
              </div>
            ) : (
              filteredTree.map((node) => (
                <SortableTreeNode
                  key={node.id}
                  node={node}
                  level={0}
                  activeDocumentId={activeDocumentId}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  onSelect={handleSelect}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onCreateDocument={handleCreateDocument}
                  onCreateFolder={handleCreateFolder}
                />
              ))
            )}
          </div>
        </SortableContext>

        {/* Footer Stats */}
        <div className="border-t p-3 text-xs text-muted-foreground">
          {nodes.filter((n) => !n.isFolder).length} document
          {nodes.filter((n) => !n.isFolder).length !== 1 ? 's' : ''} •{' '}
          {nodes.filter((n) => n.isFolder).length} folder
          {nodes.filter((n) => n.isFolder).length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeNode ? (
          <div className="flex items-center gap-2 rounded-md bg-accent/90 px-3 py-2 text-sm shadow-lg border">
            {activeNode.isFolder ? (
              <>
                {(() => {
                  const Icon = FOLDER_ICONS[activeNode.folderType || 'custom']
                  const color = FOLDER_COLORS[activeNode.folderType || 'custom']
                  return <Icon className={cn('h-4 w-4', color)} />
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const Icon = DOCUMENT_ICONS[activeNode.documentType || 'novel']
                  return <Icon className="h-4 w-4 text-muted-foreground" />
                })()}
              </>
            )}
            <span className="font-medium">{activeNode.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
