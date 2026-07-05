// scripts/generate-sitemap.mjs — regenerate public/sitemap.xml from public/ contents
import { readdirSync, writeFileSync } from 'node:fs';
const BASE = 'https://solaris-panama.com';
const today = new Date().toISOString().slice(0, 10);
const EXCLUDE = new Set(['app.html','portal.html','home.html','dekel-panama-leads.html','google18e971113caa3730.html','politica-de-privacidad.html','terminos-de-servicio.html']);
const urls = [{ loc: `${BASE}/`, pri: '1.0', freq: 'weekly' }];
const add = (dir, prefix, pri) => {
  try {
    for (const f of readdirSync(`public${dir}`)) {
      if (!f.endsWith('.html') || EXCLUDE.has(f)) continue;
      if (f === 'index.html') urls.push({ loc: `${BASE}${prefix}/`, pri, freq: 'weekly' });
      else urls.push({ loc: `${BASE}${prefix}/${f}`, pri, freq: 'monthly' });
    }
  } catch {}
};
for (const f of readdirSync('public')) if (f.endsWith('.html') && !EXCLUDE.has(f) && f !== 'index.html') urls.push({ loc: `${BASE}/${f}`, pri: '0.7', freq: 'monthly' });
add('/towns', '/towns', '0.8'); add('/blog', '/blog', '0.9'); add('/en', '/en', '0.8');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`;
writeFileSync('public/sitemap.xml', xml);
console.log(`sitemap: ${urls.length} URLs`);
