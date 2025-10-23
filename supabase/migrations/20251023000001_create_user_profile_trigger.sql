-- Create function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    subscription_tier,
    subscription_status,
    has_completed_onboarding,
    onboarding_checklist
  )
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    'active',
    false,
    jsonb_build_object(
      'profile_setup', false,
      'first_project', false,
      'first_document', false
    )
  );
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (create profiles for users without profiles)
INSERT INTO public.user_profiles (
  id,
  email,
  subscription_tier,
  subscription_status,
  has_completed_onboarding,
  onboarding_checklist
)
SELECT
  au.id,
  au.email,
  'free',
  'active',
  false,
  jsonb_build_object(
    'profile_setup', false,
    'first_project', false,
    'first_document', false
  )
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user_profile record when a new user signs up';
