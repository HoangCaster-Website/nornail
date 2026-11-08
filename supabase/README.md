# Nornails — connected Supabase backend

Project: `clyshqnbxapwipacbaxd`. The storefront remains on GitHub Pages and reads
`https://clyshqnbxapwipacbaxd.supabase.co/functions/v1/nornails-api/api/catalog`.
The separate `nornails-api` Edge Function is deployed. No Cloudflare account or D1
deployment is needed for this store.

A separate **[Stripe sandbox](SANDBOX.md)** is now available for real-provider test
payments through `?sandbox=1`. Its temporary account, prices, orders, cart and API
are isolated from the real store described below. Test access expires 2026-11-15.

## Current state

- Eight confirmed products are stored in `nornails_products`; prices are unset.
- Checkout is off. No Stripe credentials have been added or payments collected.
- Admin login/account configuration is deferred at the owner's request. No email
  has been assigned and no account or invitation email has been created.
- `admin.html` opens without a login gate, reads the public catalogue when no local
  draft exists, and explicitly labels edits as browser drafts. It does not publish
  unauthenticated changes. A saved local draft survives refreshes and exports.
- Private admin endpoints remain closed. Connecting a database does not itself
  grant public write access or authorize users of the other application.

## Isolated database objects

Only these eleven new tables were added:

| Table | Purpose |
| --- | --- |
| `nornails_products` | Product data, price in øre, visibility, version |
| `nornails_settings` | Delivery choices, confirmed fees, checkout settings |
| `nornails_orders` | Immutable order totals, delivery snapshot, payment state |
| `nornails_sessions` | Hashed, expiring store admin sessions |
| `nornails_admin_credentials` | Reserved single-store credentials; currently empty |
| `nornails_rate_limits` | Server request counters |
| `nornails_stripe_events` | Webhook deduplication |
| `nornails_stripe_merchants` | Connected merchant per Stripe mode |
| `nornails_connect_invites` | Hashed onboarding invitations |
| `nornails_connect_states` | One-time OAuth state |
| `nornails_connect_sessions` | Scoped merchant onboarding sessions |

Existing `notes`, `backend_*` objects and the `notebyme-api` function are untouched.
The column/RLS fingerprints of all five existing tables, and the content checksum
of all three notes, matched before and after the deployment.

RLS is enabled on every new table. Explicit grants revoke `PUBLIC`, `anon` and
`authenticated` access. All rows are accessed through the store's server-side
queries, with private API authorization enforced there. The publishable key cannot
read orders/credentials or mutate products. RLS-without-policy informational
advisor findings are expected for these intentionally server-only tables.

The Edge Function uses Supabase's built-in `SUPABASE_DB_URL`, a pool of at most one
connection per isolate, no prepared statements, and a statement timeout. Database
credentials never reach the frontend. The PostgreSQL adapter only accepts the
checked-in statement allowlist and maps tables to `public.nornails_*`; values
remain bound parameters. Multi-statement operations commit or roll back together.

## Source and deployment

1. Edit the shared API in `backend/worker.mjs` / `backend/connect.mjs`.
2. Run `node scripts/prepare-supabase.mjs` from the repository root. This refreshes
   `backend/statements.mjs` and copies the shared modules into the function folder
   (generated copies are gitignored).
3. Run `deno cache --config supabase/functions/nornails-api/deno.json supabase/functions/nornails-api/index.ts` to check the pinned
   `postgres@3.4.7` dependency. Commit `deno.json` and `deno.lock`.
4. Deploy **only** `nornails-api`, using its `index.ts`, `deno.json`, `deno.lock`,
   generated `commerce.js` and `backend/*.mjs`. Keep JWT gateway verification off:
   public catalogue routes, signed Stripe webhooks and scoped store bearer tokens
   have separate authorization inside the handler.

The additive migration in `migrations/` is already applied to this shared project.
Do not reset the database, reapply the seed, push an incomplete migration history,
or redeploy another app's function. Further schema changes must name only the
intended Nornails objects and preserve existing tables.

`site-config.js` contains the public API base URL including the function path.
Both the Edge gateway path and function-local path are supported; generated OAuth
callbacks and webhook URLs retain `/functions/v1/nornails-api`.

## Later: admin access and Stripe

Account setup is a separate task. Do not infer an admin email from the public
contact address, reuse another app's accounts, or grant write access to every
Supabase authenticated user. The existing store login supports one explicit
credential record and salted PBKDF2 hashes, never plaintext passwords. No
credential record exists yet. Changes must remain drafts until access is set up.

Only the following **Nornails-specific** server secret names are read:

- `NORNAILS_STRIPE_SECRET_KEY`
- `NORNAILS_STRIPE_WEBHOOK_SECRET` (direct merchant flow)
- `NORNAILS_STRIPE_CONNECT_CLIENT_ID` (optional Connect invitation flow)
- `NORNAILS_STRIPE_CONNECT_WEBHOOK_SECRET` (Connect flow)

Webhook: `https://clyshqnbxapwipacbaxd.supabase.co/functions/v1/nornails-api/api/stripe/webhook`.
OAuth callback: `https://clyshqnbxapwipacbaxd.supabase.co/functions/v1/nornails-api/api/connect/callback`.
No unrelated generic Stripe secrets are read. Confirm prices, delivery fees,
terms and tax settings, then test the complete Stripe flow before enabling checkout.

## Verification performed

- 36 automated API, payment, OAuth, sandbox and PostgreSQL-adapter checks passed.
- All 42 prepared statements ran against the actual hosted PostgreSQL database.
  Version conflicts and successful/failed atomic batches were checked. Every test
  write was rolled back; products remain eight, orders/admins/sessions remain zero.
- Real public catalogue: HTTP 200, `storage: supabase`, checkout/admin unconfigured.
- Private state: 401; unconfigured login/checkout: 503; direct Data API reads of
  private store tables using the publishable key: permission denied.
- Browser QA uses the live API, checks VI/EN admin, retained drafts, no publishing
  from draft edits, and desktop/390/320 px layouts.

The rollback integration runner is `backend/tests/postgres-check.mjs`; it needs a
developer-controlled PostgreSQL connection. It is not exposed as a public route.
Stripe network calls in automated unit/integration tests are mocked. A separate
real Stripe sandbox checkout and signed-webhook end-to-end test has also passed;
see `SANDBOX.md`. No live charge has been made.

References: [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets),
[Postgres from Edge Functions](https://supabase.com/docs/guides/functions/connect-to-postgres),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
