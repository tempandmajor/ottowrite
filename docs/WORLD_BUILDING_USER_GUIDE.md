# World-Building Guide

Build rich, detailed worlds for your stories with OttoWrite's World-Building module.

---

## Overview

The World-Building module helps you create and organize the places that anchor your story. Track locations, their history, culture, and how they evolve throughout your narrative.

**Perfect for**:
- Fantasy world-building
- Sci-fi universe creation
- Historical fiction settings
- Any story with multiple important locations

---

## Getting Started

### Access World-Building

1. Go to your project dashboard
2. Click **"World building"** in the sidebar
3. You'll see the World-Building overview with:
   - Total location count
   - Timeline entries count
   - Category breakdown

### Your First Location

1. Click **"New location"**
2. Fill in the basic details:
   - **Name**: Give your location a memorable name
   - **Category**: Choose what type of place it is
   - **Summary**: A brief overview (1-2 sentences)

3. Add rich details (optional):
   - **History**: How the location came to be
   - **Culture**: What makes this place unique
   - **Environment**: Climate, terrain, conditions
   - **Key Features**: Notable landmarks or characteristics
   - **Tags**: Keywords for quick reference

4. Click **"Create location"**

---

## Location Categories

Organize your world with 5 flexible categories:

### 🏘️ Settlements
Cities, towns, villages, outposts, camps
- **Examples**: Capital cities, frontier towns, hidden villages
- **Use for**: Population centers, player hubs, quest locations

### 🗺️ Regions
Continents, countries, provinces, territories
- **Examples**: Kingdoms, wastelands, archipelagos
- **Use for**: Large-scale geography, political boundaries

### ⛰️ Landmarks
Temples, mountains, ruins, monuments
- **Examples**: Ancient pyramids, sacred groves, battlefields
- **Use for**: Notable points of interest, adventure sites

### 🌌 Realms
Other worlds, planes of existence, dimensions
- **Examples**: Feywild, Shadowfell, Astral Plane
- **Use for**: Planar settings, parallel dimensions

### ✨ Other
Anything that doesn't fit above
- **Examples**: Mobile locations, pocket dimensions, conceptual spaces
- **Use for**: Unique or category-defying places

---

## Timeline Events

Track how locations change throughout your story.

### Adding Events

1. Find a location card
2. Click **"Add event"**
3. Fill in the details:
   - **Title**: What happened?
   - **Timeline marker**: When did it happen?
   - **Description**: Additional context
   - **Importance**: Rate 1-10 how significant this event is
   - **Key Characters**: Who was involved?
   - **Tags**: Categorize the event

4. Click **"Create event"**

### Timeline Markers

The "occurs_at" field is flexible - use whatever system fits your story:

**Story-based**:
- "Act I, Scene 3"
- "Chapter 14"
- "Book 2, Page 203"

**Calendar-based**:
- "Year 402 of the Third Age"
- "1847 CE"
- "3rd Moon, 12th Day"

**Relative**:
- "Before the war"
- "During the siege"
- "10 years after the founding"

---

## Organizing Your World

### Filtering

Use the category dropdown to focus on specific types of locations:
- All categories (default)
- Settlements only
- Regions only
- Landmarks only
- Realms only
- Other

### Searching

The search box finds locations by:
- Location name
- Summary text

Tip: Combine filters and search for precise results

### Timeline View

Click the **"Timeline"** tab to see all events across all locations in one view. Perfect for:
- Tracking chronological order
- Finding plot connections
- Ensuring consistency

---

## Advanced Features

### Image Uploads

Add visual reference for any location:

1. Click the image upload area in the location editor
2. Select an image file (JPEG, PNG, WebP, or GIF)
3. Maximum 5MB per image
4. Images are stored securely in your account

**Tips**:
- Use concept art or reference images
- Screenshots from games/movies (personal use only)
- AI-generated location art
- Your own sketches or maps

### Key Features

List what makes each location unique:
- Natural features: "Crystal clear lakes", "Volcanic vents", "Ancient trees"
- Structures: "Obsidian walls", "Floating towers", "Underground tunnels"
- Magical elements: "Ley line convergence", "Time dilation", "Portal nexus"

Enter as comma-separated values: `Crystal pools, Singing waterfalls, Eternal mists`

### Tags

Organize and cross-reference:
- **Themes**: `dangerous`, `mysterious`, `sacred`, `corrupted`
- **Factions**: `dwarven`, `rebel-controlled`, `neutral territory`
- **Story arcs**: `act-one`, `final-battle`, `origin-location`
- **Status**: `unexplored`, `discovered`, `destroyed`, `restored`

---

## Use Cases & Examples

### Fantasy World

**Example Setup**:
- **Regions**: The Frozen North, Emerald Plains, Desert of Glass
- **Settlements**: Capital City Astoria, Mining Town Irondeep
- **Landmarks**: The Crystal Spire, Temple of the Old Gods
- **Realms**: The Feywild Grove (connection point)

**Timeline Events**:
- Track wars, founding of cities, natural disasters
- Mark when characters discover new locations
- Record how magic affects different places

### Sci-Fi Universe

**Example Setup**:
- **Regions**: Outer Rim Sectors, Core Worlds
- **Settlements**: Space Station Alpha, Colony Ship Haven
- **Landmarks**: The Artifact Planet, Dyson Sphere Ruins
- **Realms**: Hyperspace Nexus Points

**Timeline Events**:
- Colonization dates
- First contact events
- Technological discoveries
- Planetary catastrophes

### Historical Fiction

**Example Setup**:
- **Regions**: Victorian London, American Frontier, Colonial India
- **Settlements**: Actual historical cities
- **Landmarks**: Real historical sites
- **Other**: Social spaces (saloons, ballrooms, markets)

**Timeline Events**:
- Real historical events
- Fictional events in your story
- Character movements between locations

---

## Tips & Best Practices

### Start Small
Don't try to map your entire world at once. Start with:
1. The starting location
2. 2-3 key destinations
3. Add more as your story develops

### Use Consistent Details
Reference your location notes when writing to maintain consistency in:
- Geography (distances, climate)
- Culture (customs, language)
- History (who founded it, major events)

### Link to Characters
In event descriptions, mention which characters were involved. This helps you:
- Track character movements
- Find plot connections
- Maintain timeline consistency

### Update as You Write
When something important happens in your story:
1. Add it as a timeline event
2. Update the location's summary if needed
3. Adjust tags to reflect new status

### Export Your Data
Periodically export your world-building data (feature coming soon) to:
- Back up your work
- Share with beta readers
- Create reference documents

---

## Keyboard Shortcuts

(Coming soon)
- `N` - New location
- `/` - Focus search
- `Esc` - Close dialogs
- `Tab` - Navigate between Location/Timeline tabs

---

## API Integration

Developers can access world-building data via API:

### Endpoints

**GET** `/api/locations?project_id={id}`
- List all locations for a project

**POST** `/api/locations`
- Create new location

**PATCH** `/api/locations`
- Update existing location

**DELETE** `/api/locations?id={id}`
- Delete location (cascades to events)

**GET** `/api/locations/events?location_id={id}`
- List events for a location

**POST** `/api/locations/events`
- Create new event

**PATCH** `/api/locations/events`
- Update existing event

**DELETE** `/api/locations/events?id={id}`
- Delete event

### Authentication

All API calls require:
- Valid session cookie OR
- API key in Authorization header

### RLS Security

Data is automatically scoped to:
- Your user account (can't access other users' data)
- Specified project (can't access data from other projects)

---

## Troubleshooting

### "No locations yet" shows after creating
- Check your internet connection
- Refresh the page
- Check browser console for errors

### Image upload fails
- Verify file is under 5MB
- Use supported formats: JPEG, PNG, WebP, GIF
- Check storage quota in settings

### Timeline events don't appear
- Verify event was saved (check for success toast)
- Refresh the page
- Check that location_id matches

### Can't find a location
- Check spelling in search
- Verify category filter isn't excluding it
- Check if it's in a different project

---

## Feature Requests

Have ideas for improving World-Building? We'd love to hear them:

**Planned Features**:
- Visual timeline UI (horizontal timeline)
- Map view with geographical relationships
- Location templates (common types pre-filled)
- Export to PDF/markdown
- Link locations to characters
- Location hierarchies (city within region)

**Submit Requests**:
- GitHub Issues: [github.com/tempandmajor/ottowrite/issues](https://github.com/tempandmajor/ottowrite/issues)
- Email: feedback@ottowrite.com (placeholder)

---

## FAQs

**Q: How many locations can I create?**
A: No hard limit, but performance may degrade with 500+ locations per project.

**Q: Can I reorder timeline events?**
A: Events are automatically sorted by their creation date within each location. Use the "occurs_at" field to indicate narrative order.

**Q: Can I share locations between projects?**
A: Not yet, but this is a planned feature.

**Q: Are images stored in my account?**
A: Yes, images are stored in your Supabase Storage bucket with user-scoped permissions.

**Q: Can I bulk import locations?**
A: Not through the UI yet, but you can use the API or SQL to bulk import.

**Q: What happens if I delete a location?**
A: All associated timeline events are also deleted (cascade delete). This cannot be undone.

---

## Getting Help

- **Documentation**: [docs.ottowrite.com](https://docs.ottowrite.com) (placeholder)
- **Community**: [discord.gg/ottowrite](https://discord.gg/ottowrite) (placeholder)
- **Support**: support@ottowrite.com (placeholder)
- **GitHub**: [github.com/tempandmajor/ottowrite](https://github.com/tempandmajor/ottowrite)

---

**Last Updated**: October 17, 2025
**Version**: 1.0.0
