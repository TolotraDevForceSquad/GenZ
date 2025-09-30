ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "author_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "confirmed_count" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "confirmed_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "rejected_count" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "rejected_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "profile_image_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "alerts_count" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "alerts_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "validations_count" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "validations_count" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "validated_by" jsonb DEFAULT '[]'::jsonb;