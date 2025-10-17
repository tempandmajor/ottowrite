# Phase 2: Advanced AI & Specialized Tools

## Overview
Phase 2 focuses on building advanced AI orchestration, specialized writing tools for novels and screenplays, and comprehensive analytics. This phase transforms OttoWrite from a basic AI writing assistant into a professional-grade creative writing platform.

**Timeline:** 8 weeks (Weeks 9-16)
**Status:** 🚀 Starting Now

---

## Priority Order & Implementation Strategy

### Week 1-2: Story Development Foundation
**Goal:** Core story structure tools that work for both novels and screenplays

#### 1.1 Beat Sheet System
**Complexity:** Medium | **Value:** High | **Time:** 5 days

**Features:**
- Pre-built templates:
  - Save the Cat (15 beats)
  - Hero's Journey (12 stages)
  - Three-Act Structure (basic)
  - Five-Act Structure (Freytag's Pyramid)
  - Screenplay structure (setup, confrontation, resolution)
- Visual beat timeline with drag-and-drop
- Beat cards with description, notes, and scene links
- AI-powered beat suggestions based on genre
- Export beats to document outline

**Database Schema:**
```sql
CREATE TABLE story_beats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    beat_type TEXT, -- 'save_the_cat', 'heros_journey', etc.
    order_position INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    target_page_count INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'complete'
    linked_document_ids UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create:**
- `app/dashboard/projects/[id]/story-structure/page.tsx`
- `components/story/beat-board.tsx`
- `components/story/beat-card.tsx`
- `components/story/beat-templates.tsx`
- `app/api/story-beats/route.ts`

---

#### 1.2 AI-Powered Outline Generator
**Complexity:** High | **Value:** High | **Time:** 4 days

**Features:**
- Generate chapter/scene outlines from premise
- Multiple outline formats (chapter summary, scene-by-scene, treatment)
- AI analyzes existing content to suggest next chapters
- Outline-to-document conversion (one-click chapter creation)
- Timeline validation (prevents plot holes)

**AI Integration:**
```typescript
// Use Claude 4.5 for creative outlining
const generateOutline = async (params: {
  premise: string
  genre: string[]
  targetLength: 'short' | 'novella' | 'novel' | 'series'
  existingBeats?: Beat[]
}) => {
  // Use 200K context window to analyze existing content
  // Generate structured outline with chapter summaries
  // Include character arcs and subplot suggestions
}
```

**Files to Create:**
- `components/story/outline-generator.tsx`
- `app/api/ai/generate-outline/route.ts`
- `lib/ai/outline-service.ts`

---

#### 1.3 Plot Hole Detection
**Complexity:** High | **Value:** High | **Time:** 3 days

**Features:**
- Analyze manuscript for logical inconsistencies
- Timeline contradiction detection
- Character continuity checking
- Setup/payoff validation (Chekhov's gun)
- AI-powered suggestions for fixes

**Implementation:**
```typescript
// Use Claude 4.5's reasoning capabilities
const detectPlotHoles = async (manuscript: Document[]) => {
  // Extract timeline events
  // Build character state tracking
  // Analyze cause-effect relationships
  // Flag inconsistencies with line references
}
```

**Files to Create:**
- `app/dashboard/projects/[id]/analysis/page.tsx`
- `components/analysis/plot-holes.tsx`
- `app/api/analysis/plot-holes/route.ts`

---

### Week 3-4: Character Development System
**Goal:** Comprehensive character management with AI assistance

#### 2.1 Character Profile Database
**Complexity:** Medium | **Value:** High | **Time:** 4 days

**Features:**
- Character profile cards with:
  - Basic info (name, age, appearance)
  - Personality traits (MBTI, enneagram)
  - Backstory and motivations
  - Character arc tracking
  - Relationships map
  - Character-specific goals/conflicts
- AI-generated character profiles from brief descriptions
- Character image generation (using GPT-5's image capabilities)
- Character voice notes (distinctive speech patterns)

**Database Schema:**
```sql
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT, -- 'protagonist', 'antagonist', 'supporting', etc.
    profile JSONB DEFAULT '{}', -- all character details
    appearance_notes TEXT,
    personality_traits TEXT[],
    backstory TEXT,
    arc_description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE character_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_a_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    character_b_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    relationship_type TEXT,
    description TEXT,
    strength INTEGER DEFAULT 5, -- 1-10 scale
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create:**
- `app/dashboard/projects/[id]/characters/page.tsx`
- `components/characters/character-card.tsx`
- `components/characters/character-form.tsx`
- `components/characters/relationship-map.tsx`
- `app/api/characters/route.ts`

---

#### 2.2 Dialogue Voice Analysis
**Complexity:** High | **Value:** Medium | **Time:** 3 days

**Features:**
- Analyze character dialogue patterns
- Detect when character "sounds wrong"
- Vocabulary consistency checking
- Speech pattern analysis (sentence length, complexity)
- AI-powered voice correction suggestions

**Implementation:**
```typescript
const analyzeDialogueVoice = async (params: {
  characterId: string
  dialogueSamples: string[]
  targetDialogue: string
}) => {
  // Extract speech patterns from samples
  // Compare target dialogue to established voice
  // Flag inconsistencies with confidence scores
  // Suggest rewrites that match voice
}
```

**Files to Create:**
- `components/characters/dialogue-analyzer.tsx`
- `app/api/analysis/dialogue-voice/route.ts`

---

#### 2.3 Character Arc Visualization
**Complexity:** Medium | **Value:** Medium | **Time:** 2 days

**Features:**
- Timeline view of character development
- Arc templates (flat, growth, fall, transformation)
- Emotional journey graphs
- Character state at different story points
- Compare multiple character arcs

**Files to Create:**
- `components/characters/arc-timeline.tsx`
- `components/characters/arc-graph.tsx`

---

### Week 5: World-Building Tools (Fiction/Fantasy/Sci-Fi)
**Goal:** Consistency management for complex fictional worlds

#### 3.1 World Bible System
**Complexity:** Medium | **Value:** High | **Time:** 4 days

**Features:**
- World encyclopedia entries:
  - Locations (with maps)
  - Magic/tech systems
  - Cultures and societies
  - History and lore
  - Languages and terminology
- Wiki-style linking between entries
- Consistency checker (flags contradictions)
- AI-generated world elements from prompts

**Database Schema:**
```sql
CREATE TABLE world_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT, -- 'location', 'magic_system', 'culture', 'history', 'language'
    name TEXT NOT NULL,
    description TEXT,
    properties JSONB DEFAULT '{}',
    related_elements UUID[],
    image_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create:**
- `app/dashboard/projects/[id]/world-building/page.tsx`
- `components/world/world-element-card.tsx`
- `components/world/consistency-checker.tsx`
- `app/api/world-elements/route.ts`

---

#### 3.2 Magic/Tech System Designer
**Complexity:** Medium | **Value:** Medium | **Time:** 2 days

**Features:**
- Rules definition interface
- Cost/limitation tracker
- Power level balancing
- AI validation of system consistency

**Files to Create:**
- `components/world/system-designer.tsx`

---

### Week 6: Advanced AI Features
**Goal:** Multi-model orchestration and experimental features

#### 4.1 Multi-Model Ensemble
**Complexity:** High | **Value:** High | **Time:** 4 days

**Features:**
- Generate 2-3 suggestions simultaneously from different models
- Side-by-side comparison UI
- User voting system (ML feedback loop)
- Blended outputs (combine best parts)
- Model performance analytics per user

**Implementation:**
```typescript
const generateEnsemble = async (prompt: string, context: string) => {
  // Parallel generation
  const [claude, gpt, deepseek] = await Promise.all([
    generateWithClaude(prompt, context),
    generateWithGPT(prompt, context),
    generateWithDeepSeek(prompt, context)
  ])

  return {
    suggestions: [claude, gpt, deepseek],
    metadata: { cost, tokens, latency }
  }
}
```

**Files to Create:**
- `components/ai/ensemble-generator.tsx`
- `app/api/ai/ensemble/route.ts`
- `lib/ai/ensemble-service.ts`

---

#### 4.2 OpenAI Responses API Integration
**Complexity:** Medium | **Value:** High | **Time:** 3 days

**Features:**
- Background processing for lengthy tasks:
  - Full manuscript analysis
  - Complete outline generation
  - Multi-chapter critique
- Reasoning summaries (show AI's thought process)
- File Search (upload research documents)
- Progress tracking UI

**Files to Create:**
- `app/api/ai/background-task/route.ts`
- `components/ai/background-task-monitor.tsx`
- `lib/ai/responses-api-service.ts`

---

### Week 7: Research & Analytics
**Goal:** Research tools and writing metrics

#### 5.1 Research Assistant
**Complexity:** Medium | **Value:** High | **Time:** 3 days

**Features:**
- In-editor research panel
- Web search integration (using GPT-5 web search)
- Fact verification
- Citation management
- Research notes attached to documents

**Files to Create:**
- `components/research/research-panel.tsx`
- `components/research/citation-manager.tsx`
- `app/api/research/search/route.ts`

---

#### 5.2 Writing Analytics Dashboard
**Complexity:** Medium | **Value:** High | **Time:** 3 days

**Features:**
- Metrics:
  - Words written per day/week/month
  - Heatmap calendar (GitHub-style)
  - Writing time patterns
  - Project completion estimates
  - AI usage statistics
  - Style consistency scores (readability, passive voice %, etc.)
- Goals & Tracking:
  - Set daily/weekly word count goals
  - Streak tracking
  - Milestone celebrations
  - Deadline countdown

**Database Schema:**
```sql
CREATE TABLE writing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    words_added INTEGER,
    words_deleted INTEGER,
    net_words INTEGER,
    session_duration_seconds INTEGER,
    session_start TIMESTAMPTZ,
    session_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE writing_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT, -- 'daily', 'weekly', 'monthly', 'project'
    target_words INTEGER,
    deadline DATE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create:**
- `app/dashboard/analytics/page.tsx`
- `components/analytics/writing-heatmap.tsx`
- `components/analytics/goal-tracker.tsx`
- `components/analytics/session-stats.tsx`
- `app/api/analytics/sessions/route.ts`

---

#### 5.3 Readability Analysis
**Complexity:** Low | **Value:** Medium | **Time:** 2 days

**Features:**
- Flesch-Kincaid readability score
- Passive voice percentage
- Dialogue vs narrative ratio
- Sentence length analysis
- Cliché detection

**Files to Create:**
- `components/analysis/readability.tsx`
- `lib/analysis/readability-utils.ts`

---

### Week 8: Screenplay-Specific Tools
**Goal:** Industry-standard screenplay features

#### 6.1 Beat Board & Index Cards
**Complexity:** Medium | **Value:** High | **Time:** 3 days

**Features:**
- Visual scene arrangement (board view)
- Color-coded cards (A-plot, B-plot, C-plot)
- Drag-and-drop reordering
- Scene summary generation
- Export to document

**Files to Create:**
- `app/dashboard/projects/[id]/beat-board/page.tsx`
- `components/screenplay/beat-board.tsx`
- `components/screenplay/scene-card.tsx`

---

#### 6.2 Script Coverage Generator
**Complexity:** Medium | **Value:** High | **Time:** 2 days

**Features:**
- AI-generated coverage notes (like industry readers)
- Logline generation
- Synopsis generation (1-page, 2-page)
- Genre classification
- Marketability assessment

**Files to Create:**
- `components/screenplay/coverage-generator.tsx`
- `app/api/ai/generate-coverage/route.ts`

---

#### 6.3 Format Validation & Production Tools
**Complexity:** Low | **Value:** Medium | **Time:** 2 days

**Features:**
- Industry formatting rule enforcement
- Page count vs runtime calculator
- Dialogue density analysis
- Scene breakdown sheets
- Character/prop/location lists

**Files to Create:**
- `components/screenplay/format-validator.tsx`
- `components/screenplay/breakdown-sheets.tsx`

---

## Technical Architecture

### AI Model Routing Strategy
```typescript
// Enhanced routing for Phase 2 features
const routeAITask = (task: AITask) => {
  switch (task.type) {
    case 'creative_outline':
    case 'character_profile':
    case 'dialogue_generation':
      return 'claude-sonnet-4.5' // Best for creative work

    case 'plot_analysis':
    case 'consistency_check':
    case 'coverage_notes':
      return 'gpt-5' // Best for analytical tasks

    case 'bulk_processing':
    case 'fact_checking':
      return 'deepseek-v3' // Cost-effective for volume

    case 'ensemble':
      return ['claude-sonnet-4.5', 'gpt-5', 'deepseek-v3']

    default:
      return 'claude-sonnet-4.5'
  }
}
```

### Database Additions Summary
```sql
-- Phase 2 New Tables:
- story_beats (beat sheet system)
- characters (character profiles)
- character_relationships (relationship mapping)
- world_elements (world-building)
- writing_sessions (analytics tracking)
- writing_goals (goal setting)
- research_notes (research assistant)
- ai_tasks (background processing)
```

### API Endpoints Summary
```
POST /api/story-beats
POST /api/ai/generate-outline
POST /api/analysis/plot-holes
POST /api/characters
POST /api/analysis/dialogue-voice
POST /api/world-elements
POST /api/ai/ensemble
POST /api/ai/background-task
POST /api/research/search
POST /api/analytics/sessions
POST /api/ai/generate-coverage
```

---

## Dependencies to Install

```bash
# Charting & Visualization
npm install recharts
npm install @radix-ui/react-progress
npm install @radix-ui/react-slider

# Drag and Drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Calendar & Date Utilities
npm install react-day-picker

# Graph Visualization (for relationship maps)
npm install react-force-graph-2d

# Text Analysis
npm install natural # NLP library for readability analysis
```

---

## Success Metrics

### User Engagement
- 70%+ of users create at least 1 character profile
- 50%+ of users use beat sheet system
- 40%+ of users run plot hole detection
- 60%+ of users set writing goals

### AI Usage
- Ensemble generation adoption: 30%+
- Average AI requests per user: 200/month
- Character profile generation: 80%+ success rate

### Quality Metrics
- Plot hole false positive rate: <20%
- Dialogue voice accuracy: >85%
- Outline satisfaction rating: 4.5/5+

---

## Risks & Mitigation

### Risk 1: Complex UI/UX
**Mitigation:** Iterative design, tooltips, onboarding tours

### Risk 2: AI Cost Escalation
**Mitigation:** Smart caching, rate limiting, tiered features

### Risk 3: Performance (Large Manuscripts)
**Mitigation:** Background processing, pagination, lazy loading

### Risk 4: Accuracy of Analysis Tools
**Mitigation:** Clear disclaimers, confidence scores, user feedback loops

---

## Phase 2 Completion Criteria

✅ All story development tools functional
✅ Character management system complete
✅ World-building tools operational
✅ Multi-model ensemble working
✅ Analytics dashboard live
✅ Screenplay tools implemented
✅ All features covered by tests
✅ Documentation updated
✅ User onboarding flows created

---

**Let's start with Week 1: Story Development Foundation!**

Next step: Begin with **Beat Sheet System** implementation.
