/**
 * Database Seeder for Screenplay Templates
 * Seeds the document_templates table with 11 screenplay format templates
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TemplateData {
  name: string
  description: string
  category: string
  format_type: 'feature' | 'tv' | 'stage' | 'audio' | 'short'
  structure: any
  default_settings: any
  is_system: boolean
}

const templates: TemplateData[] = [
  {
    name: 'Feature Film Screenplay',
    description: 'Standard feature film format following industry guidelines for theatrical releases',
    category: 'screenplay',
    format_type: 'feature',
    structure: {
      acts: 3,
      estimatedPageCount: 110,
      sections: ['Act I', 'Act II', 'Act III']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { indent: 3.7, allCaps: true, spacing: { before: 1, after: 0 } },
        parenthetical: { indent: 3.1, spacing: { before: 0, after: 0 } },
        dialogue: { indent: 2.5, width: 3.5, spacing: { before: 0, after: 1 } },
        transition: { indent: 6, allCaps: true, spacing: { before: 1, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'TV Drama (One-Hour)',
    description: 'One-hour television drama format with act breaks for commercial interruptions',
    category: 'screenplay',
    format_type: 'tv',
    structure: {
      acts: 5,
      estimatedPageCount: 55,
      sections: ['Teaser', 'Act I', 'Act II', 'Act III', 'Act IV', 'Tag'],
      actBreaks: true
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { indent: 3.7, allCaps: true, spacing: { before: 1, after: 0 } },
        parenthetical: { indent: 3.1, spacing: { before: 0, after: 0 } },
        dialogue: { indent: 2.5, width: 3.5, spacing: { before: 0, after: 1 } },
        actBreak: { centered: true, allCaps: true, spacing: { before: 2, after: 2 } }
      }
    },
    is_system: true
  },
  {
    name: 'TV Sitcom (Half-Hour)',
    description: 'Half-hour television sitcom format with traditional multi-camera or single-camera structure',
    category: 'screenplay',
    format_type: 'tv',
    structure: {
      acts: 2,
      estimatedPageCount: 30,
      sections: ['Act I', 'Act II', 'Tag']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { indent: 3.7, allCaps: true, spacing: { before: 1, after: 0 } },
        parenthetical: { indent: 3.1, spacing: { before: 0, after: 0 } },
        dialogue: { indent: 2.5, width: 3.5, spacing: { before: 0, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'BBC TV Drama',
    description: 'British television drama format following BBC guidelines',
    category: 'screenplay',
    format_type: 'tv',
    structure: {
      acts: 1,
      estimatedPageCount: 60,
      sections: ['Main Body']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      sceneNumbering: true,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { indent: 3.7, allCaps: true, spacing: { before: 1, after: 0 } },
        dialogue: { indent: 2.5, width: 3.5, spacing: { before: 0, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'Stage Play',
    description: 'Traditional stage play format for theatrical productions',
    category: 'screenplay',
    format_type: 'stage',
    structure: {
      acts: 2,
      estimatedPageCount: 80,
      sections: ['Act I', 'Act II']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { centered: true, allCaps: true, spacing: { before: 2, after: 2 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { centered: true, allCaps: true, spacing: { before: 1, after: 0 } },
        parenthetical: { centered: true, spacing: { before: 0, after: 0 } },
        dialogue: { indent: 3, width: 3, spacing: { before: 0, after: 1 } },
        stageDirection: { indent: 0, italics: true, spacing: { before: 1, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'Musical Stage Play',
    description: 'Musical theater format with lyrics and music cues',
    category: 'screenplay',
    format_type: 'stage',
    structure: {
      acts: 2,
      estimatedPageCount: 90,
      sections: ['Act I', 'Act II'],
      includesMusic: true
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { centered: true, allCaps: true, spacing: { before: 2, after: 2 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { centered: true, allCaps: true, spacing: { before: 1, after: 0 } },
        dialogue: { indent: 3, width: 3, spacing: { before: 0, after: 1 } },
        lyrics: { indent: 3.5, italics: true, spacing: { before: 1, after: 0 } },
        musicCue: { indent: 2, allCaps: true, spacing: { before: 1, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'Audio Drama',
    description: 'Radio or podcast drama format focusing on audio elements',
    category: 'screenplay',
    format_type: 'audio',
    structure: {
      acts: 3,
      estimatedPageCount: 40,
      sections: ['Act I', 'Act II', 'Act III']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        soundEffect: { allCaps: true, indent: 2, spacing: { before: 1, after: 1 } },
        music: { allCaps: true, indent: 2, spacing: { before: 1, after: 1 } },
        character: { indent: 0, allCaps: true, spacing: { before: 1, after: 0 } },
        dialogue: { indent: 2, spacing: { before: 0, after: 1 } },
        narrator: { indent: 0, spacing: { before: 1, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'Animation Screenplay',
    description: 'Animation format with detailed visual descriptions',
    category: 'screenplay',
    format_type: 'feature',
    structure: {
      acts: 3,
      estimatedPageCount: 90,
      sections: ['Act I', 'Act II', 'Act III']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { indent: 3.7, allCaps: true, spacing: { before: 1, after: 0 } },
        dialogue: { indent: 2.5, width: 3.5, spacing: { before: 0, after: 1 } },
        animation: { indent: 1, italics: true, spacing: { before: 1, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'Documentary Screenplay',
    description: 'Documentary format with interview and narration sections',
    category: 'screenplay',
    format_type: 'feature',
    structure: {
      acts: 3,
      estimatedPageCount: 60,
      sections: ['Opening', 'Main Body', 'Conclusion']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        interview: { indent: 0, allCaps: true, spacing: { before: 1, after: 0 } },
        interviewDialogue: { indent: 2, spacing: { before: 0, after: 1 } },
        narration: { indent: 0, spacing: { before: 1, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'Short Film Screenplay',
    description: 'Concise format for short films (under 40 minutes)',
    category: 'screenplay',
    format_type: 'short',
    structure: {
      acts: 1,
      estimatedPageCount: 15,
      sections: ['Main Story']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { indent: 3.7, allCaps: true, spacing: { before: 1, after: 0 } },
        dialogue: { indent: 2.5, width: 3.5, spacing: { before: 0, after: 1 } }
      }
    },
    is_system: true
  },
  {
    name: 'Webisode',
    description: 'Web series format optimized for online viewing (3-15 minutes)',
    category: 'screenplay',
    format_type: 'short',
    structure: {
      acts: 1,
      estimatedPageCount: 8,
      sections: ['Main Story']
    },
    default_settings: {
      font: 'Courier Prime',
      fontSize: 12,
      pageMargins: { top: 1, bottom: 1, left: 1.5, right: 1 },
      lineSpacing: 1,
      elements: {
        sceneHeading: { allCaps: true, spacing: { before: 2, after: 1 } },
        action: { indent: 0, spacing: { before: 0, after: 1 } },
        character: { indent: 3.7, allCaps: true, spacing: { before: 1, after: 0 } },
        dialogue: { indent: 2.5, width: 3.5, spacing: { before: 0, after: 1 } }
      }
    },
    is_system: true
  }
]

async function seedTemplates() {
  console.log('🌱 Starting template seeding...\n')

  try {
    // Check if templates already exist
    const { data: existingTemplates, error: checkError } = await supabase
      .from('document_templates')
      .select('name')
      .eq('is_system', true)
      .eq('category', 'screenplay')

    if (checkError) {
      throw new Error(`Error checking existing templates: ${checkError.message}`)
    }

    if (existingTemplates && existingTemplates.length > 0) {
      console.log(`⚠️  Found ${existingTemplates.length} existing system screenplay templates`)
      console.log('   Template names:', existingTemplates.map(t => t.name).join(', '))

      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise<string>(resolve => {
        rl.question('\n   Do you want to replace them? (yes/no): ', resolve)
      })
      rl.close()

      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Seeding cancelled')
        process.exit(0)
      }

      // Delete existing templates
      console.log('\n🗑️  Deleting existing templates...')
      const { error: deleteError } = await supabase
        .from('document_templates')
        .delete()
        .eq('is_system', true)
        .eq('category', 'screenplay')

      if (deleteError) {
        throw new Error(`Error deleting existing templates: ${deleteError.message}`)
      }
      console.log('✅ Existing templates deleted')
    }

    // Insert new templates
    console.log('\n📝 Inserting templates...')
    let successCount = 0

    for (const template of templates) {
      const { error } = await supabase
        .from('document_templates')
        .insert(template)

      if (error) {
        console.error(`❌ Error inserting "${template.name}":`, error.message)
      } else {
        successCount++
        console.log(`✅ Inserted: ${template.name}`)
      }
    }

    console.log(`\n🎉 Successfully seeded ${successCount}/${templates.length} templates!`)

    // Verify insertion
    const { data: verifyData, error: verifyError } = await supabase
      .from('document_templates')
      .select('name, format_type, is_system')
      .eq('is_system', true)
      .eq('category', 'screenplay')
      .order('name')

    if (verifyError) {
      console.error('⚠️  Error verifying templates:', verifyError.message)
    } else {
      console.log('\n📋 Verification - Templates in database:')
      verifyData?.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.name} (${t.format_type})`)
      })
    }

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run seeder
seedTemplates()
