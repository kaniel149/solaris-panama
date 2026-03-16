# Roof Scanner — תוכנית שיפורים

**תאריך:** 16 מרץ 2026  
**פרויקט:** Solaris Panama  
**מצב נוכחי:** Functional עם Google Solar API + local Panama estimator

---

## 1. מה יש עכשיו

### ✅ קיים ועובד
- **Google Solar API integration** — קובץ `/api/roof-scan.ts`
- **Local Panama estimator** — IDW interpolation מ-5 ערים, PSH 4.0-5.0
- **PVWatts fallback** — NREL API (optional enrichment)
- **Geocoding service** — כתובת → קואורדינטות
- **Manual mode** — אפשרות להזין שטח ידנית
- **Multi-tier quality** — HIGH / MEDIUM / BASE / ESTIMATED
- **Panel configs** — 25%, 50%, 75%, 100% מערכת
- **Roof segments** — תמיכה בגגות מורכבים עם כמה משטחים

### 📄 דפים קיימים
- `dashboard/roof-scanner.html` — מדריך סטטי (לא אינטראקטיבי)
- Link בCRM: `https://crm.solaris-panama.com/scan` (?)
- Link בCRM: `https://crm.solaris-panama.com/roof-designer` (?)

### ⚠️ נקודות חלשות
- אין UI אינטראקטיבי מלא (רק מדריך)
- Google Solar API key לא בVercel env vars
- PVWatts optional אבל לא ברור אם יש API key
- אין תמיכה ב-3D visualization
- אין שמירת scans ב-DB
- אין שיתוף scans (WhatsApp / Email)
- אין AI-powered roof classification

---

## 2. שיפורים קריטיים (Phase 1 — שבוע 1-2)

### A. UI אינטראקטיבי מלא

**מטרה:** להפוך את roof-scanner.html לכלי אינטראקטיבי מלא

**Features:**
1. **Map interface** — Leaflet או Mapbox
   - Search bar: כתובת → geocode → fly to location
   - Click anywhere on map → scan that building
   - Satellite imagery layer
   - Drawing tools: polygon tool לסימון שטח גג ידני

2. **Panel placement visualizer**
   - 3D model פשוט או top-down view
   - Drag & drop panel placement
   - Real-time count + kWp + yearly kWh
   - Respect setbacks (1m from edge, 0.5m between rows)

3. **Results panel**
   - System size selector: 3kWp / 5kWp / 8kWp / custom
   - Monthly production chart (Chart.js)
   - ROI calculator: electricity rate input → payback period
   - PDF export: proposal-ready document

4. **Save & share**
   - Save scan to DB with project_id or lead_id
   - Generate shareable link (public UUID)
   - WhatsApp share: text + image thumbnail
   - Email PDF proposal

**Tech:**
- React component: `RoofScannerPage.tsx`
- Leaflet for map
- Canvas or SVG for panel layout
- jsPDF for export
- Supabase: `roof_scans` table

**Timeline:** 3-4 days

---

### B. Backend enhancements

**1. Google Solar API key fix**
- Add to Vercel env: `GOOGLE_SOLAR_API_KEY`
- Fallback chain: Google → Local Panama → PVWatts
- Cache Google Solar results (24h) per lat/lng to reduce API calls

**2. DB schema**
```sql
CREATE TABLE roof_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  project_id UUID REFERENCES projects(id) NULL,
  lead_id UUID REFERENCES leads(id) NULL,
  
  -- Location
  address TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  
  -- Scan metadata
  source TEXT NOT NULL, -- 'google_solar' | 'local_panama' | 'manual'
  quality TEXT NOT NULL, -- 'HIGH' | 'MEDIUM' | 'BASE' | 'ESTIMATED'
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Roof data
  total_roof_m2 NUMERIC(8,2),
  usable_roof_m2 NUMERIC(8,2),
  roof_segments JSONB, -- Array of {areaM2, pitchDegrees, azimuthDegrees, center}
  
  -- System design
  panel_count INT,
  system_kwp NUMERIC(6,2),
  yearly_kwh INT,
  monthly_kwh JSONB, -- Array of 12 numbers
  
  -- Panel placement (manual override)
  panel_layout JSONB NULL, -- Array of {x, y, rotation} if user customized
  
  -- Sharing
  public_share_token TEXT UNIQUE,
  shared_at TIMESTAMPTZ NULL,
  
  -- Raw data
  raw_api_response JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roof_scans_company ON roof_scans(company_id);
CREATE INDEX idx_roof_scans_project ON roof_scans(project_id);
CREATE INDEX idx_roof_scans_lead ON roof_scans(lead_id);
CREATE INDEX idx_roof_scans_share_token ON roof_scans(public_share_token);
```

**Timeline:** 1 day

---

### C. Photo upload + AI roof detection

**Feature:** העלאת תמונת גג → AI מזהה סוג גג, שטח, obstructions

**Tech:**
- File upload input (photo from phone)
- Send to OpenAI Vision API or Google Cloud Vision
- Prompt: "Analyze this roof photo. Identify: (1) roof type (metal, tile, concrete), (2) obstructions (trees, water tanks, HVAC), (3) estimated usable area %, (4) any red flags (damage, rust, structural issues)"
- Parse JSON response
- Prefill scan form with AI results
- User can override

**Why?**
- Many Panama clients send photos via WhatsApp
- Faster than manual inspection
- Catches issues early (rusty roof, tree shading)

**Timeline:** 2 days

---

## 3. שיפורים מתקדמים (Phase 2 — שבוע 3-4)

### D. 3D roof model

**Feature:** רינדור 3D של הגג עם פאנלים

**Tech:**
- Three.js או Babylon.js
- Generate mesh from Google Solar roofSegments data
- Place panel 3D models on segments
- Camera controls: orbit, zoom, tilt
- Sun position slider → see shading at different times of day

**Why?**
- "Wow factor" לפרזנטציות
- לקוחות מבינים טוב יותר את המערכת
- יכולים לראות איך הגג נראה עם פאנלים

**Timeline:** 5-7 days

---

### E. Shading analysis upgrade

**Current:** Google Solar sunshineQuantiles (coarse)

**Upgrade:**
1. **Horizon analysis**
   - Identify nearby buildings, trees (from satellite + Street View)
   - Calculate horizon profile (elevation at each azimuth)
   - Simulate sun path → shade % by month

2. **Shadow simulator**
   - Time slider: 6 AM → 6 PM
   - Date selector: any day of year
   - Animated: see shadow moving across roof

**Tech:**
- SunCalc.js for sun position
- Canvas drawing for shadow casting
- OR: send to backend Python service with Pysolar

**Timeline:** 4-5 days

---

### F. Panel brand selector

**Feature:** אפשרות לבחור מותג פאנלים

**Current:** Hardcoded 580W bifacial

**Upgrade:**
```typescript
interface PanelModel {
  id: string;
  brand: string; // 'JA Solar', 'Trina', 'Canadian Solar', etc.
  model: string; // 'JAM78S30-580/MR', 'Vertex S+ TSM-NEG21C.20', etc.
  wattage: number;
  width_m: number;
  height_m: number;
  efficiency: number; // 21.5%, 22.1%, etc.
  price_usd: number; // Per panel
  warranty_years: number;
  bifacial: boolean;
}
```

**UI:**
- Dropdown: select panel brand/model
- Recalculate: panel count, system size, production
- Show price impact
- Default: 580W JA Solar (current)

**DB:** `panel_models` table, admin UI to add/edit

**Timeline:** 2 days

---

### G. Roof designer integration

**Current:** `/roof-designer` route exists but not clear if it's integrated

**Feature:** Seamless flow: Scan → Design → Quote

1. **Scan page** → "Design System" button
2. Opens `/roof-designer` with prefilled data:
   - Roof outline from Google Solar
   - Recommended system size
   - Panel count from scan
3. User can:
   - Drag panels to custom positions
   - Add strings (electrical layout)
   - Place inverter location
   - Mark conduit path
4. **Export:**
   - PNG layout image
   - PDF with electrical single-line diagram
   - BOM (Bill of Materials)

**Timeline:** 3-4 days (if roof-designer already exists, just wire it up)

---

## 4. Optimizations (Phase 3 — ongoing)

### H. Performance

- [ ] Cache Google Solar results in DB for 30 days
- [ ] Lazy-load 3D viewer (don't render if user doesn't open)
- [ ] Web Workers for heavy calculations (panel layout optimization)
- [ ] Compress roof imagery (WebP, lazy load)

### I. Mobile UX

- [ ] Touch-friendly map controls
- [ ] Simplified mobile layout (vertical stack, not sidebar)
- [ ] Camera access: take roof photo directly from scanner
- [ ] GPS: "Use My Location" button

### J. Multilingual

**Current:** roof-scanner.html has EN/ES/HE i18n

**Expand:**
- All scanner UI strings in i18n files
- Spanish as default for Panama
- English for internal / expat clients

---

## 5. Pricing & Monetization

### K. Freemium model

**Free tier:**
- 3 scans/month per user
- Basic panel layout (no 3D)
- Watermarked PDF exports

**Pro tier ($49/mo):**
- Unlimited scans
- 3D visualization
- No watermarks
- White-label PDF (your logo)
- API access

**Enterprise ($199/mo):**
- Multi-user accounts
- Custom branding
- Dedicated support
- Bulk scanning (CSV upload of addresses)

---

## 6. Integrations

### L. WhatsApp flow

**User sends photo → G scans → sends back estimate**

1. User texts "+507 6583-1822" with roof photo
2. Webhook → G receives image
3. G:
   - AI analyzes photo → roof type, obstructions
   - Geocode from user's location (if shared)
   - Run scan
   - Generate PNG thumbnail of layout + estimate
4. G replies:
   - "🏡 Your roof can fit **12 panels** (6.96 kWp)"
   - "📊 Est. yearly production: **10,540 kWh** ($1,897/year savings)"
   - "💰 System cost: ~$9,500 | Payback: 5.0 years"
   - [View full proposal] link

**Timeline:** 3 days

---

### M. CRM integration

**Link scans to leads/projects**

- Scan button in Lead detail page → opens scanner with lead address prefilled
- Save scan → auto-link to lead
- Project creation → pull data from scan (system size, production)
- Proposal generation → use scan data

**Timeline:** 2 days

---

## 7. Summary: Roadmap

### Phase 1 (Weeks 1-2) — Critical
- ✅ Interactive UI with map (Leaflet)
- ✅ Panel placement visualizer
- ✅ Save scans to DB
- ✅ Share via WhatsApp / Email
- ✅ Photo upload + AI analysis
- ✅ Google Solar API key fix

**Deliverable:** Fully functional interactive roof scanner

---

### Phase 2 (Weeks 3-4) — Advanced
- 3D roof model viewer
- Enhanced shading analysis
- Panel brand selector
- Roof designer integration

**Deliverable:** Professional-grade solar design tool

---

### Phase 3 (Ongoing) — Scale
- Performance optimizations
- Mobile UX refinements
- Multilingual (ES primary)
- Freemium pricing
- WhatsApp automation
- CRM deep integration

**Deliverable:** Market-ready SaaS product

---

## 8. Tech Stack for New Features

**Frontend:**
- React + TypeScript + Vite
- Leaflet.js (map)
- Three.js (3D, optional)
- Chart.js (production graphs)
- jsPDF (exports)
- Tailwind CSS

**Backend:**
- Existing: `api/roof-scan.ts` (Vercel serverless)
- Add: `api/roof-save.ts`, `api/roof-share.ts`
- Supabase: DB + storage (scan images)

**AI:**
- OpenAI Vision API (photo analysis)
- Or: Google Cloud Vision

**APIs:**
- Google Solar API (primary)
- PVWatts (fallback)
- SunCalc.js (sun position)

---

## 9. Questions to Answer

1. **Does `/roof-designer` route already work?** If yes, what's there?
2. **Google Solar API key** — do we have one? Budget for API calls?
3. **PVWatts API key** — do we have one?
4. **Photo storage** — Supabase Storage or S3?
5. **Freemium pricing** — want to charge for scans or keep free for Solaris clients?
6. **Priority:** Interactive UI first or 3D viewer first?

---

## 10. Next Steps

1. **Review this plan** — קניאל approves/adjusts priorities
2. **Start Phase 1**:
   - Day 1: DB schema + API endpoints
   - Day 2-3: Interactive UI (map + panel layout)
   - Day 4: Save/share functionality
   - Day 5: Photo upload + AI
3. **Demo to Omri** — get feedback from field usage
4. **Iterate** based on real client needs

---

**סיכום:**  
הסורק הנוכחי עובד אבל לא אינטראקטיבי. Phase 1 הופך אותו לכלי מקצועי מלא. Phase 2-3 מוסיפים "wow factor" ומונטיזציה. עדיפות: **אינטראקטיבי קודם, 3D אחר כך**.
