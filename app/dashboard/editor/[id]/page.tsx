'use client'

import { useSearchParams } from 'next/navigation'
import { EditorWorkspace } from '@/components/editor/editor-workspace'

export default function DashboardEditorPage() {
  const searchParams = useSearchParams()
  const workspaceMode = searchParams?.get('workspace') === '1'
  return <EditorWorkspace workspaceMode={workspaceMode} />
}
