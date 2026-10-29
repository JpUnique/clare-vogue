# Clare Vogue delivery roadmap

## Purpose

This roadmap proposes an incremental delivery order for the system described in
the product overview, workflows, requirements, architecture, data model, and
security plan. It is a planning draft; sequencing and scope should be confirmed
before implementation.

## Guiding approach

- Deliver a complete business workflow in small, verifiable increments.
- Validate tenant isolation, media privacy, and data history from the start.
- Keep the backend modular without splitting into microservices prematurely.
- Build responsive core workflows before adding optional automation.
- Use acceptance outcomes from [requirements.md](./requirements.md) to decide
  when each increment is complete.

## Phase 0: Confirm design and implementation choices

**Outcome:** a reviewed technical baseline that is specific enough to scaffold.

- Use copyable customer-safe messages for first-release updates; defer customer
  status links.
- Use owner-only sign-in with required authenticator-app MFA through Supabase
  Auth; require AAL2 in the NestJS API.
- Use explicit garment-level payment allocations; allow delivery with an unpaid
  balance only when the customer agreement is recorded.
- Use the agreed hybrid measurement model: named standard dress fields plus
  validated owner-defined custom fields.
- Use REST with OpenAPI; confirm CI provider and deployment direction. The
  monorepo currently uses npm workspaces.
- Confirm data, media, retention, backup, and recovery expectations.

**Exit criteria:** remaining high-impact decisions are resolved or explicitly
accepted as deferred with a safe default.

## Phase 1: Monorepo foundation

**Outcome:** frontend and backend can be developed and checked independently
inside one repository.

- Create `apps/frontend/` and `apps/backend/`.
- Establish TypeScript, linting, formatting, and test conventions.
- Add shared API contracts or OpenAPI generation.
- Add environment configuration validation and secret-handling guidance.
- Document local setup for PostgreSQL and an S3-compatible object-storage
  service without using production data. MinIO may be used locally for
  compatibility testing.
- Add first CI checks for lint, types, tests, and builds.

**Exit criteria:** a clean checkout can install dependencies and pass the
documented baseline checks.

## Phase 2: Identity, business tenancy, and customer records

**Outcome:** the owner can securely manage customers within the business.

- Implement Supabase Auth integration, mandatory authenticator-app MFA, and
  business membership.
- Implement owner-only authorization for the initial release.
- Implement tenant-aware database access and constraints.
- Implement customer profiles and dated measurement sets.
- Test cross-business access denial.

**Exit criteria:** the owner can manage the business's customers and
measurements; cross-tenant tests demonstrate isolation.

## Phase 3: Orders, garments, and workflow history

**Outcome:** the owner can record an order and resume each garment's work
accurately.

- Implement orders containing multiple garments.
- Record style, instructions, materials, price, and due dates.
- Implement independent garment stages, blockers, cancellations, and
  order-level status summaries derived from garment states.
- Record repeatable fitting/alteration cycles, dry cleaning, packaging,
  next actions, and append-only progress history.
- Build active-work, due-soon, overdue, and blocked dashboard views.

**Exit criteria:** a garment can be blocked and resumed without losing state or
history, including a fitting/alteration cycle.

## Phase 4: Payments and delivery

**Outcome:** the business can record money received and close out delivered work.

- Implement agreed payment and garment-allocation model, including refunds and
  retained amounts for cancellations, and auditable discounts.
- Show reliable order/garment totals and balances.
- Preserve price/payment corrections, cancellations, and refund outcomes.
- Record each garment's ready, payment-check, collection/physical-delivery,
  handover, and correction history separately.
- Require a recorded customer agreement before delivery with a balance due.

**Exit criteria:** representative payment and delivery scenarios calculate and
display the correct balance with an explainable history.

## Phase 5: Media, customer sharing, and portfolio

**Outcome:** media is private by default and can be deliberately shared or
published with consent.

- Implement upload metadata and managed S3-compatible object-storage
  integration.
- Add authorized upload/download flow, file validation, and cleanup behavior.
- Implement copyable customer-safe updates for the owner to send through the
  business's usual messaging channel.
- Add status links and expiry/revocation controls only if approved for a later
  release.
- Implement consent records and explicit portfolio publication/unpublication.

**Exit criteria:** tests verify private access, permitted customer access, and
consent-gated public portfolio access.

## Phase 6: Hardening and production readiness

**Outcome:** the system can be deployed and operated with defined recovery and
security processes.

- Complete role, tenant, media, and public-sharing security tests.
- Configure production secrets, TLS, monitoring, and alerting.
- Define and test PostgreSQL and object-storage recovery procedures.
- Run responsive, accessibility, performance, and end-to-end checks.
- Review data export, correction, deletion, and retention workflows.
- Document release, migration, rollback, and incident response procedures.

**Exit criteria:** security checklist is reviewed; backup restoration and
release procedures are demonstrated; unresolved production risks have owners.

## Later opportunities

Potential follow-on work, not part of the first release unless explicitly
approved:

- Customer accounts and a full portal.
- Messaging or notification integrations.
- Calendar integrations for fittings and delivery.
- Inventory and supplier tracking.
- Advanced reporting and business analytics.
- Payment-provider integration.
- Multiple currencies, languages, and localized tax/accounting behavior.
- Native mobile applications.

## Delivery governance

Before beginning implementation, convert each phase into issues or tasks with
clear acceptance criteria, dependencies, and an owner. Do not commit to
production availability or delivery dates until hosting, operational targets,
and staffing are confirmed.
