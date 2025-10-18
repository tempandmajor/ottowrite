'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Film, Theater, ScrollText } from 'lucide-react'

interface BeatTemplate {
  id: string
  name: string
  display_name: string
  description: string
  total_beats: number
  structure: any[]
  suitable_for: string[]
}

interface BeatTemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectType: string
  onTemplateSelect: (templateName: string) => void
}

export function BeatTemplateSelector({
  open,
  onOpenChange,
  projectType,
  onTemplateSelect,
}: BeatTemplateSelectorProps) {
  const [templates, setTemplates] = useState<BeatTemplate[]>([])
  const [loading, setLoading] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/story-beats/templates?suitable_for=${projectType}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading beat templates:', error)
    } finally {
      setLoading(false)
    }
  }, [projectType])

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  const getIcon = (templateName: string) => {
    if (templateName.includes('screenplay') || templateName === 'save_the_cat') {
      return Film
    }
    if (templateName === 'heros_journey') {
      return ScrollText
    }
    if (templateName.includes('act')) {
      return Theater
    }
    return BookOpen
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose Story Structure</DialogTitle>
          <DialogDescription>
            Select a narrative structure template to organize your story beats
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading templates...
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  No templates available for this project type.
                </div>
              ) : (
                templates.map((template) => {
                  const Icon = getIcon(template.name)
                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary transition-colors focus-within:ring-2 focus-within:ring-primary"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onTemplateSelect(template.name)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onTemplateSelect(template.name)
                        }
                      }}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Icon className="h-8 w-8 mt-1 text-primary" />
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {template.display_name}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {template.description}
                            </CardDescription>
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <span className="px-2 py-1 bg-secondary rounded">
                                {template.total_beats} beats
                              </span>
                              <span>
                                Suitable for:{' '}
                                {template.suitable_for.join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
