CREATE TYPE "public"."fitting_outcome" AS ENUM('pending', 'approved', 'alterations_required');--> statement-breakpoint
CREATE TYPE "public"."garment_progress_event_type" AS ENUM('created', 'progress_logged', 'stage_changed', 'blocked', 'unblocked', 'cancelled', 'fitting_recorded');--> statement-breakpoint
CREATE TYPE "public"."garment_stage" AS ENUM('request_confirmed', 'measurements_recorded', 'material_pending', 'ready_to_cut', 'cutting', 'sewing', 'customer_fitting', 'alterations', 'dry_cleaning', 'packaging', 'ready_for_delivery', 'payment_check', 'customer_notified', 'delivery_arranged', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."material_source" AS ENUM('customer', 'business', 'unknown');--> statement-breakpoint
CREATE TABLE "fittings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"outcome" "fitting_outcome" NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_alterations" text,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fittings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "garment_progress_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"event_type" "garment_progress_event_type" NOT NULL,
	"from_stage" "garment_stage",
	"to_stage" "garment_stage",
	"note" text,
	"next_action" varchar(500),
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "garment_progress_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "garments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"description" varchar(300) NOT NULL,
	"instructions" text,
	"material_source" "material_source" DEFAULT 'unknown' NOT NULL,
	"material_ready_at" timestamp with time zone,
	"material_notes" text,
	"stage" "garment_stage" DEFAULT 'request_confirmed' NOT NULL,
	"next_action" varchar(500),
	"blocked_at" timestamp with time zone,
	"blocking_reason" text,
	"agreed_price" numeric(12, 2),
	"due_date" timestamp with time zone,
	"measurement_set_id" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garments_description_nonempty_check" CHECK (length(btrim("garments"."description")) > 0),
	CONSTRAINT "garments_price_nonnegative_check" CHECK ("garments"."agreed_price" is null or "garments"."agreed_price" >= 0),
	CONSTRAINT "garments_block_state_check" CHECK (("garments"."blocked_at" is null and "garments"."blocking_reason" is null) or ("garments"."blocked_at" is not null and length(btrim("garments"."blocking_reason")) > 0)),
	CONSTRAINT "garments_cancellation_state_check" CHECK (("garments"."cancelled_at" is null and "garments"."cancellation_reason" is null) or ("garments"."cancelled_at" is not null and length(btrim("garments"."cancellation_reason")) > 0)),
	CONSTRAINT "garments_terminal_stage_check" CHECK (("garments"."stage" = 'cancelled' and "garments"."cancelled_at" is not null) or ("garments"."stage" <> 'cancelled' and "garments"."cancelled_at" is null))
);
--> statement-breakpoint
ALTER TABLE "garments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"reference" varchar(20) NOT NULL,
	"order_date" timestamp with time zone DEFAULT now() NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "garments_business_id_id_unique" ON "garments" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_id_id_unique" ON "orders" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_customer_id_id_unique" ON "orders" USING btree ("business_id","customer_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_reference_unique" ON "orders" USING btree ("business_id","reference");--> statement-breakpoint
ALTER TABLE "fittings" ADD CONSTRAINT "fittings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fittings" ADD CONSTRAINT "fittings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fittings" ADD CONSTRAINT "fittings_business_garment_fk" FOREIGN KEY ("business_id","garment_id") REFERENCES "public"."garments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_progress_events" ADD CONSTRAINT "garment_progress_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_progress_events" ADD CONSTRAINT "garment_progress_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_progress_events" ADD CONSTRAINT "garment_progress_business_garment_fk" FOREIGN KEY ("business_id","garment_id") REFERENCES "public"."garments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garments" ADD CONSTRAINT "garments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garments" ADD CONSTRAINT "garments_business_order_customer_fk" FOREIGN KEY ("business_id","customer_id","order_id") REFERENCES "public"."orders"("business_id","customer_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garments" ADD CONSTRAINT "garments_business_customer_measurement_fk" FOREIGN KEY ("business_id","customer_id","measurement_set_id") REFERENCES "public"."measurement_sets"("business_id","customer_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_customer_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."customers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fittings_business_garment_completed_idx" ON "fittings" USING btree ("business_id","garment_id","completed_at");--> statement-breakpoint
CREATE INDEX "garment_progress_business_garment_created_idx" ON "garment_progress_events" USING btree ("business_id","garment_id","created_at");--> statement-breakpoint
CREATE INDEX "garments_business_order_idx" ON "garments" USING btree ("business_id","order_id","created_at");--> statement-breakpoint
CREATE INDEX "garments_business_stage_due_idx" ON "garments" USING btree ("business_id","stage","due_date");--> statement-breakpoint
CREATE INDEX "orders_business_date_idx" ON "orders" USING btree ("business_id","order_date","id");--> statement-breakpoint
CREATE POLICY "fittings_current_tenant" ON "fittings" AS PERMISSIVE FOR ALL TO public USING ("fittings"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("fittings"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "garment_progress_current_tenant" ON "garment_progress_events" AS PERMISSIVE FOR ALL TO public USING ("garment_progress_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("garment_progress_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "garments_current_tenant" ON "garments" AS PERMISSIVE FOR ALL TO public USING ("garments"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("garments"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "orders_current_tenant" ON "orders" AS PERMISSIVE FOR ALL TO public USING ("orders"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("orders"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));
--> statement-breakpoint
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "garments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "garment_progress_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "fittings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT USAGE ON TYPE "material_source", "garment_stage", "garment_progress_event_type", "fitting_outcome" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "orders" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "garments" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "garment_progress_events" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "fittings" TO clare_vogue_runtime;