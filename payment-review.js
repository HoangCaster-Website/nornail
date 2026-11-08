'use strict';
globalThis.nornailsCheckoutReview = { start() {
  const bag = globalThis.nornailsCart;
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const api = globalThis.nornailsConfig?.apiUrl?.replace(/\/$/, '');
  let language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'nb';
  let products = structuredClone(globalThis.nornailsCatalog);
  let checkout = {};
  let loaded = false;
  let loading = false;
  let busy = false;
  let fulfillment = '';
  let failure = '';
  const messages = {
    nb: { eyebrow:'HANDLEKURV / KASSE', title:'En siste gjennomgang.', intro:'Se over varene og velg hvordan du vil motta dem. Ingen betaling er startet ennå.', items:'Varene dine', status:'Ikke bestilt', next:'NESTE STEG', review:'Se over bestillingen.', delivery:'Velg leveringsmåte', pickup:'Hent i Sandvika', pickupBody:'Rådmann Halmrasts vei 7. Henting etter avtale.', shipping:'Levering i Norge', shippingBody:'Adressen oppgis sikkert hos Stripe under betalingen.', subtotal:'Produkter', fee:'Frakt', total:'Totalt', choose:'Velg levering', unpriced:'Pris må bekreftes', empty:'Handlekurven er tom.', emptyBody:'Legg til produkter i butikken før du fortsetter.', back:'Fortsett å handle ↗', pay:'Fortsett til betaling →', quote:'Be om tilbud ↗', contact:'Kontakt oss om bestillingen ↗', unknown:'Noen varer mangler bekreftet pris. Be om et tilbud for hele handlekurven før du betaler.', disabled:'Nettbetaling er ikke aktivert ennå. Kontakt Nornails for å avtale bestillingen.', missing:'Et produkt er ikke lenger tilgjengelig. Fjern det fra handlekurven eller kontakt oss.', unavailable:'Vi får ikke hentet oppdaterte priser og leveringsvalg. Prøv igjen før du bestiller.', wait:'Henter oppdaterte priser og leveringsvalg …', ready:'Neste steg viser bestillingen og en QR-kode for sikker betaling med Stripe.', help:'Ingen belastning før du fullfører betalingen hos Stripe.', quoteHelp:'Tilbudslenken åpner e-postappen din. Du sender selv forespørselen til Nornails.', loading:'Oppretter betalingsøkt …', error:'Betalingen kunne ikke startes. Prøv igjen eller kontakt Nornails.', changed:'Priser eller leveringsvalg har endret seg. Se gjennom den oppdaterte oversikten før du prøver igjen.', retry:'Hent oppdaterte priser', quantity:'Antall', remove:'Fjern', decrement:'Reduser antall', increment:'Øk antall', unavailableProduct:'Produktet er ikke tilgjengelig', storage:'Handlekurven kunne ikke lagres. Tillat lagring i nettleseren og prøv igjen.', test:'TESTMODUS · Ingen ekte betaling.', subject:'Tilbud på handlekurv — Nornails', greeting:'Hei Nornails,\n\nJeg ønsker pris og tilgjengelighet for disse produktene:\n', finish:'\n\nBekreft gjerne totalpris og levering. Takk!', secure:'NORNAILS · BESTILLING' },
    en: { eyebrow:'YOUR BAG / CHECKOUT', title:'One last look.', intro:'Review your items and choose how to receive them. No payment has been started yet.', items:'Your items', status:'Not ordered', next:'NEXT STEP', review:'Review your order.', delivery:'Choose delivery', pickup:'Pickup in Sandvika', pickupBody:'Rådmann Halmrasts vei 7. Pickup by arrangement.', shipping:'Delivery within Norway', shippingBody:'Enter your address securely on Stripe during payment.', subtotal:'Products', fee:'Shipping', total:'Total', choose:'Choose delivery', unpriced:'Price to be confirmed', empty:'Your bag is empty.', emptyBody:'Add products in the store before continuing.', back:'Continue shopping ↗', pay:'Continue to payment →', quote:'Request a quote ↗', contact:'Contact us about this order ↗', unknown:'Some items need confirmed prices. Request a quote for your whole bag before paying.', disabled:'Online payment has not been enabled yet. Contact Nornails to arrange your order.', missing:'A product is no longer available. Remove it from your bag or contact us.', unavailable:'We could not load current prices and delivery options. Please retry before ordering.', wait:'Loading current prices and delivery options…', ready:'The next step shows your order and a QR code for secure payment with Stripe.', help:'You are only charged when you complete payment with Stripe.', quoteHelp:'The quote link opens your email app. You send the request to Nornails yourself.', loading:'Creating your payment session…', error:'Payment could not be started. Please retry or contact Nornails.', changed:'Prices or delivery options have changed. Review the updated summary before trying again.', retry:'Refresh prices', quantity:'Quantity', remove:'Remove', decrement:'Decrease quantity', increment:'Increase quantity', unavailableProduct:'Product unavailable', storage:'Your bag could not be saved. Allow browser storage and try again.', test:'TEST MODE · No real payment.', subject:'Shopping bag quote — Nornails', greeting:'Hello Nornails,\n\nPlease confirm the price and availability of these products:\n', finish:'\n\nPlease confirm the total and delivery details. Thank you!', secure:'NORNAILS · YOUR ORDER' }
  };
  messages.nb.large = 'Bestillingen er for stor for nettbetaling. Kontakt oss for et tilbud.';
  messages.en.large = 'This order exceeds the online payment limit. Contact us for a quote.';
  const copy = () => messages[language];
  const money = value => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'nb-NO', { style:'currency',currency:'NOK' }).format(value / 100);
  const local = product => ({ ...product, ...(language === 'en' ? Object.fromEntries(Object.entries(product.translations?.en || {}).filter(([,v]) => v !== '')) : {}) });
  function current() { return bag.resolve(bag.read(), products); }
  function canPay(order = current()) {
    return loaded && !loading && !$('#review-items').querySelector('input:invalid') && checkout.enabled === true && order.subtotal !== null && order.subtotal + (fulfillment === 'shipping' ? checkout.shippingOre || 0 : 0) <= 99999999 && ((fulfillment === 'pickup' && checkout.pickupEnabled) || (fulfillment === 'shipping' && checkout.shippingEnabled && Number.isInteger(checkout.shippingOre)));
  }
  function render() {
    const c = copy();
    const order = current();
    const empty = order.lines.length === 0;
    const tooLarge = order.subtotal !== null && order.subtotal + (fulfillment === 'shipping' ? checkout.shippingOre || 0 : 0) > 99999999;
    document.documentElement.lang = language;
    document.title = 'Nornails — ' + (language === 'en' ? 'Checkout' : 'Kasse');
    document.querySelectorAll('[data-payment-language]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.paymentLanguage === language)); button.disabled = busy; });
    $('#invoice-layout').hidden = true;
    $('#payment-empty').hidden = true;
    $('#cart-checkout-layout').hidden = false;
    for (const [selector, value] of Object.entries({ '#payment-eyebrow':c.eyebrow, '#payment-title':empty ? c.empty : c.title, '#payment-message':empty ? c.emptyBody : c.intro, '#review-heading':c.items, '#review-status':c.status, '#review-eyebrow':c.next, '#review-title':c.review, '#review-delivery-label':c.delivery, '#review-subtotal-label':c.subtotal, '#review-shipping-label':c.fee, '#review-total-label':c.total, '#review-back':c.back, '#header-back':c.back, '#secure-note':c.secure, '#review-retry':c.retry })) $(selector).textContent = value;
    $('#review-back').href = $('#header-back').href = `index.html?lang=${language}#produkter`;
    $('#review-items').innerHTML = empty ? `<p class="review-empty">${c.emptyBody}</p>` : order.lines.map(({ id, quantity, product: source }) => {
      const product = source ? local(source) : null;
      const name = product ? product.brand + ' ' + product.name : c.unavailableProduct + ' · ' + id;
      return `<article class="review-line">${product ? `<img src="${escape(product.image)}" width="75" height="90" alt="" referrerpolicy="no-referrer">` : '<span class="review-missing">!</span>'}<div><h3>${escape(name)}</h3><p>${escape(product?.unit || '')}</p><strong>${product?.priceOre != null ? escape(money(product.priceOre * quantity)) : c.unpriced}</strong><div class="review-line-actions"><div class="review-quantity"><button type="button" data-review-step="-1" data-id="${id}" aria-label="${c.decrement}" ${busy || quantity === 1 ? 'disabled' : ''}>−</button><input type="number" min="1" max="20" step="1" value="${quantity}" data-review-quantity="${id}" aria-label="${escape(c.quantity + ': ' + name)}" ${busy ? 'disabled' : ''}><button type="button" data-review-step="1" data-id="${id}" aria-label="${c.increment}" ${busy || quantity === 20 ? 'disabled' : ''}>＋</button></div><button type="button" class="review-remove" data-review-remove="${id}" ${busy ? 'disabled' : ''}>${c.remove}</button></div></div></article>`;
    }).join('');
    const options = [];
    if (loaded && checkout.pickupEnabled) options.push({ value:'pickup', label:c.pickup, detail:c.pickupBody });
    if (loaded && checkout.shippingEnabled && Number.isInteger(checkout.shippingOre)) options.push({ value:'shipping', label:c.shipping + ' · ' + money(checkout.shippingOre), detail:c.shippingBody });
    if (loaded && !options.some(option => option.value === fulfillment)) fulfillment = '';
    $('#review-options').innerHTML = options.map(option => `<label class="review-option"><input type="radio" name="fulfillment" value="${option.value}" ${option.value === fulfillment ? 'checked' : ''} ${busy ? 'disabled' : ''} required><span><strong>${escape(option.label)}</strong><small>${escape(option.detail)}</small></span></label>`).join('');
    $('#review-delivery').hidden = empty || !options.length;
    $('#review-subtotal').textContent = order.subtotal === null ? c.unpriced : money(order.subtotal);
    $('#review-shipping').textContent = !fulfillment ? c.choose : money(fulfillment === 'shipping' ? checkout.shippingOre : 0);
    $('#review-total').textContent = order.subtotal === null ? c.unpriced : !fulfillment ? c.choose : money(order.subtotal + (fulfillment === 'shipping' ? checkout.shippingOre : 0));
    const notice = empty ? c.emptyBody : loading ? c.wait : !loaded ? c.unavailable : order.lines.some(line => !line.product) ? c.missing : order.subtotal === null ? c.unknown : tooLarge ? c.large : !checkout.enabled ? c.disabled : !fulfillment ? c.delivery : c.ready;
    $('#review-notice').textContent = notice;
    $('#review-pay').textContent = busy ? c.loading : c.pay;
    $('#review-pay').hidden = empty;
    $('#review-pay').disabled = busy || !canPay(order);
    $('#review-retry').hidden = loading || loaded || empty;
    $('#review-retry').disabled = busy;
    $('#review-error').textContent = failure;
    $('#review-test').hidden = checkout.mode !== 'test'; $('#review-test').textContent = c.test;
    $('#review-quote').hidden = empty || loading;
    $('#review-quote').textContent = order.subtotal === null ? c.quote : c.contact;
    const list = order.lines.map(({ id, quantity, product }) => `${quantity} × ${product ? local(product).brand + ' ' + local(product).name + ' (' + local(product).unit + ')' : id}`).join('\n');
    const delivery = fulfillment ? '\n\n' + (fulfillment === 'shipping' ? c.shipping : c.pickup) : '';
    $('#review-quote').href = 'mailto:Nornails26@gmail.com?subject=' + encodeURIComponent(c.subject) + '&body=' + encodeURIComponent(c.greeting + list + delivery + c.finish);
    $('#review-help').textContent = checkout.enabled && order.subtotal !== null ? c.help : c.quoteHelp;
  }
  async function load() {
    if (loading || busy) return;
    loading = true; loaded = false; render();
    try {
      if (!api) throw new Error('Unconfigured');
      const response = await fetch(api + '/api/catalog', { cache:'no-store',signal:AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json();
      products = data.products.map(globalThis.nornailsCommerce.product);
      checkout = data.checkout;
      loaded = true;
    } catch { loaded = false; }
    finally { loading = false; render(); }
  }
  function edit(id, quantity) {
    try { bag.set(id, quantity); failure = ''; render(); $(`[data-review-quantity="${id}"]`)?.focus(); }
    catch { failure = copy().storage; render(); }
  }
  $('#review-items').addEventListener('click', event => {
    if (busy) return;
    const step = event.target.closest('[data-review-step]');
    const remove = event.target.closest('[data-review-remove]');
    if (remove) edit(remove.dataset.reviewRemove, 0);
    if (step) edit(step.dataset.id, (bag.read().find(item => item.id === step.dataset.id)?.quantity || 1) + Number(step.dataset.reviewStep));
  });
  $('#review-items').addEventListener('change', event => {
    const input = event.target.closest('[data-review-quantity]');
    if (!input || busy) return;
    if (!input.checkValidity()) { input.reportValidity(); return; }
    edit(input.dataset.reviewQuantity, Number(input.value));
  });
  $('#review-items').addEventListener('input', () => { $('#review-pay').disabled = busy || !canPay(); });
  $('#review-form').addEventListener('change', event => { if (event.target.name === 'fulfillment') { fulfillment = event.target.value; failure = ''; render(); } });
  $('#review-retry').addEventListener('click', load);
  $('#review-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !canPay()) return;
    busy = true; failure = ''; render();
    let refresh = false;
    try {
      const items = bag.read();
      const total = current().subtotal + (fulfillment === 'shipping' ? checkout.shippingOre : 0);
      // Persist before the request so reloads/network retries reuse the same order.
      let attempt = await (navigator.locks ? navigator.locks.request('nornails-checkout', () => bag.intent(items, fulfillment, language)) : Promise.resolve(bag.intent(items, fulfillment, language)));
      let sessionId = attempt.sessionId;
      if (/^cs_(test_|live_)?[A-Za-z0-9_]{10,250}$/.test(sessionId || '')) {
        const statusResponse = await fetch(api + '/api/checkout/status?session_id=' + encodeURIComponent(sessionId), { cache:'no-store',signal:AbortSignal.timeout(12000) });
        if (!statusResponse.ok) throw new Error('checkout');
        const status = (await statusResponse.json()).status;
        if (['failed','expired'].includes(status)) { bag.clearIntent(); attempt = bag.intent(items,fulfillment,language); sessionId = null; }
        else if (!['pending','processing','paid'].includes(status)) throw new Error('checkout');
      }
      if (!/^cs_(test_|live_)?[A-Za-z0-9_]{10,250}$/.test(sessionId || '')) {
        const response = await fetch(api + '/api/checkout', { method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify({ items, fulfillment, language, requestId:attempt.requestId, expectedTotal:total }) });
        const data = await response.json();
        if (!response.ok) {
          if ([400,409].includes(response.status)) bag.clearIntent();
          if ([400,409,503].includes(response.status)) refresh = true;
          throw new Error(response.status === 409 ? 'changed' : 'checkout');
        }
        if (!/^cs_(test_|live_)?[A-Za-z0-9_]{10,250}$/.test(data.sessionId || '')) throw new Error('checkout');
        sessionId = data.sessionId;
        // If storage is blocked after the server accepted the order, still open
        // that exact session; never create another attempt to compensate.
        try { bag.saveIntent({ ...attempt, sessionId }); } catch { /* Existing requestId remains the retry key. */ }
      }
      const target = new URL('payment.html', location.href);
      target.search = new URLSearchParams({ session_id:sessionId,lang:language }).toString();
      location.replace(target.href);
    } catch (error) { failure = error.message === 'changed' ? copy().changed : ['QuotaExceededError','SecurityError'].includes(error.name) ? copy().storage : copy().error; }
    finally { busy = false; render(); if (refresh) load(); }
  });
  document.querySelectorAll('[data-payment-language]').forEach(button => button.addEventListener('click', () => {
    if (busy) return;
    language = button.dataset.paymentLanguage;
    const url = new URL(location.href); url.searchParams.set('lang',language); history.replaceState(null,'',url);
    render();
  }));
  window.addEventListener('storage', event => { if (event.key === bag.key && !busy) render(); });
  render(); load();
} };
