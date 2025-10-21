/**
 * Branch Manager Component
 * Provides Git-like branching UI for documents
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  GitBranch,
  Plus,
  Check,
  GitMerge,
  Trash2,
  History,
  ChevronDown,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { BranchMergeConflictResolver } from './branch-merge-conflict-resolver'

export type Branch = {
  id: string
  document_id: string
  user_id: string
  branch_name: string
  parent_branch_id: string | null
  base_commit_id: string | null
  content: any
  word_count: number
  is_main: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BranchCommit = {
  id: string
  branch_id: string
  parent_commit_id: string | null
  user_id: string
  message: string
  content: any
  word_count: number
  created_at: string
}

type BranchManagerProps = {
  documentId: string
  currentBranchId: string | null
  onBranchSwitch: (branch: Branch) => void
}

export function BranchManager({
  documentId,
  currentBranchId,
  onBranchSwitch,
}: BranchManagerProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [selectedMergeSource, setSelectedMergeSource] = useState<string | null>(null)
  const [commits, setCommits] = useState<BranchCommit[]>([])
  const [creating, setCreating] = useState(false)
  const [merging, setMerging] = useState(false)
  const [conflictData, setConflictData] = useState<any>(null)
  const [showConflictResolver, setShowConflictResolver] = useState(false)
  const { toast } = useToast()

  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches.find((b) => b.is_main)

  const loadBranches = useCallback(async () => {
    try {
      const response = await fetch(`/api/branches?documentId=${documentId}`)
      if (!response.ok) throw new Error('Failed to load branches')

      const data = await response.json()
      setBranches(data.branches || [])
    } catch (error) {
      console.error('Error loading branches:', error)
      toast({
        title: 'Error',
        description: 'Failed to load branches',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [documentId, toast])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      toast({
        title: 'Error',
        description: 'Branch name is required',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          branchName: newBranchName,
          fromBranchId: currentBranchId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create branch')
      }

      const data = await response.json()
      toast({
        title: 'Branch created',
        description: `Created branch "${newBranchName}"`,
      })

      setNewBranchName('')
      setCreateDialogOpen(false)
      await loadBranches()

      // Optionally switch to new branch
      if (data.branch) {
        handleSwitchBranch(data.branch)
      }
    } catch (error) {
      console.error('Error creating branch:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create branch',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleSwitchBranch = async (branch: Branch) => {
    try {
      const response = await fetch('/api/branches/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branch.id,
          documentId,
        }),
      })

      if (!response.ok) throw new Error('Failed to switch branch')

      const data = await response.json()
      toast({
        title: 'Switched branch',
        description: `Switched to branch "${branch.branch_name}"`,
      })

      onBranchSwitch(data.branch)
      await loadBranches()
    } catch (error) {
      console.error('Error switching branch:', error)
      toast({
        title: 'Error',
        description: 'Failed to switch branch',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/branches?branchId=${branchId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete branch')

      toast({
        title: 'Branch deleted',
        description: `Deleted branch "${branchName}"`,
      })

      await loadBranches()
    } catch (error) {
      console.error('Error deleting branch:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete branch',
        variant: 'destructive',
      })
    }
  }

  const handleMergeBranch = async () => {
    if (!selectedMergeSource || !currentBranchId) return

    setMerging(true)
    try {
      const response = await fetch('/api/branches/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBranchId: selectedMergeSource,
          targetBranchId: currentBranchId,
        }),
      })

      if (!response.ok) throw new Error('Failed to merge branch')

      const data = await response.json()

      if (data.hasConflicts) {
        // Open conflict resolution UI
        setConflictData({
          conflicts: data.conflicts,
          sourceBranch: data.sourceBranch,
          targetBranch: data.targetBranch,
          sourceBranchId: selectedMergeSource,
          targetBranchId: currentBranchId,
        })
        setShowConflictResolver(true)
        setMergeDialogOpen(false)
        return
      }

      toast({
        title: 'Branch merged',
        description: 'Successfully merged branches',
      })

      setMergeDialogOpen(false)
      setSelectedMergeSource(null)
      await loadBranches()
    } catch (error) {
      console.error('Error merging branch:', error)
      toast({
        title: 'Error',
        description: 'Failed to merge branch',
        variant: 'destructive',
      })
    } finally {
      setMerging(false)
    }
  }

  const handleViewHistory = async (branchId: string) => {
    try {
      const response = await fetch(`/api/branches/commit?branchId=${branchId}&limit=50`)
      if (!response.ok) throw new Error('Failed to load commit history')

      const data = await response.json()
      setCommits(data.commits || [])
      setHistoryDialogOpen(true)
    } catch (error) {
      console.error('Error loading commit history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load commit history',
        variant: 'destructive',
      })
    }
  }

  const handleConflictResolution = async (resolvedContent: any) => {
    if (!conflictData) return

    setMerging(true)
    try {
      const response = await fetch('/api/branches/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBranchId: conflictData.sourceBranchId,
          targetBranchId: conflictData.targetBranchId,
          resolvedContent,
        }),
      })

      if (!response.ok) throw new Error('Failed to merge with resolved content')

      toast({
        title: 'Conflicts resolved',
        description: 'Branch merged successfully',
      })

      setShowConflictResolver(false)
      setConflictData(null)
      setSelectedMergeSource(null)
      await loadBranches()
    } catch (error) {
      console.error('Error resolving conflicts:', error)
      toast({
        title: 'Error',
        description: 'Failed to resolve conflicts',
        variant: 'destructive',
      })
    } finally {
      setMerging(false)
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <GitBranch className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="max-w-[120px] truncate">
              {currentBranch?.branch_name || 'main'}
            </span>
            {currentBranch?.is_main && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                main
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Branches ({branches.length})</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="max-h-[300px]">
            {branches.map((branch) => (
              <DropdownMenuItem
                key={branch.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => {
                  if (branch.id !== currentBranchId) {
                    handleSwitchBranch(branch)
                  }
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <GitBranch className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{branch.branch_name}</span>
                  {branch.is_main && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">
                      main
                    </Badge>
                  )}
                  {branch.id === currentBranchId && (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  )}
                </div>
                {!branch.is_main && branch.id !== currentBranchId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBranch(branch.id, branch.branch_name)
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setMergeDialogOpen(true)}>
            <GitMerge className="mr-2 h-4 w-4" />
            Merge branches
          </DropdownMenuItem>
          {currentBranch && (
            <DropdownMenuItem onClick={() => handleViewHistory(currentBranch.id)}>
              <History className="mr-2 h-4 w-4" />
              View history
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Branch Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new branch</DialogTitle>
            <DialogDescription>
              Create a new branch from{' '}
              <span className="font-medium">{currentBranch?.branch_name || 'main'}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input
                id="branch-name"
                placeholder="feature-name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating) {
                    handleCreateBranch()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Use lowercase letters, numbers, dashes, and underscores
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBranch} disabled={creating || !newBranchName.trim()}>
              {creating ? 'Creating...' : 'Create branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Branch Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge branches</DialogTitle>
            <DialogDescription>
              Select a branch to merge into{' '}
              <span className="font-medium">{currentBranch?.branch_name || 'main'}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Source branch</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {branches
                  .filter((b) => b.id !== currentBranchId)
                  .map((branch) => (
                    <div
                      key={branch.id}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent ${
                        selectedMergeSource === branch.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedMergeSource(branch.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedMergeSource(branch.id)
                        }
                      }}
                    >
                      <GitBranch className="h-4 w-4" />
                      <span className="flex-1">{branch.branch_name}</span>
                      {selectedMergeSource === branch.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMergeBranch}
              disabled={merging || !selectedMergeSource}
            >
              {merging ? 'Merging...' : 'Merge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commit History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commit history</DialogTitle>
            <DialogDescription>
              {currentBranch?.branch_name || 'main'} branch
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {commits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <History className="h-12 w-12 mb-2 opacity-20" />
                <p>No commits yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commits.map((commit, index) => (
                  <div key={commit.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      {index < commits.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-medium text-sm">{commit.message}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{commit.word_count.toLocaleString()} words</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(commit.created_at))} ago</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      {conflictData && (
        <BranchMergeConflictResolver
          open={showConflictResolver}
          onClose={() => {
            setShowConflictResolver(false)
            setConflictData(null)
          }}
          sourceBranchName={conflictData.sourceBranch?.branch_name || 'source'}
          targetBranchName={conflictData.targetBranch?.branch_name || 'target'}
          conflicts={conflictData.conflicts || []}
          onResolve={handleConflictResolution}
        />
      )}
    </>
  )
}
