import { NextRequest, NextResponse } from 'next/server'
import { generateEnsembleSuggestions } from '@/lib/ai/ensemble-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const prompt: string = body?.prompt ?? ''
    const context: string | undefined = body?.context ?? undefined
    const maxTokens: number | undefined = body?.maxTokens ?? undefined

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: 'Prompt must be at least 5 characters long.' },
        { status: 400 }
      )
    }

    const suggestions = await generateEnsembleSuggestions({
      prompt: prompt.trim(),
      context,
      maxTokens,
    })

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Ensemble generation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions.' },
      { status: 500 }
    )
  }
}
