# Manuscript Submissions Database Schema

**Status**: ✅ Complete
**Ticket**: MS-1.1
**Priority**: P0 (Critical)
**Story Points**: 5

## Overview

Comprehensive database schema for the Studio-exclusive manuscript submissions feature. Includes tables for partners, submissions, access logs, and notifications with full RLS policies and triggers.

## Schema Design

### Entity Relationship Diagram

```
┌─────────────────────────────┐
│   submission_partners       │
│  (Agents & Publishers)      │
├─────────────────────────────┤
│ PK: id (UUID)               │
│     name                    │
│     type (enum)             │
│     company                 │
│     email (unique)          │
│     verified                │
│     aar_member              │
│     genres[]                │
│     accepting_submissions   │
│     acceptance_rate         │
└─────────────────────────────┘
             ▲
             │ FK: partner_id
             │
┌─────────────────────────────┐
│  manuscript_submissions     │
│    (Main Submissions)       │
├─────────────────────────────┤
│ PK: id (UUID)               │
│ FK: user_id → auth.users    │
│ FK: project_id → projects   │
│ FK: partner_id → partners   │
│     title                   │
│     genre                   │
│     word_count              │
│     type (enum)             │
│     query_letter            │
│     synopsis                │
│     status (enum)           │
│     priority_review         │
│     watermark_applied       │
│     access_token            │
│     access_expires_at       │
└─────────────────────────────┘
             │
             ├──────────────┐
             │              │
             ▼              ▼
┌────────────────────────┐  ┌──────────────────────────┐
│ submission_access_logs │  │ submission_notifications │
│   (Audit Trail)        │  │     (Alerts)             │
├────────────────────────┤  ├──────────────────────────┤
│ PK: id (UUID)          │  │ PK: id (UUID)            │
│ FK: submission_id      │  │ FK: submission_id        │
│ FK: partner_id         │  │ FK: user_id              │
│     access_type        │  │     type (enum)          │
│     ip_address         │  │     channel (enum)       │
│     user_agent         │  │     email_sent           │
│     session_duration   │  │     read                 │
│     pages_viewed[]     │  │     title                │
└────────────────────────┘  │     message              │
                            └──────────────────────────┘
```

## Tables

### 1. submission_partners

Literary agents and publishers who can receive manuscripts.

**Columns:**
- `id` (UUID) - Primary key
- `name` (TEXT) - Agent/publisher name
- `type` (ENUM) - 'agent', 'publisher', 'manager'
- `company` (TEXT) - Company name
- `email` (TEXT, UNIQUE) - Contact email
- `website` (TEXT) - Website URL
- `verified` (BOOLEAN) - Verification status
- `verification_date` (TIMESTAMPTZ) - When verified
- `verification_notes` (TEXT) - Admin notes
- `aar_member` (BOOLEAN) - AAR membership
- `genres` (TEXT[]) - Genres they represent
- `accepting_submissions` (BOOLEAN) - Currently accepting
- `submission_guidelines` (TEXT) - Submission requirements
- `response_time_days` (INTEGER) - Average response time
- `total_submissions` (INTEGER) - Stats
- `total_accepted` (INTEGER) - Stats
- `total_rejected` (INTEGER) - Stats
- `acceptance_rate` (NUMERIC) - Auto-calculated
- `bio` (TEXT) - Agent bio
- `linkedin_url`, `twitter_handle` - Social links
- `status` (ENUM) - 'active', 'inactive', 'suspended'
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes:**
- verified, type, status, accepting_submissions
- GIN index on genres array

**Triggers:**
- Auto-calculate acceptance_rate
- Auto-update updated_at

### 2. manuscript_submissions

Main submissions table.

**Columns:**
- `id` (UUID) - Primary key
- `user_id` (UUID) - FK to auth.users
- `project_id` (UUID) - FK to projects (optional)
- `partner_id` (UUID) - FK to submission_partners
- `title` (TEXT) - Manuscript title
- `genre` (TEXT) - Genre
- `word_count` (INTEGER) - Word count
- `type` (ENUM) - 'novel', 'novella', 'short_story', etc.
- `query_letter` (TEXT) - Query letter text
- `synopsis` (TEXT) - Synopsis text
- `author_bio` (TEXT) - Author bio
- `sample_pages_count` (INTEGER) - Number of sample pages
- `sample_pages_content` (TEXT) - Sample pages text
- `full_manuscript_available` (BOOLEAN)
- File paths for uploaded documents
- `watermark_applied` (BOOLEAN) - IP protection
- `watermark_data` (JSONB) - Watermark metadata
- `access_token` (TEXT, UNIQUE) - JWT for view access
- `access_expires_at` (TIMESTAMPTZ) - Access expiration
- `access_revoked_at` (TIMESTAMPTZ) - Manual revocation
- `status` (ENUM) - Submission status (8 states)
- `priority_review` (BOOLEAN) - Studio priority flag
- Partner response fields
- View tracking fields
- `submission_metadata` (JSONB) - Flexible metadata
- `submitted_at`, `created_at`, `updated_at`

**Status Flow:**
```
draft → submitted → under_review → sample_requested → full_requested → accepted/rejected
                                                     ↘ withdrawn
```

**Indexes:**
- user_id, partner_id, project_id, status
- access_token (for JWT lookups)
- submitted_at DESC (for sorting)
- Composite: (user_id, status)

**Triggers:**
- Auto-set submitted_at when status changes to 'submitted'
- Auto-update updated_at

### 3. submission_access_logs

Complete audit trail of all access to manuscripts.

**Columns:**
- `id` (UUID) - Primary key
- `submission_id` (UUID) - FK to manuscript_submissions
- `partner_id` (UUID) - FK to submission_partners
- `access_type` (ENUM) - 'view', 'download', 'print', 'copy_attempt'
- `ip_address` (INET) - IP address
- `user_agent` (TEXT) - Browser/device info
- Session tracking fields
- `pages_viewed` (INTEGER[]) - Which pages accessed
- `download_successful` (BOOLEAN)
- Location fields (country, city)
- `accessed_at` (TIMESTAMPTZ)

**Indexes:**
- submission_id, partner_id
- accessed_at DESC
- Composite: (submission_id, partner_id)

### 4. submission_notifications

Notification system for submission events.

**Columns:**
- `id` (UUID) - Primary key
- `submission_id` (UUID) - FK to manuscript_submissions
- `user_id` (UUID) - FK to auth.users
- `type` (ENUM) - 8 notification types
- `channel` (ENUM) - 'email', 'in_app', 'both'
- Email delivery tracking fields
- In-app read tracking fields
- `title`, `message` (TEXT) - Notification content
- `action_url` (TEXT) - CTA link
- `created_at` (TIMESTAMPTZ)

**Notification Types:**
- submission_received
- submission_viewed
- sample_requested
- full_requested
- accepted
- rejected
- access_expires_soon
- access_revoked

**Indexes:**
- user_id, submission_id
- (user_id, read) for unread count
- created_at DESC

## Row Level Security

### submission_partners
- **SELECT**: Anyone can view verified, active partners

### manuscript_submissions
- **SELECT**: Users can only view their own submissions
- **INSERT**: Users can only create for themselves
- **UPDATE**: Users can only update their own
- **DELETE**: Users can only delete their own

### submission_access_logs
- **SELECT**: Users can view logs for their own submissions

### submission_notifications
- **SELECT**: Users can only view their own
- **UPDATE**: Users can update read status on their own

## Key Features

### 1. IP Protection
- Watermark tracking in `watermark_data` JSONB
- Access tokens with expiration
- Manual access revocation support
- Complete audit trail of all access

### 2. Studio Priority
- `priority_review` flag for Studio users
- Partners can filter/sort by priority

### 3. Flexible Metadata
- `submission_metadata` JSONB for extensibility
- `watermark_data` JSONB for watermark details

### 4. Stats & Analytics
- Partner acceptance rates auto-calculated
- Submission tracking (views, dates)
- Response time tracking

### 5. Access Control
- JWT-based time-limited access
- 30-day default expiration
- Revocation support
- Full audit logging

## TypeScript Types

Created comprehensive TypeScript types in `lib/submissions/types.ts`:
- Database table interfaces
- Enum types
- API request/response types
- Filter/query types
- UI display types
- Helper constants

## Helper Functions

Created utility functions in `lib/submissions/helpers.ts`:
- Status checking functions
- Date calculations
- Validation functions
- Sorting/filtering helpers
- Display formatting

## Seed Data

Created sample partners in `supabase/seed_data/submission_partners.sql`:
- 10 verified partners
- Mix of agents and publishers
- Various genres covered
- Different response times
- Realistic bios and guidelines

## Migration File

**Location**: `supabase/migrations/20250122000001_manuscript_submissions.sql`

**Size**: ~450 lines
**Includes**:
- 4 tables with all columns
- 20+ indexes for performance
- 3 triggers for automation
- Full RLS policies
- Comprehensive comments

## Usage Examples

### Query Partners
```sql
SELECT * FROM submission_partners
WHERE verified = true
AND accepting_submissions = true
AND 'fantasy' = ANY(genres)
ORDER BY acceptance_rate DESC NULLS LAST;
```

### Create Submission
```typescript
const submission = await supabase
  .from('manuscript_submissions')
  .insert({
    user_id: user.id,
    partner_id: partnerId,
    title: 'My Novel',
    genre: 'fantasy',
    word_count: 95000,
    type: 'novel',
    query_letter: queryText,
    synopsis: synopsisText,
    priority_review: true, // Studio users only
    status: 'submitted',
  })
```

### Track Access
```typescript
const log = await supabase
  .from('submission_access_logs')
  .insert({
    submission_id: submissionId,
    partner_id: partnerId,
    access_type: 'view',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    accessed_at: new Date(),
  })
```

## Performance Considerations

### Indexes
- All foreign keys indexed
- Frequently queried fields indexed
- Composite indexes for common queries
- GIN index for array searches

### Partitioning (Future)
- Could partition access_logs by date
- Archive old submissions (>2 years)

### Caching
- Partner list can be cached (changes infrequently)
- User's submissions cached with invalidation

## Security

### RLS Policies
- Users can only access their own data
- Partners are publicly visible when verified
- Access logs tied to submission ownership

### Sensitive Data
- Email addresses in partners table
- IP addresses in access logs
- Access tokens are unique and expiring

### Audit Trail
- All access logged with timestamp
- IP addresses tracked
- User agents recorded
- Cannot be deleted (audit integrity)

## Testing

To test the schema:

```bash
# Apply migration
supabase db push

# Load seed data (development only)
psql $DATABASE_URL < supabase/seed_data/submission_partners.sql

# Verify tables
psql $DATABASE_URL -c "\dt public.submission*"

# Test RLS
# Create test submission as user
# Verify other users cannot see it
```

## Next Steps

With the schema complete, we can now:

1. **MS-1.2**: Add Submissions link to sidebar
2. **MS-1.3**: Build submission package builder UI
3. **MS-2.1**: Create partner directory UI
4. Implement API endpoints using these tables

## Files Created

1. `supabase/migrations/20250122000001_manuscript_submissions.sql` - Main migration
2. `lib/submissions/types.ts` - TypeScript types (300+ lines)
3. `lib/submissions/helpers.ts` - Utility functions (350+ lines)
4. `supabase/seed_data/submission_partners.sql` - Sample data

---

**Implementation Date**: January 22, 2025
**Implemented By**: Claude Code
**Status**: Ready for use ✅
