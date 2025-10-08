-- Add previous viral score tracking for simple before/after comparison
ALTER TABLE creator_profiles 
ADD COLUMN previous_viral_score INTEGER,
ADD COLUMN previous_analyzed_at TIMESTAMP;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);

-- Add comment for documentation
COMMENT ON COLUMN creator_profiles.previous_viral_score IS 'Stores the viral score from the previous analysis for comparison';
COMMENT ON COLUMN creator_profiles.previous_analyzed_at IS 'Timestamp of when the previous score was recorded';
