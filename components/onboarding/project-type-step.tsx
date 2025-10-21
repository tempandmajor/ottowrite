'use client'

import { BookOpen, Film, Theater, FileText, Library } from 'lucide-react'
import { cn } from '@/lib/utils'

type ProjectType = 'novel' | 'series' | 'screenplay' | 'play' | 'short_story'

interface ProjectTypeStepProps {
  selectedType: ProjectType | null
  onSelect: (type: ProjectType) => void
}

const projectTypes = [
  {
    type: 'novel' as ProjectType,
    icon: BookOpen,
    title: 'Novel',
    description: 'A full-length fiction work with chapters and complex character arcs',
    examples: 'Literary fiction, mystery, romance, fantasy',
  },
  {
    type: 'series' as ProjectType,
    icon: Library,
    title: 'Series',
    description: 'Multiple interconnected books sharing characters or world',
    examples: 'Trilogies, saga, multi-book fantasy',
  },
  {
    type: 'screenplay' as ProjectType,
    icon: Film,
    title: 'Screenplay',
    description: 'Script for film with industry-standard formatting',
    examples: 'Feature films, TV pilots, short films',
  },
  {
    type: 'play' as ProjectType,
    icon: Theater,
    title: 'Play / Stage Script',
    description: 'Theatrical script with acts, scenes, and stage directions',
    examples: 'Drama, comedy, musicals',
  },
  {
    type: 'short_story' as ProjectType,
    icon: FileText,
    title: 'Short Story',
    description: 'Compact narrative focused on a single plot or theme',
    examples: 'Flash fiction, anthologies, magazine submissions',
  },
]

export function ProjectTypeStep({ selectedType, onSelect }: ProjectTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">What are you writing?</h2>
        <p className="text-muted-foreground">
          Select the type of project you&apos;d like to start with. You can create other types later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {projectTypes.map(({ type, icon: Icon, title, description, examples }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              'group relative rounded-2xl border-2 bg-card p-6 text-left transition-all hover:shadow-lg',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              selectedType === type
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'rounded-full p-2 transition-colors',
                    selectedType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground group-hover:bg-primary/10'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>

              <p className="text-xs text-muted-foreground/70 italic">
                {examples}
              </p>
            </div>

            {selectedType === type && (
              <div className="absolute top-4 right-4">
                <div className="rounded-full bg-primary p-1">
                  <svg
                    className="h-4 w-4 text-primary-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t worry—you can always create more projects of different types later
      </div>
    </div>
  )
}
