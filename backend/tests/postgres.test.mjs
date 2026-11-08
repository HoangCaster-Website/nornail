import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { postgresStatement, PostgresStore } from '../postgres.mjs';
import { statements } from '../statements.mjs';
import { environment, call } from './fixtures.mjs';

test('all store statements target only isolated Nornails tables and bind values', () => {
  const source = ['worker.mjs', 'connect.mjs'].map(file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')).join('\n');
  assert.deepEqual([...new Set([...source.matchAll(/\.prepare\('([^']+)'\)/g)].map(match => match[1]))], statements);
  for (const statement of statements) {
    const sql = postgresStatement(statement);
    assert.doesNotMatch(sql, /\?|INSERT OR IGNORE/);
    for (const match of sql.matchAll(/\b(?:FROM|INTO|(?<!DO )UPDATE) (\S+)/g)) assert.match(match[1], /^public\.nornails_/);
    const bindings = [...sql.matchAll(/\$(\d+)/g)];
    assert.equal(bindings.length, (statement.match(/\?/g) || []).length);
  }
  assert.throws(() => postgresStatement('SELECT * FROM notes'), /Unknown store statement/);
  assert.throws(() => postgresStatement('DELETE FROM backend_settings'), /Unknown store statement/);
});

test('Postgres values remain bound and affected row counts preserve edit conflicts', async () => {
  const calls = [];
  const db = new PostgresStore({ async unsafe(sql, values) { calls.push({ sql, values }); return Object.assign([], { count: 0 }); } });
  const input = "x'; DELETE FROM notes; --";
  const result = await db.prepare('DELETE FROM products WHERE id = ? AND version = ?').bind(input, 3).run();
  assert.equal(result.meta.changes, 0);
  assert.equal(calls[0].sql, 'DELETE FROM public.nornails_products WHERE id = $1 AND version = $2');
  assert.deepEqual(calls[0].values, [input, 3]);
});

test('Supabase routes accept both gateway paths while keeping private admin access closed', async () => {
  const env = { ...environment(), API_PATH_PREFIX: '/functions/v1/nornails-api', FUNCTION_PATH: '/nornails-api', STORAGE_NAME: 'supabase', adminCredentials: async () => null };
  for (const prefix of ['/functions/v1/nornails-api', '/nornails-api']) {
    const catalogue = await call(env, prefix + '/api/catalog');
    assert.equal(catalogue.status, 200);
    assert.equal(catalogue.data.storage, 'supabase');
    assert.equal(catalogue.data.adminConfigured, false);
    assert.equal(catalogue.data.checkout.enabled, false);
    assert.equal((await call(env, prefix + '/api/admin/state')).status, 401);
    assert.equal((await call(env, prefix + '/api/admin/login', { method: 'POST', input: { email: 'irrelevant@example.invalid', password: 'unconfigured' } })).status, 503);
  }
});
