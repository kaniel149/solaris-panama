# Panama Site Map — for the Bustan Premium Port

> READ-ONLY exploration of the Panama repo. Goal: land the Bustan marketing-site
> port cleanly without regressing the CRM/dashboard/app or touching pre-existing
> uncommitted files.
>
> Repo: `/Users/kanieltordjman/Desktop/projects/solar/panama/solaris-panama-repo`
> Branch: `fable/panama-bustan-parity`
> Stack: Vite 7 + React 18 + TS 5 + react-router-dom 6 + Tailwind 3 + framer-motion 10 + lucide-react + i18next/react-i18next + Supabase + MapLibre/react-map-gl + recharts
> Premium reference (NEVER edit): `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy`

---

## ⚠️ DO-NOT-TOUCH (pre-existing uncommitted files)

`git status --short` currently shows these untracked/modified files. They are UNRELATED
(scanner work) and must be left exactly as-is — do not edit, move, or delete:

```
 M supabase/.temp/cli-latest
?? docs/superpowers/HANDOFF-scanner-integration.md
?? docs/superpowers/specs/2026-06-14-panama-bustan-parity-design.md
?? "docs/superpowers/specs/2026-06-14-scanner-bustan-parity-design 2.md"
?? "src/components/scanner/CandidateReviewPanel 2.tsx"
?? "src/components/scanner/ScannerLegend 2.tsx"
?? "src/components/scanner/ScannerTopNav 2.tsx"
?? "src/services/candidateService 2.ts"
?? "supabase/migrations/056_scan_candidates_and_land 2.sql"
```

Anything ending in ` 2.<ext>` is a pre-existing duplicate — never touch.

---

## 1. Routing — `src/App.tsx`

Single `<Routes>` tree (no `BrowserRouter` here — it lives in `src/main.tsx`).
Providers wrap everything: `ThemeProvider > AuthProvider > ToastProvider`, plus
`<RouteTracker />` for analytics. There is NO `HelmetProvider` today (react-helmet
is NOT installed — see §5).

### Marketing / public routes (NO Layout wrapper, eagerly imported)
These render full-page on their own — each page renders its own navbar/footer/floating WhatsApp inline:

| Path | Element | File |
|---|---|---|
| `/` | `HomePage` | `src/pages/HomePage.tsx` |
| `/login` | `LoginPage` | `src/pages/LoginPage.tsx` |
| `/landing` | `LandingPage` | `src/pages/LandingPage.tsx` |
| `/lp/azuero` | `LpAzueroPage` | `src/pages/LpAzueroPage.tsx` |
| `/azuero` | `<Navigate to="/lp/azuero" replace />` | redirect |
| `/nosotros` | `NosotrosPage` | `src/pages/NosotrosPage.tsx` |
| `/servicios` | `ServiciosPage` | `src/pages/ServiciosPage.tsx` |
| `/proyectos` | `ProyectosPage` | `src/pages/ProyectosPage.tsx` |
| `/mapa-solar` | `PublicSolarMapPage` (lazy + Suspense) | `src/pages/PublicSolarMapPage.tsx` |
| `/solar-map` | `<Navigate to="/mapa-solar" replace />` | redirect |

The 7 marketing pages (`/`, `/landing`, `/lp/azuero`, `/nosotros`, `/servicios`, `/proyectos`, `/mapa-solar`)
are imported eagerly (top of file). All CRM pages are `lazy()`.

### App / CRM routes (wrapped in `<Route element={<Layout />}>`, all lazy + Suspense)
`/dashboard`, `/crm-leads`, `/projects`, `/projects/:id`, `/clients`, `/clients/:id`,
`/proposals`, `/calendar`, `/monitoring`, `/tools/calculator`, `/tools/scanner`,
`/tools/proposal-generator`, `/leads`, `/leads/:id`, `/settings`, `/mapa-comercial`,
and `*` → `NotFoundPage`.

`Layout.tsx` (`src/components/layout/Layout.tsx`) gates on `useAuth()` — if no `user`
it renders `<LoginPage />`. It provides Sidebar + Navbar + MobileDrawer, an "immersive"
mode for `/tools/scanner`, and a dark `bg-[#0a0a0f]` shell. **The marketing pages never
touch Layout** — porting marketing must NOT alter Layout/Sidebar/Navbar.

### How marketing pages are structured today
Each marketing page is a self-contained file with its OWN inline navbar, sections,
footer, and a floating WhatsApp FAB. Common shape (HomePage / Servicios / Nosotros / Proyectos):
- Fixed background layer (dot-grid + green/gold blur glows).
- Inline `<header>` navbar: Solaris logo (`/solaris-icon.png` + "SOLARIS Panamá" in Playfair),
  nav buttons (Nosotros / Servicios / Proyectos via `navigate()`), a phone link, and a gold
  "Cotización Gratis" CTA → `/landing`.
- Hero (h1 in Playfair Display serif, gold gradient text), stats grid, content sections,
  CTA section, inline `<footer>`, and a fixed bottom-right floating WhatsApp `motion.a`.
- All copy is **hardcoded Spanish JSX** (NOT i18n — see §3). Animations via `framer-motion`
  (`fadeUp` variant repeated in every file). Icons from `lucide-react`.
- `LandingPage` + `LpAzueroPage` additionally have lead-capture forms posting to the API /
  Supabase, UTM tracking, and (only `LpAzueroPage`) imperative `document.title`/meta tweaks.

**Preserve:** the route paths above (Spanish slugs), the eager-vs-lazy split, the redirect
aliases (`/azuero`, `/solar-map`), and the CRM block untouched.

---

## 2. Current marketing pages — sections & components

All five live in `src/pages/`. None import shared UI components; each is hand-rolled JSX
with inline Tailwind + style objects + framer-motion. The CRM `Button`/`GlassCard` etc.
(see §5) are NOT used by marketing pages.

### `HomePage.tsx` (~419 lines)
Sections: inline navbar → HERO (h1 + subcopy + 2 CTAs + 4-stat panel) → "¿Por Qué Solaris?"
(6 feature cards) → TESTIMONIAL (Pedasí $280→$35, $2,940/yr) → CTA ("Empieza a Ahorrar Hoy")
→ inline footer → floating WhatsApp FAB. Hardcoded `WHATSAPP_NUMBER = '50765831822'`.

### `ServiciosPage.tsx` (~21 KB)
Top-level `servicios` data array: Solar Residencial (3-20 kWp), Solar Comercial,
Off-grid/Wifi, Mantenimiento (Home/Building2/Wifi/Wrench icons). Hero + service detail
cards (titulo/subtitulo/desc/detalles bullets) + benefits + CTA + footer + WhatsApp FAB.

### `NosotrosPage.tsx` (~22 KB)
`valores` array (Zap/Shield/Users/Award/MapPin/Heart). Hero + mission + values grid +
team/why-us + stats + CTA + footer + WhatsApp FAB.

### `ProyectosPage.tsx` (~21 KB)
`Proyecto` interface + project list (titulo/ubicacion/kWp/ahorro/fecha — Azuero towns:
Pedasí, Las Tablas, Chitré, Los Santos). Hero + project cards grid + CTA + footer + WhatsApp FAB.

### `LandingPage.tsx` (~32 KB)
Lead-capture LP. Form state (`nombre`, phone w/ `PANAMA_PHONE_REGEX`), `handleSubmit` →
splits name to firstName/lastName, posts lead, success state ("¡Gracias, {nombre}!"),
builds a WhatsApp deep link. Hero + form + trust + WhatsApp FAB.

### `LpAzueroPage.tsx` (~55 KB — the most SEO-aware page)
The ONLY marketing page that manages head meta: a `useEffect` sets
`document.title = 'Paneles Solares en Panamá · Cotización Gratis | Solaris'` and imperatively
creates/updates `<meta>` tags (restores `prevTitle` on unmount). Multiple WhatsApp deep links
with prefilled `?text=`. This is the closest existing analog to Bustan's `SEOHead`/`StickyWhatsApp`
pattern and a good reference for what the port replaces.

**What to preserve when porting:** the real Panama brand facts (towns, Ley 417, $280→$35,
$2,940/yr, 25-yr warranty), the lead-form submit logic in LandingPage/LpAzuero, UTM tracking,
and the WhatsApp deep-link prefill behavior. Replace the look-and-feel (dark green/gold inline
styles) with Bustan's premium light theme + shared components.

---

## 3. i18n — CRM-only today; marketing is hardcoded

- Config: `src/i18n/index.ts` — `i18next.use(initReactI18next)` with `resources: { en, es, he }`,
  **`lng: 'en'`, `fallbackLng: 'en'`** (default is English, not Spanish).
- Locale files: `src/i18n/en.json`, `src/i18n/es.json`, `src/i18n/he.json`
  (es ≈ 12.8 KB, en ≈ 11.9 KB, he ≈ 6.7 KB).
- Key style: **nested namespaces**, consumed as dot keys. Top-level keys in `es.json`:
  `nav, common, auth, dashboard, pipeline, projects, clients, proposals, calendar,
  monitoring, settings, tools, leads, notFound`. Example: `nav.dashboard = "Panel"`,
  `common.save = "Guardar"`.
- Consumption: standard **`useTranslation()` from `react-i18next`** → `t('nav.dashboard')`.
  Language switching via `src/components/shared/LanguageToggle.tsx`.
- **Consumers are CRM/scanner only**: layout (`Navbar`, `Sidebar`, `MobileDrawer`),
  scanner components, and CRM pages (`DashboardPage`, `ProjectsPage`, `ClientsPage`,
  `ProposalsPage`, `MonitoringPage`, `SettingsPage`, `CalendarPage`, `RoofScannerPage`,
  `NotFoundPage`, etc.). **NONE of the marketing pages (`HomePage`/`Servicios`/`Nosotros`/
  `Proyectos`/`Landing`/`LpAzuero`) call `useTranslation` — their copy is hardcoded Spanish JSX.**

### Implication for the port
- Bustan uses a DIFFERENT i18n system: a custom `LanguageContext` + `useLanguage()`/`useTranslation()`
  hooks reading a giant `src/i18n/translations.ts` (TS object, ~104 KB) with langs `en/th/he`.
- Panama uses `i18next` JSON with `en/es/he`. **Do not swap Panama's i18next system** (CRM depends on it).
- Recommended: keep marketing copy in **Spanish-first** (matches current site + the all-Spanish
  rule). Either (a) keep marketing copy hardcoded Spanish (simplest, matches today), or
  (b) add a `marketing` namespace to `es.json`/`en.json`. Do NOT port Bustan's `translations.ts`/
  `LanguageContext` wholesale — adapt the ported page JSX to Spanish literals (or the es.json namespace).

---

## 4. Theme — `tailwind.config.ts` + `src/index.css` (dark; CRM depends on it)

The CRM/dashboard depend on a **dark glassmorphism** token set. Keep all additions ADDITIVE.

### `tailwind.config.ts` `theme.extend.colors` (DO NOT REMOVE/REDEFINE these — CRM uses them):
- `space.{950..500}`: `#0a0a0f`, `#0f0f17`, `#12121a`, `#16161f`, `#1a1a2e`, `#22223a`, `#2a2a44`
- `surface`: `DEFAULT #12121a`, `hover #1a1a2e`
- `accent`: `DEFAULT/500 #00ffcc` (cyan) + scale 50–900
- `purple`: `DEFAULT #8b5cf6` + scale
- `blue`: `DEFAULT #0ea5e9`
- semantic: `success #22c55e`, `danger #ef4444`, `warning #f59e0b`, `info #0ea5e9`
- `text`: `primary #f0f0f5`, `secondary #8888a0`, `muted #555566`
- `glass`: `border rgba(255,255,255,0.06)`, `border-hover rgba(255,255,255,0.1)`
- `fontFamily.inter`: `['Inter','system-ui','sans-serif']`
- `backgroundImage`: `glass-gradient`, `accent-gradient` (cyan→purple), `cyan-glow`, `purple-glow`, …
- `boxShadow`: `glow-cyan(-lg)`, `glow-purple(-lg)`, `glass(-lg)`
- `animation`: `glow-pulse`, `shimmer`, `float` (+ keyframes)
- `plugins: []`

### `src/index.css` (CRM-critical global rules — keep):
- `@tailwind base/components/utilities`; `html` uses Inter; `body { @apply bg-space-950 text-text-primary }`.
- Custom scrollbar, `::selection` (cyan tint).
- `@layer utilities`: `.glass`, `.glass-hover`, `.glow-cyan`, `.glow-purple`, `.text-gradient`
  (cyan→purple). Focus-visible ring uses `accent`.
- A scanner-specific rule: `.scanner-map-wrap .maplibregl-ctrl-top-right { margin-top: 64px }`.

> NOTE: the marketing pages already DEVIATE from the dark CRM theme — they hardcode a
> green/gold palette inline (`#071F17` bg, `#0B3D2E` green, `#D4A843` gold, `#f5d080`,
> Playfair Display serif) via `style={{}}` objects, NOT Tailwind tokens. So marketing styling
> is effectively isolated already.

### Bustan reference theme (premium, light — for the port's look)
Bustan's `src/index.css` defines CSS-variable tokens you'll likely port as additive CSS vars
(do NOT overwrite Panama's dark tokens): `--bustan-ink #27342f`, `--bustan-grove #24463e`,
`--bustan-canopy #2f5d52`, `--bustan-lagoon #006f6b`, `--bustan-lagoon-bright #008f8a`,
`--bustan-sun #f2b84b`; semantic `--color-ink/shell/grove/mist/sand`, plus a `font-serif`
(Instrument Serif) display face. Add these as NEW additive tokens/vars scoped to marketing —
never replace `space.*`/`surface`/`accent`/`text.*` that the CRM relies on.
**Recommendation:** for Panama, re-skin Bustan's premium light layout to the existing Panama
green/gold brand (`#0B3D2E` grove + `#D4A843` gold) so it stays on-brand, OR introduce a
parallel `panama-*` token set; keep it additive.

---

## 5. Existing reusable components — reuse vs. port

### In Panama repo (CRM-oriented, dark theme)
- **Button** — `src/components/ui/Button.tsx`. API: `variant: 'primary'|'secondary'|'ghost'|'danger'|'accent'`,
  `size: 'sm'|'md'|'lg'`, `loading`, `icon`, `iconRight`, `fullWidth`. **Cyan/purple dark styling** —
  NOT suitable for the premium marketing look without restyle.
- **PageHeader** — `src/components/ui/PageHeader.tsx` (CRM page header, NOT a marketing SectionHeader).
- Other UI: `GlassCard`, `Badge`, `Chip`, `StatsCard`, `AnimatedCounter`, `Modal`, `Input`, `Select`,
  `DataTable`, `KanbanBoard`, `Toast` (+ `ToastProvider`), `CommandPalette`, etc. (barrel `src/components/ui/index.ts`).
  All dark-themed, CRM-focused.
- **Layout**: `src/components/layout/{Layout,Navbar,Sidebar,MobileDrawer}.tsx` — CRM shell only.
- **Shared**: `src/components/shared/{ActivityFeed,LanguageToggle,PipelineStage}.tsx`.
- **`src/components/RouteTracker.tsx`** — analytics route tracker (already mounted in App).

### NOT present in Panama (must be PORTED from Bustan)
- **`SectionHeader`** — none in Panama. Bustan: `src/components/ui/SectionHeader.tsx`
  (props `tag`, `title`, `subtitle`, `align`, `className`; uses framer-motion + serif title +
  `var(--bustan-lagoon)` kicker — restyle to Panama gold). Also Bustan has `Section`, `GlassCard`,
  `ParallaxImage`, `DragScroll`, `FloatingPanel`, `Badge`.
- **`SEOHead`** — none in Panama. Bustan: `src/components/seo/SEOHead.tsx` — uses **`react-helmet-async`**
  (NOT installed in Panama — `package.json` has no helmet). Props: `title`, `description`, `path`,
  `lang`, `schema`, `ogImage`, `isArticle`, `robots`. Emits title/desc/canonical/hreflang/OG/Twitter +
  JSON-LD. **Porting requires either installing `react-helmet-async` + adding `HelmetProvider` to App,
  OR re-implementing the imperative `document.title`/meta approach used in `LpAzueroPage.tsx`.**
  Bustan hardcodes `BASE_URL='https://bustan-energy.com'` and brand strings — must be Panama-ized
  (base `https://solaris-panama.com`, `| Solaris Panamá`, `es_PA`/`en_US` locales, no `/th` prefix).
- **Schema helper** — none in Panama. Bustan: `src/components/seo/schemas.ts` (~21 KB) +
  `index.ts` barrel — `localBusinessSchema(lang)`, `serviceSchema`, etc. Port + Panama-ize (NAP,
  geo Azuero/Panama, Spanish).
- **Sticky / Floating WhatsApp widget** — Panama has NO shared widget; each marketing page inlines its
  own floating WhatsApp `motion.a`. Bustan: `src/components/layout/StickyWhatsApp.tsx` —
  segment-aware (factory/villa/default), `useLocation` + `useLanguage`, prefilled messages, PostHog
  `whatsapp_click`, hidden on `^/(admin|crm|platform|preview-scroll)`. **Port + Panama-ize**: number
  `50765831822`, Spanish labels, hide on app routes (`/dashboard`, `/login`, `/leads`, `/clients`,
  `/projects`, `/proposals`, `/calendar`, `/monitoring`, `/settings`, `/tools/*`, `/crm-leads`,
  `/mapa-comercial`). Bustan uses its own `useLanguage` (i18next not present there) — adapt to Spanish
  literals or Panama's `react-i18next`.

### Dependency gaps to resolve before porting Bustan components
- `react-helmet-async` — **NOT in Panama package.json** (Bustan has `^3.0.0`). Needed for SEOHead.
- `react-router-dom` — Panama `^6.20.0` vs Bustan `^7` (APIs used here — `useNavigate`, `useLocation`,
  `Navigate`, `Routes/Route` — are compatible across 6/7; keep v6).
- `framer-motion` — Panama `^10.18.0` vs Bustan `^12`; `lucide-react` `^0.294.0` vs `^0.577.0`.
  Ported JSX should compile on Panama's versions (basic `motion`, `whileInView`, `interpolate`-free).
- Bustan App uses `BrowserRouter` + `HelmetProvider` + `LanguageProvider` + nested `<Route index>`;
  Panama uses a flat `<Routes>` with `BrowserRouter` in `main.tsx`. **Adapt ported pages to Panama's
  router/provider shape — do not import Bustan's App/LanguageProvider.**

---

## 6. Brand facts (current Panama site)

- **Company display name:** `Solaris` / `SOLARIS Panamá` (footer: "Solaris Panama — Energía Solar en
  la Península de Azuero"; © "Solaris Panama"). package name `solaris-panama-platform`.
- **Logo / assets** (in `public/`):
  - `/solaris-icon.png` (49 KB) — used in navbars, footers, testimonial avatar, Layout pill.
  - `/solaris-logo-dark.png` (13 KB)
  - `/favicon.svg`
  - `solaris-panama.txt`, Google verification `google18e971113caa3730.html`
  - **Check for existing OG image before generating** — none found in `public/` root (Bustan ports
    `/assets/images/og-default.jpg`; Panama will need a Panama OG image).
- **Brand colors (marketing pages, inline hardcoded — NOT Tailwind tokens):**
  - Deep bg green `#071F17`, mid green `#0B3D2E`, **gold accent `#D4A843`** + light gold `#f5d080`.
  - Money colors: red `#ef4444` (before), green `#22c55e` (after/savings).
  - WhatsApp brand green `#25d366` / `#128c4e`.
  - Display font: **Playfair Display, serif** (loaded via CSS, used inline as `style={{ fontFamily }}`).
  - (CRM/dashboard uses the separate dark cyan/purple Tailwind theme — see §4.)
- **WhatsApp / contact phone:**
  - **Number: `50765831822`** (displayed as `507-6583-1822`).
  - **Configured as a hardcoded `const WHATSAPP_NUMBER = '50765831822'`** at the top of EACH marketing
    page (`HomePage`, `ServiciosPage`, `NosotrosPage`, `ProyectosPage`, `LandingPage`, `LpAzueroPage`).
    NOT read from env in the page code.
  - There IS an env var **`VITE_PUBLIC_WHATSAPP_PHONE=50765831822`** in `.env.example` (same number),
    but it is NOT actually wired into the marketing pages today. The live `.env` only contains
    `GEMINI_API_KEY` (no whatsapp var). **Opportunity for the port:** centralize on a single
    constant / `import.meta.env.VITE_PUBLIC_WHATSAPP_PHONE` fallback `'50765831822'` instead of 6 copies.
- **Contact CTA destinations:**
  - Primary CTA buttons ("Cotización Gratis" / "Solicitar Cotización Gratis") → `navigate('/landing')`.
  - WhatsApp CTAs → `https://wa.me/50765831822` (some with prefilled `?text=` in `LandingPage`/`LpAzueroPage`).
  - Phone link displays `507-6583-1822`.
  - Footer links: Nosotros / Servicios / Proyectos (in-app `navigate`), `CRM` → `/login`, WhatsApp.
- **Real stats / numbers used on the site (preserve in the port):**
  - "Ahorra hasta 95% en tu factura" / hero stat `$280→$35` ("Ahorro real por mes").
  - `25+ Años` system warranty; `1 Día` install time; **Ley 417** (equipos sin impuestos / renewable incentive).
  - Testimonial: cliente en Pedasí, Herrera, sistema 5kW (2024): `$280 → $35`, ahorro **`$2,940 al año`**.
  - Payback `3-5 años`; residential systems `3–20 kWp`.
  - Geography: **Península de Azuero** — Pedasí, Las Tablas, Chitré, Los Santos, Herrera.
- **SEO base:** live domain referenced in `LpAzueroPage` title = "… | Solaris"; deploy domain is
  `solaris-panama.com` (per workspace memory). `robots.txt` + `sitemap.xml` exist at repo root,
  plus `public/google18e971113caa3730.html` verification.

---

## Porting checklist (clean-landing notes)
1. Marketing copy stays **Spanish** (current site is hardcoded Spanish; CRM i18n is separate — leave it).
2. Port Bustan `SEOHead` + `schemas.ts` + `StickyWhatsApp` + `SectionHeader`/`Section`/`GlassCard`,
   re-pointing brand to **Solaris Panamá** (domain `solaris-panama.com`, `es_PA`/`en_US`, no `/th`).
3. Add `react-helmet-async` to deps + wrap `App` in `HelmetProvider` (additive) — OR reuse the
   imperative `document.title`/meta pattern from `LpAzueroPage.tsx` to avoid the new dep.
4. Centralize the WhatsApp number `50765831822` (consider `VITE_PUBLIC_WHATSAPP_PHONE`), hide the
   sticky widget on all Layout/app routes listed in §5.
5. Keep theme additions **additive** — never alter `space.*`, `surface`, `accent`, `text.*`,
   `.glass*`, `body` background (CRM depends on them). Add Panama green/gold or `--panama-*` vars.
6. Do not edit Bustan, do not touch the ` 2.*`/scanner uncommitted files, do not commit/push/deploy.
