## Clare Vogue frontend

The Next.js app provides a private garment media studio. It signs users in
through Supabase Auth, requires a verified TOTP factor before calling the
backend, loads the signed-in owner's orders and garments, and supports private
media upload, preview, and per-item portfolio consent.

### Local configuration

For Docker Compose, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the
repository-root `.env` file. Also set `SUPABASE_SECRET_KEY` there for the
backend's username registration; it must remain backend-only and must never be
exposed to the frontend. The backend independently verifies the access token
and enforces AAL2 and active owner membership.

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

The studio UI uses the owner-provided Clare's Vogue logo at
`public/clare-vogue-logo.png`. Pulling the lamp cord reveals it in a large
circular frame against a warm ivory background. The surrounding screen stays
dark to keep the spotlight visible. The same logo is used for the browser tab
icon and Apple touch icon.
