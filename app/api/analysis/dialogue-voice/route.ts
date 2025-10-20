/**
 * Dialogue Voice Analysis API
 *
 * POST /api/analysis/dialogue-voice - Analyze character dialogue samples
 * GET /api/analysis/dialogue-voice?characterId=... - Get latest analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  analyzeCharacterVoice,
  validateDialogueAgainstVoice,
  type DialogueSample,
  type VoicePattern,
} from '@/lib/ai/dialogue-analyzer'
import { errorResponses } from '@/lib/api/error-response'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/analysis/dialogue-voice?characterId=...
 * Retrieve the latest voice analysis for a character
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponses.unauthorized()
  }

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')

  if (!characterId) {
    return errorResponses.badRequest('Character ID is required')
  }

  // Get latest voice analysis
  const { data: analysis, error } = await supabase
    .from('voice_analyses')
    .select('*')
    .eq('character_id', characterId)
    .eq('user_id', user.id)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned", which is expected for first-time
    console.error('Error fetching voice analysis:', error)
    return errorResponses.internalError('Failed to fetch voice analysis')
  }

  // Also get dialogue samples count
  const { count } = await supabase
    .from('dialogue_samples')
    .select('*', { count: 'exact', head: true })
    .eq('character_id', characterId)
    .eq('user_id', user.id)

  return NextResponse.json({
    analysis: analysis || null,
    sampleCount: count || 0,
  })
}

/**
 * POST /api/analysis/dialogue-voice
 * Analyze character dialogue and create voice profile
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponses.unauthorized()
  }

  const body = await request.json()
  const { characterId, action, dialogueSamples, newDialogue, context } = body

  // Validate required fields
  if (!characterId) {
    return errorResponses.badRequest('Character ID is required')
  }

  // Fetch character details
  const { data: character, error: characterError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .eq('user_id', user.id)
    .single()

  if (characterError || !character) {
    return errorResponses.notFound('Character not found')
  }

  try {
    // Handle different actions
    if (action === 'analyze') {
      // Analyze character voice from samples
      if (!dialogueSamples || !Array.isArray(dialogueSamples) || dialogueSamples.length === 0) {
        return errorResponses.badRequest('At least one dialogue sample is required')
      }

      // Run AI analysis
      const analysisResult = await analyzeCharacterVoice({
        characterName: character.name,
        characterProfile: {
          personality: character.personality_traits || [],
          age: character.age,
          background: character.backstory,
          education: character.voice_description,
        },
        dialogueSamples: dialogueSamples as DialogueSample[],
      })

      // Save dialogue samples to database
      const sampleInserts = dialogueSamples.map((sample: DialogueSample) => ({
        character_id: characterId,
        user_id: user.id,
        text: sample.text,
        context: sample.context,
        scene_description: sample.sceneDescription,
        emotional_state: sample.emotionalState,
      }))

      await supabase.from('dialogue_samples').insert(sampleInserts)

      // Save analysis result
      const { data: savedAnalysis, error: saveError } = await supabase
        .from('voice_analyses')
        .insert({
          character_id: characterId,
          user_id: user.id,
          overall_score: analysisResult.overallScore,
          uniqueness_score: analysisResult.uniquenessScore,
          consistency_score: analysisResult.consistencyScore,
          voice_pattern: analysisResult.voicePattern,
          issues: analysisResult.issues,
          strengths: analysisResult.strengths,
          characterization: analysisResult.characterization,
          recommendations: analysisResult.recommendations,
          sample_count: dialogueSamples.length,
        })
        .select()
        .single()

      if (saveError) {
        console.error('Error saving analysis:', saveError)
        return errorResponses.badRequest('Failed to save analysis')
      }

      return NextResponse.json({
        success: true,
        analysis: savedAnalysis,
      })
    } else if (action === 'validate') {
      // Validate new dialogue against established voice
      if (!newDialogue) {
        return errorResponses.badRequest('Dialogue text is required')
      }

      // Get latest voice analysis
      const { data: latestAnalysis } = await supabase
        .from('voice_analyses')
        .select('*')
        .eq('character_id', characterId)
        .eq('user_id', user.id)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single()

      if (!latestAnalysis) {
        return errorResponses.badRequest('No voice analysis found. Please analyze dialogue samples first.')
      }

      // Run validation
      const validationResult = await validateDialogueAgainstVoice({
        characterName: character.name,
        establishedVoice: latestAnalysis.voice_pattern as VoicePattern,
        newDialogue,
        context,
      })

      // Save validation result
      await supabase.from('dialogue_validations').insert({
        voice_analysis_id: latestAnalysis.id,
        character_id: characterId,
        user_id: user.id,
        dialogue_text: newDialogue,
        context,
        match_score: validationResult.matchScore,
        verdict: validationResult.verdict,
        explanation: validationResult.explanation,
        issues: validationResult.issues,
      })

      return NextResponse.json({
        success: true,
        validation: validationResult,
      })
    } else {
      return errorResponses.badRequest('Invalid action. Must be "analyze" or "validate"')
    }
  } catch (error) {
    console.error('Dialogue analysis error:', error)
    return errorResponses.internalError(error instanceof Error ? error.message : 'Failed to analyze dialogue')
  }
}

/**
 * DELETE /api/analysis/dialogue-voice?characterId=...
 * Clear dialogue samples and analyses for a character
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return errorResponses.unauthorized()
  }

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')

  if (!characterId) {
    return errorResponses.badRequest('Character ID is required')
  }

  // Delete all voice analyses (cascade will handle validations)
  const { error: analysesError } = await supabase
    .from('voice_analyses')
    .delete()
    .eq('character_id', characterId)
    .eq('user_id', user.id)

  if (analysesError) {
    console.error('Error deleting analyses:', analysesError)
    return errorResponses.badRequest('Failed to delete voice analyses')
  }

  // Delete all dialogue samples
  const { error: samplesError } = await supabase
    .from('dialogue_samples')
    .delete()
    .eq('character_id', characterId)
    .eq('user_id', user.id)

  if (samplesError) {
    console.error('Error deleting samples:', samplesError)
    return errorResponses.badRequest('Failed to delete dialogue samples')
  }

  return NextResponse.json({ success: true })
}
