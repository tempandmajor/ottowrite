'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, FileText } from 'lucide-react'
import Link from 'next/link'

type Document = {
  id: string
  project_id: string
  title: string
  type: 'novel' | 'screenplay' | 'play' | 'short_story'
  word_count: number
  position: number
  created_at: string
  updated_at: string
  project?: {
    name: string
  }
}

type Project = {
  id: string
  name: string
  type: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'novel' as Document['type'],
    project_id: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    loadDocuments()
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, type')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) throw error

      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadDocuments = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          project:projects(name)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading documents:', error)
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const createDocument = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('documents')
        .insert([
          {
            user_id: user.id,
            project_id: formData.project_id,
            title: formData.title,
            type: formData.type,
            content: {},
            position: 0,
            word_count: 0,
          },
        ])
        .select()

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Document created successfully',
      })

      setOpen(false)
      setFormData({ title: '', type: 'novel', project_id: '' })
      loadDocuments()
    } catch (error) {
      console.error('Error creating document:', error)
      toast({
        title: 'Error',
        description: 'Failed to create document',
        variant: 'destructive',
      })
    }
  }

  const deleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.'))
      return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('documents').delete().eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      })

      loadDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-2">
            Manage your writing documents and manuscripts
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Add a new document to your project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  placeholder="Chapter 1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as Document['type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novel">Novel</SelectItem>
                    <SelectItem value="screenplay">Screenplay</SelectItem>
                    <SelectItem value="play">Play</SelectItem>
                    <SelectItem value="short_story">Short Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={createDocument}
                disabled={!formData.title || !formData.project_id}
              >
                Create Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No documents yet</p>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a project first before adding documents
                </p>
              ) : (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Document
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <Card key={document.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle>{document.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {document.type.replace('_', ' ')}
                      {document.project && (
                        <span className="ml-2">• {document.project.name}</span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument(document.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Word count: {document.word_count.toLocaleString()}</span>
                    <span>
                      {new Date(document.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Link href={`/dashboard/editor/${document.id}`}>
                    <Button variant="outline" className="w-full">
                      Open in Editor
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
