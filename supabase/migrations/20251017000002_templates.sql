-- OTTOWRITE TEMPLATES MIGRATION
-- Migration: 20251017000002_templates
-- Description: Add document templates support

-- Document Templates Table
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('novel', 'short_story', 'screenplay', 'play', 'article', 'blog')),
    content JSONB NOT NULL DEFAULT '{}',
    category TEXT, -- e.g., 'screenplay', 'novel', 'business', 'academic'
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_type ON public.document_templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.document_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_public ON public.document_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.document_templates(created_by);

-- RLS Policies for templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view public templates
CREATE POLICY "Public templates are viewable by everyone"
ON public.document_templates FOR SELECT
USING (is_public = true OR created_by = auth.uid());

-- Users can create their own templates
CREATE POLICY "Users can create their own templates"
ON public.document_templates FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
ON public.document_templates FOR UPDATE
USING (created_by = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
ON public.document_templates FOR DELETE
USING (created_by = auth.uid());

-- Insert default templates
INSERT INTO public.document_templates (title, description, type, content, category, is_public, tags) VALUES
(
    'Screenplay: Three-Act Structure',
    'Standard three-act screenplay template with scene breakdown',
    'screenplay',
    '{"screenplay": [
        {"type": "scene", "content": "INT. COFFEE SHOP - DAY"},
        {"type": "action", "content": "A bustling coffee shop. The PROTAGONIST enters, looking around nervously."},
        {"type": "character", "content": "PROTAGONIST"},
        {"type": "dialogue", "content": "I need to tell you something important."}
    ]}',
    'screenplay',
    true,
    ARRAY['screenplay', 'three-act', 'structure']
),
(
    'Novel: Hero''s Journey Outline',
    'Classic hero''s journey structure for novels',
    'novel',
    '{"html": "<h1>Act I: Ordinary World</h1><p>Introduce your protagonist in their normal life...</p><h1>Act II: The Journey</h1><p>The hero faces trials and grows...</p><h1>Act III: Return</h1><p>The hero returns transformed...</p>"}',
    'novel',
    true,
    ARRAY['novel', 'heros-journey', 'outline']
),
(
    'Short Story: Flash Fiction',
    'Concise template for flash fiction (1000 words or less)',
    'short_story',
    '{"html": "<p>Opening hook...</p><p>Conflict escalates...</p><p>Twist ending...</p>"}',
    'short-story',
    true,
    ARRAY['short-story', 'flash-fiction']
),
(
    'Blog Post: How-To Guide',
    'Template for instructional blog posts',
    'article',
    '{"html": "<h1>How to [Title]</h1><h2>Introduction</h2><p>Brief overview of what readers will learn...</p><h2>Step 1: [First Step]</h2><p>Explanation...</p><h2>Step 2: [Second Step]</h2><p>Explanation...</p><h2>Conclusion</h2><p>Summary and call to action...</p>"}',
    'blog',
    true,
    ARRAY['blog', 'how-to', 'tutorial']
),
(
    'Play: One-Act Play',
    'Standard one-act play format',
    'play',
    '{"screenplay": [
        {"type": "scene", "content": "ACT ONE"},
        {"type": "action", "content": "SCENE: A small apartment. Present day."},
        {"type": "action", "content": "AT RISE: CHARACTER ONE sits alone, reading."},
        {"type": "character", "content": "CHARACTER ONE"},
        {"type": "dialogue", "content": "Opening line..."}
    ]}',
    'play',
    true,
    ARRAY['play', 'one-act', 'stage']
);

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.document_templates
    SET usage_count = usage_count + 1
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_timestamp
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION update_template_timestamp();
