-- Seed 4 graphic novel/comic book templates for TICKET-TMPL-004
-- Migration: 20250122000004_seed_graphic_novel_templates
--
-- Based on Final Draft format and industry standards
-- Templates focus on dialogue/script mapping without image generation
--
-- Templates to add:
-- 1. Comic Book (Single Issue) - Standard 22-page format
-- 2. Graphic Novel - Long-form narrative
-- 3. Manga - Japanese comic format (right-to-left)
-- 4. Webcomic - Digital-first vertical scroll format

-- Temporarily disable the enforce_template_limit trigger
ALTER TABLE document_templates DISABLE TRIGGER enforce_template_limit;

-- Insert Comic Book (Single Issue)
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Comic Book (Single Issue)',
  'Standard American comic book format for 22-page monthly issues with panel-by-panel breakdown (22-32 pages)',
  'comic_book',
  'sequential_art',
  '{
    "formatType": "sequential_panel",
    "structure": {
      "estimatedPageCount": 22,
      "standardPageCount": 22,
      "panelsPerPage": "4-6 average",
      "readingDirection": "left_to_right",
      "pageOrientation": {
        "even": "left-facing (build-up)",
        "odd": "right-facing (impact/reveals)"
      }
    },
    "formatting": {
      "font": "Courier New",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "indentation": {
        "pageHeader": 0,
        "panelDescription": 0,
        "dialogue": 1.5,
        "caption": 1.5,
        "sfx": 1.5
      },
      "elements": {
        "pageHeader": {
          "format": "PAGE ONE [R]",
          "allCaps": true,
          "bold": true,
          "spacing": {"before": 2, "after": 1},
          "includeOrientation": true,
          "notes": "[L] for left-facing (even pages), [R] for right-facing (odd pages)"
        },
        "panelCount": {
          "format": "(X panels)",
          "placement": "after page header",
          "spacing": {"before": 0, "after": 1},
          "notes": "Total panel count helps artist plan layout"
        },
        "panelNumber": {
          "format": "PANEL 1",
          "allCaps": true,
          "spacing": {"before": 1, "after": 0.5},
          "numbering": "sequential per page (1, 2, 3...)"
        },
        "panelDescription": {
          "indent": 0,
          "spacing": {"before": 0, "after": 1},
          "style": "concise, visual, present tense",
          "length": "2-4 sentences max",
          "include": ["Setting", "Characters", "Action", "Mood/Tone", "Key visual elements"],
          "avoid": ["Camera angles (unless critical)", "Excessive detail", "Directing the artist"],
          "notes": "Paint the picture, trust the artist"
        },
        "character": {
          "format": "CHARACTER NAME:",
          "allCaps": true,
          "indent": 1.5,
          "spacing": {"before": 0.5, "after": 0},
          "notes": "Identifies speaker for dialogue balloon"
        },
        "dialogue": {
          "indent": 1.5,
          "maxWords": 25,
          "maxWordsPerPanel": 50,
          "style": "conversational, breathable",
          "numbering": "optional line numbers (1, 2, 3)",
          "spacing": {"before": 0, "after": 0.5},
          "notes": "Keep to one breath worth of words (20-25 words max)"
        },
        "parenthetical": {
          "format": "(quietly) or (cont''d)",
          "indent": 1.5,
          "spacing": {"before": 0, "after": 0},
          "usage": ["Tone/delivery", "Continuation markers", "Emotional direction"],
          "notes": "Use sparingly, trust the artist/letterer"
        },
        "caption": {
          "format": "CAP:",
          "allCaps": true,
          "indent": 1.5,
          "maxWords": 25,
          "spacing": {"before": 0.5, "after": 0.5},
          "usage": ["Time/location establishment", "Narration", "Internal thoughts"],
          "notes": "Exposition and scene-setting"
        },
        "sfx": {
          "format": "SFX:",
          "allCaps": true,
          "indent": 1.5,
          "spacing": {"before": 0.5, "after": 0.5},
          "examples": ["BANG", "CRASH", "WHOOSH", "THWIP"],
          "emphasis": "Underline for bold/emphasis in lettering",
          "notes": "Onomatopoeia for sound effects"
        },
        "thought": {
          "format": "THOUGHT:",
          "allCaps": true,
          "indent": 1.5,
          "style": "internal monologue",
          "spacing": {"before": 0.5, "after": 0.5},
          "notes": "Different from dialogue balloons, uses thought bubbles"
        }
      },
      "emphasisRules": {
        "bold": "Underline words in script for letterer to bold",
        "italics": "Use *asterisks* for italics",
        "largeText": "ALL CAPS in script for display lettering",
        "noFormatting": "Do not use direct bold/italic formatting in script"
      }
    },
    "writingGuidelines": {
      "pageStructure": {
        "principle": "One script page = one comic page",
        "layout": "All panel descriptions and dialogue for each comic page should be on one script page",
        "visualization": "Writer and artist can see complete page at a glance"
      },
      "panelEconomy": {
        "typical": "4-6 panels per page average",
        "splash": "1 panel (full-page image)",
        "dense": "7-9 panels (dialogue-heavy)",
        "guidance": "More panels = faster pacing, fewer = slower/dramatic"
      },
      "dialogueRules": {
        "wordCount": "25 words max per balloon",
        "panelMax": "50 words total per panel",
        "breathing": "Should complete in one breath",
        "natural": "Read dialogue aloud to test flow",
        "balloonCount": "3-4 balloons per panel maximum"
      },
      "descriptionStyle": {
        "clarity": "Clear and uncluttered",
        "economy": "Only essential details",
        "collaboration": "Trust your artist, avoid over-directing",
        "focus": "What is happening, not how to draw it",
        "mood": "Convey tone and emotion, not technique"
      },
      "pageOrientation": {
        "leftPage": "Even numbers, left-facing, setup/build-up",
        "rightPage": "Odd numbers, right-facing, impact/payoff/reveals",
        "pageTurns": "Right pages are last thing reader sees before turning",
        "cliffhangers": "Place on right page for maximum impact"
      }
    },
    "examples": {
      "pageHeader": "PAGE ONE [R]\n(5 panels)",
      "panel": "PANEL 1\n\nEstablishing shot: A rain-soaked New York street at night. Neon signs reflect in puddles. A lone figure in a trench coat walks toward camera, face obscured by shadow.",
      "dialogue": "DETECTIVE MORGAN:\nThree bodies in two days. Someone''s sending a message.\n\nPARTNER:\n(worried)\nYeah, but to who?",
      "caption": "CAP:\nManhattan. 2:47 AM.",
      "sfx": "SFX:\nCRACK",
      "emphasis": "She turns, eyes _blazing_ with fury. \"I said NO!\""
    },
    "industryStandards": {
      "publishers": {
        "marvel": "22 pages standard, 5-6 panels average",
        "dc": "20-22 pages, varies by title",
        "image": "Varies, creator-owned flexibility",
        "darkHorse": "22-24 pages typical"
      },
      "collaboration": {
        "writer": "Provides script with panel descriptions and dialogue",
        "artist": "Interprets descriptions, creates visual layout",
        "letterer": "Follows script for balloon/caption placement",
        "editor": "Reviews script before art production"
      },
      "revisionsWorkflow": {
        "draftOne": "Complete story script",
        "artistThumbs": "Artist creates thumbnail layouts",
        "revisions": "Writer adjusts based on visual flow",
        "pencils": "Artist draws pages",
        "dialogueAdjust": "Final dialogue tweaks before lettering"
      }
    }
  }'::jsonb,
  ARRAY['comic', 'sequential-art', 'panel', 'dialogue', 'graphic-novel']::text[],
  true,
  NULL
);

-- Insert Graphic Novel
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Graphic Novel',
  'Long-form graphic narrative with flexible page count and sophisticated storytelling (100-300+ pages)',
  'graphic_novel',
  'sequential_art',
  '{
    "formatType": "sequential_panel",
    "structure": {
      "estimatedPageCount": 150,
      "typicalRange": "100-300 pages",
      "chapters": "Variable, often 5-10 chapters",
      "panelsPerPage": "4-6 average, flexible",
      "readingDirection": "left_to_right"
    },
    "formatting": {
      "font": "Courier New",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "chapterHeader": {
          "format": "CHAPTER ONE: [Title]",
          "allCaps": true,
          "bold": true,
          "centered": true,
          "spacing": {"before": 3, "after": 2}
        },
        "pageHeader": {
          "format": "PAGE 1",
          "includeChapter": "Optional: PAGE 1-12 (Chapter 1, Page 12)",
          "spacing": {"before": 2, "after": 1}
        },
        "panelDescription": {
          "style": "More detailed than single-issue comics",
          "length": "3-6 sentences for complex scenes",
          "literary": "Can include more atmospheric description",
          "pacing": "Slower, more deliberate than monthly comics"
        },
        "dialogue": {
          "maxWords": 30,
          "style": "More literary, less compressed than comics",
          "depth": "Character development through conversation",
          "notes": "Can sustain longer exchanges than single-issue format"
        },
        "caption": {
          "usage": "Extensive narration allowed",
          "literary": "Can include prose-like passages",
          "voice": "Strong narrative voice often present",
          "notes": "GNs support more literary storytelling"
        }
      }
    },
    "writingGuidelines": {
      "narrative": {
        "scope": "Complete story arc, self-contained",
        "themes": "Mature, complex themes",
        "characterArc": "Full character development",
        "pacing": "Slower, more novelistic pacing"
      },
      "structure": {
        "threeAct": "Traditional story structure",
        "chapters": "Natural break points for chapters",
        "pageCount": "Not constrained by monthly format",
        "flexibility": "Artistic freedom in panel layouts"
      },
      "audience": {
        "maturity": "Often targets older readers",
        "sophistication": "Complex narratives and themes",
        "literary": "Can compete with prose novels in depth"
      }
    },
    "examples": {
      "chapterHeader": "CHAPTER THREE: THE LONG NIGHT",
      "panel": "PANEL 1\n\nWide establishing shot: The abandoned warehouse district stretches toward the horizon, a graveyard of rust and broken windows. Storm clouds gather overhead, casting everything in gray. In the foreground, our protagonist stands alone, dwarfed by the industrial decay. Wind whips their coat. This is a moment of isolation, of gathering courage before the confrontation to come.",
      "dialogue": "SARAH:\nTwenty years I''ve waited for this moment. Twenty years of wondering if I''d have the courage when it finally came.\n\nSARAH:\n(to herself)\nGuess we''re about to find out."
    }
  }'::jsonb,
  ARRAY['graphic-novel', 'sequential-art', 'long-form', 'literary', 'novel']::text[],
  true,
  NULL
);

-- Insert Manga
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Manga',
  'Japanese comic format with right-to-left reading and distinctive storytelling conventions (20-40 pages per chapter)',
  'manga',
  'sequential_art',
  '{
    "formatType": "sequential_panel",
    "structure": {
      "estimatedPageCount": 30,
      "chapterLength": "20-40 pages typical",
      "readingDirection": "right_to_left",
      "panelsPerPage": "4-7 average, can be very dense",
      "pageOrientation": "Reversed from Western comics"
    },
    "formatting": {
      "font": "Courier New",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "pageHeader": {
          "format": "PAGE 1 [RTL]",
          "notes": "Right-to-left indicator for Western writers",
          "spacing": {"before": 2, "after": 1}
        },
        "panelFlow": {
          "direction": "Right to left, top to bottom",
          "layout": "Often asymmetric, dynamic compositions",
          "bleed": "Panels can bleed into each other",
          "notes": "More fluid than Western grid layouts"
        },
        "dialogue": {
          "maxWords": 20,
          "style": "Often minimal, relies on visuals",
          "cultural": "May include honorifics, Japanese expressions",
          "vertical": "Text can be vertical in Japanese (horizontal in translation)",
          "notes": "Dialogue balloons placed right-to-left"
        },
        "soundEffects": {
          "integration": "Often integrated into artwork",
          "style": "Stylized, part of visual design",
          "frequency": "Heavy use of onomatopoeia",
          "examples": ["DOKUN DOKUN (heartbeat)", "GARA GARA (rattle)", "ZA (dramatic entry)"],
          "notes": "SFX are visual elements, not just text"
        },
        "emotion": {
          "visual": "Speed lines, sweat drops, visual metaphors",
          "symbols": "Cultural symbols (anger vein, embarrassment bubbles)",
          "chibi": "Can include chibi/super-deformed reactions",
          "notes": "Heavy use of visual emotional shorthand"
        },
        "panelDescription": {
          "style": "Focus on emotion and atmosphere",
          "action": "Dynamic action sequences",
          "reaction": "Emphasis on character reactions and expressions",
          "pacing": "Can use many panels for single moment"
        }
      }
    },
    "writingGuidelines": {
      "pacing": {
        "cinematic": "Very cinematic, film-like pacing",
        "momentExpansion": "Single moments can span multiple panels",
        "silence": "Comfortable with silent panels",
        "action": "Elaborate action sequences with many panels"
      },
      "panelUsage": {
        "density": "More panels per page than Western comics",
        "variety": "Wide variety of panel sizes and shapes",
        "bleed": "Panels often bleed together without borders",
        "asymmetry": "Dynamic, asymmetric layouts common"
      },
      "storytelling": {
        "emotion": "Heavy emphasis on emotional reactions",
        "internal": "Internal monologue common",
        "visual": "Visual storytelling over exposition",
        "cultural": "May reference Japanese cultural elements"
      },
      "genres": {
        "shonen": "Action-oriented, male demographic (teens)",
        "shojo": "Romance-focused, female demographic (teens)",
        "seinen": "Mature themes, adult male demographic",
        "josei": "Mature themes, adult female demographic"
      }
    },
    "culturalNotes": {
      "honorifics": "-san, -kun, -chan, -sama (indicate relationships)",
      "onomatopoeia": "Japanese sound effects often kept in translation",
      "readingOrder": "Back-to-front book, right-to-left pages",
      "visualLanguage": "Specific visual vocabulary (sweat drops, blush lines, etc.)",
      "serialization": "Often serialized in magazines before collection"
    },
    "examples": {
      "pageHeader": "PAGE 1 [RTL]\n(6 panels)",
      "panel": "PANEL 1\n\nClose-up: PROTAGONIST''s eyes widen in shock. Speed lines radiate from the edges. A single sweat drop forms at their temple.",
      "dialogue": "PROTAGONIST:\nMasaka... (Impossible...)\n\nANTAGONIST:\n(smirking)\nYou finally understand, don''t you?",
      "sfx": "SFX:\nDOKUN DOKUN (heartbeat)\n\nSFX:\nZA (dramatic entrance)"
    }
  }'::jsonb,
  ARRAY['manga', 'japanese', 'right-to-left', 'sequential-art', 'anime']::text[],
  true,
  NULL
);

-- Insert Webcomic
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Webcomic',
  'Digital-first comic optimized for vertical scrolling and web/mobile viewing (variable length)',
  'webcomic',
  'sequential_art',
  '{
    "formatType": "sequential_panel",
    "structure": {
      "estimatedPageCount": "Variable",
      "format": "Vertical scroll or page-based",
      "episodeLength": "40-100 panels typical for scroll format",
      "readingDirection": "left_to_right",
      "scrollOptimized": true
    },
    "formatting": {
      "font": "Arial or Helvetica",
      "fontSize": 11,
      "pageMargins": {"top": 0.5, "bottom": 0.5, "left": 1, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "episodeHeader": {
          "format": "EPISODE 5: [Title]",
          "bold": true,
          "spacing": {"before": 1, "after": 1}
        },
        "panelNumber": {
          "format": "PANEL 1 or BEAT 1",
          "notes": "For scroll format, ''beat'' may be more appropriate than ''panel''"
        },
        "panelDescription": {
          "scrollConsideration": "Describe vertical flow and transitions",
          "widthNote": "Single column width for mobile",
          "spacing": "Note spacing between panels/beats",
          "transition": "Describe scroll transitions between moments"
        },
        "dialogue": {
          "maxWords": 20,
          "mobile": "Shorter for mobile reading",
          "legibility": "Must be readable on small screens",
          "placement": "Consider vertical space usage"
        },
        "panelSize": {
          "format": "Specify: SMALL/MEDIUM/LARGE/FULL-WIDTH",
          "scroll": "Tall panels for vertical scroll",
          "impact": "Full-width for dramatic moments",
          "notes": "Size affects pacing in scroll format"
        }
      },
      "digitalSpecific": {
        "colorNote": "Full color is standard for webcomics",
        "animationNote": "Can include simple animations/GIFs",
        "soundNote": "Can include sound effects (if platform supports)",
        "interactiveNote": "Some platforms support interactive elements"
      }
    },
    "writingGuidelines": {
      "scrollFormat": {
        "verticalFlow": "Story flows continuously downward",
        "reveals": "Scroll reveals work like page turns",
        "pacing": "Control pacing through panel height",
        "transitions": "Smooth transitions between moments"
      },
      "mobileFirst": {
        "legibility": "Text must be readable on phones",
        "simplicity": "Clearer compositions than print comics",
        "verticalSpace": "Use vertical space strategically",
        "loading": "Consider file size and loading times"
      },
      "episodeStructure": {
        "hookOpening": "Strong opening to retain readers",
        "cliffhanger": "End on engaging moment",
        "length": "40-100 panels for scroll, 10-20 pages for page-based",
        "consistency": "Regular update schedule important"
      },
      "platform": {
        "webtoon": "Optimized for vertical scroll",
        "tapas": "Page or scroll format",
        "webcomic": "Traditional page format on web",
        "patreon": "Can include bonus content"
      }
    },
    "platforms": {
      "webtoon": {
        "format": "Vertical scroll",
        "dimensions": "800px width standard",
        "color": "Full color",
        "episodeLength": "40-100 panels"
      },
      "tapas": {
        "format": "Page or scroll",
        "flexibility": "Multiple format support",
        "monetization": "Built-in payment system"
      },
      "patreon": {
        "format": "Any",
        "monetization": "Subscription-based",
        "bonus": "Early access, bonus content"
      }
    },
    "examples": {
      "episodeHeader": "EPISODE 5: THE REVEAL",
      "panelScroll": "PANEL 1 [MEDIUM]\n\nMid-shot: Character stands in doorway, backlit. Silhouette creates mystery.",
      "panelTransition": "PANEL 2 [TALL - scroll reveal]\n\nAs reader scrolls, full figure is revealed: it''s the antagonist, not the expected ally. Dramatic lighting. Reader discovers this truth through the scroll action itself.",
      "dialogue": "HERO:\nYou... but how?\n\nANTAGONIST:\n(smiling)\nSurprise."
    }
  }'::jsonb,
  ARRAY['webcomic', 'digital', 'vertical-scroll', 'webtoon', 'online']::text[],
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
AND type IN ('comic_book', 'graphic_novel', 'manga', 'webcomic')
ORDER BY title;
