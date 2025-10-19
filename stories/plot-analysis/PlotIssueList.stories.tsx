import type { Meta, StoryObj } from '@storybook/react'
import { useEffect } from 'react'
import { action } from '@storybook/addon-actions'

import { PlotIssueList } from '@/components/plot-analysis/plot-issue-list'
import type { IssueCategory, IssueSeverity } from '@/lib/ai/plot-analyzer'

type Issue = {
  id: string
  severity: IssueSeverity
  category: IssueCategory
  title: string
  description: string
  location?: string | null
  line_reference?: string | null
  suggestion?: string | null
  is_resolved: boolean
  resolved_at?: string | null
  resolution_notes?: string | null
  created_at: string
}

function installFetchStub(issues: Issue[], delay = 0) {
  const handler = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method ?? 'GET'

    if (url.startsWith('/api/plot-analysis/issues')) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      if (method === 'GET') {
        return new Response(JSON.stringify(issues), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (method === 'PATCH') {
        action('update-issue')(init?.body ?? '')
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = handler

  return () => {
    globalThis.fetch = originalFetch
  }
}

type StoryArgs = React.ComponentProps<typeof PlotIssueList>

const StoryWrapper = ({ issues, delay = 0, ...props }: StoryArgs & { issues: Issue[]; delay?: number }) => {
  useEffect(() => {
    const restore = installFetchStub(issues, delay)
    return restore
  }, [issues, delay])
  return <PlotIssueList {...props} />
}

const now = new Date()

const sampleIssues: Issue[] = [
  {
    id: 'issue-1',
    severity: 'critical',
    category: 'timeline',
    title: 'Timeline collapse in Act II',
    description:
      'Scene 14 references the gala occurring before the security breach, but Scene 13 already establishes that the gala was cancelled.',
    location: 'Chapter 8',
    suggestion: 'Reorder the gala reveal or alter Scene 13 so the cancellation happens later.',
    is_resolved: false,
    created_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'issue-2',
    severity: 'major',
    category: 'character_continuity',
    title: 'Protagonist loses motivation',
    description:
      'In the midpoint confrontation Alex suddenly abandons the core goal established in Act I without a trigger.',
    location: 'Scene 17',
    suggestion: 'Add a beat that undermines Alex’s confidence or introduces a higher personal cost.',
    is_resolved: false,
    created_at: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'issue-3',
    severity: 'suggestion',
    category: 'logic',
    title: 'Opportunity for foreshadowing',
    description:
      'Consider sprinkling hints about the hidden council earlier to make the reveal feel earned.',
    location: 'Chapter 3',
    suggestion: 'Add a brief conversation where the mentor deflects questions about the council.',
    is_resolved: true,
    resolved_at: now.toISOString(),
    resolution_notes: 'Added foreshadowing in Chapter 2 breakfast scene.',
    created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
  },
]

const meta: Meta<typeof PlotIssueList> = {
  title: 'Plot Analysis/PlotIssueList',
  component: PlotIssueList,
  args: {
    analysisId: 'analysis-123',
  },
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof PlotIssueList>

export const IssuesPending: Story = {
  render: (args) => <StoryWrapper {...args} issues={sampleIssues} />,
}

export const AllResolved: Story = {
  render: (args) =>
    (
      <StoryWrapper
        {...args}
        issues={sampleIssues.map((issue) => ({
          ...issue,
          is_resolved: true,
          resolved_at: now.toISOString(),
          resolution_notes: issue.resolution_notes ?? 'Marked resolved during QA pass.',
        }))}
      />
    ),
}

export const EmptyState: Story = {
  render: (args) => <StoryWrapper {...args} issues={[]} />,
}

export const LoadingState: Story = {
  render: (args) => <StoryWrapper {...args} issues={sampleIssues} delay={1200} />,
}
