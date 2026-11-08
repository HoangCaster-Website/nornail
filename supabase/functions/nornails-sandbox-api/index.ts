import postgres from 'postgres';
import worker from './backend/worker.mjs';
import { PostgresStore } from './backend/postgres.mjs';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, {
  prepare:false, max:1, idle_timeout:20, connect_timeout:10,
  connection:{ application_name:'nornails-sandbox-api',statement_timeout:15000 }
});
const allowed = ['https://hoangcaster-website.github.io','https://nornails.no','https://www.nornails.no'];
let cached: any;
let loadedAt = 0;
async function environment() {
  if (cached && Date.now() - loadedAt < 60000 && Date.now() < Date.parse(cached.SANDBOX_EXPIRES_AT)) return cached;
  // Only this sandbox's Vault references are read. No secrets are sent to clients.
  const rows = await sql`SELECT c.expires_at, c.seller_viewer_hash, k.decrypted_secret AS stripe_key, w.decrypted_secret AS webhook_key
    FROM public.nornails_sandbox_config c
    LEFT JOIN vault.decrypted_secrets k ON k.id = c.stripe_secret_id
    LEFT JOIN vault.decrypted_secrets w ON w.id = c.webhook_secret_id WHERE c.id = 1`;
  const config = rows[0];
  const valid = config && Date.now() < new Date(config.expires_at).getTime();
  const key = valid ? config.stripe_key : undefined;
  if (key && !/^(?:sk|rk|rkcs)_test_/.test(key)) throw new Error('Sandbox credentials must be test-only.');
  cached = {
    DB:new PostgresStore(sql,'nornails_sandbox_'),
    STORAGE_NAME:'supabase-sandbox', TEST_ONLY:true,
    SANDBOX_EXPIRES_AT:config ? new Date(config.expires_at).toISOString() : '',
    API_PATH_PREFIX:'/functions/v1/nornails-sandbox-api', FUNCTION_PATH:'/nornails-sandbox-api',
    STOREFRONT_URL:'https://hoangcaster-website.github.io/nornail/', ALLOWED_ORIGINS:allowed.join(','),
    STRIPE_SECRET_KEY:key, STRIPE_WEBHOOK_SECRET:valid ? config.webhook_key : undefined,
    SELLER_VIEWER_HASH:config?.seller_viewer_hash,
    adminCredentials:async () => null
  };
  loadedAt = Date.now();
  return cached;
}
Deno.serve(async request => {
  try { return await worker.fetch(request,await environment()); }
  catch {
    const origin = request.headers.get('Origin') || '';
    return Response.json({error:'The Stripe sandbox is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store',...(allowed.includes(origin) ? {'Access-Control-Allow-Origin':origin} : {})}});
  }
});
