# Noa's Design Improvement Plan
Date: 2026-03-09

## Overall Assessment
- Current design quality: **6.5/10**
- Target: **9/10** (production-ready, premium)
- Estimated effort: **5 pages need major work**, **18 need medium work**, **11 need minor tweaks**, **1 is broken (drone-guide.html)**

### What's Working
- Brand colors are consistent across all 35 pages (`:root` vars are correct everywhere)
- Font pairing (Playfair Display + DM Sans) is applied correctly
- Hero sections with gradient backgrounds look premium
- Language toggle (EN/ES) component is well-designed and consistent
- Card hover states with `translateY(-6px)` are elegant
- Overall color palette (Solaris Green → Gold → Sand → Pearl) feels premium

### What's NOT Working
- **Zero images** across 34/35 pages (only brand-kit.html has 17 `<img>` tags) — this is the single biggest gap. Text-only dashboards feel sterile.
- **No sidebar navigation** — every page relies on a simple top-nav + back link. For a 35-page dashboard, this is inadequate.
- **No breadcrumbs** — deep pages (CRM steps especially) lose context.
- **5 pages missing footers** — ads-dashboard, drone-guide, epc-contract, ppa-contract, procurement-engineering.
- **Inconsistent navigation patterns** — some use `.top-nav`, some `.back-nav`, some `.hero-nav`. No unified nav component.
- **CSS-only charts look flat** — financial-dashboard, pnl-plan, ads-dashboard use CSS donut/bar charts that lack polish vs. proper SVG or Chart.js visualizations.
- **No loading states, empty states, or skeleton screens** — interactive pages (bill-scanner, roof-scanner, CRM steps) jump abruptly.
- **drone-guide.html is completely empty** (1 line: "test").
- **Repetitive CSS** — every page has its own 200+ lines of duplicated base styles. No shared stylesheet.
- **No dark mode** — would elevate premium feel significantly.

---

## Global Improvements (apply to ALL pages)

### Architecture
- [ ] **Extract shared CSS** to `shared.css` — move `:root` vars, body, `.lang-toggle`, `.top-nav`, `.page-hero`, `.section-badge`, `.section-title`, footer, and responsive breakpoints into one file. Saves ~150 lines per page.
- [ ] **Create unified sidebar navigation** — persistent left sidebar (280px) with collapsible categories: Dashboard, CRM Pipeline (steps 1-10), Operations, Finance, Sales & Marketing, Legal. Use `var(--green)` background, gold active state, pearl text.
- [ ] **Add breadcrumb component** — format: `Dashboard > CRM Pipeline > Step 3: Electricity Analysis`. Use `var(--ash)` for separators, `var(--gold)` for current page.
- [ ] **Add consistent footer** to ALL pages — currently 5 pages are missing footers.

### Visual Enhancements
- [ ] **Add hero images/illustrations** — every page hero is a solid gradient. Add subtle tropical/solar imagery: palm silhouettes, solar panel outlines, Panama skyline overlays at 5-10% opacity.
- [ ] **Upgrade section dividers** — replace plain `border-top: 1px solid var(--mist)` with gradient dividers: `background: linear-gradient(90deg, transparent, var(--gold), transparent); height: 1px;`
- [ ] **Add subtle background textures** — use CSS noise or a very faint topographic/leaf pattern at 2-3% opacity on `var(--sand)` sections.
- [ ] **Improve card shadows** — current `--shadow-card: 0 2px 8px rgba(0,0,0,0.06)` is too subtle. Change to `0 4px 16px rgba(11,61,46,0.08)` for brand-tinted shadows.
- [ ] **Add accent borders to cards** — add `border-left: 3px solid var(--gold)` or `border-top: 3px solid var(--green)` to key feature cards for visual anchoring.
- [ ] **Icon upgrade** — replace emoji icons (📊 📋 ⚡) with Lucide or Phosphor SVG icons in `var(--green)` or `var(--gold)`. Emojis look cheap.

### Typography
- [ ] **Section badges** — change `font-size: 11px` to `12px`, increase `letter-spacing` from `1.5px` to `2px` for more breathing room.
- [ ] **Body text line-height** — standardize to `1.75` (currently varies between `1.6` and `1.7` across pages).
- [ ] **Heading bottom margins** — standardize `.section-title` margin-bottom to `12px` (varies from `8px` to `16px`).
- [ ] **Add `.text-gold`** utility class for inline gold highlights: `color: var(--gold); font-weight: 600;`

### Interactive Elements
- [ ] **Smooth page transitions** — add `@keyframes fadeIn` with `animation: fadeIn 0.6s ease-out` to main content containers on page load.
- [ ] **Scroll-triggered animations** — use `IntersectionObserver` to fade-in sections as user scrolls. Currently only index.html and customer-avatars.html have animations.
- [ ] **Button hover states** — add `box-shadow: 0 6px 20px rgba(212,168,67,0.35)` on gold buttons hover. Currently most buttons only have `translateY(-2px)`.
- [ ] **Active/focus states** — add `:focus-visible` outlines using `var(--gold)` for accessibility.
- [ ] **Loading spinners** — for bill-scanner and roof-scanner, add a branded spinner using `var(--gold)` border with `animation: spin 1s linear infinite`.

### Responsive Design
- [ ] **Most pages only have 1-2 `@media` queries** — need at minimum: `768px` (tablet), `480px` (phone), `1200px` (wide). Currently crm-step2 has the most at 3.
- [ ] **Add hamburger menu for mobile** — top-nav links collapse to a slide-in menu below 768px.
- [ ] **Card grids** — ensure `grid-template-columns` falls to `1fr` below 480px (some pages use `minmax(280px, 1fr)` which can overflow on small phones).

---

## Page-by-page Redesign Plan

### Priority 1 — High Impact (most visible pages)

#### index.html (748 lines)
- Current: **7/10**
- Issues:
  - No hero image — just gradient. Needs a Panama/tropical solar visual.
  - Tool cards use emoji icons (📋 🎨 📊) — replace with SVG.
  - Team section has no photos — placeholder avatars with initials look unfinished.
  - "About" cards are text-heavy, no visual relief.
  - Footer CTA section exists but feels generic.
- Improvements:
  - Add hero background image: tropical roof with solar panels, overlaid at 15% opacity over gradient.
  - Replace emoji icons with Lucide SVGs (e.g., `palette` for brand, `bar-chart-3` for strategy).
  - Add team member photos (or AI-generated professional headshots).
  - Add a "Quick Stats" strip below hero: projects completed, kW installed, years experience — with animated counters.
  - Add tropical decorative elements: subtle palm leaf SVG in bottom-right of hero.
- Images needed: Hero background, team headshots (3-4), decorative palm leaf SVG.

#### customer-avatars.html (986 lines)
- Current: **7.5/10** — one of the better pages
- Issues:
  - Customer avatar cards have no photos/illustrations — just text and emoji.
  - Page is very long (986 lines) with no visual breaks.
  - No customer persona images.
- Improvements:
  - Generate AI portraits for each customer persona (wealthy expat couple, commercial developer, eco-lodge owner, etc.).
  - Add persona "stat cards" with visual meters (budget range bar, solar interest gauge).
  - Add illustration dividers between persona sections.
- Images needed: 5-6 persona illustrations (described in Images section below).

#### financial-dashboard.html (1203 lines)
- Current: **6/10**
- Issues:
  - CSS-only donut and bar charts look flat and amateurish.
  - KPI cards lack visual differentiation — all look the same.
  - No data visualization library — charts aren't interactive.
  - Missing footer consistent with other pages (has footer but nav is missing).
  - Dense financial tables with no zebra striping or highlighting.
- Improvements:
  - Replace CSS charts with lightweight SVG donut charts with animated fill on scroll.
  - Add colored left borders to KPI cards: green for revenue, gold for profit, red for expenses.
  - Add trend arrows (↑↓) with green/red coloring next to KPI values.
  - Tables: add `background: var(--cloud)` on odd rows, `font-weight: 600; color: var(--green)` on totals.
  - Add sparkline mini-charts in KPI cards using inline SVGs.
- Images needed: None (data viz is the priority).

#### proposal.html (1371 lines)
- Current: **7/10**
- Issues:
  - Proposal preview is well-designed but lacks visual imagery.
  - No product photos or installation examples.
  - System diagram section is text-only — needs an actual diagram.
  - Tables lack styling polish.
- Improvements:
  - Add a before/after installation photo in the proposal template.
  - Create an SVG system diagram showing: solar panels → inverter → meter → grid.
  - Add "Equipment Showcase" section with product images.
  - Style tables with gold header row: `background: var(--green); color: var(--pearl)`.
- Images needed: Solar installation example, equipment product shots, system diagram SVG.

#### brand-kit.html (603 lines)
- Current: **7.5/10** — has images (17), good structure
- Issues:
  - Logo grid boxes are functional but not visually exciting.
  - Color swatches could be more interactive (click to copy hex).
  - Font specimens are small.
  - Missing social media templates/mockups section.
- Improvements:
  - Enlarge font specimens: show Playfair Display at 48px, DM Sans at 16px with sample paragraph.
  - Add click-to-copy functionality on color hex codes.
  - Add brand application mockups section: business card, letterhead, vehicle wrap.
  - Color swatches: make them larger (80px × 80px minimum), add WCAG contrast ratio labels.
- Images needed: Brand mockup templates (business card, letterhead).

#### ads-dashboard.html (1172 lines)
- Current: **6/10**
- Issues:
  - CSS pie chart is rudimentary — looks like a demo, not a real dashboard.
  - Missing footer.
  - Table styling is basic — no hover rows, no sortable columns.
  - KPI metrics lack visual hierarchy.
  - No ad creative previews/thumbnails.
- Improvements:
  - Replace CSS pie chart with SVG donut chart with segment labels and hover tooltips.
  - Add ad creative preview cards with thumbnail placeholders.
  - Table rows: add `tr:hover { background: rgba(212,168,67,0.06); }`.
  - KPI cards: add mini trend charts (7-day sparkline).
  - Add "Campaign Status" pills: Active = `background: rgba(20,87,63,0.1); color: var(--green-canopy)`, Paused = `background: rgba(212,168,67,0.1); color: var(--gold-aged)`.
  - Add footer.
- Images needed: Ad creative mockup thumbnails (FB/IG/Google).

---

### Priority 2 — Medium Impact

#### sales-marketing.html (1432 lines)
- Current: **6.5/10**
- Issues:
  - Longest page (1432 lines) — needs better section navigation.
  - No in-page table of contents or anchor links.
  - Dense content with no imagery.
  - Marketing strategy sections are wall-of-text.
- Improvements:
  - Add sticky sub-navigation with anchor links to each section.
  - Add marketing funnel visualization (SVG: Awareness → Interest → Decision → Action).
  - Add social media post mockup previews.
  - Break text blocks with pull-quotes in `var(--green)` with gold left border.
- Images needed: Marketing funnel diagram, social media post mockups.

#### crm-step1-lead-capture.html (1025 lines)
- Current: **6.5/10**
- Issues:
  - Lead status colors (hot/warm/cold) use generic Material colors (#E53935, #FF9800, #2196F3) — should be brand-integrated.
  - Form fields styling is basic.
  - No lead pipeline visualization.
- Improvements:
  - Change lead colors: Hot = `#C0392B`, Warm = `var(--gold)`, Cold = `var(--green-canopy)`.
  - Add kanban-style pipeline preview (visual cards in columns).
  - Style form inputs: `border: 1px solid var(--mist); border-radius: 8px; padding: 12px 16px;` with `focus: border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212,168,67,0.15);`.
- Images needed: None.

#### crm-step3-electricity.html (1287 lines)
- Current: **6/10**
- Issues:
  - Complex electricity analysis data is hard to scan.
  - Chart.js reference exists but visualization is basic.
  - Tables are dense with no visual hierarchy.
  - Longest CRM page — overwhelming.
- Improvements:
  - Add color-coded tiers for electricity consumption: Low = green, Medium = gold, High = red.
  - Improve chart with gradient fills: `backgroundColor: 'rgba(11,61,46,0.1)'`.
  - Add summary cards at top with key metrics before the detailed tables.
  - Collapsible table sections with expand/collapse toggles.
- Images needed: None.

#### procurement-engineering.html (1256 lines)
- Current: **6/10**
- Issues:
  - Missing footer.
  - Equipment specs are in text format — needs comparison tables.
  - Very technical, no visual relief.
- Improvements:
  - Add equipment comparison cards with product placeholder images.
  - Add a procurement timeline/gantt-style visualization.
  - Add brand-colored data tables with `thead { background: var(--green); color: var(--pearl); }`.
  - Add footer.
- Images needed: Solar panel product image, inverter product image, mounting system image.

#### epc-contract.html (1203 lines)
- Current: **6/10**
- Issues:
  - Missing footer.
  - Legal text is dense and hard to read.
  - No visual document structure indicators.
- Improvements:
  - Add article/clause numbering with `var(--green)` numbered badges.
  - Add "Key Terms" highlight boxes: `background: rgba(212,168,67,0.08); border-left: 3px solid var(--gold); padding: 16px 20px;`.
  - Add table of contents with anchor links.
  - Add footer.
- Images needed: None.

#### ppa-contract.html (1096 lines)
- Current: **6/10**
- Issues: Same as epc-contract — dense legal, missing footer, no TOC.
- Improvements: Same treatment as epc-contract + add payment schedule visualization.
- Images needed: None.

#### financing.html (1074 lines)
- Current: **6.5/10**
- Issues:
  - Financing options are in text cards — needs comparison table.
  - Calculator section (if any) lacks interactivity feel.
  - No visual payback period chart.
- Improvements:
  - Add financing comparison table with highlighted "Recommended" option using gold border.
  - Add payback period timeline visualization.
  - Add ROI calculator with slider-style inputs (styled range inputs).
- Images needed: None.

#### value-chain.html (942 lines)
- Current: **7/10** — has good animation count (35 transition/animation references)
- Issues:
  - Flow diagram is text-based — needs actual visual flow.
  - Sections could benefit from connecting lines/arrows.
- Improvements:
  - Add SVG connecting arrows between value chain stages.
  - Add progress indicators showing which stages are complete.
  - Use numbered step badges with `background: var(--gold); color: var(--green)`.
- Images needed: None.

#### crm-value-chain.html (993 lines)
- Current: **6.5/10**
- Issues:
  - Duplicate concept with value-chain.html — confusing.
  - CRM-specific pipeline visualization is missing.
- Improvements:
  - Add horizontal pipeline visualization with 10 connected steps.
  - Color-code completed vs. in-progress vs. upcoming steps.
  - Add conversion rate metrics between stages.
- Images needed: None.

#### bill-scanner.html (905 lines)
- Current: **6.5/10**
- Issues:
  - Upload/scan interface is functional but bland.
  - No sample bill preview or scanning animation.
  - Results display is plain text.
- Improvements:
  - Add a branded file upload zone: dashed border in `var(--gold)`, with solar panel icon, drag & drop styling.
  - Add scanning animation: pulsing gold line moving down a document silhouette.
  - Results cards: use green/red comparison for current vs. solar cost.
- Images needed: Sample electricity bill mockup (Panama ENSA bill layout).

#### roof-scanner.html (748 lines)
- Current: **6.5/10**
- Issues:
  - Map/satellite interface styling is basic.
  - No example roof analysis output.
  - Missing visual indicators for roof suitability.
- Improvements:
  - Add roof suitability gradient overlay mockup (green = ideal, yellow = okay, red = poor).
  - Style the scanner interface with dark theme: `background: var(--green); color: var(--pearl)` for the analysis panel.
  - Add results cards with roof area, panel capacity, estimated production.
- Images needed: Sample satellite roof view with solar panel overlay.

#### crm-step2-site-survey.html (794 lines)
- Current: **6.5/10**
- Issues:
  - Survey form is functional but generic.
  - No photo upload previews or checklist visualization.
  - Has the most media queries (3) but still limited.
- Improvements:
  - Add photo grid placeholder for site survey images.
  - Add interactive checklist with checkmark animations.
  - Add compass/orientation diagram for roof direction.
- Images needed: Site survey checklist illustration.

#### crm-step4-design.html (803 lines)
- Current: **6/10**
- Issues:
  - Design tools/config is text-based.
  - No system layout preview.
  - Missing panel placement visualization.
- Improvements:
  - Add a panel layout grid preview placeholder.
  - Add equipment selection cards with specs and images.
  - Style configuration forms with branded inputs.
- Images needed: Solar panel layout diagram example.

#### crm-step5-sld.html (895 lines)
- Current: **5.5/10**
- Issues:
  - Single Line Diagram is one of the most technical pages — all text, no diagram.
  - The whole point is a diagram but there's no visual.
- Improvements:
  - **Critical:** Add an SVG single-line diagram showing: PV Array → String Combiner → Inverter → AC Panel → Meter → Grid.
  - Add component specification cards alongside diagram nodes.
  - Interactive highlight: click diagram component to see specs.
- Images needed: SLD diagram SVG (must generate or build).

#### crm-step6-proposal.html (805 lines)
- Current: **6.5/10**
- Improvements:
  - Add proposal PDF preview thumbnail.
  - Add "Send to Client" button with email integration styling.
  - Preview section should look like actual proposal document.
- Images needed: None.

#### crm-step7-contract.html (613 lines)
- Current: **6.5/10**
- Improvements:
  - Add contract status timeline (Draft → Sent → Signed → Active).
  - Add signature field placeholder with dotted-line styling.
  - Add digital signature integration preview.
- Images needed: None.

#### crm-step8-inventory.html (916 lines)
- Current: **6.5/10**
- Issues:
  - Inventory tables are generic.
  - No product images or stock level indicators.
- Improvements:
  - Add stock level bars: green >75%, gold 25-75%, red <25%.
  - Add product image thumbnails in table rows.
  - Add "Low Stock" alert badges.
- Images needed: Equipment product thumbnails (panels, inverters, mounting).

#### crm-step9-installation.html (889 lines)
- Current: **6.5/10**
- Improvements:
  - Add installation timeline/gantt chart.
  - Add progress tracker with step completion percentages.
  - Add photo upload section for installation documentation.
- Images needed: Installation progress photo examples.

#### crm-step10-om.html (633 lines)
- Current: **6/10**
- Improvements:
  - Add monitoring dashboard preview with production metrics.
  - Add maintenance schedule calendar view.
  - Add alert/notification styling for system issues.
- Images needed: Monitoring dashboard mockup.

---

### Priority 3 — Lower Impact

#### strategy.html (328 lines)
- Current: **7/10** — compact and clean
- Improvements:
  - Add market opportunity map visualization.
  - Stat cards could use animated number counters.
  - Timeline with milestone markers.
- Images needed: Panama map with Azuero Peninsula highlighted.

#### assets.html (287 lines)
- Current: **7/10** — clean card grid
- Improvements:
  - Add thumbnail previews for each asset category.
  - Add "Last Updated" timestamps on cards.
  - Category icons should be SVGs instead of CSS-only styled divs.
- Images needed: None.

#### business-plan.html (593 lines)
- Current: **6.5/10**
- Improvements:
  - Add executive summary highlight box at top.
  - Financial projections need mini-charts.
  - Add milestone timeline visualization.
- Images needed: None.

#### pnl-plan.html (549 lines)
- Current: **6/10**
- Issues: CSS chart is basic.
- Improvements:
  - Replace with SVG bar chart with hover tooltips.
  - Add monthly/quarterly toggle.
  - Color-code profit (green) vs. loss (red) bars.
- Images needed: None.

#### installation.html (635 lines)
- Current: **6.5/10**
- Improvements:
  - Add installation process photo gallery placeholder.
  - Add safety checklist with visual indicators.
  - Step-by-step guide with numbered illustrations.
- Images needed: Installation process photos (3-4 steps).

#### legal-contracts.html (930 lines)
- Current: **6/10**
- Improvements:
  - Add contract template selector cards.
  - Add clause highlight boxes (same as epc-contract).
  - Add download button styling.
- Images needed: None.

#### licensing.html (512 lines)
- Current: **6.5/10**
- Improvements:
  - Add license requirement checklist with status indicators.
  - Add Panama government agency links with official styling.
  - Add timeline for licensing process.
- Images needed: None.

#### monitoring-maintenance.html (614 lines)
- Current: **6.5/10**
- Improvements:
  - Add system health dashboard preview.
  - Add maintenance calendar with upcoming tasks.
  - Add production graph placeholder.
- Images needed: Monitoring dashboard screenshot mockup.

#### equipment-list.html (708 lines)
- Current: **6.5/10**
- Improvements:
  - Add equipment product cards with images.
  - Add comparison table with brand-colored headers.
  - Add "Approved Vendor" badge styling.
- Images needed: Product photos for panels, inverters, racking.

#### drone-guide.html (1 line — BROKEN)
- Current: **0/10**
- Issues: Page contains only the word "test". Completely empty.
- Improvements:
  - Build full drone survey guide page with:
    - Flight planning checklist
    - Equipment requirements (DJI Mavic recommended)
    - Photo/video capture guidelines
    - Data processing workflow
    - Sample drone imagery
  - Match the design pattern of installation.html or equipment-list.html.
- Images needed: Drone survey example photos, roof aerial shots.

---

## Images to Generate

List of ALL images needed with detailed prompts for Nano Banana Pro 2:

### Hero & Background Images
1. **[index.html] — Main Hero Background** — `Aerial view of a modern tropical villa in Panama with solar panels installed on a terracotta roof, surrounded by lush green palm trees and tropical vegetation, golden hour lighting, professional architectural photography, warm tones, 16:9 aspect ratio`

2. **[index.html] — Hero Palm Leaf Decoration** — `Minimal tropical palm leaf silhouette, single monstera leaf, dark green #0B3D2E on transparent background, elegant botanical illustration, vector-style clean lines`

### Team & People
3. **[index.html] — Team Member 1: CEO/Founder** — `Professional headshot portrait of a confident male solar energy executive, 30s, Mediterranean features, wearing smart casual linen shirt, warm natural lighting, tropical office background blurred, professional LinkedIn-style photo`

4. **[index.html] — Team Member 2: Operations** — `Professional headshot portrait of a Latina female operations manager, 30s, professional attire, warm smile, modern office background with tropical plants, professional photography`

5. **[index.html] — Team Member 3: Engineering** — `Professional headshot portrait of a male solar engineer, 40s, wearing safety vest and hard hat, standing near solar panels, confident expression, outdoor tropical setting, professional photography`

### Customer Personas
6. **[customer-avatars.html] — Expat Couple** — `Wealthy American expat couple in their 50s standing on the terrace of their modern beach house in Panama, tropical garden visible, casual elegant clothing, golden hour, lifestyle photography`

7. **[customer-avatars.html] — Commercial Developer** — `Latin American commercial real estate developer in his 40s, business suit, standing in front of a modern commercial building in Panama City, confident pose, professional photography`

8. **[customer-avatars.html] — Eco-Lodge Owner** — `Eco-lodge owner, bohemian-chic woman in her 40s, standing at a sustainable jungle lodge in Panama, thatched roof and tropical plants visible, warm natural lighting, lifestyle photography`

9. **[customer-avatars.html] — Agricultural Estate Owner** — `Panamanian rancher in his 50s, wearing casual ranch clothing, standing by agricultural land with cattle in background, rural Azuero Peninsula landscape, warm lighting, portrait photography`

10. **[customer-avatars.html] — Government/Institutional** — `Panamanian government official in business attire, standing in front of a public building with Panama flag, professional corporate photography`

### Product & Equipment
11. **[proposal.html + equipment-list.html] — Solar Panel Closeup** — `Close-up of premium black monocrystalline solar panels installed on a modern roof, detailed texture of photovoltaic cells, sunlight reflecting, professional product photography, clean and sharp`

12. **[proposal.html + equipment-list.html] — Inverter Product** — `Modern hybrid solar inverter (white/silver housing) mounted on a wall, clean installation with organized wiring, professional product photography, studio-quality lighting`

13. **[procurement-engineering.html] — Mounting System** — `Aluminum solar panel mounting/racking system on a metal roof in tropical setting, close-up showing rail and clamp details, professional installation photography`

### Installation & Process
14. **[installation.html + crm-step9] — Installation Team Working** — `Professional solar installation crew (3 workers) installing panels on a residential roof in tropical Panama, wearing safety equipment, blue sky with cumulus clouds, action shot, professional photography`

15. **[installation.html] — Completed Installation** — `Beautiful completed residential solar installation in Panama, modern house with black solar panels on clay tile roof, tropical garden, swimming pool visible, drone aerial perspective, golden hour lighting`

16. **[drone-guide.html] — Drone Survey** — `DJI drone flying above a residential neighborhood in tropical Panama, aerial perspective showing rooftops being surveyed for solar potential, clear sky, professional aerial photography`

17. **[drone-guide.html] — Aerial Roof Analysis** — `Satellite/drone view of a residential roof showing solar panel placement zones highlighted in translucent green overlay, clear aerial photography of tropical house roof`

### Marketing & Branding
18. **[brand-kit.html] — Business Card Mockup** — `Premium business card mockup on dark green marble surface, card showing Solaris Energy Panama logo in gold #D4A843 on white card, elegant minimal design, product photography, subtle gold foil effect`

19. **[brand-kit.html] — Vehicle Wrap Mockup** — `White Toyota Hilux pickup truck with Solaris Energy Panama branding, dark green #0B3D2E side panels with gold logo, professional vehicle wrap mockup, outdoor tropical setting`

20. **[ads-dashboard.html] — Social Media Ad Preview** — `Facebook/Instagram ad mockup showing a beautiful solar installation in Panama, tropical setting, overlay text "Own Your Energy", Solaris green and gold brand colors, social media advertising format`

### Maps & Location
21. **[strategy.html] — Panama Azuero Map** — `Clean minimal map of Panama highlighting the Azuero Peninsula in gold #D4A843, rest of country in light green, neighboring provinces labeled, modern cartographic style, clean white background`

### Monitoring & Tech
22. **[monitoring-maintenance.html + crm-step10] — Solar Monitoring Dashboard** — `Modern solar monitoring app dashboard on a tablet screen, showing energy production graphs, system health status, real-time data, green and gold color scheme, clean UI screenshot style, professional product photography`

### Site Survey
23. **[crm-step2-site-survey.html] — Site Survey Checklist** — `Solar technician conducting a site survey at a Panama residence, holding a tablet, examining roof angle and orientation, measuring tape visible, professional on-site photography, tropical residential setting`

24. **[bill-scanner.html] — Panama ENSA Bill** — `Stylized mockup of a Panama electricity bill (ENSA format), with highlighted sections showing consumption data, clean document photography, annotations pointing to key data fields, professional flat lay`

---

## Implementation Priority Order

### Phase 1 — Maximum Impact (Week 1)
1. Extract `shared.css` and refactor all pages
2. Build sidebar navigation component
3. Generate and add hero images to index.html
4. Fix drone-guide.html (build full page)
5. Add footers to 5 missing pages

### Phase 2 — Visual Upgrade (Week 2)
6. Generate customer persona images
7. Upgrade charts in financial-dashboard, pnl-plan, ads-dashboard
8. Add breadcrumbs to all CRM step pages
9. Replace emoji icons with SVG icons globally
10. Add product/equipment images to relevant pages

### Phase 3 — Polish (Week 3)
11. Add scroll-triggered animations to all pages
12. Improve responsive breakpoints (add 480px + 1200px)
13. Add interactive elements (click-to-copy, expandable sections)
14. Style all tables consistently (zebra striping, hover rows, branded headers)
15. Generate remaining brand mockup images

### Phase 4 — Advanced (Week 4)
16. Add SLD diagram SVG for crm-step5
17. Build kanban pipeline visualization for CRM
18. Add dark mode toggle
19. Mobile hamburger menu implementation
20. Performance audit (lazy load images, minimize CSS)

---

## CSS Quick-Reference Fixes (copy-paste ready)

### Branded Table Styles (apply to ALL tables)
```css
table { width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; }
thead { background: var(--green); }
thead th { color: var(--pearl); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 14px 16px; text-align: left; }
tbody tr { border-bottom: 1px solid var(--mist); transition: background 0.2s; }
tbody tr:nth-child(even) { background: var(--cloud); }
tbody tr:hover { background: rgba(212,168,67,0.06); }
tbody td { padding: 14px 16px; font-size: 14px; color: var(--slate); }
```

### Gradient Section Divider
```css
.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%);
  margin: 0;
  border: none;
}
```

### Branded File Upload Zone
```css
.upload-zone {
  border: 2px dashed var(--gold);
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  background: rgba(212,168,67,0.03);
  transition: all 0.3s;
  cursor: pointer;
}
.upload-zone:hover {
  background: rgba(212,168,67,0.08);
  border-color: var(--gold-aged);
}
```

### Status Badge System
```css
.badge-active { background: rgba(20,87,63,0.1); color: var(--green-canopy); }
.badge-pending { background: rgba(212,168,67,0.1); color: var(--gold-aged); }
.badge-completed { background: rgba(11,61,46,0.1); color: var(--green); }
.badge-alert { background: rgba(192,57,43,0.1); color: #C0392B; }
```

### Card Left-Border Accent Variants
```css
.card-accent-gold { border-left: 3px solid var(--gold); }
.card-accent-green { border-left: 3px solid var(--green); }
.card-accent-canopy { border-left: 3px solid var(--green-canopy); }
```

---

*Generated by Noa — Design Agent*
*Audited 35 pages, identified 24 images needed, 4 phases of implementation*
