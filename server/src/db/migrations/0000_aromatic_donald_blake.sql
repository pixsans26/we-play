CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "couple" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_a_uid" text NOT NULL,
	"partner_b_uid" text,
	"partner_a_name" text NOT NULL,
	"partner_b_name" text,
	"partner_a_age" integer,
	"partner_b_age" integer,
	"partner_a_gender" text,
	"partner_b_gender" text,
	"what_a_likes" text,
	"what_b_likes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"image_source" text NOT NULL,
	"caption" text NOT NULL,
	"reaction_prompt" text NOT NULL,
	"level" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lottery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"action_type" text DEFAULT 'any' NOT NULL,
	"column_type" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "spin_wheel_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"emoji" text DEFAULT '🎯' NOT NULL,
	"color" text DEFAULT '#FF6B9D' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_uid" text NOT NULL,
	"performer_uid" text NOT NULL,
	"task_id" text NOT NULL,
	"task_type" text NOT NULL,
	"category" text,
	"scratched_at" timestamp DEFAULT now() NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"time_taken" integer
);
--> statement-breakpoint
CREATE TABLE "text_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"timer_seconds" integer NOT NULL,
	"level" integer NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_uid" text NOT NULL,
	"scratch_count" integer DEFAULT 0,
	"completed_count" integer DEFAULT 0,
	"current_level" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_progress_user_uid_unique" UNIQUE("user_uid")
);
