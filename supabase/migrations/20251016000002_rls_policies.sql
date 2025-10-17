-- Align schema with application usage and enforce row level security

-- Add missing columns used by the application
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Enable Row Level Security on core tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- USER PROFILES POLICIES
DROP POLICY IF EXISTS "Allow profile reads" ON public.user_profiles;
CREATE POLICY "Allow profile reads"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow profile inserts" ON public.user_profiles;
CREATE POLICY "Allow profile inserts"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow profile updates" ON public.user_profiles;
CREATE POLICY "Allow profile updates"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow profile deletes" ON public.user_profiles;
CREATE POLICY "Allow profile deletes"
  ON public.user_profiles
  FOR DELETE
  USING (auth.uid() = id);

-- PROJECTS POLICIES
DROP POLICY IF EXISTS "Allow project reads" ON public.projects;
CREATE POLICY "Allow project reads"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow project inserts" ON public.projects;
CREATE POLICY "Allow project inserts"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow project updates" ON public.projects;
CREATE POLICY "Allow project updates"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow project deletes" ON public.projects;
CREATE POLICY "Allow project deletes"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Allow document reads" ON public.documents;
CREATE POLICY "Allow document reads"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow document inserts" ON public.documents;
CREATE POLICY "Allow document inserts"
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow document updates" ON public.documents;
CREATE POLICY "Allow document updates"
  ON public.documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow document deletes" ON public.documents;
CREATE POLICY "Allow document deletes"
  ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- AI USAGE POLICIES
DROP POLICY IF EXISTS "Allow ai_usage reads" ON public.ai_usage;
CREATE POLICY "Allow ai_usage reads"
  ON public.ai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow ai_usage inserts" ON public.ai_usage;
CREATE POLICY "Allow ai_usage inserts"
  ON public.ai_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Automatically create a user profile whenever a new auth user is registered
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

DROP TRIGGER IF EXISTS create_profile_for_new_user ON auth.users;
CREATE TRIGGER create_profile_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();
