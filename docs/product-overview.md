# Clare Vogue

## Product plan overview

### 1. Product vision

Clare Vogue is a business-tracking system for fashion designers and tailoring
businesses. It helps a business keep each customer's garments, measurements,
materials, prices, payments, work progress, and delivery details in one place.

The product should make it easier to know what needs attention today, what is
coming due, and what remains before each garment can be delivered. It should
also help a business preserve and present selected examples of its completed
work to future customers.

### 2. The problem

As a fashion business grows, details about customers and garments can become
spread across conversations, notebooks, and memory. This makes it harder to:

- Remember the current stage of every garment and what work remains.
- Keep customer measurements and garment-specific instructions available.
- Track customer-provided versus business-sourced materials.
- Follow fitting changes, deadlines, prices, deposits, and outstanding balances.
- Give customers clear progress updates and deliver on time.
- Keep a useful record of completed work for future customers.

Clare Vogue aims to give the business a reliable, shared record of this work,
so it can resume a garment's progress from where it stopped.

### 3. Intended users

- **Business owner:** oversees the business, customers, orders, work, payments,
  staff, and portfolio.
- **Staff member:** views assigned work and records garment progress, notes,
  fittings, and other updates according to their access.
- **Customer:** initially receives progress information shared by the business;
  a customer account is not required for the first version.
- **Prospective customer:** views work the business has chosen and received
  permission to publish.

The first release is for one business only, with the owner as its only signed-in
user. Keep tenant-safe foundations so the product can support multiple
independent businesses later; multi-business onboarding and staff accounts are
not first-release scope. Each business's information must remain private from
other businesses as the product grows.

### 4. High-level workflow

The system will follow a garment from the customer's request through delivery:

1. Record the customer, request, selected style, expected price, and target date.
2. Record or confirm measurements and garment-specific instructions.
3. Record whether the customer supplies the material or the business sources it.
4. Track the garment through cutting, sewing, fitting, alterations, finishing,
   packaging, and delivery as applicable.
5. Record progress updates, notes, photos or videos, and the person making each
   update.
6. Record deposits and later payments, and show the remaining balance.
7. Share an appropriate progress update with the customer.
8. Mark the garment delivered and, with permission, select suitable work for the
   public portfolio.

Actual work may vary by garment. The detailed workflow and rules for optional
stages will be defined during requirements design.

### 5. First-version product scope

The initial product is expected to provide:

- Owner-only business access with authenticator-app two-factor authentication.
- Customer records and measurement history.
- Orders that can include one or more garments.
- Garment details such as style, material arrangement, price, and due date.
- Progress tracking, work notes, fittings, and alterations.
- Deposits, installments, payment history, and balance due.
- Photo and video uploads for garment records.
- A business dashboard for active work, upcoming deadlines, overdue work, and
  unpaid balances.
- Copyable customer progress updates for the business's usual messaging
  channel, without requiring customer accounts.
- An opt-in portfolio for completed work.

This is an overview, not a final feature specification. Detailed permissions,
reports, and customer-sharing behavior remain to be designed. The first release
uses the dashboard for owner reminders and does not send automatic reminder
notifications; customer updates are prepared for the owner to send manually.

### 6. Product principles

- **Clear progress:** make each garment's current stage and next action easy to
  understand.
- **Reliable records:** preserve important measurements, instructions, payment
  events, and progress history.
- **Customer trust:** make deadlines, changes, payments, and customer-visible
  updates understandable.
- **Privacy by default:** restrict business records and uploaded media to
  authorized people.
- **Consent before promotion:** never publish customer work in the portfolio
  merely because it was uploaded.
- **Mobile-friendly use:** support practical use on phones as well as desktop
  screens.
- **Room to grow:** support multiple businesses without starting with
  unnecessary service complexity.

### 7. Proposed technical direction

- **Monorepo:** keep the web application, API, shared contracts, and project
  documentation together.
- **Frontend:** Next.js, React, TypeScript, and Tailwind CSS in `apps/frontend/`.
- **Backend:** Node.js, TypeScript, and NestJS in `apps/backend/`, initially as a
  modular monolith.
- **Database:** PostgreSQL for business records and relationships.
- **Object storage:** managed, private S3-compatible storage for uploaded photos
  and videos. Store file metadata and object references in PostgreSQL; keep
  objects private unless deliberately shared.
- **Contracts:** a shared or generated API contract to keep frontend and backend
  interfaces aligned.
- **Delivery:** Docker for consistent environments and CI/CD for automated
  checks and deployment.

The provider and object-storage backup and recovery model will be decided in
the detailed architecture and deployment plans. Prefer a Nigeria region for
hosted services, with a nearby region as fallback if needed.

### 8. Proposed monorepo outline

```text
clare-vogue/
├── apps/
│   ├── frontend/             # Next.js web application
│   └── backend/              # NestJS API
├── packages/
│   └── api-contracts/        # Shared or generated API contracts
├── docs/                     # Product, requirements, and technical plans
├── infra/
│   └── local/                # Local development configuration
├── .github/
│   └── workflows/            # CI/CD workflows
├── package.json
├── package-lock.json         # npm workspace lockfile
└── README.md
```

This is a proposed layout. The exact tooling and package boundaries will be
confirmed before scaffolding the applications.

### 9. What comes next

This overview establishes the product direction without locking down detailed
system behavior. The next planning steps are:

1. Review and adjust this product vision and initial scope.
2. Map the customer-to-delivery workflows, including fitting changes and
   incomplete work.
3. Write functional and non-functional requirements.
4. Design the application architecture, tenant isolation, data model, and API.
5. Define security, object-storage access, backups, deployment, and CI/CD.
6. Break the agreed scope into implementation phases and acceptance criteria.

No application code or infrastructure has been created as part of this overview.
