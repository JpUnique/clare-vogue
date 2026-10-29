# Clare Vogue security and privacy plan

## 1. Purpose and status

This document sets the proposed security and privacy principles for Clare Vogue.
It is a planning baseline, not a legal assessment or completed security
implementation. Production launch must be preceded by review of applicable
privacy and business obligations.

## 2. Data to protect

The application may contain:

- Customer identity and contact details.
- Body measurements and fitting notes.
- Garment designs, progress notes, due dates, and order history.
- Prices, payment records, and outstanding balances.
- Private garment photos and videos.
- Customer consent and portfolio publication records.
- User accounts, business memberships, and invitations.

Treat measurements, customer contact information, payment history, private
media, and customer-sharing links as sensitive business data.

## 3. Security principles

- **Tenant isolation:** every business can access only its own business records.
- **Least privilege:** users and services receive only the access required for
  their job.
- **Private by default:** customer and garment records and object-storage
  objects are private unless deliberately shared.
- **Explicit sharing:** customer updates and portfolio publication are separate
  choices with controlled scope.
- **Secure by backend enforcement:** authorization is enforced by the API and
  database constraints, not only by the frontend.
- **Data minimization:** collect and log only information needed for product and
  operational purposes.
- **Traceability:** preserve a suitable history of significant access and
  business changes.

## 4. Identity and access

### Business users

- The first release has one business user: the business owner. Staff accounts,
  invitations, and customer accounts are out of scope until a later release.
- **Provider selected:** Supabase Auth, using authenticator-app TOTP MFA.
- Require the owner to enroll and verify TOTP before accessing business data.
- Require MFA for the owner; do not allow password-only sign-in or a recovery
  flow that silently bypasses MFA.
- The NestJS API must validate Supabase access tokens and require AAL2 on every
  protected business operation; a frontend-only MFA check is not sufficient.
- Require verified account identity and protect sign-in, MFA enrollment, and
  recovery with rate limits and abuse monitoring.
- Enroll a second authenticator on a separate trusted device as the normal
  backup. If all authenticators are lost, recovery must require strong,
  identity-verified provider support; email alone must not remove MFA or grant
  access to business data.
- Verify that the selected Supabase recovery and factor-reset flows preserve
  this policy before production. Require re-authentication to enroll or replace
  an authenticator and notify the owner of security-sensitive changes.
- Use secure, HTTP-only, same-site session cookies, short-lived sessions, and
  session revocation on sign-out, credential recovery, or suspected compromise.
- Treat authenticator-app codes as a required second factor; consider
  passkeys/security keys in a later security review because TOTP can still be
  phished.
- Check the owner's active business membership and role for every
  business-scoped request.

Supabase Auth references: [TOTP authenticator MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp) and [session controls](https://supabase.com/docs/guides/auth/sessions).

### Tenant access enforcement

- Resolve the authorized business from authenticated membership.
- Treat a business ID in a URL or request body as a selection, never as
  authorization.
- Apply tenant filters on every read, update, delete, search, export, media, and
  sharing operation.
- Use tenant-qualified database constraints to prevent cross-business
  relationships.
- Enforce PostgreSQL row-level security (RLS) on tenant-owned records. The API
  must verify membership before setting trusted business context transaction-
  locally. Policies must fail closed if context is absent, and the runtime
  database role must not bypass RLS.
- Add automated tests for cross-tenant identifier substitution, query paths,
  missing context, and pooled-connection reuse after both commit and rollback.

### Platform support

Platform staff have no routine access to business content. Prefer
troubleshooting with operational metadata. If content access is necessary, it
requires the owner's explicit approval, must be time-limited, and must be
audited. Define the approval, scope, expiry, and revocation procedure before
enabling this access in production.

## 5. Data and media protection

- Use HTTPS for deployed browser-to-application and application-to-service
  traffic.
- Keep production secrets out of source code and client bundles.
- Apply encryption-at-rest options offered by the selected PostgreSQL host,
  object-storage provider, and backup provider.
- Keep object-storage buckets private and separate environments.
- Use least-privilege object-storage service credentials; do not issue broad
  credentials to frontend code.
- Use short-lived, object-scoped upload grants only after API authorization;
  the API must verify the completed object before marking media available.
- Keep media buckets private and use API-authorized, short-lived scoped access
  for downloads.
- Verify file size, permitted media types, upload completion, and object
  metadata. Validate actual file content, not only the declared MIME type.
- Enforce the initial 20 MB image and 200 MB video per-file limits on the
  backend before issuing upload permission.
- Initially permit JPEG, PNG, and WebP images, plus MP4 and MOV videos.
- Sanitize filenames for display and do not use user-supplied filenames as
  object keys.
- Establish media retention, deletion, backup, and restore procedures.
- Avoid including full measurements, credentials, raw share tokens, or media
  content in logs.

## 6. Sharing and portfolio consent

- Keep internal notes separate from customer-facing update content.
- Share only selected records and media; do not expose an entire order or
  customer record through a public link.
- If share links are approved, store a cryptographic hash of a high-entropy
  token, support expiry and revocation, and avoid indexing the page for public
  search.
- Do not reveal whether a guessed or invalid link corresponds to a real
  customer/order.
- Require explicit, item-specific consent before publishing a customer's
  selected work in a public portfolio; record the date and how consent was
  given (verbal, written, or electronic), with an optional note/evidence
  reference. Private customer sharing is not public portfolio consent.
- Keep portfolio unpublishing available and remove public access when consent
  is withdrawn, subject to defined operational limits.
- Store consent purpose, item scope, recorded time, how consent was given,
  actor, and withdrawal state.
- Do not treat uploading or private customer sharing as consent to public
  portfolio publication.

The specific consent language, evidence, and retention periods require review
for the business's applicable jurisdiction.

## 7. Application and API safeguards

- Validate and normalize all inputs on the backend.
- Use parameterized database access through the selected data-access layer.
- Apply request-size limits, rate limits, and abuse protections appropriate to
  authentication and any public share-link endpoints.
- Use secure session or token storage consistent with the selected
  authentication design.
- Apply CSRF protections where cookie-based authentication requires them.
- Configure browser security headers and restrictive cross-origin access.
- Avoid returning internal IDs, notes, measurements, or payment information in
  customer-facing responses unless specifically approved.
- Use explicit error handling and avoid returning stack traces or secret
  configuration to users.
- Review dependencies and base images for supported versions and known
  vulnerabilities during CI and release.

## 8. Audit and incident readiness

Record important events such as:

- Membership invitations, role changes, and removals.
- Sensitive data exports and account recovery events where applicable.
- Payment corrections/refunds.
- Consent grants or withdrawals.
- Portfolio publication/unpublication.
- Customer-link creation and revocation.
- Administrative support access.

Support-access audit entries should include the approving owner, support actor,
reason, scope, start and end time, and revocation/outcome where applicable.
Audit entries should include an actor, action, target, timestamp, and
correlation identifier where appropriate, without copying sensitive contents
unnecessarily.

Before production, define:

- Who receives security incident reports and how quickly they respond.
- How affected credentials, sessions, and share links are revoked.
- How incidents are investigated while protecting customer information.
- Applicable notification and recordkeeping obligations.
- Backup restoration and service recovery responsibilities.

## 9. Privacy lifecycle

Before launch, decide:

- What personal data is required versus optional.
- How users can correct inaccurate customer records.
- How customers can request access, correction, export, or deletion where
  applicable; routine archiving must not be treated as permanent deletion.
- How a reviewed deletion workflow preserves or anonymizes financial records
  that must be retained.
- Which records may need restricted retention for business or legal reasons.
- How customer media and consent records are removed or retained.

Decision: do not set customer-data, media, or financial-record retention
durations until local legal requirements and business needs have been reviewed.
Complete that review and approve retention, export, correction, and deletion
policies before production launch. This is separate from the 30-day system
backup-retention planning baseline.

## 10. Security verification checklist

Before first production release:

- [ ] Owner authentication requires authenticator-app MFA; recovery and session
  revocation are configured and reviewed.
- [ ] Owner-only access rules are documented and tested.
- [ ] Cross-tenant access tests cover records, search, exports, and media,
  including RLS enforcement and pooled-connection context isolation.
- [ ] Object-storage access is private and scoped; frontend bundles contain no
  storage secrets.
- [ ] Customer-facing pages exclude internal notes and sensitive fields.
- [ ] Portfolio publication requires explicit consent and can be withdrawn.
- [ ] Secrets, logging, rate limits, and error responses are reviewed.
- [ ] PostgreSQL and object-storage recovery are tested.
- [ ] Data retention, export, correction, and deletion policies are approved.
- [ ] Support access is disabled by default and any owner-approved access is
  time-limited and audited.
- [ ] Incident response contacts and procedures are documented.

## 11. Open decisions

1. Will customer status links be added after the initial copyable-message
   workflow, and what expiry/revocation model will they use?
2. What data retention, export, and deletion obligations apply?
3. What encryption-at-rest and key-management options are available in the
   chosen hosting environment?
4. Which encryption-at-rest and key-management options are available in the
   chosen hosting environment?
