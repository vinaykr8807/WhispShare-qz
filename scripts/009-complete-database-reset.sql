-- Complete database reset and setup
-- Drop all existing tables and recreate with proper schema

-- Drop existing tables in correct order (foreign keys first)
DROP TABLE IF EXISTS downloads CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table first (referenced by files)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table with ALL required columns
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  unique_code TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_downloaded BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT files_unique_code_key UNIQUE (unique_code)
);

-- Create downloads table
CREATE TABLE downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX files_user_id_idx ON files (user_id);
CREATE INDEX files_unique_code_idx ON files (unique_code);
CREATE INDEX files_expires_at_idx ON files (expires_at);
CREATE INDEX files_is_downloaded_idx ON files (is_downloaded);
CREATE INDEX files_location_idx ON files USING GIST (location);
CREATE INDEX downloads_file_id_idx ON downloads (file_id);
CREATE INDEX downloads_user_id_idx ON downloads (user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Files policies (allow anonymous access for guest uploads)
CREATE POLICY "Anyone can view files" ON files FOR SELECT USING (true);
CREATE POLICY "Anyone can insert files" ON files FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update files" ON files FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete expired files" ON files FOR DELETE USING (expires_at < NOW() OR auth.uid() = user_id);

-- Downloads policies
CREATE POLICY "Anyone can view downloads" ON downloads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert downloads" ON downloads FOR INSERT WITH CHECK (true);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If profile creation fails, still allow user creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate unique codes
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM files WHERE unique_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby files
CREATE OR REPLACE FUNCTION get_nearby_files(user_lat DOUBLE PRECISION, user_lng DOUBLE PRECISION, radius_meters INTEGER DEFAULT 5000)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  original_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  unique_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE,
  distance_meters DOUBLE PRECISION,
  uploader_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.filename,
    f.original_name,
    f.file_size,
    f.mime_type,
    f.storage_path,
    f.unique_code,
    f.latitude,
    f.longitude,
    f.created_at,
    ST_Distance(f.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)) as distance_meters,
    COALESCE(p.full_name, 'Anonymous') as uploader_name
  FROM files f
  LEFT JOIN profiles p ON f.user_id = p.id
  WHERE f.expires_at > NOW()
    AND f.is_downloaded = FALSE
    AND f.location IS NOT NULL
    AND ST_DWithin(
      f.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326),
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired files
CREATE OR REPLACE FUNCTION cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired files from storage would need to be handled by application
  DELETE FROM files WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
