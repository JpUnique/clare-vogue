CREATE TYPE "public"."customer_event_type" AS ENUM('created', 'updated', 'archived', 'restored');--> statement-breakpoint
CREATE TYPE "public"."customer_preferred_contact" AS ENUM('phone', 'email', 'whatsapp', 'in_person', 'other');--> statement-breakpoint
CREATE TYPE "public"."measurement_unit" AS ENUM('cm', 'in');--> statement-breakpoint
CREATE TABLE "customer_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"event_type" "customer_event_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(40),
	"email" varchar(320),
	"preferred_contact" "customer_preferred_contact",
	"internal_notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "measurement_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"unit" "measurement_unit" NOT NULL,
	"template_version" varchar(20) DEFAULT 'ladies-dress-v1' NOT NULL,
	"bust" numeric(8, 2),
	"waist" numeric(8, 2),
	"hips" numeric(8, 2),
	"shoulder_width" numeric(8, 2),
	"shoulder_to_waist" numeric(8, 2),
	"sleeve_length" numeric(8, 2),
	"armhole" numeric(8, 2),
	"desired_dress_length" numeric(8, 2),
	"custom_measurements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "measurement_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_events" ADD CONSTRAINT "customer_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_events" ADD CONSTRAINT "customer_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_events" ADD CONSTRAINT "customer_events_business_customer_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."customers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_sets" ADD CONSTRAINT "measurement_sets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_sets" ADD CONSTRAINT "measurement_sets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_sets" ADD CONSTRAINT "measurement_sets_business_customer_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."customers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_events_business_id_id_unique" ON "customer_events" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_events_business_id_customer_id_id_unique" ON "customer_events" USING btree ("business_id","customer_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_business_id_id_unique" ON "customers" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "measurement_sets_business_id_id_unique" ON "measurement_sets" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "measurement_sets_business_id_customer_id_id_unique" ON "measurement_sets" USING btree ("business_id","customer_id","id");--> statement-breakpoint
CREATE INDEX "measurement_sets_customer_measured_at_idx" ON "measurement_sets" USING btree ("business_id","customer_id","measured_at");--> statement-breakpoint
CREATE POLICY "customer_events_current_tenant" ON "customer_events" AS PERMISSIVE FOR ALL TO public USING ("customer_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("customer_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "customers_current_tenant" ON "customers" AS PERMISSIVE FOR ALL TO public USING ("customers"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("customers"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "measurement_sets_current_tenant" ON "measurement_sets" AS PERMISSIVE FOR ALL TO public USING ("measurement_sets"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("measurement_sets"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));
--> statement-breakpoint
ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "measurement_sets" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "customer_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT USAGE ON TYPE "customer_preferred_contact", "customer_event_type", "measurement_unit" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "customers" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "measurement_sets" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "customer_events" TO clare_vogue_runtime;