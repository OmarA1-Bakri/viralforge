-- YouTube API Resilience Tables Migration
-- Created: 2025-10-10
-- Purpose: Add quota tracking, circuit breaker, and API metrics tables

-- YouTube API quota tracking (10,000 units/day free tier)
CREATE TABLE IF NOT EXISTS "youtube_quota_usage" (
  "id" SERIAL PRIMARY KEY,
  "date" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "units_used" INTEGER NOT NULL,
  "user_id" VARCHAR REFERENCES "users"("id"),
  "endpoint" TEXT,
  "success" BOOLEAN DEFAULT true NOT NULL,
  "error_code" TEXT,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE("date")
);

-- YouTube API performance metrics
CREATE TABLE IF NOT EXISTS "youtube_api_metrics" (
  "id" SERIAL PRIMARY KEY,
  "operation" TEXT NOT NULL,
  "duration_ms" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL,
  "status_code" INTEGER,
  "error_type" TEXT,
  "retry_count" INTEGER DEFAULT 0 NOT NULL,
  "user_id" VARCHAR REFERENCES "users"("id"),
  "created_at" TIMESTAMP DEFAULT now() NOT NULL
);

-- Circuit breaker state tracking
CREATE TABLE IF NOT EXISTS "circuit_breaker_states" (
  "id" SERIAL PRIMARY KEY,
  "service" TEXT NOT NULL UNIQUE,
  "state" TEXT NOT NULL,
  "failure_count" INTEGER DEFAULT 0 NOT NULL,
  "last_failure_at" TIMESTAMP,
  "last_success_at" TIMESTAMP,
  "opened_at" TIMESTAMP,
  "half_open_at" TIMESTAMP,
  "metadata" JSON,
  "updated_at" TIMESTAMP DEFAULT now() NOT NULL
);

-- Processed webhook events (for idempotency/replay prevention)
CREATE TABLE IF NOT EXISTS "processed_webhook_events" (
  "id" SERIAL PRIMARY KEY,
  "event_id" TEXT NOT NULL UNIQUE,
  "source" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "processed_at" TIMESTAMP DEFAULT now() NOT NULL,
  "success" BOOLEAN DEFAULT true NOT NULL,
  "error" TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_youtube_quota_date" ON "youtube_quota_usage"("date");
CREATE INDEX IF NOT EXISTS "idx_youtube_quota_user" ON "youtube_quota_usage"("user_id");
CREATE INDEX IF NOT EXISTS "idx_youtube_metrics_operation" ON "youtube_api_metrics"("operation");
CREATE INDEX IF NOT EXISTS "idx_youtube_metrics_created" ON "youtube_api_metrics"("created_at");
CREATE INDEX IF NOT EXISTS "idx_circuit_breaker_service" ON "circuit_breaker_states"("service");
CREATE INDEX IF NOT EXISTS "idx_webhook_events_source" ON "processed_webhook_events"("source");

-- Initialize circuit breaker for YouTube API
INSERT INTO "circuit_breaker_states" ("service", "state", "failure_count")
VALUES ('youtube_api', 'CLOSED', 0)
ON CONFLICT ("service") DO NOTHING;
