-- Fix file receiver issues by ensuring proper data structure

-- Add some test data to verify the system works
-- (Remove this after testing)
INSERT INTO files (
  user_id,
  filename,
  original_name,
  file_size,
  mime_type,
  storage_path,
  unique_code,
  latitude,
  longitude,
  expires_at,
  is_downloaded
) VALUES (
  NULL, -- anonymous upload
  'test-file.txt',
  'test-file.txt',
  1024,
  'text/plain',
  'anonymous/test-file.txt',
  'TEST1234',
  37.7749, -- San Francisco coordinates for testing
  -122.4194,
  NOW() + INTERVAL '24 hours',
  false
) ON CONFLICT (unique_code) DO NOTHING;

-- Verify the files table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'files' 
ORDER BY ordinal_position;

-- Check if there are any files in the database
SELECT COUNT(*) as total_files, 
       COUNT(CASE WHEN is_downloaded = false THEN 1 END) as available_files,
       COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as non_expired_files
FROM files;
