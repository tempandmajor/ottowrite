# What's New in OttoWrite v0.5.0 ✨

**Release Date**: October 20, 2025
**Focus**: Editor Intelligence & Workflow Enhancements

---

## 🎯 Overview

Version 0.5.0 brings powerful new intelligence features to your editor experience. Track document metadata, get instant reading insights, discover characters and scenes automatically, and let AI help you write with smart content insertion at your cursor—exactly where you need it.

---

## 🆕 New Features

### 📝 Document Metadata Tracking

**Never lose track of your story's perspective and tone again.**

Define key metadata for every document to maintain consistency across your writing:

- **POV Character**: Track which character's perspective drives the narrative
- **Pacing Target**: Set your desired rhythm (Slow, Balanced, or Fast)
- **Tone**: Define the emotional atmosphere (e.g., "dark," "humorous," "suspenseful")

**Where to find it**: Click the metadata button in your editor's header

**What happens**: Metadata saves automatically with your document and displays as badges in your chapter sidebar for quick reference.

![Metadata Example](https://placehold.co/800x400/4f46e5/white?text=Document+Metadata+Form)

---

### ⏱️ Live Reading Time & Pacing Insights

**See how your story flows in real-time.**

A new widget in your editor's left sidebar gives you instant feedback:

- **Reading Time**: Based on industry-standard 250 words per minute
- **Words per Chapter**: Average distribution across your structure
- **Pacing Gauge**: Visual indicator showing if your pacing is Fast, Balanced, or Slow
  - **Fast**: Less than 2,000 words per chapter (quick, punchy)
  - **Balanced**: 2,000-4,000 words per chapter (standard novel pacing)
  - **Slow**: Over 4,000 words per chapter (literary, detailed)

**Why it matters**: Adjust your pacing in real-time to match your genre and audience expectations.

![Reading Time Widget](https://placehold.co/600x300/6366f1/white?text=Reading+Time+%26+Pacing)

---

### 👥 Character & Scene Index

**Instantly find who appears where in your story.**

Two powerful new index tabs in your sidebar:

#### **Characters Tab**
- Automatically detects character names from dialogue and prose
- Shows each character's:
  - Total scene count
  - Line/appearance count
  - Last appearance (with jump-to link)
- Click any character to navigate to their most recent scene

#### **Scenes Tab**
- Parses screenplay-style scene headings (INT/EXT)
- Displays:
  - Scene type (Interior, Exterior, or Int/Ext)
  - Location
  - Time of day
  - Character count per scene
- Click any scene to jump directly to it in your document

**How it works**: The index updates automatically as you write. No manual tagging required!

![Character & Scene Index](https://placehold.co/800x400/8b5cf6/white?text=Character+%26+Scene+Index)

---

### 🤖 Enhanced AI Writing Commands

**Six powerful commands to accelerate your writing.**

All AI commands now route correctly to the backend with full validation:

1. **Continue** ➜ Extend your scene with consistent voice and pacing
2. **Rewrite** ➜ Polish prose for clarity and emotional impact
3. **Shorten** ➜ Tighten text by ~30% while keeping plot beats intact
4. **Expand** ➜ Add sensory details and grounding to enrich scenes
5. **Tone Shift** ➜ Adjust emotional temperature (increase tension, lighten mood, etc.)
6. **Brainstorm** ➜ Generate "what if" variations to explore new directions

**New**: Each command comes with default prompt templates. Save your own custom templates for reusable writing instructions!

**Where to find it**: AI Assistant panel in your editor

![AI Commands](https://placehold.co/800x300/ec4899/white?text=AI+Writing+Commands)

---

### 🎯 Cursor-Aware Content Insertion

**AI inserts exactly where your cursor is—not at the end of the document.**

This was a highly requested feature. Now when AI generates content:

**For Prose Documents**:
- Inserts at your current cursor position
- Replaces selected text if you've highlighted anything
- Supports multi-line insertions
- Handles Unicode and special characters

**For Screenplay Documents**:
- Inserts within the current element at cursor position
- Creates new elements for multi-paragraph AI responses
- Respects element boundaries (dialogue, action, etc.)

**How to use it**:
1. Place your cursor where you want AI content
2. (Optional) Select text to replace it
3. Use any AI command
4. Click "Insert into Editor"
5. Content appears exactly where you wanted it ✨

**Testing**: This feature passed 17 automated tests covering edge cases like empty documents, special characters, and Unicode.

---

## 🔧 Improvements

### Editor Performance
- **Real-time Updates**: All widgets use optimized rendering (React's useMemo)
- **Build Time**: Down to 57 seconds with 0 TypeScript errors
- **Bundle Size**: Production build optimized for faster page loads

### AI Assistant UX
- **Context Preview**: See which characters, locations, and events AI is aware of
- **Token Tracking**: View token usage breakdown (explicit, generated, selection)
- **Routing Transparency**: See which AI model was chosen and why
- **Model Override**: Manually select Claude, GPT-5, or DeepSeek if needed

### Data Persistence
- **Metadata Auto-Save**: Saves every 2 seconds with your document content
- **Reload Reliability**: Metadata persists across browser sessions
- **No Database Changes**: Metadata stored in existing `documents.content` field (backward compatible)

---

## 🐛 Bug Fixes

### Cursor Insertion
- Fixed screenplay editor test with incorrect cursor positions
- Verified selection boundaries are always respected
- Confirmed insertion never defaults to end-of-document

### Metadata
- Badge display now conditional (only shows when metadata exists)
- Fixed reload to properly initialize metadata from database
- Autosave payload now correctly includes metadata field

### Analytics
- Character/Scene index now updates immediately after edits
- Pacing gauge color transitions are smooth
- Reading time recalculates on every content change

---

## 📚 Documentation

### New Docs
- **End-to-End Editor QA** (`docs/EDITOR_E2E_QA.md`)
  - 70+ test cases
  - Manual testing scenarios
  - Known issues tracking
  - Performance guidelines

### Updated Docs
- **CHANGELOG.md**: Complete v0.5.0 release notes
- **Component docs**: File paths and line numbers for implementation details

---

## 🚀 Getting Started

### For New Users
1. Create a new document (Prose or Screenplay)
2. Open the metadata form (header button) and set POV, pacing, tone
3. Start writing—watch the Reading Time widget update in real-time
4. Use AI commands (Continue, Expand, etc.) and insert at your cursor
5. Check the Character & Scene Index to see your story's structure

### For Existing Users
- **No Migration Required**: All changes are backward compatible
- Your existing documents work as-is
- Metadata is optional—add it when you're ready
- All new features are immediately available in your editors

---

## 💡 Tips & Tricks

### Maximize the Metadata System
- **POV Character**: Great for switching perspectives in multi-POV novels
- **Pacing Target**: Set to "Fast" for thrillers, "Slow" for literary fiction
- **Tone**: Use descriptive words like "noir," "whimsical," or "gritty"

### Use the Pacing Widget
- **Green (Balanced)**: You're in the sweet spot for most genres
- **Orange (Fast)**: Perfect for YA, thrillers, or action scenes
- **Blue (Slow)**: Ideal for literary fiction or world-building chapters

### Character Index Pro Tips
- **Screenplay**: Use "CHARACTER:" format for reliable detection
- **Prose**: Use all-caps for first mention (e.g., "SARAH walked in")
- **Navigation**: Click "Last seen" to jump to a character's most recent appearance

### AI Command Workflow
1. **Draft** with "Continue" command
2. **Refine** with "Rewrite" or "Shorten"
3. **Enhance** with "Expand" for sensory details
4. **Adjust** with "Tone Shift" to match your target mood
5. **Explore** with "Brainstorm" when you're stuck

### Custom Templates
- Save frequently-used AI prompts as templates
- Group templates by command type
- Share templates with your writing group (export feature coming soon!)

---

## 🔒 Privacy & Security

- **Data Storage**: All metadata stored within your document's JSONB content field
- **User-Scoped**: Row-level security ensures you only see your own data
- **No New Tables**: Zero database schema changes for this release
- **Backward Compatible**: Old documents work without modification

---

## 🐞 Known Issues

### Pending Manual QA
- Basic editing smoke tests pending (typing, formatting)
- AI template CRUD operations need user testing
- Conflict resolution UI requires multi-user testing

### Future Enhancements
- E2E tests with Playwright for critical user flows
- Performance testing with large documents (10k+ words, 50+ chapters)
- Browser compatibility verification (Chrome, Firefox, Safari)
- Mobile responsiveness for editor widgets

**See Full QA Report**: `docs/EDITOR_E2E_QA.md`

---

## 🔮 What's Next?

Looking ahead to **v0.6.0** and beyond:

- **Collaborative Editing**: Real-time multi-user support
- **Version History**: Visual timeline of document changes
- **Advanced Analytics**: Plot structure analysis, dialogue distribution
- **Export Formats**: PDF, EPUB, FDX (screenplay), DOCX
- **AI Context Memory**: Long-term story memory across sessions
- **Mobile App**: Native iOS/Android editing experience

---

## 📣 Feedback

We'd love to hear from you!

- **Found a bug?** [File an issue on GitHub](https://github.com/tempandmajor/ottowrite/issues)
- **Feature request?** Share your ideas in our community forum
- **Love a feature?** Let us know what's working well!

---

## 🙏 Thank You

Special thanks to our beta testers and early adopters for your feedback and patience. Your input directly shaped these features.

Happy writing! ✍️

---

**Version**: 0.5.0
**Release Date**: October 20, 2025
**Build**: Production-ready, 0 TypeScript errors
**Test Coverage**: 17/17 cursor insertion tests passing

---

## Quick Links

- [Full Changelog](../CHANGELOG.md#050---2025-10-20)
- [End-to-End QA Report](EDITOR_E2E_QA.md)
- [User Guide](WORLD_BUILDING_USER_GUIDE.md) (World-building features)
- [GitHub Repository](https://github.com/tempandmajor/ottowrite)
