-- Seed 3 additional templates for TICKET-TMPL-003: Stage & Alternative Formats
-- Migration: 20250122000003_seed_alternative_templates
--
-- Templates to add:
-- 1. Radio Play (with SFX notation) - Different from Audio Drama
-- 2. Treatment (prose format for film/TV pitches)
-- 3. Outline/Beat Sheet (structured story planning)
--
-- Note: Stage Play (full-length), One-Act Play, and Musical already exist from previous migrations

-- Temporarily disable the enforce_template_limit trigger
ALTER TABLE document_templates DISABLE TRIGGER enforce_template_limit;

-- Insert Radio Play
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Radio Play',
  'Radio drama format with detailed sound effects, music cues, and narrator directions (30-60 pages)',
  'radio_play',
  'screenplay',
  '{
    "formatType": "audio",
    "structure": {
      "acts": 3,
      "estimatedPageCount": 45,
      "sections": ["Act I", "Act II", "Act III"],
      "hasSoundEffects": true,
      "hasMusicCues": true,
      "hasNarrator": true
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1.5,
      "elements": {
        "sceneHeading": {
          "allCaps": true,
          "spacing": {"before": 2, "after": 1},
          "prefix": "SCENE"
        },
        "soundEffect": {
          "allCaps": true,
          "prefix": "SFX:",
          "indent": 0,
          "spacing": {"before": 1, "after": 1},
          "notes": "Use SFX: prefix for sound effects"
        },
        "music": {
          "allCaps": true,
          "prefix": "MUSIC:",
          "indent": 0,
          "spacing": {"before": 1, "after": 1},
          "notes": "Use MUSIC: prefix for music cues, include IN/OUT/UNDER"
        },
        "narrator": {
          "label": "NARRATOR",
          "allCaps": true,
          "indent": 0,
          "spacing": {"before": 1, "after": 0},
          "notes": "Narrator provides scene descriptions and transitions"
        },
        "character": {
          "indent": 0,
          "allCaps": true,
          "spacing": {"before": 1, "after": 0}
        },
        "dialogue": {
          "indent": 2,
          "spacing": {"before": 0, "after": 1}
        },
        "direction": {
          "parenthetical": true,
          "italics": true,
          "indent": 1.5,
          "spacing": {"before": 0, "after": 0},
          "notes": "Actor directions in italics within parentheses"
        },
        "transition": {
          "allCaps": true,
          "indent": 0,
          "spacing": {"before": 1, "after": 2},
          "examples": ["FADE IN:", "FADE OUT", "CROSSFADE TO:"]
        }
      },
      "specialNotations": {
        "acoustics": "Use (ECHO), (REVERB), (FILTER) for acoustic effects",
        "distance": "Use (OFF MIC), (DISTANT), (CLOSE) for spatial positioning",
        "phone": "Use (PHONE FILTER) or (DISTORTED) for processed voices",
        "timing": "Specify duration for SFX and music cues when critical"
      }
    },
    "examples": {
      "soundEffect": "SFX: PHONE RINGS (3 times, then stops)",
      "music": "MUSIC: SUSPENSEFUL THEME UP AND UNDER",
      "narrator": "NARRATOR: It was a dark and stormy night in London...",
      "direction": "(nervously, checking over shoulder)"
    }
  }'::jsonb,
  ARRAY['radio', 'audio', 'drama', 'sfx', 'broadcast']::text[],
  true,
  NULL
);

-- Insert Treatment (Prose Format)
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Treatment',
  'Prose-format treatment for film/TV pitches and development, written in present tense (5-30 pages)',
  'treatment',
  'development',
  '{
    "formatType": "prose",
    "structure": {
      "estimatedPageCount": 15,
      "sections": [
        "Title Page",
        "Logline",
        "Synopsis",
        "Act I Summary",
        "Act II Summary",
        "Act III Summary",
        "Character Descriptions",
        "Themes and Tone"
      ],
      "hasSections": true,
      "writingStyle": "present_tense_prose"
    },
    "formatting": {
      "font": "Times New Roman",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 2,
      "elements": {
        "title": {
          "centered": true,
          "allCaps": true,
          "bold": true,
          "spacing": {"before": 0, "after": 2}
        },
        "sectionHeading": {
          "bold": true,
          "allCaps": false,
          "spacing": {"before": 2, "after": 1},
          "examples": ["Act I", "Characters", "Themes"]
        },
        "logline": {
          "italics": true,
          "centered": true,
          "spacing": {"before": 1, "after": 2},
          "maxLength": "2-3 sentences"
        },
        "prose": {
          "indent": 0,
          "alignment": "left",
          "spacing": {"before": 0, "after": 1},
          "paragraphSpacing": 1
        },
        "characterIntro": {
          "bold": true,
          "allCaps": true,
          "inline": true,
          "notes": "Introduce character names in BOLD CAPS on first mention"
        },
        "dialogue": {
          "withinProse": true,
          "quotes": true,
          "notes": "Dialogue in quotes within prose paragraphs"
        }
      },
      "styleGuide": {
        "tense": "present",
        "voice": "active",
        "pov": "third_person",
        "tone": "engaging and visual",
        "showDontTell": "Describe what we SEE and HEAR on screen",
        "characterIntro": "Introduce characters with NAME (age, description)",
        "actBreaks": "Clearly mark act transitions",
        "pageCount": "Feature: 10-30 pages, TV pilot: 5-15 pages"
      }
    },
    "contentGuidelines": {
      "titlePage": {
        "include": ["Title", "Treatment by [Writer]", "Based on [if applicable]", "Contact info"]
      },
      "logline": {
        "include": ["Protagonist", "Goal", "Obstacle", "Stakes"],
        "length": "25-50 words"
      },
      "synopsis": {
        "include": ["Setup", "Major plot points", "Resolution"],
        "length": "1-2 paragraphs",
        "spoilers": "Include the ending"
      },
      "actSummaries": {
        "actI": "Setup, introduce characters, inciting incident",
        "actII": "Rising action, complications, midpoint, crisis",
        "actIII": "Climax, resolution, new equilibrium"
      },
      "characters": {
        "include": ["Name, age", "Role/archetype", "Goal/motivation", "Character arc"],
        "focus": "Main characters only (3-5 characters)"
      },
      "themes": {
        "include": ["Central theme", "Tone/genre", "Visual style", "Mood/atmosphere"]
      }
    },
    "examples": {
      "characterIntro": "SARAH CONNOR (29, tough waitress) races through the parking lot...",
      "prose": "The city sleeps. Rain hammers the empty streets. A figure emerges from the shadows—tall, imposing, inhuman in its precision.",
      "dialogue": "He grabs her hand: \"Come with me if you want to live.\""
    }
  }'::jsonb,
  ARRAY['treatment', 'prose', 'pitch', 'development', 'planning']::text[],
  true,
  NULL
);

-- Insert Outline/Beat Sheet
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Outline / Beat Sheet',
  'Structured story outline with numbered beats and scene breakdowns for planning (5-20 pages)',
  'outline',
  'development',
  '{
    "formatType": "structured_outline",
    "structure": {
      "estimatedPageCount": 10,
      "sections": [
        "Story Premise",
        "Act I Beats",
        "Act II Beats",
        "Act III Beats",
        "Character Arcs",
        "Scene List"
      ],
      "hasBeatNumbers": true,
      "hasPageEstimates": true,
      "hasSceneBreakdown": true
    },
    "formatting": {
      "font": "Arial",
      "fontSize": 11,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1, "right": 1},
      "lineSpacing": 1.15,
      "elements": {
        "sectionHeader": {
          "bold": true,
          "fontSize": 14,
          "allCaps": true,
          "spacing": {"before": 2, "after": 1}
        },
        "actHeader": {
          "bold": true,
          "fontSize": 12,
          "underline": true,
          "spacing": {"before": 2, "after": 1},
          "includePageRange": true
        },
        "beatNumber": {
          "format": "numbered_list",
          "bold": true,
          "spacing": {"before": 0.5, "after": 0}
        },
        "beatHeading": {
          "bold": true,
          "inline": true,
          "followedBy": "description",
          "format": "Beat #: SCENE HEADING or description"
        },
        "beatDescription": {
          "indent": 0.5,
          "bulletPoints": true,
          "concise": true,
          "includeElements": ["Action", "Emotion", "Conflict", "Revelation"]
        },
        "pageEstimate": {
          "inParentheses": true,
          "format": "(p. 15-18)",
          "atEndOfBeat": true
        },
        "characterNote": {
          "prefix": "CHAR:",
          "bold": true,
          "indent": 0.5
        },
        "themeNote": {
          "prefix": "THEME:",
          "italics": true,
          "indent": 0.5
        },
        "questionNote": {
          "prefix": "?",
          "color": "red",
          "notes": "Mark unresolved story questions"
        }
      },
      "beatStructures": {
        "saveTheCat": {
          "name": "Save the Cat (15 beats)",
          "beats": [
            "Opening Image",
            "Theme Stated",
            "Setup",
            "Catalyst",
            "Debate",
            "Break Into Two",
            "B Story",
            "Fun and Games",
            "Midpoint",
            "Bad Guys Close In",
            "All Is Lost",
            "Dark Night of the Soul",
            "Break Into Three",
            "Finale",
            "Final Image"
          ]
        },
        "threeAct": {
          "name": "Three-Act Structure",
          "actI": ["Setup", "Inciting Incident", "Point of No Return"],
          "actII": ["Rising Action", "Midpoint", "Complications", "Crisis"],
          "actIII": ["Climax", "Resolution", "Denouement"]
        },
        "heroJourney": {
          "name": "Hero's Journey (12 stages)",
          "stages": [
            "Ordinary World",
            "Call to Adventure",
            "Refusal of the Call",
            "Meeting the Mentor",
            "Crossing the Threshold",
            "Tests, Allies, Enemies",
            "Approach to Inmost Cave",
            "Ordeal",
            "Reward",
            "The Road Back",
            "Resurrection",
            "Return with Elixir"
          ]
        }
      }
    },
    "contentGuidelines": {
      "premise": {
        "include": ["Logline", "Genre", "Tone", "Target audience"],
        "length": "1 paragraph"
      },
      "beatFormat": {
        "structure": "Beat #: HEADING - Description of action/emotion (page estimate)",
        "example": "Beat 5: COFFEE SHOP MEET-CUTE - Sarah spills coffee on mysterious stranger. Chemistry. He helps clean up. They lock eyes. Moment interrupted by phone call. (p. 12-14)",
        "details": ["What happens", "Who's involved", "Emotional beat", "Story turn", "Page estimate"]
      },
      "sceneList": {
        "format": "INT./EXT. LOCATION - TIME (page estimate)",
        "include": ["Scene heading", "1-line description", "Page count"],
        "purpose": "Quick reference for production"
      },
      "characterArcs": {
        "track": ["Protagonist arc", "Antagonist arc", "Key relationship arcs"],
        "format": "Character: Want vs. Need, Flaw, Growth"
      }
    },
    "examples": {
      "beat": "Beat 8: MIDPOINT REVELATION - Hero discovers the artifact is fake. Mentor has been lying. Trust shattered. Chase sequence begins. (p. 55-60)",
      "characterNote": "CHAR: Sarah realizes she can''t do this alone",
      "themeNote": "THEME: Trust vs. self-reliance",
      "scene": "INT. WAREHOUSE - NIGHT (p. 45): Final confrontation. Hero faces villain. Truth revealed."
    }
  }'::jsonb,
  ARRAY['outline', 'beat-sheet', 'planning', 'structure', 'development']::text[],
  true,
  NULL
);

-- Re-enable the trigger
ALTER TABLE document_templates ENABLE TRIGGER enforce_template_limit;

-- Verify insertion
SELECT
  title,
  type,
  category,
  is_public,
  created_by IS NULL as is_system_template,
  array_length(tags, 1) as tag_count
FROM document_templates
WHERE is_public = true
AND created_by IS NULL
AND type IN ('radio_play', 'treatment', 'outline')
ORDER BY title;
