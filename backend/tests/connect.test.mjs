import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
import { environment, call, signIn, prepareCheckout, sessionId, eventSignature } from './fixtures.mjs';

function connectEnvironment() {
  return { ...environment(), STRIPE_SECRET_KEY: 'sk_test_platform_fixture', STRIPE_CONNECT_CLIENT_ID: 'ca_fixture', STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_connect_fixture' };
}
const account = { id: 'acct_ownerfixture', charges_enabled: true, payouts_enabled: true, details_submitted: true, requirements: { currently_due: [], past_due: [], pending_verification: [] } };
async function createInvite(env) {
  const admin = await signIn(env);
  const result = await call(env, '/api/admin/connect/invites', { method: 'POST', token: admin, input: { hours: 72, language: 'vi' } });
  assert.equal(result.status, 201);
  return { admin, ...result.data, token: new URLSearchParams(new URL(result.data.url).hash.slice(1)).get('token') };
}
async function native(env, path, token) {
  return worker.fetch(new Request('https://api.example' + path, { method: 'POST', headers: { Origin: 'https://store.example', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token, language: 'vi' }) }), env);
}
async function start(env, token) {
  const response = await native(env, '/api/connect/start', token);
  assert.equal(response.status, 303);
  const url = new URL(response.headers.get('Location'));
  assert.equal(url.hostname, 'connect.stripe.com');
  assert.equal(url.searchParams.get('scope'), 'read_write');
  return { state: url.searchParams.get('state'), cookie: response.headers.get('Set-Cookie').split(';')[0] };
}
async function callback(env, flow, query = 'code=ac_fixture', headers = {}) {
  return worker.fetch(new Request('https://api.example/api/connect/callback?state=' + flow.state + '&' + query, { headers: { Cookie: flow.cookie, ...headers } }), env);
}
function returnedToken(response) { return new URLSearchParams(new URL(response.headers.get('Location')).hash.slice(1)).get('token'); }
async function portalStatus(env, token) { return call(env, '/api/connect/status', { token }); }
async function withStripe(callbackFn, action) {
  const original = globalThis.fetch;
  globalThis.fetch = callbackFn;
  try { return await action(); } finally { globalThis.fetch = original; }
}
const oauthResult = { stripe_user_id: account.id, livemode: false, scope: 'read_write', access_token: 'never-store-this-fixture-token' };

test('only signed-in admins can create setup links; stored invitations contain hashes, not credentials', async () => {
  const env = connectEnvironment();
  assert.equal((await call(env, '/api/admin/connect/invites', { method: 'POST', input: {} })).status, 401);
  const invite = await createInvite(env);
  assert.equal(new URL(invite.url).pathname, '/nornail/stripe-setup.html');
  assert.equal(new URL(invite.url).search, '');
  const row = env.DB.sqlite.prepare('SELECT * FROM connect_invites').get();
  assert.notEqual(row.token_hash, invite.token);
  assert(!JSON.stringify(row).includes(invite.token));
  assert.equal((await portalStatus(env, invite.token)).data.status, 'invited');
  assert.equal((await portalStatus(env, invite.token)).data.canOnboard, false);
  const missing = environment();
  const admin = await signIn(missing);
  assert.equal((await call(missing, '/api/admin/connect/invites', { method: 'POST', token: admin, input: {} })).status, 409);
});

test('OAuth uses a first-party HttpOnly cookie, state nonce and one-time callback; denial is not success', async () => {
  const env = connectEnvironment();
  const invite = await createInvite(env);
  const flow = await start(env, invite.token);
  assert(flow.cookie.startsWith('nornails_connect='));
  assert.equal((await callback(env, { ...flow, cookie: '' })).status, 400);
  const response = await callback(env, flow, 'error=access_denied');
  assert.equal(response.status, 303);
  const result = await portalStatus(env, returnedToken(response));
  assert.equal(result.data.status, 'cancelled');
  assert.equal((await callback(env, flow, 'error=access_denied')).status, 400);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS count FROM stripe_merchants').get().count, 0);
});

test('expired, replaced and revoked invitations cannot authorize an account or reuse a holder session', async () => {
  const env = connectEnvironment();
  const first = await createInvite(env);
  const flow = await start(env, first.token);
  const second = await createInvite(env);
  assert.equal((await portalStatus(env, first.token)).status, 401);
  assert.equal((await callback(env, flow, 'error=access_denied')).status, 401);
  env.DB.sqlite.exec('UPDATE connect_invites SET expires = 1');
  assert.equal((await portalStatus(env, second.token)).status, 401);
  const third = await createInvite(env);
  const thirdFlow = await start(env, third.token);
  const cancelled = await callback(env, thirdFlow, 'error=access_denied');
  const token = returnedToken(cancelled);
  assert.equal((await call(env, '/api/admin/connect/revoke', { method: 'POST', token: third.admin })).status, 200);
  assert.equal((await portalStatus(env, token)).status, 401);
});

test('success comes from verified Stripe account flags, not a return URL or client-provided status', async () => {
  const env = connectEnvironment();
  const invite = await createInvite(env);
  const flow = await start(env, invite.token);
  let exchanges = 0;
  await withStripe(async (url, options) => {
    if (url.endsWith('/oauth/token')) { exchanges++; assert.equal(options.headers.Authorization, 'Basic ' + btoa('sk_test_platform_fixture:')); return Response.json(oauthResult); }
    assert(url.endsWith('/accounts/' + account.id));
    return Response.json(account);
  }, async () => {
    const response = await callback(env, flow);
    assert.equal(response.status, 303);
    assert.equal((await portalStatus(env, returnedToken(response))).data.status, 'success');
    assert.equal((await call(env, '/api/connect/status?status=failed', { token: invite.token })).data.status, 'success');
    assert.equal((await callback(env, flow)).status, 400);
    assert.equal(exchanges, 1);
    const state = (await call(env, '/api/admin/state', { token: invite.admin })).data;
    assert.equal(state.stripe.connect.status, 'success');
    assert.equal(state.stripe.ready, true);
    assert(!JSON.stringify(state).includes(oauthResult.access_token));
  });
});

test('incomplete accounts require hosted onboarding and only an OAuth-verified holder can open it', async () => {
  const env = connectEnvironment();
  const invite = await createInvite(env);
  const flow = await start(env, invite.token);
  const incomplete = { ...account, charges_enabled: false, details_submitted: false, requirements: { currently_due: ['company.tax_id'], pending_verification: [] } };
  let current = incomplete;
  await withStripe(async (url, options) => {
    if (url.endsWith('/oauth/token')) return Response.json(oauthResult);
    if (url.endsWith('/account_links')) {
      assert.equal(options.body.get('account'), account.id);
      assert.equal(options.body.get('type'), 'account_onboarding');
      assert(new URL(options.body.get('return_url')).hash.includes('token=s_'));
      assert(new URL(options.body.get('refresh_url')).hash.includes('refresh=1'));
      return Response.json({ url: 'https://connect.stripe.com/setup/fixture' });
    }
    return Response.json(current);
  }, async () => {
    const response = await callback(env, flow);
    const holder = returnedToken(response);
    const status = (await portalStatus(env, holder)).data;
    assert.equal(status.status, 'needs_information');
    assert.equal(status.canOnboard, true);
    assert.equal((await native(env, '/api/connect/onboard', invite.token)).status, 401);
    const link = await native(env, '/api/connect/onboard', holder);
    assert.equal(link.status, 303);
    assert.equal(link.headers.get('Location'), 'https://connect.stripe.com/setup/fixture');
    current = { ...account, payouts_enabled: false, requirements: { pending_verification: ['individual.verification.document'] } };
    assert.equal((await portalStatus(env, holder)).data.status, 'pending');
    current = account;
    assert.equal((await portalStatus(env, holder)).data.status, 'success');
  });
});

test('failed code exchanges and Stripe mode mismatches never connect the merchant', async () => {
  for (const result of [{ error: 'invalid_grant' }, { ...oauthResult, livemode: true }, { ...oauthResult, scope: 'read_only' }]) {
    const env = connectEnvironment();
    const invite = await createInvite(env);
    const flow = await start(env, invite.token);
    await withStripe(async () => Response.json(result, { status: result.error ? 400 : 200 }), async () => {
      const response = await callback(env, flow);
      assert.equal((await portalStatus(env, returnedToken(response))).data.status, 'failed');
      assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS count FROM stripe_merchants').get().count, 0);
    });
  }
});

test('Connect checkout charges the authorized merchant; cross-account webhooks cannot mark orders paid', async () => {
  const env = connectEnvironment();
  // Prepare legacy fixture prices/settings first, then enable Connect for this test.
  const clientId = env.STRIPE_CONNECT_CLIENT_ID;
  delete env.STRIPE_CONNECT_CLIENT_ID;
  await prepareCheckout(env, 9900);
  env.STRIPE_CONNECT_CLIENT_ID = clientId;
  assert.equal((await call(env, '/api/catalog')).data.checkout.enabled, false);
  env.DB.sqlite.prepare('INSERT INTO stripe_merchants VALUES (?, ?, ?, ?)').run('test', account.id, 'success', new Date().toISOString());
  const requestId = crypto.randomUUID();
  await withStripe(async (url, options) => {
    if (url.includes('/accounts/')) return Response.json(account);
    assert.equal(options.headers['Stripe-Account'], account.id);
    return Response.json({ id: sessionId, url: 'https://checkout.stripe.com/c/pay/connectfixture' });
  }, async () => {
    assert.equal((await call(env, '/api/checkout', { method: 'POST', input: { requestId, items: [{ id: 'w1', quantity: 1 }] } })).status, 200);
  });
  const event = { id: 'evt_connectedfixture', livemode: false, account: 'acct_wrong', type: 'checkout.session.completed', data: { object: { id: sessionId, metadata: { order_id: requestId }, payment_status: 'paid', currency: 'nok', amount_total: 9900 } } };
  async function send(value, secret) {
    const raw = JSON.stringify(value);
    return call(env, '/api/stripe/webhook', { method: 'POST', origin: null, raw, headers: { 'stripe-signature': eventSignature(raw, secret) } });
  }
  assert.equal((await send(event, env.STRIPE_CONNECT_WEBHOOK_SECRET)).status, 400);
  event.account = account.id;
  assert.equal((await send(event, env.STRIPE_WEBHOOK_SECRET)).status, 400);
  assert.equal((await send(event, env.STRIPE_CONNECT_WEBHOOK_SECRET)).status, 200);
  assert.equal((await call(env, '/api/checkout/status?session_id=' + sessionId)).data.status, 'paid');
  const deauthorized = { id: 'evt_disconnect', livemode: false, account: account.id, type: 'account.application.deauthorized', data: { object: { id: 'ca_fixture' } } };
  assert.equal((await send(deauthorized, env.STRIPE_CONNECT_WEBHOOK_SECRET)).status, 200);
  assert.equal((await call(env, '/api/catalog')).data.checkout.enabled, false);
  const delayed = { ...deauthorized, id: 'evt_old_update', type: 'account.updated', data: { object: account } };
  assert.equal((await send(delayed, env.STRIPE_CONNECT_WEBHOOK_SECRET)).status, 200);
  assert.equal((await call(env, '/api/catalog')).data.checkout.enabled, false);
});

test('native browser setup errors show a readable failure page, without claiming success', async () => {
  const env = connectEnvironment();
  const response = await worker.fetch(new Request('https://api.example/api/connect/callback?state=bad', { headers: { Accept: 'text/html' } }), env);
  assert.equal(response.status, 400);
  assert(response.headers.get('Content-Type').startsWith('text/html'));
  assert((await response.text()).includes('Chưa hoàn tất thiết lập'));
});
