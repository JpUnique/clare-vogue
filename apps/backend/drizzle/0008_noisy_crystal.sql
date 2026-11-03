CREATE TYPE "public"."refund_method" AS ENUM('cash', 'bank_transfer', 'card', 'mobile_money', 'other');--> statement-breakpoint
CREATE TABLE "cancellation_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"settlement_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" "refund_method" NOT NULL,
	"reference" varchar(200),
	"note" text,
	"refunded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cancellation_refunds_amount_positive_check" CHECK ("cancellation_refunds"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "cancellation_refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cancellation_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"garment_id" uuid NOT NULL,
	"amount_to_refund" numeric(12, 2) NOT NULL,
	"amount_retained" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"customer_agreement" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cancellation_settlements_refund_nonnegative_check" CHECK ("cancellation_settlements"."amount_to_refund" >= 0),
	CONSTRAINT "cancellation_settlements_retained_nonnegative_check" CHECK ("cancellation_settlements"."amount_retained" >= 0),
	CONSTRAINT "cancellation_settlements_reason_check" CHECK (length(btrim("cancellation_settlements"."reason")) > 0),
	CONSTRAINT "cancellation_settlements_agreement_check" CHECK (length(btrim("cancellation_settlements"."customer_agreement")) > 0)
);
--> statement-breakpoint
ALTER TABLE "cancellation_settlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "cancellation_settlements_business_garment_unique" ON "cancellation_settlements" USING btree ("business_id","garment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cancellation_settlements_business_garment_id_unique" ON "cancellation_settlements" USING btree ("business_id","garment_id","id");--> statement-breakpoint
ALTER TABLE "cancellation_refunds" ADD CONSTRAINT "cancellation_refunds_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_refunds" ADD CONSTRAINT "cancellation_refunds_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_refunds" ADD CONSTRAINT "cancellation_refunds_settlement_fk" FOREIGN KEY ("business_id","garment_id","settlement_id") REFERENCES "public"."cancellation_settlements"("business_id","garment_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_settlements" ADD CONSTRAINT "cancellation_settlements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_settlements" ADD CONSTRAINT "cancellation_settlements_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_settlements" ADD CONSTRAINT "cancellation_settlements_business_garment_fk" FOREIGN KEY ("business_id","garment_id") REFERENCES "public"."garments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cancellation_refunds_business_garment_refunded_idx" ON "cancellation_refunds" USING btree ("business_id","garment_id","refunded_at");--> statement-breakpoint
CREATE POLICY "cancellation_refunds_current_tenant" ON "cancellation_refunds" AS PERMISSIVE FOR ALL TO public USING ("cancellation_refunds"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("cancellation_refunds"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "cancellation_settlements_current_tenant" ON "cancellation_settlements" AS PERMISSIVE FOR ALL TO public USING ("cancellation_settlements"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("cancellation_settlements"."business_id"::text = nullif(current_setting('app.current_business_id', true), ''));
--> statement-breakpoint
ALTER TABLE "cancellation_refunds" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cancellation_settlements" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT USAGE ON TYPE "refund_method" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "cancellation_refunds" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "cancellation_settlements" TO clare_vogue_runtime;