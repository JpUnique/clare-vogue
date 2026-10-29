#!/bin/sh
set -eu

psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=runtime_password="$POSTGRES_RUNTIME_PASSWORD" <<'SQL'
CREATE ROLE clare_vogue_runtime
  LOGIN
  PASSWORD :'runtime_password'
  NOSUPERUSER
  NOBYPASSRLS;
SQL
