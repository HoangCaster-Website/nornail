'use strict';

let products = structuredClone(globalThis.nornailsCatalog);
let commerceSettings = { enabled: false };

Object.assign(nornailsTranslations.messages.nb, {
  'checkout.quantity': 'Antall', 'checkout.buy': 'Til betaling', 'checkout.test': 'Testbetaling · ingen ekte belastning.',
  'checkout.pickup': 'Hentes i Sandvika etter avtale.', 'checkout.shipping': 'Frakt i Norge:',
  'checkout.contact': 'Kontakt oss ved spørsmål om produktet eller bestillingen.', 'checkout.error': 'Betalingen kunne ikke startes. Prøv igjen eller kontakt oss.',
  'checkout.loading': 'Åpner Stripe …', 'checkout.catalogError': 'Nettkatalogen er midlertidig utilgjengelig. Kontakt oss for oppdatert utvalg og priser.',
  'products.description': 'Utforsk produktene. Kontakt oss hvis en pris ikke er oppgitt.',
  'faq.prices.answer': 'Priser vises der de er oppgitt. Kontakt oss for tilgjengelighet og priser på øvrige produkter.'
});
Object.assign(nornailsTranslations.messages.en, {
  'checkout.quantity': 'Quantity', 'checkout.buy': 'Continue to checkout', 'checkout.test': 'Test payment · no real charge.',
  'checkout.pickup': 'Pickup in Sandvika by arrangement.', 'checkout.shipping': 'Shipping in Norway:',
  'checkout.contact': 'Contact us with questions about the product or your order.', 'checkout.error': 'Checkout could not be started. Please try again or contact us.',
  'checkout.loading': 'Opening Stripe …', 'checkout.catalogError': 'The online catalogue is temporarily unavailable. Contact us for current products and prices.',
  'products.description': 'Explore the products. Contact us if a price is not listed.',
  'faq.prices.answer': 'Prices are shown where available. Contact us for availability and prices on other products.'
});

const categories = {
  negler: { number: '01', title: 'Negler', intro: 'Det rette grunnlaget for neglemodelleringen. Se nærmere på våre utvalgte akryl liquids, eller spør oss om andre negleprodukter.', ids: ['w1', 'w2'], subject: 'Produkter til negler' },
  manikyr: { number: '02', title: 'Manikyrutstyr', intro: 'Små verktøy spiller en stor rolle. Oppdag neglebufferen i utvalget, og kontakt oss om pensler, filer og annet utstyr til manikyren.', ids: ['buffer'], subject: 'Manikyrutstyr' },
  pedikyr: { number: '03', title: 'Pedikyr', intro: 'Ser du etter produkter til fotpleie og pedikyr? Fortell oss hva du trenger til behandlingene dine, så svarer vi deg om utvalg, priser og tilgjengelighet.', ids: [], subject: 'Produkter til pedikyr' },
  bits: { number: '04', title: 'Drill bits', intro: 'Et godt resultat begynner med riktig verktøy. Fortell oss hvilken maskin du bruker, og hvilken type bit og grovhet du ser etter, så hjelper vi deg videre.', ids: [], subject: 'Drill bits' },
  elektrisk: { number: '05', title: 'Elektrisk utstyr', intro: 'Utstyr for arbeidsplassen din. Bli kjent med URAWA Super UP200, eller ta kontakt om annet elektrisk utstyr til salongen.', ids: ['urawa'], subject: 'Elektrisk utstyr' },
  hygiene: { number: '06', title: 'Sterilisering', intro: 'Spør oss om utstyr til sterilisering og produkter til salonghygiene. Her kan du se rens og desinfeksjon i utvalget. Desinfeksjon og sterilisering er ulike prosesser; bruk produktene etter produsentens anvisninger.', ids: ['novicide', 'novicide-small', 'alcohol', 'acetone'], subject: 'Sterilisering og salonghygiene' }
};

let currentLanguage = readLanguage();
let currentFilter = 'all';

function readLanguage() {
  const requested = new URLSearchParams(window.location.search).get('lang');
  if (requested === 'nb' || requested === 'en') return requested;
  try {
    const saved = localStorage.getItem('nornails.language');
    if (saved === 'nb' || saved === 'en') return saved;
  } catch { /* The site also works when browser storage is unavailable. */ }
  return 'nb';
}

function t(key, values = {}) {
  const message = nornailsTranslations.messages[currentLanguage][key] ?? nornailsTranslations.messages.nb[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
}

function localProduct(product, language = currentLanguage) {
  const translation = product.translations?.[language] ?? nornailsTranslations.products[language]?.[product.id] ?? {};
  return { ...product, ...Object.fromEntries(Object.entries(translation).filter(([, value]) => value !== '')) };
}

function productPrice(product) {
  return product.priceOre == null ? t('products.price') : new Intl.NumberFormat(currentLanguage === 'nb' ? 'nb-NO' : 'en-GB', { style: 'currency', currency: 'NOK' }).format(product.priceOre / 100);
}

function localCategory(id) {
  return { ...categories[id], ...nornailsTranslations.categories[currentLanguage]?.[id] };
}

const arrow = '<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>';
const grid = document.querySelector('#product-grid');
const productDialog = document.querySelector('#product-dialog');
const categoryDialog = document.querySelector('#category-dialog');
const searchDialog = document.querySelector('#search-dialog');
const searchInput = document.querySelector('#product-search');
const headerSearchInput = document.querySelector('#header-product-search');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
let returnFocus = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function mailLink(subject, body) {
  return 'mailto:Nornails26@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

function renderProducts(filter = currentFilter) {
  currentFilter = filter;
  const visible = products.filter(product => filter === 'all' || product.group === filter).map(product => localProduct(product));
  grid.innerHTML = visible.map(product => `
    <article class="product-card">
      <button class="product-card-button" data-product="${product.id}" aria-label="${escapeHtml(t('products.view', { name: product.brand + ' ' + product.name, unit: product.unit }))}">
        <div class="product-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.brand + ' ' + product.name)}" width="700" height="700" loading="lazy" referrerpolicy="no-referrer"><span class="product-quickview" aria-hidden="true"><svg class="icon"><use href="#i-search"/></svg></span></div>
        <div class="product-info"><h3>${escapeHtml((product.brand === 'NOVICIDE' ? '' : product.brand + ' ') + product.name)}</h3><p class="product-description">${escapeHtml(product.unit)}</p><p class="product-price">${escapeHtml(productPrice(product))}</p></div>
      </button>
    </article>`).join('');
  grid.scrollLeft = 0;
  requestAnimationFrame(updateRailButtons);
  document.querySelector('#product-count').textContent = t(visible.length === 1 ? 'products.countOne' : 'products.count', { count: visible.length });
}

function renderViewAll() {
  const expanded = grid.classList.contains('expanded');
  const button = document.querySelector('#view-all-products');
  button.setAttribute('aria-expanded', String(expanded));
  button.innerHTML = `${t(expanded ? 'products.less' : 'products.all')} <span aria-hidden="true">${expanded ? '↑' : '→'}</span>`;
}

function applyLanguage(language, { persist = true, updateUrl = true } = {}) {
  if (!['nb', 'en'].includes(language)) return;
  currentLanguage = language;
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  // Only trusted, locally maintained heading copy can contain line-break markup.
  document.querySelectorAll('[data-i18n-html]').forEach(element => { element.innerHTML = t(element.dataset.i18nHtml); });
  ['aria-label', 'placeholder', 'alt', 'title'].forEach(attribute => {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    });
  });
  document.querySelectorAll('[data-language]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  });
  const meta = nornailsTranslations.meta[language];
  document.title = meta.title;
  document.querySelector('meta[name="description"]').content = meta.description;
  document.querySelector('meta[property="og:title"]').content = meta.ogTitle;
  document.querySelector('meta[property="og:description"]').content = meta.ogDescription;
  document.querySelector('meta[property="og:locale"]').content = meta.locale;
  const businessData = document.querySelector('#business-data');
  const business = JSON.parse(businessData.textContent);
  business.description = meta.businessDescription;
  businessData.textContent = JSON.stringify(business);
  menuToggle.setAttribute('aria-label', t(menuToggle.getAttribute('aria-expanded') === 'true' ? 'a11y.menu.close' : 'a11y.menu.open'));
  renderProducts();
  renderViewAll();
  renderSearch();
  if (productDialog.open) renderProductDetails(productDialog.dataset.productId);
  if (categoryDialog.open) renderCategoryDetails(categoryDialog.dataset.categoryId);
  if (persist) {
    try { localStorage.setItem('nornails.language', language); } catch { /* Optional preference storage. */ }
  }
  if (updateUrl) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', language);
      window.history.replaceState(window.history.state, '', url);
    } catch { /* Local file previews may disallow history updates. */ }
  }
  requestAnimationFrame(updateRailButtons);
}

function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', t(open ? 'a11y.menu.close' : 'a11y.menu.open'));
  mobileMenu.classList.toggle('open', open);
  mobileMenu.inert = !open;
  document.body.classList.toggle('menu-open', open);
}

function openDialog(dialog) {
  if (!document.querySelector('dialog[open]')) returnFocus = document.activeElement;
  document.querySelectorAll('dialog[open]').forEach(other => other.close());
  setMenu(false);
  dialog.showModal();
  document.body.classList.add('modal-open');
}

function renderProductDetails(id) {
  const source = products.find(item => item.id === id);
  if (!source) return;
  const product = localProduct(source);
  const values = { name: product.brand + ' ' + product.name, unit: product.unit };
  const inquiry = mailLink(t('mail.productSubject', values), t('mail.productBody', values));
  const checkout = commerceSettings.enabled && product.priceOre != null ? `<form class="checkout-form" data-checkout="${product.id}"><label>${t('checkout.quantity')}<input name="quantity" type="number" min="1" max="20" step="1" value="1" required></label><button class="button button-dark" type="submit">${t('checkout.buy')} ${arrow}</button><p class="checkout-note">${commerceSettings.mode === 'test' ? t('checkout.test') + ' ' : ''}${t(commerceSettings.fulfillment === 'shipping' ? 'checkout.shipping' : 'checkout.pickup')}${commerceSettings.fulfillment === 'shipping' ? ' ' + productPrice({ priceOre: commerceSettings.shippingOre }) : ''}</p><p class="checkout-error" role="alert"></p></form>` : '';
  document.querySelector('#product-dialog-content').innerHTML = `<div class="product-dialog-layout"><div class="dialog-product-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.brand + ' ' + product.name)}" width="700" height="700" referrerpolicy="no-referrer"></div><div class="dialog-product-info"><span class="eyebrow">${escapeHtml(product.brand)} / ${escapeHtml(product.tag)}</span><h2 id="dialog-title">${escapeHtml(product.name)}</h2><span class="product-unit">${escapeHtml(product.unit)}</span><p>${escapeHtml(product.description)}</p><p class="detail-price">${escapeHtml(productPrice(product))}</p><dl class="product-specs">${product.specs.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${checkout}<a class="button ${checkout ? 'inquiry-secondary' : 'button-dark'}" href="${escapeHtml(inquiry)}">${t('product.ask')} ${arrow}</a><p class="dialog-disclaimer">${product.priceOre == null ? t('product.disclaimer') : t('checkout.contact')}${product.safety ? ' ' + t('product.safety') : ''}</p></div></div>`;
}

function openProduct(id) {
  if (!products.some(item => item.id === id)) return;
  productDialog.dataset.productId = id;
  renderProductDetails(id);
  openDialog(productDialog);
}

function renderCategoryDetails(id) {
  if (!categories[id]) return;
  const category = localCategory(id);
  const related = products.filter(product => product.category === id).map(product => localProduct(product));
  const inquiry = mailLink(t('mail.categorySubject', { category: category.subject }), t('mail.categoryBody', { category: category.subject }));
  document.querySelector('#category-dialog-content').innerHTML = `<span class="eyebrow">${t('category.label')} / ${category.number}</span><h2 id="category-dialog-title">${category.title}</h2><p class="category-intro">${category.intro}</p>${related.length ? `<div class="category-product-list">${related.map(product => `<button class="category-product-button" data-product="${product.id}"><img src="${escapeHtml(product.image)}" alt="" width="70" height="70" referrerpolicy="no-referrer"><span>${escapeHtml(product.brand + ' ' + product.name)}<br><small>${escapeHtml(product.unit)} · ${escapeHtml(productPrice(product))}</small></span>${arrow}</button>`).join('')}</div>` : ''}<a class="button button-dark" href="${escapeHtml(inquiry)}">${t('category.ask', { category: category.title.toLocaleLowerCase(currentLanguage) })} ${arrow}</a><p class="category-note">${t('category.note')}<br>${t('category.call')} <a href="tel:+4746125141">+47 4612 5141</a>.</p>`;
}

function openCategory(id) {
  if (!categories[id]) return;
  categoryDialog.dataset.categoryId = id;
  renderCategoryDetails(id);
  openDialog(categoryDialog);
}

function normalize(text) {
  return text.toLocaleLowerCase('nb').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('ø', 'o').replaceAll('æ', 'ae').replace(/[^a-z0-9]+/g, ' ').trim();
}

function searchText(product) {
  const content = ['nb', 'en'].flatMap(language => {
    const item = localProduct(product, language);
    return [item.name, item.brand, item.tag, item.unit, item.short, item.description];
  });
  const aliases = { urawa: 'nail drill electric drill neglefres neglefraser utstyr equipment', alcohol: 'alcohol alkohol cleaner rens', acetone: 'remover fjerner', w1: 'monomer', w2: 'monomer', buffer: 'buffing nail file neglefil manicure', novicide: 'disinfectant desinfeksjon hygiene 2l', 'novicide-small': 'disinfectant desinfeksjon hygiene' };
  return normalize([...content, aliases[product.id] ?? ''].join(' '));
}

function renderSearch() {
  const rawQuery = searchInput.value.trim();
  const tokens = normalize(rawQuery).split(/\s+/).filter(Boolean);
  const found = products.filter(product => tokens.every(token => searchText(product).includes(token))).map(product => localProduct(product));
  document.querySelector('#search-count').textContent = rawQuery ? t(found.length === 1 ? 'search.resultOne' : 'search.results', { count: found.length, query: rawQuery }) : t('search.explore', { count: products.length });
  const list = document.querySelector('#search-results');
  if (!found.length) {
    list.innerHTML = `<p class="search-empty">${t('search.empty')} <a href="mailto:Nornails26@gmail.com">${t('search.ask')}</a>.</p>`;
    return;
  }
  list.innerHTML = found.map(product => `<button class="search-result" data-product="${product.id}"><img src="${escapeHtml(product.image)}" alt="" width="57" height="63" referrerpolicy="no-referrer"><span>${escapeHtml(product.brand + ' ' + product.name)}<small>${escapeHtml(product.unit)} · ${escapeHtml(productPrice(product))}</small></span>${arrow}</button>`).join('');
}

function openSearch(query = '') {
  searchInput.value = query;
  renderSearch();
  openDialog(searchDialog);
  searchInput.focus();
}

document.addEventListener('click', event => {
  const languageButton = event.target.closest('[data-language]');
  if (languageButton) applyLanguage(languageButton.dataset.language);
  const productButton = event.target.closest('[data-product]');
  if (productButton) openProduct(productButton.dataset.product);
  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) openCategory(categoryButton.dataset.category);
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) {
    document.querySelectorAll('[data-filter]').forEach(button => {
      const active = button === filterButton;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderProducts(filterButton.dataset.filter);
  }
});

document.querySelector('.search-open').addEventListener('click', () => openSearch(headerSearchInput.value.trim()));
document.querySelector('#header-search-form').addEventListener('submit', event => {
  event.preventDefault();
  openSearch(headerSearchInput.value.trim());
});
searchInput.addEventListener('input', () => {
  headerSearchInput.value = searchInput.value;
  renderSearch();
});
searchInput.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') {
    const first = document.querySelector('.search-result');
    if (first) { event.preventDefault(); first.focus(); }
  }
});
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  const activeDialog = document.querySelector('dialog[open]');
  if (event.key === 'Escape' && activeDialog) {
    event.preventDefault();
    activeDialog.close();
    return;
  }
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuToggle.focus();
  }
  if (event.key === 'Tab' && menuToggle.getAttribute('aria-expanded') === 'true') {
    const focusables = [menuToggle, ...mobileMenu.querySelectorAll('a')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (document.querySelector('dialog[open]')) return;
    document.body.classList.remove('modal-open');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  });
});

const rails = { categories: document.querySelector('#category-rail'), products: grid };

function updateRailButtons() {
  document.querySelectorAll('[data-slide]').forEach(button => {
    const rail = rails[button.dataset.slide];
    const maximum = rail.scrollWidth - rail.clientWidth;
    button.disabled = rail.classList.contains('expanded') || (button.dataset.direction === '-1' ? rail.scrollLeft < 2 : rail.scrollLeft >= maximum - 2);
  });
}

Object.values(rails).forEach(rail => {
  rail.addEventListener('scroll', updateRailButtons, { passive: true });
  rail.addEventListener('keydown', event => {
    if (event.target !== rail || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const card = rail.firstElementChild;
    const distance = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap) : rail.clientWidth;
    rail.scrollBy({ left: distance * (event.key === 'ArrowRight' ? 1 : -1), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
});

document.querySelectorAll('[data-slide]').forEach(button => button.addEventListener('click', () => {
  const rail = rails[button.dataset.slide];
  rail.scrollBy({ left: rail.clientWidth * Number(button.dataset.direction), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}));

document.querySelector('#view-all-products').addEventListener('click', () => {
  grid.classList.toggle('expanded');
  renderViewAll();
  grid.scrollLeft = 0;
  updateRailButtons();
});
window.addEventListener('resize', updateRailButtons, { passive: true });

const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
applyLanguage(currentLanguage, { persist: false, updateUrl: false });
loadStoreCatalogue();
document.querySelector('#year').textContent = new Date().getFullYear();

async function loadStoreCatalogue() {
  const api = globalThis.nornailsConfig?.apiUrl?.replace(/\/$/, '');
  if (!api) return;
  try {
    const response = await fetch(api + '/api/catalog', { signal: AbortSignal.timeout(12000), cache: 'no-store' });
    if (!response.ok) throw new Error('Catalogue unavailable');
    const data = await response.json();
    products = data.products.map(item => globalThis.nornailsCommerce.product(item));
    commerceSettings = data.checkout;
    document.querySelector('.spotlight').hidden = !products.some(product => product.id === 'urawa');
    renderProducts(); renderSearch();
    if (productDialog.open) {
      if (products.some(product => product.id === productDialog.dataset.productId)) renderProductDetails(productDialog.dataset.productId);
      else productDialog.close();
    }
    if (categoryDialog.open) renderCategoryDetails(categoryDialog.dataset.categoryId);
  } catch {
    commerceSettings = { enabled: false };
    const notice = document.createElement('p');
    notice.className = 'catalog-connection-note';
    notice.setAttribute('role', 'status');
    notice.dataset.i18n = 'checkout.catalogError';
    notice.textContent = t('checkout.catalogError');
    grid.before(notice);
  }
}

document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-checkout]');
  if (!form) return;
  event.preventDefault();
  const button = form.querySelector('button');
  if (button.disabled) return;
  const quantity = Number(form.elements.quantity.value);
  const error = form.querySelector('.checkout-error');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) { form.reportValidity(); return; }
  const signature = `${form.dataset.checkout}:${quantity}:${currentLanguage}`;
  if (form.dataset.signature !== signature) { form.dataset.requestId = crypto.randomUUID(); form.dataset.signature = signature; }
  button.disabled = true;
  button.textContent = t('checkout.loading');
  error.textContent = '';
  try {
    const response = await fetch(globalThis.nornailsConfig.apiUrl.replace(/\/$/, '') + '/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(25000), body: JSON.stringify({ items: [{ id: form.dataset.checkout, quantity }], language: currentLanguage, requestId: form.dataset.requestId }) });
    const result = await response.json();
    if (!response.ok) { if (response.status < 500) form.dataset.signature = ''; throw new Error('Checkout unavailable'); }
    const target = new URL(result.url);
    if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') throw new Error('Invalid checkout URL');
    window.location.assign(target.href);
  } catch { error.textContent = t('checkout.error'); button.disabled = false; button.innerHTML = `${t('checkout.buy')} ${arrow}`; }
});

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .08 });
  document.querySelectorAll('.section-heading, .spotlight-copy, .about-copy, .contact-heading').forEach(element => {
    element.classList.add('reveal-ready');
    observer.observe(element);
  });
}
