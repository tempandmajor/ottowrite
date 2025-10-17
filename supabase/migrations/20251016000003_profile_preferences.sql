-- Extend user profile data with writing preferences and metadata

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_genres TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS writing_focus TEXT,
  ADD COLUMN IF NOT EXISTS writing_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timezone TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_writing_focus
  ON public.user_profiles (writing_focus);

CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_genres
  ON public.user_profiles USING GIN (preferred_genres);

-- Refresh trigger to populate the extended profile on new auth signups
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  genres TEXT[];
  prefs JSONB := COALESCE(NEW.raw_user_meta_data->'writing_preferences', '{}'::jsonb);
BEGIN
  SELECT COALESCE(array_agg(elem.value), ARRAY[]::TEXT[])
    INTO genres
  FROM jsonb_array_elements_text(
        COALESCE(NEW.raw_user_meta_data->'preferred_genres', '[]'::jsonb)
       ) AS elem(value);

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    preferred_genres,
    writing_focus,
    writing_preferences,
    timezone
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    genres,
    NEW.raw_user_meta_data->>'writing_focus',
    prefs,
    NEW.raw_user_meta_data->>'timezone'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    preferred_genres = EXCLUDED.preferred_genres,
    writing_focus = EXCLUDED.writing_focus,
    writing_preferences = EXCLUDED.writing_preferences,
    timezone = EXCLUDED.timezone,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;
