-- Migration: Fix YouTube Quota Tracking CRITICAL Bug
-- Remove UNIQUE(date) constraint that prevents multiple API calls per day
-- Add proper indexes for performance

-- Drop the broken UNIQUE constraint
ALTER TABLE "youtube_quota_usage" DROP CONSTRAINT IF EXISTS "youtube_quota_usage_date_unique";

-- Add proper indexes for fast quota aggregation
CREATE INDEX IF NOT EXISTS "idx_youtube_quota_date" ON "youtube_quota_usage"("date");
CREATE INDEX IF NOT EXISTS "idx_youtube_quota_date_success" ON "youtube_quota_usage"("date", "success");

-- Add composite index for metrics queries
CREATE INDEX IF NOT EXISTS "idx_youtube_metrics_operation_created"
  ON "youtube_api_metrics"("operation", "created_at");

-- Add partial index for failed calls only (performance optimization)
CREATE INDEX IF NOT EXISTS "idx_youtube_metrics_failures"
  ON "youtube_api_metrics"("created_at") WHERE success = false;

-- Add index on circuit breaker service name for fast lookups
CREATE INDEX IF NOT EXISTS "idx_circuit_breaker_service"
  ON "circuit_breaker_states"("service");
