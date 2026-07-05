# Visual Design Audit — solaris-panama.com (2026-07-05)

Method: headless Chrome via CDP, true mobile emulation 390×844 (dsf 2) + desktop 1440×900, full-page segment captures of `/`, `/servicios.html`, `/contacto.html`, `/towns/solar-pedasi.html`. Verified `scrollWidth == clientWidth` on all pages (no horizontal overflow — naive `--window-size=390` screenshots are wrong: Chrome enforces a 500px minimum window; use CDP `Emulation.setDeviceMetricsOverride`).

## Scores & per-page summary

| Page | Score | Works | Doesn't |
|---|---|---|---|
| Home | 8/10 | Above-the-fold mobile is excellent (badge, H1 value prop, Ley 417, dual CTAs, sticky bottom CTA bar). Full conversion structure: trust bar, benefits, process, calculator, testimonials, FAQ, form. Single-column mobile form, labels, targets ≥44px. | Hero image renders as distorted 433×900 crop; project "photos" are placeholder icons; footer Guías column orphan-wraps; calculator numbers render tiny/gray with `$` glyph collision. |
| Servicios | 7.5/10 | Strong service cards (dark header + checklist + per-card CTA), good process + tech sections, WhatsApp CTA w/ number. | No mobile nav (no hamburger); different logo (sun icon) than home; footer differs from home. |
| Contacto | 8/10 | Clean single-column form, contact info cards, WhatsApp banner, zone chips. | Map is an empty dashed placeholder; zone chips aren't links; no mobile nav. |
| Town (Pedasí) | 7/10 | Great localized copy, own calculator, testimonial, internal links to sibling towns/guides. | Brand says "Solaris Energy" (not Solaris Panamá), text-only header, no header CTA on mobile; emoji icons (☀️💰🏡 / 💬📋 in buttons) clash with home's line-icon system; same calculator `$` bug. |

## P0 — hurts conversions / broken (fix on homepage next)

1. **Hero image distorted + eats ~600px of prime scroll** — `public/index.html`. `<img src="/img/paneles-techo-chitre.webp" ... width="1200" height="900">` (~line 712): the `height="900"` attribute wins over CSS `aspect-ratio: 4/3` (computed height stays 900px → 433×900 portrait crop on desktop, ~350×900 on mobile; trust bar + benefits pushed 2+ screens down).
   **Fix (CSS, ~line 372):** `.hero-image-card img { width: 100%; height: auto; border-radius: var(--radius-md); aspect-ratio: 4/3; object-fit: cover; }` (add `height: auto`).
2. **Project cards have no photos** — `public/index.html` `#proyectos`, four `.project-card-img` divs (~lines 826/848/870/892) show faint SVG icons on pale green. Section headline promises "Instalaciones que hablan por sí solas" + hero claims "+150 instalaciones" — placeholder icons actively undermine trust.
   **Fix:** put real installation photos (`<img loading="lazy" width/height set, webp ~800×600, object-fit: cover>`) into `.project-card-img`; keep category chip overlay. If no real photos exist yet, use the existing `/img/*.webp` assets (check `public/img/` first per repo rules) rather than icons.
3. **Footer "Guías" column orphan-wraps (desktop)** — `public/index.html` footer. `.footer-grid` is `1.5fr 1fr 1fr 1fr` at ≥900px (line 597) but contains **5** `.footer-col` children → "Guías" drops to a lone second row under the brand col.
   **Fix (CSS):** `@media (min-width: 900px) { .footer-grid { grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr; } }` (or move the 5 Guías links into "Recursos" and delete the column).
4. **Calculator output typography broken** — `public/index.html` (~lines 473–474, 931, 938) and same template in `towns/*.html`. `.calc-slider-value span` styles (1rem gray DM Sans) also hit `#roofValue`/`#billValue`, so the *values* render tiny+gray and the 2rem serif `$` visually collides with "400".
   **Fix:** change unit spans to `<span class="unit">m²</span>` / `<span class="unit">/mes</span>`, scope CSS to `.calc-slider-value .unit`, and move `$` inside the value styling: `<div class="calc-slider-value">$<span id="billValue">400</span> <span class="unit">/mes</span></div>` with `#roofValue, #billValue { font: inherit; }` behavior restored (values inherit the 2rem Playfair green).

## P1 — polish

5. **Mobile header wraps** (home, 390px): "Solaris Panamá" wordmark + `.nav-cta` both wrap to 2 lines. Fix: at ≤480px hide the text wordmark (logo img already reads SOLARIS) and set `.nav-cta { padding: 0.5rem 1rem; white-space: nowrap; font-size: 0.85rem; }`.
6. **Double WhatsApp on mobile** (home): `.whatsapp-float` (60px FAB) floats just above `.sticky-cta` which already has a WhatsApp button, and covers content (e.g., "25+ Años de garantía" stat). Fix: `@media (max-width: 767px) { .whatsapp-float { display: none; } }` on pages that render `.sticky-cta`.
7. **Hamburger tap target 40×32 < 44px** (home): add padding so hit area ≥44×44.
8. **No mobile nav on secondary pages**: servicios/contacto/towns have zero `hamburger` — nav links are hidden on mobile leaving only logo+CTA (towns: no CTA at all). Fix: port the home header (logo, hamburger + mobile menu, `.nav-cta`) into `servicios.html`, `contacto.html`, town template.
9. **Brand inconsistency**: home = bolt logo img + "Solaris Panamá"; servicios/contacto = ☀ sun glyph + "Solaris Panamá"; towns = text "Solaris Energy". Standardize on `/solaris-logo-dark.png` + "Solaris Panamá" everywhere (header + footer + town H1s "— Solaris Energy" suffix).
10. **Hero caption credibility** (home): "Instalación reciente — Chitré, Herrera" sits on a ground-mount field photo that reads as stock. Either swap in a real rooftop install photo or soften caption to "Energía solar en el Azuero".
11. **Town pages use emoji icons** (☀️💰🏡 cards; 💬/📋 inside CTA buttons): replace with the homepage SVG line-icon set for a premium feel; remove emoji from buttons.
12. **Contacto map placeholder**: dashed-border box w/ pin icon looks unfinished. Replace with a static map image of Azuero (or styled image + overlay) and make the "Zonas de servicio" chips real `<a>` links to `/towns/solar-*.html` (internal-link SEO win).
13. **Savings-line ambiguity** (home project cards): "Ahorro: $850 → $45/mes" reads as savings-shrinks. Rename to "Factura: $850 → $45/mes".
14. **Footer link dedupe** (home): "Recursos → Solar Comercial" duplicates "Servicios → Solar Comercial" label; rename the Recursos one "Guía: Solar Comercial".
15. **JS-failure / reduced-motion safety**: all `.fade-up` content is `opacity: 0` until JS adds `.visible` — a JS error blanks the whole page below the hero (this audit's first captures proved how it looks). Add `@media (prefers-reduced-motion: reduce) { .fade-up { opacity: 1; transform: none; } }` + a `<noscript>` style setting `.fade-up { opacity: 1 }`.

## Suggested implementation order (next task, homepage)
P0-1 (one-line CSS) → P0-3 (one-line CSS) → P0-4 (markup+CSS, copy to towns later) → P0-2 (needs photo assets — check `public/img/` before generating) → P1-5/6/7 (mobile header/CTA block) → rest.
