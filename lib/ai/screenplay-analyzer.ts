/**
 * AI-Powered Screenplay Analysis
 * Analyzes screenplay structure, pacing, plot points, and character arcs
 */

import type { Scene } from '@/lib/screenplay/scene-parser'
import { generateWithAI } from './service'

export type ActStructure = {
  act: 1 | 2 | 3
  startScene: number
  endScene: number
  duration: number // in minutes
  percentage: number // percentage of total screenplay
  sceneCount: number
}

export type PlotPoint = {
  name: string
  type: 'inciting-incident' | 'plot-point-1' | 'midpoint' | 'plot-point-2' | 'climax' | 'resolution'
  sceneNumber: number
  description: string
  timestamp: number // Minutes into screenplay
  confidence: number // 0-100
}

export type PacingIssue = {
  type: 'too-fast' | 'too-slow' | 'uneven' | 'dialogue-heavy' | 'action-heavy'
  location: string
  sceneNumbers: number[]
  severity: 'low' | 'medium' | 'high'
  recommendation: string
}

export type CharacterArcAnalysis = {
  character: string
  arcType: 'positive' | 'negative' | 'flat' | 'complex'
  scenes: number[]
  development: string
  strengths: string[]
  weaknesses: string[]
}

export type ScreenplayAnalysis = {
  structure: {
    acts: ActStructure[]
    followsThreeAct: boolean
    structureScore: number // 0-100
    issues: string[]
  }
  plotPoints: PlotPoint[]
  pacing: {
    overallPace: 'fast' | 'moderate' | 'slow'
    issues: PacingIssue[]
    actBalance: {
      act1: number
      act2: number
      act3: number
    }
    recommendation: string
  }
  characterArcs: CharacterArcAnalysis[]
  industryComparison: {
    genre: string
    lengthComparison: string
    structureComparison: string
    pacingComparison: string
    recommendations: string[]
  }
  overallScore: number // 0-100
}

/**
 * Detect three-act structure from scenes
 */
export function detectThreeActStructure(scenes: Scene[]): ActStructure[] {
  const totalScenes = scenes.length
  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0)

  // Industry standard: Act 1 ~25%, Act 2 ~50%, Act 3 ~25%
  // Allow some variance: Act 1: 20-30%, Act 2: 45-55%, Act 3: 20-30%

  const act1End = Math.floor(totalScenes * 0.25)
  const act2End = Math.floor(totalScenes * 0.75)

  const act1Scenes = scenes.slice(0, act1End)
  const act2Scenes = scenes.slice(act1End, act2End)
  const act3Scenes = scenes.slice(act2End)

  const act1Duration = act1Scenes.reduce((sum, s) => sum + (s.duration || 0), 0)
  const act2Duration = act2Scenes.reduce((sum, s) => sum + (s.duration || 0), 0)
  const act3Duration = act3Scenes.reduce((sum, s) => sum + (s.duration || 0), 0)

  return [
    {
      act: 1,
      startScene: 1,
      endScene: act1End,
      duration: act1Duration,
      percentage: (act1Duration / totalDuration) * 100,
      sceneCount: act1Scenes.length,
    },
    {
      act: 2,
      startScene: act1End + 1,
      endScene: act2End,
      duration: act2Duration,
      percentage: (act2Duration / totalDuration) * 100,
      sceneCount: act2Scenes.length,
    },
    {
      act: 3,
      startScene: act2End + 1,
      endScene: totalScenes,
      duration: act3Duration,
      percentage: (act3Duration / totalDuration) * 100,
      sceneCount: act3Scenes.length,
    },
  ]
}

/**
 * Identify key plot points based on structure
 */
export function identifyPlotPoints(scenes: Scene[], acts: ActStructure[]): PlotPoint[] {
  const plotPoints: PlotPoint[] = []
  const totalScenes = scenes.length

  // Inciting Incident: ~10-15% (Act 1)
  const incitingScene = Math.floor(totalScenes * 0.12)
  if (scenes[incitingScene]) {
    plotPoints.push({
      name: 'Inciting Incident',
      type: 'inciting-incident',
      sceneNumber: incitingScene + 1,
      description: scenes[incitingScene].heading,
      timestamp: scenes.slice(0, incitingScene).reduce((sum, s) => sum + (s.duration || 0), 0),
      confidence: 75,
    })
  }

  // Plot Point 1: End of Act 1 (~25%)
  const pp1Scene = acts[0].endScene - 1
  if (scenes[pp1Scene]) {
    plotPoints.push({
      name: 'Plot Point 1',
      type: 'plot-point-1',
      sceneNumber: pp1Scene + 1,
      description: scenes[pp1Scene].heading,
      timestamp: scenes.slice(0, pp1Scene).reduce((sum, s) => sum + (s.duration || 0), 0),
      confidence: 85,
    })
  }

  // Midpoint: ~50%
  const midpointScene = Math.floor(totalScenes * 0.5)
  if (scenes[midpointScene]) {
    plotPoints.push({
      name: 'Midpoint',
      type: 'midpoint',
      sceneNumber: midpointScene + 1,
      description: scenes[midpointScene].heading,
      timestamp: scenes.slice(0, midpointScene).reduce((sum, s) => sum + (s.duration || 0), 0),
      confidence: 80,
    })
  }

  // Plot Point 2: End of Act 2 (~75%)
  const pp2Scene = acts[1].endScene - 1
  if (scenes[pp2Scene]) {
    plotPoints.push({
      name: 'Plot Point 2',
      type: 'plot-point-2',
      sceneNumber: pp2Scene + 1,
      description: scenes[pp2Scene].heading,
      timestamp: scenes.slice(0, pp2Scene).reduce((sum, s) => sum + (s.duration || 0), 0),
      confidence: 85,
    })
  }

  // Climax: ~90%
  const climaxScene = Math.floor(totalScenes * 0.9)
  if (scenes[climaxScene]) {
    plotPoints.push({
      name: 'Climax',
      type: 'climax',
      sceneNumber: climaxScene + 1,
      description: scenes[climaxScene].heading,
      timestamp: scenes.slice(0, climaxScene).reduce((sum, s) => sum + (s.duration || 0), 0),
      confidence: 70,
    })
  }

  // Resolution: Last scene
  if (scenes.length > 0) {
    const lastScene = scenes.length - 1
    plotPoints.push({
      name: 'Resolution',
      type: 'resolution',
      sceneNumber: lastScene + 1,
      description: scenes[lastScene].heading,
      timestamp: scenes.slice(0, lastScene).reduce((sum, s) => sum + (s.duration || 0), 0),
      confidence: 90,
    })
  }

  return plotPoints
}

/**
 * Analyze pacing issues
 */
export function analyzePacing(scenes: Scene[], acts: ActStructure[]): {
  overallPace: 'fast' | 'moderate' | 'slow'
  issues: PacingIssue[]
  actBalance: { act1: number; act2: number; act3: number }
  recommendation: string
} {
  const issues: PacingIssue[] = []

  // Check act balance
  const act1Percent = acts[0].percentage
  const act2Percent = acts[1].percentage
  const act3Percent = acts[2].percentage

  // Check if acts follow standard proportions
  if (act1Percent < 20 || act1Percent > 30) {
    issues.push({
      type: 'uneven',
      location: 'Act 1',
      sceneNumbers: [acts[0].startScene, acts[0].endScene],
      severity: 'medium',
      recommendation: `Act 1 is ${act1Percent.toFixed(1)}% of screenplay (standard: 25%). Consider ${act1Percent < 20 ? 'expanding' : 'condensing'} setup.`,
    })
  }

  if (act2Percent < 45 || act2Percent > 55) {
    issues.push({
      type: 'uneven',
      location: 'Act 2',
      sceneNumbers: [acts[1].startScene, acts[1].endScene],
      severity: 'medium',
      recommendation: `Act 2 is ${act2Percent.toFixed(1)}% of screenplay (standard: 50%). Consider ${act2Percent < 45 ? 'expanding' : 'condensing'} development.`,
    })
  }

  if (act3Percent < 20 || act3Percent > 30) {
    issues.push({
      type: 'uneven',
      location: 'Act 3',
      sceneNumbers: [acts[2].startScene, acts[2].endScene],
      severity: 'medium',
      recommendation: `Act 3 is ${act3Percent.toFixed(1)}% of screenplay (standard: 25%). Consider ${act3Percent < 20 ? 'expanding' : 'condensing'} resolution.`,
    })
  }

  // Check for dialogue-heavy scenes (>80% dialogue)
  scenes.forEach((scene) => {
    const dialogueWords = scene.dialogue.reduce((sum, d) => sum + d.lines.join(' ').split(/\s+/).length, 0)
    const totalWords = scene.description.split(/\s+/).length + dialogueWords

    if (totalWords > 0 && dialogueWords / totalWords > 0.8) {
      issues.push({
        type: 'dialogue-heavy',
        location: scene.location,
        sceneNumbers: [scene.sceneNumber],
        severity: 'low',
        recommendation: `Scene ${scene.sceneNumber} is dialogue-heavy. Consider adding action or visual elements.`,
      })
    }
  })

  // Determine overall pace
  const avgSceneDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0) / scenes.length
  const overallPace = avgSceneDuration < 2 ? 'fast' : avgSceneDuration > 4 ? 'slow' : 'moderate'

  // Generate recommendation
  let recommendation = ''
  if (issues.length === 0) {
    recommendation = 'Pacing is well-balanced. Structure follows industry standards.'
  } else {
    recommendation = `Found ${issues.length} pacing issue${issues.length > 1 ? 's' : ''}. Review recommendations for improvement.`
  }

  return {
    overallPace,
    issues,
    actBalance: {
      act1: act1Percent,
      act2: act2Percent,
      act3: act3Percent,
    },
    recommendation,
  }
}

/**
 * Analyze complete screenplay with AI assistance
 */
export async function analyzeScreenplay(
  scenes: Scene[],
  options: {
    genre?: string
    targetLength?: number // minutes
  } = {}
): Promise<ScreenplayAnalysis> {
  // Structural analysis
  const acts = detectThreeActStructure(scenes)
  const plotPoints = identifyPlotPoints(scenes, acts)
  const pacing = analyzePacing(scenes, acts)

  // Check if follows three-act structure
  const followsThreeAct =
    acts[0].percentage >= 20 && acts[0].percentage <= 30 &&
    acts[1].percentage >= 45 && acts[1].percentage <= 55 &&
    acts[2].percentage >= 20 && acts[2].percentage <= 30

  // Calculate structure score
  let structureScore = 100
  if (!followsThreeAct) structureScore -= 20
  structureScore -= pacing.issues.length * 5
  structureScore = Math.max(0, Math.min(100, structureScore))

  // Extract unique characters
  const allCharacters = new Set<string>()
  scenes.forEach((scene) => scene.characters.forEach((char) => allCharacters.add(char)))

  // Analyze character arcs (simplified - would use AI for deeper analysis)
  const characterArcs: CharacterArcAnalysis[] = Array.from(allCharacters).slice(0, 5).map((character) => {
    const characterScenes = scenes.filter((s) => s.characters.includes(character))
    return {
      character,
      arcType: 'complex', // Would be determined by AI
      scenes: characterScenes.map((s) => s.sceneNumber),
      development: `Appears in ${characterScenes.length} scenes`,
      strengths: ['Consistent presence'],
      weaknesses: characterScenes.length < 3 ? ['Limited screen time'] : [],
    }
  })

  // Industry comparison
  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0)
  const targetLength = options.targetLength || 90 // Standard feature length

  let lengthComparison = ''
  if (totalDuration < targetLength - 10) {
    lengthComparison = `Screenplay runs ${Math.round(totalDuration)} minutes. Consider expanding to reach ${targetLength}-minute target.`
  } else if (totalDuration > targetLength + 30) {
    lengthComparison = `Screenplay runs ${Math.round(totalDuration)} minutes. Consider condensing to industry standard ${targetLength}-${targetLength + 20} minutes.`
  } else {
    lengthComparison = `Screenplay length (${Math.round(totalDuration)} minutes) is within industry standards.`
  }

  const recommendations: string[] = []
  if (!followsThreeAct) {
    recommendations.push('Adjust act breaks to follow three-act structure (25% / 50% / 25%)')
  }
  if (pacing.issues.filter((i) => i.type === 'dialogue-heavy').length > 5) {
    recommendations.push('Multiple dialogue-heavy scenes detected. Add more visual storytelling.')
  }
  if (plotPoints.some((p) => p.confidence < 75)) {
    recommendations.push('Key plot points may need strengthening for clearer story structure.')
  }

  // Overall score
  const overallScore = Math.round(
    (structureScore * 0.4) +
    (followsThreeAct ? 30 : 15) +
    (pacing.issues.length === 0 ? 30 : Math.max(0, 30 - pacing.issues.length * 3))
  )

  return {
    structure: {
      acts,
      followsThreeAct,
      structureScore,
      issues: followsThreeAct ? [] : ['Act structure deviates from standard three-act format'],
    },
    plotPoints,
    pacing,
    characterArcs,
    industryComparison: {
      genre: options.genre || 'Drama',
      lengthComparison,
      structureComparison: followsThreeAct ? 'Follows standard three-act structure' : 'Deviates from three-act structure',
      pacingComparison: `Overall pace is ${pacing.overallPace}`,
      recommendations,
    },
    overallScore,
  }
}

/**
 * Get AI-powered detailed analysis using GPT-4
 */
export async function getAIAnalysis(
  scenes: Scene[],
  focusArea: 'structure' | 'characters' | 'dialogue' | 'pacing' | 'overall'
): Promise<string> {
  const scenesSummary = scenes.slice(0, 10).map((s) =>
    `Scene ${s.sceneNumber}: ${s.heading}\nCharacters: ${s.characters.join(', ')}\n${s.description.substring(0, 100)}...`
  ).join('\n\n')

  const prompt = focusArea === 'overall'
    ? `Analyze this screenplay excerpt and provide comprehensive feedback on structure, pacing, character development, and dialogue:\n\n${scenesSummary}`
    : focusArea === 'structure'
    ? `Analyze the structural elements of this screenplay excerpt. Focus on three-act structure, plot points, and overall narrative flow:\n\n${scenesSummary}`
    : focusArea === 'characters'
    ? `Analyze the character development in this screenplay excerpt. Focus on character arcs, relationships, and growth:\n\n${scenesSummary}`
    : focusArea === 'dialogue'
    ? `Analyze the dialogue in this screenplay excerpt. Focus on voice, authenticity, subtext, and pacing:\n\n${scenesSummary}`
    : `Analyze the pacing of this screenplay excerpt. Focus on scene rhythm, act balance, and narrative momentum:\n\n${scenesSummary}`

  const response = await generateWithAI({
    model: 'claude-sonnet-4.5',
    prompt,
    context: `You are an expert screenplay analyst with deep knowledge of industry standards and storytelling principles. Provide constructive, actionable feedback.`,
    maxTokens: 1000,
  })
  return response.content
}
