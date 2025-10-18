'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { FileText, MoreVertical, Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface DocumentCardProps {
  document: {
    id: string
    title: string
    type: string
    word_count: number
    updated_at: string
  }
  onDelete?: () => void
  onDuplicate?: () => void
}

export function DocumentCard({ document, onDelete, onDuplicate }: DocumentCardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      toast({
        title: 'Document deleted',
        description: 'Your document has been permanently deleted.',
      })

      onDelete?.()
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete document. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      const response = await fetch(`/api/documents/${document.id}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate document')
      }

      const duplicate = await response.json()

      toast({
        title: 'Document duplicated',
        description: 'A copy has been created successfully.',
      })

      onDuplicate?.()
      router.push(`/dashboard/editor/${duplicate.id}`)
    } catch (error) {
      console.error('Failed to duplicate document:', error)
      toast({
        title: 'Error',
        description: 'Failed to duplicate document. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex-1">
          <Link href={`/dashboard/editor/${document.id}`}>
            <CardTitle className="hover:underline cursor-pointer">
              {document.title}
            </CardTitle>
          </Link>
          <CardDescription>
            {document.type} • {document.word_count.toLocaleString()} words
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleDuplicate}
              disabled={isDuplicating}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-muted-foreground">
          <FileText className="h-4 w-4 mr-2" />
          Updated {formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  )
}
