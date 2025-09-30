CREATE TABLE "activity_logs" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(50),
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" varchar(50),
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alert_validations" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" varchar(50) NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"is_valid" boolean NOT NULL,
	"validated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "media" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "media" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "sid" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "latitude" numeric(10, 8);--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "longitude" numeric(11, 8);--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_validations" ADD CONSTRAINT "alert_validations_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_validations" ADD CONSTRAINT "alert_validations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_validations_unique" ON "alert_validations" USING btree ("alert_id","user_id");--> statement-breakpoint
CREATE INDEX "alert_validations_alert_id_idx" ON "alert_validations" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX "alert_validations_user_id_idx" ON "alert_validations" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_author_id_idx" ON "alerts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alerts_urgency_idx" ON "alerts" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX "alerts_created_at_idx" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "alerts_location_idx" ON "alerts" USING btree ("location");--> statement-breakpoint
CREATE INDEX "sessions_sid_idx" ON "sessions" USING btree ("sid");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email") WHERE email IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_neighborhood_idx" ON "users" USING btree ("neighborhood");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_unique" UNIQUE("phone");