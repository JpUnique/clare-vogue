# Clare Vogue data model

## 1. Purpose and status

This document proposes the main PostgreSQL entities and relationships for the
first release. It is logical design, not a final schema or migration. Field
types, indexes, deletion rules, and constraints will be settled during detailed
database design.

## 2. Design principles

- Make business ownership explicit on every tenant-owned record.
- Enforce that related records belong to the same business.
- Preserve dated measurement and work history rather than overwriting it.
- Separate order-level records from garment-level work.
- Keep payment receipts and allocations explicit so balances can be explained.
- Store media metadata and object references in PostgreSQL, not file contents.
- Keep private notes distinct from information intentionally shared with
  customers.
- Record important changes with actor and timestamp where auditability matters.

## 3. Conceptual entities

### Identity and business

#### `users`

Represents an authenticated person who can use the application.

Typical attributes:

- `id`
- identity-provider subject or credential reference
- display name
- email and verification state
- account state
- created and updated timestamps

Authentication secrets should be managed by the selected identity solution;
the data model should not store plaintext passwords.

#### `businesses`

Represents one independent tailoring or fashion business (tenant).

Typical attributes:

- `id`
- business name
- time zone
- currency code (one currency per business; NGN for the initial business)
- contact/profile details
- created and updated timestamps

#### `business_memberships`

Joins users to businesses and records their access.

Typical attributes:

- `id`
- `business_id`
- `user_id`
- role or permission profile
- membership state
- invitation and activation timestamps

Recommended constraint: one active membership per user/business pair, with
history retained or archived according to the account lifecycle rules.

### Customers and measurement history

#### `customers`

Represents a customer within a business.

Typical attributes:

- `id`, `business_id`
- name
- phone/email and preferred contact method
- internal notes
- created/updated timestamps
- archived/deletion-review state and timestamps

Customer contact details are tenant-scoped and must not be globally searchable
across businesses.

#### `measurement_sets`

Represents a dated set of measurements for one customer.

Typical attributes:

- `id`, `business_id`, `customer_id`
- `measured_at`
- measurements as explicitly named values or a validated structured value
- unit system (`cm` or `in`) applied consistently to the set
- optional template/version reference and custom measurement field definitions
- notes
- created by and created timestamp
- correction/supersession metadata if needed

Store the standard ladies'-dress measurements as named values and validate
owner-defined custom measurement fields separately. Preserve the template
version and unit with each measurement set.

#### `garment_measurement_snapshots`

Associates a garment with the measurement values used for it at the time work
was agreed or started.

Possible model:

- `id`, `business_id`, `garment_id`
- optional source `measurement_set_id`
- immutable snapshot of values and units
- captured timestamp and actor

This protects historical garment context if a customer's measurements are
updated later.

### Orders and garments

#### `orders`

Represents a customer request or booking.

Typical attributes:

- `id`, `business_id`, `customer_id`
- human-friendly order reference, unique within a business
- order date
- configured business currency (NGN for the initial Clare Vogue business),
  applied consistently to garment prices and payments
- configured time zone (Africa/Lagos for the initial Clare Vogue business)
- overall target date derived from garment due dates
- order price total derived from garment prices
- derived summary status from its garments (not a separately edited workflow)
- customer-visible summary, if approved for sharing
- internal notes
- created/updated timestamps

#### `garments`

Represents an individual clothing item in an order.

Typical attributes:

- `id`, `business_id`, `order_id`
- garment type/style and design description
- instructions
- material source (`customer`, `business`, `unknown`)
- material readiness/receipt details
- current workflow state
- next action and optional blocking reason
- agreed price in the business's configured currency
- garment due date
- blocked flag, blocking reason, and timestamps
- cancellation reason and timestamp
- created/updated timestamps

Each garment progresses independently. The order summary is calculated from
garment states so partially delivered orders and garments at different stages
are represented without duplicate manual status updates.

#### `garment_price_adjustments`

Records discounts and other approved price adjustments without overwriting the
original agreed garment price.

Typical attributes:

- `id`, `business_id`, `garment_id`
- adjustment type (discount or other approved adjustment)
- amount in the business's configured currency
- reason
- actor and timestamp

The garment's net agreed price and order total are derived from the original
garment price and its adjustments.

#### `order_change_events`

Records important changes to agreed order or garment details that should
remain explainable, such as a changed deadline or price.

Typical attributes:

- `id`, `business_id`
- subject type and subject ID (or typed foreign keys)
- field/change category
- prior and new values, with sensitive values handled carefully
- reason
- actor and timestamp

Typed change tables may be preferred if a generic subject reference would weaken
referential integrity.

### Work progress and fitting

#### `progress_events`

Append-oriented history of garment work.

Typical attributes:

- `id`, `business_id`, `garment_id`
- event type
- prior and resulting stage, where applicable
- work completed
- next action
- block/unblock reason and timestamps, where applicable
- internal note
- actor and timestamp

The current garment state may be stored on `garments` for fast display, while
`progress_events` retains the history. Updating the current state and appending
the event should occur in one database transaction.

#### `fittings`

Represents each customer fitting and its result. Multiple fitting events are
expected when alterations are required.

Typical attributes:

- `id`, `business_id`, `garment_id`
- scheduled and completed timestamps, if appointment scheduling is included
- fitting outcome
- requested/agreed alterations
- internal notes
- created by and timestamps

Calendar integration is not assumed for the first release.

#### `delivery_events`

Append-oriented record of each garment handover, collection, and any subsequent
correction. Different garments in the same order can have separate events and
dates.

Typical attributes:

- `id`, `business_id`, `garment_id`
- event type (delivered, collected, correction, or reversal)
- delivery method, event timestamp, recipient, and handover notes
- balance due at handover
- optional payment-arrangement terms, agreed follow-up date, and agreement
  confirmation or record of customer agreement
- correction/reversal reason and reference to the original event
- actor and created timestamp

Correcting a mistaken delivery appends a reversal or correction event; it does
not delete or rewrite the original delivery record.

### Payments

#### `garment_price_events`

Append-only record of the initially confirmed garment price and each later
reasoned price adjustment. The current price is maintained on the garment for
workflow calculations and each change remains visible in this history.

Typical attributes:

- `id`, `business_id`, `garment_id`
- previous and new agreed prices
- adjustment reason
- actor and timestamp

#### `payments`

Represents a payment receipt or financial event recorded by the business.

Typical attributes:

- `id`, `business_id`
- received timestamp
- amount and currency
- payment method/reference
- event type (receipt, refund, or correction)
- optional reference to a cancellation settlement and original payment
- reason
- notes
- recorded by and timestamp

#### `cancellation_settlements`

Records the case-by-case financial agreement when a garment is cancelled after
payment. This records the agreed disposition of money; it does not initiate a
refund or create an amount owed beyond funds already paid.

Typical attributes:

- `id`, `business_id`, `garment_id`
- cancellation reason and customer-agreement record
- agreed amount to refund and amount retained
- actor and timestamp

The amount to refund plus the amount retained must not exceed the amounts
already paid and allocated to that garment. Each actual refund is separately
recorded as an immutable refund event linked to the settlement; the original
receipts remain unchanged. Actual refunds cannot exceed the agreed refund
amount.

#### `cancellation_refunds`

Append-only records of refunds actually issued against a cancellation
settlement. Clare Vogue records the refund but does not initiate a transfer.

Typical attributes:

- `id`, `business_id`, `garment_id`, `settlement_id`
- refunded amount, date, and method
- optional reference and note
- actor and timestamp

#### `payment_allocations`

Associates a payment amount with a garment to support payment allocation and
balance calculations. Order totals are calculated from their garments.

Typical attributes:

- `id`, `business_id`, `payment_id`
- target garment
- allocated amount in the business's configured currency
- created by and timestamp

**Agreed direction:** record each payment once, allocate it explicitly to one
or more garments, and calculate order balances from garment prices and their
allocations. An allocation total cannot exceed its payment; any unallocated
amount remains visible. Avoid an ambiguous payment counted against both order
and garment.

#### `payment_allocation_reversals`

Append-only, reasoned corrections for mistaken allocations. Each reversal
references exactly one original allocation and can be recorded only once.
Reversed allocations remain visible in history but are excluded from active
payment and garment totals. Allocations for delivered or cancelled garments,
or garments with a cancellation settlement, cannot be reversed.

#### `payment_voids`

Append-only corrections for mistaken payment receipts. A receipt can be voided
only after all its allocations have been reversed. A voided receipt remains in
history, contributes no active allocations, and cannot receive new allocations.

Balances should be derived from agreed prices, valid allocations, and approved
adjustments, rather than maintained as unrelated editable totals.

### Media, consent, and portfolio

#### `media_assets`

Stores metadata and private object-storage references.

Typical attributes:

- `id`, `business_id`
- private bucket and object key
- original filename (sanitized)
- declared and verified media type
- byte size
- upload status and checksum if useful
- association to a garment or its progress event, using typed relations or a
  safe association table
- uploader and timestamps
- deletion state

The object key is an internal reference, not a public URL or access grant.

#### `media_consents`

Records permission relevant to a specific use of media.

Typical attributes:

- `id`, `business_id`, `customer_id`
- `media_asset_id` or explicitly scoped group
- consent purpose (portfolio, customer sharing, or another defined purpose)
- portfolio consent scoped to one selected photo/work item
- granted/withdrawn state
- recorded timestamp, consent method (verbal, written, or electronic), actor,
  and optional note/evidence reference

The exact consent evidence and retention policy must be reviewed for applicable
privacy requirements.

#### `portfolio_items`

Represents a media asset or completed-work entry deliberately published to the
business's public portfolio.

Typical attributes:

- `id`, `business_id`, `media_asset_id`
- title/description
- publication status and timestamps
- sort order
- related consent reference

Publishing must require the appropriate consent and a deliberate user action.
Unpublishing should remove public access without erasing the audit history.

### Customer sharing

#### `customer_updates`

Stores a business-authored update intended for a customer, separate from
internal notes.

Typical attributes:

- `id`, `business_id`, `customer_id`, optional `order_id` and `garment_id`
- customer-safe message
- selected stage or status summary
- created by and timestamp
- delivery/share method and outcome, when known

#### `share_links` (if approved)

Represents a narrowly scoped customer status link.

Typical attributes:

- `id`, `business_id`, `customer_update_id`
- cryptographic token hash, never the raw token
- permitted resource scope
- created and expiry timestamps
- revoked timestamp and actor
- last-used timestamp if collected

The link should resolve only to the associated customer-safe update and
explicitly selected media. No access to internal application endpoints should be
granted by the token.

### Audit

#### `audit_events`

Captures security- or business-significant actions that require an audit trail.

Possible events include membership changes, sensitive record exports, consent
changes, portfolio publication, link creation/revocation, payment corrections
and refunds, garment cancellation, delivery, and delivery reversal.

Typical attributes:

- `id`, `business_id` where applicable
- actor/user or system actor
- action and target reference
- timestamp
- request/correlation identifier
- limited structured context that avoids secrets and unnecessary sensitive
  data

Retention and access to audit history must be defined.

## 4. Relationship summary

- A user can have memberships in multiple businesses.
- A business has users through memberships and owns its customers, orders,
  garments, measurements, payments, media, and settings.
- A customer can have multiple measurement sets and orders.
- An order belongs to one customer and contains garments.
- A garment has progress events, fittings, and the measurement context used for
  its construction.
- Payments are recorded once and allocated explicitly to garments; order
  balances are derived from their garments.
- A cancellation settlement's refund and retained amounts cannot together
  exceed amounts already paid and allocated to the cancelled garment.
- Garment stages, fittings, blockers, cancellations, rework, and deliveries
  remain independently traceable in append-oriented history.
- Order workflow summaries are derived from garment states, including partial
  delivery and cancellation.
- Media belongs to a business and is associated with relevant garment/work
  records.
- A portfolio item references selected media and the required consent.
- Customer updates and share links expose only deliberately selected,
  customer-safe information.

## 5. Tenant-safe constraints

Recommended database protections:

- Put `business_id` on every business-owned table, including join and history
  tables where practical.
- Use unique constraints such as `(business_id, order_reference)`.
- Use composite foreign keys such as
  `(business_id, customer_id)` to ensure an order cannot reference a customer
  from another business.
- Apply the same tenant-qualified relationship rule to garments, progress,
  payments, media, and sharing records.
- Ensure indexes used by tenant-scoped queries begin with `business_id` where
  appropriate.
- Test direct API identifier substitution across tenants.
- Enable PostgreSQL row-level security (RLS) for every tenant-owned table. Set
  the authorized `business_id` as trusted transaction-local context only after
  the API verifies membership; policies must deny access when the context is
  missing. The application database role must not bypass RLS.
- Test that context does not leak when pooled connections are reused after
  commit or rollback, and that missing context denies access.

## 6. Deletion and retention considerations

- Prefer archive/deactivation for customers or business records where history
  must be retained for operational or financial reasons.
- Define a deletion/export workflow for personal data and media before
  production.
- When deleting media, coordinate the database state and object-storage
  deletion; failures need a retryable cleanup process.
- Retain financial and audit records only as long as the approved legal and
  business policy requires.
- Do not erase order history simply because a customer is no longer active.

The retention periods and lawful basis must be established through local legal
review and the business's operational needs; do not guess them in the schema.
Approve customer-data, media, and financial-record retention, export,
correction, and deletion policies before production. System backup retention is
a separate 30-day planning baseline, subject to provider and cost review.

## 7. Open data-model decisions

1. What customer export behavior and retention periods apply to archived or
   anonymized records?
