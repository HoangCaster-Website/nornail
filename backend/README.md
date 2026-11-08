# Nornails admin & Stripe

The storefront and `admin.html` stay on **GitHub Pages**. The separate API uses a Cloudflare Worker and a D1 database. No customer account, Stripe account, API key, password or cloud resource has been created as part of this setup.

## What works before connecting a server

Open `/admin.html` through the same static HTTP server used for the storefront. You can add, edit, hide and delete products, edit Norwegian/English copy and NOK prices, and export/import a catalogue JSON file. Drafts persist in the current browser only. They do **not** change the public storefront. A blank price means contact for price. The checkout switch cannot be enabled in local draft mode.

The admin interface is in English; product content supports both Norwegian and English. Images accept existing `assets/images/` paths or public HTTPS image URLs. Uploading image files to cloud storage is not included.

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

## Stripe setup — start in test mode

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
5. Enter confirmed product prices. Choose pickup or a confirmed fixed Norwegian shipping fee. Choose the confirmed tax treatment: prices already include applicable tax, or Stripe Tax with inclusive prices (requires Stripe Tax activation, registrations and appropriate product tax settings in Stripe). Add the actual HTTPS terms URL and confirm the settings. Checkout remains off until explicitly enabled by the admin and until the server has the required credentials/HTTPS return URL.
6. Enable checkout in **test mode**. Buy a priced product from the storefront. Stripe collects billing details; shipping addresses are collected for the shipping option. Verify that the signed webhook changes the order to **Paid** and that `payment.html` displays confirmation. Verify cancellation, retries, failure and unpriced/hidden products too. Test payments are labelled in the storefront, return page and orders.
7. When the client's account, prices, tax, shipping and terms are ready, turn checkout **off**, replace the secret key and the live endpoint's signing secret with their live values, verify the connection, then explicitly enable checkout. Mode comes from the server key; the browser cannot change it.

This uses hosted Stripe Checkout; no publishable key is needed for the server-created redirect. The browser submits product IDs and quantities only. Amounts come from D1 in integer øre. Stripe receives the latest server price and the configured delivery/tax settings. Orders are marked paid only after a valid webhook with matching amount, currency, session and mode. The return URL alone never marks an order paid. Webhook handling is idempotent and does not regress paid orders on delayed events. Store fulfillment and any business-specific email workflow remain manual; no sample customers, inventory, tax rate or sales have been invented.

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

The integration tests use an in-memory SQLite D1 adapter, real Web Crypto signatures and mocked Stripe HTTP responses. They cover authentication, session expiry, rate limits, CORS, CRUD, concurrent edits, authoritative prices, disabled checkout, Stripe request encoding, signed webhook verification/idempotency and payment status. Real Stripe end-to-end testing and production deployment remain pending customer/cloud credentials.

References: [Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create), [Stripe webhook signatures and retries](https://docs.stripe.com/events/manage-webhook-endpoints), [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/), [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
