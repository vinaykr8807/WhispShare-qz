-- Allow anonymous uploads / downloads when user_id IS NULL
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own files" ON files;
CREATE POLICY "Authenticated or anon can insert files"
ON files
FOR INSERT
WITH CHECK ( auth.uid() = user_id OR user_id IS NULL );

-- Keep update/delete restricted to owners
DROP POLICY IF EXISTS "Users can update own files" ON files;
CREATE POLICY "Owner can update files"
ON files
FOR UPDATE
USING ( auth.uid() = user_id );

-- Allow marking a file downloaded even for anon
DROP POLICY IF EXISTS "Users can update own downloads" ON downloads;
CREATE POLICY "Anon or owner insert downloads"
ON downloads
FOR INSERT
WITH CHECK ( auth.uid() = user_id OR user_id IS NULL );
