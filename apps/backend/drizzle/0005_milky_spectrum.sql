CREATE TYPE "public"."delivery_event_type" AS ENUM('delivered', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."delivery_method" AS ENUM('customer_collection', 'physical_delivery');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'card', 'mobile_money', 'other');--> statement-breakpoint
ALTER TYPE "public"."garment_progress_event_type" ADD VALUE 'delivery_recorded';--> statement-breakpoint
ALTER TYPE "public"."garment_progress_event_type" ADD VALUE 'delivery_reversed';--> statement-breakpoint
CREATE TABLE "delivery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"event_type" "delivery_event_type" NOT NULL,
	"method" "delivery_method",
	"recipient_name" varchar(200),
	"notes" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"balance_at_delivery" numeric(12, 2),
	"agreement_terms" text,
	"agreed_follow_up_at" timestamp with time zone,
	"reverses_delivery_event_id" uuid,
	"correction_reason" text,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_events_payload_check" CHECK ((
        "delivery_events"."event_type" = 'delivered'
        and "delivery_events"."method" is not null
        and "delivery_events"."reverses_delivery_event_id" is null
        and "delivery_events"."correction_reason" is null
        and "delivery_events"."balance_at_delivery" is not null
        and (
          "delivery_events"."balance_at_delivery" <= 0
          or (
            "delivery_events"."agreement_terms" is not null
            and length(btrim("delivery_events"."agreement_terms")) > 0
          )
        )
      ) or (
        "delivery_events"."event_type" = 'reversed'
        and "delivery_events"."method" is null
        and "delivery_events"."reverses_delivery_event_id" is not null
        and "delivery_events"."correction_reason" is not null
        and length(btrim("delivery_events"."correction_reason")) > 0
      ))
);
--> statement-breakpoint
ALTER TABLE "delivery_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"allocated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_allocations_amount_positive_check" CHECK ("payment_allocations"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "payment_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" varchar(200),
	"note" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive_check" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_business_garment_fk" FOREIGN KEY ("business_id","garment_id") REFERENCES "public"."garments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_reversal_target_fk" FOREIGN KEY ("business_id","garment_id","reverses_delivery_event_id") REFERENCES "public"."delivery_events"("business_id","garment_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_allocated_by_users_id_fk" FOREIGN KEY ("allocated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_business_payment_fk" FOREIGN KEY ("business_id","order_id","payment_id") REFERENCES "public"."payments"("business_id","order_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_business_garment_fk" FOREIGN KEY ("business_id","order_id","garment_id") REFERENCES "public"."garments"("business_id","order_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_order_fk" FOREIGN KEY ("business_id","order_id") REFERENCES "public"."orders"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_events_business_garment_id_unique" ON "delivery_events" USING btree ("business_id","garment_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_events_single_reversal_unique" ON "delivery_events" USING btree ("business_id","garment_id","reverses_delivery_event_id") WHERE "delivery_events"."reverses_delivery_event_id" is not null;--> statement-breakpoint
CREATE INDEX "delivery_events_business_garment_created_idx" ON "delivery_events" USING btree ("business_id","garment_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_allocations_business_garment_idx" ON "payment_allocations" USING btree ("business_id","garment_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_allocations_business_payment_idx" ON "payment_allocations" USING btree ("business_id","payment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_business_id_id_unique" ON "payments" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_business_order_id_unique" ON "payments" USING btree ("business_id","order_id","id");--> statement-breakpoint
CREATE INDEX "payments_business_order_received_idx" ON "payments" USING btree ("business_id","order_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "garments_business_order_id_unique" ON "garments" USING btree ("business_id","order_id","id");--> statement-breakpoint
CREATE POLICY "delivery_events_current_tenant" ON "delivery_events" AS PERMISSIVE FOR ALL TO public USING ("delivery_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("delivery_events"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "payment_allocations_current_tenant" ON "payment_allocations" AS PERMISSIVE FOR ALL TO public USING ("payment_allocations"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("payment_allocations"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "payments_current_tenant" ON "payments" AS PERMISSIVE FOR ALL TO public USING ("payments"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("payments"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));
--> statement-breakpoint
ALTER TABLE "delivery_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "payment_allocations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT USAGE ON TYPE "delivery_event_type", "delivery_method", "payment_method" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "delivery_events" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "payment_allocations" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "payments" TO clare_vogue_runtime;