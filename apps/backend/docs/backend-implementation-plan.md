# Clare Vogue backend implementation plan

## Purpose

Build the NestJS backend as a production-ready foundation for Clare Vogue's
tailoring-business SaaS. The first deployment serves one business and its owner,
while the data model, authorization, and isolation controls remain tenant-safe
for future business growth. This plan covers the backend; it does not reduce
the agreed business workflow to a disposable demo or a narrow MVP.

The plan is based on the product decisions and requirements in
[`../../../docs/requirements.md`](../../../docs/requirements.md),
[`../../../docs/architecture.md`](../../../docs/architecture.md),
[`../../../docs/data-model.md`](../../../docs/data-model.md),
[`../../../docs/workflows.md`](../../../docs/workflows.md), and
[`../../../docs/security-and-privacy.md`](../../../docs/security-and-privacy.md).

## Existing starting point

`apps/backend/` contains a NestJS 12 scaffold with TypeScript, Vitest, and
workspace scripts for build, lint, test, and type checking. The initial
configuration and HTTP foundations are now in place. Authentication,
persistence, and business-domain modules remain to be implemented.

## Current status

The plan has been approved. The initial backend foundation is implemented:
validated environment configuration, versioned API routing, OpenAPI in
non-production environments, request IDs, JSON Nest logging, Helmet, CORS,
global request validation, consistent error responses, and process health
endpoints. Database persistence and business-domain modules are the next
implementation work. Drizzle ORM with drizzle-kit migrations has been selected.
The initial tenant schema and transaction-scoped context layer are implemented;
database verification is pending access to an isolated test database.
Supabase Auth token verification and the global AAL2 guard are implemented;
owner membership is checked at the authorized database transaction boundary.
Tenant-scoped customer CRUD/search/archive/restore, immutable measurement
history, request validation, append-only customer audit events, RLS policies,
tenant-qualified foreign keys, and least-privilege grants are implemented.
Customer and measurement migrations have been generated but not applied;
database/RLS integration testing is pending a dedicated test database.
An atomic one-time initial-owner provisioning command is available for an
already-created, TOTP-protected Supabase account and a dedicated privileged
migration connection. It refuses to modify a non-empty business database and
is not available as an API endpoint.
Order and garment creation/list/detail APIs, derived order summaries,
append-only garment progress history, stage transitions and rework, blockers,
garment cancellation, repeated fitting records, per-garment delivery events
and reversals, payment receipts and allocations, and delivery balance
agreements are implemented. Initial agreed-price confirmation is supported and
audited. Cancellation settlements, actual refund records, and later reasoned
price adjustments are implemented. Corrections to receipt/allocation records
remain pending; migrations are generated but not applied.

## Backend outcomes

- Every protected business operation validates the Supabase Auth session,
  requires verified AAL2, and authorizes the owner's active business
  membership.
- PostgreSQL enforces tenant isolation with row-level security (RLS),
  tenant-qualified constraints, and transaction-local business context. Missing
  context denies access; pooled connections cannot retain context across
  transactions.
- Domain rules are enforced server-side and remain auditable: garment-level
  workflow/history, fitting and rework cycles, partial deliveries and
  corrections, payment allocations, balances, agreements, and cancellation
  settlements.
- Customer measurements, media references, consent, and private notes are
  protected as sensitive data. Media objects are stored outside PostgreSQL in
  managed private S3-compatible storage, accessed through short-lived,
  object-scoped grants.
- The REST API has a versioned OpenAPI contract, validated inputs, consistent
  errors, and explicit authorization boundaries.
- Operational behavior is observable and recoverable without exposing secrets
  or sensitive customer data in logs.

## Delivery sequence

### 1. Backend foundation and decision gates

- Replace starter wiring with a small, modular NestJS structure and a
  `/api/v1` route convention.
- Establish environment-specific configuration validation, secret handling,
  structured redacted logging, correlation IDs, health/readiness endpoints,
  OpenAPI generation, and consistent error responses.
- Use Drizzle ORM with drizzle-kit migrations. Keep application transactions
  explicit so tenant context can be set with PostgreSQL transaction-local
  settings.
- Keep provider-specific object-storage and hosting details behind configuration
  and narrow service interfaces; do not commit credentials or select a
  production provider by implication.

**Exit checks:** clean build, lint, type check, unit-test baseline, invalid
configuration fails at startup, health endpoints work, and the OpenAPI
document is generated.

### 2. Identity, business ownership, and tenant security

- Validate Supabase access tokens server-side, including issuer, signature,
  audience, expiry, and required AAL2 claims; reject missing, expired, or
  insufficient-assurance sessions.
- Resolve the owner and active business membership from trusted identity data;
  never treat a client-supplied business ID as authorization.
- Add PostgreSQL migrations for businesses, users/identity references, and
  business memberships. Restrict initial account provisioning to the intended
  owner; do not expose public tenant signup or staff invitations.
- Add `business_id` to tenant-owned tables, tenant-qualified unique and foreign
  key constraints, and RLS policies with fail-closed behavior.
- Establish business context only inside an explicit database transaction
  after membership authorization. Use a transaction-local mechanism; ensure the
  application database role cannot bypass RLS. Keep schema-migration
  credentials separate from the runtime role.
- Test unauthorized, cross-business, missing-context, and pooled-connection
  access, including both commit and rollback paths.

**Exit checks:** all tenant-scoped database operations pass through the
authorized transaction boundary; security tests prove isolation and context
cleanup.

### 3. Customer and measurement domain

- Implement tenant-scoped customer create, read, update, search, archive, and
  restore workflows; retain audit events for significant changes.
- Store dated measurement sets with cm/in units, the agreed standard dress
  measurements, validated custom fields, and immutable history. Garment
  snapshots and fitting adjustments will be implemented with the garment
  workflow.
- Do not implement permanent personal-data deletion until the policy is
  approved after local legal review; preserve an explicit future reviewed
  deletion workflow without inventing retention periods.

**Exit checks:** customer and measurement history is tenant-isolated, validated,
and protected from accidental overwrite; deletion/correction is auditable.

### 4. Orders, garments, progress, and delivery (implemented; database testing pending)

- Implement orders containing independently managed garments, with each
  garment's price and due date as the source for derived order totals and dates.
- Implement server-validated garment state transitions and append-oriented
  progress events, including customer fitting, alterations, repeat fitting,
  dry cleaning, packaging, blocked/resumed work, cancellation, and rework.
- Derive order summaries from garment states rather than maintaining a second,
  conflicting order lifecycle.
- Implement per-garment delivery events, partial collection/delivery, and
  auditable delivery corrections. Enforce the agreed customer payment
  arrangement when delivery proceeds with a balance due.

Implemented: order and multi-garment creation/list/detail, independent garment
stage/progress records, derived order summaries, blockers/resuming, garment
cancellation, repeat fitting outcomes, per-garment delivery events and
reversals, payment receipts/allocations, and balance/agreement validation
before handover.

**Exit checks:** domain tests cover normal and exceptional transitions; database
transactions keep state changes and history events consistent.

### 5. Payments, adjustments, and cancellation settlements

- Record each received payment once, then allocate it to garments with
  transaction-level validation that allocations cannot exceed the receipt.
- Derive garment/order balances from agreed prices, adjustments, receipts, and
  allocations using exact decimal or integer minor-unit arithmetic, never
  floating point.
- Record discounts and price changes with reason and history.
- Record cancellation reason and customer agreement, plus refund and retained
  amounts bounded by eligible paid/allocated amounts. Record actual refunds as
  separate financial events; do not initiate money transfers.
- Protect corrections from silent destructive edits and keep the financial
  audit trail explainable.

Payment receipt recording, explicit allocations, derived balances, agreement
validation at delivery, cancellation settlement recording, bounded actual
refund events, and reasoned price adjustments are implemented. Mistaken
allocations can be reversed once with a reason; receipts can be voided only
after all their allocations are reversed. Both correction paths retain their
original records and audit history.

**Exit checks:** invariant and concurrency tests cover over-allocation,
duplicate receipt handling, cancellation bounds, balance calculations, and
correction history.

### 6. Media, consent, portfolio, and customer-safe updates

- Store media metadata and object references in PostgreSQL; issue short-lived,
  object-scoped upload/download grants only after business authorization.
- Verify upload completion, size, allowed type, and actual file content before
  making media available. Enforce the agreed 20 MB image and 200 MB video
  limits.
- Implement retryable cleanup/reconciliation for abandoned uploads and failed
  object deletion.
- Record explicit per-item portfolio consent, method, date, and withdrawal.
  Keep private customer sharing separate from public portfolio publication.
- Generate customer-safe copyable updates without exposing internal notes or
  unrelated customer/order data. Do not add automatic reminders or customer
  status links unless those deferred features are separately approved.

**Exit checks:** storage authorization, media validation, consent withdrawal,
and customer-safe response tests pass; no storage secrets reach the frontend.

### 7. Production hardening and release readiness

- Add rate limits and abuse controls for sign-in-adjacent and sensitive
  operations, secure CORS and transport configuration, input validation,
  safe error serialization, and security-event auditing.
- Add metrics and alerts for API latency/errors, database-pool health,
  migration failures, storage failures, and security events without logging
  tokens, full measurements, or media contents.
- Verify database and object-storage encryption, access controls, region,
  backup and recovery capabilities with selected providers.
- Exercise the planning baselines: 30-day backup retention, RPO of 24 hours or
  better, RTO of 8 hours or better, 99.5% monthly availability, and ordinary
  API response time below 500 ms at p95 under the expected small-business
  load. These remain planning targets until providers and tests confirm them.
- Test restore procedures, migration rollback/forward recovery, incident
  response, and the owner-approved, time-limited, audited support-access
  procedure before enabling production content access.
- Verify Supabase MFA recovery and factor-reset behavior before production;
  email alone must never bypass MFA.

**Exit checks:** release gates are green, restore and recovery exercises are
recorded, provider capabilities and costs are reviewed, and unresolved legal
retention decisions are approved before production data is loaded.

## Quality and security test strategy

- **Unit tests:** domain invariants, workflow transitions, balances,
  cancellation settlements, validation, and response shaping.
- **PostgreSQL integration tests:** migrations, constraints, RLS, transaction
  boundaries, concurrency, missing tenant context, and pooled-connection
  isolation after commit and rollback.
- **API tests:** authentication/AAL2, authorization, request validation, error
  contracts, rate limits, and OpenAPI compatibility.
- **Object-storage tests:** scoped grants, private access, content validation,
  upload completion, cleanup retries, and recovery behavior.
- **End-to-end tests:** owner sign-in through customer/order/garment/payment
  workflows and partial delivery.
- Run integration tests against an isolated non-production PostgreSQL and
  S3-compatible service. Do not use production data or production credentials.
  Local development must not depend on Docker.

## Scope boundaries and dependencies

- Backend scope includes all agreed business workflows and production controls,
  not merely a prototype.
- Initial access remains one owner for one business. Tenant-safe foundations
  are required, but public multi-business onboarding and staff accounts are
  deferred.
- Hosting and object-storage vendors are not selected. Prefer managed services
  and a Nigeria region, with a nearby region as fallback.
- Exact customer-data, media, and financial retention durations require local
  legal review before production.
- Frontend implementation is outside this backend plan, except for the API
  contract and end-to-end integration points.

## Implementation gate

The plan is approved and implementation has begun. The PostgreSQL client/ORM
and migration-tool decision is resolved: Drizzle ORM with drizzle-kit.
