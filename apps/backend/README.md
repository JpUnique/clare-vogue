<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Clare Vogue backend

NestJS API for the Clare Vogue tailoring-business platform. The backend
implementation plan is in
[`docs/backend-implementation-plan.md`](./docs/backend-implementation-plan.md).

The API uses the `/api/v1` prefix. In development and test environments, the
OpenAPI UI is available at `/api/docs`. Health endpoints are
`/api/v1/health/live` and `/api/v1/health/ready`.

Production startup requires `CORS_ORIGINS` to be set to a comma-separated list
of exact `http` or `https` origins. `PORT` defaults to `3000`; `NODE_ENV`
defaults to `development`. Backend-local `.env` takes precedence over the
repository-root `.env`.

Authentication uses Supabase Auth. Set `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` together; production requires both and an HTTPS URL.
All routes require a verified Supabase access token with AAL2 (authenticator
MFA via TOTP), except routes explicitly marked public, including health
endpoints. `SUPABASE_AUTH_TIMEOUT_MS` defaults to `5000`.
Configure MFA enrollment and recovery in Supabase; email-only recovery must not
be used to bypass MFA.

Customer endpoints are available under `/api/v1/customers`: create, list/search
(`query`, `limit`, `offset`, `includeArchived`), get, update, archive, restore,
and list/create dated measurement sets under
`/api/v1/customers/:customerId/measurements`. Customer and measurement routes
derive the business from the authenticated owner's active membership; clients
cannot choose a tenant ID. Measurement sets are append-only and use positive
decimal values in either `cm` or `in`; custom fields are named and bounded.
Customer archive and restore actions are audited. Permanent deletion is not
available until retention and legal review requirements are approved.

Orders are available under `/api/v1/orders`: create an order with one or more
garments, list/search orders, and retrieve an order with its derived garment
summary. Each garment has its own stage and append-only progress history through
`/api/v1/garments/:garmentId`. The workflow API supports stage progression and
rework, blockers and resuming, individual garment cancellation, and repeated
fitting records. Confirm an agreed price for a garment that was created
without one at `/api/v1/garments/:garmentId/price`; the confirmation is
reasoned and retained at `/api/v1/garments/:garmentId/price-history`. Later
price changes can be recorded with a reason at
`/api/v1/garments/:garmentId/price-adjustments`; the price history is
append-only. Record and list payment receipts at
`/api/v1/orders/:orderId/payments`; allocations can be recorded with a receipt
or added later at `/api/v1/orders/:orderId/payments/:paymentId/allocations`.
Garment details include the agreed price, allocated amount, and derived
balance. Delivery history is under
`/api/v1/garments/:garmentId/deliveries`. Handover is allowed only after
delivery is arranged; when a balance remains, the request must include the
recorded customer agreement. A mistaken delivery can be reversed with a
reason, preserving the original record. All order and garment routes derive
the business from the authenticated owner's active membership. Direct
progress updates cannot set the `delivered` stage. Cancellation settlements,
actual refund records, and audited price adjustments are available through
`/api/v1/garments/:garmentId/cancellation-settlement`,
`/api/v1/garments/:garmentId/cancellation-settlement/:settlementId/refunds`,
and `/api/v1/garments/:garmentId/price-adjustments`. A settlement is recorded
once per cancelled garment and requires a customer agreement; refund plus
retained amounts cannot exceed money allocated to that garment. Actual refunds
are separate records and cannot exceed the agreed refund amount. Receipt or
allocation corrections are append-only: reverse a specific allocation with a
reason at
`/api/v1/orders/:orderId/payments/:paymentId/allocations/:allocationId/reverse`,
then void a receipt with a reason at
`/api/v1/orders/:orderId/payments/:paymentId/void`. A receipt can be voided
only after each allocation has been reversed. Reversals and voids preserve the
original records and are included in payment history; reversed allocations do
not count toward balances, and voided receipts cannot receive new allocations.

### Initial owner provisioning

Public signup and runtime owner creation are not exposed. After the database
migrations are applied and the owner's Supabase Auth account is created and
secured with verified TOTP MFA, an operator provisions the initial business
once using a dedicated privileged migration connection:

```bash
MIGRATION_DATABASE_URL='postgresql://...' \
OWNER_SUPABASE_USER_ID='supabase-auth-user-uuid' \
OWNER_BUSINESS_NAME='Clare Vogue' \
npm run db:provision-owner --workspace @clare-vogue/backend
```

The command is atomic, serializes concurrent attempts, rejects non-empty
business databases, validates the Supabase user UUID, and requires a role that
can bypass RLS. Use a short-lived, tightly controlled migration credential;
never use `DATABASE_URL` or grant these privileges to `clare_vogue_runtime`.
Do not put real connection strings or IDs in shell history or committed files.
The owner's Supabase account must already exist and TOTP must be verified before
provisioning. The command records the business and owner IDs in its output; it
does not print connection details.

The database uses Drizzle ORM and PostgreSQL. `DATABASE_URL` is optional in
development while no database-backed routes are being exercised; production
requires it and `DATABASE_SSL=true`. `DATABASE_POOL_MAX` defaults to `10`, and
`DATABASE_CONNECTION_TIMEOUT_MS` defaults to `5000`. Migration commands use a
separate `MIGRATION_DATABASE_URL`; never run them with the runtime database
role. Before applying migrations, provision the `clare_vogue_runtime` role
without `SUPERUSER` or `BYPASSRLS`; the runtime connection must use that
least-privilege role.

Use the workspace scripts for development and checks. Database commands are
available as `db:generate`, `db:migrate`, and `db:check` from this workspace.

### Private garment media

Media is stored in a private S3-compatible bucket; PostgreSQL stores metadata
and consent history only. Configure `OBJECT_STORAGE_ENDPOINT`,
`OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, and
`OBJECT_STORAGE_SECRET_ACCESS_KEY` together. Set
`OBJECT_STORAGE_PUBLIC_ENDPOINT` when clients need presigned URLs using a
different endpoint than the backend, and optionally set `OBJECT_STORAGE_REGION`
(defaults to `us-east-1`). Production requires HTTPS and complete storage
configuration. Never expose storage credentials to the frontend.

The authenticated media API can request a five-minute upload URL for a garment,
verify upload length and file signature before making it available, list
available media, create a five-minute private download URL, and delete an
object while retaining its metadata. Image files are limited to 20 MB
(JPEG/PNG/WebP); video files are limited to 200 MB (MP4/MOV). Portfolio consent
is recorded as append-only, per-media grant/withdrawal events. Uploads and
private access do not grant portfolio permission. Incomplete uploads remain
private and require later cleanup; public portfolio publishing and customer
status links are not exposed by this API.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
