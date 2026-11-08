# Nornails admin & Stripe

The storefront and `admin.html` stay on **GitHub Pages**. The separate API uses a Cloudflare Worker and a D1 database. No customer account, Stripe account, API key, password or cloud resource has been created as part of this setup.

## What works before connecting a server

Open `/admin.html` through the same static HTTP server used for the storefront. You can add, edit, hide and delete products, edit Norwegian/English copy and NOK prices, and export/import a catalogue JSON file. Drafts persist in the current browser only. They do **not** change the public storefront. A blank price means contact for price. The checkout switch cannot be enabled in local draft mode.

The admin interface supports Vietnamese/English (VI/EN), defaults to Vietnamese, and remembers the selection. Product content supports Norwegian/English independently of the admin language. Images accept existing `assets/images/` paths or public HTTPS image URLs. Uploading image files to cloud storage is not included.

## Deploy the API when accounts are available

Requires Node.js 22+ and a Cloudflare account with Workers and D1 access. Commands below run **inside `backend/`**. Choose the Cloudflare plan and any associated cost yourself; no resources have been provisioned automatically.

```sh
npm ci
npx wrangler login
npx wrangler d1 create nornails
```

1. Copy the returned database ID into `wrangler.jsonc` → `d1_databases[0].database_id`.
2. Set `vars.STOREFRONT_URL` to the full storefront base URL **with a trailing slash**, including the repository path for GitHub Pages, for example `https://hoangcaster-website.github.io/nornail/`. This value controls Stripe return URLs.
3. Set `vars.ALLOWED_ORIGINS` to an exact comma-separated list of allowed origins, for example `https://hoangcaster-website.github.io,https://nornails.no`. Origins have no path or trailing slash. Remove localhost entries in production.
4. If you have edited a browser draft, export it. **Before applying any migrations for the first time**, you may generate the initial catalogue from that file:

```sh
node make-seed.mjs /path/to/nornails-catalog.json --replace-initial-seed
```

Do not rewrite an applied migration. Existing connected stores should be updated through the admin product editor. Keep exports as backups.

```sh
npm run migrate:remote
node password-hash.mjs
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD_HASH
npm run deploy
```

Choose a unique admin password of at least 14 characters. `password-hash.mjs` reads it without echo, emits a salted PBKDF2 hash, and never stores the raw password. Supply the generated hash to the `ADMIN_PASSWORD_HASH` secret prompt. Supply the intended login email to `ADMIN_EMAIL`; it is not inferred from the public contact email. There is no default login and no public signup route.

In the root `site-config.js`, set only the public API origin:

```js
globalThis.nornailsConfig = Object.freeze({ apiUrl: 'https://nornails-api.YOUR-SUBDOMAIN.workers.dev' });
```

Push the static files to GitHub Pages. Open `/admin.html`, choose **Connect store**, and enter the API URL and configured credentials. The connected admin loads server data. Product/price changes are saved in D1 and appear on subsequent storefront loads in both languages. Browser drafts remain separate and can be exported before connecting. The bearer session is held in memory, expires after two hours, and is invalidated by sign-out. Reloading requires signing in again. No password or Stripe key is saved in browser storage.

## Customer setup by link — Stripe Connect

The Payments screen now has **Create setup link / Tạo link thiết lập**. The owner opens the private invitation, authorizes the website through Stripe Connect OAuth, and completes any remaining business/identity/bank requirements on Stripe-hosted onboarding. The return page reports **successful**, **needs information**, **pending Stripe review**, **cancelled**, **failed** or **disconnected** based on a server-side Stripe account check. Returning from Stripe alone never means success. No Stripe password, bank details, identity documents or customer secret keys are collected by the website.

One-time developer/platform setup is still necessary. GitHub Pages alone cannot generate authenticated invitations, exchange OAuth codes or verify account status. No live Connect account has been registered or tested during implementation.

1. Deploy the API/database as described above, including migration `0003_connect.sql`, and set the public API origin in root `site-config.js`. The invitation page trusts only that configured API, never an API URL supplied in a shared link.
2. Enable/register **Stripe Connect** for the website operator/platform in Stripe Dashboard. This integration uses OAuth to authorize an independently owned account; customers may choose an existing Stripe account or create one in Stripe’s authorization flow. Use the test Connect **client ID** (`ca_…`) and the matching **platform test secret key**, not a customer's key. Configure your platform branding and supported account countries. The integration does not create legacy Express/Custom accounts, charge a platform fee or automatically change the checkout switch.
3. Register the exact OAuth redirect URI `https://YOUR-API/api/connect/callback` in the Connect application settings. It must match the actual API origin. A mismatched URI/client ID or test/live mode causes setup to fail.

```sh
npx wrangler secret put STRIPE_CONNECT_CLIENT_ID
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_CONNECT_WEBHOOK_SECRET
```

4. The Connect webhook destination is `https://YOUR-API/api/stripe/webhook`, configured for **events on connected accounts**. Subscribe to the four checkout events listed below plus `account.updated` and `account.application.deauthorized`. Store this endpoint's `whsec_…` value as `STRIPE_CONNECT_WEBHOOK_SECRET`. The older `STRIPE_WEBHOOK_SECRET` is for direct-account events only; connected-account events require the Connect signing secret.
5. In admin, sign in to the API, open Payments, choose a link lifetime (24 hours, 3 days, or 7 days), and create/copy the invitation. It is a URL on your own site with a random credential in the fragment, not a raw Stripe Account Link. Creation invalidates older invitations and holder sessions in the same Stripe mode. Only the hash is stored; the URL is displayed once in the current admin session. **Revoke setup links** invalidates invitations without disconnecting an existing merchant.
6. Send the invitation to the actual store owner yourself. No email/message is sent by the implementation. The owner clicks **Continue with Stripe**, authorizes the connection, and returns to the result page. Stripe OAuth state is one-use, expires after 10 minutes, and is tied to an HttpOnly, Secure, SameSite=Lax cookie on the API. Use the same browser throughout. After OAuth, only the authenticated holder session can create the short-lived Stripe-hosted Account Link. Raw Account Link URLs are never exposed as shareable invitations. Expired onboarding sessions can be resumed from the result page.
7. The server verifies `details_submitted`, charges/payouts enablement, outstanding/past-due requirements and pending verification. **Pending review is not reported as success or failure.** OAuth errors, cancellation, revocation, expired invitations and network errors have separate states. Admin can refresh the merchant status. The first authorized merchant is fixed per test/live mode; later invitations cannot silently replace it with a different account.
8. Only after setup succeeds, confirm prices/tax/shipping/terms, enable test checkout, and test a full payment and webhook. Checkout is created as a **direct charge on the authorized merchant account** using `Stripe-Account`; no payment is silently routed to the platform as a fallback. Orders store the connected account ID, and a different account's webhook cannot mark them paid. Checkout retrieves the current Stripe account before creating each payment. A deauthorization event disables checkout readiness and delayed events cannot reconnect the account.
9. To go live, turn checkout off, configure matching live platform key/client ID and the live Connect webhook secret, create a new **live** invitation, complete the owner’s setup, and verify live configuration before enabling checkout. Test and live merchant records/invitations are separate. Local SQLite/HTTP mocks verify the code path; actual Stripe Connect and bank/identity verification need the operator/client’s real accounts and a deployed HTTPS API.

New API endpoints: authenticated admin `POST /api/admin/connect/invites`, `POST /api/admin/connect/refresh`, `POST /api/admin/connect/revoke`; invitation-scoped `GET /api/connect/status`; top-level form POSTs `/api/connect/start`, `/api/connect/onboard`; OAuth callback `GET /api/connect/callback`. Invitation credentials grant no access to product management or customer orders. The portal never accepts a `success=1` flag as proof of completion. Its `strict-origin` referrer policy keeps invitation credentials in fragments while allowing the API to verify the origin of top-level form POSTs.

References: [Connect OAuth](https://docs.stripe.com/connect/oauth-reference), [Stripe-hosted onboarding and return states](https://docs.stripe.com/connect/hosted-onboarding), [direct charges](https://docs.stripe.com/connect/direct-charges).

## Direct Stripe setup — optional existing flow

1. Obtain a test secret key from the client's Stripe account. Configure public business details and a terms-of-service URL in Stripe's Dashboard. Set the key **as a Worker secret**, never in GitHub or `site-config.js`:

```sh
npx wrangler secret put STRIPE_SECRET_KEY
```

2. Register `https://YOUR-API/api/stripe/webhook` as a Stripe webhook endpoint. Subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
3. Copy this endpoint's signing secret (`whsec_…`) into the server:

```sh
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

4. Refresh the admin and open **Payments**. **Check Stripe connection** verifies the API key against the Stripe account; it does not verify actual webhook delivery.
5. Enter confirmed product prices. Enable the delivery methods offered by the store (pickup, delivery within Norway, or both) and enter the confirmed shipping fee. The buyer selects a method before placing the order; a blank fee is not treated as free delivery. Choose the confirmed tax treatment: prices already include applicable tax, or Stripe Tax with inclusive prices (requires Stripe Tax activation, registrations and appropriate product tax settings in Stripe). Add the actual HTTPS terms URL and confirm the settings. Checkout remains off until explicitly enabled by the admin and until the server has the required credentials/HTTPS return URL.
6. Enable checkout in **test mode**. Buy a priced product from the storefront. Stripe collects billing details; shipping addresses are collected for the shipping option. Verify that the order first opens `payment.html` with its line items, shipping charge, total, Unpaid status and a scannable QR code. The QR opens the same Stripe Checkout session as the pay-on-this-device button. After payment, verify that the signed webhook changes the existing invoice/QR panel to **Paid** and removes the payable QR. Verify cancellation, retries, failure and unpriced/hidden products too. Test payments are labelled in the storefront, return page and orders.
7. When the client's account, prices, tax, shipping and terms are ready, turn checkout **off**, replace the secret key and the live endpoint's signing secret with their live values, verify the connection, then explicitly enable checkout. Mode comes from the server key; the browser cannot change it.

This uses hosted Stripe Checkout; no publishable key is needed for the server-created redirect. The browser submits product IDs, quantities and the buyer’s selected delivery method only. Amounts come from D1 in integer øre. Stripe receives the latest server price and the configured delivery/tax settings. Orders are marked paid only after a valid webhook with matching amount, currency, session and mode. The return URL alone never marks an order paid. Webhook handling is idempotent and does not regress paid orders on delayed events. Store fulfillment and any business-specific email workflow remain manual; no sample customers, inventory, tax rate or sales have been invented.

## Buyer delivery choice, order summary and payment QR

Apply migration `0004_order_payment.sql` before deploying this version. Admin settings now offer `pickupEnabled`, `shippingEnabled` and `shippingOre`; they do not select one method for all orders. A shipping price is required before delivery can be offered in enabled checkout. Previously saved pickup-only settings do not silently enable an unconfirmed shipping fee. The buyer must select `fulfillment: "pickup"` or `"shipping"` when submitting `POST /api/checkout`; the server checks whether that method is offered and calculates the fee itself.

The checkout response contains `sessionId`, the hosted Stripe `url`, and `invoiceUrl`. The storefront navigates to the site's `payment.html`, where `GET /api/checkout/invoice?session_id=...` returns the immutable order snapshot: items, quantities, prices, subtotal, shipping, total, delivery choice, provider expiry and current payment state. The QR is generated locally using vendored `qrcode-generator` 2.0.4 (MIT); payment URLs are not sent to any external QR generator. It encodes the same validated HTTPS Stripe Checkout URL used by the direct payment button. It is a QR payment link to Stripe, not a bank-transfer QR or a separately created charge.

While the page is visible, it polls `/api/checkout/status` every 5 seconds, slowing to 15 seconds after 10 minutes. It pauses while hidden and refreshes on return. Paid, processing, failed and expired states remove the payable QR/button. Connection errors show an unknown status and temporarily hide payment actions; an error never turns an unknown payment into a fabricated unpaid or paid result. Rechecking, printing, reloading or scanning the same QR does not create a new checkout session. Both the invoice and QR badge update from the same server state. Test sessions are labelled clearly.

Stripe returns successful payments to `payment.html?session_id={CHECKOUT_SESSION_ID}`. The cancel URL uses the already-known opaque `order_id` instead of depending on a session-ID placeholder; invoice/status endpoints can resolve that reference too. Cancellation returns to the same unpaid order so the buyer can resume the existing session. Merely appending `paid=1` or returning from Stripe cannot confirm payment. Delayed payment methods use `processing` until a signed asynchronous success/failure event arrives.

Shipping addresses collected by Stripe are saved to D1 from verified webhook details and shown only in the authenticated admin order view. Public order summaries do not return customer email or address. Keep order/session links private. The printable page is an order summary; formal tax invoice generation remains a separate business/invoicing configuration, and no tax rate, company registration number or unconfirmed shipping charge is invented.

The full flow has been tested using the real Worker handler, SQLite and Web Crypto with mocked Stripe responses. Real payment/QR scanning through Stripe still requires the customer's configured API and Stripe account; no live charges were made during implementation.

## Local API development

The static site works without any Node dependencies. API work needs the separate backend dependencies:

```sh
npm ci
# Copy .dev.vars.example to .dev.vars and fill local admin secrets.
npm run migrate:local
npm run dev
```

Serve the project root on `http://localhost:4173` and use `http://localhost:8787` in the admin connection form. Local product CRUD/login needs no Stripe key. Checkout readiness intentionally requires an HTTPS storefront return URL; use an HTTPS development storefront when testing the full Stripe redirect flow. For Stripe CLI webhook testing:

```sh
stripe listen --forward-to http://localhost:8787/api/stripe/webhook
```

Set the emitted signing secret in local `.dev.vars`, restart the Worker, and use test keys only. `.dev.vars`, `.env`, dependencies and Wrangler state are gitignored. Never put real credentials into the example files.

## Verification

```sh
npm test
```

The 23 integration tests use an in-memory SQLite D1 adapter, real Web Crypto signatures and mocked Stripe HTTP responses. They cover authentication, session expiry, rate limits, CORS, CRUD, concurrent edits, authoritative prices, disabled checkout, Stripe request encoding, signed webhook verification/idempotency and payment status. Real Stripe end-to-end testing and production deployment remain pending customer/cloud credentials.

References: [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [Stripe webhook signatures and retries](https://docs.stripe.com/events/manage-webhook-endpoints), [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
