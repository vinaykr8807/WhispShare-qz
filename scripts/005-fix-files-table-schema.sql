-- First, let's check if the files table exists and add missing columns
DO $$ 
BEGIN
    -- Add unique_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'files' AND column_name = 'unique_code') THEN
        ALTER TABLE files ADD COLUMN unique_code TEXT;
    END IF;
    
    -- Add is_downloaded column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'files' AND column_name = 'is_downloaded') THEN
        ALTER TABLE files ADD COLUMN is_downloaded BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add location column if it doesn't exist (PostGIS)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'files' AND column_name = 'location') THEN
        ALTER TABLE files ADD COLUMN location GEOGRAPHY(POINT, 4326);
    END IF;
END $$;

-- Make unique_code NOT NULL and UNIQUE after adding it
UPDATE files SET unique_code = upper(substring(md5(random()::text) from 1 for 8)) WHERE unique_code IS NULL;
ALTER TABLE files ALTER COLUMN unique_code SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_unique_code_key') THEN
        ALTER TABLE files ADD CONSTRAINT files_unique_code_key UNIQUE (unique_code);
    END IF;
END $$;

-- Create index on unique_code if it doesn't exist
CREATE INDEX IF NOT EXISTS files_unique_code_idx ON files (unique_code);

-- Create spatial index for location queries if it doesn't exist
CREATE INDEX IF NOT EXISTS files_location_idx ON files USING GIST (location);

-- Update the location column based on latitude/longitude for existing records
UPDATE files 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- Recreate the function to generate unique codes
CREATE OR REPLACE FUNCTION generate_unique_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM files WHERE unique_code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Recreate the function to find nearby files
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
