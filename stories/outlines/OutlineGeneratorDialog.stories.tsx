import type { Meta, StoryObj } from '@storybook/react'
import { useEffect, useState } from 'react'
import { action } from '@storybook/addon-actions'

import { OutlineGeneratorDialog } from '@/components/outlines/outline-generator-dialog'

type DialogArgs = React.ComponentProps<typeof OutlineGeneratorDialog>

function withFetchStub(responseDelay = 400) {
  const handler = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (method === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, responseDelay))
      return new Response(JSON.stringify({ id: 'outline-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return handler
}

const DialogWrapper = (args: DialogArgs) => {
  const [open, setOpen] = useState(args.open)
  const onOpenChange = (next: boolean) => {
    setOpen(next)
    args.onOpenChange(next)
  }

  useEffect(() => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = withFetchStub()
    return () => {
      globalThis.fetch = originalFetch
    }
  }, [])

  return (
    <OutlineGeneratorDialog
      {...args}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

const meta: Meta<typeof OutlineGeneratorDialog> = {
  title: 'Outlines/OutlineGeneratorDialog',
  component: OutlineGeneratorDialog,
  args: {
    projectId: 'project-123',
    projectType: 'novel',
    genre: ['Fantasy', 'Adventure'],
    onGenerated: action('generated'),
    onOpenChange: action('open-change'),
  },
  render: (args) => <DialogWrapper {...args} />,
}

export default meta

type Story = StoryObj<typeof OutlineGeneratorDialog>

export const Closed: Story = {
  args: {
    open: false,
  },
  parameters: {
    layout: 'centered',
  },
}

export const OpenIdle: Story = {
  args: {
    open: true,
  },
  parameters: {
    layout: 'centered',
  },
}

export const PrefilledPremise: Story = {
  args: {
    open: true,
    defaultPremise:
      'An archivist aboard a generation ship uncovers banned memories that could avert a mutiny.',
    defaultAdditionalContext:
      'Focus on escalating tension between lower-deck engineers and command. Include a twist revealing the archivist is partially synthetic.',
    defaultFormat: 'scene_by_scene',
  },
  parameters: {
    layout: 'centered',
  },
}
