# Solaris Panamá — Herramientas Interactivas / Interactive Tools

## 1. GIS Mapper (`gis-mapper.html`)

Interactive rooftop solar potential map for Panama. Click any building marker to see:
- Estimated system size (kWp), number of panels
- Monthly bill comparison (before/after solar)
- ROI calculator with EPC purchase and PPA options
- CO₂ savings and tree-planting equivalent
- WhatsApp CTA for instant proposal

**Features:**
- 80+ sample rooftops across 8 zones (Panamá City, San Miguelito, Panamá Pacífico, Colón, David, Santiago, Chitré, Penonomé)
- Zone filter, potential filter, roof type filter, search
- Heatmap overlay toggle
- Scan zones overlay toggle
- ES/EN bilingual toggle
- Mobile responsive with hamburger menu
- Solaris Panamá brand colors (Green #0B3D2E, Gold #D4A843, Pearl #FEFDFB)

**Solar parameters (Panama-specific):**
- Annual yield: ~1,600 kWh/kWp/yr
- Electricity rate: $0.18/kWh (USD)
- EPC cost: ~$1.10/Wp installed
- Grid emission factor: 0.35 kg CO₂/kWh

**Dependencies:** Leaflet.js + Leaflet.heat (CDN), Google Satellite tiles

---

## 2. Solar Atlas (`solar-atlas.html`)

Province-level solar irradiance map for all of Panama. Click any province to see:
- Annual GHI (Global Horizontal Irradiance)
- Peak sun hours per day
- Monthly GHI chart (12 bars with hover tooltip)
- Annual yield estimate (kWh/kWp)
- Capacity factor
- Best months and ideal use cases
- WhatsApp CTA

**Features:**
- 10 provinces with real irradiance data (Global Solar Atlas / IRENA sources)
- Click-anywhere estimator: click any point on the Panama map to get estimated GHI
- Color-coded provinces by solar potential (Excellent/Very Good/Good/Moderate)
- ES/EN bilingual toggle
- Province labels with GHI values visible on map
- Gradient legend for irradiance levels

**Key data points:**
| Province | GHI (kWh/m²/d) | Yield (kWh/kWp/yr) |
|----------|-----------------|---------------------|
| Los Santos | 5.45 | 1,780 |
| Herrera | 5.40 | 1,760 |
| Coclé | 5.25 | 1,710 |
| Panamá Oeste | 5.10 | 1,660 |
| Panamá | 5.05 | 1,640 |
| Chiriquí | 4.90 | 1,600 |
| Veraguas | 4.85 | 1,580 |
| Colón | 4.70 | 1,530 |
| Darién | 4.60 | 1,500 |
| Bocas del Toro | 4.40 | 1,430 |

**Dependencies:** Leaflet.js (CDN), Google Satellite + Roads tiles

---

## Usage

Both tools are standalone HTML files — open directly in any modern browser. No build step, no server required.

```bash
open gis-mapper.html
open solar-atlas.html
```

## Brand

- **Green:** #0B3D2E
- **Gold:** #D4A843
- **Pearl:** #FEFDFB
- **Font:** Inter (Google Fonts CDN)
