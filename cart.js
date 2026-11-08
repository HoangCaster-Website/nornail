'use strict';
// Persist identifiers and quantities only. Prices always come from the store API.
globalThis.nornailsCart = (() => {
  const key = globalThis.nornailsConfig?.sandbox ? 'nornails.sandbox.cart.v1' : 'nornails.cart.v1';
  const intentKey = globalThis.nornailsConfig?.sandbox ? 'nornails.sandbox.cart.checkout.v1' : 'nornails.cart.checkout.v1';
  function validate(items) {
    if (!Array.isArray(items) || items.length > 20) throw new Error('Invalid basket.');
    const ids = new Set();
    return items.map(item => {
      if (!item || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(item.id) || ids.has(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new Error('Invalid basket item.');
      ids.add(item.id);
      return { id: item.id, quantity: item.quantity };
    });
  }
  function readRecord() {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{"items":[],"settled":[]}');
      return { items: validate(saved.items), settled: Array.isArray(saved.settled) ? saved.settled.filter(id => typeof id === 'string').slice(-30) : [] };
    } catch { return { items: [], settled: [] }; }
  }
  function read() { return readRecord().items; }
  function write(items, settled = readRecord().settled) {
    const clean = validate(items);
    localStorage.setItem(key, JSON.stringify({ items: clean, settled }));
    return clean;
  }
  function add(id, quantity = 1) {
    const items = read();
    const item = items.find(item => item.id === id);
    if (item) item.quantity += quantity; else items.push({ id, quantity });
    return write(items);
  }
  function set(id, quantity) {
    const items = read();
    const item = items.find(item => item.id === id);
    if (item) item.quantity = quantity;
    return write(items.filter(item => item.quantity !== 0));
  }
  function resolve(items, products) {
    const lines = validate(items).map(item => ({ ...item, product: products.find(product => product.id === item.id && product.active) || null }));
    const complete = lines.length > 0 && lines.every(line => Number.isInteger(line.product?.priceOre) && line.product.priceOre > 0);
    const subtotal = complete ? lines.reduce((sum, line) => sum + line.product.priceOre * line.quantity, 0) : null;
    return { lines, subtotal };
  }
  function intent(items, fulfillment, language) {
    const clean = validate(items);
    const signature = JSON.stringify({ items: [...clean].sort((a,b) => a.id.localeCompare(b.id)), fulfillment, language });
    let previous;
    try { previous = JSON.parse(localStorage.getItem(intentKey)); } catch { /* Fresh attempt. */ }
    if (previous?.signature === signature && /^[a-f0-9-]{36}$/.test(previous.requestId || '')) return previous;
    const next = { signature, requestId: crypto.randomUUID(), items: clean };
    saveIntent(next);
    return next;
  }
  function saveIntent(value) { localStorage.setItem(intentKey, JSON.stringify(value)); }
  function clearIntent() { localStorage.removeItem(intentKey); }
  function settled(sessionId, orderId = null) {
    let attempt;
    try { attempt = JSON.parse(localStorage.getItem(intentKey)); } catch { return; }
    if (!sessionId && orderId && attempt?.requestId === orderId) sessionId = attempt.sessionId;
    if (!sessionId || attempt?.sessionId !== sessionId) return;
    const record = readRecord();
    if (record.settled.includes(sessionId)) { clearIntent(); return; }
    const purchased = validate(attempt.items);
    // Leave products added after checkout in the bag; settlement is idempotent.
    const remaining = record.items.map(item => ({ id: item.id, quantity: Math.max(0, item.quantity - (purchased.find(line => line.id === item.id)?.quantity || 0)) })).filter(item => item.quantity > 0);
    write(remaining, [...record.settled, sessionId].slice(-30));
    clearIntent();
  }
  return { key, read, write, add, set, validate, resolve, intent, saveIntent, clearIntent, settled };
})();
