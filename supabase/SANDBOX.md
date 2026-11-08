# Real Stripe sandbox verification

The isolated test store is `https://hoangcaster-website.github.io/nornail/?sandbox=1&lang=en`.
Instructions and test cards are at `/sandbox.html`.

This uses a real temporary Stripe sandbox provisioned with the official CLI
`@stripe/cli@1.55.8`, not a simulated payment screen. No live Stripe account,
bank details, customer email login or email-notification provider is configured.
The sandbox expires on **2026-11-15**. The server stops using its keys at
`2026-11-15T00:00:00Z` even if a cached isolate is still running.

## Isolation

- The real store keeps `nornails-api`, its eight unpriced products, checkout off,
  and its own browser cart. Existing notes and the other app are unchanged.
- `nornails-sandbox-api` uses only `nornails_sandbox_*` tables. A private config
  table references two new encrypted Vault entries: its test API key and webhook
  signing secret. Neither is present in static files, source, or public responses.
- Both `anon` and `authenticated` are denied access to the new tables and to
  `vault.decrypted_secrets`. RLS is enabled and public grants are revoked.
- The PostgreSQL adapter accepts only the two explicit namespace choices. The
  sandbox entrypoint rejects live keys; the shared worker also refuses live-mode
  checkout/webhook processing whenever `TEST_ONLY` is set.
- Stripe's claimable sandbox key uses the `rkcs_test_` prefix. It is recognized as
  test-only, alongside `sk_test_` and `rk_test_`.
- Sandbox carts and checkout attempt IDs use separate localStorage keys. Test
  flags survive checkout, success/cancellation URLs, language changes and store
  back links. Exiting test mode restores the original real-store cart.
- Test pages carry a NO/EN warning banner and `noindex,nofollow`. The guide states
  that prices/shipping are examples and no goods are sold or delivered.

## Test data

The sandbox has eight sample product prices and NOK 25 sample shipping. For
example, 2 × W1 at NOK 100 plus 1 × buffer at NOK 10 and shipping gives NOK 235.
These values exist only in the sandbox tables and are not merchant prices.

Use card `4242 4242 4242 4242`, a future expiry (for example `12/34`) and CVC `123`.
The guide also lists `4000 0000 0000 9995` for an insufficient-funds decline.
Use dummy contact details such as `test@example.com`. No funds move.

## Deployed components

- Function: `supabase/functions/nornails-sandbox-api/index.ts`
- API: `https://clyshqnbxapwipacbaxd.supabase.co/functions/v1/nornails-sandbox-api`
- Webhook: the API base plus `/api/stripe/webhook`
- Snapshot events: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`
- Webhook API version: `2026-10-28.endive`
- Migration: `20261108083509_nornails_stripe_sandbox.sql` (already applied)

Run `node scripts/prepare-supabase.mjs` to refresh generated dependencies for both
functions. Deploy only the intended function. Its `deno.json` and `deno.lock` pin
the PostgreSQL driver. Gateway JWT verification stays off; the handler checks
webhook signatures and does not offer public admin write access.

No CLI profile, API secret, webhook secret or claim URL is committed. Temporary
CLI credentials are stored outside the repository. Renewal requires a new valid
sandbox/key pair and matching webhook secret; update only the sandbox Vault
references/expiry and the test guide. Do not replace the real store's settings.
For a permanent merchant, configure a merchant-owned Stripe environment separately.

## Evidence

- All 34 automated checks pass, including test/live guards, namespace boundaries,
  environment-preserving return URLs and independent cart/retry state.
- Actual hosted Supabase API created a Stripe Checkout session for the NOK 235
  multi-item order. The displayed QR was decoded and matched the full Stripe URL,
  including its fragment.
- The official `4242` card completed payment on `checkout.stripe.com`. Stripe sent
  its signed webhook; the database recorded a test paid order/event. A second
  open invoice tab automatically changed from Unpaid to Paid and removed its QR.
  Only the sandbox cart was settled; the normal cart was retained.
- Responsive checks passed at 1440/768/390/320px. The normal checkout/delivery
  toggle regression suite and iPhone 13 touch controls also passed.
- Real-store products remain eight, priced products zero, and real orders zero.
  The checksum of the existing notes matched the pre-change value.
- Security advisors report the expected informational findings for intentionally
  private RLS tables; unrelated pre-existing findings were not changed.

References: [Stripe sandboxes](https://docs.stripe.com/sandboxes),
[temporary CLI sandboxes](https://docs.stripe.com/cli/sandbox),
[test cards](https://docs.stripe.com/testing),
[Supabase Vault](https://supabase.com/docs/guides/database/vault).
