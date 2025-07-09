-- Add ML/NLP features to the database schema

-- Add AI-related columns to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS ai_tags TEXT[],
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_classification TEXT,
ADD COLUMN IF NOT EXISTS content_keywords TEXT[],
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

-- Create ML insights table
CREATE TABLE IF NOT EXISTS ml_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  value FLOAT,
  metadata JSONB,
  severity TEXT DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create anomalies table for ML anomaly detection
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anomaly_type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'low',
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user activity logs for ML analysis
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search queries table for NLP analysis
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  processed_intent TEXT,
  extracted_keywords TEXT[],
  extracted_entities TEXT[],
  results_count INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS files_ai_tags_idx ON files USING GIN (ai_tags);
CREATE INDEX IF NOT EXISTS files_content_keywords_idx ON files USING GIN (content_keywords);
CREATE INDEX IF NOT EXISTS files_processing_status_idx ON files (processing_status);
CREATE INDEX IF NOT EXISTS ml_insights_type_idx ON ml_insights (insight_type);
CREATE INDEX IF NOT EXISTS anomalies_type_idx ON anomalies (anomaly_type);
CREATE INDEX IF NOT EXISTS anomalies_severity_idx ON anomalies (severity);
CREATE INDEX IF NOT EXISTS user_activity_logs_type_idx ON user_activity_logs (activity_type);
CREATE INDEX IF NOT EXISTS user_activity_logs_created_at_idx ON user_activity_logs (created_at);
CREATE INDEX IF NOT EXISTS search_queries_created_at_idx ON search_queries (created_at);

-- Enable RLS on new tables
ALTER TABLE ml_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view ml_insights" ON ml_insights FOR SELECT USING (true);
CREATE POLICY "System can insert ml_insights" ON ml_insights FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view anomalies" ON anomalies FOR SELECT USING (true);
CREATE POLICY "System can insert anomalies" ON anomalies FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own anomalies" ON anomalies FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activity logs" ON user_activity_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "System can insert activity logs" ON user_activity_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own search queries" ON search_queries FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "System can insert search queries" ON search_queries FOR INSERT WITH CHECK (true);

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_file_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO user_activity_logs (
    user_id,
    activity_type,
    file_id,
    metadata
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_file_id,
    p_metadata
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$LANGUAGE plpgsql;

-- Function to create ML insight
CREATE OR REPLACE FUNCTION create_ml_insight(
  p_insight_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_value FLOAT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'low'
)
RETURNS UUID AS $$
DECLARE
  insight_id UUID;
BEGIN
  INSERT INTO ml_insights (
    insight_type,
    title,
    description,
    value,
    metadata,
    severity
  ) VALUES (
    p_insight_type,
    p_title,
    p_description,
    p_value,
    p_metadata,
    p_severity
  ) RETURNING id INTO insight_id;
  
  RETURN insight_id;
END;
$$LANGUAGE plpgsql;

-- Function to detect anomalies
CREATE OR REPLACE FUNCTION detect_file_anomalies()
RETURNS TABLE (
  anomaly_type TEXT,
  description TEXT,
  file_count BIGINT,
  severity TEXT
) AS $$
BEGIN
  -- Detect unusually large files
  RETURN QUERY
  SELECT 
    'large_files'::TEXT as anomaly_type,
    'Files significantly larger than average detected'::TEXT as description,
    COUNT(*)::BIGINT as file_count,
    CASE 
      WHEN COUNT(*) > 10 THEN 'high'::TEXT
      WHEN COUNT(*) > 5 THEN 'medium'::TEXT
      ELSE 'low'::TEXT
    END as severity
  FROM files 
  WHERE file_size > (
    SELECT AVG(file_size) * 3 
    FROM files 
    WHERE created_at > NOW() - INTERVAL '7 days'
  )
  AND created_at > NOW() - INTERVAL '24 hours'
  HAVING COUNT(*) > 0;

  -- Detect rapid uploads from same user
  RETURN QUERY
  SELECT 
    'rapid_uploads'::TEXT as anomaly_type,
    'User with unusually high upload activity detected'::TEXT as description,
    MAX(upload_count)::BIGINT as file_count,
    CASE 
      WHEN MAX(upload_count) > 20 THEN 'high'::TEXT
      WHEN MAX(upload_count) > 10 THEN 'medium'::TEXT
      ELSE 'low'::TEXT
    END as severity
  FROM (
    SELECT user_id, COUNT(*) as upload_count
    FROM files 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    AND user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 5
  ) user_uploads;
END;
$$LANGUAGE plpgsql;

-- Function to update file AI processing
CREATE OR REPLACE FUNCTION update_file_ai_processing(
  p_file_id UUID,
  p_tags TEXT[],
  p_summary TEXT,
  p_classification TEXT,
  p_keywords TEXT[],
  p_sentiment_score FLOAT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE files 
  SET 
    ai_tags = p_tags,
    ai_summary = p_summary,
    ai_classification = p_classification,
    content_keywords = p_keywords,
    sentiment_score = p_sentiment_score,
    processing_status = 'completed',
    updated_at = NOW()
  WHERE id = p_file_id;
  
  RETURN FOUND;
END;
$$LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO ml_insights (insight_type, title, description, value, severity) VALUES
('upload_trend', 'Upload Activity Increase', 'File uploads increased by 25% this week', 125.0, 'medium'),
('file_size_analysis', 'Average File Size', 'Average file size is 2.3MB', 2.3, 'low'),
('user_activity', 'Active Users', '15 unique users uploaded files this week', 15.0, 'low');
