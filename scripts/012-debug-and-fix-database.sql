-- Debug and fix database issues

-- First, let's check what's in the files table
SELECT 
  id,
  unique_code,
  original_name,
  is_downloaded,
  expires_at,
  created_at,
  latitude,
  longitude,
  user_id
FROM files 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if there are any files with the specific code
SELECT * FROM files WHERE unique_code = 'TG52UBOY';

-- Check the profiles table structure and data
SELECT * FROM profiles LIMIT 5;

-- Ensure the files table has all required columns
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Update location column for existing files
UPDATE files 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND location IS NULL;

-- Create a function to debug file searches
CREATE OR REPLACE FUNCTION debug_file_search(search_code TEXT)
RETURNS TABLE (
  found_files BIGINT,
  non_downloaded BIGINT,
  non_expired BIGINT,
  file_details JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM files WHERE unique_code = search_code) as found_files,
    (SELECT COUNT(*) FROM files WHERE unique_code = search_code AND is_downloaded = false) as non_downloaded,
    (SELECT COUNT(*) FROM files WHERE unique_code = search_code AND expires_at > NOW()) as non_expired,
    (SELECT json_agg(row_to_json(f)) FROM (
      SELECT unique_code, original_name, is_downloaded, expires_at, created_at 
      FROM files 
      WHERE unique_code = search_code
    ) f) as file_details;
END;
$$ LANGUAGE plpgsql;

-- Test the debug function
SELECT * FROM debug_file_search('TG52UBOY');
