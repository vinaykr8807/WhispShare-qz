-- MANUAL SUPABASE DATABASE FIX
-- Execute these commands ONE BY ONE in Supabase SQL Editor

-- Step 1: Drop existing tables completely
DROP TABLE IF EXISTS downloads CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 3: Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create files table with ALL columns
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  location GEOGRAPHY(POINT, 4326),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_downloaded BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 5: Create downloads table
CREATE TABLE downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Step 6: Create indexes
CREATE INDEX files_user_id_idx ON files (user_id);
CREATE INDEX files_unique_code_idx ON files (unique_code);
CREATE INDEX files_expires_at_idx ON files (expires_at);
CREATE INDEX files_is_downloaded_idx ON files (is_downloaded);
CREATE INDEX files_location_idx ON files USING GIST (location);

-- Step 7: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view files" ON files FOR SELECT USING (true);
CREATE POLICY "Anyone can insert files" ON files FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update files" ON files FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete files" ON files FOR DELETE USING (true);

CREATE POLICY "Anyone can view downloads" ON downloads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert downloads" ON downloads FOR INSERT WITH CHECK (true);
