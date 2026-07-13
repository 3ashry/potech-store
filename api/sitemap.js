// potech-store/api/sitemap.js
// Dynamic sitemap: static routes + every product page (/products/<code>), so
// Google discovers and indexes each product by its code. Reads products from
// Supabase with the public (publishable) key — same one the storefront uses.
const SB_URL = 'https://wljxplbcfoorqpoflcdz.supabase.co';
const SB_KEY = 'sb_publishable_zsHh-eOarHI7BSGtuP6WWQ_PQ4ACoHG';
const SITE = 'https://www.protechstores.com';
const CATS = ['electric', 'battery', 'hand', 'measuring', 'safety', 'car', 'garden', 'sets', 'new', 'offers'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async function handler(req, res) {
  const urls = [
    { loc: `${SITE}/`, pri: '1.0', freq: 'daily' },
    { loc: `${SITE}/shop`, pri: '0.9', freq: 'daily' },
    ...CATS.map(c => ({ loc: `${SITE}/shop?category=${c}`, pri: '0.7', freq: 'weekly' })),
  ];
  try {
    const r = await fetch(`${SB_URL}/rest/v1/products?select=code&limit=5000`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    });
    const rows = await r.json().catch(() => []);
    for (const p of (Array.isArray(rows) ? rows : [])) {
      if (!p.code) continue;
      urls.push({ loc: `${SITE}/products/${String(p.code).toLowerCase()}`, pri: '0.8', freq: 'weekly' });
    }
  } catch (e) { /* fall back to static routes only */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${esc(u.loc)}</loc><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n') +
    `\n</urlset>\n`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
