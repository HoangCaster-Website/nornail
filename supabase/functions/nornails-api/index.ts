import postgres from 'postgres';
import worker from './backend/worker.mjs';
import { PostgresStore } from './backend/postgres.mjs';

// Supabase supplies the database URL inside this function. It is never returned
// to the browser. A small pool + no prepared statements supports transaction pools.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, {
  prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10,
  connection: { application_name: 'nornails-api', statement_timeout: 15000 }
});
const env = {
  DB: new PostgresStore(sql),
  STORAGE_NAME: 'supabase',
  API_PATH_PREFIX: '/functions/v1/nornails-api',
  FUNCTION_PATH: '/nornails-api',
  STOREFRONT_URL: 'https://hoangcaster-website.github.io/nornail/',
  ALLOWED_ORIGINS: 'https://hoangcaster-website.github.io,https://nornails.no,https://www.nornails.no',
  // Dedicated Nornails secrets only; never reuse another app's generic secrets.
  STRIPE_SECRET_KEY: Deno.env.get('NORNAILS_STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: Deno.env.get('NORNAILS_STRIPE_WEBHOOK_SECRET'),
  STRIPE_CONNECT_CLIENT_ID: Deno.env.get('NORNAILS_STRIPE_CONNECT_CLIENT_ID'),
  STRIPE_CONNECT_WEBHOOK_SECRET: Deno.env.get('NORNAILS_STRIPE_CONNECT_WEBHOOK_SECRET'),
  async adminCredentials() {
    // Intentionally empty until the owner requests admin account configuration.
    const rows = await sql`SELECT email, password_hash FROM public.nornails_admin_credentials WHERE id = 1 AND enabled = true`;
    return rows[0] ? { email: rows[0].email, passwordHash: rows[0].password_hash } : null;
  }
};
Deno.serve(request => worker.fetch(request, env));
