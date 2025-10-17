# Changelog

All notable changes to OttoWrite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

---

## [0.4.0] - 2025-10-17

### Added - World-Building Module

**New Feature: Location & Timeline Management**
- Create and manage story locations across 5 categories (settlements, regions, landmarks, realms, other)
- Track location history, culture, climate, and key features
- Add timeline events to document how locations change throughout your story
- Event importance ratings (1-10) to highlight critical moments
- Image uploads for visual reference (JPEG, PNG, WebP, GIF up to 5MB)
- Filter locations by category and search by name/summary
- Dedicated timeline view to see all events chronologically
- 15 rich database fields per location for comprehensive world-building
- User-scoped security with RLS policies

**Database Schema**:
- New `locations` table with 15 fields
- New `location_events` table for timeline tracking
- 8 RLS policies for user data isolation
- 8 performance indexes
- Auto-updating timestamps via triggers
- Cascade deletes (location → events)

**API Endpoints**:
- `GET/POST/PATCH/DELETE /api/locations` - Location management
- `GET/POST/PATCH/DELETE /api/locations/events` - Event management
- Full REST API with authentication

**UI Components**:
- World-building dashboard at `/dashboard/projects/[id]/world-building`
- Category stats cards with live counts
- Rich location editor dialog
- Timeline event editor dialog
- Filter and search controls
- Empty states with contextual guidance
- Alert dialogs for safe deletion

**Documentation**:
- User guide: `docs/WORLD_BUILDING_USER_GUIDE.md`
- QA testing guide: `docs/WORLD_BUILDING_QA_GUIDE.md`
- Seed data script: `scripts/seed-world-building.sql`
- Migration verification: `WORLD_BUILDING_MIGRATION_COMPLETE.md`

### Added - Dashboard UI/UX Overhaul

**Complete Design System Refresh**
- New dashboard shell with responsive header and sidebar
- Updated design tokens (color system, focus rings, shadows, typography)
- Skip link for keyboard accessibility
- Mobile-responsive navigation with sheet component

**New Shared Components** (16 total):
- `DashboardShell` - Layout wrapper with nav
- `DashboardHeader` - Sticky header with breadcrumbs
- `DashboardNav` - Responsive sidebar navigation
- `StatCard` - Metric display cards
- `QuickActions` - Action button shortcuts
- `EmptyState` - Contextual empty states
- `LoadingState` - Skeleton loaders
- `AlertDialog` - Safe deletion confirmations
- `Sheet` - Mobile drawer/sidebar
- `Skeleton` - Loading placeholders
- `Tabs` - Tabbed interfaces
- `Badge` - Enhanced badge component
- `SectionNav` - Quick jump navigation

**Page Redesigns**:
- Dashboard overview with hero sections and stats
- Projects list with filter/search controls
- Documents list with modern empty states
- Project detail with tabbed workspace (Overview, Documents, Insights)
- Settings form with sectioned cards
- Login with hero messaging
- Signup with benefit callouts

**Design Documentation**:
- `design/DESIGN_FOUNDATIONS.md` - Complete design system
- `UI_UX_AUDIT_PHASE0.md` - Initial audit findings
- Updated Tailwind config with new tokens

### Added - Character Workspace Enhancements

**Character Editor**:
- Tabbed interface (Profile, Psychology, Story Arc, Notes)
- Section navigation for quick jumps
- Consistent chip controls for traits/tags/strengths
- Auto-save status indicators
- Better keyboard accessibility

**Relationship Visualization**:
- D3-powered network graph showing character connections
- Interactive force-directed layout
- Hover tooltips with relationship details
- Filter by relationship type, status, polarity
- Timeline tracking with start/end dates
- Event importance ratings

**Editor Chrome**:
- Sticky status bar with word count
- Live save indicator
- Two-column responsive layout
- AI assistant panel
- Utilities panel with quick actions

**Project Insights**:
- Cast composition analytics
- Relationship metrics dashboard
- Character statistics from Supabase
- Quick action buttons

**New Dependencies**:
- `d3` and `@types/d3` for network visualization
- `framer-motion` for smooth animations
- `@radix-ui/react-alert-dialog` for confirmations
- `@radix-ui/react-tabs` for tabbed interfaces

### Changed

**Build Performance**:
- Build time: ~9.4 seconds (down from 10s)
- Zero TypeScript errors
- All strict mode checks passing

**Security Enhancements**:
- All new RLS policies include WITH CHECK constraints
- User-scoped storage for images
- Cascade deletes prevent orphaned records
- API routes validate user ownership

**Component Architecture**:
- Migrated to new dashboard shell pattern
- Consistent empty state handling
- Unified loading states with skeletons
- Standardized dialog patterns

### Fixed

**TypeScript Issues**:
- Fixed implicit `any` in world-building event sort callback
- Removed unsafe type assertions in event form
- Added explicit `LocationEvent` type annotations

**UI/UX Issues**:
- Dashboard nav syntax error (missing closing tag)
- Mobile sidebar overflow on small screens
- Filter state persistence across page loads
- Empty state action buttons now work correctly

**Performance**:
- Optimized character relationship queries
- Added composite indexes for common filters
- Reduced unnecessary re-renders with useMemo

---

## [0.3.0] - 2025-10-16

### Added - Character Management System

**Character Features**:
- Comprehensive character profiles with 16 attribute fields
- Character role system (protagonist, antagonist, supporting, minor, other)
- Importance ratings (1-10 scale)
- Relationship management with 10 relationship types
- Character arc tracking with story beats
- Image upload for character portraits
- Filter by role and relationship type
- Advanced search and filtering

**Database Tables**:
- `characters` - Main character data
- `character_relationships` - Bidirectional relationships
- `character_arcs` - Story progression tracking
- 12 RLS policies with security fixes
- 16 performance indexes

**API Endpoints**:
- `/api/characters` - CRUD operations
- `/api/characters/relationships` - Relationship management
- `/api/characters/arcs` - Arc tracking

**Security Fixes**:
- Cross-project character access prevention
- Character reassignment vulnerability patched
- Loading state management improvements
- Accurate statistics with active filters

### Added - Plot Analysis System

**Plot Hole Detection**:
- AI-powered analysis using Claude 4.5 Sonnet
- 5 analysis types (full, timeline, character, logic, quick)
- Issue severity levels (critical, major, minor, suggestion)
- Resolution tracking workflow
- Live statistics display

**Database Schema**:
- `plot_analyses` - Analysis metadata
- `plot_issues` - Individual detected issues
- RLS policies with security fixes
- Indexes for performance

**API Endpoints**:
- `/api/plot-analysis` - Analysis CRUD
- `/api/plot-analysis/issues` - Issue management

**Security Fixes**:
- Removed SECURITY DEFINER vulnerabilities
- Fixed privilege escalation in helper functions
- Added explicit auth.uid() checks

### Added - Story Structure Tools

**Beat Sheet System**:
- 30+ story structure templates
- Customizable beat boards
- Drag-and-drop organization
- Template library

**Outline Generation**:
- AI-powered outline creation
- Multiple outline formats
- Integration with GPT-4
- Export capabilities

**Database Tables**:
- `story_beats` - Beat definitions
- `beat_templates` - Reusable templates
- `outlines` - Generated outlines
- `outline_sections` - Outline structure

### Changed

**Authentication Flow**:
- Simplified middleware (only cookie refresh)
- Converted dashboard layout to server component
- Fixed RSC request handling

**Security**:
- Added .gitignore for .claude/ directory
- Fixed RLS privilege escalation across all tables
- Added WITH CHECK constraints to all policies

---

## [0.2.0] - 2025-10-15

### Added - Core Features

**Project Management**:
- Create and manage screenplay projects
- Project type selection (screenplay, novel, etc.)
- Project-scoped documents and resources

**Document Editor**:
- TipTap-based rich text editor
- Screenplay formatting support
- Auto-save functionality
- Version history tracking
- Export to PDF/FDX

**Database Foundation**:
- Initial Supabase schema
- User authentication
- Project and document tables
- Basic RLS policies

**Stripe Integration**:
- Subscription management
- Payment processing
- Webhook handling
- Usage tracking

---

## [0.1.0] - 2025-10-14

### Added - Initial Release

**Authentication**:
- Email/password signup and login
- Supabase Auth integration
- Protected routes with middleware

**Landing Page**:
- Hero section
- Feature highlights
- Pricing page
- Responsive design

**Infrastructure**:
- Next.js 15.5.5 App Router
- TypeScript strict mode
- Tailwind CSS styling
- Supabase PostgreSQL database
- Vercel deployment

---

## Version History Legend

- **[Unreleased]** - Changes in development, not yet released
- **[0.4.0]** - World-Building, UI/UX overhaul, Character enhancements
- **[0.3.0]** - Character Management, Plot Analysis, Story Structure
- **[0.2.0]** - Core editor, Projects, Initial features
- **[0.1.0]** - Initial release with auth and landing page

---

## Upgrade Notes

### Migrating to 0.4.0

**Database Migrations Required**:
1. Run migration `20251017000010_world_building.sql`
2. Verify 8 RLS policies created
3. Verify 8 indexes created
4. Test world-building UI

**Environment Variables**:
- No new variables required
- Existing Supabase and Stripe config unchanged

**Breaking Changes**:
- None - all changes are additive

**New Dependencies**:
- `d3` - Network visualization
- `@types/d3` - TypeScript types
- `framer-motion` - Animations
- Radix UI components (alert-dialog, tabs)

**Installation**:
```bash
npm install
# or
pnpm install
```

### Migrating from 0.2.0 to 0.3.0

**Database Migrations Required**:
1. Run migrations 20251017000001 through 20251017000009
2. Verify all RLS policies applied
3. Test character and plot analysis features

**Security Updates**:
- Review and update RLS policies if you customized them
- Check for any SECURITY DEFINER functions in custom code

---

## Links

- **Repository**: [github.com/tempandmajor/ottowrite](https://github.com/tempandmajor/ottowrite)
- **Documentation**: `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/tempandmajor/ottowrite/issues)
- **Website**: [ottowrite.com](https://ottowrite.com) (placeholder)

---

**Note**: This is a living document. All dates use ISO 8601 format (YYYY-MM-DD).
