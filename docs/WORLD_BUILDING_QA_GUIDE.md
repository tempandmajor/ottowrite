# World-Building QA Testing Guide

**Feature**: Location & Timeline Management
**Status**: Ready for QA
**Last Updated**: October 17, 2025

---

## Prerequisites

1. ✅ Migration applied (locations & location_events tables exist)
2. ✅ RLS policies active (8 policies verified)
3. ✅ API routes deployed (/api/locations, /api/locations/events)
4. ✅ UI page accessible at `/dashboard/projects/[id]/world-building`

---

## Quick Start Testing

### Option 1: Manual Testing (Recommended)

1. **Navigate to World-Building**
   ```
   Login → Dashboard → Select a Project → World building (in sidebar)
   ```

2. **Create Your First Location**
   - Click "New location" button
   - Fill in the form:
     - Name: "Crystal Falls City"
     - Category: Settlement
     - Summary: "A trading hub built around magical waterfalls"
     - Add some key features (comma-separated)
     - Add tags (comma-separated)
   - Click "Create location"

3. **Add a Timeline Event**
   - Find your location card
   - Click "Add event" button
   - Fill in:
     - Title: "Founding of the City"
     - Timeline marker: "Year 0"
     - Description: "The first settlers discovered the falls"
     - Importance: 8
   - Click "Create event"

4. **Test Filtering**
   - Create 2-3 more locations with different categories
   - Use the category dropdown to filter
   - Use the search box to find locations by name

5. **Test Timeline View**
   - Click the "Timeline" tab
   - Verify events appear chronologically
   - Check that location names are displayed

### Option 2: Seed Data Testing

If you want rich sample data to test with:

1. **Get Your IDs**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT auth.uid() as user_id;
   SELECT id, title FROM projects WHERE user_id = auth.uid();
   ```

2. **Load Seed Data**
   - Open `/scripts/seed-world-building.sql`
   - Replace `{PROJECT_ID}` with your project ID from step 1
   - Run the entire script in Supabase SQL Editor
   - This creates 5 locations and 15 timeline events

3. **Explore the Data**
   - Navigate to world-building page
   - You'll see:
     - Emberfall Citadel (settlement)
     - The Whispering Woods (region)
     - The Crystal Spire (landmark)
     - The Shadowfell Rift (realm)
     - The Wandering Bazaar (other)
   - Each has 3-4 timeline events

---

## Testing Checklist

### Core Functionality

- [ ] **Create Location**
  - [ ] All fields save correctly
  - [ ] Category dropdown works
  - [ ] Key features array saves (comma-separated)
  - [ ] Tags array saves (comma-separated)
  - [ ] Toast notification appears on success

- [ ] **Edit Location**
  - [ ] Edit button opens dialog with existing data
  - [ ] Changes save correctly
  - [ ] updated_at timestamp updates

- [ ] **Delete Location**
  - [ ] Alert dialog appears for confirmation
  - [ ] Location deletes on confirm
  - [ ] Associated events also delete (cascade)
  - [ ] Toast notification appears

- [ ] **Create Event**
  - [ ] Event form opens from location card
  - [ ] All fields save correctly
  - [ ] Importance slider works (1-10)
  - [ ] Event appears in location card
  - [ ] Event appears in Timeline tab

- [ ] **Edit Event**
  - [ ] Edit button opens dialog with existing data
  - [ ] Changes save correctly

- [ ] **Delete Event**
  - [ ] Delete button removes event
  - [ ] Doesn't affect other events or location

### Filtering & Search

- [ ] **Category Filter**
  - [ ] "All categories" shows everything
  - [ ] Each category filters correctly
  - [ ] Stats cards show accurate counts
  - [ ] Filter persists when searching

- [ ] **Search**
  - [ ] Finds locations by name (case-insensitive)
  - [ ] Finds locations by summary text
  - [ ] Empty search shows all locations
  - [ ] Search works with category filter

- [ ] **Timeline Tab**
  - [ ] Shows all events from all locations
  - [ ] Events display location name
  - [ ] Importance ratings display correctly
  - [ ] Empty state shows when no events exist

### UI/UX

- [ ] **Hero Section**
  - [ ] Stats update when locations/events added
  - [ ] "New location" button works

- [ ] **Category Stats Cards**
  - [ ] All 5 categories display
  - [ ] Counts are accurate
  - [ ] Descriptions are helpful

- [ ] **Location Cards**
  - [ ] Display all metadata correctly
  - [ ] Show up to 3 events per card
  - [ ] Edit/Delete buttons work
  - [ ] Timeline preview is accurate

- [ ] **Empty States**
  - [ ] Show when no locations exist
  - [ ] Show when no events exist
  - [ ] Show when filters return no results
  - [ ] Action buttons in empty states work

### Mobile/Responsive

- [ ] **Mobile (< 768px)**
  - [ ] Hero section stacks vertically
  - [ ] Stats cards stack in single column
  - [ ] Filter controls stack
  - [ ] Location cards are full width
  - [ ] Dialogs are scrollable

- [ ] **Tablet (768px - 1024px)**
  - [ ] 2-column grid for location cards
  - [ ] Filters display side-by-side
  - [ ] Stats cards in appropriate grid

- [ ] **Desktop (> 1024px)**
  - [ ] Full layout displays correctly
  - [ ] 3-column stats grid
  - [ ] 2-column location grid

### Image Upload

- [ ] **Upload**
  - [ ] Click upload button opens file picker
  - [ ] Only image files accepted (JPEG, PNG, WebP, GIF)
  - [ ] File size validation (5MB max)
  - [ ] Image preview displays
  - [ ] Image saves with location

- [ ] **Delete**
  - [ ] X button removes image
  - [ ] Image deleted from storage
  - [ ] Can upload new image after delete

### Performance

- [ ] **Load Time**
  - [ ] Page loads in < 2 seconds with 10 locations
  - [ ] Page loads in < 5 seconds with 50+ locations

- [ ] **Filtering**
  - [ ] Category filter is instant
  - [ ] Search responds within 100ms

- [ ] **Creation**
  - [ ] Location creates in < 1 second
  - [ ] Event creates in < 1 second
  - [ ] UI updates immediately

### Security

- [ ] **RLS Enforcement**
  - [ ] Cannot view other users' locations
  - [ ] Cannot edit other users' locations
  - [ ] Cannot delete other users' locations
  - [ ] API returns 401/403 for unauthorized access

- [ ] **Data Validation**
  - [ ] Cannot create location without name
  - [ ] Category must be one of 5 valid options
  - [ ] Event importance clamped to 1-10
  - [ ] Name length enforced (1-150 chars)
  - [ ] Event title length enforced (1-200 chars)

---

## Common Issues & Solutions

### Issue: "No locations yet" shows after creating location
**Solution**: Check browser console for API errors. Verify user is authenticated.

### Issue: Timeline events don't sort chronologically
**Solution**: This is expected - `occurs_at` is flexible text. Events sort by creation time within each location.

### Issue: Image upload fails
**Solution**: Verify `character-images` bucket exists in Supabase Storage and has correct RLS policies.

### Issue: Category filter doesn't work
**Solution**: Check that categoryFilter state is updating. Verify filteredLocations useMemo depends on categoryFilter.

### Issue: Search is case-sensitive
**Solution**: Verify .toLowerCase() is applied to both search term and location name/summary.

---

## Test Data Examples

### Good Test Cases

**Diverse Categories**:
- Settlement: "Harbor Town", "Mountain Fortress", "Desert Oasis"
- Region: "The Frozen North", "Emerald Plains", "Volcanic Badlands"
- Landmark: "Ancient Temple", "Crystal Caves", "Sky Bridge"
- Realm: "Feywild Grove", "Shadow Realm", "Astral Sea"
- Other: "Floating Bazaar", "Time Loop", "Dreamscape"

**Edge Cases**:
- Very long names (149 chars)
- Names with special characters: "O'Malley's Pub", "Château Rouge"
- Empty optional fields
- Maximum arrays: 20+ key features, 30+ tags
- Events with no occurs_at (should still display)
- Importance at extremes (1 and 10)

**Stress Testing**:
- Create 100+ locations
- Create 500+ events across locations
- Upload large images (close to 5MB)
- Rapid filtering/searching
- Multiple tabs open simultaneously

---

## Reporting Issues

When you find a bug, include:

1. **Steps to Reproduce**
2. **Expected Behavior**
3. **Actual Behavior**
4. **Browser & Device** (Chrome/Safari/Firefox, Desktop/Mobile)
5. **Screenshots** (if UI issue)
6. **Console Errors** (if applicable)

Example:
```
Steps:
1. Navigate to world-building page
2. Create location named "Test City"
3. Click "Add event" button
4. Fill in event details
5. Click "Create event"

Expected: Event appears in location card
Actual: Event creates but doesn't show until page refresh
Browser: Chrome 119 on macOS
Console: No errors
```

---

## Next Steps After QA

1. **Fix Critical Bugs** - Anything that blocks core functionality
2. **Polish UX** - Improve based on feedback
3. **Optimize Performance** - If load times are slow with many locations
4. **Add Enhancements**:
   - Visual timeline (horizontal timeline UI)
   - Map view (geographical relationships)
   - Location templates (pre-filled common types)
   - Export/import data
   - Character-location links

---

## QA Sign-Off

Once testing is complete, confirm:

- [ ] All core functionality works
- [ ] No critical bugs found
- [ ] Mobile experience is acceptable
- [ ] Performance is adequate
- [ ] Security is verified
- [ ] Feature is ready for users

**Tested By**: _________________
**Date**: _________________
**Status**: ☐ Pass  ☐ Fail  ☐ Pass with Issues

**Notes**:
