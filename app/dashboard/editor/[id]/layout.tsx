import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditorHeader } from '@/components/editor/editor-header'

// Force dynamic rendering - this layout uses cookies for auth
export const dynamic = 'force-dynamic'

export default async function EditorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Editor layout: Supabase auth error:', error)
      redirect('/auth/login')
    }

    if (!user) {
      redirect('/auth/login')
    }

    // Get document to verify access
    const { id } = await params
    const { data: document } = await supabase
      .from('documents')
      .select('id, title, user_id')
      .eq('id', id)
      .single()

    if (!document || document.user_id !== user.id) {
      redirect('/dashboard/documents')
    }

    return (
      <div className="min-h-screen bg-background font-sans text-foreground">
        <EditorHeader documentTitle={document.title} email={user.email ?? ''} />
        <main className="relative flex flex-1 flex-col">
          {children}
        </main>
      </div>
    )
  } catch (error) {
    console.error('Editor layout: Failed to create Supabase client:', error)
    redirect('/auth/login')
  }
}
