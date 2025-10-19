import type { Meta, StoryObj } from '@storybook/react'

import { Badge } from '@/components/ui/badge'

const VARIANTS: Array<React.ComponentProps<typeof Badge>['variant']> = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'muted',
]

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof Badge>

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {VARIANTS.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
      <Badge className="bg-slate-900 text-slate-50">Custom class</Badge>
    </div>
  ),
}
