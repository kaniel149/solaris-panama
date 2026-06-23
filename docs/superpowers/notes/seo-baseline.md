# SEO Baseline & Plan — Solaris Panamá

Repo: `/Users/kanieltordjman/Desktop/projects/solar/panama/solaris-panama-repo`
Branch: `fable/panama-bustan-parity`
Domain: `https://solaris-panama.com`
Default marketing language: **Spanish (es-PA / Latin America)**
Reference (read-only premium pattern): `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/components/seo/`

---

## 0. Architecture reality check (READ FIRST — drives everything)

The Panama site is a **dual / hybrid** site, NOT a pure SPA:

1. **Static HTML marketing pages** (the actual indexed surface), served from `public/` → built to `dist/`:
   - `/` → `public/index.html` (home)
   - `/nosotros.html`, `/servicios.html`, `/contacto.html`
   - `/solar-residencial.html`, `/solar-comercial.html`
   - `/towns/solar-*.html` (13 town pages)
   - `/blog/*.html` (13 posts)
   - `/politica-de-privacidad.html`, `/terminos-de-servicio.html`
   These already have decent `<title>`, `<meta description>`, OG tags, canonical, and JSON-LD.

2. **React SPA** built from `app.html` (Vite `build.rollupOptions.input = 'app.html'`). Routes are gated in `vercel.json` rewrites → `/app.html`. The SPA owns: `/dashboard`, `/login`, `/landing`, `/lp/:path*`, `/azuero`, `/tools/*`, `/mapa-solar`, `/mapa-comercial`, and all CRM routes.

3. **Collision risk (gap):** `src/App.tsx` ALSO defines React routes for `/nosotros`, `/servicios`, `/proyectos`, but these clean URLs are **NOT** in `vercel.json` rewrites and **NOT** in `sitemap.xml`. In production:
   - `/nosotros` and `/servicios` (no `.html`) have no rewrite → likely 404 / not served by the SPA. Only `/nosotros.html` & `/servicios.html` (static) are reachable & indexed.
   - `/proyectos` (React) has **NO static HTML twin and NO rewrite** → effectively dead for SEO. There is no `proyectos.html`.
   - `vite.config.ts` `appHtmlFallback()` serves these clean URLs **in dev only** (Vite middleware), masking the prod gap.

**Implication for the SEO phase:** the highest-ROI, lowest-risk work is on the **static HTML marketing pages + sitemap/robots + town pages**, because those are what Google actually crawls. For React routes we want indexed (`/proyectos`), we must EITHER add a static `proyectos.html` OR add a rewrite + client-injected meta. Do not assume `react-helmet` works — it is not installed (see §3).

---

## 1. Current SEO State (audit)

### 1.1 Files
| Asset | Path(s) | Status |
|---|---|---|
| sitemap | `/sitemap.xml` (root, source) + `/public/sitemap.xml` + `/dist/sitemap.xml` (built) | Present, 6.0 KB, ~32 URLs |
| robots | `/robots.txt` (root) + `/public/robots.txt` + `/dist/robots.txt` | Present, 283 B |
| SEOHead component | **NONE** in `src/` (grep for `SEOHead`/`react-helmet`/`ld+json` in `src` = 0 hits) | **MISSING** |
| react-helmet(-async) | `node_modules/react-helmet-async` → **NOT installed** | **MISSING** |
| Google Search Console verify | `public/google18e971113caa3730.html` | Present (verified property) |
| OG image asset | only `public/solaris-logo-dark.png` (13 KB), `public/solaris-icon.png`. **No 1200×630 `og-*.jpg`** | **MISSING dedicated OG** |
| favicon | `public/favicon.svg` | Present |

> Note: `src/pages/LpAzueroPage.tsx` (lines ~227–255) is the ONLY React page doing meta — it manually `document.title=...` + `upsertMeta(...)` in a `useEffect`, sets `robots: noindex,nofollow` (intentional — paid LP), and references `https://solaris-panama.com/og-azuero.jpg` which **does not exist** in `public/`. So even that OG is broken.

### 1.2 sitemap.xml (`/sitemap.xml`)
- Lists: `/`, `nosotros.html`, `servicios.html`, `contacto.html`, 13 `towns/solar-*.html`, 13 `blog/*.html`, `solar-residencial.html`, `solar-comercial.html`, `blog/`, 2 legal pages.
- **Gaps:** stale `lastmod` (all `2026-03-29/30`); missing `/proyectos` (no page exists); no XML sitemap-index; no image sitemap; no hreflang (single-language es so OK to skip).

### 1.3 robots.txt
```
User-agent: *
Allow: /
Disallow: /dashboard /login /crm-leads /projects /clients /settings /api/ /tools/ /leads /monitoring /calendar
Sitemap: https://solaris-panama.com/sitemap.xml
```
- Good: app/CRM routes blocked. **Gaps:** does not block `/landing`, `/lp/`, `/azuero` (paid LPs — they are noindex via meta on `LpAzueroPage`, but should also be in robots), `/mapa-solar`, `/mapa-comercial`, `/dekel-panama-leads.html`, `/portal.html`, `/proposal*`, `/hub.html`, `/marketing.html`. No `Crawl-delay` (fine). No explicit AI-bot rules (GPTBot/PerplexityBot — leave allowed, see §3-GEO).

### 1.4 Existing meta / `<title>` per page (static HTML — Spanish, good baseline)
| Page | `<title>` | desc | canonical | OG | JSON-LD |
|---|---|---|---|---|---|
| `/` (index.html) | "Paneles Solares en Panamá — Solaris Energy \| Instalación en Azuero" | ✅ | ✅ self | ✅ full (es_PA) + twitter | ✅ `ElectricalContractor` + `FAQPage` |
| `nosotros.html` | "Sobre Nosotros — Solaris Panamá \| Empresa Solar en Azuero" | ✅ | ✅ | ✅ | ✅ (Organization/LocalBusiness) |
| `servicios.html` | "Servicios — Instalación de Paneles Solares en Panamá \| Solaris" | ✅ | ✅ | ✅ | ✅ (Service) |
| `towns/solar-chitre.html` (+12) | "Paneles Solares en Chitré — Solaris Energy" | ✅ | ✅ self | ✅ | ✅ `LocalBusiness` + per-town |
| blog ×13 | per-post | ✅ | mostly | partial | `Article` |

JSON-LD types currently in the static site (tallied): `ElectricalContractor`×1, `LocalBusiness`×13, `Organization`×44, `Service`×20, `FAQPage`×1, `Article`×13, `Place`×25, `Offer`×3, `OfferCatalog`×1, `PostalAddress`×15, `GeoCoordinates`×1, `Question`×10, `Answer`×10. So schema coverage is broad but **inconsistent / hand-rolled per file**, no single source of truth, no `BreadcrumbList`, no `WebSite` (sitelinks searchbox), and `@type: ElectricalContractor` on home is weaker than `["LocalBusiness","SolarEnergyCompany"]`.

### 1.5 Brand facts (verified in repo — use these exact values)
| Fact | Value | Source |
|---|---|---|
| Brand name | **Solaris Energy Panamá** / alt "Solaris Panamá" | `public/index.html` JSON-LD |
| Phone | **+507 6583-1822** (`+50765831822`) | `contacto.html`, `index.html` JSON-LD |
| ⚠ Placeholder phone | `+507 6000-0000` also present in `contacto.html` & `index.html` → **FIX (replace with real)** | grep |
| Email | `info@solarispanama.com` | JSON-LD / contacto |
| ⚠ Domain/email mismatch | site = `solaris-panama.com`, email = `solarispanama.com` (no hyphen) → **verify which is correct** | — |
| Address locality | Chitré, **Herrera**, PA | JSON-LD |
| Geo | lat `7.9618`, lng `-80.4283` (Chitré) | JSON-LD |
| Hours | Mo–Fr 08:00–17:00 | JSON-LD |
| Area served | Chitré, Pedasí, Las Tablas, Los Santos, Guararé, Ocú, Playa Venao, Santiago | JSON-LD `areaServed` |
| Differentiator | **Ley 417** (100% income-tax deduction), "ahorra hasta 95%", "+150 instalaciones", "95% satisfacción" | nosotros/index |
| `sameAs` | **EMPTY** `[]` → add FB/IG when available | JSON-LD |
| Analytics | Google Ads `AW-18049688013`, Meta Pixel `928138543031656`, GA4 (`G-HSGBK44MXZ` per CLAUDE.md) | `app.html`, `index.html` |
| WhatsApp config | `VITE_PUBLIC_WHATSAPP_PHONE` (env), `src/config/public.ts` default `50700000000` (placeholder) | `src/config/public.ts` |

---

## 2. Gaps vs best practice (Panama solar, Spanish)

1. **No reusable SEO source of truth.** Static pages hand-roll meta + schema → drift, mismatched values (e.g. `og-azuero.jpg` 404, `ElectricalContractor` vs `LocalBusiness`). Bustan solved this with `SEOHead.tsx` + `schemas.ts`.
2. **`/proyectos` is invisible** — React route with no static twin, no rewrite, not in sitemap. A "proyectos / casos de éxito" page is a top trust/E-E-A-T asset for solar; currently zero SEO value.
3. **Missing schemas:** no `BreadcrumbList` anywhere, no `WebSite` (sitelinks searchbox), no `AggregateRating`/`Review` (we have "95% satisfacción / +150 instalaciones" social proof to back it), no `Service` with `areaServed=Panamá` on the residential/comercial pages consistently.
4. **OG image:** no dedicated 1200×630 social card; OG falls back to a 13 KB logo PNG. Poor share/LLM-card rendering.
5. **Geo concentration too narrow.** Town pages cover only Azuero (Herrera + Los Santos). Highest-volume Panama solar search demand is **Ciudad de Panamá** and secondary cities (David/Chiriquí, Coronado, Boquete, Penonomé, Santiago) — not yet targeted. `src/config/panamaZones.ts` already models Panama City commercial districts (Costa del Este, Panamá Pacífico, etc.) → reusable for new town pages.
6. **Stale `lastmod`** dates (2026-03) → regenerate on build (script exists at `scripts/`).
7. **Keyword coverage thin on money terms** — pages lean on "Azuero"; missing dedicated targeting for "cuánto cuesta", "precio paneles solares Panamá", "financiamiento", "net metering / Ley 417", "empresa de paneles solares en Panamá".
8. **robots gaps** — paid LPs / internal HTML (`portal.html`, `dekel-panama-leads.html`, `hub.html`, `marketing.html`, `proposal*`) are crawlable and dilute/embarrass the index.
9. **No `lang`/locale precision** — static pages use `lang="es"`; should be `es` with `og:locale=es_PA` (home already does this; propagate to all).
10. **Internal linking** — town pages exist but home/servicios don't obviously link to a town hub; no `/cobertura` or `/ubicaciones` index page tying town pages together (orphan-page risk).

---

## 3. Deliverable Plan (drives the SEO phase)

### 3.0 Implementation decision (CRITICAL — pick the low-risk path)
Because the indexed surface is **static HTML**, prefer a **two-track** delivery:

- **Track A (primary, ships SEO value immediately):** Edit the static HTML `<head>`s + sitemap + robots + add `proyectos.html`. No build/runtime risk to the CRM. This is where most points 1–10 get fixed.
- **Track B (parity with bustan, for the SPA marketing routes):** Add `src/components/seo/SEOHead.tsx` + `src/components/seo/schemas.ts` mirroring the bustan reference, **but use a lightweight injector** (the `upsertMeta` pattern already proven in `LpAzueroPage.tsx`) instead of `react-helmet-async`, to avoid adding a dependency. If `react-helmet-async` is desired, it must be added to `package.json` deps AND a provider wired in `main.tsx` — additive, but heavier. **Recommendation: build a Spanish-only `SEOHead` with a `useEffect` meta-injector + a `<JsonLd>` helper; no new dependency.** This compiles cleanly with the existing stack (React 18 + TS + react-router 6).

> Single source of truth file to create: `src/lib/seo.ts` (or `src/components/seo/`) exporting the schema builders below, imported by both Track B React pages and consumed (copy values) by Track A static pages. Keep all NAP/brand constants in ONE `SEO_BUSINESS` const.

### 3.1 JSON-LD schemas to add (Spanish values, exact)

Create `src/lib/seo/schemas.ts` (mirror bustan `schemas.ts`). Constants:
```
BASE_URL = 'https://solaris-panama.com'
BUSINESS_ID = `${BASE_URL}/#business`
```

**(a) LocalBusiness (every page) — upgrade home's `ElectricalContractor`:**
```jsonc
{
  "@context":"https://schema.org",
  "@type":["LocalBusiness","SolarEnergyCompany"],
  "@id":"https://solaris-panama.com/#business",
  "name":"Solaris Energy Panamá",
  "alternateName":["Solaris Panamá","Paneles Solares Solaris"],
  "description":"Empresa de energía solar en Panamá. Instalación de paneles solares residenciales y comerciales en la Península de Azuero y todo el país. Ahorra hasta 95% en tu factura eléctrica con la Ley 417.",
  "url":"https://solaris-panama.com",
  "telephone":"+507-6583-1822",
  "email":"info@solarispanama.com",   // ⚠ confirm domain
  "image":"https://solaris-panama.com/og-solaris.jpg",
  "logo":"https://solaris-panama.com/solaris-icon.png",
  "address":{"@type":"PostalAddress","addressLocality":"Chitré","addressRegion":"Herrera","addressCountry":"PA"},
  "geo":{"@type":"GeoCoordinates","latitude":7.9618,"longitude":-80.4283},
  "areaServed":[
    {"@type":"City","name":"Ciudad de Panamá"},
    {"@type":"City","name":"Chitré"},{"@type":"City","name":"Las Tablas"},
    {"@type":"City","name":"Pedasí"},{"@type":"City","name":"Santiago"},
    {"@type":"City","name":"David"},{"@type":"City","name":"Penonomé"},
    {"@type":"State","name":"Herrera"},{"@type":"State","name":"Los Santos"},
    {"@type":"Country","name":"Panamá"}
  ],
  "priceRange":"$$",
  "currenciesAccepted":"USD",
  "paymentAccepted":["Efectivo","Transferencia bancaria","Financiamiento"],
  "openingHoursSpecification":{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"08:00","closes":"17:00"},
  "keywords":"paneles solares panamá, energía solar panamá, instalación paneles solares, ley 417, ahorro luz panamá",
  "sameAs":[]   // ⚠ add FB/IG when available
}
```

**(b) Organization (on `/nosotros`):**
```jsonc
{ "@type":"Organization","@id":"https://solaris-panama.com/#organization",
  "name":"Solaris Energy Panamá","legalName":"Solaris Energy Panamá",
  "url":"https://solaris-panama.com",
  "logo":{"@type":"ImageObject","url":"https://solaris-panama.com/solaris-icon.png","width":400,"height":120},
  "description":"Empresa líder en instalación de paneles solares en la Península de Azuero, Panamá. Más de 150 instalaciones, certificados bajo la Ley 417.",
  "foundingLocation":{"@type":"Place","name":"Chitré, Herrera, Panamá"},
  "knowsAbout":["Energía solar","Paneles solares","Sistemas fotovoltaicos","Ley 417","Net metering","EPC solar","PPA solar","Almacenamiento con baterías"],
  "contactPoint":[{"@type":"ContactPoint","contactType":"ventas","telephone":"+507-6583-1822","availableLanguage":["Spanish","English"]}],
  "sameAs":[] }
```

**(c) Service (on `/servicios`, `/solar-residencial`, `/solar-comercial`):**
```jsonc
{ "@type":"Service","@id":"https://solaris-panama.com/servicios#service",
  "provider":{"@id":"https://solaris-panama.com/#business"},
  "serviceType":"Instalación de paneles solares",
  "name":"Energía solar llave en mano (EPC / PPA)",
  "description":"Servicio integral de energía solar en Panamá: estudio de techo, diseño del sistema, suministro de equipos, instalación y mantenimiento para hogares y empresas. Opciones de compra (EPC) y financiamiento sin inversión inicial (PPA).",
  "areaServed":[{"@type":"Country","name":"Panamá"},{"@type":"State","name":"Herrera"},{"@type":"State","name":"Los Santos"}],
  "hasOfferCatalog":{"@type":"OfferCatalog","name":"Servicios de Energía Solar","itemListElement":[
    {"@type":"Offer","itemOffered":{"@type":"Service","name":"Paneles Solares Residenciales","description":"Sistemas solares para el hogar de 3 a 30 kWp. Reduce hasta 95% tu factura eléctrica."}},
    {"@type":"Offer","itemOffered":{"@type":"Service","name":"Energía Solar Comercial e Industrial","description":"Sistemas de 20 a 500 kWp para negocios. Deducción fiscal del 100% con la Ley 417."}},
    {"@type":"Offer","itemOffered":{"@type":"Service","name":"Financiamiento Solar (PPA)","description":"Instalación sin inversión inicial; paga la energía solar a una tarifa menor que la actual."}},
    {"@type":"Offer","itemOffered":{"@type":"Service","name":"Mantenimiento y Monitoreo","description":"Limpieza, inspección y monitoreo remoto del sistema fotovoltaico."}}
  ]}}
```

**(d) FAQPage (on `/`, `/servicios`, town pages):** reuse + expand existing Spanish Q&A. Target featured snippets. Seed questions:
- ¿Cuánto cuestan los paneles solares en Panamá? (residencial $5,000–$12,000 / comercial $15,000–$80,000)
- ¿Qué es la Ley 417 y cómo me beneficia? (100% deducción ISR)
- ¿Cuánto puedo ahorrar en mi factura eléctrica? (hasta 95%)
- ¿Qué es el net metering en Panamá? (excedentes a la red)
- ¿Cuánto tarda la instalación? (residencial 1–3 días)
- ¿Cuál es el retorno de inversión? (4–7 años)

**(e) BreadcrumbList (every non-home page) — currently MISSING entirely:**
```jsonc
{ "@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"name":"Inicio","item":"https://solaris-panama.com/"},
  {"@type":"ListItem","position":2,"name":"Servicios","item":"https://solaris-panama.com/servicios.html"}
]}
```

**(f) WebSite (home only) — enables sitelinks searchbox:** add `WebSite` with `publisher → #business`.

Emit multiple schemas per page as a single `@graph` (bustan pattern) for cleanliness.

### 3.2 Per-page meta / OG (Spanish — exact strings to ship)

> Title ≤ ~60 chars, description 150–160. Canonical = self. `og:locale=es_PA`. `og:image` = create `https://solaris-panama.com/og-solaris.jpg` (1200×630) — **asset must be produced** (currently missing).

**`/` (home, `public/index.html`)**
- title: `Paneles Solares en Panamá — Solaris Energy | Energía Solar Azuero`
- description: `Instalación de paneles solares en Panamá. Ahorra hasta 95% en tu factura de luz con la Ley 417 (100% deducible). +150 instalaciones en el Azuero. Cotización gratis.`
- canonical: `https://solaris-panama.com/`
- og:image: `https://solaris-panama.com/og-solaris.jpg`

**`/servicios.html`**
- title: `Servicios de Energía Solar en Panamá | Solaris Energy`
- description: `Instalación solar residencial, comercial e industrial en Panamá. EPC y financiamiento PPA sin inversión inicial. Mantenimiento y monitoreo. Ley 417. Cotiza gratis.`
- canonical: `https://solaris-panama.com/servicios.html`

**`/nosotros.html`**
- title: `Sobre Nosotros — Empresa de Paneles Solares en Panamá | Solaris`
- description: `Conoce a Solaris Energy Panamá: +150 instalaciones solares en la Península de Azuero, 95% de satisfacción y certificación bajo la Ley 417. Tu empresa solar de confianza.`
- canonical: `https://solaris-panama.com/nosotros.html`

**`/proyectos` (NEW — create `public/proyectos.html`; also covers the orphan React route)**
- title: `Proyectos Solares en Panamá — Casos Reales | Solaris Energy`
- description: `Proyectos reales de energía solar en Panamá: hogares, comercios y hoteles del Azuero que ya ahorran hasta 95% en luz. Mira instalaciones, capacidad (kWp) y ahorros.`
- canonical: `https://solaris-panama.com/proyectos.html` (or `/proyectos` if a rewrite is added; pick ONE and keep canonical consistent)
- schema: `BreadcrumbList` + `ItemList` of projects (each `Project`/`CreativeWork` with `name`, `location`, `description`). Add `AggregateRating` if reviews exist.

### 3.3 sitemap.xml + robots.txt updates

**sitemap.xml** (edit root `sitemap.xml`; it is the source that `public/` + `dist/` mirror — verify with the existing `scripts/` generator):
- Add `proyectos.html` (priority 0.8).
- Add new town pages from §3.4 (priority 0.7–0.8).
- Add a `/ubicaciones.html` (or `/cobertura.html`) town-hub index page (priority 0.6).
- Refresh all `lastmod` to current build date (automate in `scripts/` build step; many entries stale at 2026-03-29).
- Keep `/blog/` listing; consider per-post `lastmod` from file mtime.
- DO NOT list noindex paid LPs (`/lp/azuero`, `/landing`, `/azuero`).

**robots.txt** — add disallows for non-public HTML + paid LPs:
```
Disallow: /landing
Disallow: /lp/
Disallow: /azuero
Disallow: /mapa-solar
Disallow: /mapa-comercial
Disallow: /portal.html
Disallow: /hub.html
Disallow: /marketing.html
Disallow: /proposal
Disallow: /proposals/
Disallow: /dekel-panama-leads.html
```
Keep existing app/CRM disallows + `Sitemap:` line. Leave AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) **allowed** (see GEO §3.6).

### 3.4 Panama location / town pages (URL pattern + Spanish title/H1/intro)

**Existing pattern (keep):** `https://solaris-panama.com/towns/solar-{slug}.html`, H1 = `Paneles Solares en {Ciudad} — Solaris Energy`, per-town `LocalBusiness` JSON-LD. Existing 13 are all **Azuero** (Chitré, Pedasí, Las Tablas, Playa Venao, Cañas, Los Santos, Guararé, Ocú, Macaracas, Pocrí, Tonosí, Parita, Santiago).

**Add 8 high-demand locations OUTSIDE Azuero** (reuse `src/config/panamaZones.ts` for Panama City districts). Same URL pattern + `areaServed` localized:

| # | URL | H1 | Intro angle (Spanish, 1 line) |
|---|---|---|---|
| 1 | `/towns/solar-ciudad-de-panama.html` | Paneles Solares en Ciudad de Panamá | Capital con las facturas eléctricas más altas del país; techos comerciales y residenciales con alto potencial solar y respaldo de la Ley 417. |
| 2 | `/towns/solar-david.html` | Paneles Solares en David, Chiriquí | Segunda ciudad de Panamá y zona de gran irradiación; ideal para comercios, fincas y hogares que buscan independencia energética. |
| 3 | `/towns/solar-coronado.html` | Paneles Solares en Coronado | Comunidad de playa con casas y residencias premium; reduce el alto consumo de aire acondicionado con energía solar. |
| 4 | `/towns/solar-boquete.html` | Paneles Solares en Boquete | Destino de expatriados y turismo; hoteles, cafés y casas que aprovechan el clima de tierras altas para máximo ahorro. |
| 5 | `/towns/solar-penonome.html` | Paneles Solares en Penonomé, Coclé | Corredor central con fuerte irradiación; comercios e industria agrícola que reducen costos con energía solar. |
| 6 | `/towns/solar-aguadulce.html` | Paneles Solares en Aguadulce | Zona industrial y agroindustrial de Coclé; sistemas comerciales de gran tamaño con retorno acelerado. |
| 7 | `/towns/solar-santiago-veraguas.html` | Paneles Solares en Santiago de Veraguas | Centro de servicios del país; negocios y hogares que cambian la factura de luz por energía solar propia. |
| 8 | `/towns/solar-panama-pacifico.html` | Paneles Solares en Panamá Pacífico | Zona económica especial con naves y comercios; energía solar comercial con beneficios fiscales de la Ley 417. |

(Optional further: Arraiján, La Chorrera, Colón, Bocas del Toro for tourism resorts.)

**Town-hub index (NEW):** `/ubicaciones.html` — H1 `Cobertura de Energía Solar en Panamá`, links to ALL town pages (fixes orphan-page risk + internal linking), `BreadcrumbList` + `ItemList`/`CollectionPage` schema.

### 3.5 Spanish keyword targets (es-PA)

**Primary (commercial/transactional):**
- `paneles solares panamá` · `energía solar panamá` · `instalación de paneles solares panamá`
- `empresa de paneles solares en panamá` · `precio paneles solares panamá` · `cuánto cuestan los paneles solares en panamá`
- `paneles solares para casa` · `energía solar para empresas / comercial`

**Local (per town page):** `paneles solares en {ciudad}` (Chitré, Ciudad de Panamá, David, Coronado, Boquete, Penonomé, Santiago…).

**Informational / Ley + ahorro (blog + FAQ):**
- `ley 417 panamá` · `net metering panamá` · `cómo ahorrar en la factura de luz panamá`
- `financiamiento de paneles solares panamá` · `retorno de inversión paneles solares`
- `cuántos paneles solares necesito` · `mantenimiento de paneles solares` · `solar vs generador`

(Map: primary → home/servicios/residencial/comercial; local → town pages; informational → existing 13 blog posts — already well aligned.)

### 3.6 GEO / AI-search notes (answer-engine optimization)

- **Keep AI crawlers allowed** in robots (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) so Solaris can appear in AI Overviews / ChatGPT / Perspective answers — high-intent local queries like "best solar company in Panama" route through these.
- **Definitive, citable answers:** ensure FAQ answers state numbers explicitly (price ranges in USD, payback 4–7 yrs, ahorro hasta 95%, Ley 417 = 100% deducción). LLMs quote concrete figures.
- **Entity clarity:** single canonical `@id` (`#business`) referenced across schemas via `@graph` so the entity graph is unambiguous → strengthens "Solaris = empresa solar en Panamá" association.
- **`speakable` schema** (optional) on FAQ/home for voice assistants.
- **Comparison & list content** ("mejores empresas de paneles solares en Panamá", "solar vs generador") performs in AI answers — already have `solar-vs-generador-panama.html`; add a transparent pricing table page.
- **Author/expertise (E-E-A-T):** add author + reviewer to blog `Article` schema; surface "+150 instalaciones / desde 2018 / certificados Ley 417" as trust signals in visible copy AND schema (`Organization.knowsAbout`, foundingDate). LLMs weight demonstrated experience.
- **OG/structured images:** produce the missing `og-solaris.jpg` (1200×630) — AI/social cards and SERP previews currently fall back to a tiny logo.

---

## 4. Hard-rule / safety notes for the implementation phase
- Do **not** touch pre-existing uncommitted scanner files or any `* 2.tsx` duplicate.
- Static-HTML edits (Track A) carry zero runtime risk to the CRM — prefer them.
- If adding `SEOHead` in React (Track B), use the `upsertMeta` `useEffect` pattern already in `LpAzueroPage.tsx` (no new dependency). Only add `react-helmet-async` if explicitly approved (it is NOT currently installed).
- Keep all copy in **es-PA**. Reuse the `es.json` i18n namespace for any React-rendered marketing strings.
- Fix the two data hygiene issues before shipping schema: placeholder phone `+507 6000-0000` and email/domain mismatch (`solarispanama.com` vs `solaris-panama.com`).
- Verify the `scripts/` sitemap generator (if any) so manual sitemap edits aren't overwritten on build.
