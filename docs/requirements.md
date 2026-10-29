# Clare Vogue requirements

## 1. Purpose

This document turns the product direction and workflows in
[product-overview.md](./product-overview.md) and [workflows.md](./workflows.md)
into an initial set of requirements. It is a planning draft, not a final
acceptance contract. Items marked as decisions or proposed targets need review
before implementation.

## 2. Scope

### Initial release

The initial release is for one tailoring business and its owner, who is the only
signed-in user. It lets the owner manage customers, orders, garments,
measurements, work progress, payments, media, and delivery. Keep tenant-safe
foundations for possible future expansion to multiple businesses, but do not
include multi-business onboarding or staff accounts in the initial release.
Customers receive information shared by the business without requiring
customer accounts. Workflow tracking must cover the normal garment lifecycle
and common exceptions—blocked work, repeated fittings, rework, partial
delivery, payment agreements, cancellations, and financial corrections—without
erasing history.

### Not included unless later approved

- Customer sign-in or a full customer portal.
- Online card payment processing or storage of card data.
- Inventory management, supplier purchasing, or accounting integrations.
- Automated design generation or garment pattern tools.
- Native mobile applications.
- Multiple currencies or jurisdiction-specific tax/accounting features.

These exclusions are provisional scope boundaries and can be revisited.

## 3. Actors

- **Business owner:** the sole signed-in business user in the initial release;
  manages customers, orders, garments, payments, sharing, and portfolio.
- **Staff member (later):** may carry out permitted customer and garment work
  after staff accounts are added in a later release.
- **Customer:** receives updates or links deliberately shared by the business.
- **Prospective customer:** views items deliberately published in a business
  portfolio.
- **Platform operator:** supports the hosted service without accessing
  business content by default. Exceptional content access requires the owner's
  approval, a time-limited session, and an audit record.
 
Detailed role permissions and the production support-access procedure remain to
be designed.

## 4. Functional requirements

Priority labels: **MVP** means required for the first usable release;
**Later** means valuable but not required for that release.

### 4.1 Business accounts and access

- **FR-001 (MVP):** The business owner must be able to establish and access the
  business workspace.
- **FR-002 (MVP):** The system must associate each business-owned record with
  exactly one business workspace.
- **FR-003 (MVP):** Only the authenticated owner must be able to access the
  business workspace and its records.
- **FR-004 (MVP):** Owner sign-in must require a password and a valid
  authenticator-app MFA code. The backend must reject protected requests unless
  the verified Supabase session has reached AAL2.
- **FR-005 (MVP):** The owner must be able to recover access using one-time
  recovery through a separately enrolled trusted authenticator, or through
  identity-verified provider support if all authenticators are lost. Email
  alone must not remove MFA or grant access to business data.
- **FR-006 (Later):** The system may support staff accounts, invitations, and
  more detailed role templates and permissions.

### 4.2 Customers and measurements

- **FR-007 (MVP):** An authorized user must be able to create, view, update, and
  search customer records within their business.
- **FR-008 (MVP):** A customer record must support useful contact details and
  internal notes without requiring every optional field.
- **FR-073 (MVP):** The owner must be able to archive an inactive customer so
  the record is hidden from active customer lists while its order and payment
  history remains available to the business, subject to the approved retention
  policy.
- **FR-074 (MVP):** The system must support a reviewed personal-data deletion
  workflow when appropriate. It must preserve or anonymize financial records
  that must be retained under applicable business or legal requirements, and
  record what was deleted, retained, or anonymized.
- **FR-009 (MVP):** An authorized user must be able to record dated measurement
  sets for a customer from a standard ladies'-dress template (bust, waist,
  hips, shoulder width, shoulder-to-waist, sleeve length, armhole, and desired
  dress length) and add custom measurement fields.
- **FR-069 (MVP):** Each measurement set must use one selected unit system:
  centimetres or inches.
- **FR-010 (MVP):** Earlier measurement sets must remain available when a new
  set is recorded.
- **FR-011 (MVP):** A garment must be associated with the measurement set or
  measurement snapshot used to make it.
- **FR-012 (MVP):** A user must be able to record garment-specific fitting
  adjustments separately from a customer's general measurements.
- **FR-013 (MVP):** The system must prevent users from one business from
  searching or retrieving another business's customer or measurement data.
  Each business maintains its own customer record, even when the same person
  works with multiple businesses.

### 4.3 Orders and garments

- **FR-014 (MVP):** An authorized user must be able to create and update an
  order for a customer.
- **FR-015 (MVP):** An order must be able to contain one or more garments.
- **FR-016 (MVP):** Each garment must support a description or style,
  instructions, material arrangement, its own agreed or estimated price, and
  target completion date. The order total and overall target date must summarize
  its garments rather than duplicate independently editable values.
- **FR-017 (MVP):** A user must be able to record whether material is
  customer-provided, business-sourced, or not yet confirmed.
- **FR-018 (MVP):** A user must be able to record material receipt/readiness and
  relevant notes.
- **FR-019 (MVP):** A garment must be markable as blocked with a recorded
  reason, or cancelled with a recorded reason, without erasing its history.
- **FR-020 (MVP):** Order and garment details must remain available after
  delivery or cancellation, subject to the retention policy.
- **FR-021 (MVP):** A user must be able to record price or deadline changes
  without silently erasing the earlier value or change history.

### 4.4 Progress, fittings, and delivery

- **FR-022 (MVP):** A garment must have a clearly visible current stage and
  next action or blocking reason.
- **FR-059 (MVP):** Each garment must have its own workflow state, progress
  history, payment balance, and delivery history. Updating one garment must not
  overwrite another garment's state.
- **FR-060 (MVP):** The order view must summarize the states of its garments,
  including mixed progress and partial delivery; order completion must be
  derived from its garments rather than maintained as a conflicting duplicate
  workflow.
- **FR-023 (MVP):** A user must be able to record a progress event with its
  timestamp, author, stage or work completed, notes, and optional media.
- **FR-024 (MVP):** Progress events must be retained as history and must not be
  overwritten when the current stage changes.
- **FR-025 (MVP):** A user must be able to resume work using the latest stage,
  next action, instructions, fitting notes, due date, and relevant payment
  summary.
- **FR-026 (MVP):** A user must be able to record fitting results and
  alterations as dated history.
- **FR-061 (MVP):** The standard completion path for every garment must include
  a customer fitting, dry cleaning, and packaging. A fitting that requires
  changes must return the garment to alterations and another fitting before
  finishing continues.
- **FR-027 (MVP):** A user must be able to move a garment to a prior or repeated
  work stage when the workflow requires rework, subject to an auditable event
  history.
- **FR-028 (MVP):** A user must be able to record that a garment is ready for
  delivery, check its payment state, notify the customer for collection or
  arrange physical delivery, and record a garment-specific delivery event.
- **FR-029 (MVP):** The system must preserve the distinction between garments
  that are in progress, blocked, ready for delivery, delivered, or cancelled.
- **FR-062 (MVP):** A garment may be blocked without losing its current stage;
  the owner must record a blocking reason, and clearing the block must resume
  work from the retained stage.
- **FR-063 (MVP):** A garment may be cancelled independently of its order and
  sibling garments. Cancellation requires a reason and preserves progress and
  financial history.
- **FR-064 (MVP):** A ready garment may return to active work for defect
  correction or rework, with the transition recorded in history.
- **FR-065 (MVP):** A garment may be delivered with a balance due only when a
  payment arrangement agreed with the customer is recorded, including the
  outstanding amount and agreed terms; the balance remains visible afterward.
- **FR-066 (MVP):** Delivery events must be tracked separately for each garment,
  so garments in one order can be handed over at different times.
- **FR-067 (MVP):** The owner must be able to reverse or correct an erroneous
  delivery record by appending an auditable correction; the original event
  must remain in history.

### 4.5 Payments

- **FR-030 (MVP):** An authorized user must be able to record the agreed price
  and each payment received.
- **FR-031 (MVP):** A payment record must include an amount and date, and may
  include method, reference, and notes.
- **FR-032 (MVP):** The system must show the agreed amount, recorded payments,
  and outstanding balance for the selected order or garment.
- **FR-033 (MVP):** A correction, refund, or price adjustment must preserve
  enough history to explain the resulting balance.
- **FR-034 (MVP):** Payment records must be private to authorized users of the
  relevant business.
- **FR-035 (MVP):** The system must not collect or store card security codes or
  full card numbers.
- **FR-036 (MVP):** A payment must be recorded once and allocated to one or
  more garments; the sum of its allocations must not exceed the payment amount.
  Any unallocated amount must be shown explicitly, and balances must not
  double-count a payment at both garment and order level.
- **FR-037 (MVP):** Each business must use one configured currency for garment
  prices, payments, and balances. Configure the initial Clare Vogue business
  for Nigerian naira (NGN); each later business chooses one currency. Multiple
  currencies within one business are out of scope for the first release.
- **FR-072 (MVP):** The initial release must use English and Africa/Lagos as the
  initial business's default time zone; store timestamps consistently and
  display business dates/times in that configured time zone.
- **FR-071 (MVP):** The owner must be able to apply a discount to a garment as
  an auditable price adjustment with an amount and reason; the adjusted price
  and resulting balance must be clear.
- **FR-068 (MVP):** When a customer cancels after paying, the owner must be able
  to record the agreed refund and retained amounts case by case, with a
  cancellation reason and the customer's agreement recorded. Refund plus
  retained amounts must not exceed money already paid and allocated to the
  cancelled garment; do not create a cancellation debt for additional amounts.
  Record an actual refund as a separate dated financial event. The app records
  the outcome; it does not initiate a bank or card refund.

### 4.6 Media and portfolio

- **FR-038 (MVP):** An authorized user must be able to upload photo and video
  files associated with a garment or its progress update. Portfolio items
  reference selected media rather than creating duplicate files.
- **FR-039 (MVP):** The system must store media objects in managed, private
  S3-compatible object storage and keep associated metadata and object
  references in PostgreSQL.
- **FR-040 (MVP):** Uploaded media must be private to the business unless a
  user deliberately shares it.
- **FR-041 (MVP):** The system must validate permitted file types and size
  limits before accepting media. Initial per-file limits are 20 MB for images
  and 200 MB for videos. Allow JPEG, PNG, and WebP images, plus MP4 and MOV
  videos, with backend content-type and file-signature validation.
- **FR-042 (MVP):** Portfolio publication must be a deliberate action separate
  from upload or customer sharing.
- **FR-043 (MVP):** The system must record the required customer permission
  before publishing identifiable customer work. Consent must be explicit and
  specific to each selected photo or work item, with the consent date and how
  it was given recorded (verbal, written, or electronic), plus an optional
  note or evidence reference.
- **FR-044 (MVP):** A business user must be able to unpublish portfolio media.
- **FR-070 (MVP):** The owner must be able to record withdrawal of portfolio
  consent; the associated item must be unpublished and public access removed.
  Customer sharing permission is separate from public portfolio consent.
- **FR-045 (Later):** The system may support media processing such as
  thumbnails, compression, or transcoding.

### 4.7 Customer sharing

- **FR-046 (MVP):** A business user must be able to create or send a
  customer-facing progress update that is distinct from internal notes.
- **FR-047 (MVP):** A customer-facing update must only contain information
  selected or approved for sharing.
- **FR-048 (MVP):** A customer-facing view must not expose measurements,
  internal notes, unrelated orders, or private media.
- **FR-049 (MVP):** The business must be able to see what update was shared and
  when.
- **FR-050 (MVP):** The owner must be able to prepare and copy a customer-safe
  progress message for sending through the business's usual messaging channel.
- **FR-051 (Later):** Controlled customer status links may be considered later;
  before implementation, define expiry, revocation, and exactly which customer
  information they expose.
- **FR-052 (Later):** Customer accounts and in-app replies may be considered for
  a later release.

### 4.8 Dashboard and search

- **FR-053 (MVP):** The business dashboard must show active garments and their
  current stage.
- **FR-054 (MVP):** The dashboard must identify garments due within the next
  7 days and overdue garments using their recorded target dates; due work is
  sorted soonest first.
- **FR-055 (MVP):** The dashboard must identify blocked garments,
  including the recorded reason.
- **FR-056 (MVP):** The dashboard must identify orders or garments with an
  outstanding balance.
- **FR-057 (MVP):** An authorized user must be able to find customers and
  orders by practical search criteria.
- **FR-058 (MVP):** Show garments due within the next 7 days and sort due work
  by soonest due date first.

## 5. Non-functional requirements

The numerical targets below are **proposed planning targets**, not approved
service-level commitments. They must be reviewed against expected usage,
hosting, and budget.

### 5.1 Security and privacy

- **NFR-001 (Required):** Enforce business-level tenant authorization on every
  API operation that reads or changes business-owned data, and enforce
  PostgreSQL row-level security (RLS) on tenant-owned records. After verifying
  membership, establish trusted business context transaction-locally for each
  database transaction; RLS policies must deny access when that context is
  absent.
- **NFR-002 (Required):** Do not rely on client-side filtering as a security
  boundary.
- **NFR-003 (Required):** Keep object-storage objects private by default; use
  short-lived, object-scoped access when an authorized user needs an upload or
  download.
- **NFR-004 (Required):** Validate authentication, authorization, and input at
  the backend boundary.
- **NFR-005 (Required):** Protect credentials and secrets using environment- or
  platform-managed secret mechanisms; do not commit secrets to source control.
- **NFR-006 (Required):** Record security-relevant events, including account
  access changes, portfolio publication, and sharing-link creation/revocation,
  and exceptional support access, without logging passwords, access tokens, or
  sensitive measurement values. Support-access records must capture the owner
  approval, support actor, reason, scope, and session duration.
- **NFR-007 (Required):** Define retention, export, correction, and deletion
  processes for customer data and media before production launch. Exact
  retention periods must be set after local legal review, not guessed during
  schema design.
- **NFR-008 (Required):** Use encrypted connections in deployed environments.
- **NFR-009 (Required):** Require authenticator-app MFA for the owner and
  protect sign-in, MFA enrollment, and recovery with rate limits, secure
  sessions, and session revocation. Recovery must not silently bypass MFA.

### 5.2 Reliability and recovery

- **NFR-010 (Planning target):** Target at least 99.5% monthly availability
  for the production application, excluding announced maintenance and external
  provider outages. This is not a service-level guarantee; confirm provider
  capability and cost before production.
- **NFR-011 (Required):** Define and test PostgreSQL and object-storage backup
  and recovery procedures before production launch. Plan to retain recoverable
  backups for 30 days, subject to provider capability and cost review.
- **NFR-012 (Planning target):** Plan for a recovery point objective (RPO) of
  24 hours or better and a recovery time objective (RTO) of 8 hours or better.
  This is a planning baseline, not a production service-level commitment;
  confirm provider capability, cost, and tested procedures before launch.
- **NFR-013 (Required):** A failed upload or database operation must report an
  actionable failure and must not appear successful to the user.
- **NFR-014 (Required):** Order, progress, and payment changes must remain
  consistent when concurrent edits occur; conflict behavior will be specified
  in the API and data design.

### 5.3 Performance and scale

- **NFR-015 (Planning target):** For ordinary dashboard, customer, and order
  requests under expected small-business launch load, target a 95th-percentile
  server response time below 500 ms, excluding media transfer and external
  services. Validate this target through testing before production.
- **NFR-016 (Required):** Media transfer must not require storing large file
  contents in PostgreSQL.
- **NFR-017 (Required):** Support growth in businesses and their records without
  allowing one tenant's workload to expose or corrupt another tenant's data.
- **NFR-018 (Decision):** Initial garment and media volumes are not yet known.
  Start with a modest single-business deployment, then measure usage and review
  expected garment/media volumes before production sizing and performance
  targets are finalized. Keep tenant-safe foundations for future growth; the
  initial release supports one business owner only.

### 5.4 Usability and accessibility

- **NFR-019 (Required):** Support responsive use on common phone, tablet, and
  desktop viewport sizes.
- **NFR-020 (Required):** Make the current garment stage, due date, next action,
  and blocking reason visible without requiring users to search through
  historical notes.
- **NFR-021 (Required):** Provide clear validation and error messages and
  preserve unsaved form input where practical after recoverable failures.
- **NFR-022 (Proposed target):** Aim for WCAG 2.2 AA accessibility for core
  workflows; confirm the target and evaluation approach.
- **NFR-023 (MVP):** Display the initial business's dates and times in
  Africa/Lagos, format money in NGN, and provide an English interface.

### 5.5 Maintainability and delivery

- **NFR-024 (Required):** Keep frontend, backend, shared API contracts, and
  documentation in the agreed monorepo.
- **NFR-025 (Required):** Use TypeScript across the application code and validate
  API request and response contracts.
- **NFR-026 (Required):** Organize the backend as a modular monolith with
  documented boundaries for identity/business access, customers, orders,
  garments, progress, payments, media, and sharing.
- **NFR-027 (Required):** CI must run formatting/lint checks, type checks, and
  relevant automated tests before changes are accepted.
- **NFR-028 (Required):** Production deployment must use a documented release
  process with environment-specific configuration and a rollback or recovery
  procedure.
- **NFR-029 (Required):** Database schema changes must be versioned and
  reviewed; production migration procedures must account for backup and
  rollback limitations.
- **NFR-030 (Required):** Document how to run the system locally, configure
  object storage, execute tests, and deploy the application.

## 6. Initial acceptance outcomes

The initial release should not be considered ready until a business user can:

1. Sign in as the business owner using authenticator-app MFA.
2. Create a customer and record more than one dated measurement set.
3. Create an order containing multiple garments with different styles or due
   dates.
4. Record customer-provided or business-sourced material and its readiness.
5. Update a garment's work stage, block it with a reason, and resume it
   later with its history intact.
6. Record a fitting, an alteration, and a later fitting without losing earlier
   notes.
7. Record a price and multiple payments and see the correct balance according
   to the agreed payment-allocation rules.
8. Upload private media to managed object storage and deliberately select media
   for customer sharing or portfolio use.
9. Find due-soon, overdue, blocked, and unpaid work from the dashboard.
10. Prepare and copy a customer-safe progress update without exposing internal
    notes or another customer's information.
11. Track mixed garment stages and partial delivery in the order summary, and
    reverse a mistaken delivery without losing its original record.
12. Record a customer-agreed payment arrangement before delivering with a
    balance due, or record cancellation refund and retained amounts without
    deleting the original payment.
13. Verify that a user from a different business cannot access the first
    business's records or media.

## 7. Decisions required before detailed design

1. If customer status links are added later, how do expiry, revocation, and
     exposed information work?
2. What are expected launch volumes?
3. Are the proposed availability, response-time, recovery, and accessibility
    targets acceptable?
