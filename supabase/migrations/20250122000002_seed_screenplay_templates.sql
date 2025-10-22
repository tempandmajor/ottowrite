-- Seed 11 screenplay templates into document_templates table
-- Migration: 20250122000002_seed_screenplay_templates
--
-- Table schema:
-- id (uuid), title (text), description (text), type (text), content (jsonb),
-- category (text), tags (text[]), is_public (boolean), created_by (uuid),
-- usage_count (integer), created_at (timestamptz), updated_at (timestamptz)

-- Temporarily disable the enforce_template_limit trigger for system templates
ALTER TABLE document_templates DISABLE TRIGGER enforce_template_limit;

-- Delete existing public screenplay templates (system templates)
DELETE FROM document_templates
WHERE is_public = true
AND category = 'screenplay'
AND created_by IS NULL;

-- Insert Feature Film Screenplay
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Feature Film Screenplay',
  'Standard feature film format following industry guidelines for theatrical releases (90-120 pages)',
  'feature_film',
  'screenplay',
  '{
    "formatType": "feature",
    "structure": {
      "acts": 3,
      "estimatedPageCount": 110,
      "sections": ["Act I", "Act II", "Act III"]
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "character": {"indent": 3.7, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "parenthetical": {"indent": 3.1, "spacing": {"before": 0, "after": 0}},
        "dialogue": {"indent": 2.5, "width": 3.5, "spacing": {"before": 0, "after": 1}},
        "transition": {"indent": 6, "allCaps": true, "spacing": {"before": 1, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['film', 'feature', 'theatrical', '3-act']::text[],
  true,
  NULL
);

-- Insert TV Drama (One-Hour)
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'TV Drama (One-Hour)',
  'One-hour television drama format with act breaks for commercial interruptions (45-60 pages)',
  'tv_drama',
  'screenplay',
  '{
    "formatType": "tv",
    "structure": {
      "acts": 5,
      "estimatedPageCount": 55,
      "sections": ["Teaser", "Act I", "Act II", "Act III", "Act IV", "Tag"],
      "actBreaks": true
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "character": {"indent": 3.7, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "parenthetical": {"indent": 3.1, "spacing": {"before": 0, "after": 0}},
        "dialogue": {"indent": 2.5, "width": 3.5, "spacing": {"before": 0, "after": 1}},
        "actBreak": {"centered": true, "allCaps": true, "spacing": {"before": 2, "after": 2}}
      }
    }
  }'::jsonb,
  ARRAY['tv', 'drama', 'one-hour', 'network']::text[],
  true,
  NULL
);

-- Insert TV Sitcom (Half-Hour Multi-Camera)
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'TV Sitcom (Multi-Camera)',
  'Traditional multi-camera sitcom filmed before live studio audience (22-30 pages)',
  'tv_sitcom_multi',
  'screenplay',
  '{
    "formatType": "tv",
    "structure": {
      "acts": 2,
      "estimatedPageCount": 26,
      "sections": ["Cold Open", "Act I", "Act II", "Tag"],
      "hasAudienceReactions": true
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "allCapsAction": true,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "action": {"allCaps": true, "spacing": {"before": 0, "after": 1}},
        "character": {"indent": 3.7, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "dialogue": {"indent": 2.5, "width": 3.5, "spacing": {"before": 0, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['tv', 'sitcom', 'comedy', 'multi-camera', 'audience']::text[],
  true,
  NULL
);

-- Insert TV Sitcom (Half-Hour Single-Camera)
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'TV Sitcom (Single-Camera)',
  'Modern single-camera comedy format with cinematic style (25-35 pages)',
  'tv_sitcom_single',
  'screenplay',
  '{
    "formatType": "tv",
    "structure": {
      "acts": 2,
      "estimatedPageCount": 30,
      "sections": ["Cold Open", "Act I", "Act II", "Tag"]
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "character": {"indent": 3.7, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "dialogue": {"indent": 2.5, "width": 3.5, "spacing": {"before": 0, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['tv', 'sitcom', 'comedy', 'single-camera']::text[],
  true,
  NULL
);

-- Insert Stage Play
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Stage Play',
  'Traditional stage play format for theatrical productions (80-120 pages)',
  'stage_play',
  'screenplay',
  '{
    "formatType": "stage",
    "structure": {
      "acts": 2,
      "estimatedPageCount": 80,
      "sections": ["Act I", "Act II"]
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"centered": true, "allCaps": true, "spacing": {"before": 2, "after": 2}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "character": {"centered": true, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "parenthetical": {"centered": true, "spacing": {"before": 0, "after": 0}},
        "dialogue": {"indent": 3, "width": 3, "spacing": {"before": 0, "after": 1}},
        "stageDirection": {"indent": 0, "italics": true, "spacing": {"before": 1, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['stage', 'theater', 'play']::text[],
  true,
  NULL
);

-- Insert Musical Stage Play
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Musical Stage Play',
  'Musical theater format with lyrics and music cues (90-120 pages)',
  'musical',
  'screenplay',
  '{
    "formatType": "stage",
    "structure": {
      "acts": 2,
      "estimatedPageCount": 90,
      "sections": ["Act I", "Act II"],
      "includesMusic": true
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"centered": true, "allCaps": true, "spacing": {"before": 2, "after": 2}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "character": {"centered": true, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "dialogue": {"indent": 3, "width": 3, "spacing": {"before": 0, "after": 1}},
        "lyrics": {"indent": 3.5, "italics": true, "spacing": {"before": 1, "after": 0}},
        "musicCue": {"indent": 2, "allCaps": true, "spacing": {"before": 1, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['stage', 'musical', 'theater', 'music']::text[],
  true,
  NULL
);

-- Insert Audio Drama
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Audio Drama',
  'Radio or podcast drama format focusing on audio elements (30-45 pages)',
  'audio_drama',
  'screenplay',
  '{
    "formatType": "audio",
    "structure": {
      "acts": 3,
      "estimatedPageCount": 40,
      "sections": ["Act I", "Act II", "Act III"]
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "soundEffect": {"allCaps": true, "indent": 2, "spacing": {"before": 1, "after": 1}},
        "music": {"allCaps": true, "indent": 2, "spacing": {"before": 1, "after": 1}},
        "character": {"indent": 0, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "dialogue": {"indent": 2, "spacing": {"before": 0, "after": 1}},
        "narrator": {"indent": 0, "spacing": {"before": 1, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['audio', 'radio', 'podcast', 'drama']::text[],
  true,
  NULL
);

-- Insert Animation Screenplay
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Animation Screenplay',
  'Animation format with detailed visual descriptions (90-110 pages)',
  'animation',
  'screenplay',
  '{
    "formatType": "feature",
    "structure": {
      "acts": 3,
      "estimatedPageCount": 90,
      "sections": ["Act I", "Act II", "Act III"]
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "character": {"indent": 3.7, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "dialogue": {"indent": 2.5, "width": 3.5, "spacing": {"before": 0, "after": 1}},
        "animation": {"indent": 1, "italics": true, "spacing": {"before": 1, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['animation', 'film', 'animated']::text[],
  true,
  NULL
);

-- Insert Documentary Screenplay
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Documentary Screenplay',
  'Documentary format with interview and narration sections (60-90 pages)',
  'documentary',
  'screenplay',
  '{
    "formatType": "feature",
    "structure": {
      "acts": 3,
      "estimatedPageCount": 60,
      "sections": ["Opening", "Main Body", "Conclusion"]
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "interview": {"indent": 0, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "interviewDialogue": {"indent": 2, "spacing": {"before": 0, "after": 1}},
        "narration": {"indent": 0, "spacing": {"before": 1, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['documentary', 'non-fiction', 'film']::text[],
  true,
  NULL
);

-- Insert Short Film Screenplay
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Short Film Screenplay',
  'Concise format for short films under 40 minutes (5-30 pages)',
  'short_film',
  'screenplay',
  '{
    "formatType": "short",
    "structure": {
      "acts": 1,
      "estimatedPageCount": 15,
      "sections": ["Main Story"]
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "character": {"indent": 3.7, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "dialogue": {"indent": 2.5, "width": 3.5, "spacing": {"before": 0, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['short', 'film', 'festival']::text[],
  true,
  NULL
);

-- Insert Webisode/Web Series
INSERT INTO document_templates (title, description, type, category, content, tags, is_public, created_by)
VALUES (
  'Webisode',
  'Web series format optimized for online viewing, 3-15 minutes (5-15 pages)',
  'web_series',
  'screenplay',
  '{
    "formatType": "short",
    "structure": {
      "acts": 1,
      "estimatedPageCount": 8,
      "sections": ["Main Story"]
    },
    "formatting": {
      "font": "Courier Prime",
      "fontSize": 12,
      "pageMargins": {"top": 1, "bottom": 1, "left": 1.5, "right": 1},
      "lineSpacing": 1,
      "elements": {
        "sceneHeading": {"allCaps": true, "spacing": {"before": 2, "after": 1}},
        "action": {"indent": 0, "spacing": {"before": 0, "after": 1}},
        "character": {"indent": 3.7, "allCaps": true, "spacing": {"before": 1, "after": 0}},
        "dialogue": {"indent": 2.5, "width": 3.5, "spacing": {"before": 0, "after": 1}}
      }
    }
  }'::jsonb,
  ARRAY['web', 'series', 'online', 'digital']::text[],
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
  created_by IS NULL as is_system,
  array_length(tags, 1) as tag_count
FROM document_templates
WHERE is_public = true
AND category = 'screenplay'
AND created_by IS NULL
ORDER BY title;
