-- Enable email confirmation requirement
-- This ensures users must confirm their email before accessing the platform

-- Remove the auto-confirm trigger since we want email confirmation
DROP TRIGGER IF EXISTS auto_confirm_new_users ON auth.users;
DROP FUNCTION IF EXISTS auto_confirm_user();

-- Update existing unconfirmed users to require confirmation
-- (Optional: You may want to keep existing users confirmed)
-- UPDATE auth.users 
-- SET email_confirmed_at = NULL, 
--     confirmed_at = NULL
-- WHERE email_confirmed_at IS NOT NULL;

-- Ensure the user creation function works with email confirmation
CREATE OR REPLACE FUNCTION public.create_user_profile() 
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_full_name TEXT;
    user_avatar_url TEXT;
BEGIN
    -- Only create profile for confirmed users
    IF NEW.email_confirmed_at IS NOT NULL THEN
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

        -- Insert profile
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
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't prevent user creation
        RAISE LOG 'Error in create_user_profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger for confirmed users only
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- Success message
SELECT 'Email confirmation enabled - users must confirm email before accessing platform!' as status;
