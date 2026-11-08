import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySignature } from '../worker.mjs';
import { password, environment, call, signIn, prepareCheckout, sessionId, eventSignature, sendEvent } from './fixtures.mjs';

test('public catalogue has eight confirmed products, no invented prices and checkout off', async () => {
  const env = environment();
  const { data, response } = await call(env, '/api/catalog');
  assert.equal(data.products.length, 8);
  assert(data.products.every(product => product.priceOre === null));
  assert.equal(data.checkout.enabled, false);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await call(env, '/api/admin/state')).status, 401);
  assert.equal((await call(env, '/api/checkout', { method: 'POST', input: {} })).status, 503);
});

test('admin authentication is server-enforced; wrong origins and expired/revoked tokens are rejected', async () => {
  const env = environment();
  assert.equal((await call(env, '/api/admin/login', { method: 'POST', input: { email: env.ADMIN_EMAIL, password: 'wrong' } })).status, 401);
  const token = await signIn(env);
  assert.equal((await call(env, '/api/admin/state', { token })).status, 200);
  const denied = await call(env, '/api/admin/state', { token, origin: 'https://attacker.invalid' });
  assert.equal(denied.status, 403);
  assert.equal(denied.response.headers.get('Access-Control-Allow-Origin'), null);
  const preflight = await call(env, '/api/admin/state', { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.response.headers.get('Access-Control-Allow-Origin'), 'https://store.example');
  env.DB.sqlite.exec('UPDATE sessions SET expires = 1');
  assert.equal((await call(env, '/api/admin/state', { token })).status, 401);
  const next = await signIn(env);
  assert.equal((await call(env, '/api/admin/logout', { method: 'POST', token: next })).status, 200);
  assert.equal((await call(env, '/api/admin/state', { token: next })).status, 401);
});

test('login rate limiting persists in D1 across requests', async () => {
  const env = environment();
  for (let attempt = 0; attempt < 5; attempt++) assert.equal((await call(env, '/api/admin/login', { method: 'POST', input: { email: env.ADMIN_EMAIL, password: 'wrong' } })).status, 401);
  assert.equal((await call(env, '/api/admin/login', { method: 'POST', input: { email: env.ADMIN_EMAIL, password } })).status, 429);
});

test('product CRUD persists prices, translations and visibility; optimistic versions prevent lost edits', async () => {
  const env = environment();
  const token = await signIn(env);
  const source = globalThis.nornailsCatalog[0];
  assert.equal((await call(env, '/api/admin/products', { method: 'POST', input: { ...source, id: 'custom' } })).status, 401);
  const created = await call(env, '/api/admin/products', { method: 'POST', token, input: { ...source, id: 'custom', priceOre: 29990, active: false, name: 'Ny vare', translations: { en: { ...source.translations.en, name: 'New item' } } } });
  assert.equal(created.status, 201);
  assert.equal((await call(env, '/api/catalog')).data.products.length, 8);
  const edited = await call(env, '/api/admin/products/custom', { method: 'PUT', token, input: { ...created.data, active: true } });
  assert.equal(edited.data.version, 2);
  const publicProduct = (await call(env, '/api/catalog')).data.products.find(product => product.id === 'custom');
  assert.equal(publicProduct.priceOre, 29990);
  assert.equal(publicProduct.translations.en.name, 'New item');
  assert.equal((await call(env, '/api/admin/products/custom', { method: 'PUT', token, input: created.data })).status, 409);
  assert.equal((await call(env, '/api/admin/products/custom?version=1', { method: 'DELETE', token })).status, 409);
  assert.equal((await call(env, '/api/admin/products/custom?version=2', { method: 'DELETE', token })).status, 200);
  assert.equal((await call(env, '/api/catalog')).data.products.length, 8);
});

test('invalid prices, unsafe image schemes and malformed bodies are rejected', async () => {
  const env = environment();
  const token = await signIn(env);
  for (const changes of [{ priceOre: -100 }, { priceOre: 1.5 }, { image: 'javascript:alert(1)' }, { image: 'assets/images/../w1.webp' }, { category: 'vipper' }, { id: 'not a valid id' }]) {
    const result = await call(env, '/api/admin/products', { method: 'POST', token, input: { ...globalThis.nornailsCatalog[0], id: 'invalid', ...changes } });
    assert.equal(result.status, 400);
  }
  assert.equal((await call(env, '/api/admin/products', { method: 'POST', token, raw: '{', headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal((await call(env, '/api/admin/products', { method: 'POST', token, input: null })).status, 400);
  assert.equal((await call(env, '/api/admin/products', { method: 'POST', token, raw: 'x'.repeat(70000), headers: { 'Content-Type': 'application/json' } })).status, 413);
  assert.equal(globalThis.nornailsCommerce.price('299,90'), 29990);
  assert.equal(globalThis.nornailsCommerce.price(''), null);
  assert.throws(() => globalThis.nornailsCommerce.price('1e3'));
  assert.throws(() => globalThis.nornailsCommerce.price('0'));
});

test('checkout cannot be enabled before server credentials and confirmed business settings exist', async () => {
  const env = environment();
  const token = await signIn(env);
  const input = { ...globalThis.nornailsCommerce.defaults, enabled: true };
  assert.equal((await call(env, '/api/admin/settings', { method: 'PUT', token, input })).status, 400);
  assert.equal((await call(env, '/api/admin/settings', { method: 'PUT', token, input: { ...input, termsUrl: 'https://store.example/terms', termsConfirmed: true } })).status, 409);
});

test('Stripe checkout uses server prices, safe return URLs and idempotency, ignoring browser amounts', async () => {
  const env = environment();
  await prepareCheckout(env);
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith('/checkout/sessions') ? { id: sessionId, url: 'https://checkout.stripe.com/c/pay/fixture' } : { id: sessionId, status: 'open', url: 'https://checkout.stripe.com/c/pay/fixture' });
  };
  try {
    const input = { requestId: crypto.randomUUID(), language: 'en', items: [{ id: 'w1', quantity: 2, priceOre: 1 }], priceOre: 1, success_url: 'https://attacker.invalid' };
    const result = await call(env, '/api/checkout', { method: 'POST', input });
    assert.equal(result.status, 200);
    const params = calls[0].options.body;
    assert.equal(params.get('line_items[0][price_data][unit_amount]'), '12345');
    assert.equal(params.get('line_items[0][quantity]'), '2');
    assert.equal(params.get('line_items[0][price_data][currency]'), 'nok');
    assert(params.get('success_url').startsWith('https://store.example/nornail/payment.html?'));
    assert(params.get('success_url').includes('{CHECKOUT_SESSION_ID}'));
    assert.equal(calls[0].options.headers['Idempotency-Key'], input.requestId);
    assert.equal(env.DB.sqlite.prepare('SELECT amount FROM orders').get().amount, 24690);
    assert.equal((await call(env, '/api/checkout', { method: 'POST', input })).status, 200);
    assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
    assert.equal((await call(env, '/api/checkout', { method: 'POST', input: { ...input, items: [{ id: 'w1', quantity: 3 }] } })).status, 409);
    assert.equal((await call(env, '/api/checkout', { method: 'POST', input: { ...input, requestId: crypto.randomUUID(), items: [{ id: 'w2', quantity: 1 }] } })).status, 400);
    assert.equal((await call(env, '/api/checkout', { method: 'POST', input: { ...input, items: [{ id: 'w1', quantity: -1 }] } })).status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test('signed webhooks confirm matching orders atomically; forged/replayed/mismatched events cannot mark paid', async () => {
  const env = environment();
  await prepareCheckout(env, 9900);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ id: sessionId, url: 'https://checkout.stripe.com/c/pay/fixture' });
  const requestId = crypto.randomUUID();
  try { assert.equal((await call(env, '/api/checkout', { method: 'POST', input: { requestId, items: [{ id: 'w1', quantity: 1 }] } })).status, 200); }
  finally { globalThis.fetch = originalFetch; }
  const event = { id: 'evt_fixture', livemode: false, type: 'checkout.session.completed', data: { object: { id: sessionId, metadata: { order_id: requestId }, payment_status: 'paid', amount_total: 9900, currency: 'nok', customer_details: { email: 'buyer@example.invalid' } } } };
  assert.equal((await sendEvent(env, event, 't=1,v1=invalid')).status, 400);
  const badAmount = structuredClone(event); badAmount.data.object.amount_total = 1;
  assert.equal((await sendEvent(env, badAmount)).status, 400);
  const badMode = { ...event, livemode: true };
  assert.equal((await sendEvent(env, badMode)).status, 400);
  assert.equal((await call(env, '/api/checkout/status?session_id=' + sessionId)).data.status, 'pending');
  assert.equal((await sendEvent(env, event)).status, 200);
  assert.equal((await sendEvent(env, event)).status, 200);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS count FROM stripe_events').get().count, 1);
  const late = { ...event, id: 'evt_late', type: 'checkout.session.expired', data: { object: { ...event.data.object, payment_status: 'unpaid' } } };
  assert.equal((await sendEvent(env, late)).status, 200);
  const status = (await call(env, '/api/checkout/status?session_id=' + sessionId)).data;
  assert.equal(status.status, 'paid');
  assert.equal(status.email, undefined);
  assert.equal((await call(env, '/api/admin/state', { token: await signIn(env) })).data.orders[0].email, 'buyer@example.invalid');
  assert.equal((await call(env, '/api/checkout/status?session_id=bad')).status, 400);
});

test('signature verification tolerates key rotation but rejects stale or altered payloads', async () => {
  const raw = '{"event":"test"}';
  const signature = eventSignature(raw);
  assert(await verifySignature(raw, signature + ',v1=' + '0'.repeat(64), 'whsec_fixture'));
  assert.equal(await verifySignature(raw + ' ', signature, 'whsec_fixture'), false);
  assert.equal(await verifySignature(raw, eventSignature(raw, 'whsec_fixture', Math.floor(Date.now() / 1000) - 600), 'whsec_fixture'), false);
});
