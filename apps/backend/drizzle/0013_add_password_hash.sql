ALTER TABLE "auth_account_profiles" ADD COLUMN "password_hash" varchar(60) NOT NULL DEFAULT 'placeholder_hash_do_not_use';--> statement-breakpoint
ALTER TABLE "auth_account_profiles" ADD CONSTRAINT "auth_account_profiles_password_hash_check" CHECK (length("password_hash") > 0);
