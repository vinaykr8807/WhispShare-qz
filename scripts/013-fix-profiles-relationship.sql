-- Fix the relationship between files and profiles tables

-- First, let's check the current foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'files' OR tc.table_name = 'profiles');

-- Drop the existing foreign key constraint if it exists
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_user_id_fkey;
ALTER TABLE files DROP CONSTRAINT IF EXISTS fk_files_user_id;

-- Recreate the foreign key constraint properly
ALTER TABLE files 
ADD CONSTRAINT files_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Also create a proper relationship with profiles table
-- First ensure profiles table references auth.users correctly
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Update the get_nearby_files function to use proper joins
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

-- Test the relationship by checking if we can join files and profiles
SELECT 
  f.unique_code,
  f.original_name,
  p.full_name as uploader_name
FROM files f
LEFT JOIN profiles p ON f.user_id = p.id
LIMIT 5;
