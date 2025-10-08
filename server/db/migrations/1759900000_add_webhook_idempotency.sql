-- Migration: Add webhook event tracking for idempotency
-- Prevents replay attacks by tracking processed webhook event IDs

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'stripe' or 'revenuecat'
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON processed_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON processed_webhook_events(created_at);

-- Cleanup old events (older than 90 days) to prevent table growth
-- RevenueCat recommends keeping 30-90 days of event history
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_webhook_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
