/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

type OutlineSummaryProps = {
  formatLabel: string
  sectionCount: number
  wordTarget?: number
  pageTarget?: number
  projectType?: string
  genres?: string[]
  generatorModel?: string
}

function OutlineSummaryAside({
  formatLabel,
  sectionCount,
  wordTarget,
  pageTarget,
  projectType,
  genres,
  generatorModel,
}: OutlineSummaryProps) {
  return (
    <div className="space-y-4 w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outline summary</CardTitle>
          <CardDescription>Quick facts to guide polish sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <SummaryRow label="Format">
            <Badge variant="secondary" className="capitalize">
              {formatLabel}
            </Badge>
          </SummaryRow>
          <SummaryRow label="Sections">
            <span className="font-medium">{sectionCount}</span>
          </SummaryRow>
          {wordTarget ? (
            <SummaryRow label="Target words">
              <span className="font-medium">{wordTarget.toLocaleString()}</span>
            </SummaryRow>
          ) : null}
          {pageTarget ? (
            <SummaryRow label="Target pages">
              <span className="font-medium">{pageTarget}</span>
            </SummaryRow>
          ) : null}
        </CardContent>
      </Card>

      {(projectType || (genres && genres.length > 0) || generatorModel) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Story context</CardTitle>
            <CardDescription className="text-xs">
              Useful when exporting outlines or sharing with collaborators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {projectType && (
              <SummaryRow label="Project type">
                <span className="font-medium capitalize">{projectType.replace('_', ' ')}</span>
              </SummaryRow>
            )}
            {genres && genres.length > 0 && (
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Genres</span>
                <div className="flex flex-wrap gap-1">
                  {genres.map((genre) => (
                    <Badge key={genre} variant="outline">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {generatorModel && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                <Sparkles className="h-4 w-4 text-purple-500" />
                {generatorModel}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">Editor tips</CardTitle>
          <CardDescription className="text-xs">
            Keep outlines in sync with characters and plot reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>• Capture follow-up tasks in notes so they show up during QA.</p>
          <p>• Re-run plot analysis whenever you restructure major beats.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      {children}
    </div>
  )
}

const meta: Meta<typeof OutlineSummaryAside> = {
  title: 'Outlines/OutlineSummaryAside',
  component: OutlineSummaryAside,
  args: {
    formatLabel: 'Chapter summary',
    sectionCount: 18,
    wordTarget: 42000,
    pageTarget: 260,
    projectType: 'novel',
    genres: ['Fantasy', 'Adventure'],
    generatorModel: 'Claude Sonnet 4.5',
  },
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof OutlineSummaryAside>

export const FullContext: Story = {}

export const MinimalContext: Story = {
  args: {
    wordTarget: undefined,
    pageTarget: undefined,
    projectType: undefined,
    genres: [],
    generatorModel: undefined,
  },
}
