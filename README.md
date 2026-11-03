# Clare Vogue

Clare Vogue is a planned multi-business tracking system for fashion designers
and tailoring businesses. It is intended to help manage customers, measurements,
orders, garment progress, payments, media, and delivery.

## Project structure

```text
apps/
  frontend/       Next.js, React, TypeScript, and Tailwind CSS
  backend/        NestJS API
packages/
  api-contracts/  Shared API contract package
docs/             Product and technical design documents
```

The backend is planned as a modular monolith. PostgreSQL stores business
records; managed, private S3-compatible object storage is planned for photos
and videos.

## Documentation

- [Product overview](./docs/product-overview.md)
- [Workflows](./docs/workflows.md)
- [Requirements](./docs/requirements.md)
- [Architecture](./docs/architecture.md)
- [Data model](./docs/data-model.md)
- [Security and privacy](./docs/security-and-privacy.md)
- [Deployment and CI/CD](./docs/deployment-and-ci-cd.md)
- [Delivery roadmap](./docs/roadmap.md)

## Status

The repository includes initial frontend and backend implementations for
customer, order, garment, and payment workflows, with PostgreSQL migrations and
Supabase authentication. Private media storage and portfolio-consent history
are implemented in the backend; customer-facing portfolio publishing and
production deployment workflows remain planned.

## Runtime

Use Node.js 22.22.3 or newer, as required by the current backend toolchain.
Install workspace dependencies from the repository root with `npm install`.

## Workspace commands

- `npm run dev:frontend` — start the Next.js development server.
- `npm run dev:backend` — start the NestJS API in watch mode.
- `npm run build` — build all workspaces that define a build script.
- `npm run lint` — lint all workspaces that define a lint script.
- `npm run test` — test all workspaces that define a test script.

## Run with Docker Compose

Docker Compose builds and starts the frontend, backend, local PostgreSQL, and a
private MinIO bucket for S3-compatible media storage. The database is
initialized with a restricted runtime role, and the backend migrations run
before the API starts.

```sh
docker compose up --build
```

Open the frontend at <http://localhost:3001> and the backend API docs at
<http://localhost:3000/api/docs>. PostgreSQL is available to the other Compose
services on the internal network. Connect to it from the host with:

```sh
docker compose exec db psql -U clare_vogue_migration -d clare_vogue
```

MinIO's API is available at <http://localhost:9000> and its local console at
<http://localhost:9001>. Data is retained in the `postgres-data` and
`minio-data` volumes between runs. Stop the services with
`docker compose down`; add `--volumes` only when intentionally removing local
database and media data.

The Compose defaults are for local development only. Set
`POSTGRES_PASSWORD`, `POSTGRES_RUNTIME_PASSWORD`, `MINIO_ROOT_USER`,
`MINIO_ROOT_PASSWORD`, `MINIO_APP_USER`, and `MINIO_APP_PASSWORD` in the shell
or the root `.env` file to override the defaults. MinIO creates a private
application bucket and a bucket-scoped storage user. The backend starts without
Supabase credentials, but authenticated routes require a configured Supabase
project. Do not use development defaults in production.
