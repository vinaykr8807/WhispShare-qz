-- Disable email confirmation requirement for immediate registration
-- This allows users to sign up and immediately access the platform

-- Auto-confirm all existing unconfirmed users
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()), 
    confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL;

-- Create a function to auto-confirm new users
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the user immediately upon creation
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-confirm users on signup
DROP TRIGGER IF EXISTS auto_confirm_new_users ON auth.users;
CREATE TRIGGER auto_confirm_new_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();

-- Update the user creation function to work with immediate confirmation
CREATE OR REPLACE FUNCTION public.create_user_profile() 
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_full_name TEXT;
    user_avatar_url TEXT;
BEGIN
    -- Extract user information
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    user_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );

    -- Insert profile immediately (user is auto-confirmed)
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        user_avatar_url,
        'email',
        NULL,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        last_sign_in_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't prevent user creation
        RAISE LOG 'Error in create_user_profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Ensure trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Success message
SELECT 'Email confirmation disabled - users can now register immediately!' as status;
