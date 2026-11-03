CREATE TYPE "public"."atelier_appointment_status" AS ENUM('needs_confirmation', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."atelier_appointment_type" AS ENUM('consultation', 'first_fitting', 'progress_fitting', 'final_fitting', 'pickup');--> statement-breakpoint
CREATE TYPE "public"."purchase_item_status" AS ENUM('to_buy', 'ordered', 'received');--> statement-breakpoint
CREATE TABLE "atelier_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid,
	"garment_id" uuid,
	"type" "atelier_appointment_type" NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "atelier_appointment_status" DEFAULT 'needs_confirmation' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "atelier_appointments_garment_order_check" CHECK ("atelier_appointments"."garment_id" is null or "atelier_appointments"."order_id" is not null),
	CONSTRAINT "atelier_appointments_notes_nonempty_check" CHECK ("atelier_appointments"."notes" is null or length(btrim("atelier_appointments"."notes")) > 0)
);
--> statement-breakpoint
ALTER TABLE "atelier_appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "client_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"feedback" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_stories_rating_check" CHECK ("client_stories"."rating" between 1 and 5),
	CONSTRAINT "client_stories_feedback_nonempty_check" CHECK (length(btrim("client_stories"."feedback")) > 0)
);
--> statement-breakpoint
ALTER TABLE "client_stories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid,
	"name" varchar(200) NOT NULL,
	"category" varchar(80) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(40) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"supplier" varchar(200),
	"status" "purchase_item_status" DEFAULT 'to_buy' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_items_name_nonempty_check" CHECK (length(btrim("purchase_items"."name")) > 0),
	CONSTRAINT "purchase_items_category_nonempty_check" CHECK (length(btrim("purchase_items"."category")) > 0),
	CONSTRAINT "purchase_items_unit_nonempty_check" CHECK (length(btrim("purchase_items"."unit")) > 0),
	CONSTRAINT "purchase_items_quantity_positive_check" CHECK ("purchase_items"."quantity" > 0),
	CONSTRAINT "purchase_items_unit_price_nonnegative_check" CHECK ("purchase_items"."unit_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "purchase_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "media_objects_business_garment_id_unique" ON "media_objects" USING btree ("business_id","garment_id","id");--> statement-breakpoint
ALTER TABLE "atelier_appointments" ADD CONSTRAINT "atelier_appointments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atelier_appointments" ADD CONSTRAINT "atelier_appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atelier_appointments" ADD CONSTRAINT "atelier_appointments_business_customer_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."customers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atelier_appointments" ADD CONSTRAINT "atelier_appointments_business_order_customer_fk" FOREIGN KEY ("business_id","customer_id","order_id") REFERENCES "public"."orders"("business_id","customer_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atelier_appointments" ADD CONSTRAINT "atelier_appointments_business_garment_fk" FOREIGN KEY ("business_id","order_id","garment_id") REFERENCES "public"."garments"("business_id","order_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_stories" ADD CONSTRAINT "client_stories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_stories" ADD CONSTRAINT "client_stories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_stories" ADD CONSTRAINT "client_stories_business_order_customer_fk" FOREIGN KEY ("business_id","customer_id","order_id") REFERENCES "public"."orders"("business_id","customer_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_stories" ADD CONSTRAINT "client_stories_business_garment_fk" FOREIGN KEY ("business_id","order_id","garment_id") REFERENCES "public"."garments"("business_id","order_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_stories" ADD CONSTRAINT "client_stories_business_media_fk" FOREIGN KEY ("business_id","garment_id","media_id") REFERENCES "public"."media_objects"("business_id","garment_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_business_order_fk" FOREIGN KEY ("business_id","order_id") REFERENCES "public"."orders"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "atelier_appointments_business_id_id_unique" ON "atelier_appointments" USING btree ("business_id","id");--> statement-breakpoint
CREATE INDEX "atelier_appointments_business_scheduled_idx" ON "atelier_appointments" USING btree ("business_id","scheduled_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_stories_business_id_id_unique" ON "client_stories" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_stories_media_unique" ON "client_stories" USING btree ("business_id","media_id");--> statement-breakpoint
CREATE INDEX "client_stories_business_created_idx" ON "client_stories" USING btree ("business_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_items_business_id_id_unique" ON "purchase_items" USING btree ("business_id","id");--> statement-breakpoint
CREATE INDEX "purchase_items_business_status_updated_idx" ON "purchase_items" USING btree ("business_id","status","updated_at");--> statement-breakpoint
CREATE POLICY "atelier_appointments_current_tenant" ON "atelier_appointments" AS PERMISSIVE FOR ALL TO public USING ("atelier_appointments"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("atelier_appointments"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "client_stories_current_tenant" ON "client_stories" AS PERMISSIVE FOR ALL TO public USING ("client_stories"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("client_stories"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "purchase_items_current_tenant" ON "purchase_items" AS PERMISSIVE FOR ALL TO public USING ("purchase_items"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("purchase_items"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
ALTER TABLE "atelier_appointments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_stories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "purchase_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT USAGE ON TYPE "atelier_appointment_status", "atelier_appointment_type", "purchase_item_status" TO clare_vogue_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "atelier_appointments" TO clare_vogue_runtime;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "client_stories" TO clare_vogue_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "purchase_items" TO clare_vogue_runtime;