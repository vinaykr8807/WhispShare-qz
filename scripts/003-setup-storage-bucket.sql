-- Create the files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to upload files to the files bucket
CREATE POLICY "Anyone can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'files');

-- Policy to allow anyone to view files (for download via signed URLs)
CREATE POLICY "Anyone can view files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'files');

-- Policy to allow file owners to delete their files (optional)
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow anyone to update file metadata (for signed URLs)
CREATE POLICY "Anyone can update files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'files');
