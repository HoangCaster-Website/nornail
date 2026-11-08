'use strict';
(() => {
  const query = new URLSearchParams(location.search);
  if (query.has('cart') && !query.has('session_id') && !query.has('order_id')) { globalThis.nornailsCheckoutReview.start(); return; }
  let language = query.get('lang') === 'en' ? 'en' : 'nb';
  const messages = {
    nb: { eyebrow:'DIN BESTILLING', checking:'Henter bestillingen …', wait:'Vent mens vi henter betalingsinformasjonen.', pending:'Bestillingen din er klar.', pendingBody:'Kontroller varene og beløpet. Skann QR-koden eller betal på denne enheten.', paid:'Takk. Betalingen er bekreftet.', paidBody:'Betalingen er mottatt. Her finner du oversikten over bestillingen din.', processing:'Betalingen behandles.', processingBody:'Vi venter på den endelige bekreftelsen. Du trenger ikke betale på nytt.', failed:'Betalingen ble ikke fullført.', failedBody:'Kontakt oss hvis du trenger hjelp med bestillingen.', expired:'Betalingsøkten er utløpt.', expiredBody:'Denne QR-koden kan ikke lenger brukes. Kontakt oss før du oppretter en ny betaling.', unavailable:'Vi kan ikke sjekke betalingen nå.', unavailableBody:'Kontroller tilkoblingen eller kontakt oss før du betaler på nytt.', invalid:'Vi finner ikke bestillingen.', invalidBody:'Åpne betalingslenken for bestillingen din eller kontakt Nornails.', unconfigured:'Nettbetaling er ikke klar ennå.', unconfiguredBody:'Kontakt Nornails for å bestille. Betalingstjenesten er ikke tilkoblet.', cancelled:'Betalingen ble avbrutt.', cancelledBody:'Du kan gå tilbake til butikken eller kontakte oss.', invoice:'Ordreoversikt', reference:'Bestillingsnummer', date:'Opprettet', subtotal:'Produkter', shipping:'Frakt', total:'Totalt', pickup:'Hentes i Sandvika', pickupBody:'Rådmann Halmrasts vei 7, 1337 Sandvika. Henting avtales med Nornails.', delivery:'Levering i Norge', deliveryBody:'Leveringsadressen oppgis sikkert hos Stripe under betalingen.', deliveryRecorded:'Leveringsadressen du oppga under betalingen brukes for denne bestillingen.', quantity:'Antall', each:'per stk.', unpaid:'Ikke betalt', paidLabel:'Betalt', processingLabel:'Behandles', failedLabel:'Ikke fullført', expiredLabel:'Utløpt', unknownLabel:'Status utilgjengelig', qrTitle:'Skann for å betale.', qrBody:'Åpne kameraet på mobilen og skann koden for denne bestillingen.', paidTitle:'Betalt.', paidQr:'Betalingen er bekreftet. QR-koden er ikke lenger aktiv.', processingTitle:'Vi venter på bekreftelse.', processingQr:'Betalingen behandles. QR-koden er skjult for å unngå en ny betaling.', unavailableQr:'Betalingsstatusen kan ikke oppdateres akkurat nå.', pay:'Betal på denne enheten ↗', retry:'Oppdater status', back:'Tilbake til butikken →', headerBack:'Til butikken ↗', print:'Skriv ut ordreoversikten ↓', live:'Status oppdateres automatisk.', verified:'Betaling bekreftet', connection:'Tilkoblingen er brutt. Prøv å oppdatere status.', test:'TESTMODUS · Ingen ekte betaling.', expiry:'QR-koden er gyldig til', secure:'Sikker betaling med Stripe', qrAlt:'Skann QR-koden for å betale bestillingen via Stripe', qrFailed:'QR-koden kunne ikke vises. Bruk knappen for å betale på denne enheten.', interrupted:'Du avbrøt Stripe Checkout. Bestillingen er fortsatt ubetalt og kan betales via samme QR-kode.' },
    en: { eyebrow:'YOUR ORDER', checking:'Loading your order…', wait:'Please wait while we retrieve the payment details.', pending:'Your order is ready.', pendingBody:'Review the items and amount. Scan the QR code or pay on this device.', paid:'Thank you. Payment confirmed.', paidBody:'Your payment has been received. Here is the summary of your order.', processing:'Your payment is processing.', processingBody:'We are waiting for final confirmation. You do not need to pay again.', failed:'Payment was not completed.', failedBody:'Contact us if you need help with your order.', expired:'This payment session has expired.', expiredBody:'This QR code can no longer be used. Contact us before starting another payment.', unavailable:'We cannot check your payment right now.', unavailableBody:'Check your connection or contact us before paying again.', invalid:'We could not find this order.', invalidBody:'Open the payment link for your order, or contact Nornails.', unconfigured:'Online payment is not ready yet.', unconfiguredBody:'Contact Nornails to order. The payment service is not connected.', cancelled:'Checkout cancelled.', cancelledBody:'Return to the store or contact us about your order.', invoice:'Order summary', reference:'Order reference', date:'Created', subtotal:'Products', shipping:'Shipping', total:'Total', pickup:'Pickup in Sandvika', pickupBody:'Rådmann Halmrasts vei 7, 1337 Sandvika. Arrange pickup with Nornails.', delivery:'Delivery within Norway', deliveryBody:'Enter your delivery address securely on Stripe during payment.', deliveryRecorded:'The delivery address provided during payment is used for this order.', quantity:'Quantity', each:'each', unpaid:'Unpaid', paidLabel:'Paid', processingLabel:'Processing', failedLabel:'Not completed', expiredLabel:'Expired', unknownLabel:'Status unavailable', qrTitle:'Scan to pay.', qrBody:'Open your phone’s camera and scan the code for this order.', paidTitle:'Paid.', paidQr:'Payment confirmed. The QR code is no longer active.', processingTitle:'Awaiting confirmation.', processingQr:'Your payment is processing. The QR code is hidden to prevent another payment.', unavailableQr:'The payment status cannot be updated right now.', pay:'Pay on this device ↗', retry:'Refresh status', back:'Back to the store →', headerBack:'Back to store ↗', print:'Print order summary ↓', live:'Payment status updates automatically.', verified:'Payment confirmed', connection:'Connection lost. Try refreshing the status.', test:'TEST MODE · No real payment.', expiry:'QR code valid until', secure:'Secure payment with Stripe', qrAlt:'Scan the QR code to pay for this order with Stripe', qrFailed:'The QR code could not be displayed. Use the button to pay on this device.', interrupted:'You left Stripe Checkout. This order is still unpaid and can be paid using the same QR code.' }
  };
  const $ = selector => document.querySelector(selector);
  const text = (selector, value) => { if ($(selector).textContent !== value) $(selector).textContent = value; };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const api = globalThis.nornailsConfig?.apiUrl?.replace(/\/$/, '');
  const sessionId = query.get('session_id');
  const orderId = query.get('order_id');
  const validReference = sessionId ? /^cs_(test_|live_)?[A-Za-z0-9_]{10,250}$/.test(sessionId) : /^[a-f0-9-]{36}$/.test(orderId || '');
  const referenceQuery = sessionId ? 'session_id=' + encodeURIComponent(sessionId) : 'order_id=' + encodeURIComponent(orderId);
  let invoice = null;
  let state = 'checking';
  let busy = false;
  let timer;
  let polls = 0;
  let failures = 0;
  let lastCheck = 0;
  let drawnUrl = '';
  const copy = () => messages[language];
  const money = value => new Intl.NumberFormat(language === 'nb' ? 'nb-NO' : 'en-GB', { style:'currency', currency:'NOK' }).format(value / 100);
  const date = value => new Intl.DateTimeFormat(language === 'nb' ? 'nb-NO' : 'en-GB', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value));
  function paymentUrl() {
    try { const url = new URL(invoice?.paymentUrl); return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.username && !url.password ? url.href : null; } catch { return null; }
  }
  function statusText() { return copy()[{pending:'unpaid',paid:'paidLabel',processing:'processingLabel',failed:'failedLabel',expired:'expiredLabel'}[state] || 'unknownLabel']; }
  function render() {
    const c = copy();
    document.documentElement.lang = language;
    document.title = 'Nornails — ' + (language === 'nb' ? 'Betaling' : 'Payment');
    document.querySelectorAll('[data-payment-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.paymentLanguage === language)));
    text('#payment-eyebrow',c.eyebrow); text('#payment-title',c[state] || c.unavailable); text('#payment-message',c[state+'Body'] || c.wait);
    for (const [selector,key] of Object.entries({'#invoice-title':'invoice','#reference-label':'reference','#date-label':'date','#subtotal-label':'subtotal','#shipping-label':'shipping','#total-label':'total','#pay-now':'pay','#check-again':'retry','#retry-empty':'retry','#back-store':'back','#header-back':'headerBack','#print-order':'print','#secure-note':'secure'})) text(selector,c[key]);
    $('#back-store').href = $('#header-back').href = `index.html?lang=${language}#produkter`;
    $('#invoice-layout').hidden = !invoice;
    $('#payment-empty').hidden = Boolean(invoice);
    $('#retry-empty').hidden = !api || !validReference || !['unavailable','invalid'].includes(state);
    text('#payment-empty-message',c[state+'Body'] || c.wait);
    if (!invoice) return;
    $('#invoice-print-test').hidden = invoice.mode !== 'test'; text('#invoice-print-test',c.test);
    text('#invoice-reference',invoice.id); text('#invoice-date',date(invoice.createdAt));
    $('#invoice-items').innerHTML = invoice.items.map(item => `<article class="invoice-line"><div><h3>${escape(item.name)}</h3><p>${escape(item.unit || '')}${item.unit ? ' · ' : ''}${c.quantity}: ${item.quantity}<br>${escape(money(item.priceOre))} ${c.each}</p></div><strong>${escape(money(item.priceOre * item.quantity))}</strong></article>`).join('');
    text('#invoice-subtotal',money(invoice.subtotal)); text('#invoice-shipping',money(invoice.shippingOre)); text('#invoice-total',money(invoice.total));
    text('#delivery-title',c[invoice.fulfillment === 'shipping' ? 'delivery' : 'pickup']); text('#delivery-description',c[invoice.fulfillment === 'shipping' ? ['paid','processing'].includes(state) ? 'deliveryRecorded' : 'deliveryBody' : 'pickupBody']);
    for (const selector of ['#invoice-status','#qr-status']) { text(selector,statusText()); $(selector).dataset.state = state; }
    const url = paymentUrl();
    const payable = state === 'pending' && Boolean(url);
    $('#pay-now').hidden = !payable;
    if (payable) $('#pay-now').href = url; else $('#pay-now').removeAttribute('href');
    text('#qr-title',c[state === 'paid' ? 'paidTitle' : state === 'pending' ? 'qrTitle' : state === 'processing' ? 'processingTitle' : state] || c.unavailable);
    text('#qr-description',c[state === 'paid' ? 'paidQr' : state === 'processing' ? 'processingQr' : state === 'pending' ? 'qrBody' : 'unavailableQr']);
    $('#payment-qr').hidden = !payable;
    $('#qr-fallback').hidden = true;
    if (payable) {
      try {
        if (drawnUrl !== url) { const qr = qrcode(0,'M'); qr.addData(url); qr.make(); $('#payment-qr').innerHTML = qr.createSvgTag({cellSize:4,margin:16,scalable:true}); drawnUrl = url; }
        $('#payment-qr svg').setAttribute('role','img'); $('#payment-qr svg').setAttribute('aria-label',c.qrAlt);
      } catch { $('#payment-qr').hidden = true; $('#qr-fallback').hidden = false; text('#qr-fallback',c.qrFailed); }
    } else { $('#payment-qr').replaceChildren(); drawnUrl = ''; }
    $('#payment-result-symbol').hidden = payable;
    $('#payment-result-symbol').dataset.state = state;
    text('#payment-result-symbol',state === 'paid' ? '✓' : ['pending','processing'].includes(state) ? '…' : '×');
    text('#payment-live-note',state === 'paid' ? c.verified : state === 'unavailable' ? c.connection : c.live);
    text('#invoice-expiry',payable && invoice.expiresAt ? c.expiry + ' ' + date(invoice.expiresAt) : '');
    $('#payment-mode').hidden = invoice.mode !== 'test'; text('#payment-mode',c.test);
    $('#cancel-note').hidden = !query.has('cancelled') || state !== 'pending'; text('#cancel-note',c.interrupted);
  }
  function validateInvoice(data) {
    if (!data || data.currency !== 'NOK' || !Array.isArray(data.items) || !data.items.length || !['pickup','shipping'].includes(data.fulfillment)) throw new Error('Invalid invoice');
    if (!data.items.every(item => typeof item.name === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && Number.isInteger(item.priceOre) && item.priceOre > 0)) throw new Error('Invalid items');
    if (![data.subtotal,data.shippingOre,data.total].every(value => Number.isSafeInteger(value) && value >= 0) || data.items.reduce((sum,item) => sum + item.quantity * item.priceOre,0) !== data.subtotal || data.subtotal + data.shippingOre !== data.total || !Number.isFinite(Date.parse(data.createdAt))) throw new Error('Invalid total');
    return data;
  }
  async function check(full = false) {
    if (busy || !api || !validReference) return;
    clearTimeout(timer); busy = true; lastCheck = Date.now();
    $('#check-again').disabled = $('#retry-empty').disabled = true;
    try {
      const detailed = full || !invoice || state === 'unavailable';
      const response = await fetch(`${api}/api/checkout/${detailed ? 'invoice' : 'status'}?${referenceQuery}`, { signal:AbortSignal.timeout(12000),cache:'no-store' });
      if (!response.ok) { const error = new Error(); error.invalid = [400,404].includes(response.status); throw error; }
      const data = await response.json();
      if (detailed) invoice = validateInvoice(data);
      if (!['pending','paid','processing','failed','expired'].includes(data.status)) throw new Error('Invalid status');
      state = data.status; failures = 0; render();
      if (state === 'paid') { try { globalThis.nornailsCart?.settled(sessionId, invoice.id); } catch { /* A confirmed payment is still shown if browser storage is blocked. */ } }
    } catch (error) { state = error.invalid && !invoice ? 'invalid' : 'unavailable'; failures++; render(); }
    finally {
      busy = false; $('#check-again').disabled = $('#retry-empty').disabled = false;
      if (['pending','processing','unavailable'].includes(state) && !document.hidden) timer = setTimeout(() => check(), failures ? Math.min(10000 * failures,30000) : ++polls < 120 ? 5000 : 15000);
    }
  }
  document.querySelectorAll('[data-payment-language]').forEach(button => button.addEventListener('click',() => {
    language = button.dataset.paymentLanguage;
    try { const url = new URL(location.href); url.searchParams.set('lang',language); history.replaceState(null,'',url); } catch { /* Local preview. */ }
    render();
  }));
  $('#check-again').addEventListener('click',() => check(true)); $('#retry-empty').addEventListener('click',() => check(true));
  $('#print-order').addEventListener('click',() => window.print());
  document.addEventListener('visibilitychange',() => { clearTimeout(timer); if (!document.hidden && state !== 'paid') check(); });
  window.addEventListener('focus',() => { if (Date.now() - lastCheck > 3000 && state !== 'paid') check(); });
  window.addEventListener('pagehide',() => clearTimeout(timer));
  if (!sessionId && !orderId && query.has('cancelled')) state = 'cancelled';
  else if (!api) state = 'unconfigured';
  else if (!validReference) state = 'invalid';
  render(); if (state === 'checking') check(true);
})();
