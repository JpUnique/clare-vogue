## Clare Vogue frontend

The Next.js app provides a private garment media studio. It signs users in
through Supabase Auth, requires a verified TOTP factor before calling the
backend, loads the signed-in owner's orders and garments, and supports private
media upload, preview, and per-item portfolio consent.

### Local configuration

For Docker Compose, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the
repository-root `.env` file. Also set `SUPABASE_SECRET_KEY` there for the
backend's username registration; it must remain backend-only and must never be
exposed to the frontend. Recreate the frontend service after changing values.
For local development without Compose, put only `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` in `apps/frontend/.env.local`, then restart the
frontend dev server. The Next.js app does not load the Compose root `.env`
when started directly from the frontend workspace. The backend independently
verifies the access token and enforces AAL2 and active owner membership.

Start the app with `docker compose up --build`. The frontend runs at
`http://localhost:3001`; the backend and MinIO storage are also configured in
Compose. The private storage bucket allows browser access only from the local
frontend origin for signed `GET`, `HEAD`, and `PUT` requests through
`MINIO_API_CORS_ALLOW_ORIGIN`. Configure the equivalent narrow origin and
methods for the production object-storage provider before deploying.

The browser receives only the short-lived presigned object URL and the
Supabase publishable key. It never receives database or object-storage
credentials.

The sign-in screen is a lamp-lit atelier: pull the cord to reveal the large,
circular logo and the sign-in card. The lamp fades away while the logo is in
focus; a small Turn off control resets the scene. The logo is the only image
brand mark on this screen to avoid competing duplicates. The interface uses
the logo's fuchsia, rose, and gold palette. New accounts sign in with a unique
3–32-character username and password; existing accounts can continue using
their email. Sign-up collects a name, username, email, and a required phone
number in international format (including the country code). Email
confirmation, username-based password reset, and authenticator-based MFA use
Supabase Auth. Phone numbers are stored as contact details and are not verified
by SMS.
Google and Apple buttons require those OAuth providers and the local/production
redirect URLs to be configured in the Supabase dashboard.

### Authenticated workroom

The root page and `/studio-preview` both use the same Supabase sign-in and
verified TOTP MFA flow. After MFA verification, the workroom sends the access
token to the backend, which independently validates the session, AAL2, and
active owner membership.

The workroom connects customers, orders, garment progress, purchases,
appointments, measurements, payments, and private client stories to the
authenticated API. Client-story videos use the private media upload workflow;
portfolio consent remains a separate, explicit action. Three instructional
examples on each screen are guidance only and are never inserted into customer
records. The workroom also exposes fitting and delivery histories, price
confirmation and adjustments, garment cancellation settlements and refunds,
payment allocation reversals, and payment voids.

The purchase, appointment, and client-story APIs require migration
`0012_whole_liz_osborn.sql`. Do not apply it until a dedicated PostgreSQL test
database is available. Real-record testing also depends on the configured
backend, database migrations, Supabase MFA, and private object storage.

The studio UI uses the owner-provided Clare's Vogue logo at
`public/clare-vogue-logo.png`. Pulling the lamp cord reveals it in a large
circular frame against a warm ivory background. The surrounding screen stays
dark to keep the spotlight visible. The same logo is used for the browser tab
icon and Apple touch icon.
