// Stripe Connect OAuth authorizes an existing or newly created Stripe account.
// Only after that identity check may the holder enter hosted account onboarding.
export function createConnect({ json, fail, hash, hex, stripe, stripeMode, body, readLimited, rateLimit }) {
  const now = () => Math.floor(Date.now() / 1000);
  const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
  const enabled = env => Boolean(env.STRIPE_CONNECT_CLIENT_ID);
  const configured = env => /^ca_[A-Za-z0-9]+$/.test(env.STRIPE_CONNECT_CLIENT_ID || '') && stripeMode(env) !== 'unconfigured' && /^https:\/\//.test(env.STOREFRONT_URL || '');
  const merchant = env => env.DB.prepare('SELECT * FROM stripe_merchants WHERE mode = ?').bind(stripeMode(env)).first();
  function accountStatus(account) {
    const requirements = account.requirements || {};
    if (requirements.disabled_reason?.startsWith('rejected')) return 'failed';
    if ((requirements.currently_due?.length || 0) + (requirements.past_due?.length || 0) > 0 || !account.details_submitted) return 'needs_information';
    if (requirements.disabled_reason || requirements.pending_verification?.length || !account.charges_enabled || !account.payouts_enabled) return 'pending';
    return 'success';
  }
  function portal(env, credential, language = 'vi', extra = {}) {
    const url = new URL('stripe-setup.html', env.STOREFRONT_URL.endsWith('/') ? env.STOREFRONT_URL : env.STOREFRONT_URL + '/');
    url.hash = new URLSearchParams({ token: credential, lang: language === 'en' ? 'en' : 'vi', ...extra }).toString();
    return url.href;
  }
  const redirect = (url, headers = {}) => new Response(null, { status: 303, headers: { Location: url, ...headers } });
  const callback = (env, request) => new URL((env.API_PATH_PREFIX || '') + '/api/connect/callback', request.url).href;
  const cookie = (env, value) => `nornails_connect=${value}; Path=${env.API_PATH_PREFIX || ''}/api/connect/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=${value ? 600 : 0}`;
  async function credential(env, value) {
    if (!/^[is]_[a-f0-9]{64}$/.test(value || '')) fail(401, 'This setup link is invalid or expired.');
    const digest = await hash(value);
    let invite;
    let verifiedAccount = null;
    if (value.startsWith('i_')) invite = await env.DB.prepare('SELECT * FROM connect_invites WHERE token_hash = ?').bind(digest).first();
    else {
      const session = await env.DB.prepare('SELECT * FROM connect_sessions WHERE token_hash = ? AND expires > ?').bind(digest, now()).first();
      if (session) { invite = await env.DB.prepare('SELECT * FROM connect_invites WHERE id = ?').bind(session.invite_id).first(); verifiedAccount = session.verified_account; }
    }
    if (!invite || invite.revoked || invite.expires <= now() || invite.mode !== stripeMode(env)) fail(401, 'This setup link is invalid or expired.');
    return { invite, verifiedAccount };
  }
  async function sessionCredential(env, invite, account = null) {
    const value = 's_' + random();
    await env.DB.prepare('INSERT INTO connect_sessions (token_hash, invite_id, verified_account, expires) VALUES (?, ?, ?, ?)').bind(await hash(value), invite.id, account, Math.min(invite.expires, now() + 86400)).run();
    return value;
  }
  async function syncAccount(env, id) {
    const account = await stripe(env, `accounts/${encodeURIComponent(id)}`);
    if (account.id !== id) fail(502, 'Stripe returned an unexpected account.');
    const status = accountStatus(account);
    await env.DB.prepare('UPDATE stripe_merchants SET status = ?, checked_at = ? WHERE mode = ? AND account_id = ?').bind(status, new Date().toISOString(), stripeMode(env), id).run();
    await env.DB.prepare('UPDATE connect_invites SET status = ? WHERE mode = ? AND account_id = ? AND revoked = 0').bind(status, stripeMode(env), id).run();
    return { status, account };
  }
  async function adminState(env, request) {
    const current = await merchant(env);
    return { enabled: enabled(env), configured: configured(env), status: current?.status || 'not_connected', accountId: current?.account_id || null, callbackUrl: callback(env, request), webhookConfigured: Boolean(env.STRIPE_CONNECT_WEBHOOK_SECRET) };
  }
  async function adminRoute(request, env, path) {
    if (path === '/api/admin/connect/invites' && request.method === 'POST') {
      if (!configured(env)) fail(409, 'Configure Stripe Connect and the HTTPS storefront URL on the server first.');
      const input = await body(request);
      const hours = input.hours ?? 72;
      if (![24, 72, 168].includes(hours)) fail(400, 'Choose a valid setup link expiry.');
      const id = crypto.randomUUID();
      const value = 'i_' + random();
      const expires = now() + hours * 3600;
      await env.DB.batch([
        env.DB.prepare('UPDATE connect_invites SET revoked = 1 WHERE mode = ?').bind(stripeMode(env)),
        env.DB.prepare('INSERT INTO connect_invites (id, token_hash, mode, expires, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, await hash(value), stripeMode(env), expires, new Date().toISOString())
      ]);
      return json({ id, url: portal(env, value, input.language), expiresAt: new Date(expires * 1000).toISOString(), mode: stripeMode(env) }, 201);
    }
    if (path === '/api/admin/connect/refresh' && request.method === 'POST') {
      const current = await merchant(env);
      if (current && current.status !== 'disconnected') await syncAccount(env, current.account_id);
      return json(await adminState(env, request));
    }
    if (path === '/api/admin/connect/revoke' && request.method === 'POST') {
      await env.DB.prepare('UPDATE connect_invites SET revoked = 1 WHERE mode = ?').bind(stripeMode(env)).run();
      return json({ ok: true });
    }
    return null;
  }
  async function publicRoute(request, env, path) {
    if (!path.startsWith('/api/connect/')) return null;
    if (!configured(env)) fail(503, 'Payment setup is not configured yet. Please contact the website administrator.');
    if (path === '/api/connect/status' && request.method === 'GET') {
      await rateLimit(request, env, 'connect-status', 120);
      const bearer = request.headers.get('Authorization')?.replace(/^Bearer /, '');
      const { invite, verifiedAccount } = await credential(env, bearer);
      let status = invite.status;
      // Shared invitation credentials can view progress, never identity documents.
      // Refreshing live account data requires the OAuth-authenticated holder session.
      if (verifiedAccount && verifiedAccount === invite.account_id && status !== 'disconnected') status = (await syncAccount(env, verifiedAccount)).status;
      return json({ status, mode: invite.mode, canOnboard: Boolean(verifiedAccount && verifiedAccount === invite.account_id && status !== 'disconnected'), expiresAt: new Date(invite.expires * 1000).toISOString() });
    }
    if ((path === '/api/connect/start' || path === '/api/connect/onboard') && request.method === 'POST') {
      await rateLimit(request, env, 'connect-start', 12);
      if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) fail(415, 'Submit the setup form.');
      const fields = new URLSearchParams(await readLimited(request, 4096));
      const value = fields.get('token');
      const language = fields.get('language') === 'en' ? 'en' : 'vi';
      const { invite, verifiedAccount } = await credential(env, value);
      if (path === '/api/connect/onboard') {
        if (!verifiedAccount || verifiedAccount !== invite.account_id) fail(401, 'Sign in with Stripe before continuing setup.');
        const current = await merchant(env);
        if (!current || current.account_id !== verifiedAccount || current.status === 'disconnected') fail(409, 'This Stripe connection is no longer active.');
        const back = portal(env, value, language);
        const link = await stripe(env, 'account_links', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ account: verifiedAccount, type: 'account_onboarding', return_url: back, refresh_url: portal(env, value, language, { refresh: '1' }), 'collection_options[fields]': 'eventually_due' }) });
        const target = new URL(link.url);
        if (target.protocol !== 'https:' || target.hostname !== 'connect.stripe.com') fail(502, 'Stripe returned an unexpected onboarding link.');
        return redirect(target.href);
      }
      const state = random();
      await env.DB.prepare('DELETE FROM connect_states WHERE expires <= ?').bind(now()).run();
      await env.DB.prepare('INSERT INTO connect_states (state_hash, invite_id, expires) VALUES (?, ?, ?)').bind(await hash(state), invite.id, now() + 600).run();
      const target = new URL('https://connect.stripe.com/oauth/authorize');
      target.search = new URLSearchParams({ response_type: 'code', client_id: env.STRIPE_CONNECT_CLIENT_ID, scope: 'read_write', state, redirect_uri: callback(env, request) }).toString();
      // Language is only presentation state; it never determines success.
      return redirect(target.href, { 'Set-Cookie': cookie(env, state + '.' + language) });
    }
    if (path === '/api/connect/callback' && request.method === 'GET') {
      const query = new URL(request.url).searchParams;
      const state = query.get('state');
      const storedCookie = request.headers.get('Cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith('nornails_connect='))?.split('=')[1];
      const [browserState, language] = (storedCookie || '').split('.');
      if (!/^[a-f0-9]{64}$/.test(state || '') || browserState !== state) fail(400, 'This Stripe return could not be verified. Reopen your setup link in the same browser.');
      // Claim once BEFORE exchanging the code: replaying OAuth codes can revoke access.
      const claimed = await env.DB.prepare('DELETE FROM connect_states WHERE state_hash = ? AND expires > ? RETURNING invite_id').bind(await hash(state), now()).first();
      if (!claimed) fail(400, 'This Stripe return has expired or has already been used.');
      const invite = await env.DB.prepare('SELECT * FROM connect_invites WHERE id = ?').bind(claimed.invite_id).first();
      if (!invite || invite.revoked || invite.expires <= now() || invite.mode !== stripeMode(env)) fail(401, 'This setup link is invalid or expired.');
      let accountId = null;
      let status = query.get('error') === 'access_denied' ? 'cancelled' : 'failed';
      if (!query.has('error') && query.get('code')) {
        try {
          const response = await fetch('https://connect.stripe.com/oauth/token', { method: 'POST', signal: AbortSignal.timeout(15000), headers: { Authorization: 'Basic ' + btoa(env.STRIPE_SECRET_KEY + ':'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code: query.get('code') }) });
          const result = await response.json();
          if (!response.ok || result.scope !== 'read_write' || !/^acct_[A-Za-z0-9]+$/.test(result.stripe_user_id || '') || result.livemode !== (stripeMode(env) === 'live')) throw new Error('OAuth exchange rejected');
          const existing = await merchant(env);
          if (existing && existing.account_id !== result.stripe_user_id) throw new Error('A different merchant is already connected');
          accountId = result.stripe_user_id;
          // INSERT OR IGNORE prevents concurrent invites replacing the merchant.
          await env.DB.prepare('INSERT OR IGNORE INTO stripe_merchants (mode, account_id, status, checked_at) VALUES (?, ?, ?, ?)').bind(stripeMode(env), accountId, 'pending', new Date().toISOString()).run();
          if ((await merchant(env)).account_id !== accountId) throw new Error('Merchant changed');
          status = (await syncAccount(env, accountId)).status;
        } catch { status = 'failed'; accountId = null; }
      }
      await env.DB.prepare('UPDATE connect_invites SET status = ?, account_id = COALESCE(?, account_id) WHERE id = ?').bind(status, accountId, invite.id).run();
      const value = await sessionCredential(env, invite, accountId);
      return redirect(portal(env, value, language), { 'Set-Cookie': cookie(env, '') });
    }
    fail(404, 'Not found.');
  }
  async function handleAccountEvent(env, event) {
    if (!['account.updated', 'account.application.deauthorized'].includes(event.type)) return false;
    const current = await merchant(env);
    const id = event.account || event.data.object.id;
    if (!current || current.account_id !== id) return true;
    if (event.type === 'account.application.deauthorized') {
      await env.DB.batch([
        env.DB.prepare('UPDATE stripe_merchants SET status = ? WHERE mode = ? AND account_id = ?').bind('disconnected', stripeMode(env), id),
        env.DB.prepare('UPDATE connect_invites SET status = ? WHERE mode = ? AND account_id = ?').bind('disconnected', stripeMode(env), id)
      ]);
    } else if (current.status !== 'disconnected') {
      // Retrieve current state instead of trusting the ordering of webhook snapshots.
      await syncAccount(env, id);
    }
    return true;
  }
  return { enabled, configured, merchant, adminState, adminRoute, publicRoute, accountStatus, syncAccount, handleAccountEvent };
}
