-- Disable email confirmation requirement for immediate registration
-- This allows users to sign up and immediately access the platform

-- Update auth settings to disable email confirmation
-- Note: This should be done in Supabase Dashboard -> Authentication -> Settings
-- Set "Enable email confirmations" to OFF

-- Ensure all existing users are confirmed
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Create a function to auto-confirm new users
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the user immediately
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

-- Success message
SELECT 'Email confirmation disabled - users can now register immediately!' as status;
