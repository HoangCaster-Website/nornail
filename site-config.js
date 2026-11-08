// Public configuration only. Never put Stripe secret keys or admin passwords here.
// The Edge Function holds the database connection; no privileged key is public.
globalThis.nornailsConfig = Object.freeze({ apiUrl: 'https://clyshqnbxapwipacbaxd.supabase.co/functions/v1/nornails-api' });
