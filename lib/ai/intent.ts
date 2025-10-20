import type { AIModel } from '@/lib/ai/service'

export type AICommand =
  | 'continue'
  | 'rewrite'
  | 'shorten'
  | 'expand'
  | 'tone_shift'
  | 'summarize'
  | 'brainstorm'
  | 'notes'

export type IntentClassification = {
  command: AICommand
  intent: string
  recommendedModel: AIModel
  confidence: number
  rationale: string
}

type ClassifyParams = {
  prompt: string
  commandHint?: string | null
  selection?: string | null
  context?: string | null
}

const COMMAND_MODEL_MAP: Record<AICommand, AIModel> = {
  continue: 'claude-sonnet-4.5',
  rewrite: 'gpt-5',
  shorten: 'deepseek-chat',
  expand: 'claude-sonnet-4.5',
  tone_shift: 'gpt-5',
  summarize: 'deepseek-chat',
  brainstorm: 'claude-sonnet-4.5',
  notes: 'gpt-5',
}

const NORMALIZED_COMMANDS: Record<string, AICommand> = {
  continue: 'continue',
  expand: 'expand',
  extend: 'expand',
  rewrite: 'rewrite',
  revise: 'rewrite',
  edit: 'rewrite',
  shorten: 'shorten',
  compress: 'shorten',
  tone: 'tone_shift',
  tone_shift: 'tone_shift',
  retone: 'tone_shift',
  summarize: 'summarize',
  summary: 'summarize',
  brainstorm: 'brainstorm',
  ideas: 'brainstorm',
  notes: 'notes',
  feedback: 'notes',
}

export function classifyIntent({
  prompt,
  commandHint,
  selection,
  context,
}: ClassifyParams): IntentClassification {
  const normalizedPrompt = prompt.toLowerCase()
  const normalizedSelection = selection?.trim()?.toLowerCase() ?? ''
  const normalizedCommand = commandHint?.toLowerCase() ?? ''

  if (normalizedCommand && NORMALIZED_COMMANDS[normalizedCommand]) {
    const command = NORMALIZED_COMMANDS[normalizedCommand]
    return buildResult(command, `Explicit command hint "${commandHint}"`)
  }

  const keywordResult = matchByKeyword(normalizedPrompt, normalizedSelection)
  if (keywordResult) {
    return keywordResult
  }

  if (normalizedSelection.length > 0) {
    return buildResult('rewrite', 'Selection detected without explicit instruction; leaning rewrite', 0.55)
  }

  if (context && context.length > 6000) {
    return buildResult('summarize', 'Very large context provided; assuming summary', 0.4)
  }

  return buildResult('continue', 'Defaulting to continue when intent ambiguous', 0.2)
}

function matchByKeyword(prompt: string, selection: string): IntentClassification | null {
  const keywordPatterns: Array<{ command: AICommand; patterns: RegExp[]; rationale: string }> = [
    {
      command: 'continue',
      patterns: [/\bcontinue\b/, /\bnext scene\b/, /\bkeep going\b/],
      rationale: 'Prompt references continuing the draft',
    },
    {
      command: 'rewrite',
      patterns: [/\brewrite\b/, /\brephrase\b/, /\bclean up\b/, /\bpolish\b/],
      rationale: 'Prompt asks for rewriting or polishing',
    },
    {
      command: 'shorten',
      patterns: [/\bshorten\b/, /\bcondense\b/, /\bmake it shorter\b/, /\btrim\b/],
      rationale: 'Prompt requests a shorter version',
    },
    {
      command: 'expand',
      patterns: [/\bexpand\b/, /\belaborate\b/, /\bmake it longer\b/, /\badd detail\b/],
      rationale: 'Prompt asks to elaborate or add detail',
    },
    {
      command: 'tone_shift',
      patterns: [/\bchange the tone\b/, /\badjust tone\b/, /\bmake it (?:darker|lighter|happier|scarier)\b/],
      rationale: 'Prompt requests tone adjustments',
    },
    {
      command: 'summarize',
      patterns: [/\bsummarize\b/, /\bgive me a summary\b/, /\bbullet points\b/, /\btl;dr\b/],
      rationale: 'Prompt explicitly asks for a summary',
    },
    {
      command: 'brainstorm',
      patterns: [/\bideas\b/, /\bbrainstorm\b/, /\bwhat if\b/, /\bconcepts\b/],
      rationale: 'Prompt seeks idea generation',
    },
    {
      command: 'notes',
      patterns: [/\bfeedback\b/, /\bnotes\b/, /\bcritique\b/, /\bwhat's wrong\b/],
      rationale: 'Prompt seeks critique or notes',
    },
  ]

  for (const entry of keywordPatterns) {
    if (entry.patterns.some((pattern) => pattern.test(prompt))) {
      return buildResult(entry.command, entry.rationale, 0.8)
    }
  }

  if (selection.length > 0) {
    if (/\bshort|tighten|trim\b/.test(prompt)) {
      return buildResult('shorten', 'Selection provided with shortening keywords', 0.7)
    }
    if (/\bexpand|add detail|more vivid\b/.test(prompt)) {
      return buildResult('expand', 'Selection provided with expansion cues', 0.7)
    }
  }

  return null
}

function buildResult(command: AICommand, rationale: string, confidence = 0.6): IntentClassification {
  return {
    command,
    intent: command,
    recommendedModel: COMMAND_MODEL_MAP[command],
    confidence,
    rationale,
  }
}
