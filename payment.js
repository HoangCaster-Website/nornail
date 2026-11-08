'use strict';
(() => {
  const query = new URLSearchParams(location.search);
  const language = query.get('lang') === 'en' ? 'en' : 'nb';
  const copy = {
    nb: { eyebrow: 'DIN BESTILLING', checking: 'Sjekker betalingen …', wait: 'Vent mens vi bekrefter betalingsstatusen.', paid: 'Betalingen er bekreftet.', paidBody: 'Takk for bestillingen. Kontakt Nornails for å avtale levering eller henting.', pending: 'Vi venter på bekreftelse.', pendingBody: 'Stripe har ennå ikke bekreftet betalingen. Sjekk igjen om litt, eller kontakt oss før du prøver en ny betaling.', cancelled: 'Betalingen ble avbrutt.', cancelledBody: 'Du kan gå tilbake til butikken, eller kontakte oss om bestillingen.', failed: 'Betalingen ble ikke fullført.', failedBody: 'Gå tilbake til butikken for å starte på nytt, eller kontakt oss.', unavailable: 'Vi kan ikke bekrefte betalingen nå.', unavailableBody: 'Kontakt Nornails før du betaler på nytt.', test: 'TESTMODUS · Dette er en testbestilling.', back: 'Tilbake til butikken →', retry: 'Sjekk igjen' },
    en: { eyebrow: 'YOUR ORDER', checking: 'Checking your payment…', wait: 'Please wait while we verify the payment status.', paid: 'Payment confirmed.', paidBody: 'Thank you for your order. Contact Nornails to arrange delivery or pickup.', pending: 'Awaiting confirmation.', pendingBody: 'Stripe has not confirmed the payment yet. Check again shortly, or contact us before making another payment.', cancelled: 'Checkout cancelled.', cancelledBody: 'Return to the store, or contact us about your order.', failed: 'Payment was not completed.', failedBody: 'Return to the store to start again, or contact us.', unavailable: 'We cannot verify your payment right now.', unavailableBody: 'Contact Nornails before making another payment.', test: 'TEST MODE · This is a test order.', back: 'Back to the store →', retry: 'Check again' }
  }[language];
  document.documentElement.lang = language;
  document.title = 'Nornails — ' + (language === 'en' ? 'Payment' : 'Betaling');
  const $ = selector => document.querySelector(selector);
  $('#payment-eyebrow').textContent = copy.eyebrow;
  $('#back-store').textContent = copy.back;
  $('#back-store').href = `index.html?lang=${language}#produkter`;
  $('#check-again').textContent = copy.retry;
  const api = globalThis.nornailsConfig?.apiUrl?.replace(/\/$/, '');
  const sessionId = query.get('session_id');
  let attempts = 0;
  let timer;
  let busy = false;
  function show(state) {
    $('#payment-title').textContent = copy[state];
    $('#payment-message').textContent = copy[state + 'Body'] || copy.wait;
    $('#check-again').hidden = !['pending', 'unavailable'].includes(state);
    $('.payment-symbol').textContent = state === 'paid' ? '✓' : '↗';
  }
  async function check() {
    if (busy) return;
    clearTimeout(timer);
    busy = true;
    $('#check-again').disabled = true;
    try {
      const response = await fetch(`${api}/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
      if (!response.ok) throw new Error();
      const result = await response.json();
      show(result.status === 'paid' ? 'paid' : ['failed', 'expired'].includes(result.status) ? 'failed' : 'pending');
      $('#payment-mode').hidden = result.mode !== 'test';
      $('#payment-mode').textContent = copy.test;
      if (result.status === 'pending' && ++attempts < 8) timer = setTimeout(check, 3000);
    } catch { show('unavailable'); }
    finally { busy = false; $('#check-again').disabled = false; }
  }
  $('#check-again').addEventListener('click', () => { attempts = 0; check(); });
  if (query.has('cancelled')) show('cancelled');
  else if (!api || !sessionId) show('unavailable');
  else { show('checking'); check(); }
})();
