# Ghostwriter Schema Documentation

## Overview

The Ghostwriter feature uses a dedicated schema for tracking AI-generated story chunks, user feedback, and word usage quotas. This document describes the database structure and usage patterns.

**Ticket**: 1.2 - Create Ghostwriter Usage Tracking Schema
**Migration**: `20250130000000_ghostwriter_tracking_schema.sql`

---

## Tables

### 1. Usage Tracking Columns

#### `user_plan_usage.ghostwriter_words_used_month`

Tracks Ghostwriter-specific AI word usage for the current billing period.

```sql
ALTER TABLE user_plan_usage
ADD COLUMN ghostwriter_words_used_month INTEGER DEFAULT 0 NOT NULL;
```

- **Type**: INTEGER
- **Default**: 0
- **Purpose**: Track monthly Ghostwriter word generation separately from general AI usage
- **Reset**: Monthly on billing cycle

#### `subscription_tier_limits.ghostwriter_words_per_month`

Defines per-tier limits for Ghostwriter word generation.

```sql
ALTER TABLE subscription_tier_limits
ADD COLUMN ghostwriter_words_per_month INTEGER;
```

- **Type**: INTEGER (nullable)
- **NULL = Unlimited**: Studio tier has NULL for unlimited usage
- **Limits**:
  - Free: 1,000 words/month
  - Hobbyist: 1,000 words/month
  - Professional: 1,000 words/month
  - Studio: NULL (unlimited)

---

### 2. `ghostwriter_chunks`

Stores AI-generated story chunks with context, quality metrics, and status tracking.

#### Schema

```sql
CREATE TABLE ghostwriter_chunks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Chunk metadata
  title TEXT NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('scene', 'chapter', 'section', 'custom')),
  chunk_order INTEGER,

  -- Context for generation
  story_context TEXT,
  character_context JSONB DEFAULT '[]'::jsonb,
  previous_chunk_id UUID REFERENCES ghostwriter_chunks(id) ON DELETE SET NULL,

  -- Generation parameters
  target_word_count INTEGER,
  style_preferences JSONB DEFAULT '{}'::jsonb,
  constraints JSONB DEFAULT '[]'::jsonb,

  -- Generated content
  generated_content TEXT,
  word_count INTEGER DEFAULT 0 NOT NULL,

  -- Quality metrics
  consistency_score DECIMAL(3,2),        -- 0-10 scale
  pacing_score DECIMAL(3,2),             -- 0-10 scale
  character_voice_score DECIMAL(3,2),    -- 0-10 scale
  overall_quality_score DECIMAL(3,2),    -- 0-10 scale

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'generated', 'reviewed', 'accepted', 'rejected', 'refined'
  )),
  generation_model TEXT,
  generation_tokens INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  generated_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);
```

#### Indexes

```sql
idx_ghostwriter_chunks_user_id              -- Query by user
idx_ghostwriter_chunks_project_id           -- Query by project
idx_ghostwriter_chunks_document_id          -- Query by document
idx_ghostwriter_chunks_status               -- Filter by status
idx_ghostwriter_chunks_created_at           -- Sort by creation date
idx_ghostwriter_chunks_user_created         -- Composite: user + date
```

#### RLS Policies

- **SELECT**: Users can view their own chunks
- **INSERT**: Users can create their own chunks
- **UPDATE**: Users can update their own chunks
- **DELETE**: Users can delete their own chunks

#### Field Details

**`chunk_type`**:
- `scene`: Individual scene generation
- `chapter`: Full chapter generation
- `section`: Section within a chapter
- `custom`: User-defined chunk type

**`character_context`** (JSONB):
```json
[
  {
    "name": "John Doe",
    "traits": ["brave", "impulsive"],
    "relationships": ["friends with Jane"],
    "arc": "learning to trust"
  }
]
```

**`style_preferences`** (JSONB):
```json
{
  "tone": "dramatic",
  "pov": "third_person_limited",
  "tense": "past",
  "pacing": "fast"
}
```

**`constraints`** (JSONB):
```json
[
  { "type": "must_include", "value": "reveal the secret" },
  { "type": "must_avoid", "value": "violence" },
  { "type": "word_limit", "value": 1500 }
]
```

**Status Flow**:
```
draft → generated → reviewed → accepted/rejected
                              ↓ (if issues found)
                           refined → reviewed → accepted/rejected
```

---

### 3. `ghostwriter_feedback`

Captures user feedback on generated chunks for quality improvement.

#### Schema

```sql
CREATE TABLE ghostwriter_feedback (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  chunk_id UUID NOT NULL REFERENCES ghostwriter_chunks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feedback type
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'thumbs_up',
    'thumbs_down',
    'regenerate_request',
    'refinement_request',
    'quality_issue',
    'consistency_issue',
    'style_issue'
  )),

  -- Feedback details
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  specific_issues JSONB DEFAULT '[]'::jsonb,

  -- Context for refinement
  refinement_instructions TEXT,
  refinement_applied BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Indexes

```sql
idx_ghostwriter_feedback_chunk_id          -- Query feedback for chunk
idx_ghostwriter_feedback_user_id           -- Query user's feedback
idx_ghostwriter_feedback_type              -- Filter by feedback type
idx_ghostwriter_feedback_created_at        -- Sort by date
```

#### RLS Policies

- **SELECT**: Users can view their own feedback
- **INSERT**: Users can create their own feedback
- **UPDATE**: Users can update their own feedback
- **DELETE**: Users can delete their own feedback

#### Field Details

**`specific_issues`** (JSONB):
```json
[
  { "type": "character_ooc", "character": "John", "details": "Too passive" },
  { "type": "pacing", "section": "middle", "details": "Too slow" },
  { "type": "continuity", "details": "Contradicts chapter 3" }
]
```

---

## Helper Functions

### `check_ghostwriter_word_quota()`

Check if a user can generate a specified number of words.

```sql
SELECT check_ghostwriter_word_quota(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- user_id
  500                                              -- words_to_generate
);
```

**Returns**:
```json
{
  "allowed": true,
  "tier": "professional",
  "used": 250,
  "limit": 1000,
  "available": 750,
  "requested": 500
}
```

**Studio (Unlimited) Response**:
```json
{
  "allowed": true,
  "tier": "studio",
  "used": 5000,
  "limit": null,
  "available": null,
  "requested": 500
}
```

**Quota Exceeded Response**:
```json
{
  "allowed": false,
  "tier": "free",
  "used": 900,
  "limit": 1000,
  "available": 100,
  "requested": 500,
  "reason": "quota_exceeded"
}
```

### `increment_ghostwriter_word_usage()`

Increment word usage after successful generation.

```sql
SELECT increment_ghostwriter_word_usage(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- user_id
  485                                              -- word_count
);
```

**Behavior**:
- Increments `ghostwriter_words_used_month`
- Also increments `ai_words_used_month` (for total AI usage)
- Creates row if doesn't exist
- Atomic operation (SECURITY DEFINER)

---

## Usage Patterns

### 1. Check Quota Before Generation

```typescript
const quotaCheck = await supabase.rpc('check_ghostwriter_word_quota', {
  p_user_id: userId,
  p_words_to_generate: estimatedWords
})

if (!quotaCheck.data.allowed) {
  return {
    error: 'Quota exceeded',
    details: quotaCheck.data
  }
}
```

### 2. Create Chunk with Context

```typescript
const { data, error } = await supabase
  .from('ghostwriter_chunks')
  .insert({
    user_id: userId,
    project_id: projectId,
    title: 'Opening Scene',
    chunk_type: 'scene',
    story_context: 'John arrives at the abandoned mansion...',
    character_context: [
      {
        name: 'John',
        traits: ['cautious', 'determined'],
        current_state: 'investigating his brother\'s disappearance'
      }
    ],
    target_word_count: 800,
    style_preferences: {
      tone: 'suspenseful',
      pov: 'third_person_limited',
      tense: 'past'
    },
    status: 'draft'
  })
  .select()
  .single()
```

### 3. Update After Generation

```typescript
const { error } = await supabase
  .from('ghostwriter_chunks')
  .update({
    generated_content: aiGeneratedText,
    word_count: actualWordCount,
    consistency_score: 8.5,
    pacing_score: 7.8,
    character_voice_score: 9.2,
    overall_quality_score: 8.5,
    status: 'generated',
    generation_model: 'claude-3-opus',
    generation_tokens: 1200,
    generated_at: new Date().toISOString()
  })
  .eq('id', chunkId)

// Increment usage
await supabase.rpc('increment_ghostwriter_word_usage', {
  p_user_id: userId,
  p_word_count: actualWordCount
})
```

### 4. Record Feedback

```typescript
const { error } = await supabase
  .from('ghostwriter_feedback')
  .insert({
    chunk_id: chunkId,
    user_id: userId,
    feedback_type: 'quality_issue',
    rating: 3,
    comment: 'Character feels out of character',
    specific_issues: [
      {
        type: 'character_ooc',
        character: 'John',
        details: 'Should be more cautious given context'
      }
    ]
  })
```

### 5. Query Recent Chunks

```typescript
const { data: chunks } = await supabase
  .from('ghostwriter_chunks')
  .select(`
    id,
    title,
    chunk_type,
    word_count,
    status,
    overall_quality_score,
    created_at,
    projects(name),
    documents(title)
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10)
```

---

## Performance Considerations

### Index Performance

The schema includes 10 indexes optimized for common query patterns:

**Expected Performance Gains**:
- User's chunks query: **>90% faster** (idx_ghostwriter_chunks_user_id)
- Recent chunks list: **>80% faster** (idx_ghostwriter_chunks_user_created)
- Feedback lookup: **>70% faster** (idx_ghostwriter_feedback_chunk_id)
- Status filtering: **>60% faster** (idx_ghostwriter_chunks_status)

### Query Optimization Tips

1. **Always filter by user_id first**: Leverages primary index
2. **Use composite index for sorting**: Query with user_id + order by created_at
3. **Partial indexes on nullable FK**: project_id and document_id indexes only where NOT NULL

---

## Security

### RLS Policies

All tables enforce Row Level Security:

✅ Users can only access their own data
✅ No cross-user data leakage
✅ Cascade deletes maintain referential integrity
✅ Foreign keys prevent orphaned records

### Function Security

Helper functions use `SECURITY DEFINER` to bypass RLS when needed:

- `check_ghostwriter_word_quota`: Reads limits and usage safely
- `increment_ghostwriter_word_usage`: Updates usage atomically

---

## Migration Verification

Run tests with:

```bash
psql $DATABASE_URL -f __tests__/supabase/ghostwriter-schema.test.sql
```

**Test Coverage**:
- ✅ Column creation
- ✅ Tier limits configuration
- ✅ Table structure
- ✅ Index creation
- ✅ RLS enablement
- ✅ Policy creation
- ✅ Quota checking logic
- ✅ Usage increment logic
- ✅ Policy enforcement

---

## Rollback

If needed, rollback with:

```sql
-- Drop tables
DROP TABLE IF EXISTS ghostwriter_feedback CASCADE;
DROP TABLE IF EXISTS ghostwriter_chunks CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS check_ghostwriter_word_quota(UUID, INTEGER);
DROP FUNCTION IF EXISTS increment_ghostwriter_word_usage(UUID, INTEGER);

-- Remove columns
ALTER TABLE user_plan_usage DROP COLUMN IF EXISTS ghostwriter_words_used_month;
ALTER TABLE subscription_tier_limits DROP COLUMN IF EXISTS ghostwriter_words_per_month;
```

---

## Related Documentation

- [Ghostwriter Architecture](./GHOSTWRITER_ARCHITECTURE.md)
- [Subscription Tiers](./SUBSCRIPTION_NAMING.md)
- [Usage Tracking](./USAGE_TRACKING.md)

---

## Support

For schema-related issues:
1. Check migration file: `supabase/migrations/20250130000000_ghostwriter_tracking_schema.sql`
2. Run test suite: `__tests__/supabase/ghostwriter-schema.test.sql`
3. Verify RLS policies are enabled
4. Check indexes with: `\di ghostwriter_*` in psql
