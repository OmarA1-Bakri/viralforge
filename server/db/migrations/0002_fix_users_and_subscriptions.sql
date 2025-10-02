-- Fix missing password column in users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text NOT NULL DEFAULT '';

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS "user_subscriptions_expires_at_idx" ON "user_subscriptions"("expires_at") WHERE status = 'active';
CREATE INDEX IF NOT EXISTS "user_usage_period_start_idx" ON "user_usage"("period_start");
CREATE INDEX IF NOT EXISTS "users_subscription_tier_id_idx" ON "users"("subscription_tier_id");

-- Add updated_at trigger for user_subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
