-- Create the files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'files', 
    'files', 
    false, 
    52428800, -- 50MB limit
    ARRAY[
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
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Allow file uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'files');

CREATE POLICY "Allow file downloads" ON storage.objects
    FOR SELECT USING (bucket_id = 'files');

CREATE POLICY "Allow file updates" ON storage.objects
    FOR UPDATE USING (bucket_id = 'files');

CREATE POLICY "Allow file deletion" ON storage.objects
    FOR DELETE USING (bucket_id = 'files');