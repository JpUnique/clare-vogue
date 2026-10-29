# Clare Vogue deployment and CI/CD plan

## 1. Purpose and status

This document proposes how the Clare Vogue monorepo can be developed, tested,
and deployed. Exact hosting providers, production topology, and release
approvals remain open decisions.

**Current direction:** Prefer mostly managed hosting and database services to
reduce operational work. Managed, private S3-compatible object storage is
selected. Prefer a Nigeria region for hosted services, using a nearby region if
no suitable managed option is available; provider and deployment details remain
open.

## 2. Deployment units

Proposed application units:

- **Frontend:** Next.js web application.
- **Backend:** NestJS API application.
- **Database:** PostgreSQL.
- **Object storage:** Managed, private S3-compatible storage for photos and
  videos.

The frontend and backend can be built and deployed separately. PostgreSQL and
object storage require explicit security, backup, and recovery planning. Do not
treat an application container image or a managed-service availability promise
as a backup of business data.

## 3. Environments

### Local development

- Provide documented configuration for the frontend, backend, PostgreSQL, and
  object storage. MinIO may be used as a local S3-compatible development
  service, but is not the selected production storage.
- Keep development data and credentials separate from shared or production
  environments.
- Include non-production sample data only; never copy real customer measurements
  or media into test fixtures.
- Document setup, migrations, test commands, and storage cleanup.

### Continuous integration

- Run on pull requests and relevant branch updates.
- Use isolated, disposable test configuration and synthetic data.
- Do not connect CI jobs to production databases, buckets, or secrets.
- Keep jobs scoped to affected apps where practical while preserving shared
  contract checks.

### Staging

- Mirror production configuration and security boundaries as closely as
  practical.
- Use synthetic or explicitly approved test data.
- Verify database migrations, media upload/download, customer sharing, and
  restore procedures before production release.

### Production

- Use separate credentials, storage, databases, and access controls.
- Require approved deployment workflow and documented rollback/recovery
  procedures.
- Restrict production access to authorized operators.
- Do not use local development services or default credentials in production.

## 4. CI pipeline

Proposed pull-request checks:

1. Install dependencies from the lockfile using the selected package manager.
2. Validate formatting and lint rules.
3. Run TypeScript type checks for frontend, backend, and shared contracts.
4. Run unit tests for changed areas and shared business rules.
5. Run backend integration tests against isolated PostgreSQL and S3-compatible
   object-storage test services when required by the tests.
6. Run API contract generation/validation and ensure generated artifacts are
   current.
7. Build frontend and backend production artifacts.
8. Check dependency/security advisories and container image configuration using
   selected tooling.
9. Publish test and build results as required branch checks.

Exact tool choices and whether CI uses managed services or temporary service
containers should be selected with the CI provider.

## 5. Release pipeline

Proposed release flow:

1. Merge a reviewed change after required checks pass.
2. Build immutable, versioned frontend and backend artifacts.
3. Publish artifacts to the chosen registry or deployment service.
4. Deploy to staging and run smoke checks.
5. Approve production promotion.
6. Apply reviewed database migrations using a controlled release step.
7. Deploy frontend and backend in a compatibility-safe order.
8. Verify health, key workflows, and logs after release.
9. Roll back application artifacts or use a documented forward-fix process if a
   database migration cannot safely be reversed.

Database migrations should follow expand-and-contract practices when a change
must remain compatible with old and new application versions during rollout.

## 6. Database migrations

- Store migrations in version control alongside the backend.
- Review destructive or data-transforming changes separately.
- Test migrations against representative synthetic data in CI/staging.
- Take and verify backups before production migrations when the change warrants
  it.
- Prefer reversible schema changes, while recognizing data migrations are not
  always safely reversible.
- Define an explicit owner and recovery plan for failed migrations.
- Never run production migrations as an incidental side effect of a developer
  command.

## 7. PostgreSQL operations

The selected provider or operations approach must cover:

- Network access restricted to application and authorized administrative
  sources.
- Authentication and secret rotation.
- TLS connections in deployed environments.
- Automated backups and retention.
- Point-in-time recovery capability if available and required.
- Capacity, connection limits, monitoring, and maintenance.
- Tested restore procedures and access-control review.

## 8. Object-storage operations

Managed, private S3-compatible object storage is selected for production.
Provider and deployment details remain to be chosen. The service and operating
plan must cover:

- Private buckets and least-privilege application access.
- Separate environments and non-production buckets.
- TLS and network access restrictions.
- Capacity monitoring and upload limits.
- Object versioning or recovery behavior where required.
- Provider-supported backup/replication and recovery testing.
- Object deletion, abandoned-upload cleanup, and retention.
- Consistency between database metadata and object-store contents.

PostgreSQL backups alone are not sufficient to recover uploaded media; confirm
object versioning, deletion recovery, and independent backup options with the
selected provider.

## 9. Docker and image policy

- Build separate frontend and backend images using supported base images.
- Use multi-stage builds where practical to limit runtime image contents.
- Run application processes as non-root where supported.
- Exclude development files, local credentials, and real customer data from
  images.
- Pin base image versions and update them through reviewed changes.
- Scan images and dependencies in CI.
- Keep stateful PostgreSQL and object data on managed/persistent storage, not
  ephemeral application container filesystems.

## 10. Monitoring and operations

Before production, define:

- Application and dependency health checks.
- Structured application logs and retention.
- Metrics for API latency, error rate, database connections, storage use, and
  upload failures.
- Alerts and an owner for each actionable alert.
- Deployment history and rollback procedure.
- Incident response and customer communication responsibility.
- Capacity review cadence and cost monitoring.

Avoid logging access tokens, raw customer measurements, share-link tokens,
payment credentials, or media contents.

## 11. Proposed repo-level layout

```text
clare-vogue/
├── apps/
│   ├── frontend/
│   └── backend/
├── packages/
│   └── api-contracts/
├── docs/
├── infra/
│   └── local/
├── .github/
│   └── workflows/
├── package.json
├── package-lock.json
└── README.md
```

The implementation currently uses npm workspaces. Workflow files and
infrastructure configuration should be added after the CI provider and
deployment target are selected.

## 12. Open decisions

1. Which CI/CD provider and repository hosting will be used?
2. Where will frontend and backend production deployments run?
3. Which managed object-storage provider and recovery guarantees should be used,
   with Nigeria preferred and a nearby region as fallback?
4. Which provider mechanisms can meet the selected planning baselines: 30-day
   backup retention, RPO 24 hours or better, and RTO 8 hours or better?
5. Which stages require manual production approval?
6. Which image registry and dependency/security scanning tools will be used?
7. What monitoring, alerting, and incident response service is available?
