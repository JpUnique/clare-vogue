# Clare Vogue system architecture

## 1. Purpose and status

This document proposes a first-release architecture based on the approved
product overview, workflows, and requirements. It is a design proposal, not an
implementation record. Decisions that depend on product, hosting, or budget
choices are marked for confirmation.

## 2. Architecture goals

- Deliver a usable single-business initial release with tenant-safe foundations
  for future multi-business support, without premature microservices.
- Keep business data isolated between tenants.
- Preserve a clear history of garment progress, measurements, price changes,
  and payment events.
- Keep media files in managed, private S3-compatible object storage and business
  records in PostgreSQL.
- Support a responsive web frontend and a well-defined backend API.
- Make local development and automated delivery repeatable.

## 3. Proposed system shape

Use a **modular monolith** for the application backend: one NestJS API deployment
with clear internal modules and a shared PostgreSQL database. The Next.js
frontend is a separate application. Managed S3-compatible object storage holds
private media.

```text
Browser
  └── Next.js frontend
       ├── business application
       ├── customer-facing shared pages
       └── HTTPS requests
            └── NestJS backend
                 ├── identity and business membership
                 ├── customers and measurements
                 ├── orders and garments
                 ├── workflow and progress history
                 ├── payments
                 ├── media and portfolio
                 └── customer sharing
                      ├── PostgreSQL: business records and metadata
                      └── Managed object storage: private photo and video objects
```

The diagram is conceptual; exact deployment topology and network boundaries
will be specified in the deployment plan.

## 4. Monorepo and application boundaries

The planned monorepo uses `apps/frontend/` for the Next.js application and
`apps/backend/` for the NestJS API. Shared API contracts may live under
`packages/api-contracts/`. Documentation remains in `docs/`.

### Frontend responsibilities

- Render responsive business workflows and portfolio pages.
- Collect user input and provide client-side feedback.
- Call backend endpoints and display authorized results.
- Never act as the security boundary for tenant access or permissions.
- Never contain object-storage credentials or other server secrets.

### Backend responsibilities

- Authenticate requests and authorize workspace membership.
- Enforce tenant boundaries on reads, writes, searches, media, and sharing.
- Validate and normalize API inputs.
- Apply business rules and preserve history.
- Coordinate PostgreSQL transactions and object-storage operations.
- Produce explicit failures for invalid requests and infrastructure errors.
- Expose only intentionally scoped customer-facing resources.

### Shared contract responsibilities

- Define or generate request and response types from the API specification.
- Avoid sharing database entities or backend implementation details with the
  frontend.
- Keep contract changes reviewable and checked in CI.

**Proposal:** begin with a versioned REST API described with OpenAPI and
TypeScript types generated or derived for the frontend. Confirm the contract
generation tool during scaffolding.

## 5. Backend module boundaries

Organize the backend by business capability. Modules can share service
interfaces, but should not query each other's tables arbitrarily.

- **Identity and membership:** owner authentication integration, business
  workspaces, and the owner's membership. Staff invitations and roles are later
  scope.
- **Customers and measurements:** customer profiles, dated measurement sets, and
  privacy-sensitive measurement access.
- **Orders and garments:** order intake, garment details, price/date changes,
  and material readiness.
- **Workflow and progress:** garment state, progress events, fittings,
  alterations, block/cancel state, delivery events, and order summaries
  derived from garment states.
- **Payments:** payment receipt records, allocations, adjustments, refund and
  retained cancellation amounts, customer payment arrangements, and balance
  calculation.
- **Media and portfolio:** object-storage lifecycle, metadata, upload/download
  authorization, consent evidence, and publication state.
- **Customer sharing:** customer-safe update content, scoped links if selected,
  expiry/revocation, and share history.
- **Dashboard and search:** tenant-scoped summaries and search views composed
  from the business modules.

Do not introduce a separate microservice for a module in the first release
unless measured scale or a strong operational requirement justifies it.

## 6. Request and data flow

Use REST endpoints documented with OpenAPI for the initial frontend/backend
contract.

### Authenticated business request

1. The frontend sends the user's authentication credential to the API over
   HTTPS using the selected authentication approach.
2. The API resolves the user and the requested business workspace.
3. The API confirms an active membership and the required role/capability.
4. The API scopes all database operations to that business.
5. PostgreSQL reads or writes business records, using a transaction where
   multiple records must remain consistent.
6. The API returns only fields the caller is authorized to see.

The business identifier supplied by a client is a selector, not proof of
authorization.

### Media upload

1. An authenticated user requests permission to upload a file for an authorized
   business record.
2. The API checks the business membership, record association, allowed media
   type (JPEG/PNG/WebP images; MP4/MOV videos), and size limit (20 MB for
   images; 200 MB for videos), validating actual content as well as declared
   type.
3. The API creates a pending media record and provides a short-lived,
   object-scoped upload permission for managed S3-compatible object storage.
4. The browser uploads directly to object storage using the scoped permission;
   the API does not proxy the media bytes.
5. The API verifies upload completion and records final metadata before marking
   the media available.
6. Downloads are authorized by the API and use short-lived, scoped access;
   public bucket access is not used for private business media.

This flow must handle abandoned uploads and failures between object storage and
database commits. The implementation should include a cleanup/reconciliation
strategy rather than reporting a failed upload as complete.

### Customer sharing

1. A business user chooses which update and media can be shared.
2. The API stores a distinct customer-facing update and the share action.
3. If a status link is selected, the API issues a high-entropy token and stores
   only a cryptographic hash of that token, together with scope, expiry, and
   revocation state.
4. A public endpoint resolves the token to a narrowly scoped customer-safe
   representation.
5. The public response excludes measurements, internal notes, unrelated
   records, and non-selected media.

The link behavior is a proposal pending confirmation of customer-sharing
requirements.

## 7. Tenant isolation

Every business-owned database record should carry a non-null `business_id`.
Relationships between tenant-owned records should be validated using
tenant-qualified foreign keys or equivalent database constraints, in addition
to backend authorization.

Recommended defenses:

1. Resolve the active business membership from the authenticated user.
2. Pass a trusted business context into each business-scoped application
   service.
3. Apply tenant filters in every repository query and mutation.
4. Add database constraints preventing cross-business relationships.
5. Add automated tests that attempt cross-tenant reads, writes, search, sharing,
   and media access.

PostgreSQL row-level security (RLS) is required as a second tenant-isolation
layer. After the API verifies the user's active business membership, it must
establish that trusted business context transaction-locally before accessing
tenant-owned rows. RLS policies must deny access when the context is absent;
the application must use a transaction-scoped context mechanism that is reset
automatically on commit or rollback. The runtime database role must not bypass
RLS. RLS supplements, but does not replace, API authorization, tenant-scoped
queries, or tenant-qualified constraints.

## 8. Consistency and history

- Use database transactions for related changes such as updating a garment's
  current state and adding its progress event.
- Treat progress, measurement, payment, and consent history as append-oriented
  records; corrections should be represented explicitly where practical.
- Compute outstanding balances from agreed prices, payment allocations, and
  adjustments using exact decimal representations, not floating-point values.
- Avoid copying large media bytes into PostgreSQL.
- Use a background job only when needed for tasks such as media cleanup,
  notifications, or processing; the initial app should not require a separate
  distributed job platform without a demonstrated need.

## 9. Authentication and authorization

The first release supports one authenticated owner per business workspace; it
does not provide staff or customer accounts. The API must authenticate the
owner and authorize every operation against the owner's active business
membership. **Supabase Auth is selected** as the identity provider, with the
owner's authenticator-app TOTP factor required.

The frontend must complete the password and TOTP flow and keep the owner within
MFA enrollment until a factor has been verified. The NestJS API must validate
the Supabase access token and require the `aal` claim to indicate AAL2 for
every protected business operation. A valid token at AAL1 is not sufficient,
even if the frontend has hidden the application behind an MFA screen.

Use secure HTTP-only, same-site session cookies with CSRF protection as
appropriate for the chosen Next.js/Supabase session integration. Enroll a
second TOTP authenticator on a separate trusted device. If all factors are lost,
require identity-verified provider support; email alone must never remove MFA
or grant business-data access. Verify Supabase factor reset/recovery behavior,
session lifetime and revocation, and rate limits for sign-in and MFA operations
before production. TOTP is the agreed second factor; evaluate
passkeys/security keys separately as a future phishing-resistant option.

Supabase Auth references: [TOTP authenticator MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp) and [session controls](https://supabase.com/docs/guides/auth/sessions).

Customer-facing updates in the first release are prepared as copyable messages
for the owner to send through the business's usual channel. Any future
customer-facing share-link mechanism is separate from business authentication
and must have limited scope and revocation behavior.

## 10. Object storage and media boundaries

- Use managed, private S3-compatible object storage for photos and videos.
- PostgreSQL stores object keys, owner/business relationship, media type, size,
  status, and sharing/consent metadata.
- Buckets remain private; an object key is not itself authorization. Use
  short-lived, object-scoped upload and download permissions.
- Use least-privilege service credentials and separate production and
  non-production storage.
- Set file type, file size, and upload-completion validation in the backend.
- Plan consistent backup and restore coverage for both PostgreSQL records and
  stored media; managed-service availability alone is not a backup.
- Define retention and deletion behavior so object cleanup does not leave
  broken references or publish content unexpectedly.

The provider, region, bucket layout, versioning, encryption-at-rest options,
replication, and recovery guarantees remain deployment decisions. Prefer a
Nigeria region for hosted services, with a nearby region as fallback if needed.

## 11. Observability and failure handling

- Emit structured logs with request/correlation identifiers and useful
  operational context.
- Do not log passwords, auth tokens, full customer measurements, share tokens,
  or media contents.
- Record authorization failures and important business actions at an
  appropriate level without leaking sensitive details to callers.
- Expose health checks that distinguish application health from dependent
  service readiness.
- Make failures visible to users and operators; do not silently replace failed
  storage or database operations with success-shaped responses.
- Define alerting, log retention, and metrics in the deployment plan.

## 12. Testing strategy

- **Unit tests:** business rules for workflow transitions, balances, access
  decisions, and share payload filtering.
- **Integration tests:** PostgreSQL repositories, transaction behavior, tenant
  constraints, RLS policies, API validation, and object-storage interactions.
  Verify transaction-local tenant context is cleared across pooled-connection
  reuse after both commit and rollback, and that absent context denies access.
- **Cross-tenant tests:** verify a user cannot access another business's
  customers, garments, payments, media, or shared data.
- **End-to-end tests:** verify a representative customer-to-delivery journey
  through the frontend and API.
- **Contract tests:** ensure frontend API usage agrees with the published
  contract.
- **Operational tests:** validate database and object-storage recovery before
  production launch.

## 13. Decisions to confirm

1. If added later, what are the customer status link's expiry and revocation
   rules?
2. Which managed object-storage provider, region, and backup/recovery guarantees
   should be used?
3. Whether a future release should add automatic owner reminders beyond the
   dashboard.
