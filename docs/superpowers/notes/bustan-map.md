# Bustan Premium Reference Map (for Panama port)

READ-ONLY source: `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy`
Target (edit here only): `/Users/kanieltordjman/Desktop/projects/solar/panama/solaris-panama-repo` on branch `fable/panama-bustan-parity`.

> All marketing copy ported to Panama MUST be Spanish (neutral Panamanian). Bustan copy below is EN/TH — translate, don't paste.

---

## 0. CRITICAL STACK DELTAS (Bustan source vs. Panama target)

These differences decide HOW you port each piece. Do not assume the two repos match.

| Concern | Bustan (source) | Panama (target) | Port implication |
|---|---|---|---|
| Tailwind | **v4, CSS-first** `@import "tailwindcss"` + `@theme {}` block in `src/index.css`. NO `tailwind.config.*`. | **v3** with `tailwind.config.ts` (`theme.extend`). Dark space theme: `space-950 #0a0a0f`, `accent #00ffcc`, `purple`, font `Inter`. CSS uses `@tailwind base/components/utilities`. | Bustan's tokens (`ocean`, `gold`, `grove`, `shell`, `mist`, `ink`, `sand`, `text-display-*`, `shadow-soft/lift/float`, `rounded-card/button`, `ease-out-soft`, `--duration-*`) DO NOT EXIST in Panama. You must ADD them to `tailwind.config.ts` `extend` (additive — do not remove the dark dashboard tokens the CRM relies on) and/or define `--bustan-*` CSS vars + `--duration-*` in Panama `src/index.css`. Bustan classes like `text-display-xl`, `rounded-card`, `shadow-lift`, `text-ink/72`, `bg-shell/82`, `border-grove/14`, `text-ocean`, `text-gold`, `bg-grove`, `from-grove/85` will silently no-op until mapped. |
| i18n | TS object module: `src/i18n/translations.ts` exports `translations[lang]` (lang = `'en'|'th'|'he'`). Hook `useTranslation()` returns `{ t, lang }` where `t = translations[lang]`. `t.home.hero.title` etc. `useLanguage()` returns `{ lang, langPath, switchLangPath }`. `langPath('/contact')` => `/contact` (en) or `/th/contact` (th). | **react-i18next** with JSON files `src/i18n/{en,es,he}.json`, default `lng:'en'` fallback `'en'`, ES is the business language. `src/i18n/index.ts` inits i18next. Components use `useTranslation` from `react-i18next` (`const { t } = useTranslation(); t('nav.dashboard')`). | Bustan's `t.home.hero.title` dot-object access will NOT work in Panama. Port copy as **new keys in `es.json`/`en.json`/`he.json`** under a `home` namespace and read via `t('home.hero.title')`. There is NO `langPath`/`langPath('/contact')` helper in Panama — use plain route strings. Panama marketing routes are `/`, `/servicios`, `/proyectos`, `/nosotros`, `/contacto` (Spanish slugs). |
| Existing HomePage | Premium light theme (this is what we want). | `src/pages/HomePage.tsx` ALREADY a green marketing home (`bg #071F17`, framer-motion `^10`, lucide, its own `WHATSAPP_NUMBER='50765831822'`, 418 lines). Mounted at `/` OUTSIDE `<Layout>`. | Panama already has framer-motion `^10.18.0` and `lucide-react ^0.294.0` (both compatible). The plan is to upgrade Panama's HomePage to Bustan's premium structure. Reuse Panama's WhatsApp number `50765831822` (Panama line), NOT Bustan's `66946692011`. |
| SEO head | `react-helmet-async` (`<Helmet>`), component `src/components/seo/SEOHead.tsx`. | **react-helmet-async is NOT installed** in Panama. Panama tracks SEO via `RouteTracker.tsx` + static HTML files. | Either `npm i react-helmet-async` to port SEOHead, OR strip SEOHead and set `<title>`/meta another way. SEOHead is OPTIONAL for the visual port; decide before importing it. |
| Routing | Marketing pages wrapped by `src/components/layout/Layout.tsx` (Navbar + Outlet + Footer + StickyWhatsApp). | `<Layout>` wraps ONLY app/CRM routes (`/dashboard`, `/clients`...). Marketing routes (`/`, `/servicios`...) render standalone (no shared Layout). | StickyWhatsApp in Bustan is mounted in Layout; in Panama, marketing pages have no Layout, so mount StickyWhatsApp per-marketing-page (Bustan itself also re-mounts it inside `FactoryBillAssessmentPage` / `ResortSolarAssessmentPage`). |
| Fonts | Google Fonts in `index.html`: `Instrument Serif` (serif/display), `DM Sans` (sans), `Noto Sans Hebrew`. `--font-serif`/`--font-sans` tokens. | `Inter` only. | Add `Instrument Serif` + `DM Sans` `<link>` to Panama `index.html` if you want the exact premium typography; otherwise `font-serif` classes will fall back. |

---

## 1. HomePage.tsx — section-by-section map

Source: `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/pages/HomePage.tsx` (1140 lines).

### Shared module-level helpers (top of file)
- **Image path constants** (lines ~36-44): all under `/assets/images/*.jpg` with intrinsic `width`/`height` (CLS prevention). e.g. `heroImg='/assets/images/strategy-01-aerial.jpg'` (1024×574), `longiImg`, `huaweiImg`, `villaImg`, `resortImg`, `installImg`, `happyImg`, `monitorImg`. Hero JPEG preloaded in `index.html` for LCP.
- **`projectImages`** array: 6 `{src,width,height}` mapped to the 6 project items.
- **Local extension types** for translation objects that are optional: `HomeHeroExtra{trustLine?}`, `HomeServicesExtra{batteryStorage?}`, `ScrollAnimationCopy{sectionTag?,title?,subtitle?}`, `ProcessExtra{statsLine?}`, `ProjectExtra{type?}`, `ProjectsExtra{viewAll?}`, `FAQCopy{items?}`, `CTAExtra{ctaWhatsapp?,ctaCall?,urgency?}`, `GatewayCard`, `GatewayCopy`.
- **Animation variants (framer-motion `Variants`):**
  - `fadeUp` = `{ hidden:{opacity:0,y:32}, visible:{opacity:1,y:0,transition:{duration:0.7, ease:[0.22,1,0.36,1]}} }`
  - `staggerContainer` = `{ hidden:{}, visible:{transition:{staggerChildren:0.12}} }`
  - `heroStagger` = `{ hidden:{}, visible:{transition:{staggerChildren:0.08}} }`
  - `revealViewport` = `{ once:true, margin:'-80px' }` (used as `viewport=` for below-fold reveals)
  - `cardHover` class = `'transition-all duration-[var(--duration-fast)] ease-out-soft hover:-translate-y-0.5 hover:shadow-lift'`
  - `arrowSlide` class = `'transition-transform duration-[var(--duration-fast)] ease-out-soft group-hover:translate-x-1'`
- **`useCountUp(target, duration=1800, started=false)`**: rAF cubic-ease-out counter for stats. Returns animated int.
- **Imports consumed:** `useTranslation`, `useLanguage` (i18n); `Button`, `SectionHeader` (ui); `SEOHead`, `breadcrumbSchema`, `homeBreadcrumb`, `faqSchema` (seo); lucide icons: `Sun, Zap, Shield, TrendingUp, ChevronDown, ArrowRight, Phone, Building2, Home, Battery, MapPin, ChevronRight, Factory, CheckCircle2`. `SolarInstallationScroll` is `lazy()`-imported and wrapped in `<Suspense>`.

### Page assembly (`export default HomePage`, lines ~1066-1139)
Wrapper: `<div className="bustan-home min-h-screen" style={{background:'var(--bustan-paper)', color:'var(--bustan-ink)'}}>`.
Render order (top→bottom):
```
<SEOHead title/description/path="/" lang schema={schemas} />
HeroSection · GatewaySplit · StatsBar · ServicesSection · ScrollAnimationSection
WhySection · ProcessSection · ProjectsSection · FAQSection · CTASection · PartnersBar
```
`schemas = [ breadcrumbSchema(homeBreadcrumb(lang)), howToSchema(), ...(faqItems.length ? [faqSchema(faqItems)] : []) ]`.
Also runs an admin auto-redirect effect (`getSession`/`isAdmin` from `../lib/admin-auth`) — **Bustan-specific, skip for Panama** (Panama has its own auth).

### HeroSection (lines ~115-222)
- **Renders:** full-bleed aerial bg `<img>` (`fetchPriority="high"`, intrinsic dims) + dark grove gradient overlay (`bg-gradient-to-b from-grove/85 via-grove/68 via-60% to-sand/92`) + a 4%-opacity grid overlay (inline `backgroundImage` of crossing linear-gradients, `64px 64px`). Centered content: pill badge (`Sun` icon + `t.home.hero.badge`), serif `<h1>` (`text-display-md→xl`) with `{title}` + `<br/>` + `<span className="text-gold">{titleAccent}</span>`, subtitle `<p>`, then 2 CTA buttons. Bottom: animated "Scroll" indicator with bouncing `ChevronDown`.
- **Layout skeleton:** `<section class="bustan-home-hero relative min-h-[86vh] flex flex-col items-center justify-center overflow-hidden px-0 pt-20 pb-16">` → abs bg layer → grid overlay → `motion.div` content (`variants={heroStagger} initial="hidden" animate="visible"`, each child `variants={fadeUp}`) → scroll indicator (`motion.div`, infinite `y:[0,8,0]`).
- **Motion:** hero animates **on mount** (`animate="visible"`, never scroll-gated) — above the fold. `heroStagger` parent + `fadeUp` children.
- **i18n keys:** `home.hero.{badge,title,titleAccent,subtitle,ctaPrimary,ctaSecondary}`.
- **Primitives/props:** `Button variant="primary" size="lg" to={langPath('/contact')}` (with trailing `ArrowRight` + `arrowSlide`); `Button variant="whatsapp" size="lg" href="https://wa.me/66946692011" target="_blank"`.
- **Port note:** swap WhatsApp to `wa.me/50765831822`; `to={'/contacto'}` (no langPath); colors `grove/gold/shell/sand` must be defined.

### GatewaySplit (lines ~226-306) — route factory/C&I vs villa/home buyers
- **Renders:** small section sitting on a `-mt-12 md:-mt-16` negative margin so it overlaps the hero bottom. Centered kicker `g.tag` + serif `g.title`. Then a 2-col grid of two `<Link>` cards built from `g.factory` and `g.villa`. Each card: icon tile, `<h3>` title, body `<p>`, a `<ul>` of `points` (each a chip with `CheckCircle2`), and a faux-button CTA span with `ArrowRight`.
- **Card style map (inline objects, not from i18n):** factory card = `bg-grove text-shell`, icon `Factory`, cta `bg-gold text-grove`, link `to=langPath('/factory-electricity-bill-solar-assessment')`. villa card = `bg-white text-grove border border-grove/12`, icon `Home`, cta `bg-ocean text-shell`, link `to=langPath('/services/residential')`.
- **Layout skeleton:** `<section class="relative z-20 -mt-12 px-6 pb-6 md:-mt-16"> <div class="mx-auto max-w-6xl"> header + <div class="grid gap-5 md:grid-cols-2"> {cards.map → <Link class="group flex flex-col rounded-[2rem] p-7 shadow-[0_24px_70px_rgba(36,70,62,0.16)] hover:-translate-y-1">}`.
- **Motion:** no framer-motion variants; pure CSS `transition hover:-translate-y-1` + `group-hover:gap-3` on the CTA.
- **i18n keys:** `home.gateway.{tag,title}`, `home.gateway.factory.{title,body,points[],cta}`, `home.gateway.villa.{title,body,points[],cta}`. Guarded: `if (!g) return null`.
- **Port note:** point links at Panama Spanish routes (`/servicios#residencial`, or a Panama bill-assessment LP if one exists; else `/contacto`). Translate `tag/title/points/cta` to ES.

### StatsBar (lines ~311-388)
- **Renders:** full-width band with top/bottom borders; 2-col (mobile) / 4-col (desktop) grid of `StatItem`s, each = icon + `useCountUp` animated number + suffix + label. Optional trust line below.
- **`StatItem`** props: `{ target:number, suffix:string, label:string, started:boolean, icon:ReactNode }` → `useCountUp(target,1800,started)`.
- **Layout skeleton:** `<div ref class="relative overflow-hidden border-y border-grove/12 bg-shell/64"> <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-grove/14"> {stats.map → StatItem}</div>` + optional `hero.trustLine` paragraph.
- **Motion/trigger:** `useInView(ref, {once:true, margin:'0px 0px -80px 0px'})` to start counters; PLUS a `forceStart` fallback (`setTimeout 1200ms`) so paid traffic that converts without scrolling still animates. `started = inView || forceStart`.
- **i18n keys:** `home.stats.{installations,installed,savings,experience}` — each is `{ value:number, suffix:string, label:string }`. Plus optional `home.hero.trustLine`.
- **icons array:** `[Home, Zap, TrendingUp, MapPin]`.
- **Port note:** stats `value` are NUMBERS in the i18n object (not strings) — JSON in Panama supports numbers fine. Keep that shape: `"installations": { "value": 8, "suffix": "+", "label": "Años de experiencia" }`.

### ServicesSection (lines ~393-518) — 4 image cards
- **Renders:** `SectionHeader` then a 2-col grid of 4 service cards. Each card: image (h-48, `group-hover:scale-105`) + dark gradient overlay + glass icon badge (top-left) + content block (`bg-shell/82 backdrop-blur-xl`) with title, description, a `<ul>` of 3 bullets (each `ChevronRight` + text), and a bottom `<Link>` CTA with `arrowSlide` arrow.
- **`services` array** (in-component): 4 objects `{icon, title, description, cta, href, image, imgWidth, imgHeight, altText, bullets[3]}`. Residential/Commercial/SolarFarm read from i18n; Battery uses `servicesCopy.batteryStorage?.x ?? fallback`. `href=langPath('/services#residential' | '#commercial' | '#farm' | '#battery')`.
- **Layout skeleton:** `<section class="py-24 px-6" id="services"> <div class="max-w-6xl mx-auto"> SectionHeader + <motion.div class="grid grid-cols-1 md:grid-cols-2 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={revealViewport}> {services.map → <motion.div variants={fadeUp}> card }`.
- **Motion:** `staggerContainer` + `fadeUp` per card, `whileInView` gated by `revealViewport`.
- **i18n keys:** `home.services.{sectionTag, residential.{title,description,cta}, commercial.{...}, solarFarm.{...}, batteryStorage.{title,description,cta}}`. Bullets + altText are hardcoded English in source (translate/move to i18n for ES).
- **Port note:** title `"Solar Energy Services on Ko Phangan"` and the bullets are HARDCODED in the source, not i18n — for Panama, add them to i18n in Spanish.

### ScrollAnimationSection (lines ~523-556) — wraps SolarInstallationScroll
- **Renders:** a header block (`bg-gradient-to-b from-sand to-shell`) with `SectionHeader` (tag/title/subtitle, all from `scrollAnimation` copy with fallbacks), then `<Suspense fallback={spinner}><SolarInstallationScroll/></Suspense>`, then a `h-24 bg-gradient-to-b from-shell to-sand` transition strip.
- **i18n keys:** `home.scrollAnimation.{sectionTag,title,subtitle}` (all optional, hardcoded EN fallbacks present).
- **Port note:** see §2 — the scroll component needs the `/frames-smooth/*` assets + `manifest.json` copied into Panama `public/`, and it reads `--bustan-*` CSS vars directly.

### WhySection (lines ~568-630) — split image/features layout
- **Renders:** `SectionHeader` then a 2-col grid: LEFT = image card (`installImg`, h-400/500, gradient overlay, absolute "8+ Years..." badge). RIGHT = stacked feature cards from `t.home.why.items`, each = icon tile (`whyIcons[i]`) + title + description.
- **Layout skeleton:** `<section class="py-24 px-6 bg-gradient-to-b from-mist/35 to-transparent to-60%">` → grid → left `motion.div` (`initial={{opacity:0,x:-30}} whileInView={{opacity:1,x:0}} viewport={revealViewport} transition duration:0.7 ease:[0.22,1,0.36,1]`) → right `motion.div` (`staggerContainer`) with `fadeUp` children.
- **Motion:** left slides in from x:-30; right staggers.
- **i18n keys:** `home.why.{sectionTag,title}` + `home.why.items[]` (each `{title,description}`). `whyIcons = [MapPin, Shield, Sun, Zap]`.
- **Port note:** "8+ Years Serving Ko Phangan" badge is hardcoded — translate to ES Panama equivalent.

### ProcessSection (lines ~637-711) — 4-step timeline
- **Renders:** `SectionHeader` (tag/title/subtitle) then a 4-col grid of numbered steps with a horizontal connector line (desktop) / vertical (mobile). Each step: circle with `stepNums[i]` ('01'..'04') + title + description. Optional `statsLine`, then a centered primary `Button`.
- **Layout skeleton:** `<section class="py-24 px-6" id="process">` → `<motion.div class="mt-16 grid ... md:grid-cols-4 relative" variants={staggerContainer} ...>` with absolute connector `<div class="hidden md:block absolute top-[34px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r ...">`. Each step `motion.div` has its own per-index variant `{hidden:{opacity:0,y:28}, visible:{opacity:1,y:0,transition:{duration:0.6, delay:i*0.14, ease:[0.22,1,0.36,1]}}}`.
- **i18n keys:** `home.process.{sectionTag,title,subtitle,cta}` + `home.process.steps[]` (each `{title,description}`) + optional `home.process.statsLine`. `stepNums = ['01','02','03','04']`. `Button to=langPath('/contact')`.

### ProjectsSection (lines ~716-797) — 6-item gallery
- **Renders:** `SectionHeader` then 3-col grid of 6 project cards (image cycles through `projectImages[i % 6]`). Each card: image (h-56, hover scale) + gradient + "Site-modeled" gold badge (top-right) + optional type badge (top-left) + details block (`bg-shell/88 backdrop-blur-lg`) with name, location (`MapPin`), and size (ocean). Optional "View All" ghost button.
- **Layout skeleton:** `<section class="py-24 px-6" id="work">` → `<motion.div class="grid ... md:grid-cols-3 gap-6" variants={staggerContainer} ...>` → items `motion.div variants={fadeUp}`.
- **i18n keys:** `home.projects.{sectionTag,title,viewAll}` + `home.projects.items[]` (each `{name,location,size,savings,type}`). `Button variant="ghost" to=langPath('/projects')`.
- **Port note:** "Site-modeled" badge hardcoded; translate. Panama route `/proyectos`.

### FAQSection (lines ~802-888) — accordion
- **`FAQItem`** props: `{question, answer, isOpen, onToggle}` → card with toggle button (rotating `+`/`×` svg via `motion.div animate={{rotate: isOpen?45:0}}`) and `AnimatePresence` height/opacity reveal of answer.
- **`FAQSection`:** `SectionHeader` + column of `FAQItem`s, single-open accordion via `openIndex` state (default 0). `if (!faqData?.items?.length) return null`.
- **Layout skeleton:** `<section class="py-24 px-6" id="faq"> <div class="max-w-3xl mx-auto"> SectionHeader + <div class="flex flex-col gap-3"> {items.map → FAQItem}`.
- **Motion:** `AnimatePresence` + `initial/animate/exit {height,opacity}` for the answer; rotate for the icon.
- **i18n keys:** `home.faq.{sectionTag,title}` + `home.faq.items[]` (each `{question,answer}`). These same items feed `faqSchema()`.

### CTASection (lines ~893-964) — final conversion card
- **Renders:** a centered glass card (`bg-shell/82 backdrop-blur-2xl rounded-card shadow-lift`) with a radial lagoon glow, `SectionHeader`, and 3 CTAs: primary (`to=langPath('/contact')`), whatsapp (`href=wa.me/66946692011`), secondary call (`href=tel:+66946692011`, `Phone` icon). Optional urgency line.
- **i18n keys:** `home.cta.{sectionTag,title,subtitle,ctaPrimary,ctaWhatsapp,ctaCall,urgency}` (last 4 optional via `CTAExtra`).
- **Port note:** phone/WhatsApp → Panama number `50765831822` / `tel:+50765831822`.

### PartnersBar (lines ~969-1021) — trust logos
- **Renders:** kicker title + a row of partner logos (LONGi img, Huawei img, PEA text fallback) at low opacity, each with name + subtitle, plus a local-SEO line.
- **i18n keys:** `home.partners.{title}` + `home.partners.items[]` (each `{name,subtitle}`). `partnerImages = [longi, huawei, null]`.
- **Port note:** "Serving Ko Phangan..." line + PEA hardcoded — replace with Panama (e.g. "ETESA / distribuidoras de Panamá", "Atendemos Ciudad de Panamá, Azuero...").

### howToSchema() (lines ~1026-1061)
Local helper returning a `schema.org/HowTo` object (4 steps). Bustan-specific copy; rewrite for Panama or drop if not porting SEOHead.

---

## 2. SolarInstallationScroll.tsx — frame-scroll mechanics

Source: `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/components/SolarInstallationScroll.tsx` (420 lines). Default export, NO props (fully self-contained). Imports only from `framer-motion`: `motion, useScroll, useTransform, useSpring, AnimatePresence, useReducedMotion`.

### HOUSE_TYPES (lines 11-19) — `as const`
7 entries, each `{ id, label, labelTh }`:
`concrete` (Concrete Roof), `villa` (Tile Roof Villa), `tropical` (Tropical Wood), `factory` (Factory Roof), `largeroof` (Large Roof), `field` (Solar Field), `parking` (Parking Canopy).
`type HouseType = (typeof HOUSE_TYPES)[number]['id']`.
NOTE: tabs render only EN `label` in the UI (labelTh defined but unused in render). For Panama, add `labelEs` and use it.

### BEATS + BEAT_COPY (lines 23-89) — 6 narrative beats
- `BEATS` (`as const`, 6 items): `{ label, description, side:'left'|'right', until:number }`. `until` thresholds: `0.12, 0.27, 0.45, 0.62, 0.78, 1`. `side` alternates left/right for the floating beat card.
- `BEAT_COPY` keyed by `roof` | `field` | `parking` — three copy variants of the 6 beats (ground-mount/parking tell different stories). `beatKind(type)`: `field→'field'`, `parking→'parking'`, else `'roof'`.
- For Panama: translate all beat labels/descriptions to ES (3 variants × 6 beats), and the `BEATS[].side` layout can stay.

### Manifest shape + frame paths (lines 91-109) — **KEY FOR ASSETS**
- `type Manifest = { ext: string } & Record<HouseType, number>` — i.e. `ext` plus a frame-count per house type.
- **Actual `public/frames-smooth/manifest.json`:**
  ```json
  {"ext":"webp","concrete":123,"villa":123,"tropical":123,"factory":123,"largeroof":123,"field":123,"parking":123}
  ```
  → 123 frames each, webp.
- `LEGACY: Manifest` fallback (lines 95-104): `{ ext:'jpg', concrete:63, villa:63, tropical:63, factory:0, largeroof:0, field:0, parking:0 }`. Used if the smooth manifest fetch fails. New types (factory/largeroof/field/parking) are 0 in legacy so they only appear once the smooth manifest reports >0.
- **`framePath(type, frame, ext)`** (lines 106-109):
  - if `ext === 'webp'` → dir `frames-smooth`, else dir `frames`.
  - path = `` `/${dir}/${type}/${String(frame).padStart(3,'0')}.${ext}` ``
  - **Smooth pattern:** `/frames-smooth/{type}/001.webp` … `/frames-smooth/{type}/123.webp` (3-digit zero-padded, frames numbered 1..count).
  - **Legacy pattern:** `/frames/{type}/001.jpg` … `063.jpg`.
- **Disk reality (source `public/`):** `frames-smooth/{concrete,villa,tropical}` have exactly 123 `.webp`; `{factory,largeroof,field,parking}` have MORE files on disk (308/246/246/246) but the manifest count (123) is what the component reads for scroll mapping. Legacy `frames/` dir also exists with the older sets. **For Panama: copy `public/frames-smooth/` (incl. `manifest.json`) — ~47 MB total — and optionally `public/frames/` for the JPEG fallback.**

### Loading strategy (lines 111-162)
- `loadOrder(count)`: coarse pass (every 4th frame, `i%4===1`) then fine fill → canvas always has a nearby frame early.
- `useFrameSequence(type, manifest)`: keeps a `useRef` cache keyed `` `${type}-${manifest.ext}` ``, loads with `CONCURRENCY=8` using `new Image()` + `img.decode()`, `bump`s a state counter as frames decode. Returns `{ frames, count, loadedCount }`.
- `nearestLoaded(frames, idx)`: finds the closest decoded frame to `idx` so scrubbing never blanks.

### Canvas / scroll mechanics (component body, lines 174-419)
- State/refs: `activeType` (default `'concrete'`), `manifest` (default LEGACY, replaced by fetch of `/frames-smooth/manifest.json` on mount), `beat`, `drawnRef`, `everDrawnRef`, `reducedMotion = useReducedMotion()`.
- `useScroll({ target: containerRef, offset:['start start','end end'] })` → `scrollYProgress`.
- `smoothProgress = useSpring(scrollYProgress, { stiffness:120, damping:28, restDelta:0.0001 })`. `progressSource = reducedMotion ? scrollYProgress : smoothProgress`.
- `frameIndex = useTransform(progressSource, [0,1], [0, count-1])`.
- `drawFrame(idx)`: picks `nearestLoaded`, sets canvas `width/height` to image natural size, `ctx.drawImage`. Kept in `drawFrameRef` ref (so the long-lived scroll subscription never goes stale after a house-type switch — documented bug fix at lines 226-242).
- Scroll→frame: subscribe once to `frameIndex.on('change')`, round + clamp, call `drawFrameRef.current(idx)`.
- Scroll→beat: subscribe to `progressSource.on('change')`, `BEATS.findIndex(s => v <= s.until)`.
- First-paint / type-switch: redraw on `loadedCount` change. Preload inactive types after active fully decoded.
- `availableTypes`: only house types where `manifest[id] > 0` (keeps dormant types hidden).
- **Container = `<section ref={containerRef} class="relative" style={{height:'500vh'}}>`** with inner `sticky top-0 h-screen` stage. **The 500vh height is what drives the scroll length.**

### Markup / styling it produces
- Sticky stage `bg-[var(--bustan-shell)]`.
- Top: house-type tab pills. Active = `bg-[var(--bustan-lagoon)] text-[var(--bustan-shell)]`; inactive = `bg-[rgba(216,236,232,0.72)]` (mist). Spinner shown while switching.
- Desktop: vertical progress rail (`bg-[var(--bustan-lagoon)]` fill) left side.
- Center: `<canvas class="w-full h-full object-contain">` inside `max-w-5xl aspect-video`.
- Floating beat card (desktop, alternates left/right by `active.side`): white/78 glass, mono "01 / 06" counter (`--bustan-lagoon`), title, description.
- Mobile beat card docked bottom. First-visit shimmer bar. Scroll hint at beat 0.
- **CSS vars it reads directly:** `--bustan-shell`, `--bustan-lagoon`, `--bustan-ink`, plus literal `rgba(216,236,232,*)` (mist), `rgba(39,52,47,*)` (ink), `rgba(36,70,62,*)` (grove). **Panama must define `--bustan-shell/--bustan-lagoon/--bustan-ink` (in `:root`) or these classes render transparent/black.**

### Props/assets needed to port
- NO props. Self-contained. Needs:
  1. `framer-motion` (Panama has `^10` — OK).
  2. `public/frames-smooth/manifest.json` + `public/frames-smooth/{type}/NNN.webp` (and optionally `public/frames/{type}/NNN.jpg` for fallback).
  3. CSS vars `--bustan-shell`, `--bustan-lagoon`, `--bustan-ink` in Panama `:root`.
- For Panama you may rename/relabel house types but the `manifest.json` keys MUST match the `HOUSE_TYPES[].id`s used.

---

## 3. UI primitives + SEO helpers (paths + public APIs)

### Button — `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/components/ui/Button.tsx`
- Named export `Button`. Props:
  ```ts
  variant?: 'primary'|'secondary'|'ghost'|'whatsapp'   // default 'primary'
  size?: 'sm'|'md'|'lg'                                  // default 'md'
  children: ReactNode
  className?: string
  onClick?: () => void
  to?: string        // internal SPA route → renders react-router <Link>
  href?: string      // external (https/mailto/tel) → renders <a>
  disabled?: boolean
  type?: 'button'|'submit'|'reset'
  target?: string
  rel?: string
  icon?: ReactNode   // leading icon; 'whatsapp' defaults to MessageCircle, pass icon={null} to suppress
  ```
- Renders `<Link>` if `to`, `<a>` if `href`, else `<button>`. Disabled link → `<a aria-disabled tabIndex={-1}>`.
- Variant classes use Bustan tokens: `bg-[var(--bustan-grove)] text-[var(--bustan-shell)]`, hover `--bustan-canopy`, `--bustan-lagoon` focus ring, `rounded-button`, `ease-out-soft`, `--duration-fast`, `shadow-lift`. **Port needs those tokens defined.** `whatsapp` variant = `bg-[#25D366] text-white`.
- Dep: `react-router-dom` `Link` (Panama has it), `lucide-react` `MessageCircle` (Panama has it).

### SectionHeader — `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/components/ui/SectionHeader.tsx`
- Named export `SectionHeader`. Props: `{ tag?:string, title:string, subtitle?:ReactNode, align?:'center'|'left' (default 'center'), className?:string }`.
- Renders a `motion.div` (`initial{opacity:0,y:24} whileInView{opacity:1,y:0} viewport{once:true,margin:'-80px'} transition duration:0.6 ease:[0.22,1,0.36,1]`) → optional kicker `<p>` (`text-[var(--bustan-lagoon)]`) + serif `<h2>` (`text-[2.5rem] md:text-[3.5rem] text-ink`) + optional subtitle `<p>` (`text-ink/74`).
- Dep: `framer-motion`. Tokens: `--bustan-lagoon`, `text-ink`, `font-serif`.

### SEOHead — `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/components/seo/SEOHead.tsx`
- Named export `SEOHead`. Props:
  ```ts
  title: string         // appended " | Bustan Energy"
  description: string
  path: string          // path WITHOUT lang prefix, e.g. "/" or "/services"
  lang: Lang            // 'en'|'th'|'he'
  schema?: object | object[]
  ogImage?: string      // default `${BASE_URL}/assets/images/og-default.jpg`
  isArticle?: boolean   // default false
  robots?: string       // default 'index, follow'
  ```
- Uses `react-helmet-async` `<Helmet>`. Emits title/desc/robots, canonical + hreflang (en/th/x-default), OG + Twitter, and JSON-LD (always merges `localBusinessSchema(lang)`; multiple schemas → `@graph`).
- `BASE_URL = 'https://bustan-energy.com'`. **Bustan-specific brand/URL/locale logic — heavily rewrite for Panama (es/en, solaris-panama.com) AND `npm i react-helmet-async` (not in Panama).**

### Schema helpers — `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/components/seo/schemas.ts`
- `BASE_URL` (exported) = `'https://bustan-energy.com'`.
- Exported fns: `localBusinessSchema(lang)`, `websiteSchema()`, `serviceSchema(lang)`, `faqSchema(faqs: ReadonlyArray<{question,answer}>)`, `articleSchema(input: ArticleSchemaInput)`, `breadcrumbSchema(items: BreadcrumbItem[])`, `homeBreadcrumb(lang)`, `pageBreadcrumb(lang, pageName, path)`, `organizationSchema()`, `webPageSchema({name,description,url,lang})`.
- Exported consts: `PRICING_FAQS_EN`, `PRICING_FAQS_TH` (rewrite to `PRICING_FAQS_ES`).
- Types: `BreadcrumbItem{name,url}`, `ArticleSchemaInput{title,description,slug,datePublished,dateModified?,lang,imageUrl?}`.
- HomePage consumes: `breadcrumbSchema`, `homeBreadcrumb`, `faqSchema`. **All copy/coords/phone are Bustan/Thailand — rewrite for Panama.**

---

## 4. StickyWhatsApp.tsx — segment-aware floating CTA

Source: `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/components/layout/StickyWhatsApp.tsx` (96 lines). Named + default export `StickyWhatsApp`. No props.

- **Number:** `const WHATSAPP_NUMBER = '66946692011'` (single source of truth). **→ Panama: `50765831822`.**
- **Segments:** `type Segment = 'factory'|'villa'|'default'`. `segmentFor(pathname)` regex on lowercased path:
  - `/(factory|factories|commercial|industrial|resort|ppa|epc|bill)/` → `'factory'`
  - `/(villa|home|residential|house|battery)/` → `'villa'`
  - else `'default'`.
  - **→ Panama: adapt regex to Spanish slugs (`comercial|industrial|fabrica|empresa|resort|hotel|factura` → factory; `residencial|casa|hogar|villa|bateria` → villa).**
- **`LABELS`** record: `Segment → { en, th, he }` strings. **→ add/replace with `es`.**
- **`PREFILL`** record: `Segment → string` WhatsApp prefill message (EN). **→ Spanish prefills.**
- **Hide logic:** `if (/^\/(admin|crm|platform|preview-scroll)/.test(pathname)) return null`. **→ Panama: hide on app routes `/dashboard|/clients|/projects|/proposals|/calendar|/monitoring|/settings|/crm-leads|/scanner|...` (anything under `<Layout>`).**
- **Render:** fixed `bottom-5 right-5 z-50` `<a target="_blank">`, `bg-[#25D366]`, 56px tap icon with `animate-ping` halo + inline WhatsApp SVG, label that expands on hover (`group-hover:max-w-[220px]`). `href = wa.me/${NUMBER}?text=${encodeURIComponent(PREFILL[segment])}`.
- **Analytics:** `onClick` fires `window.posthog?.capture?.('whatsapp_click', {segment, path})` (guarded try/catch). Panama uses its own analytics (`RouteTracker`/gtag) — adapt or keep PostHog-guarded.
- **Deps:** `useLocation` (react-router), `useLanguage` (Bustan i18n → in Panama use `i18n.language` from react-i18next).
- **Mount points (source):** primarily in `src/components/layout/Layout.tsx` line 28; also re-mounted inside `src/pages/FactoryBillAssessmentPage.tsx` and `src/pages/ResortSolarAssessmentPage.tsx` (those LPs render outside / alongside Layout). **→ Panama: mount per marketing page (HomePage, ServiciosPage, etc.) since Panama marketing routes are NOT wrapped by `<Layout>`.**

---

## 5. Theme tokens (light premium look)

Source of truth: `/Users/kanieltordjman/Desktop/projects/solar/bustan/bustan-energy/src/index.css` (Tailwind v4 `@theme` block + `:root`). **No tailwind.config file.** Panama is Tailwind v3 → port these into `tailwind.config.ts` `theme.extend` (colors/fontFamily/boxShadow/borderRadius) AND mirror the `--bustan-*`/`--duration-*` CSS vars into Panama `src/index.css :root` (the scroll component + Button read raw `var(--bustan-*)`).

### Colors (`@theme` → become Tailwind color utilities `text-ocean`, `bg-grove`, etc.)
```
--color-ocean:        #006f6b   (lagoon/teal — primary accent, links, CTAs)
--color-ocean-light:  #008f8a
--color-gold:         #f2b84b   (sun — highlights, badges)
--color-gold-light:   #ffd27a
--color-green:        #24463e
--color-green-light:  #2f5d52
--color-sand:         #f4ead8   (paper bg)
--color-dark:         #27342f
--color-navy:         #24463e
--color-ink:          #27342f   (body text → text-ink, text-ink/72 etc.)
--color-shell:        #fff4e2   (card/surface bg → bg-shell/82)
--color-grove:        #24463e   (deep green — borders, dark cards → border-grove/14, bg-grove)
--color-mist:         #d8ece8   (pale mint)
```

### Fonts
```
--font-serif: 'Instrument Serif', serif      (display/headlines → font-serif)
--font-sans:  'DM Sans', 'Noto Sans Hebrew', system-ui, ...   (body → font-sans)
```
Loaded via `<link>` in `index.html` (DM Sans + Instrument Serif ital + Noto Sans Hebrew). **Panama uses Inter — add these font links or accept fallback.**

### Type scale (→ `text-display-*` utilities)
```
--text-display-xl: 4.5rem
--text-display-lg: 3.5rem
--text-display-md: 2.5rem
--text-display-sm: 1.875rem
```

### Shadows (→ `shadow-soft|lift|float`)
```
--shadow-soft:  0 2px 12px  rgba(39,52,47,0.07)
--shadow-lift:  0 8px 28px  rgba(39,52,47,0.12)
--shadow-float: 0 20px 50px rgba(39,52,47,0.18)
```

### Radii (→ `rounded-card`, `rounded-button`)
```
--radius-card:   1.25rem
--radius-button: 9999px
```

### Motion
```
--ease-out-soft: cubic-bezier(0.22,1,0.36,1)   (→ ease-out-soft)
```

### `:root` runtime CSS vars (read directly by Button + SolarInstallationScroll)
```
--bustan-ink:           #27342f
--bustan-grove:         #24463e
--bustan-canopy:        #2f5d52
--bustan-lagoon:        #006f6b
--bustan-lagoon-bright: #008f8a
--bustan-sun:           #f2b84b
--bustan-papaya:        #ff6b4a
--bustan-paper:         #f4ead8
--bustan-shell:         #fff4e2
--bustan-mist:          #d8ece8
--duration-fast: 200ms   --duration-base: 400ms   --duration-slow: 700ms
```

### Page-level helper classes
- `.bustan-home` — layered gradient bg (mint + gold tint over paper). HomePage wrapper.
- `html { scroll-behavior: smooth }`; body bg `--bustan-paper`, color `--bustan-ink`.
- `.bustan-admin-main` / `.bustan-colliers` — light-scope CONVERSION layer that overrides dark `text-white`/`bg-white/*`/`border-white/*` utilities so shared dark components render on the light brand. **This is the bridge pattern Panama can reuse** if it wants to drop the premium light marketing pages into a repo whose CRM is dark: scope marketing pages under a wrapper class and override. (Panama's CRM is dark `space-950`; marketing pages must NOT change the dark dashboard tokens — keep all light theme additive/scoped.)

### Panama-specific WARNING
Panama's `tailwind.config.ts` already defines `accent #00ffcc`, `purple`, `space-*`, `text.primary/secondary/muted`, `glass-*`, `glow-*` shadows for the DARK dashboard. Adding Bustan tokens is purely ADDITIVE (new color keys `ocean/gold/grove/shell/mist/ink/sand`, new `boxShadow` `soft/lift/float`, new `borderRadius` `card/button`, `fontFamily.serif`). Do NOT remove or rename the existing dark tokens — the CRM/dashboard depends on them.
