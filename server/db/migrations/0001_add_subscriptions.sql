-- Add subscription tiers table
CREATE TABLE "subscription_tiers" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"price_monthly" integer NOT NULL,
	"price_yearly" integer NOT NULL,
	"features" json NOT NULL,
	"limits" json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_tiers_name_unique" UNIQUE("name")
);

-- Add user subscriptions table
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"tier_id" varchar NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"payment_method" text,
	"stripe_subscription_id" varchar,
	"stripe_customer_id" varchar,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add usage tracking table
CREATE TABLE "user_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"feature" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"period_start" timestamp DEFAULT date_trunc('month', now()) NOT NULL,
	"period_end" timestamp DEFAULT (date_trunc('month', now()) + interval '1 month') NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_usage_user_id_feature_period_start_unique" UNIQUE("user_id","feature","period_start")
);

-- Add foreign key constraints
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Insert default subscription tiers
INSERT INTO "subscription_tiers" ("id", "name", "display_name", "description", "price_monthly", "price_yearly", "features", "limits", "sort_order") VALUES
('free', 'free', 'Free', 'Perfect for getting started', 0, 0,
 '["3 video analyses per month", "5 AI-generated content ideas", "10 trend bookmarks", "Basic analytics"]'::json,
 '{"videoAnalysis": 3, "contentGeneration": 5, "trendBookmarks": 10, "videoClips": 0}'::json,
 1),
('pro', 'pro', 'Pro', 'For serious content creators', 1499, 14990,
 '["Unlimited video analyses", "Unlimited AI content generation", "Unlimited trend bookmarks", "Advanced analytics dashboard", "Video clip generation (50/month)", "Priority support"]'::json,
 '{"videoAnalysis": -1, "contentGeneration": -1, "trendBookmarks": -1, "videoClips": 50}'::json,
 2),
('creator', 'creator', 'Creator', 'For professional creators and agencies', 4999, 49990,
 '["Everything in Pro", "Unlimited video clips", "Team collaboration tools", "API access", "Custom integrations", "Dedicated support"]'::json,
 '{"videoAnalysis": -1, "contentGeneration": -1, "trendBookmarks": -1, "videoClips": -1}'::json,
 3);

-- Add subscription tier to users table (default to free)
ALTER TABLE "users" ADD COLUMN "subscription_tier_id" varchar DEFAULT 'free';
ALTER TABLE "users" ADD CONSTRAINT "users_subscription_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("subscription_tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE set default ON UPDATE no action;

-- Create index for faster queries
CREATE INDEX "user_subscriptions_user_id_idx" ON "user_subscriptions"("user_id");
CREATE INDEX "user_subscriptions_status_idx" ON "user_subscriptions"("status");
CREATE INDEX "user_usage_user_id_feature_idx" ON "user_usage"("user_id", "feature");
