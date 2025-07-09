-- Drop existing policies and recreate them with better permissions
DROP POLICY IF EXISTS "Anyone can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update files" ON storage.objects;

-- Policy to allow anyone to upload files to the files bucket
CREATE POLICY "Allow file uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'files');

-- Policy to allow anyone to view files in the files bucket
CREATE POLICY "Allow file downloads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'files');

-- Policy to allow file updates (needed for signed URLs)
CREATE POLICY "Allow file updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'files');

-- Policy to allow file deletion (for cleanup)
CREATE POLICY "Allow file deletion"
ON storage.objects
FOR DELETE
USING (bucket_id = 'files');

-- Make sure the bucket is properly configured
UPDATE storage.buckets 
SET public = false, 
    file_size_limit = 52428800, -- 50MB in bytes
    allowed_mime_types = ARRAY[
      'image/*',
      'video/*',
      'audio/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/*',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ]
WHERE id = 'files';
