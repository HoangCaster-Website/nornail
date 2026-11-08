import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { pbkdf2Sync, createHmac } from 'node:crypto';
import worker from '../worker.mjs';
import '../../catalog.js';

class D1Adapter {
  constructor() { this.sqlite = new DatabaseSync(':memory:'); }
  prepare(sql) {
    const db = this.sqlite;
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { return db.prepare(sql).get(...values) || null; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async run() { return { meta: { changes: Number(db.prepare(sql).run(...values).changes) } }; }
    };
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try { const result = []; for (const statement of statements) result.push(await statement.run()); this.sqlite.exec('COMMIT'); return result; }
    catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }
}
const password = 'only-for-isolated-tests-123';
const salt = '12'.repeat(16);
const passwordHash = salt + ':' + pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
function environment() {
  const DB = new D1Adapter();
  DB.sqlite.exec(readFileSync(new URL('../migrations/0001_schema.sql', import.meta.url), 'utf8'));
  DB.sqlite.exec(readFileSync(new URL('../migrations/0002_catalog.sql', import.meta.url), 'utf8'));
  DB.sqlite.exec(readFileSync(new URL('../migrations/0003_connect.sql', import.meta.url), 'utf8'));
  DB.sqlite.exec(readFileSync(new URL('../migrations/0004_order_payment.sql', import.meta.url), 'utf8'));
  return { DB, ADMIN_EMAIL: 'test@example.invalid', ADMIN_PASSWORD_HASH: passwordHash, ALLOWED_ORIGINS: 'https://store.example', STOREFRONT_URL: 'https://store.example/nornail/' };
}
async function call(env, path, { method = 'GET', input, token, origin = 'https://store.example', headers = {}, raw } = {}) {
  const request = new Request('https://api.example' + path, { method, headers: { ...(origin ? { Origin: origin } : {}), ...(input !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers }, body: raw ?? (input === undefined ? undefined : JSON.stringify(input)) });
  const response = await worker.fetch(request, env);
  const data = response.status === 204 ? null : await response.json();
  return { response, data, status: response.status };
}
async function signIn(env) {
  const result = await call(env, '/api/admin/login', { method: 'POST', input: { email: env.ADMIN_EMAIL, password } });
  assert.equal(result.status, 200);
  return result.data.token;
}
async function prepareCheckout(env, priceOre = 12345) {
  const token = await signIn(env);
  const product = { ...globalThis.nornailsCatalog[0], priceOre, version: 1 };
  assert.equal((await call(env, '/api/admin/products/w1', { method: 'PUT', token, input: product })).status, 200);
  env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture';
  const config = { ...globalThis.nornailsCommerce.defaults, enabled: true, shippingOre: 9900, termsConfirmed: true, termsUrl: 'https://store.example/terms' };
  assert.equal((await call(env, '/api/admin/settings', { method: 'PUT', token, input: config })).status, 200);
  return token;
}
const sessionId = 'cs_test_012345678901234567890';
function eventSignature(raw, secret = 'whsec_fixture', timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex')}`;
}
async function sendEvent(env, event, signature) {
  const raw = JSON.stringify(event);
  return call(env, '/api/stripe/webhook', { method: 'POST', raw, origin: null, headers: { 'stripe-signature': signature || eventSignature(raw), 'Content-Type': 'application/json' } });
}


export { password, environment, call, signIn, prepareCheckout, sessionId, eventSignature, sendEvent };
