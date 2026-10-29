CREATE TYPE "public"."media_upload_status" AS ENUM('pending', 'available', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."portfolio_consent_action" AS ENUM('granted', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."portfolio_consent_method" AS ENUM('verbal', 'written', 'electronic');--> statement-breakpoint
CREATE TABLE "media_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"file_size_bytes" numeric(12, 0) NOT NULL,
	"status" "media_upload_status" DEFAULT 'pending' NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"upload_expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "media_objects_file_size_positive_check" CHECK ("media_objects"."file_size_bytes" > 0),
	CONSTRAINT "media_objects_completion_state_check" CHECK (("media_objects"."status" = 'available' and "media_objects"."completed_at" is not null) or ("media_objects"."status" <> 'available' and "media_objects"."completed_at" is null))
);
--> statement-breakpoint
ALTER TABLE "media_objects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "media_objects_business_id_id_unique" ON "media_objects" USING btree ("business_id","id");--> statement-breakpoint
CREATE TABLE "portfolio_consent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"action" "portfolio_consent_action" NOT NULL,
	"method" "portfolio_consent_method",
	"occurred_at" timestamp with time zone NOT NULL,
	"note" text,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_consent_events_payload_check" CHECK (("portfolio_consent_events"."action" = 'granted' and "portfolio_consent_events"."method" is not null) or ("portfolio_consent_events"."action" = 'withdrawn' and "portfolio_consent_events"."method" is null))
);
--> statement-breakpoint
ALTER TABLE "portfolio_consent_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_business_garment_fk" FOREIGN KEY ("business_id","garment_id") REFERENCES "public"."garments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_consent_events" ADD CONSTRAINT "portfolio_consent_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_consent_events" ADD CONSTRAINT "portfolio_consent_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_consent_events" ADD CONSTRAINT "portfolio_consent_events_media_fk" FOREIGN KEY ("business_id","media_id") REFERENCES "public"."media_objects"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_objects_object_key_unique" ON "media_objects" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_objects_garment_created_idx" ON "media_objects" USING btree ("business_id","garment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_consent_events_business_media_id_unique" ON "portfolio_consent_events" USING btree ("business_id","media_id","id");--> statement-breakpoint
CREATE INDEX "portfolio_consent_events_media_created_idx" ON "portfolio_consent_events" USING btree ("business_id","media_id","created_at");--> statement-breakpoint
CREATE POLICY "media_objects_current_tenant" ON "media_objects" AS PERMISSIVE FOR ALL TO public USING ("media_objects"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("media_objects"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "portfolio_consent_events_current_tenant" ON "portfolio_consent_events" AS PERMISSIVE FOR ALL TO public USING ("portfolio_consent_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("portfolio_consent_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));
--> statement-breakpoint
ALTER TABLE "media_objects" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "portfolio_consent_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT USAGE ON TYPE "media_upload_status", "portfolio_consent_action", "portfolio_consent_method" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "media_objects" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "portfolio_consent_events" TO clare_vogue_runtime;