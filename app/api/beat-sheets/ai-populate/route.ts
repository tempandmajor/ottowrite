import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponses, successResponse } from '@/lib/api/error-response';
import { logger } from '@/lib/monitoring/structured-logger';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/beat-sheets/ai-populate
 *
 * AI-populate beat sheet from logline
 * Body: {
 *   structure_id: string,
 *   logline: string,
 *   genre?: string,
 *   tone?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { structure_id, logline, genre, tone } = body;

    if (!structure_id || !logline) {
      return errorResponses.badRequest('structure_id and logline are required');
    }

    // Get the beat sheet structure
    const { data: beatSheet, error: beatSheetError } = await supabase
      .from('beat_sheets')
      .select('*')
      .eq('structure_id', structure_id)
      .single();

    if (beatSheetError || !beatSheet) {
      logger.error('Beat sheet not found for AI populate', {
        structure_id,
        operation: 'beat-sheets:ai-populate'
      }, beatSheetError ?? undefined);
      return errorResponses.notFound('Beat sheet structure not found');
    }

    // Prepare the prompt for GPT-4
    const systemPrompt = `You are a professional screenplay story structure consultant. You help writers break down their stories into beats using established story structure frameworks.

Your task is to take a logline and populate all beats for the "${beatSheet.name}" structure (${beatSheet.total_beats} beats).

For each beat, provide:
1. A 2-3 sentence description of what happens in this beat for THIS specific story
2. Answer the key questions for this beat
3. Be specific to the story in the logline, not generic

Return ONLY a JSON object with beat IDs as keys and your content as values. Format:
{
  "beat-id-1": {
    "content": "What happens in this beat for this story...",
    "notes": "Additional thoughts or suggestions..."
  },
  "beat-id-2": { ... }
}`;

    const userPrompt = `Logline: "${logline}"
${genre ? `Genre: ${genre}` : ''}
${tone ? `Tone: ${tone}` : ''}

Beat Sheet Structure: ${beatSheet.name}
Creator: ${beatSheet.creator}
Total Beats: ${beatSheet.total_beats}

Beats to populate:
${JSON.stringify(beatSheet.beats, null, 2)}

Please populate all ${beatSheet.total_beats} beats with specific story content based on this logline. Make it detailed and actionable for the writer.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const populatedBeats = JSON.parse(
      completion.choices[0].message.content || '{}'
    );

    return successResponse({
      beat_data: populatedBeats,
      structure_id,
      structure_name: beatSheet.name,
      total_beats: beatSheet.total_beats
    });
  } catch (error) {
    logger.error('Error AI-populating beat sheet', {
      operation: 'beat-sheets:ai-populate'
    }, error instanceof Error ? error : undefined);
    return errorResponses.internalError('Failed to AI-populate beat sheet', { details: error });
  }
}
