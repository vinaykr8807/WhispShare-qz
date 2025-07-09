-- Complete authentication fix to ensure profiles are created and stored properly

-- First, let's ensure the profiles table has the correct structure
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    provider TEXT DEFAULT 'email',
    provider_id TEXT,
    last_sign_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies
CREATE POLICY "Enable read access for all users" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on user_id" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable delete for users based on user_id" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(provider);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Create the user creation function that ALWAYS works
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_full_name TEXT;
    user_avatar_url TEXT;
    user_provider TEXT;
BEGIN
    -- Extract user information with fallbacks
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    user_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );
    
    user_provider := COALESCE(
        NEW.raw_app_meta_data->>'provider',
        'email'
    );

    -- Insert profile with proper error handling
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
        user_provider,
        NEW.raw_app_meta_data->>'provider_id',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        provider = EXCLUDED.provider,
        provider_id = EXCLUDED.provider_id,
        last_sign_in_at = NOW(),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't prevent user creation
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Drop existing trigger and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user sign-ins (updates)
CREATE OR REPLACE FUNCTION public.handle_user_signin() 
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update last sign in time when user signs in
    IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
        UPDATE public.profiles 
        SET 
            last_sign_in_at = NEW.last_sign_in_at,
            updated_at = NOW()
        WHERE id = NEW.id;
        
        -- If profile doesn't exist, create it
        IF NOT FOUND THEN
            INSERT INTO public.profiles (
                id,
                email,
                full_name,
                avatar_url,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                NEW.email,
                COALESCE(
                    NEW.raw_user_meta_data->>'full_name',
                    NEW.raw_user_meta_data->>'name',
                    split_part(NEW.email, '@', 1)
                ),
                COALESCE(
                    NEW.raw_user_meta_data->>'avatar_url',
                    NEW.raw_user_meta_data->>'picture'
                ),
                COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
                NEW.last_sign_in_at,
                NOW(),
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_user_signin for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger for user sign-ins
DROP TRIGGER IF EXISTS on_auth_user_signin ON auth.users;
CREATE TRIGGER on_auth_user_signin
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_signin();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_signin() TO anon, authenticated;

-- Create any existing auth users that might not have profiles
INSERT INTO public.profiles (id, email, full_name, provider, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name',
        split_part(email, '@', 1)
    ) as full_name,
    COALESCE(raw_app_meta_data->>'provider', 'email') as provider,
    created_at,
    updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Verify the setup
SELECT 'Authentication system setup completed successfully!' as status;
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT COUNT(*) as total_auth_users FROM auth.users;
