-- Add analysis schedule table for automated profile analysis

CREATE TABLE IF NOT EXISTS analysis_schedules (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('manual', 'daily', 'weekly', 'monthly')),
  scheduled_day_of_week INTEGER, -- 0-6 (Sunday=0) for weekly
  scheduled_day_of_month INTEGER, -- 1-31 for monthly
  scheduled_time TEXT NOT NULL DEFAULT '09:00:00',
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_schedules_user_id ON analysis_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_schedules_next_run ON analysis_schedules(next_run_at) WHERE is_active = true;
