CREATE TABLE "content_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"clickability_score" real NOT NULL,
	"clarity_score" real NOT NULL,
	"intrigue_score" real NOT NULL,
	"emotion_score" real NOT NULL,
	"feedback" json NOT NULL,
	"suggestions" text[] NOT NULL,
	"roast_mode" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trends" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"platform" text NOT NULL,
	"hotness" text NOT NULL,
	"engagement" integer NOT NULL,
	"hashtags" text[] NOT NULL,
	"sound" text,
	"suggestion" text NOT NULL,
	"time_ago" text NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"content_id" integer,
	"trend_id" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"content_id" integer,
	"platform" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"click_rate" real,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"derived_from_trend_id" integer,
	"title" text,
	"description" text,
	"thumbnail_url" text,
	"video_url" text,
	"platform" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_trends" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"trend_id" integer NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_trends_user_id_trend_id_action_unique" UNIQUE("user_id","trend_id","action")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "video_clips" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" real NOT NULL,
	"end_time" real NOT NULL,
	"clip_url" text,
	"thumbnail_url" text,
	"viral_score" real,
	"status" text DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_analysis" ADD CONSTRAINT "content_analysis_content_id_user_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."user_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_content_id_user_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."user_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_trend_id_trends_id_fk" FOREIGN KEY ("trend_id") REFERENCES "public"."trends"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_analytics" ADD CONSTRAINT "user_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_analytics" ADD CONSTRAINT "user_analytics_content_id_user_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."user_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_content" ADD CONSTRAINT "user_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_content" ADD CONSTRAINT "user_content_derived_from_trend_id_trends_id_fk" FOREIGN KEY ("derived_from_trend_id") REFERENCES "public"."trends"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trends" ADD CONSTRAINT "user_trends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trends" ADD CONSTRAINT "user_trends_trend_id_trends_id_fk" FOREIGN KEY ("trend_id") REFERENCES "public"."trends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_clips" ADD CONSTRAINT "video_clips_content_id_user_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."user_content"("id") ON DELETE cascade ON UPDATE no action;