'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const rules = globalThis.nornailsCommerce;
  const draftKey = 'nornails.admin.catalog.v1';
  const settingsKey = 'nornails.admin.checkout.v1';
  const categoryNames = { negler: 'Negler', manikyr: 'Manikyrutstyr', pedikyr: 'Pedikyr', bits: 'Drill bits', elektrisk: 'Elektrisk utstyr', hygiene: 'Sterilisering' };
  const clone = value => structuredClone(value);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const money = value => new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);
  let products = readDraft();
  let checkoutSettings = readSettings();
  let stripe = { mode: 'unconfigured', ready: false };
  let orders = [];
  let visibility = 'all';
  let remote = false;
  let token = '';
  let apiUrl = '';
  let editing = null;
  let editorSnapshot = '';
  let busy = false;
  let toastTimeout;
  let dialogOpener = null;

  function readDraft() {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return validateCatalogue(JSON.parse(saved));
    } catch { /* Invalid or unavailable storage does not prevent viewing the seed catalogue. */ }
    return clone(globalThis.nornailsCatalog);
  }
  function readSettings() {
    try { const saved = localStorage.getItem(settingsKey); if (saved) return rules.settings({ ...JSON.parse(saved), enabled: false }); } catch { /* Default remains off. */ }
    return clone(rules.defaults);
  }
  function validateCatalogue(input) {
    const list = Array.isArray(input) ? input : input?.products;
    if (!Array.isArray(list) || list.length > 500) throw new Error('Choose a Nornails catalogue with at most 500 products.');
    const validated = list.map(rules.product);
    if (new Set(validated.map(product => product.id)).size !== validated.length) throw new Error('The file contains duplicate product IDs.');
    return validated;
  }
  function persistDraft(next) {
    try { localStorage.setItem(draftKey, JSON.stringify(next)); }
    catch { throw new Error('Browser storage is unavailable or full. Export a backup, or enable storage before saving drafts.'); }
  }
  function notify(message) {
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 5500);
  }
  function switchPage(page) {
    if (!['products', 'payments', 'orders', 'setup'].includes(page)) return;
    document.querySelectorAll('.page').forEach(section => { section.hidden = section.id !== `page-${page}`; });
    document.querySelectorAll('.nav-item').forEach(button => {
      const active = button.dataset.page === page;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    $('#breadcrumb').textContent = { products: 'Products', payments: 'Payments', orders: 'Orders', setup: 'Store setup' }[page];
    history.replaceState(null, '', `#${page}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function filteredProducts() {
    const query = $('#admin-search').value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const category = $('#category-filter').value;
    return products.filter(product => (visibility === 'all' || (visibility === 'visible' ? product.active : !product.active)) && (category === 'all' || product.category === category) && `${product.name} ${product.brand} ${product.unit} ${product.translations?.en?.name || ''} ${product.id}`.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query));
  }
  function renderProducts() {
    const visible = filteredProducts();
    $('#product-rows').innerHTML = visible.map(product => `<tr><td><div class="product-cell"><img class="product-thumb" src="${escape(product.image)}" alt="" width="62" height="67" loading="lazy" referrerpolicy="no-referrer"><div><button class="product-name" data-admin-raw data-edit="${escape(product.id)}">${escape(product.brand)} ${escape(product.name)}</button><span class="product-unit" data-admin-raw>${escape(product.unit || product.id)}</span></div></div></td><td><span class="category-tag">${escape(categoryNames[product.category])}</span></td><td><button class="price-button ${product.priceOre === null ? 'unset' : ''}" data-price="${escape(product.id)}" aria-label="Edit price for ${escape(product.name)}">${product.priceOre === null ? '＋ Add price' : money(product.priceOre)}</button></td><td><span class="visibility-tag ${product.active ? '' : 'hidden-tag'}">${product.active ? 'Visible' : 'Hidden'}</span></td><td><button class="edit-button" data-edit="${escape(product.id)}" aria-label="Edit ${escape(product.name)}">Edit ↗</button></td></tr>`).join('');
    $('#product-empty').hidden = visible.length !== 0;
    $('#table-count').textContent = `${visible.length} of ${products.length} products`;
    $('#stat-total').textContent = products.length;
    $('#nav-count').textContent = products.length;
    $('#stat-visible').textContent = products.filter(product => product.active).length;
    $('#stat-unpriced').textContent = products.filter(product => product.priceOre === null).length;
    $('#stat-payment').textContent = remote && stripe.ready ? checkoutSettings.enabled ? `${stripe.mode === 'test' ? 'Test' : 'Live'} checkout` : 'Checkout off' : 'Not connected';
  }
  function renderMode() {
    $('#connection-pill').textContent = remote ? 'Store connected' : 'Local draft';
    $('#connection-pill').classList.toggle('connected', remote);
    $('#connect-open').hidden = remote;
    $('#logout').hidden = !remote;
    $('#save-note').textContent = remote ? 'Changes publish to the connected store' : 'Drafts stay in this browser';
    $('#footer-mode').textContent = remote ? 'Connected store workspace' : 'Local preparation workspace';
    $('#mode-notice').innerHTML = remote ? '<span class="notice-dot" aria-hidden="true"></span><p><strong>Store connected.</strong> Saved products and prices update the public catalogue. Checkout remains controlled by your payment settings.</p><button class="text-button" id="reload-state">Refresh catalogue →</button>' : '<span class="notice-dot" aria-hidden="true"></span><p><strong>Prepare your store.</strong> Changes are saved as drafts in this browser. Connect the store API to publish products and prices to the website.</p><button class="text-button" data-page="setup">Setup guide →</button>';
    $('#import-open').disabled = remote;
    $('#import-open').title = remote ? 'Catalogue imports are for local drafts. Use the product editor to update a connected store.' : '';
  }
  function renderPayments() {
    $('#stripe-mode').textContent = stripe.mode === 'unconfigured' ? 'Stripe not connected' : `${stripe.mode === 'test' ? 'Test' : 'Live'} mode`;
    $('#stripe-status').textContent = stripe.ready ? 'Configured on server' : 'Awaiting credentials';
    $('#key-status').textContent = stripe.secretConfigured ? 'Configured on server' : 'Not configured';
    $('#webhook-status').textContent = stripe.webhookConfigured ? 'Configured on server' : 'Not configured';
    $('#webhook-url').textContent = stripe.webhookUrl || 'Connect the store API first';
    $('#webhook-secret-name').textContent = stripe.connect?.enabled ? 'STRIPE_CONNECT_WEBHOOK_SECRET' : 'STRIPE_WEBHOOK_SECRET';
    $('#test-stripe').disabled = !remote || !stripe.secretConfigured;
    const form = $('#payment-settings');
    form.elements.enabled.checked = checkoutSettings.enabled;
    form.elements.enabled.disabled = !remote || !stripe.ready;
    form.elements.pickupEnabled.checked = checkoutSettings.pickupEnabled;
    form.elements.shippingEnabled.checked = checkoutSettings.shippingEnabled;
    form.elements.shipping.value = checkoutSettings.shippingOre === null ? '' : (checkoutSettings.shippingOre / 100).toFixed(2);
    form.elements.taxMode.value = checkoutSettings.taxMode;
    form.elements.termsUrl.value = checkoutSettings.termsUrl;
    form.elements.termsConfirmed.checked = checkoutSettings.termsConfirmed;
    $('#shipping-field').hidden = !checkoutSettings.shippingEnabled;
    renderConnect();
  }
  const setupStatuses = { not_connected: 'Not started', invited: 'Not started', success: 'Successful', pending: 'Awaiting Stripe review', needs_information: 'More information needed', failed: 'Setup failed', cancelled: 'Cancelled', disconnected: 'Disconnected' };
  function renderConnect() {
    const connection = stripe.connect;
    $('#merchant-status').textContent = setupStatuses[connection?.status] || 'Not started';
    $('#merchant-status').classList.toggle('connected', connection?.status === 'success');
    $('#create-setup-link').disabled = !remote || !connection?.configured;
    $('#refresh-setup').disabled = !remote || !connection?.configured;
    $('#revoke-setup-links').disabled = !remote || !connection?.configured;
    $('#setup-link-help').textContent = !remote ? 'Connect the store API and configure Stripe Connect before creating a real customer link.' : !connection?.configured ? 'Stripe Connect is not configured on this API yet.' : 'Share the setup link with the store owner. A newly created link replaces previous setup invitations.';
  }
  $('#create-setup-link').addEventListener('click', async () => {
    const button = $('#create-setup-link');
    if (button.disabled) return;
    if ($('#setup-link-url').value && !await confirmAction('Replace the existing setup link?', 'The previous invitation will stop working.', 'Create new link')) return;
    button.disabled = true;
    button.textContent = 'Creating link…';
    $('#setup-link-feedback').textContent = '';
    try {
      const result = await request('/api/admin/connect/invites', { method: 'POST', body: JSON.stringify({ hours: Number($('#setup-expiry').value), language: globalThis.nornailsAdminI18n.language }) });
      $('#setup-link-url').value = result.url;
      $('#setup-link-expiry').textContent = 'Link expires: ' + new Date(result.expiresAt).toLocaleString(globalThis.nornailsAdminI18n.language === 'vi' ? 'vi-VN' : 'en-GB');
      $('#setup-link-result').hidden = false;
      $('#setup-link-feedback').textContent = result.mode === 'test' ? 'Test setup · no real payments are enabled by this flow.' : 'Share the setup link with the store owner. A newly created link replaces previous setup invitations.';
    } catch (error) { $('#setup-link-feedback').textContent = error.message; }
    finally { button.textContent = 'Create setup link ↗'; renderConnect(); }
  });
  $('#copy-setup-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#setup-link-url').value); notify('Copied setup link.'); }
    catch { $('#setup-link-url').focus(); $('#setup-link-url').select(); notify('Could not copy automatically. Select and copy the link below.'); }
  });
  $('#refresh-setup').addEventListener('click', async () => {
    $('#refresh-setup').disabled = true;
    try { stripe.connect = await request('/api/admin/connect/refresh', { method: 'POST' }); await loadState(); }
    catch (error) { $('#setup-link-feedback').textContent = error.message; }
    finally { renderConnect(); }
  });
  $('#revoke-setup-links').addEventListener('click', async () => {
    if (!await confirmAction('Revoke all setup links?', 'Existing setup invitations and their return sessions will stop working. This does not disconnect the Stripe merchant.', 'Revoke links')) return;
    $('#revoke-setup-links').disabled = true;
    try {
      await request('/api/admin/connect/revoke', { method: 'POST' });
      $('#setup-link-result').hidden = true;
      $('#setup-link-url').value = '';
      notify('Setup links revoked. The Stripe account itself is unchanged.');
    } catch (error) { $('#setup-link-feedback').textContent = error.message; }
    finally { renderConnect(); }
  });

  function orderDelivery(order) {
    let details = null;
    try { details = order.delivery_details ? JSON.parse(order.delivery_details) : null; } catch { /* Older orders may not include delivery details. */ }
    const address = details?.address;
    const lines = details ? [details.name, address?.line1, address?.line2, [address?.postal_code, address?.city].filter(Boolean).join(' '), address?.country].filter(Boolean) : [];
    return `<p class="order-delivery"><strong>${order.fulfillment === 'shipping' ? 'Delivery within Norway' : 'Pickup in Sandvika'}</strong>${lines.length ? '<br>' + lines.map(escape).join('<br>') : ''}</p>`;
  }
  function renderOrders() {
    if (!orders.length) {
      $('#orders-content').innerHTML = `<div class="orders-empty"><p class="eyebrow">${remote ? 'NO ORDERS YET' : 'READY WHEN YOU ARE'}</p><h2>Your orders will arrive here.</h2><p>${remote ? 'Completed checkouts appear after Stripe sends a verified payment event. No sample orders are shown.' : 'Connect your store API and configure Stripe to receive orders. No sample sales or customer data is used.'}</p></div>`;
      return;
    }
    $('#orders-content').innerHTML = '<p class="helper">Showing the 100 most recent checkout attempts. Only “Paid” means payment was confirmed. Test orders are labelled.</p>' + orders.map(order => `<article class="order-card"><div><h3>${escape(order.email || 'Checkout in progress')}<span class="pill">${order.mode === 'test' ? 'TEST' : 'LIVE'}</span></h3><p>${order.items.map(item => `${escape(item.name)} × ${item.quantity}`).join(' · ')}</p>${orderDelivery(order)}<code>${escape(order.id)}</code><br><small>${escape(new Date(order.created_at).toLocaleString())}</small></div><div><strong>${money(order.amount)} NOK</strong><span class="pill ${order.status === 'paid' ? 'connected' : ''}">${escape({ paid: 'Paid', pending: 'Unpaid', processing: 'Processing payment', failed: 'Failed', expired: 'Expired' }[order.status] || 'Pending')}</span></div></article>`).join('');
  }
  function renderAll() { renderMode(); renderProducts(); renderPayments(); renderOrders(); }
  async function request(path, options = {}, base = apiUrl, accessToken = token) {
    let response;
    try { response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...options.headers } }); }
    catch { throw new Error('Could not reach the store API. Check the URL, connection and allowed origins.'); }
    let data;
    try { data = await response.json(); } catch { throw new Error('The server did not return a valid API response. Check the API URL.'); }
    if (!response.ok) {
      if (response.status === 401 && remote) {
        token = '';
        $('#connection-pill').textContent = 'Session expired';
        $('#connect-open').hidden = false;
        $('#connect-open').textContent = 'Sign in again';
      }
      throw new Error(data.error || 'The request could not be completed.');
    }
    return data;
  }
  async function loadState() {
    const state = await request('/api/admin/state');
    products = state.products.map(product => ({ ...rules.product(product), version: product.version }));
    checkoutSettings = rules.settings(state.settings);
    stripe = state.stripe;
    orders = state.orders;
    renderAll();
  }
  function openDialog(id) { dialogOpener = document.activeElement; $(id).showModal(); }
  function closeDialog(id) { $(id).close(); if (dialogOpener?.isConnected) dialogOpener.focus(); }
  function confirmAction(title, message, action) {
    $('#confirm-title').textContent = title;
    $('#confirm-message').textContent = message;
    $('#confirm-accept').textContent = action;
    const dialog = $('#confirm-dialog');
    dialog.showModal();
    return new Promise(resolve => {
      function finish(value) { dialog.close(); $('#confirm-accept').removeEventListener('click', accept); $('#confirm-cancel').removeEventListener('click', cancel); dialog.removeEventListener('cancel', cancel); resolve(value); }
      const accept = () => finish(true);
      const cancel = event => { event?.preventDefault(); finish(false); };
      $('#confirm-accept').addEventListener('click', accept);
      $('#confirm-cancel').addEventListener('click', cancel);
      dialog.addEventListener('cancel', cancel);
    });
  }
  function editorValues() { return JSON.stringify([...new FormData($('#product-form'))]); }
  function openEditor(id, focusPrice = false) {
    editing = id ? clone(products.find(product => product.id === id)) : null;
    if (id && !editing) return;
    const product = editing || { id: '', name: '', brand: '', category: 'negler', unit: '', short: '', description: '', image: '', active: false, safety: false, priceOre: null, translations: { en: {} } };
    const form = $('#product-form');
    form.reset();
    ['name', 'brand', 'category', 'unit', 'short', 'description', 'image'].forEach(key => { form.elements[key].value = product[key] || ''; });
    ['name', 'unit', 'short', 'description'].forEach(key => { form.elements[`${key}En`].value = product.translations?.en?.[key] || ''; });
    form.elements.price.value = product.priceOre === null ? '' : (product.priceOre / 100).toFixed(2);
    form.elements.active.value = String(product.active);
    form.elements.safety.checked = product.safety;
    $('#editor-title').textContent = editing ? 'Edit product' : 'Add product';
    $('#delete-product').hidden = !editing;
    $('#editor-error').textContent = '';
    $('#image-preview').src = product.image || 'assets/favicon.svg';
    $('#save-product').textContent = remote ? 'Save & publish →' : 'Save draft →';
    editorSnapshot = editorValues();
    openDialog('#product-editor');
    if (focusPrice) form.elements.price.focus();
  }
  async function maybeCloseEditor() {
    if (busy) return;
    if (editorSnapshot !== editorValues() && !await confirmAction('Discard unsaved changes?', 'Your last saved product will be kept.', 'Discard changes')) return;
    closeDialog('#product-editor');
  }
  async function saveProduct(event) {
    event.preventDefault();
    if (busy) return;
    const form = $('#product-form');
    try {
      const values = Object.fromEntries(new FormData(form));
      const category = values.category;
      const group = category === 'negler' ? 'liquid' : category === 'hygiene' ? 'hygiene' : 'utstyr';
      const input = { ...(editing || {}), id: editing?.id || 'p-' + crypto.randomUUID(), name: values.name, brand: values.brand, group, category, unit: values.unit, short: values.short, description: values.description, tag: categoryNames[category].toUpperCase(), image: values.image, active: values.active === 'true', safety: form.elements.safety.checked, priceOre: rules.price(values.price), specs: editing?.specs || [], translations: { en: { ...editing?.translations?.en, name: values.nameEn, unit: values.unitEn, short: values.shortEn, description: values.descriptionEn, tag: { negler: 'NAIL PRODUCTS', manikyr: 'MANICURE', pedikyr: 'PEDICURE', bits: 'DRILL BITS', elektrisk: 'ELECTRICAL EQUIPMENT', hygiene: 'HYGIENE' }[category] } } };
      let saved = rules.product(input);
      busy = true;
      $('#save-product').disabled = true;
      if (remote) saved = await request(editing ? `/api/admin/products/${editing.id}` : '/api/admin/products', { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ ...saved, version: editing?.version }) });
      const next = editing ? products.map(product => product.id === editing.id ? saved : product) : [...products, saved];
      if (!remote) persistDraft(next);
      products = next;
      renderProducts();
      closeDialog('#product-editor');
      notify(remote ? 'Product saved to the store.' : 'Draft saved in this browser. The public store is unchanged.');
    } catch (error) { $('#editor-error').textContent = error.message; }
    finally { busy = false; $('#save-product').disabled = false; }
  }
  async function deleteProduct() {
    if (!editing || busy) return;
    const accepted = await confirmAction('Delete this product?', `${editing.brand} ${editing.name} will be removed ${remote ? 'from the connected store' : 'from this browser draft'}. Export a catalogue backup if you need to keep a copy.`, 'Delete product');
    if (!accepted) return;
    busy = true;
    $('#delete-product').disabled = true;
    try {
      if (remote) await request(`/api/admin/products/${editing.id}?version=${editing.version}`, { method: 'DELETE' });
      const next = products.filter(product => product.id !== editing.id);
      if (!remote) persistDraft(next);
      products = next;
      renderProducts();
      closeDialog('#product-editor');
      notify(remote ? 'Product deleted from the store.' : 'Product deleted from the browser draft.');
    } catch (error) { $('#editor-error').textContent = error.message; }
    finally { busy = false; $('#delete-product').disabled = false; }
  }
  document.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) switchPage(pageButton.dataset.page);
    const editButton = event.target.closest('[data-edit]');
    if (editButton) openEditor(editButton.dataset.edit);
    const priceButton = event.target.closest('[data-price]');
    if (priceButton) openEditor(priceButton.dataset.price, true);
    const closeButton = event.target.closest('[data-close]');
    if (closeButton) { if (closeButton.dataset.close === 'product-editor') maybeCloseEditor(); else closeDialog(`#${closeButton.dataset.close}`); }
    const visibilityButton = event.target.closest('[data-visibility]');
    if (visibilityButton) {
      visibility = visibilityButton.dataset.visibility;
      document.querySelectorAll('[data-visibility]').forEach(button => { const active = button === visibilityButton; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
      renderProducts();
    }
    if (event.target.closest('#reload-state')) refreshState();
  });
  async function refreshState() {
    if (!remote) { notify('Connect the store API to load orders and published products.'); return; }
    try { await loadState(); notify('Store data refreshed.'); } catch (error) { notify(error.message); }
  }
  $('#add-product').addEventListener('click', () => openEditor());
  $('#product-form').addEventListener('submit', saveProduct);
  $('#delete-product').addEventListener('click', deleteProduct);
  $('#product-editor').addEventListener('cancel', event => { event.preventDefault(); maybeCloseEditor(); });
  $('#product-form').elements.image.addEventListener('change', event => {
    try { $('#image-preview').src = rules.image(event.target.value); } catch { $('#image-preview').src = 'assets/favicon.svg'; }
  });
  document.addEventListener('error', event => { if (event.target.tagName === 'IMG' && !event.target.src.endsWith('/assets/favicon.svg')) event.target.src = 'assets/favicon.svg'; }, true);
  $('#admin-search').addEventListener('input', renderProducts);
  $('#category-filter').addEventListener('change', renderProducts);
  $('#clear-filters').addEventListener('click', () => { $('#admin-search').value = ''; $('#category-filter').value = 'all'; document.querySelector('[data-visibility="all"]').click(); });
  $('#refresh-orders').addEventListener('click', refreshState);
  $('#connect-open').addEventListener('click', () => {
    const form = $('#connect-form');
    let saved = '';
    try { saved = localStorage.getItem('nornails.admin.apiUrl') || ''; } catch { /* Optional convenience. */ }
    form.elements.apiUrl.value = apiUrl || globalThis.nornailsConfig.apiUrl || saved;
    form.elements.password.value = '';
    $('#connect-error').textContent = '';
    openDialog('#connect-dialog');
  });
  $('#connect-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('#connect-submit');
    if (button.disabled) return;
    button.disabled = true;
    let newToken = '';
    let base = '';
    try {
      const fields = $('#connect-form').elements;
      const url = new URL(fields.apiUrl.value);
      if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use an HTTPS API origin, without a path. Localhost HTTP is allowed for development.');
      base = url.origin;
      const session = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: fields.email.value.trim(), password: fields.password.value }) }, base, '');
      newToken = session.token;
      const state = await request('/api/admin/state', {}, base, newToken);
      const nextProducts = state.products.map(product => ({ ...rules.product(product), version: product.version }));
      apiUrl = base;
      token = newToken;
      remote = true;
      products = nextProducts;
      checkoutSettings = rules.settings(state.settings);
      stripe = state.stripe;
      orders = state.orders;
      fields.password.value = '';
      try { localStorage.setItem('nornails.admin.apiUrl', apiUrl); } catch { /* The session token remains in memory only. */ }
      closeDialog('#connect-dialog');
      renderAll();
      notify('Signed in. The server catalogue is loaded; your local draft is still saved separately.');
    } catch (error) {
      if (newToken) { try { await request('/api/admin/logout', { method: 'POST' }, base, newToken); } catch { /* Token expires automatically. */ } }
      $('#connect-error').textContent = error.message;
    } finally { button.disabled = false; }
  });
  $('#logout').addEventListener('click', async () => {
    $('#logout').disabled = true;
    try { if (token) await request('/api/admin/logout', { method: 'POST' }); }
    catch (error) { notify(error.message + ' The local session has been cleared.'); }
    finally {
      remote = false; token = ''; apiUrl = ''; products = readDraft(); checkoutSettings = readSettings(); stripe = { mode: 'unconfigured', ready: false }; orders = [];
      $('#setup-link-url').value = '';
      $('#setup-link-result').hidden = true;
      $('#setup-link-feedback').textContent = '';
      $('#logout').disabled = false;
      $('#connect-open').innerHTML = 'Connect store ↗';
      renderAll();
    }
  });
  $('#shipping-enabled').addEventListener('change', event => { $('#shipping-field').hidden = !event.target.checked; });
  $('#payment-settings').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    try {
      const fields = form.elements;
      const shippingText = fields.shipping.value.trim();
      const shippingOre = shippingText === '' ? null : /^0([.,]0{1,2})?$/.test(shippingText) ? 0 : rules.price(shippingText);
      let config = rules.settings({ enabled: remote && fields.enabled.checked, pickupEnabled: fields.pickupEnabled.checked, shippingEnabled: fields.shippingEnabled.checked, shippingOre, taxMode: fields.taxMode.value, termsUrl: fields.termsUrl.value.trim(), termsConfirmed: fields.termsConfirmed.checked });
      if (remote) config = await request('/api/admin/settings', { method: 'PUT', body: JSON.stringify(config) });
      else { try { localStorage.setItem(settingsKey, JSON.stringify(config)); } catch { throw new Error('Browser storage is unavailable. Settings were not saved.'); } }
      checkoutSettings = config;
      renderProducts();
      $('#settings-feedback').textContent = remote ? 'Checkout settings saved on the server.' : 'Draft settings saved in this browser. Checkout remains off.';
    } catch (error) { $('#settings-feedback').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('#test-stripe').addEventListener('click', async () => {
    $('#test-stripe').disabled = true;
    try { const result = await request('/api/admin/stripe/test', { method: 'POST' }); $('#stripe-test-result').textContent = `Stripe ${result.mode} credentials accepted. Charges ${result.chargesEnabled ? 'enabled' : 'not enabled'} on the account. Webhook delivery still needs an end-to-end test.`; }
    catch (error) { $('#stripe-test-result').textContent = error.message; }
    finally { $('#test-stripe').disabled = !remote || !stripe.secretConfigured; }
  });
  $('#export-products').addEventListener('click', () => {
    const data = { format: 'nornails-catalog-v1', exportedAt: new Date().toISOString(), products: products.map(rules.product) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `nornails-catalog-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Catalogue exported. Keep this file as a backup.');
  });
  $('#import-open').addEventListener('click', () => { if (!remote) $('#import-file').click(); });
  $('#import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file || remote) return;
    try {
      if (file.size > 1048576) throw new Error('Choose a catalogue file smaller than 1 MB.');
      const next = validateCatalogue(JSON.parse(await file.text()));
      if (!await confirmAction('Replace your local draft?', `${next.length} products will replace the catalogue draft in this browser. The public store is unchanged.`, 'Import draft')) return;
      persistDraft(next); products = next; renderProducts(); notify('Catalogue imported as a local draft.');
    } catch (error) { notify(error.message); }
    finally { event.target.value = ''; }
  });
  window.addEventListener('beforeunload', event => { if ($('#product-editor').open && editorSnapshot !== editorValues()) event.preventDefault(); });
  renderAll();
  switchPage(location.hash.slice(1) || 'products');
})();
