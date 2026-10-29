# Clare Vogue workflows

## Purpose

This document describes the proposed day-to-day workflows for managing
customers, garment orders, work progress, payments, and customer updates. It
builds on the product direction in [product-overview.md](./product-overview.md).
The owner-only first-release access model, garment-level workflow, payment
allocation approach, and copyable customer-update workflow are agreed. These
are the product requirements; implementation status is tracked separately in
the backend implementation plan.

## Core concepts

- **Customer:** a person or organization the business works with.
- **Order:** a customer's request, including agreed dates, overall context, and
  potentially multiple garments.
- **Garment:** an individual item in an order. Each garment can have its own
  style, measurements, material details, price, due date, workflow, and media.
- **Progress update:** a dated record of work completed, current status, notes,
  and optional media.
- **Payment:** a dated record of money received against an order or garment.
- **Customer update:** information intentionally shared with a customer, kept
  distinct from internal work notes.

## 1. Customer and order intake

1. A business user creates or finds the customer record.
2. The user records the customer's contact details and any useful communication
   preference.
3. The user creates an order and records the request. Each garment carries its
   own price estimate or quote and target date.
4. The order contains one or more garments. For each garment, the user records
   the style or design, instructions, its own expected/agreed price, and its own
   target completion date.
5. The order displays a total derived from its garment prices and an overall
   target date derived from its garments; it does not introduce a conflicting
   separately maintained price or due date.
6. The user records the material arrangement:
   - Customer will provide the material.
   - Business will source the material.
   - Material details are not yet confirmed.
7. The order is saved even if some details are not yet known, so the business can
   continue completing the record later.

The order can be saved while details are incomplete; its derived totals and
overall date update as garment details are added or changed.

When a customer is no longer active, the owner can archive the customer. An
archived customer is hidden from active lists, while linked orders and payment
history remain available under the approved retention policy.

Permanent deletion is a separate, reviewed process, not an archive action. When
deletion is appropriate, remove personal data that is not subject to a retention
requirement, and retain or anonymize required financial records with an audit
record of the outcome.

## 2. Measurements

1. A business user records measurements for the customer, including the date
   taken and any notes relevant to the measurement session.
2. Start from a standard ladies'-dress measurement template containing bust,
   waist, hips, shoulder width, shoulder-to-waist, sleeve length, armhole, and
   desired dress length. The owner can add business-specific measurement
   fields when needed.
3. Choose centimetres or inches for each dated measurement set; values in that
   set use the selected unit consistently.
4. When a garment uses those measurements, the user associates the appropriate
   measurement set with it.
5. If measurements are updated later, the previous set remains in the history.
6. The garment retains a reference or snapshot of the measurements used for its
   work, so a later measurement update does not silently change an existing
   garment's record.
7. The user can record garment-specific adjustments or fit notes separately
   from the general measurement set.

**Privacy note:** measurements are sensitive personal information. Access,
retention, and deletion rules must be defined in the security and privacy plan.

## 3. Material readiness

1. For customer-provided material, the user records whether it has been
   received, when it was received, and any condition or quantity notes.
2. For business-sourced material, the user records sourcing details and whether
   the material is ready for the garment.
3. If material is missing or unsuitable, the garment remains blocked from the
   affected work stage and the reason is recorded.
4. Once material is ready, the user records that the garment can proceed.

**Planning note:** inventory, supplier management, and material costing are not
assumed to be part of the first version.

## 4. Garment workflow and daily resume

1. The garment appears in the business's active-work view with its current
   stage, due date, and next action.
2. The person doing the work records a progress update when a meaningful task
   is completed or the work state changes.
3. A progress update can include:
   - The stage reached or work completed.
   - A concise note about what was done or what remains.
   - The person making the update and its timestamp.
   - Optional photos or videos.
4. If work stops before the garment is complete, the user records the current
   stage and a next action or blocking reason.
5. The next person opening the garment can see the latest update, remaining
   work, relevant instructions, fitting notes, due date, and payment balance.
6. Work continues from the recorded state. Earlier progress updates remain
   available as history rather than being overwritten.

Each garment has its own current stage, blockers, progress history, payment
state, and delivery record. Changes to one garment must not silently change the
state of another garment in the same order. Order progress is a summary derived
from its garments, including mixed states such as active, blocked, partially
delivered, completed, or cancelled; the owner does not maintain a second,
conflicting order-stage timeline.

The standard garment stages are:

1. Request and design confirmed.
2. Measurements recorded.
3. Material pending.
4. Ready to cut.
5. Cutting.
6. Sewing.
7. Customer fitting.
8. Alterations, repeated as needed until the customer approves the fit.
9. Dry cleaning.
10. Packaging.
11. Ready for delivery.
12. Payment check and any agreed balance arrangement.
13. Customer notified for collection or physical delivery arranged.
14. Delivered or collected.

The customer fitting, dry-cleaning, and packaging steps are part of the
standard completion path; they are not silently skipped. A fitting that requires
changes returns the garment to alterations and then to another fitting.
Rework can move a garment back to an earlier stage, with each transition and
fitting retained in its dated history.

Blocked is a separate flag on the garment, not a replacement workflow stage.
Record the reason and preserve the stage and next action so work can resume
from the right place when the blocker is cleared. A garment may be cancelled
independently of its order and sibling garments; cancellation requires a reason
and does not erase its progress or financial history.

The order-level status is a live summary of its garments, not another status
that the owner must keep synchronized manually. It should make mixed states
obvious—for example, one garment in alterations, one blocked, and one already
collected. Show per-state counts and each garment's own current state so a
single order badge never hides mixed work. The derived order summary is
cancelled when all garments are cancelled, completed when all remaining
garments are delivered, partially delivered when some garments are delivered
while others remain open, blocked when all remaining work is blocked, and
active otherwise.

## 5. Fittings and alterations

1. A user records a fitting appointment or fitting result.
2. The result includes the date, relevant notes, and any changes requested or
   agreed.
3. If alterations are needed, the garment returns to active work with an
   alterations stage and clear next action.
4. A later fitting can be recorded as a separate event, preserving the history
   of earlier feedback.
5. Once the garment fits as agreed, work proceeds to the remaining finishing
   stages.

Customer-facing wording and whether fitting appointments need calendar
integration are open decisions.

## 6. Price and payment tracking

The initial Clare Vogue business uses Nigerian naira (NGN) for all garment
prices, payments, and balances.
Display business dates and times in the Africa/Lagos time zone; the first
release's interface language is English.

1. The user records an estimate or agreed garment price, and distinguishes it
   from amounts actually received.
2. The user records each payment with its amount, date, method or reference if
   useful, and the order or garment it applies to.
3. The system shows the total agreed price, total recorded payments, and
   remaining balance.
4. The owner may apply a discount to a garment, recording the amount and
   reason; the original price and discount remain visible in the history.
5. If the price changes, the user records the change and reason; the prior
   agreed amount remains auditable.
6. A refund or correction should be represented as a separate financial event
   rather than silently deleting a payment.

**Boundary:** the first version tracks payments recorded by the business. It
does not process card payments or store card details unless a payment-provider
integration is deliberately added later.

When a payment covers multiple garments, record the payment once and split it
into explicit garment allocations. The sum allocated cannot exceed the payment;
any remainder stays visible as unallocated. Calculate order totals from garment
prices and allocations rather than counting a payment again at order level.
Discounts and currency handling require detailed requirements.

When a customer cancels a garment after making payments, the owner records the
cancellation settlement case by case: the amount to refund, the amount to
retain, the reason, and the customer's agreement. The refund and retained
amounts together cannot exceed the money already paid and allocated to that
garment. Any actual refund is recorded as a separate financial event; Clare
Vogue tracks it but does not send money or create a new cancellation debt.

## 7. Customer progress sharing

1. A business user reviews the current garment progress and selects what is
   appropriate to share.
2. The owner prepares and copies a customer-safe status message, then sends it
   through the business's usual messaging channel.
3. The system distinguishes shared information from internal notes.
4. If a status link is used, it should expose only the intended customer-facing
   information, not measurements, internal notes, unrelated garments, or
   payment details unless explicitly designed and authorized.
5. The business can review what update was shared and when.

Customer accounts and in-app replies are not part of the initial release.
Controlled status links may be considered later; their expiry, revocation, and
visible information must be designed before implementation.

## 8. Photo and video handling

1. A user uploads media to the relevant garment or progress update.
2. The system stores the media object in private S3-compatible object storage
   and records its metadata and relationship in PostgreSQL.
3. Media remains private to the business by default.
4. A user may intentionally share selected media with a customer.
5. Before publishing a selected photo or work item in the public portfolio, the
   owner records the customer's explicit consent for that specific item, the
   date, and how consent was given (verbal, written, or electronic), with an
   optional note or evidence reference.
6. Portfolio publication is a separate action from uploading or sharing work
   privately.
7. The owner can withdraw consent; the portfolio item is unpublished and
   public access is removed. Private customer sharing does not imply consent to
   public portfolio use.

File size/type limits, upload processing, retention, and consent records will
be specified in the security, storage, and requirements documents.

## 9. Payment check, delivery, and completion

1. After packaging, the owner reviews the garment's payment balance.
2. If the balance is paid, record the check. If money remains due, delivery is
   still allowed when the owner and customer have agreed on an arrangement;
   record the outstanding amount, agreement terms, and agreed follow-up date
   when provided. Do not treat an unrecorded assumption as an agreement.
3. After the payment check, the owner tells the customer the garment is ready
   for collection or arranges physical delivery. The app prepares a
   customer-safe message for the owner to send through the business's usual
   channel and records the notification outcome when known.
4. Record each garment's own delivery or collection event, including method,
   date/time, recipient or handover notes, and the payment/agreement state at
   handover. Sibling garments may be delivered at different times.
5. The order summary remains partially delivered until all non-cancelled
   garments are delivered. It is completed when all non-cancelled garments are
   delivered, and cancelled when every garment is cancelled.
6. If delivery was recorded by mistake, the owner can correct or reverse it.
   Preserve the original event and append the correction reason and timestamp;
   never silently erase the delivery history.
7. The system retains the garment's progress, fitting, media, delivery, and
   payment history after completion. Portfolio publication remains separate
   and requires permission.

## 10. Daily overview

The business dashboard should help the owner or staff answer:

- Which garments are active, and what stage is each in?
- What work should be continued today?
- Which orders or garments are due soon or overdue?
- Which garments are blocked, and why?
- Which fittings or deliveries need attention?
- Which orders have an outstanding balance?

Show garments due within the next 7 days, with the soonest due first. The first
release uses dashboard visibility only for owner reminders; it sends no
automatic email, SMS, or push reminders. Customer delivery updates remain
copyable messages that the owner sends through the business's usual channel.

## Deferred product decisions

Customer status links are out of scope for the initial release. If they are
added later, decide what information they expose and how access expires or is
revoked. Portfolio publication requires explicit per-item consent; the
information recorded for consent is defined in this document.
