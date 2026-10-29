CREATE TYPE "public"."membership_role" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TABLE "business_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"time_zone" varchar(100) DEFAULT 'Africa/Lagos' NOT NULL,
	"currency_code" varchar(3) DEFAULT 'NGN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_memberships_business_user_unique" ON "business_memberships" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE POLICY "business_memberships_authorized_select" ON "business_memberships" AS PERMISSIVE FOR SELECT TO public USING ((
        "business_memberships"."user_id"::text = nullif(current_setting('app.current_user_id', true), '')
        OR "business_memberships"."business_id"::text = nullif(current_setting('app.current_business_id', true), '')
      ));--> statement-breakpoint
CREATE POLICY "businesses_current_tenant" ON "businesses" AS PERMISSIVE FOR ALL TO public USING ("businesses"."id"::text = nullif(current_setting('app.current_business_id', true), '')) WITH CHECK ("businesses"."id"::text = nullif(current_setting('app.current_business_id', true), ''));--> statement-breakpoint
CREATE POLICY "users_self_select" ON "users" AS PERMISSIVE FOR SELECT TO public USING ("users"."id"::text = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "businesses" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "business_memberships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'clare_vogue_runtime'
  ) THEN
    RAISE EXCEPTION 'Provision the clare_vogue_runtime role before applying migrations.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'clare_vogue_runtime'
      AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'clare_vogue_runtime must not have SUPERUSER or BYPASSRLS.';
  END IF;
END;
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT ON TABLE "users" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT, UPDATE ON TABLE "businesses" TO clare_vogue_runtime;
--> statement-breakpoint
GRANT SELECT ON TABLE "business_memberships" TO clare_vogue_runtime;