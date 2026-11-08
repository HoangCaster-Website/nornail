// Public configuration only. Never put Stripe secret keys or admin passwords here.
// The Edge Function holds the database connection; no privileged key is public.
(() => {
  const sandbox = new URLSearchParams(globalThis.location?.search || '').get('sandbox') === '1';
  const pageUrl = (file, parameters = {}) => {
    const url = new URL(file, location.href);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    if (sandbox) url.searchParams.set('sandbox', '1');
    return url.href;
  };
  globalThis.nornailsConfig = Object.freeze({
    apiUrl: 'https://clyshqnbxapwipacbaxd.supabase.co/functions/v1/' + (sandbox ? 'nornails-sandbox-api' : 'nornails-api'),
    sandbox, pageUrl
  });
  if (!sandbox) return;
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('sandbox-mode');
    const robots = document.querySelector('meta[name="robots"]') || document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex,nofollow';
    if (!robots.isConnected) document.head.append(robots);
    const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'sandbox.css'; document.head.append(style);
    const banner = document.createElement('aside'); banner.className = 'sandbox-banner'; banner.setAttribute('role','note'); document.body.prepend(banner);
    function render() {
      const en = document.documentElement.lang === 'en';
      banner.innerHTML = `<strong>${en ? 'STRIPE TEST · NO REAL PAYMENTS' : 'STRIPE TEST · INGEN EKTE BETALINGER'}</strong><span>${en ? 'Sample prices. No real orders or delivery.' : 'Eksempelpriser. Ingen ekte bestillinger eller levering.'}</span><a href="sandbox.html">${en ? 'Test cards & instructions' : 'Testkort og veiledning'} ↗</a><a href="index.html" data-leave-sandbox>${en ? 'Exit test' : 'Avslutt test'} ↗</a>`;
    }
    render(); new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    // Preserve the environment on static brand/back links as well as checkout.
    document.querySelectorAll('a[href="index.html"]').forEach(a => { if (!a.hasAttribute('data-leave-sandbox')) a.href = pageUrl('index.html'); });
  });
})();
