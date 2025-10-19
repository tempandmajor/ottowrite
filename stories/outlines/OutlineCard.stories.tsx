/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react'

import { OutlineCard } from '@/components/outlines/outline-card'

const baseOutline = {
  id: 'outline-1',
  title: 'Season One Beat Sheet',
  format: 'chapter_summary',
  premise: 'A young mage must master forbidden magic before an ancient storm consumes her homeland.',
  content: Array.from({ length: 6 }).map((_, index) => ({
    title: `Chapter ${index + 1}`,
    description:
      'Explore the character motivation and escalate the central conflict while introducing new complications.',
  })),
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  updated_at: new Date().toISOString(),
}

const meta: Meta<typeof OutlineCard> = {
  title: 'Outlines/OutlineCard',
  component: OutlineCard,
  args: {
    projectId: 'project-123',
    onDelete: () => {
      console.log('delete')
    },
  },
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof OutlineCard>

export const Default: Story = {
  args: {
    outline: baseOutline,
  },
}

export const LongPremise: Story = {
  args: {
    outline: {
      ...baseOutline,
      id: 'outline-2',
      title: 'Epic Fantasy Treatment',
      premise:
        'After the royal capital falls to an immortal tyrant, an exiled strategist must reunite fractured kingdoms, decipher her family’s cryptic prophecies, and confront the secret that links her lineage to the enemy before the eclipse coronation locks the realm in perpetual night.',
      format: 'treatment',
    },
  },
}

export const ExpandedWithSections: Story = {
  args: {
    outline: {
      ...baseOutline,
      id: 'outline-3',
      format: 'scene_by_scene',
      content: Array.from({ length: 14 }).map((_, index) => ({
        title: `Scene ${index + 1}`,
        description:
          'Detailed setup, conflict, and resolution beats for the scene, including key location and character notes.',
      })),
    },
    defaultExpanded: true,
  },
}
