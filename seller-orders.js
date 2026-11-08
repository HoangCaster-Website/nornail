'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const storageKey = 'nornails.sandbox.seller.viewer.v1';
  const api = 'https://clyshqnbxapwipacbaxd.supabase.co/functions/v1/nornails-sandbox-api';
  const fragment = new URLSearchParams(location.hash.slice(1));
  let viewer = '';
  try { viewer = sessionStorage.getItem(storageKey) || ''; } catch { /* This tab can still use its private link. */ }
  if (/^v_[a-f0-9]{64}$/.test(fragment.get('viewer') || '')) {
    viewer = fragment.get('viewer');
    try { sessionStorage.setItem(storageKey,viewer); } catch { /* Retained in memory only. */ }
  }
  // The capability travels in the fragment, never a query/referrer or API URL.
  if (fragment.has('viewer')) history.replaceState(null,'',location.pathname + location.search + '#orders');
  let source = globalThis.nornailsConfig.sandbox ? 'sandbox' : 'live';
  let page = '';
  let orders = [];
  let authorized = false;
  let loaded = false;
  let loading = false;
  let message = '';
  let updated = '';
  let selected = '';
  let opener;
  let timer;
  let controller;
  let sequence = 0;
  const statuses = {paid:'Paid',pending:'Unpaid',processing:'Processing payment',failed:'Failed',expired:'Expired'};
  const money = amount => new Intl.NumberFormat('nb-NO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(amount / 100) + ' NOK';
  const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(globalThis.nornailsAdminI18n.language === 'vi' ? 'vi-VN' : 'en-GB') : '—';
  const items = order => Array.isArray(order.items) ? order.items : [];
  function invoiceLink(order) {
    const url = new URL('payment.html',location.href);
    url.search = new URLSearchParams({order_id:order.id,lang:'en',sandbox:'1'}).toString();
    return url.href;
  }
  function delivery(order) {
    let data;
    try { data = order.delivery_details ? JSON.parse(order.delivery_details) : null; } catch { /* Incomplete legacy data. */ }
    const address = data?.address;
    return [data?.name,address?.line1,address?.line2,[address?.postal_code,address?.city].filter(Boolean).join(' '),address?.country].filter(Boolean).map(escape).join('<br>');
  }
  function filtered() {
    const query = $('#seller-search').value.trim().toLocaleLowerCase();
    const status = $('#seller-status').value;
    return orders.filter(order => (status === 'all' || order.status === status) && [order.id,order.email,...items(order).map(item => item.name)].join(' ').toLocaleLowerCase().includes(query));
  }
  function renderDetails(id) {
    const order = orders.find(order => order.id === id);
    if (!order) return;
    const subtotal = items(order).reduce((sum,item) => sum + item.quantity * item.priceOre,0);
    $('#seller-detail-content').innerHTML = `<div class="seller-detail-meta"><span class="pill ${order.status === 'paid' ? 'connected' : ''}">${escape(statuses[order.status] || 'Unpaid')}</span><span class="pill">TEST</span><dl><div><dt>Order reference</dt><dd data-admin-raw>${escape(order.id)}</dd></div><div><dt>Created</dt><dd data-admin-raw>${escape(date(order.created_at))}</dd></div><div><dt>Customer</dt><dd>${order.email ? `<span data-admin-raw>${escape(order.email)}</span>` : 'Customer details pending'}</dd></div><div><dt>Delivery</dt><dd>${order.fulfillment === 'shipping' ? 'Delivery within Norway' : 'Pickup in Sandvika'}${delivery(order) ? '<br><span data-admin-raw>' + delivery(order) + '</span>' : ''}</dd></div></dl></div><div class="seller-detail-items">${items(order).map(item => `<article><div><strong data-admin-raw>${escape(item.name)}</strong><p data-admin-raw>${escape(item.unit)}</p><p><span>Quantity</span>: <span data-admin-raw>${escape(item.quantity)} × ${escape(money(item.priceOre))}</span></p></div><strong data-admin-raw>${escape(money(item.quantity * item.priceOre))}</strong></article>`).join('')}</div><dl class="seller-detail-totals"><div><dt>Products subtotal</dt><dd data-admin-raw>${escape(money(subtotal))}</dd></div><div><dt>Shipping</dt><dd data-admin-raw>${escape(money(order.shipping_ore || 0))}</dd></div><div><dt>Total</dt><dd data-admin-raw>${escape(money(order.amount))}</dd></div></dl><a class="button" href="${escape(invoiceLink(order))}" target="_blank" rel="noopener noreferrer">View invoice / print ↗</a><p class="helper">Test order only. No real money or shipment.</p>`;
  }
  function render() {
    const active = source === 'sandbox';
    $('#seller-orders-view').hidden = !active;
    $('#orders-content').hidden = active;
    $('#mode-notice').hidden = active && page === 'orders';
    document.querySelectorAll('[data-orders-source]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.ordersSource === source)));
    $('#seller-forget').hidden = !viewer;
    $('#refresh-orders').disabled = active && loading;
    $('#seller-feedback').textContent = loading ? 'Loading sandbox orders…' : message;
    $('#seller-updated').innerHTML = updated && authorized ? '<span>Updated</span>: <span data-admin-raw>' + escape(date(updated)) + '</span> · <span>Automatically refreshes while this page is open.</span>' : '';
    const paid = orders.filter(order => order.status === 'paid');
    $('#seller-count').textContent = loaded && authorized ? orders.length : '—';
    $('#seller-paid-count').textContent = loaded && authorized ? paid.length : '—';
    $('#seller-paid-total').textContent = loaded && authorized ? money(paid.reduce((sum,order) => sum + order.amount,0)) : '—';
    if (!viewer || !authorized) {
      $('#seller-order-list').innerHTML = `<div class="orders-empty"><p class="eyebrow">PRIVATE SELLER VIEW</p><h2>${loading ? 'Loading your orders…' : 'Open your private seller link.'}</h2><p>Use the private admin sandbox link to view test orders. It does not require creating an account.</p></div>`;
      return;
    }
    const visible = filtered();
    $('#seller-order-list').innerHTML = '<p class="helper">Showing the latest 100 sandbox checkouts. Only Paid means Stripe confirmed payment.</p>' + (visible.length ? visible.map(order => `<article class="order-card seller-order-card" data-seller-order="${escape(order.id)}"><div><h3>${order.email ? `<span data-admin-raw>${escape(order.email)}</span>` : 'Customer details pending'} <span class="pill">TEST</span></h3><p>${items(order).map(item => `<span data-admin-raw>${escape(item.name)} × ${escape(item.quantity)}</span>`).join(' · ')}</p><p>${order.fulfillment === 'shipping' ? 'Delivery within Norway' : 'Pickup in Sandvika'}</p><code data-admin-raw>${escape(order.id)}</code><br><small data-admin-raw>${escape(date(order.created_at))}</small></div><div class="seller-order-actions"><strong data-admin-raw>${escape(money(order.amount))}</strong><span class="pill ${order.status === 'paid' ? 'connected' : ''}">${escape(statuses[order.status] || 'Unpaid')}</span><button class="text-button" type="button" data-seller-detail="${escape(order.id)}">Order details ↗</button><a class="text-button" href="${escape(invoiceLink(order))}" target="_blank" rel="noopener noreferrer">View invoice / print ↗</a></div></article>`).join('') : '<div class="orders-empty"><h2>No matching orders.</h2><p>Try another search or payment status.</p></div>');
    if (selected && $('#seller-order-dialog').open) renderDetails(selected);
  }
  function schedule() {
    clearTimeout(timer);
    if (source === 'sandbox' && page === 'orders' && viewer && authorized && !document.hidden) timer = setTimeout(refresh,30000);
  }
  async function refresh() {
    if (loading || source !== 'sandbox') return;
    clearTimeout(timer);
    if (!/^v_[a-f0-9]{64}$/.test(viewer)) { message = ''; render(); return; }
    const current = ++sequence;
    const requestController = new AbortController();
    controller = requestController;
    const deadline = setTimeout(() => requestController.abort(),15000);
    loading = true; message = ''; render();
    try {
      const response = await fetch(api + '/api/seller/orders',{headers:{Authorization:'Bearer ' + viewer},cache:'no-store',signal:requestController.signal});
      if (current !== sequence) return;
      if (response.status === 401) { forget(); message = 'Your viewer link is invalid or expired. Reopen the private seller link.'; return; }
      const data = await response.json();
      if (current !== sequence) return;
      if (!response.ok || data.mode !== 'test' || !data.readOnly || !Array.isArray(data.orders)) throw new Error('Unavailable');
      orders = data.orders; authorized = true; loaded = true; updated = new Date().toISOString();
    } catch { if (current === sequence) message = 'Could not refresh sandbox orders. Try again.'; }
    finally {
      clearTimeout(deadline);
      if (current === sequence) { loading = false; render(); schedule(); }
      else render();
    }
  }
  function forget() {
    sequence++; controller?.abort(); clearTimeout(timer);
    viewer = ''; authorized = false; loaded = false; loading = false; orders = []; updated = ''; message = '';
    try { sessionStorage.removeItem(storageKey); } catch { /* In-memory state is cleared too. */ }
    $('#seller-search').value = ''; $('#seller-status').value = 'all';
    if ($('#seller-order-dialog').open) $('#seller-order-dialog').close();
    $('#seller-detail-content').replaceChildren();
    render();
  }
  document.querySelectorAll('[data-orders-source]').forEach(button => button.addEventListener('click', () => {
    clearTimeout(timer); sequence++; controller?.abort(); loading = false;
    source = button.dataset.ordersSource;
    if ($('#seller-order-dialog').open) $('#seller-order-dialog').close();
    render(); if (source === 'sandbox') refresh();
    document.dispatchEvent(new CustomEvent('nornails:orders-source'));
  }));
  $('#seller-search').addEventListener('input',render);
  $('#seller-status').addEventListener('change',render);
  $('#seller-forget').addEventListener('click',forget);
  $('#seller-order-list').addEventListener('click', event => {
    const button = event.target.closest('[data-seller-detail]');
    if (!button) return;
    selected = button.dataset.sellerDetail; opener = button; renderDetails(selected); $('#seller-order-dialog').showModal();
  });
  $('#seller-detail-close').addEventListener('click', () => $('#seller-order-dialog').close());
  $('#seller-order-dialog').addEventListener('close', () => { selected = ''; if (opener?.isConnected) opener.focus(); });
  document.addEventListener('nornails:admin-page', event => { page = event.detail; render(); if (page === 'orders' && source === 'sandbox') refresh(); else clearTimeout(timer); });
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); if (!document.hidden && page === 'orders' && source === 'sandbox') refresh(); });
  document.addEventListener('nornails:admin-language',render);
  window.addEventListener('pagehide', () => { clearTimeout(timer); controller?.abort(); });
  globalThis.nornailsSellerOrders = {refresh,get active(){return source === 'sandbox';}};
  render();
})();
