'use strict';

let products = structuredClone(globalThis.nornailsCatalog);
let commerceSettings = { enabled: false };
const bag = globalThis.nornailsCart;
let cartToastTimer;

Object.assign(nornailsTranslations.messages.nb, {
  'cart.title':'Handlekurven din.', 'cart.eyebrow':'DIN UTVALGTE KOLLEKSJON', 'cart.close':'Lukk handlekurv', 'cart.open':'Handlekurv, {count} varer', 'cart.add':'Legg i handlekurv', 'cart.added':'Lagt i handlekurven.', 'cart.view':'Se handlekurven', 'cart.empty':'Handlekurven er tom.', 'cart.browse':'Utforsk produktene', 'cart.remove':'Fjern', 'cart.quantity':'Antall for {name}', 'cart.minus':'Reduser antall for {name}', 'cart.plus':'Øk antall for {name}', 'cart.subtotal':'Delsum', 'cart.unpriced':'Pris må bekreftes', 'cart.help':'Du velger leveringsmåte og ser gjennom bestillingen på neste side.', 'cart.quoteHelp':'Noen varer mangler pris. Du kan be om et tilbud på neste side.', 'cart.unavailable':'Produktet er ikke tilgjengelig', 'cart.checkout':'Gå til kassen', 'cart.limit':'Du kan velge opptil 20 av hvert produkt og 20 ulike produkter.', 'cart.storage':'Handlekurven kunne ikke lagres. Tillat lagring i nettleseren og prøv igjen.',
  'checkout.quantity': 'Antall', 'checkout.buy': 'Til betaling', 'checkout.test': 'Testbetaling · ingen ekte belastning.',
  'checkout.pickup': 'Hentes i Sandvika etter avtale.', 'checkout.shipping': 'Frakt i Norge:',
  'checkout.contact': 'Kontakt oss ved spørsmål om produktet eller bestillingen.', 'checkout.error': 'Betalingen kunne ikke startes. Prøv igjen eller kontakt oss.',
  'checkout.loading': 'Oppretter bestillingen …', 'checkout.catalogError': 'Nettkatalogen er midlertidig utilgjengelig. Kontakt oss for oppdatert utvalg og priser.',
  'checkout.delivery': 'Hvordan vil du motta bestillingen?', 'checkout.choose': 'Velg leveringsmåte', 'checkout.pickupOption': 'Hent i Sandvika', 'checkout.shippingOption': 'Levering i Norge',
  'checkout.total': 'Totalt', 'checkout.subtotal': 'Produkter', 'checkout.orderHelp': 'Du ser bestillingen og en QR-kode for betaling på neste side.',
  'products.description': 'Utforsk produktene. Kontakt oss hvis en pris ikke er oppgitt.',
  'faq.prices.answer': 'Priser vises der de er oppgitt. Kontakt oss for tilgjengelighet og priser på øvrige produkter.'
});
Object.assign(nornailsTranslations.messages.en, {
  'cart.title':'Your bag.', 'cart.eyebrow':'YOUR SELECTED COLLECTION', 'cart.close':'Close bag', 'cart.open':'Shopping bag, {count} items', 'cart.add':'Add to bag', 'cart.added':'Added to your bag.', 'cart.view':'View bag', 'cart.empty':'Your bag is empty.', 'cart.browse':'Explore the collection', 'cart.remove':'Remove', 'cart.quantity':'Quantity for {name}', 'cart.minus':'Decrease quantity for {name}', 'cart.plus':'Increase quantity for {name}', 'cart.subtotal':'Subtotal', 'cart.unpriced':'Price to be confirmed', 'cart.help':'Choose delivery and review your order on the next page.', 'cart.quoteHelp':'Some items need confirmed prices. You can request a quote on the next page.', 'cart.unavailable':'Product unavailable', 'cart.checkout':'Continue to checkout', 'cart.limit':'Choose up to 20 of each product and 20 different products.', 'cart.storage':'Your bag could not be saved. Allow browser storage and try again.',
  'checkout.quantity': 'Quantity', 'checkout.buy': 'Continue to checkout', 'checkout.test': 'Test payment · no real charge.',
  'checkout.pickup': 'Pickup in Sandvika by arrangement.', 'checkout.shipping': 'Shipping in Norway:',
  'checkout.contact': 'Contact us with questions about the product or your order.', 'checkout.error': 'Checkout could not be started. Please try again or contact us.',
  'checkout.loading': 'Creating your order…', 'checkout.catalogError': 'The online catalogue is temporarily unavailable. Contact us for current products and prices.',
  'checkout.delivery': 'How would you like to receive your order?', 'checkout.choose': 'Choose a delivery method', 'checkout.pickupOption': 'Pickup in Sandvika', 'checkout.shippingOption': 'Delivery within Norway',
  'checkout.total': 'Total', 'checkout.subtotal': 'Products', 'checkout.orderHelp': 'The next page shows your order and a QR code for payment.',
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
      <button class="product-add" data-add-to-cart="${product.id}">${t('cart.add')} <span aria-hidden="true">＋</span></button>
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
  renderCart();
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
  const checkout = `<form class="checkout-form cart-add-form" data-cart-add="${product.id}"><label>${t('checkout.quantity')}<input name="quantity" type="number" min="1" max="20" step="1" value="1" required></label><button class="button button-dark" type="submit">${t('cart.add')} <span aria-hidden="true">＋</span></button><button class="cart-view-link" type="button" data-cart-open>${t('cart.view')} →</button><p class="checkout-error" role="alert"></p></form>`;
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
    renderProducts(); renderSearch(); renderCart();
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

function cartNotify(message) {
  const toast = document.querySelector('#cart-toast');
  toast.textContent = message; toast.hidden = false;
  clearTimeout(cartToastTimer);
  cartToastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}
function renderCart() {
  const items = bag.read();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-open').setAttribute('aria-label', t('cart.open', { count }));
  const { lines, subtotal } = bag.resolve(items, products);
  document.querySelector('#cart-content').innerHTML = !lines.length ? `<div class="cart-empty"><p>${t('cart.empty')}</p><button class="button button-dark" data-cart-continue>${t('cart.browse')} ${arrow}</button></div>` : `<div class="cart-lines">${lines.map(({ id, quantity, product: source }) => {
    const product = source ? localProduct(source) : null;
    const name = product ? product.brand + ' ' + product.name : t('cart.unavailable') + ' · ' + id;
    return `<article class="cart-line">${product ? `<img src="${escapeHtml(product.image)}" alt="" width="80" height="90" referrerpolicy="no-referrer">` : '<span class="cart-missing" aria-hidden="true">!</span>'}<div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(product?.unit || '')}</p><strong>${product?.priceOre != null ? escapeHtml(productPrice({ priceOre: product.priceOre * quantity })) : t('cart.unpriced')}</strong><div class="cart-line-actions"><div class="cart-quantity"><button type="button" data-cart-step="-1" data-cart-id="${id}" aria-label="${escapeHtml(t('cart.minus', { name }))}" ${quantity === 1 ? 'disabled' : ''}>−</button><input type="number" min="1" max="20" step="1" value="${quantity}" data-cart-quantity="${id}" aria-label="${escapeHtml(t('cart.quantity', { name }))}"><button type="button" data-cart-step="1" data-cart-id="${id}" aria-label="${escapeHtml(t('cart.plus', { name }))}" ${quantity === 20 ? 'disabled' : ''}>＋</button></div><button class="cart-remove" data-cart-remove="${id}">${t('cart.remove')}</button></div></div></article>`;
  }).join('')}</div><div class="cart-summary"><div><span>${t('cart.subtotal')}</span><strong>${subtotal === null ? t('cart.unpriced') : escapeHtml(productPrice({ priceOre: subtotal }))}</strong></div><p>${t(subtotal === null ? 'cart.quoteHelp' : 'cart.help')}</p><a class="button button-dark" id="cart-checkout" href="payment.html?cart=1&lang=${currentLanguage}">${t('cart.checkout')} ${arrow}</a><button class="cart-view-link" data-cart-continue>${t('cart.browse')}</button></div>`;
}
function addToCart(id, quantity) {
  if (!products.some(item => item.id === id && item.active)) return;
  const existing = bag.read().find(item => item.id === id)?.quantity || 0;
  if (!Number.isInteger(quantity) || quantity < 1 || existing + quantity > 20 || (!existing && bag.read().length >= 20)) { cartNotify(t('cart.limit')); return; }
  try { bag.add(id, quantity); renderCart(); cartNotify(t('cart.added')); }
  catch { cartNotify(t('cart.storage')); }
}
document.addEventListener('click', event => {
  const add = event.target.closest('[data-add-to-cart]');
  if (event.target.closest('#cart-checkout')) { const invalid = document.querySelector('#cart-content input:invalid'); if (invalid) { event.preventDefault(); invalid.reportValidity(); } }
  if (add) addToCart(add.dataset.addToCart, 1);
  if (event.target.closest('[data-cart-open]')) { renderCart(); openDialog(document.querySelector('#cart-dialog')); }
  if (event.target.closest('[data-cart-continue]')) { document.querySelector('#cart-dialog').close(); document.querySelector('#produkter').scrollIntoView({ behavior:'smooth' }); }
  const remove = event.target.closest('[data-cart-remove]');
  const step = event.target.closest('[data-cart-step]');
  if (remove || step) {
    const id = remove?.dataset.cartRemove || step.dataset.cartId;
    const quantity = remove ? 0 : (bag.read().find(item => item.id === id)?.quantity || 1) + Number(step.dataset.cartStep);
    try { bag.set(id, quantity); renderCart(); document.querySelector(`[data-cart-quantity="${id}"]`)?.focus(); } catch { cartNotify(t('cart.storage')); }
  }
});
document.addEventListener('change', event => {
  const input = event.target.closest('[data-cart-quantity]');
  if (!input) return;
  if (!input.checkValidity()) { input.reportValidity(); return; }
  try { bag.set(input.dataset.cartQuantity, Number(input.value)); renderCart(); document.querySelector(`[data-cart-quantity="${input.dataset.cartQuantity}"]`)?.focus(); } catch { cartNotify(t('cart.storage')); }
});
document.addEventListener('submit', event => {
  const form = event.target.closest('[data-cart-add]');
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  addToCart(form.dataset.cartAdd, Number(form.elements.quantity.value));
});
window.addEventListener('storage', event => { if (event.key === bag.key) renderCart(); });

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
