'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { FileText, Film, BookOpen, FileSignature } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Template {
  id: string
  title?: string
  name?: string
  description: string | null
  type: string
  category?: string | null
  tags?: string[] | null
  usage_count?: number | null
}

interface ProjectSummary {
  id: string
  name: string
}

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
}

export function TemplateDialog({ open, onOpenChange, projectId }: TemplateDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [documentTitle, setDocumentTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [projectLoading, setProjectLoading] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/templates')
      if (response.ok) {
        const data = await response.json()
        const templatesData = Array.isArray(data) ? data : data?.templates
        if (Array.isArray(templatesData)) {
          setTemplates(templatesData)
        } else {
          setTemplates([])
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProjects = useCallback(async () => {
    setProjectLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProjects(data || [])

      if (data && data.length > 0) {
        setSelectedProjectId(data[0].id)
      }
    } catch (error) {
      console.error('Error loading projects for template dialog:', error)
      toast({
        title: 'Error',
        description: 'Unable to load your projects. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setProjectLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) {
      loadTemplates()
      if (!projectId) {
        loadProjects()
      }
    } else {
      setSelectedTemplate(null)
      setDocumentTitle('')
      setSelectedProjectId('')
    }
  }, [open, projectId, loadProjects, loadTemplates])

  const handleUseTemplate = async () => {
    if (!selectedTemplate) return

    const targetProjectId = projectId || selectedProjectId

    if (!targetProjectId) {
      toast({
        title: 'Select a project',
        description: 'Choose which project to add this document to before continuing.',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: targetProjectId,
          title: documentTitle || selectedTemplate.title || selectedTemplate.name,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create document from template')
      }

      const data = await response.json()
      const document = data?.document || data

      toast({
        title: 'Document created',
        description: 'Your document has been created from the template.',
      })

      onOpenChange(false)
      router.push(`/dashboard/editor/${document.id}`)
    } catch (error) {
      console.error('Failed to create document from template:', error)
      toast({
        title: 'Error',
        description: 'Failed to create document. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'screenplay':
      case 'play':
        return Film
      case 'novel':
        return BookOpen
      case 'short_story':
        return FileSignature
      default:
        return FileText
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Start your document with a pre-built template
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading templates...
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.length === 0 ? (
                  <div className="text-muted-foreground text-sm">
                    No templates available yet.
                  </div>
                ) : (
                  templates.map((template) => {
                    const Icon = getIcon(template.type)
                    const templateTitle = template.title || template.name || 'Untitled Document'
                    return (
                      <button
                        key={template.id}
                        type="button"
                        className="border rounded-lg p-4 text-left hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Use template ${templateTitle}`}
                        onClick={() => {
                          setSelectedTemplate(template)
                          setDocumentTitle(templateTitle)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedTemplate(template)
                            setDocumentTitle(templateTitle)
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-1 text-primary" />
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{templateTitle}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {template.description || 'No description provided.'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="px-2 py-1 bg-secondary rounded-md">
                                {template.type.replace('_', ' ')}
                              </span>
                              {typeof template.usage_count === 'number' && (
                                <span>Used {template.usage_count} times</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">
                {selectedTemplate.title || selectedTemplate.name || 'Untitled Document'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate.description || 'No description provided.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Enter document title"
              />
            </div>

            {!projectId && (
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={(value) => setSelectedProjectId(value)}
                  disabled={projectLoading || projects.length === 0}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder={projectLoading ? 'Loading projects...' : 'Select a project'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projects.length === 0 && !projectLoading && (
                  <p className="text-xs text-muted-foreground">
                    You don’t have any projects yet. Create one first to use templates.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedTemplate(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleUseTemplate}
                disabled={
                  creating ||
                  !documentTitle.trim() ||
                  (!projectId && (!selectedProjectId || projects.length === 0))
                }
                className="flex-1"
              >
                {creating ? 'Creating...' : 'Create Document'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
