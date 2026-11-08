'use strict';
// Shared validation for the browser editor and the server. Prices are integer øre.
globalThis.nornailsCommerce = (() => {
  const groups = ['liquid', 'hygiene', 'utstyr'];
  const categories = ['negler', 'manikyr', 'pedikyr', 'bits', 'elektrisk', 'hygiene'];
  function text(value, maximum, required = false) {
    if (typeof value !== 'string' || value.length > maximum || (required && !value.trim())) throw new Error('Check the product text fields.');
    return value.trim();
  }
  function image(value) {
    if (typeof value !== 'string' || value.length > 2000) throw new Error('Enter an image URL.');
    if (/^assets\/images\/[a-zA-Z0-9_./-]+\.(webp|png|jpe?g|avif)$/i.test(value) && !value.includes('..')) return value;
    try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password) return url.href; } catch { /* Invalid URL. */ }
    throw new Error('Images must use HTTPS or an assets/images/ path.');
  }
  function price(value) {
    if (value === '' || value == null) return null;
    const input = String(value).trim().replace(',', '.');
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(input)) throw new Error('Use a positive NOK price with at most two decimal places.');
    const [whole, fraction = ''] = input.split('.');
    const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (amount < 1 || amount > 99999999) throw new Error('Price must be between NOK 0.01 and 999,999.99.');
    return amount;
  }
  function product(input) {
    if (!input || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(input.id)) throw new Error('Invalid product ID.');
    if (!groups.includes(input.group) || !categories.includes(input.category)) throw new Error('Choose a product category.');
    if (input.priceOre !== null && (!Number.isInteger(input.priceOre) || input.priceOre < 1 || input.priceOre > 99999999)) throw new Error('Invalid price in øre.');
    if (typeof input.active !== 'boolean') throw new Error('Invalid product visibility.');
    const nb = { name: text(input.name, 160, true), unit: text(input.unit, 160), description: text(input.description, 5000), short: text(input.short, 240), tag: text(input.tag, 120) };
    const en = input.translations?.en || {};
    const translated = {};
    for (const key of ['name', 'unit', 'description', 'short', 'tag']) translated[key] = text(en[key] ?? '', key === 'description' ? 5000 : 240);
    const specs = input.specs || [];
    if (!Array.isArray(specs) || specs.length > 20) throw new Error('Invalid product specifications.');
    const cleanSpecs = specs.map(pair => {
      if (!Array.isArray(pair) || pair.length !== 2) throw new Error('Invalid product specifications.');
      return pair.map(value => text(value, 300));
    });
    const enSpecs = en.specs;
    if (enSpecs !== undefined) {
      if (!Array.isArray(enSpecs) || enSpecs.length > 20) throw new Error('Invalid English specifications.');
      translated.specs = enSpecs.map(pair => {
        if (!Array.isArray(pair) || pair.length !== 2) throw new Error('Invalid English specifications.');
        return pair.map(value => text(value, 300));
      });
    }
    return { id: input.id, ...nb, brand: text(input.brand, 100, true), group: input.group, category: input.category, image: image(input.image), priceOre: input.priceOre, active: input.active, safety: Boolean(input.safety), specs: cleanSpecs, translations: { en: translated } };
  }
  function settings(input) {
    if (!input || typeof input.enabled !== 'boolean' || typeof input.termsConfirmed !== 'boolean') throw new Error('Invalid payment settings.');
    // Migrate older single-method settings without enabling an unconfirmed fee.
    const pickupEnabled = input.pickupEnabled ?? true;
    const shippingEnabled = input.shippingEnabled ?? input.fulfillment === 'shipping';
    if (typeof pickupEnabled !== 'boolean' || typeof shippingEnabled !== 'boolean') throw new Error('Choose the supported delivery methods.');
    const shippingOre = input.shippingOre ?? null;
    if (shippingOre !== null && (!Number.isInteger(shippingOre) || shippingOre < 0 || shippingOre > 9999999)) throw new Error('Invalid shipping fee.');
    if (input.enabled && !pickupEnabled && !shippingEnabled) throw new Error('Enable at least one delivery method.');
    if (input.enabled && shippingEnabled && shippingOre === null) throw new Error('Set the shipping fee before offering delivery.');
    if (!['included', 'automatic'].includes(input.taxMode)) throw new Error('Choose a tax setting.');
    let termsUrl = '';
    if (input.termsUrl) {
      try { const url = new URL(input.termsUrl); if (url.protocol !== 'https:') throw new Error(); termsUrl = url.href; } catch { throw new Error('Terms URL must use HTTPS.'); }
    }
    if (input.enabled && (!input.termsConfirmed || !termsUrl)) throw new Error('Confirm prices, tax and delivery, and add the terms URL before enabling checkout.');
    return { enabled: input.enabled, currency: 'NOK', pickupEnabled, shippingEnabled, shippingOre, taxMode: input.taxMode, termsConfirmed: input.termsConfirmed, termsUrl };
  }
  const defaults = { enabled: false, currency: 'NOK', pickupEnabled: true, shippingEnabled: true, shippingOre: null, taxMode: 'included', termsConfirmed: false, termsUrl: '' };
  return { product, price, image, settings, defaults };
})();
