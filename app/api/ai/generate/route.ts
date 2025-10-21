import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { generateWithAI, type AIModel } from '@/lib/ai/service'
import { getMonthlyAIWordLimit } from '@/lib/stripe/config'
import { checkAIRequestQuota } from '@/lib/account/quota'
import { classifyIntent, type AICommand } from '@/lib/ai/intent'
import { logger } from '@/lib/monitoring/structured-logger'
import { PerformanceTimer } from '@/lib/monitoring/performance'
import { checkAIRateLimit, createAIRateLimitResponse } from '@/lib/security/ai-rate-limit'
import { routeAIRequest } from '@/lib/ai/router'
import { errorResponses, successResponse } from '@/lib/api/error-response'
import { validateBody, validationErrorResponse } from '@/lib/validation/middleware'
import { aiGenerateSchema } from '@/lib/validation/schemas'
import { detectXSSPatterns, detectSQLInjection } from '@/lib/security/sanitize'
import {
  buildContextBundle,
  generateContextPrompt,
  buildContextPreview,
  estimateTokens,
  type ContextBundle,
  type ContextPreview,
  type StoryBibleEntry,
  type TimelineEvent,
  type ContextExcerpt,
  type ProjectMetadata,
} from '@/lib/ai/context-manager'
import {
  mapSnapshotToContextExcerpt,
  mapWorldElementToStoryBibleEntry,
} from '@/lib/ai/context-helpers'

// Note: These constants are kept for documentation but validation is now handled by Zod schemas
const _MAX_PROMPT_LENGTH = 5000
const _MAX_COMPLETION_TOKENS = 3000
const DEFAULT_MAX_TOKENS = 2000
const _ALLOWED_MODELS: AIModel[] = [
  'claude-sonnet-4.5',
  'gpt-5',
  'deepseek-chat',
]
const CONTEXT_TOKEN_BUDGET = 2200
const CONTEXT_RESERVE_RATIO = 0.1

// Force dynamic rendering - don't try to statically analyze this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Apply rate limiting first (before any expensive operations)
  const rateLimitCheck = await checkAIRateLimit(request)
  if (!rateLimitCheck.allowed) {
    return createAIRateLimitResponse(rateLimitCheck.retryAfter)
  }

  const supabase = await createClient()
  let classification: ReturnType<typeof classifyIntent> | null = null
  let selectedModel: AIModel | null = null
  let command: AICommand | null = null
  let requestId: string | null = null
  let documentProjectId: string | null = null
  let documentIdValue: string | null = null
  let explicitModel: AIModel | null = null
  let routingDecision: ReturnType<typeof routeAIRequest> | null = null
  let sanitizedPrompt = ''
  let selectionValue: string | undefined
  let sanitizedContext: string | undefined
  let generatedContext = ''
  let generatedContextTokens = 0
  let contextWarnings: string[] = []
  let contextPreview: ContextPreview | null = null
  let contextBundle: ContextBundle | null = null
  let explicitContextTokens = 0
  let selectionTokensEstimate = 0
  let userId: string | null = null
  const startedAt = Date.now()
  const timer = new PerformanceTimer('ai_generation', 'ai_generation')

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponses.unauthorized()
    }
    userId = user.id

    // Get user profile to check subscription and usage
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return errorResponses.notFound('User profile not found')
    }

    const plan = profile.subscription_tier || 'free'

    const requestQuota = await checkAIRequestQuota(supabase, user.id, plan, 1)
    if (!requestQuota.allowed) {
      const formattedPlan = plan.charAt(0).toUpperCase() + plan.slice(1)
      return errorResponses.tooManyRequests(
        `You have reached the ${formattedPlan} plan limit of ${requestQuota.limit} AI requests this month.`,
        undefined,
        {
          code: 'AI_REQUEST_LIMIT_EXCEEDED',
          details: {
            limit: requestQuota.limit,
            used: requestQuota.used,
            upgradeRequired: true,
          },
          userId: user.id,
        }
      )
    }

    const monthlyLimit = getMonthlyAIWordLimit(plan)
    const currentUsage = profile.ai_words_used_this_month || 0

    if (currentUsage >= monthlyLimit) {
      return errorResponses.tooManyRequests(
        'Monthly AI word limit exceeded',
        undefined,
        {
          code: 'AI_WORD_LIMIT_EXCEEDED',
          details: {
            limit: monthlyLimit,
            used: currentUsage,
            upgradeRequired: true,
          },
          userId: user.id,
        }
      )
    }

    // Validate request body with Zod schema
    const validation = await validateBody(request, aiGenerateSchema)
    if (!validation.success) {
      return validationErrorResponse(validation, user.id)
    }

    // TypeScript: After success check, data is guaranteed to exist
    const validated = validation.data!
    const {
      prompt,
      documentId,
      command: commandHint,
      selection,
      context,
      model,
      projectId: _projectId, // Available but not used directly in this route
    } = validated

    // Security: Detect malicious patterns in prompt
    if (detectXSSPatterns(prompt) || detectSQLInjection(prompt)) {
      logger.warn('Malicious patterns detected in AI prompt', {
        operation: 'ai_generate:validation',
        userId: user.id,
        xss: detectXSSPatterns(prompt),
        sql: detectSQLInjection(prompt),
      })
      // Still allow the request but log it for monitoring
    }

    sanitizedPrompt = prompt.trim()
    sanitizedContext = context ? context.trim() : undefined
    const commandHintValue = commandHint
    selectionValue = selection
    explicitModel = model as AIModel | null
    documentIdValue = documentId || null

    classification = classifyIntent({
      prompt: sanitizedPrompt,
      commandHint: commandHintValue,
      selection: selectionValue,
      context: sanitizedContext,
    })
    command = classification.command

    // Model validation already handled by Zod schema
    const safeMaxTokens = DEFAULT_MAX_TOKENS // Note: maxTokens not in schema yet, using default

    let documentTokenEstimate = 0
    if (documentIdValue) {
      const { data: documentRow } = await supabase
        .from('documents')
        .select('project_id, word_count')
        .eq('id', documentIdValue)
        .eq('user_id', user.id)
        .single()
      if (documentRow && documentRow.project_id) {
        documentProjectId = documentRow.project_id
      }
      if (documentRow && typeof documentRow.word_count === 'number' && documentRow.word_count > 0) {
        documentTokenEstimate = Math.ceil(documentRow.word_count * 1.3)
      }
    }

    explicitContextTokens = sanitizedContext ? estimateTokens(sanitizedContext) : 0
    const promptTokensEstimate = estimateTokens(sanitizedPrompt)
    selectionTokensEstimate = selectionValue ? estimateTokens(selectionValue) : 0

    const selectionContextSegment = selectionValue
      ? `ACTIVE SELECTION:\n${selectionValue}`
      : undefined

    const contextData = documentProjectId
      ? await fetchProjectContext(supabase, user.id, documentProjectId)
      : null

    if (contextData) {
      const recentExcerpts: ContextExcerpt[] = [...contextData.excerpts]
      if (selectionValue) {
        recentExcerpts.unshift({
          id: `selection-${Date.now()}`,
          label: 'Active selection',
          content: selectionValue,
          source: 'scene',
          createdAt: new Date().toISOString(),
        })
      }

      contextBundle = buildContextBundle({
        project: contextData.project,
        storyBible: contextData.storyBible,
        timeline: contextData.timeline,
        recentExcerpts,
        tokenBudget: CONTEXT_TOKEN_BUDGET,
      })
      contextWarnings = contextBundle.warnings
      contextPreview = buildContextPreview(contextBundle)

      const availableGeneratedContextTokens = Math.max(
        0,
        CONTEXT_TOKEN_BUDGET - explicitContextTokens
      )

      if (availableGeneratedContextTokens > 0) {
        const generated = generateContextPrompt(contextBundle, {
          maxTokens: availableGeneratedContextTokens,
          reserveTokens: Math.floor(availableGeneratedContextTokens * CONTEXT_RESERVE_RATIO),
          includeTimeline: contextBundle.timeline.length > 0,
          includeExcerpts: contextBundle.recentExcerpts.length > 0,
        })
        generatedContext = generated.prompt
        generatedContextTokens = generated.usedTokens
        if (generated.omittedEntries.length > 0) {
          contextWarnings.push('Some context entries were omitted to stay within token limits.')
        }
      }
    }

    if (contextWarnings.length > 0) {
      contextWarnings = Array.from(new Set(contextWarnings))
    }

    const combinedContextSegments = [
      sanitizedContext,
      selectionContextSegment,
      generatedContext,
    ].filter((segment): segment is string => Boolean(segment && segment.trim().length))

    const combinedContext =
      combinedContextSegments.length > 0 ? combinedContextSegments.join('\n\n') : undefined

    const aggregateContextTokens =
      promptTokensEstimate +
      explicitContextTokens +
      selectionTokensEstimate +
      generatedContextTokens

    routingDecision = routeAIRequest({
      classification,
      selectionLength: selectionTokensEstimate,
      documentLength:
        documentTokenEstimate || Math.max(promptTokensEstimate, selectionTokensEstimate, 1),
      estimatedContextTokens: aggregateContextTokens,
      userTier: normalizeSubscriptionTier(plan),
      override: explicitModel
        ? {
            forcedModel: explicitModel,
            rationale: 'User selected model',
          }
        : undefined,
    })

    selectedModel = routingDecision.model

    logger.debug('AI routing decision', {
      userId: user.id,
      operation: command || classification.command,
      model: selectedModel,
      confidence: routingDecision.confidence,
      rationale: routingDecision.rationale,
      alternatives: routingDecision.alternatives,
    })

    // Generate AI response
    const response = await generateWithAI({
      model: selectedModel,
      prompt: sanitizedPrompt,
      context: combinedContext,
      maxTokens: safeMaxTokens,
    })

    // Calculate word count from generated content
    const wordsGenerated = response.content.trim().split(/\s+/).length

    // Track AI usage in database
    await supabase.from('ai_usage').insert([
      {
        user_id: user.id,
        document_id: documentIdValue,
        model: response.model,
        words_generated: wordsGenerated,
        prompt_tokens: response.usage.inputTokens,
        completion_tokens: response.usage.outputTokens,
        total_cost: response.usage.totalCost,
        prompt_preview: sanitizedPrompt.substring(0, 200),
      },
    ])

    const latencyMs = Date.now() - startedAt

    const { data: requestInsert } = await supabase
      .from('ai_requests')
      .insert({
        user_id: user.id,
        document_id: documentIdValue,
        project_id: documentProjectId,
        command,
        intent: classification.intent,
        requested_model: explicitModel,
        selected_model: selectedModel,
        words_generated: wordsGenerated,
        prompt_tokens: response.usage.inputTokens,
        completion_tokens: response.usage.outputTokens,
        latency_ms: latencyMs,
        status: 'succeeded',
        prompt_preview: sanitizedPrompt.substring(0, 200),
        selection_preview: selectionValue ? selectionValue.substring(0, 200) : null,
        routing_metadata: routingDecision
          ? {
              model: routingDecision.model,
              confidence: routingDecision.confidence,
              intent: routingDecision.intent.intent,
              manualOverride: Boolean(explicitModel),
              rationale: routingDecision.rationale,
            }
          : null,
        context_tokens: {
          explicit: explicitContextTokens,
          generated: generatedContextTokens,
          selection: selectionTokensEstimate,
        },
        context_warnings: contextWarnings.length > 0 ? contextWarnings : null,
      })
      .select('id')
      .single()
    requestId = requestInsert?.id ?? null

    // Update user's monthly AI word usage
    await supabase
      .from('user_profiles')
      .update({
        ai_words_used_this_month: currentUsage + wordsGenerated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    try {
      await supabase.rpc('refresh_user_plan_usage', { p_user_id: user.id })
    } catch (refreshError) {
      logger.warn('refresh_user_plan_usage failed after AI generation', {
        userId: user.id,
        operation: 'refresh_user_plan_usage',
      }, refreshError instanceof Error ? refreshError : undefined)
    }

    // Log successful AI generation with structured logging
    logger.aiRequest({
      operation: command || 'generate',
      model: selectedModel,
      promptLength: sanitizedPrompt.length,
      completionLength: response.content.length,
      duration: latencyMs,
      tokensUsed: response.usage.inputTokens + response.usage.outputTokens,
      cost: response.usage.totalCost,
      userId: user.id,
      documentId: documentIdValue || undefined,
      success: true,
      routing: routingDecision
        ? {
            model: routingDecision.model,
            confidence: routingDecision.confidence,
            intent: routingDecision.intent.intent,
            manualOverride: Boolean(explicitModel),
            rationale: routingDecision.rationale,
          }
        : undefined,
      contextTokens: {
        explicit: explicitContextTokens,
        generated: generatedContextTokens,
        selection: selectionTokensEstimate,
      },
    })

    timer.end(true, {
      model: selectedModel,
      wordsGenerated,
      tokensUsed: response.usage.inputTokens + response.usage.outputTokens,
    })

    const responsePayload = {
      content: response.content,
      usage: {
        ...response.usage,
        wordsGenerated,
        monthlyUsed: currentUsage + wordsGenerated,
        monthlyLimit,
        percentUsed: Math.round(((currentUsage + wordsGenerated) / monthlyLimit) * 100),
      },
      model: selectedModel,
      command,
      requestId,
      intent: classification.intent,
      routing: routingDecision,
      contextPreview: contextPreview ? sanitizeContextPreview(contextPreview) : null,
      contextWarnings: contextWarnings.slice(0, 5),
      contextTokens: {
        explicit: explicitContextTokens,
        generated: generatedContextTokens,
        selection: selectionTokensEstimate,
      },
    }

    return successResponse(responsePayload)
  } catch (error) {
    // Log AI generation failure with structured logging
    logger.aiRequest({
      operation: command || 'generate',
      model: selectedModel || 'unknown',
      promptLength: sanitizedPrompt.length,
      duration: Date.now() - startedAt,
      userId: userId || undefined,
      documentId: documentIdValue || undefined,
      success: false,
      routing: routingDecision
        ? {
            model: routingDecision.model,
            confidence: routingDecision.confidence,
            intent: routingDecision.intent.intent,
            manualOverride: Boolean(explicitModel),
            rationale: routingDecision.rationale,
          }
        : undefined,
      contextTokens: {
        explicit: explicitContextTokens,
        generated: generatedContextTokens,
        selection: selectionTokensEstimate,
      },
      error: error instanceof Error ? error : new Error(String(error)),
    })

    timer.end(false, {
      errorMessage: error instanceof Error ? error.message : String(error),
    })

    if (classification && selectedModel && userId) {
      try {
        await supabase.from('ai_requests').insert({
          user_id: userId,
          document_id: documentIdValue,
          project_id: documentProjectId,
          command: classification.command,
          intent: classification.intent,
          requested_model: explicitModel,
          selected_model: selectedModel,
          words_generated: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          latency_ms: Date.now() - startedAt,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          prompt_preview: sanitizedPrompt.substring(0, 200) || null,
          selection_preview: selectionValue ? selectionValue.substring(0, 200) : null,
          routing_metadata: routingDecision
            ? {
                model: routingDecision.model,
                confidence: routingDecision.confidence,
                intent: routingDecision.intent.intent,
                manualOverride: Boolean(explicitModel),
                rationale: routingDecision.rationale,
              }
            : null,
          context_tokens: {
            explicit: explicitContextTokens,
            generated: generatedContextTokens,
            selection: selectionTokensEstimate,
          },
          context_warnings: contextWarnings.length > 0 ? contextWarnings : null,
        })
      } catch (logError) {
        logger.error('Failed to log AI request failure', {
          userId,
          operation: 'log_ai_failure',
        }, logError instanceof Error ? logError : undefined)
      }
    }
    return errorResponses.internalError('Failed to generate AI response', {
      details: error,
      userId: userId || undefined,
    })
  }
}

function normalizeSubscriptionTier(
  tier: string | null | undefined
): 'free' | 'hobbyist' | 'professional' | 'studio' {
  const normalized = (tier ?? 'free').toLowerCase()
  switch (normalized) {
    case 'free':
    case 'starter':
      return 'free'
    case 'hobbyist':
    case 'creator':
      return 'hobbyist'
    case 'professional':
    case 'pro':
      return 'professional'
    case 'studio':
    case 'enterprise':
      return 'studio'
    default:
      return 'free'
  }
}

type ProjectContextData = {
  project: ProjectMetadata | null
  storyBible: StoryBibleEntry[]
  timeline: TimelineEvent[]
  excerpts: ContextExcerpt[]
}

async function fetchProjectContext(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<ProjectContextData | null> {
  const [projectRes, charactersRes, locationsRes, eventsRes, worldElementsRes, documentsRes] =
    await Promise.all([
    supabase
      .from('projects')
      .select('id, name, type, genre, description')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('characters')
      .select(
        'id, name, role, importance, personality_traits, backstory, story_function, character_arc, tags, last_appearance, updated_at'
      )
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('importance', { ascending: false })
      .limit(25),
    supabase
      .from('locations')
      .select(
        'id, name, category, summary, history, culture, climate, key_features, tags, updated_at'
      )
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('location_events')
      .select('id, title, description, occurs_at, importance, location_id, created_at')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('world_elements')
      .select('id, name, type, summary, description, tags, properties, updated_at')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('documents')
      .select('id, title, type, updated_at')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(25),
  ])

  if (projectRes.error && projectRes.status !== 406) {
    logger.warn('Failed to load project metadata for context', {
      operation: 'fetch_project_context',
      projectId,
      userId,
    }, projectRes.error)
  }

  if (charactersRes.error && charactersRes.status !== 406) {
    logger.warn('Failed to load characters for context', {
      operation: 'fetch_project_context',
      projectId,
      userId,
    }, charactersRes.error)
  }

  if (locationsRes.error && locationsRes.status !== 406) {
    logger.warn('Failed to load locations for context', {
      operation: 'fetch_project_context',
      projectId,
      userId,
    }, locationsRes.error)
  }

  if (eventsRes.error && eventsRes.status !== 406) {
    logger.warn('Failed to load timeline events for context', {
      operation: 'fetch_project_context',
      projectId,
      userId,
    }, eventsRes.error)
  }

  if (worldElementsRes.error && worldElementsRes.status !== 406) {
    logger.warn('Failed to load world elements for context', {
      operation: 'fetch_project_context',
      projectId,
      userId,
    }, worldElementsRes.error)
  }

  if (documentsRes.error && documentsRes.status !== 406) {
    logger.warn('Failed to load project documents for context', {
      operation: 'fetch_project_context',
      projectId,
      userId,
    }, documentsRes.error)
  }

  const project: ProjectMetadata | null = projectRes.data
    ? mapProjectToMetadata(projectRes.data)
    : null

  const characterEntries =
    charactersRes.data?.map((record) => mapCharacterToStoryBibleEntry(record)) ?? []
  const locationEntries =
    locationsRes.data?.map((record) => mapLocationToStoryBibleEntry(record)) ?? []
  const worldElementEntries =
    worldElementsRes.data
      ?.filter((record) => record.type !== 'location')
      .map((record) => mapWorldElementToStoryBibleEntry(record)) ?? []

  const documents = documentsRes.data ?? []
  const documentLookup = new Map<string, { title: string; type?: string | null }>()
  for (const doc of documents) {
    if (doc.id) {
      documentLookup.set(doc.id, { title: doc.title, type: doc.type })
    }
  }

  let snapshotEntries: ContextExcerpt[] = []
  if (documentLookup.size > 0) {
    const documentIds = Array.from(documentLookup.keys())
    const { data: snapshotsData, error: snapshotsError, status: snapshotsStatus } = await supabase
      .from('document_snapshots')
      .select('id, document_id, created_at, payload, metadata')
      .in('document_id', documentIds)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (snapshotsError && snapshotsStatus !== 406) {
      logger.warn('Failed to load document snapshots for context', {
        operation: 'fetch_project_context',
        projectId,
        userId,
      }, snapshotsError)
    }

    snapshotEntries =
      snapshotsData
        ?.map((record) => mapSnapshotToContextExcerpt(record, documentLookup))
        .filter((entry): entry is ContextExcerpt => Boolean(entry)) ?? []
  }

  const locationNameLookup = new Map<string, string>()
  for (const location of locationsRes.data ?? []) {
    if (location.id && location.name) {
      locationNameLookup.set(location.id, location.name)
    }
  }

  const timelineEntries =
    eventsRes.data?.map((record) => mapEventToTimeline(record, locationNameLookup)) ?? []

  return {
    project,
    storyBible: [...characterEntries, ...locationEntries, ...worldElementEntries],
    timeline: timelineEntries,
    excerpts: snapshotEntries,
  }
}

function mapProjectToMetadata(record: {
  id: string
  name: string
  type?: string | null
  genre?: string[] | null
  description?: string | null
}): ProjectMetadata {
  return {
    projectId: record.id,
    title: record.name,
    genre: Array.isArray(record.genre) && record.genre.length > 0 ? record.genre.join(', ') : undefined,
    pov: undefined,
    tone: undefined,
    setting: record.description ?? undefined,
  }
}

function mapCharacterToStoryBibleEntry(record: any): StoryBibleEntry {
  const summaryParts = [
    record.backstory,
    record.story_function ? `Function: ${record.story_function}` : null,
    record.character_arc,
  ].filter(Boolean)

  return {
    id: record.id,
    name: record.name,
    entityType: 'character',
    summary: summaryParts.join('\n\n') || 'No character summary available yet.',
    traits: Array.isArray(record.personality_traits) ? record.personality_traits : [],
    lastKnownStatus: record.last_appearance ?? undefined,
    importance: mapCharacterImportance(record.role, record.importance),
    updatedAt: record.updated_at ?? undefined,
    tags: Array.isArray(record.tags) ? record.tags : undefined,
  }
}

function mapLocationToStoryBibleEntry(record: any): StoryBibleEntry {
  const summaryParts = [
    record.summary,
    record.history,
    record.culture ? `Culture: ${record.culture}` : null,
  ].filter(Boolean)

  const features =
    Array.isArray(record.key_features) && record.key_features.length > 0
      ? record.key_features
      : undefined

  return {
    id: record.id,
    name: record.name,
    entityType: 'location',
    summary: summaryParts.join('\n\n') || 'No location details recorded yet.',
    traits: features,
    lastKnownStatus: record.climate ?? undefined,
    importance: mapLocationImportance(record.category),
    updatedAt: record.updated_at ?? undefined,
    tags: Array.isArray(record.tags) ? record.tags : undefined,
  }
}

function mapEventToTimeline(
  record: any,
  locationLookup: Map<string, string>
): TimelineEvent {
  const timestamp = record.occurs_at || record.created_at || new Date().toISOString()
  const locationName = record.location_id ? locationLookup.get(record.location_id) : undefined
  return {
    id: record.id,
    title: record.title,
    summary: record.description ?? '',
    timestamp,
    importance: record.importance >= 7 ? 'major' : 'minor',
    location: locationName,
  }
}

function mapCharacterImportance(
  role?: string | null,
  score?: number | null
): 'main' | 'supporting' | 'minor' {
  if (!role && !score) return 'minor'
  if (role === 'protagonist' || role === 'antagonist' || (score ?? 0) >= 8) {
    return 'main'
  }
  if ((score ?? 0) >= 4) {
    return 'supporting'
  }
  return 'minor'
}

function mapLocationImportance(category?: string | null): 'main' | 'supporting' | 'minor' {
  switch (category) {
    case 'settlement':
    case 'realm':
      return 'main'
    case 'region':
    case 'landmark':
      return 'supporting'
    default:
      return 'minor'
  }
}

function sanitizeContextPreview(preview: ContextPreview): ContextPreview {
  const truncate = (text: string | undefined, max = 220) =>
    text && text.length > max ? `${text.slice(0, max)}…` : text

  return {
    project: preview.project
      ? {
          ...preview.project,
          title: truncate(preview.project.title, 120) ?? '',
          genre: truncate(preview.project.genre, 160),
          setting: truncate(preview.project.setting, 220),
        }
      : null,
    topCharacters: preview.topCharacters.map((entry) => ({
      ...entry,
      summary: truncate(entry.summary) ?? '',
      traits: entry.traits ? entry.traits.slice(0, 6) : undefined,
      tags: entry.tags ? entry.tags.slice(0, 6) : undefined,
    })),
    topLocations: preview.topLocations.map((entry) => ({
      ...entry,
      summary: truncate(entry.summary) ?? '',
      traits: entry.traits ? entry.traits.slice(0, 6) : undefined,
      tags: entry.tags ? entry.tags.slice(0, 6) : undefined,
    })),
    upcomingEvents: preview.upcomingEvents.slice(0, 5).map((event) => ({
      ...event,
      summary: truncate(event.summary) ?? '',
    })),
    recentExcerpts: preview.recentExcerpts.slice(0, 3).map((excerpt) => ({
      ...excerpt,
      content: truncate(excerpt.content, 280) ?? '',
    })),
  }
}
