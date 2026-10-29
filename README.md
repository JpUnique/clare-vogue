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

The repository contains initial frontend and backend scaffolds and planning
documents. The business features, database integration, authentication,
object-storage integration, and deployment workflows have not yet been
implemented.

## Runtime

Use Node.js 22.22.3 or newer, as required by the current backend toolchain.
Install workspace dependencies from the repository root with `npm install`.

## Workspace commands

- `npm run dev:frontend` — start the Next.js development server.
- `npm run dev:backend` — start the NestJS API in watch mode.
- `npm run build` — build all workspaces that define a build script.
- `npm run lint` — lint all workspaces that define a lint script.
- `npm run test` — test all workspaces that define a test script.
