CREATE TABLE "garment_price_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"previous_price" numeric(12, 2),
	"new_price" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garment_price_events_new_price_check" CHECK ("garment_price_events"."new_price" >= 0),
	CONSTRAINT "garment_price_events_reason_check" CHECK (length(btrim("garment_price_events"."reason")) > 0)
);
--> statement-breakpoint
ALTER TABLE "garment_price_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "garment_price_events" ADD CONSTRAINT "garment_price_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_price_events" ADD CONSTRAINT "garment_price_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_price_events" ADD CONSTRAINT "garment_price_events_business_garment_fk" FOREIGN KEY ("business_id","garment_id") REFERENCES "public"."garments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "garment_price_events_business_garment_created_idx" ON "garment_price_events" USING btree ("business_id","garment_id","created_at");--> statement-breakpoint
CREATE POLICY "garment_price_events_current_tenant" ON "garment_price_events" AS PERMISSIVE FOR ALL TO public USING ("garment_price_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("garment_price_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));
--> statement-breakpoint
ALTER TABLE "garment_price_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "garment_price_events" TO clare_vogue_runtime;