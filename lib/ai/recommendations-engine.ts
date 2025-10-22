/**
 * AI-Native Recommendations Engine
 *
 * Competitive advantage over Final Draft:
 * 1. Smart Template Recommendations - Genre/tone detection from logline
 * 2. Template Health Check - Story structure analysis
 * 3. Auto-Tagging - AI detects genre, tone, influences
 * 4. Collaborative Filtering - "Writers like you used..."
 * 5. Context-Aware Placeholders - AI generates scene descriptions
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// 1. SMART TEMPLATE RECOMMENDATIONS
// ============================================================================

export interface TemplateRecommendation {
  template_type: string;
  template_name: string;
  match_percentage: number;
  reasons: string[];
  genre: string;
  tone: string;
  target_length: string;
}

export async function getSmartTemplateRecommendations(
  logline: string,
  additionalContext?: {
    targetLength?: 'short' | 'feature' | 'series' | 'stage';
    preferredMedium?: 'film' | 'tv' | 'stage' | 'audio' | 'sequential';
  }
): Promise<{
  primary: TemplateRecommendation;
  alternatives: TemplateRecommendation[];
  detectedGenre: string;
  detectedTone: string;
  confidence: number;
}> {
  const systemPrompt = `You are an expert screenwriting consultant with deep knowledge of story structure and formatting.

Analyze the given logline and recommend the best template types. Consider:
- Story length (short film, feature, series, etc.)
- Genre (action, drama, comedy, thriller, etc.)
- Tone (dark, lighthearted, dramatic, satirical, etc.)
- Medium (film, TV, stage, audio, sequential art)
- Format requirements (single-camera, multi-camera, etc.)

Available Templates:
FILM: feature_film, short_film, animation, documentary
TV: tv_drama (1hr single-cam), tv_sitcom_single (30min single-cam), tv_sitcom_multi (30min multi-cam), web_series
STAGE: stage_play, musical, radio_play
AUDIO: audio_drama
SEQUENTIAL: comic_book, graphic_novel, manga, webcomic
DEVELOPMENT: treatment, outline

Return JSON with:
{
  "primary": {
    "template_type": "feature_film",
    "template_name": "Feature Film",
    "match_percentage": 95,
    "reasons": ["Epic scope requires feature length", "Visual storytelling perfect for cinema"],
    "genre": "Sci-Fi",
    "tone": "Dark, Epic",
    "target_length": "90-120 pages"
  },
  "alternatives": [
    { "template_type": "tv_drama", "match_percentage": 75, ... },
    { "template_type": "graphic_novel", "match_percentage": 60, ... }
  ],
  "detectedGenre": "Sci-Fi/Action",
  "detectedTone": "Dark, Epic, Dramatic",
  "confidence": 0.92
}`;

  const userPrompt = `Logline: "${logline}"
${additionalContext ? `\nContext: ${JSON.stringify(additionalContext)}` : ''}

Analyze this logline and recommend the best template type.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

// ============================================================================
// 2. TEMPLATE HEALTH CHECK
// ============================================================================

export interface HealthCheckIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  category: 'pacing' | 'structure' | 'character' | 'dialogue' | 'formatting';
  message: string;
  location?: {
    act?: string;
    page?: number;
    scene?: string;
  };
  suggestion: string;
}

export interface TemplateHealthCheck {
  overallScore: number; // 0-100
  issues: HealthCheckIssue[];
  strengths: string[];
  actBreakdown?: {
    act: string;
    pageCount: number;
    expectedRange: string;
    status: 'good' | 'rushed' | 'dragging';
  }[];
  beatPresence?: {
    beat: string;
    present: boolean;
    expectedPage: number;
    actualPage?: number;
  }[];
}

export async function analyzeTemplateHealth(
  content: string,
  templateType: string,
  metadata?: {
    totalPages?: number;
    actBreaks?: { act: string; startPage: number; endPage: number }[];
    genre?: string;
  }
): Promise<TemplateHealthCheck> {
  const systemPrompt = `You are a professional script doctor analyzing screenplay structure and pacing.

Analyze the provided screenplay content for structural health issues:

PACING CHECKS:
- Act I: Should be 25-30% (25-30 pages for 110-page script)
- Act II: Should be 50% (50-60 pages)
- Act III: Should be 20-25% (20-30 pages)

BEAT CHECKS (for Feature Films):
- Opening Image: Page 1
- Catalyst/Inciting Incident: Page 12-15
- Break into Two: Page 25-30
- Midpoint: Page 50-60
- All Is Lost: Page 75-85
- Break into Three: Page 85-90
- Finale: Page 90-110

CHARACTER CHECKS:
- Protagonist introduced in first 10 pages
- Clear goal established
- Character arc evident

DIALOGUE CHECKS:
- Not too exposition-heavy
- Each character has distinct voice
- Subtext present

Return JSON:
{
  "overallScore": 85,
  "issues": [
    {
      "severity": "warning",
      "category": "pacing",
      "message": "Your Act II feels rushed (only 40 pages)",
      "location": { "act": "Act II", "page": 30 },
      "suggestion": "Consider expanding the Midpoint sequence and adding more obstacles before the All Is Lost moment"
    }
  ],
  "strengths": ["Strong opening hook", "Clear character motivation"],
  "actBreakdown": [...],
  "beatPresence": [...]
}`;

  const userPrompt = `Template Type: ${templateType}
Total Pages: ${metadata?.totalPages || 'unknown'}
Genre: ${metadata?.genre || 'unknown'}

Content to analyze:
${content.substring(0, 8000)} ${content.length > 8000 ? '...(truncated)' : ''}

Provide a comprehensive health check analysis.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

// ============================================================================
// 3. AUTO-TAGGING
// ============================================================================

export interface AutoTags {
  genres: Array<{ name: string; confidence: number }>;
  tones: Array<{ name: string; confidence: number }>;
  themes: string[];
  influences: string[]; // "Similar to Blade Runner", "Tarantino-esque dialogue"
  targetAudience: string[];
  contentWarnings?: string[];
  marketComparisons: string[]; // "Fans of Stranger Things", "Meets X meets Y"
}

export async function generateAutoTags(
  content: string,
  logline?: string
): Promise<AutoTags> {
  const systemPrompt = `You are a Hollywood script analyst specializing in genre classification and market positioning.

Analyze the screenplay content and generate comprehensive tags:

GENRES: Action, Adventure, Animation, Biography, Comedy, Crime, Documentary, Drama, Family, Fantasy, Film-Noir, History, Horror, Music, Musical, Mystery, Romance, Sci-Fi, Sport, Thriller, War, Western

TONES: Dark, Lighthearted, Dramatic, Comedic, Satirical, Gritty, Whimsical, Epic, Intimate, Suspenseful, Uplifting, Melancholic, Absurdist, Noir, Romantic

THEMES: Redemption, Coming-of-age, Good vs Evil, Love, Sacrifice, Identity, Power, Corruption, Family, Betrayal, Survival, Justice, etc.

INFLUENCES: Compare to well-known films, directors, or styles

Return JSON:
{
  "genres": [
    { "name": "Sci-Fi", "confidence": 0.95 },
    { "name": "Thriller", "confidence": 0.78 }
  ],
  "tones": [
    { "name": "Dark", "confidence": 0.88 },
    { "name": "Suspenseful", "confidence": 0.92 }
  ],
  "themes": ["Identity", "Power", "Surveillance"],
  "influences": ["Blade Runner", "The Matrix", "Minority Report"],
  "targetAudience": ["18-45", "Sci-Fi fans", "Action enthusiasts"],
  "contentWarnings": ["Violence", "Strong language"],
  "marketComparisons": ["Fans of Black Mirror", "Inception meets Ex Machina"]
}`;

  const userPrompt = `${logline ? `Logline: ${logline}\n\n` : ''}Content:
${content.substring(0, 6000)} ${content.length > 6000 ? '...(truncated)' : ''}

Generate comprehensive auto-tags for this screenplay.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

// ============================================================================
// 4. COLLABORATIVE FILTERING - "WRITERS LIKE YOU USED..."
// ============================================================================

export interface CollaborativeRecommendation {
  template_type: string;
  template_name: string;
  usageCount: number;
  averageRating?: number;
  similarWriters: number;
  reason: string;
  examples?: string[]; // "Used for 'Dark Knight' style scripts"
}

export interface UserProfile {
  userId: string;
  preferredGenres: string[];
  completedProjects: Array<{
    template_type: string;
    genre?: string;
    success_metric?: number; // completion rate, rating, etc.
  }>;
  writingStyle?: string;
}

/**
 * Collaborative Filtering: Find templates that similar writers used
 * This would typically use a recommendation algorithm, but we'll use AI to simulate
 */
export async function getCollaborativeRecommendations(
  userProfile: UserProfile,
  currentProject?: {
    logline?: string;
    genre?: string;
  }
): Promise<CollaborativeRecommendation[]> {
  const systemPrompt = `You are a recommendation engine for screenwriters.

Based on a user's writing profile and current project, recommend templates that similar writers have used successfully.

Consider:
- Genre preferences
- Past template usage
- Success patterns
- Current project context

Return JSON array:
[
  {
    "template_type": "tv_drama",
    "template_name": "TV Drama (1-Hour)",
    "usageCount": 127,
    "averageRating": 4.6,
    "similarWriters": 89,
    "reason": "Writers who completed Sci-Fi features often expand into TV drama format",
    "examples": ["Used for Breaking Bad-style pilots", "Complex character-driven stories"]
  }
]`;

  const userPrompt = `User Profile:
- Preferred Genres: ${userProfile.preferredGenres.join(', ')}
- Completed Projects: ${userProfile.completedProjects.length}
- Past Templates: ${userProfile.completedProjects.map(p => p.template_type).join(', ')}

${currentProject ? `Current Project:
- Logline: ${currentProject.logline || 'N/A'}
- Genre: ${currentProject.genre || 'N/A'}` : ''}

Recommend templates based on collaborative filtering.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result.recommendations || [];
}

// ============================================================================
// 5. CONTEXT-AWARE PLACEHOLDERS
// ============================================================================

export interface ContextAwarePlaceholder {
  elementType: 'scene_heading' | 'action' | 'character' | 'dialogue' | 'transition';
  suggestion: string;
  context: string;
  alternatives?: string[];
}

export async function generateContextAwarePlaceholder(
  elementType: 'scene_heading' | 'action' | 'character' | 'dialogue' | 'transition',
  context: {
    logline: string;
    genre?: string;
    previousContent?: string; // Last few lines/scenes
    characterName?: string; // For dialogue
    location?: string; // For scene headings
  }
): Promise<ContextAwarePlaceholder> {
  const systemPrompt = `You are a creative writing assistant helping screenwriters with context-aware suggestions.

Generate appropriate placeholder content based on:
- Story logline
- Genre/tone
- Previous content (for continuity)
- Element type (scene heading, action, dialogue, etc.)

Guidelines:
SCENE HEADINGS: INT./EXT. LOCATION - TIME
ACTION: Present tense, visual, concise (3-4 lines max)
DIALOGUE: Character-appropriate, subtext, natural speech
TRANSITIONS: CUT TO:, DISSOLVE TO:, FADE TO:, etc. (use sparingly)

Return JSON:
{
  "elementType": "action",
  "suggestion": "Sarah hesitates at the door, her hand trembling on the handle. Through the frosted glass, shadows move.",
  "context": "Building tension before protagonist enters mysterious location",
  "alternatives": [
    "Sarah takes a deep breath and pushes through the door.",
    "The door creaks open. Sarah steps inside, squinting into darkness."
  ]
}`;

  const userPrompt = `Element Type: ${elementType}
Logline: "${context.logline}"
Genre: ${context.genre || 'unknown'}
${context.characterName ? `Character: ${context.characterName}` : ''}
${context.location ? `Location: ${context.location}` : ''}

${context.previousContent ? `Previous Content:\n${context.previousContent}` : ''}

Generate a context-aware ${elementType} placeholder.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate similarity score between two writers based on their profiles
 */
export function calculateWriterSimilarity(
  profile1: UserProfile,
  profile2: UserProfile
): number {
  let score = 0;

  // Genre overlap (40% weight)
  const genreOverlap = profile1.preferredGenres.filter(g =>
    profile2.preferredGenres.includes(g)
  ).length;
  score += (genreOverlap / Math.max(profile1.preferredGenres.length, 1)) * 0.4;

  // Template usage overlap (40% weight)
  const templates1 = profile1.completedProjects.map(p => p.template_type);
  const templates2 = profile2.completedProjects.map(p => p.template_type);
  const templateOverlap = templates1.filter(t => templates2.includes(t)).length;
  score += (templateOverlap / Math.max(templates1.length, 1)) * 0.4;

  // Writing style (20% weight - if available)
  if (profile1.writingStyle && profile2.writingStyle) {
    score += profile1.writingStyle === profile2.writingStyle ? 0.2 : 0;
  }

  return Math.min(score, 1); // Cap at 1.0
}

/**
 * Extract story beats from screenplay content using page markers
 */
export function extractStoryBeats(content: string): Array<{
  name: string;
  page: number;
  content: string;
}> {
  const beats: Array<{ name: string; page: number; content: string }> = [];

  // This is a simplified extraction - real implementation would use
  // more sophisticated parsing
  const lines = content.split('\n');
  let currentPage = 1;

  // Look for common beat markers in action lines
  const beatPatterns = [
    /OPENING IMAGE/i,
    /CATALYST|INCITING INCIDENT/i,
    /BREAK INTO TWO/i,
    /MIDPOINT/i,
    /ALL IS LOST/i,
    /BREAK INTO THREE/i,
    /FINALE|CLIMAX/i,
  ];

  for (const line of lines) {
    if (line.includes('PAGE')) {
      const match = line.match(/PAGE (\d+)/);
      if (match) currentPage = parseInt(match[1]);
    }

    for (const pattern of beatPatterns) {
      if (pattern.test(line)) {
        beats.push({
          name: line.trim(),
          page: currentPage,
          content: line,
        });
      }
    }
  }

  return beats;
}
