-- Update location range from 5km to 100km across all functions and references

-- Update the get_nearby_files function to use 100km (100,000 meters) as default
CREATE OR REPLACE FUNCTION get_nearby_files(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 100000 -- Changed from 5000 to 100000 (100km)
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  original_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  unique_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_downloaded BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.filename,
    f.original_name,
    f.file_size,
    f.mime_type,
    f.unique_code,
    f.latitude,
    f.longitude,
    ST_Distance(
      ST_GeogFromText('POINT(' || user_lng || ' ' || user_lat || ')'),
      ST_GeogFromText('POINT(' || f.longitude || ' ' || f.latitude || ')')
    ) as distance_meters,
    f.created_at,
    f.expires_at,
    f.is_downloaded
  FROM files f
  WHERE 
    f.latitude IS NOT NULL 
    AND f.longitude IS NOT NULL
    AND (f.expires_at IS NULL OR f.expires_at > NOW())
    AND ST_DWithin(
      ST_GeogFromText('POINT(' || user_lng || ' ' || user_lat || ')'),
      ST_GeogFromText('POINT(' || f.longitude || ' ' || f.latitude || ')'),
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$;

-- Update any existing stored procedures or functions that reference the old 5km limit
-- Add comment to document the change
COMMENT ON FUNCTION get_nearby_files IS 'Returns files within specified radius (default 100km) of user location, ordered by distance';

-- Create index for better performance with larger radius searches
CREATE INDEX IF NOT EXISTS idx_files_location_100km ON files USING GIST (
  ST_GeogFromText('POINT(' || longitude || ' ' || latitude || ')')
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Update any views or materialized views that might reference location constraints
-- (Add any additional location-based queries that need updating here)

-- Log the change
INSERT INTO public.schema_migrations (version, description, executed_at) 
VALUES ('015', 'Updated location range from 5km to 100km', NOW())
ON CONFLICT (version) DO NOTHING;
