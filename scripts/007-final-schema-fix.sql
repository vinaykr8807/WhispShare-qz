-- Enable PostGIS extension first
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop and recreate the files table with all required columns
DROP TABLE IF EXISTS downloads CASCADE;
DROP TABLE IF EXISTS files CASCADE;

-- Create files table with complete schema
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  unique_code TEXT UNIQUE NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_downloaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create downloads table
CREATE TABLE downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX files_unique_code_idx ON files (unique_code);
CREATE INDEX files_location_idx ON files USING GIST (location);
CREATE INDEX files_expires_at_idx ON files (expires_at);
CREATE INDEX files_is_downloaded_idx ON files (is_downloaded);

-- Enable RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for files
CREATE POLICY "Anyone can view files" ON files FOR SELECT USING (true);
CREATE POLICY "Anyone can insert files" ON files FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update files" ON files FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete files" ON files FOR DELETE USING (true);

-- Create RLS policies for downloads
CREATE POLICY "Anyone can view downloads" ON downloads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert downloads" ON downloads FOR INSERT WITH CHECK (true);

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
