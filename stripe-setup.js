'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const fragment = new URLSearchParams(location.hash.slice(1));
  const language = fragment.get('lang');
  if (language === 'vi' || language === 'en') globalThis.nornailsAdminI18n.setLanguage(language);
  // Only the site's configured API is trusted; links cannot supply an arbitrary API.
  const api = globalThis.nornailsConfig?.apiUrl?.replace(/\/$/, '');
  const value = fragment.get('token');
  let busy = false;
  let canOnboard = false;
  let attempts = 0;
  let timer;
  let lastCheck = 0;
  const copy = {
    invited: ['Set up payments for Nornails.', 'Sign in securely with Stripe, complete your business details there, then return here to check the result.'],
    success: ['Your Stripe setup is complete.', 'Stripe has confirmed that the connected account is ready to accept payments and receive payouts.'],
    pending: ['Stripe is reviewing your information.', 'Your connection is saved. Stripe has not finished verifying all payment or payout requirements yet.'],
    needs_information: ['A few details are still needed.', 'Continue on Stripe to complete the remaining business, identity or bank details.'],
    failed: ['Setup was not completed.', 'The connection could not be confirmed. Try signing in with Stripe again, or contact the website administrator.'],
    cancelled: ['You cancelled the Stripe connection.', 'No successful connection was confirmed. You can try again when ready.'],
    disconnected: ['This Stripe account was disconnected.', 'Sign in with Stripe again to reconnect the same store account.'],
    invalid: ['This setup link is invalid or expired.', 'Ask the website administrator to create a new setup link.'],
    unavailable: ['Unable to check the setup status.', 'Check your connection and try again. A return from Stripe does not by itself mean setup succeeded.'],
    unconfigured: ['Setup was not completed.', 'Payment setup is not configured yet. Please contact the website administrator.']
  };
  function show(status, mode) {
    const message = copy[status] || copy.unavailable;
    $('#setup-title').textContent = message[0];
    $('#setup-description').textContent = message[1];
    $('.setup-status-card').dataset.status = status;
    $('#setup-result-icon').textContent = status === 'success' ? '✓' : ['failed','invalid','disconnected'].includes(status) ? '×' : status === 'pending' ? '…' : '↗';
    const actionable = ['invited','needs_information','failed','cancelled','disconnected'].includes(status);
    $('#setup-continue').hidden = !actionable;
    $('#setup-continue').textContent = canOnboard && status === 'needs_information' ? 'Continue setup on Stripe' : 'Continue with Stripe';
    $('#setup-recheck').hidden = ['invalid','unconfigured'].includes(status);
    $('#setup-test-note').hidden = mode !== 'test';
    $('#setup-confirmation').hidden = status !== 'success';
    $('#setup-refresh-note').hidden = !fragment.has('refresh') || !actionable;
  }
  async function check() {
    if (busy) return;
    clearTimeout(timer);
    busy = true;
    $('#setup-recheck').disabled = true;
    lastCheck = Date.now();
    try {
      const response = await fetch(api + '/api/connect/status', { headers: { Authorization: 'Bearer ' + value }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (response.status === 401 || response.status === 410) { show('invalid'); return; }
      if (!response.ok) { show(response.status === 503 ? 'unconfigured' : 'unavailable'); return; }
      const result = await response.json();
      canOnboard = result.canOnboard === true;
      show(result.status, result.mode);
      if (result.status === 'pending' && ++attempts < 8) timer = setTimeout(check, 15000);
    } catch { show('unavailable'); }
    finally { busy = false; $('#setup-recheck').disabled = false; }
  }
  $('#setup-continue').addEventListener('click', () => {
    if (busy || !value || !api) return;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = api + (canOnboard ? '/api/connect/onboard' : '/api/connect/start');
    form.hidden = true;
    for (const [name, content] of Object.entries({ token: value, language: globalThis.nornailsAdminI18n.language })) {
      const input = document.createElement('input'); input.name = name; input.value = content; form.append(input);
    }
    document.body.append(form);
    $('#setup-continue').disabled = true;
    // Top-level navigation allows Stripe's OAuth callback to validate its first-party cookie.
    form.submit();
  });
  $('#setup-recheck').addEventListener('click', () => { attempts = 0; check(); });
  window.addEventListener('hashchange', () => {
    // Opening a replacement invitation in the same tab is a fragment navigation.
    // Reload so the old holder credential and its result cannot remain on screen.
    if (new URLSearchParams(location.hash.slice(1)).get('token') !== value) location.reload();
  });
  window.addEventListener('focus', () => { if (api && value && Date.now() - lastCheck > 10000) check(); });
  if (!api) show('unconfigured');
  else if (!/^[is]_[a-f0-9]{64}$/.test(value || '')) show('invalid');
  else check();
})();
