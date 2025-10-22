/**
 * Folder Templates Library
 * Pre-built folder structures for common writing workflows
 * TICKET-005: Folder templates (Hero's Journey, Three-Act Structure, Snowflake Method)
 */

export type FolderType = 'manuscript' | 'research' | 'characters' | 'deleted' | 'notes' | 'custom'

export interface TemplateFolder {
  title: string
  type: FolderType
  children?: TemplateFolder[]
}

export interface FolderTemplate {
  id: string
  name: string
  description: string
  icon: string
  folders: TemplateFolder[]
}

/**
 * Hero's Journey (12 Stages)
 * Joseph Campbell's monomyth structure
 */
export const HEROS_JOURNEY_TEMPLATE: FolderTemplate = {
  id: 'heros-journey',
  name: "Hero's Journey (12 Stages)",
  description: "Joseph Campbell's classic monomyth structure with three acts",
  icon: '🗺️',
  folders: [
    {
      title: 'Act I - Departure',
      type: 'manuscript',
      children: [
        { title: '1. Ordinary World', type: 'manuscript' },
        { title: '2. Call to Adventure', type: 'manuscript' },
        { title: '3. Refusal of the Call', type: 'manuscript' },
        { title: '4. Meeting the Mentor', type: 'manuscript' },
        { title: '5. Crossing the Threshold', type: 'manuscript' },
      ],
    },
    {
      title: 'Act II - Initiation',
      type: 'manuscript',
      children: [
        { title: '6. Tests, Allies, Enemies', type: 'manuscript' },
        { title: '7. Approach to Inmost Cave', type: 'manuscript' },
        { title: '8. Ordeal', type: 'manuscript' },
        { title: '9. Reward (Seizing the Sword)', type: 'manuscript' },
      ],
    },
    {
      title: 'Act III - Return',
      type: 'manuscript',
      children: [
        { title: '10. The Road Back', type: 'manuscript' },
        { title: '11. Resurrection', type: 'manuscript' },
        { title: '12. Return with the Elixir', type: 'manuscript' },
      ],
    },
  ],
}

/**
 * Three-Act Structure
 * Classic screenplay and novel structure
 */
export const THREE_ACT_TEMPLATE: FolderTemplate = {
  id: 'three-act',
  name: 'Three-Act Structure',
  description: 'Classic story structure with setup, confrontation, and resolution',
  icon: '🎬',
  folders: [
    {
      title: 'Act I - Setup (25%)',
      type: 'manuscript',
      children: [
        { title: 'Opening Image', type: 'manuscript' },
        { title: 'Exposition', type: 'manuscript' },
        { title: 'Inciting Incident', type: 'manuscript' },
        { title: 'Plot Point 1', type: 'manuscript' },
      ],
    },
    {
      title: 'Act II - Confrontation (50%)',
      type: 'manuscript',
      children: [
        { title: 'Rising Action', type: 'manuscript' },
        { title: 'Midpoint', type: 'manuscript' },
        { title: 'Plot Point 2', type: 'manuscript' },
      ],
    },
    {
      title: 'Act III - Resolution (25%)',
      type: 'manuscript',
      children: [
        { title: 'Pre-Climax', type: 'manuscript' },
        { title: 'Climax', type: 'manuscript' },
        { title: 'Falling Action', type: 'manuscript' },
        { title: 'Resolution', type: 'manuscript' },
      ],
    },
  ],
}

/**
 * Snowflake Method
 * Randy Ingermanson's 10-step progressive expansion method
 */
export const SNOWFLAKE_TEMPLATE: FolderTemplate = {
  id: 'snowflake',
  name: 'Snowflake Method',
  description: "Randy Ingermanson's 10-step progressive story development method",
  icon: '❄️',
  folders: [
    {
      title: 'Step 1 - One-Sentence Summary',
      type: 'notes',
    },
    {
      title: 'Step 2 - One-Paragraph Summary',
      type: 'notes',
    },
    {
      title: 'Step 3 - Character Summaries',
      type: 'characters',
      children: [
        { title: 'Protagonist', type: 'characters' },
        { title: 'Antagonist', type: 'characters' },
        { title: 'Supporting Characters', type: 'characters' },
      ],
    },
    {
      title: 'Step 4 - Expand Each Sentence',
      type: 'notes',
    },
    {
      title: 'Step 5 - Character Charts',
      type: 'characters',
      children: [
        { title: 'Character Goals', type: 'characters' },
        { title: 'Character Conflicts', type: 'characters' },
        { title: 'Character Epiphanies', type: 'characters' },
      ],
    },
    {
      title: 'Step 6 - Four-Page Synopsis',
      type: 'notes',
    },
    {
      title: 'Step 7 - Expanded Character Charts',
      type: 'characters',
    },
    {
      title: 'Step 8 - Scene List',
      type: 'notes',
    },
    {
      title: 'Step 9 - Narrative Description',
      type: 'notes',
    },
    {
      title: 'Step 10 - First Draft',
      type: 'manuscript',
      children: [
        { title: 'Chapter 1', type: 'manuscript' },
        { title: 'Chapter 2', type: 'manuscript' },
        { title: 'Chapter 3', type: 'manuscript' },
      ],
    },
  ],
}

/**
 * Save the Cat Beat Sheet
 * Blake Snyder's 15-beat structure
 */
export const SAVE_THE_CAT_TEMPLATE: FolderTemplate = {
  id: 'save-the-cat',
  name: 'Save the Cat (15 Beats)',
  description: "Blake Snyder's screenplay structure with 15 key story beats",
  icon: '🐱',
  folders: [
    {
      title: 'Act I - Setup',
      type: 'manuscript',
      children: [
        { title: '1. Opening Image', type: 'manuscript' },
        { title: '2. Theme Stated', type: 'manuscript' },
        { title: '3. Set-Up', type: 'manuscript' },
        { title: '4. Catalyst', type: 'manuscript' },
        { title: '5. Debate', type: 'manuscript' },
      ],
    },
    {
      title: 'Act II - Confrontation',
      type: 'manuscript',
      children: [
        { title: '6. Break Into Two', type: 'manuscript' },
        { title: '7. B Story', type: 'manuscript' },
        { title: '8. Fun and Games', type: 'manuscript' },
        { title: '9. Midpoint', type: 'manuscript' },
        { title: '10. Bad Guys Close In', type: 'manuscript' },
        { title: '11. All Is Lost', type: 'manuscript' },
        { title: '12. Dark Night of the Soul', type: 'manuscript' },
      ],
    },
    {
      title: 'Act III - Resolution',
      type: 'manuscript',
      children: [
        { title: '13. Break Into Three', type: 'manuscript' },
        { title: '14. Finale', type: 'manuscript' },
        { title: '15. Final Image', type: 'manuscript' },
      ],
    },
  ],
}

/**
 * Blank Template
 * Empty structure for users who want to start fresh
 */
export const BLANK_TEMPLATE: FolderTemplate = {
  id: 'blank',
  name: 'Blank Project',
  description: 'Start with a clean slate - no pre-defined folders',
  icon: '📄',
  folders: [],
}

/**
 * All available templates
 */
export const FOLDER_TEMPLATES: FolderTemplate[] = [
  BLANK_TEMPLATE,
  HEROS_JOURNEY_TEMPLATE,
  THREE_ACT_TEMPLATE,
  SAVE_THE_CAT_TEMPLATE,
  SNOWFLAKE_TEMPLATE,
]

/**
 * Get template by ID
 */
export function getTemplateById(id: string): FolderTemplate | undefined {
  return FOLDER_TEMPLATES.find((template) => template.id === id)
}

/**
 * Get default template for project type
 */
export function getDefaultTemplate(projectType: 'novel' | 'screenplay' | 'play' | 'short_story'): FolderTemplate {
  switch (projectType) {
    case 'screenplay':
      return SAVE_THE_CAT_TEMPLATE
    case 'novel':
      return THREE_ACT_TEMPLATE
    default:
      return BLANK_TEMPLATE
  }
}
