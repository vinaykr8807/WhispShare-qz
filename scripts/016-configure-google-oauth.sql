-- Configure Google OAuth settings for WhispShare
-- Simple database updates for OAuth integration

-- Add OAuth-related columns to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add provider column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'provider') THEN
        ALTER TABLE profiles ADD COLUMN provider TEXT DEFAULT 'email';
    END IF;
    
    -- Add provider_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'provider_id') THEN
        ALTER TABLE profiles ADD COLUMN provider_id TEXT;
    END IF;
    
    -- Add last_sign_in_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_sign_in_at') THEN
        ALTER TABLE profiles ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(provider);
CREATE INDEX IF NOT EXISTS idx_profiles_provider_id ON profiles(provider_id);

-- Update the user creation function to handle OAuth data
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
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
  )
  VALUES (
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
    -- If anything fails, still allow user creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing profiles to have default provider
UPDATE profiles 
SET provider = 'email' 
WHERE provider IS NULL;

-- Success message
SELECT 'Google OAuth database configuration completed successfully!' as status;
