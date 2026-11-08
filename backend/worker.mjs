import '../commerce.js';
import { createConnect } from './connect.mjs';

const rules = globalThis.nornailsCommerce;
const encoder = new TextEncoder();
const SESSION_SECONDS = 7200;
const STRIPE_VERSION = '2026-10-28.endive';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
function validate(validator, input) {
  try { return validator(input); } catch (error) { fail(400, error.message); }
}
const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const hash = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
function equal(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Send application/json.');
  const raw = await readLimited(request, 65536);
  let input;
  try { input = JSON.parse(raw); } catch { fail(400, 'Invalid JSON.'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Send a JSON object.');
  return input;
}
async function readLimited(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) fail(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); fail(413, 'Request too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
const decodeProduct = row => ({ ...JSON.parse(row.data), version: row.version });
async function settings(env) {
  const row = await env.DB.prepare('SELECT data FROM settings WHERE id = 1').first();
  return row ? JSON.parse(row.data) : { ...rules.defaults };
}
function stripeMode(env) { return /^sk_test_/.test(env.STRIPE_SECRET_KEY || '') ? 'test' : /^sk_live_/.test(env.STRIPE_SECRET_KEY || '') ? 'live' : 'unconfigured'; }
async function ready(env) {
  if (stripeMode(env) === 'unconfigured' || !/^https:\/\//.test(env.STOREFRONT_URL || '')) return false;
  if (!connect.enabled(env)) return /^whsec_/.test(env.STRIPE_WEBHOOK_SECRET || '');
  if (!connect.configured(env) || !/^whsec_/.test(env.STRIPE_CONNECT_WEBHOOK_SECRET || '')) return false;
  return (await connect.merchant(env))?.status === 'success';
}
async function rateLimit(request, env, scope, maximum) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const now = Math.floor(Date.now() / 1000);
  const bucket = `${scope}:${await hash(ip)}:${Math.floor(now / 900)}`;
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires < ?').bind(now).run();
  const row = await env.DB.prepare('INSERT INTO rate_limits (bucket, count, expires) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = count + 1 RETURNING count').bind(bucket, now + 900).first();
  if (row.count > maximum) fail(429, 'Too many attempts. Please wait 15 minutes.');
}
async function authenticate(request, env) {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) fail(401, 'Please sign in again.');
  const row = await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash = ? AND expires > ?').bind(await hash(token), Math.floor(Date.now() / 1000)).first();
  if (!row) fail(401, 'Your session has expired. Please sign in again.');
  return row.token_hash;
}
async function login(request, env) {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) fail(503, 'Admin credentials have not been configured on the server.');
  await rateLimit(request, env, 'login', 5);
  const input = await body(request);
  if (typeof input.email !== 'string' || typeof input.password !== 'string' || input.password.length > 512) fail(401, 'Incorrect email or password.');
  const [salt, expected] = env.ADMIN_PASSWORD_HASH.split(':');
  if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{64}$/.test(expected || '')) fail(503, 'Invalid server password configuration.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(input.password), 'PBKDF2', false, ['deriveBits']);
  const actual = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(salt.match(/../g), part => parseInt(part, 16)), iterations: 100000, hash: 'SHA-256' }, key, 256));
  if (!equal(actual, expected) || input.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) fail(401, 'Incorrect email or password.');
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires <= ?').bind(now),
    env.DB.prepare('INSERT INTO sessions (token_hash, expires) VALUES (?, ?)').bind(await hash(token), now + SESSION_SECONDS)
  ]);
  return json({ token, expiresIn: SESSION_SECONDS });
}
async function stripe(env, path, options = {}) {
  let response;
  try {
    response = await fetch(`https://api.stripe.com/v1/${path}`, { ...options, signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Stripe-Version': STRIPE_VERSION, ...options.headers } });
  } catch { fail(502, 'Stripe could not be reached. Please try again.'); }
  const result = await response.json();
  if (!response.ok) fail(502, 'Stripe rejected the request. Check server credentials and Stripe settings.');
  return result;
}
const connect = createConnect({ json, fail, hash, hex, stripe, stripeMode, body, readLimited, rateLimit });
async function checkout(request, env) {
  const config = await settings(env);
  if (!config.enabled || !await ready(env)) fail(503, 'Online payment is not available yet. Contact Nornails to order.');
  let accountId = null;
  if (connect.enabled(env)) {
    accountId = (await connect.merchant(env)).account_id;
    if ((await connect.syncAccount(env, accountId)).status !== 'success') fail(503, 'The merchant Stripe account is not ready for payments.');
  }
  const accountHeaders = accountId ? { 'Stripe-Account': accountId } : {};
  await rateLimit(request, env, 'checkout', 20);
  const input = await body(request);
  if (!/^[a-f0-9-]{36}$/.test(input.requestId || '') || !Array.isArray(input.items) || !input.items.length || input.items.length > 20) fail(400, 'Invalid checkout request.');
  const quantities = new Map();
  for (const item of input.items) {
    if (!item || typeof item.id !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) fail(400, 'Invalid product quantity.');
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);
    if (quantities.get(item.id) > 20) fail(400, 'Maximum quantity is 20 per product.');
  }
  const items = [];
  for (const [id, quantity] of quantities) {
    const row = await env.DB.prepare('SELECT data, version FROM products WHERE id = ?').bind(id).first();
    if (!row) fail(400, 'A product is no longer available.');
    const product = decodeProduct(row);
    if (!product.active || !product.priceOre) fail(400, 'A product is not available for online purchase.');
    items.push({ id, name: product.brand + ' ' + (input.language === 'en' ? product.translations?.en?.name || product.name : product.name), quantity, priceOre: product.priceOre });
  }
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.priceOre, 0);
  const shipping = config.fulfillment === 'shipping' ? config.shippingOre : 0;
  if (subtotal + shipping > 99999999) fail(400, 'Order total is too large. Please contact Nornails.');
  const fingerprint = await hash(JSON.stringify({ items, config, accountId, language: input.language === 'en' ? 'en' : 'nb' }));
  const id = input.requestId;
  const mode = stripeMode(env);
  await env.DB.prepare('INSERT OR IGNORE INTO orders (id, mode, status, amount, currency, items, fingerprint, created_at, stripe_account) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, mode, 'pending', subtotal + shipping, 'nok', JSON.stringify(items), fingerprint, new Date().toISOString(), accountId).run();
  const order = await env.DB.prepare('SELECT fingerprint, mode, status, session_id FROM orders WHERE id = ?').bind(id).first();
  if (order.fingerprint !== fingerprint || order.mode !== mode) fail(409, 'The basket has changed. Start a new checkout.');
  if (order.status !== 'pending') fail(409, 'This checkout has already been completed or expired.');
  if (order.session_id) {
    const existing = await stripe(env, `checkout/sessions/${encodeURIComponent(order.session_id)}`, { headers: accountHeaders });
    if (existing.status !== 'open') fail(409, 'This checkout is no longer open. Start a new checkout.');
    return json({ url: existing.url });
  }
  const success = new URL('payment.html', env.STOREFRONT_URL.endsWith('/') ? env.STOREFRONT_URL : env.STOREFRONT_URL + '/');
  success.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  success.searchParams.set('lang', input.language === 'en' ? 'en' : 'nb');
  const cancel = new URL(success);
  cancel.search = `?cancelled=1&lang=${input.language === 'en' ? 'en' : 'nb'}`;
  const params = new URLSearchParams({ mode: 'payment', success_url: success.href.replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}'), cancel_url: cancel.href, locale: input.language === 'en' ? 'en' : 'nb', client_reference_id: id, 'metadata[order_id]': id, 'consent_collection[terms_of_service]': 'required', 'custom_text[terms_of_service_acceptance][message]': `I agree to the [terms of sale](${config.termsUrl}).` });
  items.forEach((item, index) => {
    params.set(`line_items[${index}][price_data][currency]`, 'nok');
    params.set(`line_items[${index}][price_data][unit_amount]`, String(item.priceOre));
    params.set(`line_items[${index}][price_data][product_data][name]`, item.name);
    params.set(`line_items[${index}][price_data][tax_behavior]`, 'inclusive');
    params.set(`line_items[${index}][quantity]`, String(item.quantity));
  });
  if (config.taxMode === 'automatic') params.set('automatic_tax[enabled]', 'true');
  params.set('billing_address_collection', 'required');
  if (config.fulfillment === 'shipping') {
    params.set('shipping_address_collection[allowed_countries][0]', 'NO');
    params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    params.set('shipping_options[0][shipping_rate_data][display_name]', 'Shipping in Norway');
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(shipping));
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'nok');
    params.set('shipping_options[0][shipping_rate_data][tax_behavior]', 'inclusive');
  } else params.set('custom_text[submit][message]', 'Pickup by arrangement: Rådmann Halmrasts vei 7, Sandvika.');
  const session = await stripe(env, 'checkout/sessions', { method: 'POST', headers: { ...accountHeaders, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': id }, body: params });
  await env.DB.prepare('UPDATE orders SET session_id = ? WHERE id = ? AND session_id IS NULL').bind(session.id, id).run();
  return json({ url: session.url });
}
export async function verifySignature(raw, signature, secret, now = Date.now()) {
  const fields = String(signature || '').split(',').map(field => field.trim().split('='));
  const timestamp = fields.find(([name]) => name === 't')?.[1];
  if (!/^\d+$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${raw}`)));
  return fields.some(([name, value]) => name === 'v1' && typeof value === 'string' && equal(expected, value));
}
async function webhook(request, env) {
  if ((!env.STRIPE_WEBHOOK_SECRET && !env.STRIPE_CONNECT_WEBHOOK_SECRET) || stripeMode(env) === 'unconfigured') fail(503, 'Webhook is not configured.');
  const raw = await readLimited(request, 1048576);
  const signature = request.headers.get('stripe-signature');
  const connectSigned = Boolean(env.STRIPE_CONNECT_WEBHOOK_SECRET) && await verifySignature(raw, signature, env.STRIPE_CONNECT_WEBHOOK_SECRET);
  const directSigned = Boolean(env.STRIPE_WEBHOOK_SECRET) && await verifySignature(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!connectSigned && !directSigned) fail(400, 'Invalid webhook signature.');
  let event;
  try { event = JSON.parse(raw); } catch { fail(400, 'Invalid event.'); }
  if (typeof event.id !== 'string' || !event.data?.object) fail(400, 'Invalid event.');
  if (event.livemode !== (stripeMode(env) === 'live')) fail(400, 'Stripe mode mismatch.');
  if (event.account && !connectSigned) fail(400, 'Use the connected-account webhook endpoint secret.');
  if (connectSigned && await connect.handleAccountEvent(env, event)) return json({ received: true });
  if (await env.DB.prepare('SELECT id FROM stripe_events WHERE id = ?').bind(event.id).first()) return json({ received: true });
  const session = event.data.object;
  const supported = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'];
  if (!supported.includes(event.type)) return json({ received: true });
  const orderId = session.metadata?.order_id;
  if (!orderId) return json({ received: true });
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return json({ received: true });
  if (order.mode !== stripeMode(env) || (order.session_id && order.session_id !== session.id)) fail(400, 'Order session mismatch.');
  if ((order.stripe_account || null) !== (event.account || null)) fail(400, 'Order Stripe account mismatch.');
  let status = event.type === 'checkout.session.expired' ? 'expired' : event.type === 'checkout.session.async_payment_failed' ? 'failed' : 'pending';
  if (session.payment_status === 'paid' && ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    if (session.currency !== order.currency || session.amount_total !== order.amount) fail(400, 'Order amount mismatch.');
    status = 'paid';
  }
  // The event marker and order update commit atomically. Repeated or delayed events
  // cannot regress an already paid order or trigger duplicate fulfillment.
  await env.DB.batch([
    env.DB.prepare('UPDATE orders SET status = ?, session_id = ?, email = ?, paid_at = CASE WHEN ? = ? THEN ? ELSE paid_at END WHERE id = ? AND status != ? AND (? = ? OR status = ?)').bind(status, session.id, session.customer_details?.email || '', status, 'paid', new Date().toISOString(), orderId, 'paid', status, 'paid', 'pending'),
    env.DB.prepare('INSERT OR IGNORE INTO stripe_events (id) VALUES (?)').bind(event.id)
  ]);
  return json({ received: true });
}
async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');
  if (!env.DB) fail(503, 'Database is not configured.');
  const connectResponse = await connect.publicRoute(request, env, path);
  if (connectResponse) return connectResponse;
  if (path === '/api/stripe/webhook' && request.method === 'POST') return webhook(request, env);
  if (path === '/api/catalog' && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT data, version FROM products ORDER BY position, id').all();
    const config = await settings(env);
    return json({ products: result.results.map(decodeProduct).filter(product => product.active), checkout: { enabled: config.enabled && await ready(env), mode: stripeMode(env), fulfillment: config.fulfillment, shippingOre: config.shippingOre, currency: 'NOK' } });
  }
  if (path === '/api/checkout' && request.method === 'POST') return checkout(request, env);
  if (path === '/api/checkout/status' && request.method === 'GET') {
    const sessionId = url.searchParams.get('session_id');
    if (!/^cs_(test_|live_)?[A-Za-z0-9_]{10,250}$/.test(sessionId || '')) fail(400, 'Invalid session.');
    const order = await env.DB.prepare('SELECT status, mode FROM orders WHERE session_id = ?').bind(sessionId).first();
    return json({ status: order?.status || 'pending', mode: order?.mode || null });
  }
  if (path === '/api/admin/login' && request.method === 'POST') return login(request, env);
  if (!path.startsWith('/api/admin/')) fail(404, 'Not found.');
  const sessionHash = await authenticate(request, env);
  const adminConnectResponse = await connect.adminRoute(request, env, path);
  if (adminConnectResponse) return adminConnectResponse;
  if (path === '/api/admin/logout' && request.method === 'POST') { await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(sessionHash).run(); return json({ ok: true }); }
  if (path === '/api/admin/state' && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT data, version FROM products ORDER BY position, id').all();
    const orders = await env.DB.prepare('SELECT id, mode, status, amount, currency, items, email, created_at FROM orders ORDER BY created_at DESC LIMIT 100').all();
    return json({ products: result.results.map(decodeProduct), settings: await settings(env), stripe: { mode: stripeMode(env), secretConfigured: stripeMode(env) !== 'unconfigured', webhookConfigured: Boolean(connect.enabled(env) ? env.STRIPE_CONNECT_WEBHOOK_SECRET : env.STRIPE_WEBHOOK_SECRET), ready: await ready(env), connect: await connect.adminState(env, request), webhookUrl: new URL('/api/stripe/webhook', request.url).href }, orders: orders.results.map(order => ({ ...order, items: JSON.parse(order.items) })) });
  }
  if (path === '/api/admin/products' && request.method === 'POST') {
    const product = validate(rules.product, await body(request));
    const existing = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(product.id).first();
    if (existing) fail(409, 'This product ID already exists.');
    await env.DB.prepare('INSERT INTO products (id, data, position) VALUES (?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM products))').bind(product.id, JSON.stringify(product)).run();
    return json({ ...product, version: 1 }, 201);
  }
  const productId = path.match(/^\/api\/admin\/products\/([a-z0-9-]+)$/)?.[1];
  if (productId && ['PUT', 'DELETE'].includes(request.method)) {
    if (request.method === 'DELETE') {
      const version = Number(url.searchParams.get('version'));
      const result = await env.DB.prepare('DELETE FROM products WHERE id = ? AND version = ?').bind(productId, version).run();
      if (!result.meta.changes) fail(409, 'The product changed in another session. Refresh before editing.');
      return json({ ok: true });
    }
    const input = await body(request);
    const product = validate(rules.product, { ...input, id: productId });
    if (!Number.isInteger(input.version)) fail(400, 'Missing product version.');
    const result = await env.DB.prepare('UPDATE products SET data = ?, version = version + 1 WHERE id = ? AND version = ?').bind(JSON.stringify(product), productId, input.version).run();
    if (!result.meta.changes) fail(409, 'The product changed in another session. Refresh before editing.');
    return json({ ...product, version: input.version + 1 });
  }
  if (path === '/api/admin/settings' && request.method === 'PUT') {
    const input = validate(rules.settings, await body(request));
    if (input.enabled && !await ready(env)) fail(409, 'Configure Stripe and complete the merchant setup before enabling checkout.');
    await env.DB.prepare('INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').bind(JSON.stringify(input)).run();
    return json(input);
  }
  if (path === '/api/admin/stripe/test' && request.method === 'POST') {
    if (stripeMode(env) === 'unconfigured') fail(409, 'Add STRIPE_SECRET_KEY to server secrets first.');
    const current = connect.enabled(env) ? await connect.merchant(env) : null;
    if (connect.enabled(env) && !current) fail(409, 'The customer has not connected a Stripe account yet.');
    const account = await stripe(env, current ? `accounts/${current.account_id}` : 'account');
    return json({ connected: true, mode: stripeMode(env), chargesEnabled: Boolean(account.charges_enabled) });
  }
  fail(404, 'Not found.');
}
export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    const origin = request.headers.get('Origin');
    let response;
    if (origin && !allowed.includes(origin)) response = json({ error: 'Origin is not allowed.' }, 403);
    else if (request.method === 'OPTIONS') response = new Response(null, { status: 204 });
    else {
      try { response = await route(request, env); }
      catch (error) {
        const message = error instanceof HttpError ? error.message : 'Request could not be completed. Please try again.';
        const status = error instanceof HttpError ? error.status : 500;
        if (/^\/api\/connect\/(start|onboard|callback)$/.test(new URL(request.url).pathname) && request.headers.get('Accept')?.includes('text/html')) {
          const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
          const back = /^https:\/\//.test(env.STOREFRONT_URL || '') ? env.STOREFRONT_URL : '#';
          response = new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Nornails — Setup not completed</title><style>body{margin:0;background:#fffdf8;color:#391020;font:16px/1.8 system-ui;padding:60px 24px}main{max-width:560px;margin:10vh auto}h1{font:38px/1.2 Georgia}p{color:#775e66}a{color:#651b32}small{display:block;margin-top:30px}</style><main><small>NORNAILS · STRIPE</small><h1>Chưa hoàn tất thiết lập</h1><p>Setup could not be completed. Reopen the original setup link in the same browser, or contact the website administrator.</p><p>${escape(message)}</p><a href="${escape(back)}">Về website / Back to store →</a></main></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        } else response = json({ error: message }, status);
      }
    }
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Vary', 'Origin');
    if (origin && allowed.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    }
    return new Response(response.body, { status: response.status, headers });
  }
};
