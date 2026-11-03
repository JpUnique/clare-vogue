CREATE TABLE "payment_allocation_reversals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_allocation_reversals_reason_check" CHECK (length(btrim("payment_allocation_reversals"."reason")) > 0)
);
--> statement-breakpoint
ALTER TABLE "payment_allocation_reversals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_voids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_voids_reason_check" CHECK (length(btrim("payment_voids"."reason")) > 0)
);
--> statement-breakpoint
ALTER TABLE "payment_voids" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_allocation_reversals_once_unique" ON "payment_allocation_reversals" USING btree ("business_id","allocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_voids_once_unique" ON "payment_voids" USING btree ("business_id","payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_allocations_business_id_id_unique" ON "payment_allocations" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_allocations_reversal_target_unique" ON "payment_allocations" USING btree ("business_id","order_id","payment_id","garment_id","id");--> statement-breakpoint
ALTER TABLE "payment_allocation_reversals" ADD CONSTRAINT "payment_allocation_reversals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocation_reversals" ADD CONSTRAINT "payment_allocation_reversals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocation_reversals" ADD CONSTRAINT "payment_allocation_reversals_target_fk" FOREIGN KEY ("business_id","order_id","payment_id","garment_id","allocation_id") REFERENCES "public"."payment_allocations"("business_id","order_id","payment_id","garment_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_voids" ADD CONSTRAINT "payment_voids_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_voids" ADD CONSTRAINT "payment_voids_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_voids" ADD CONSTRAINT "payment_voids_payment_fk" FOREIGN KEY ("business_id","order_id","payment_id") REFERENCES "public"."payments"("business_id","order_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_allocation_reversals_payment_idx" ON "payment_allocation_reversals" USING btree ("business_id","payment_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_allocation_reversals_garment_idx" ON "payment_allocation_reversals" USING btree ("business_id","garment_id","created_at");--> statement-breakpoint
CREATE POLICY "payment_allocation_reversals_current_tenant" ON "payment_allocation_reversals" AS PERMISSIVE FOR ALL TO public USING ("payment_allocation_reversals"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("payment_allocation_reversals"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "payment_voids_current_tenant" ON "payment_voids" AS PERMISSIVE FOR ALL TO public USING ("payment_voids"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("payment_voids"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));
--> statement-breakpoint
ALTER TABLE "payment_allocation_reversals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "payment_voids" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "payment_allocation_reversals" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "payment_voids" TO clare_vogue_runtime;