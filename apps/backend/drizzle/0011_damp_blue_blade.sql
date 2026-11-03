CREATE TABLE "auth_account_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(32) NOT NULL,
	"email" varchar(320) NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_account_profiles_username_check" CHECK ("auth_account_profiles"."username" ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
	CONSTRAINT "auth_account_profiles_email_check" CHECK (length(btrim("auth_account_profiles"."email")) > 0),
	CONSTRAINT "auth_account_profiles_name_check" CHECK (length(btrim("auth_account_profiles"."full_name")) > 0),
	CONSTRAINT "auth_account_profiles_phone_check" CHECK ("auth_account_profiles"."phone" ~ '^\+[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
ALTER TABLE "auth_account_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_account_profiles_username_unique" ON "auth_account_profiles" USING btree ("username");--> statement-breakpoint
CREATE POLICY "auth_account_profiles_self_select" ON "auth_account_profiles" AS PERMISSIVE FOR SELECT TO public USING ("auth_account_profiles"."user_id"::text = nullif(current_setting('app.current_user_id', true), ''));
--> statement-breakpoint
ALTER TABLE "auth_account_profiles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE FUNCTION public.resolve_auth_account_email(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT email
  FROM public.auth_account_profiles
  WHERE username = lower(btrim(p_username))
  LIMIT 1
$$;
--> statement-breakpoint
CREATE FUNCTION public.register_auth_account_profile(
  p_user_id uuid,
  p_username text,
  p_email text,
  p_full_name text,
  p_phone text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  INSERT INTO public.auth_account_profiles (
    user_id,
    username,
    email,
    full_name,
    phone
  )
  VALUES (
    p_user_id,
    lower(btrim(p_username)),
    btrim(p_email),
    btrim(p_full_name),
    btrim(p_phone)
  )
  ON CONFLICT (user_id) DO NOTHING
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.resolve_auth_account_email(text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.register_auth_account_profile(uuid, text, text, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.resolve_auth_account_email(text) TO clare_vogue_runtime;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.register_auth_account_profile(uuid, text, text, text, text) TO clare_vogue_runtime;