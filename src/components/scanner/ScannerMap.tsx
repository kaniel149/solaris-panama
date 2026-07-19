/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Map, {
  Source,
  Layer,
  NavigationControl,
  GeolocateControl,
} from 'react-map-gl/maplibre';
import { Marker } from '@vis.gl/react-maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, Building2, PencilRuler, Check, X, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getGradeFromScore, calculatePolygonArea } from '@/utils/geoCalculations';
import {
  computeEstimatedKwp,
  type GeoJSONPolygon,
  type DetectedRoofCandidate,
} from '@/services/scannerRpcService';
import type { SavedRoof } from '@/services/savedRoofsService';
import BuildingDimensions from './BuildingDimensions';
import { ParcelBoundaryLayer } from './ParcelBoundaryLayer';
import { PanelLayoutOverlay, PanelLayoutBadge, usePanelLayout } from './PanelLayoutOverlay';
import 'maplibre-gl/dist/maplibre-gl.css';

// Re-export SavedRoof so parent can import from this file too
export type { SavedRoof };

// ===== MAP STYLES =====

const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const STREET_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const SATELLITE_STYLE: Record<string, unknown> = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri',
      maxzoom: 22,
    },
    'esri-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 22,
    },
    'esri-roads': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 22,
    },
  },
  layers: [
    { id: 'satellite-tiles', type: 'raster', source: 'esri-satellite' },
    { id: 'road-labels', type: 'raster', source: 'esri-roads' },
    { id: 'place-labels', type: 'raster', source: 'esri-labels' },
  ],
};

/**
 * Sentinel-2 recent imagery via Terrascope/VITO public WMTS (free, no API key).
 */
const SENTINEL_STYLE: Record<string, unknown> = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    'sentinel2': {
      type: 'raster',
      tiles: [
        'https://services.terrascope.be/wmts/v2?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TERRASCOPE_S2_TOC_V2&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg',
      ],
      tileSize: 256,
      attribution: '&copy; ESA / Terrascope (VITO)',
      maxzoom: 17,
      minzoom: 1,
    },
    'osm-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'sentinel2-tiles', type: 'raster', source: 'sentinel2' },
    { id: 'osm-label-overlay', type: 'raster', source: 'osm-labels', paint: { 'raster-opacity': 0.8 } },
  ],
};

type StyleMode = 'dark' | 'street' | 'satellite' | 'sentinel';

const STYLE_MAP: Record<StyleMode, string | Record<string, unknown>> = {
  dark: DARK_STYLE,
  street: STREET_STYLE,
  satellite: SATELLITE_STYLE,
  sentinel: SENTINEL_STYLE,
};

const STYLE_ORDER: StyleMode[] = ['dark', 'street', 'satellite', 'sentinel'];

const STYLE_STORAGE_KEY = 'scanner.mapStyle';

function loadStoredStyle(): StyleMode {
  try {
    const raw = localStorage.getItem(STYLE_STORAGE_KEY);
    if (raw === 'dark' || raw === 'street' || raw === 'satellite' || raw === 'sentinel') return raw;
  } catch {
    /* ignore */
  }
  return 'dark';
}

// Translation key for each base map style label
const STYLE_LABEL_KEYS: Record<StyleMode, string> = {
  dark: 'tools.scanner.mapLayers.styleDark',
  street: 'tools.scanner.mapLayers.styleStreet',
  satellite: 'tools.scanner.mapLayers.styleSatellite',
  sentinel: 'tools.scanner.mapLayers.styleSentinel',
};

// ===== SOLAR SCORE COLOR RAMP =====
const SCORE_RAMP: Array<{ stop: number; color: string }> = [
  { stop: 0, color: '#ef4444' },
  { stop: 50, color: '#f97316' },
  { stop: 75, color: '#facc15' },
  { stop: 90, color: '#22c55e' },
];

const SCORE_FILL_COLOR: any = [
  'interpolate',
  ['linear'],
  ['get', 'score'],
  ...SCORE_RAMP.flatMap((s) => [s.stop, s.color]),
];

// ===== TYPES =====

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ===== SCAN CANDIDATE (Phase 3 land + roof review queue) =====
// Minimal local interface — integrator will align candidateService.ts to this shape.
// Intentionally self-contained so ScannerMap has no import dependency on an
// unfinished file; the integrator aligns the service type to match this contract.
export interface ScanCandidate {
  id: string;
  kind: 'roof' | 'land';
  /** GeoJSON Polygon geometry. When present it is used directly; otherwise
   *  a synthetic square is computed from lat/lng + area_m2. */
  geom?: GeoJSON.Polygon;
  lat: number;
  lng: number;
  area_m2: number;
  /** kWp for roof candidates */
  kwp?: number;
  /** MWp for land candidates */
  mwp?: number;
  /** comercial | agro | utility (land only) */
  tier?: 'comercial' | 'agro' | 'utility';
  grade?: 'A' | 'B' | 'C' | 'D';
  address?: string;
}

// Tier → fill color for land candidates
const LAND_TIER_FILL: Record<string, string> = {
  comercial: '#38bdf8',
  agro: '#C026D3',
  utility: '#f59e0b',
};
const LAND_TIER_OUTLINE: Record<string, string> = {
  comercial: '#7dd3fc',
  agro: '#E879F9',
  utility: '#fbbf24',
};
const LAND_DEFAULT_FILL = '#C026D3';
const LAND_DEFAULT_OUTLINE = '#E879F9';

/** Build a synthetic 5-point square ring centered on [lng, lat] sized by area_m2 */
function syntheticSquareRing(
  lat: number,
  lng: number,
  area_m2: number
): [number, number][] {
  const side = Math.sqrt(area_m2 > 0 ? area_m2 : 100);
  const dLat = side / 2 / 110574;
  const dLng = side / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
}

interface ScannerMapProps {
  buildings: GeoJSON.FeatureCollection;
  selectedBuildingId: number | null;
  center: [number, number]; // [lng, lat]
  zoom: number;
  onBuildingSelect: (id: number) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  searchMarker?: { lng: number; lat: number } | null;
  /** When true, measurement overlay is shown on selected building */
  measureMode?: boolean;
  onMeasureModeChange?: (enabled: boolean) => void;
  /** Coordinates of the selected building polygon (for dimension overlay) */
  selectedBuildingCoordinates?: Array<{ lat: number; lon: number }>;

  // ===== P2: Draw roof tool =====
  selectedBuildingCenter?: { lng: number; lat: number } | null;
  selectedScanId?: string | null;
  onRoofDrawn?: (payload: {
    polygon: GeoJSONPolygon;
    areaSqm: number;
    kwp: number;
  }) => void;

  // ===== P3: Candidate review =====
  candidates?: DetectedRoofCandidate[];
  onConfirmCandidate?: (index: number) => void;
  onRejectCandidate?: (index: number) => void;

  parcelBoundary?: Array<{ lat: number; lng: number }>;

  /**
   * GeoJSON Polygon of the currently-drawn or detected roof — used by
   * PanelLayoutOverlay to render the panel tessellation grid.
   */
  panelRoofPolygon?: GeoJSON.Polygon | null;

  /**
   * When true the Capas FAB is positioned bottom-right (mobile FAB stack mode).
   * When false (desktop default) it sits bottom-right of the map area independently.
   * Parent controls placement via this flag so z-index/offset can be adjusted.
   */
  capasPosition?: 'bottom-right' | 'bottom-left';

  // ===== Phase 3: Scan candidate review layer (land + roof) =====

  /**
   * Scan candidates from the review queue (kind='roof' or 'land').
   * Rendered as purple/magenta polygons distinct from the existing detected-roof
   * candidates (DetectedRoofCandidate[]).  Named `scanCandidates` to avoid
   * collision with the existing `candidates: DetectedRoofCandidate[]` prop.
   */
  scanCandidates?: ScanCandidate[];

  /** Highlight this candidate with a cyan outline (width 3). */
  selectedCandidateId?: string;

  /** Fired when a candidate polygon is clicked on the map. */
  onCandidateClick?: (id: string) => void;

  /**
   * Scan tipo hint ('roof' | 'land').  When 'land' and the user has not yet
   * manually chosen a base style this session, the map defaults to satellite
   * (land parcels are hard to read on dark tiles).  The user's explicit choice
   * always wins — this only controls the *initial* default per tipo.
   */
  tipo?: 'roof' | 'land';

  // ===== Saved roofs layer =====

  /** Previously scanned roofs from the roof_scans table, fetched by parent. */
  savedRoofs?: SavedRoof[];

  /** When true (default), the saved roofs layer is visible. */
  showSavedRoofs?: boolean;

  /**
   * Fired when the user toggles the saved roofs layer via the Capas FAB.
   * The parent holds the showSavedRoofs state and must flip it on call.
   */
  onToggleSavedRoofs?: () => void;

  /**
   * Fired when the user clicks a saved roof polygon/circle on the map.
   * Parent can use this to open a lead detail sidebar or navigate.
   */
  onSavedRoofClick?: (roof: SavedRoof) => void;
}

interface HoverInfo {
  lng: number;
  lat: number;
  name: string;
  score: number;
  area: number;
  type: string;
}

const EMPTY_FILTER = ['==', ['get', 'id'], -1];

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// ===== OVERLAY LAYERS =====

type OverlayKey = 'grid' | 'datacenters';

const OVERLAY_LABEL_KEYS: Record<OverlayKey, string> = {
  grid: 'tools.scanner.mapLayers.overlayGrid',
  datacenters: 'tools.scanner.mapLayers.overlayDatacenters',
};

const OVERLAY_URLS: Record<OverlayKey, string> = {
  grid: '/data/grid-panama.geojson',
  datacenters: '/data/datacenters-panama.geojson',
};

// ===== SAVED ROOFS COLOR RAMP =====
// Color by kWp to surface outliers (abnormally large = likely merged OSM polygon)
// ≤30 kWp: normal residential (green)
// 30–100: large commercial (amber)
// >100: suspicious/oversized (red — likely merged OSM footprint)
const SAVED_ROOF_COLOR_EXPR: any = [
  'case',
  ['>', ['coalesce', ['get', 'kwp'], 0], 100],
  '#ef4444',
  ['>', ['coalesce', ['get', 'kwp'], 0], 30],
  '#f59e0b',
  '#22c55e',
];

// Quality accent: MEDIUM (AI-verified) → solid outline; ESTIMATED → dashed
// We encode quality as a numeric property: 1 = solid (MEDIUM/HIGH/BASE), 0 = dashed (ESTIMATED)
const SAVED_ROOF_OUTLINE_DASH: any = [
  'case',
  ['==', ['get', 'quality_solid'], 1],
  ['literal', [1, 0]],       // solid line
  ['literal', [2.5, 2]],     // dashed
];

// ===== SCORE LEGEND DATA =====

const SCORE_LEGEND = [
  { label: '90+', color: '#22c55e' },
  { label: '75', color: '#facc15' },
  { label: '50', color: '#f97316' },
  { label: '0', color: '#ef4444' },
];

// ===== CAPAS FAB =====
// Single floating action button for all map layer/style controls.
// Tap opens a compact popover; selecting a base style closes it,
// toggling an overlay keeps it open.

interface CapasFABProps {
  styleMode: StyleMode;
  onStyleChange: (mode: StyleMode) => void;
  overlayEnabled: Record<OverlayKey, boolean>;
  onToggleOverlay: (key: OverlayKey) => void;
  /** Whether the saved roofs layer is currently shown */
  showSavedRoofs: boolean;
  /** Toggle saved roofs visibility */
  onToggleSavedRoofs: () => void;
  /** Number of currently loaded saved roofs (for badge) */
  savedRoofsCount: number;
  /** Position class applied to the wrapper div */
  positionClass?: string;
}

function CapasFAB({
  styleMode,
  onStyleChange,
  overlayEnabled,
  onToggleOverlay,
  showSavedRoofs,
  onToggleSavedRoofs,
  savedRoofsCount,
  positionClass = 'absolute bottom-4 right-3',
}: CapasFABProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const anyOverlay = Object.values(overlayEnabled).some(Boolean) || showSavedRoofs;

  return (
    <div ref={ref} className={`${positionClass} z-20`}>
      <div className="relative">
        {/* FAB trigger — 44px minimum touch target */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen((v) => !v)}
          aria-label={t('tools.scanner.mapLayers.mapLayersAria')}
          style={{ minWidth: 44, minHeight: 44 }}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
            open || anyOverlay
              ? 'bg-[#00ffcc]/20 border border-[#00ffcc]/40 shadow-[0_0_14px_rgba(0,255,204,0.15)]'
              : 'bg-[#12121a]/90 border border-white/[0.08] hover:border-[#00ffcc]/25'
          }`}
        >
          <Layers className={`w-5 h-5 ${open || anyOverlay ? 'text-[#00ffcc]' : 'text-[#8888a0]'}`} />
        </motion.button>

        {/* Popover — opens upward from the FAB */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 right-0 w-48 rounded-2xl bg-[#12121a]/97 backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden"
              style={{ transformOrigin: 'bottom right' }}
            >
              {/* Base styles */}
              <div className="px-3 pt-3 pb-1">
                <p className="text-[9px] text-[#555566] uppercase tracking-widest font-semibold mb-2">
                  {t('tools.scanner.mapLayers.baseStyle')}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {STYLE_ORDER.map((mode) => {
                    const active = styleMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          onStyleChange(mode);
                          setOpen(false);
                        }}
                        className={`px-2 py-2 rounded-xl text-[11px] font-medium transition-all text-center leading-none ${
                          active
                            ? mode === 'sentinel'
                              ? 'bg-[#22d3ee]/15 text-[#22d3ee] border border-[#22d3ee]/30'
                              : 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/30'
                            : 'text-[#8888a0] hover:text-[#f0f0f5] border border-transparent hover:bg-white/[0.04]'
                        }`}
                      >
                        {t(STYLE_LABEL_KEYS[mode])}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mx-3 my-2 border-t border-white/[0.06]" />

              {/* Overlay toggles */}
              <div className="px-3 pb-3">
                <p className="text-[9px] text-[#555566] uppercase tracking-widest font-semibold mb-2">
                  {t('tools.scanner.mapLayers.layers')}
                </p>
                <div className="space-y-1">
                  {/* Saved roofs toggle */}
                  <button
                    onClick={onToggleSavedRoofs}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-[11px] font-medium transition-all text-left min-h-[44px] ${
                      showSavedRoofs
                        ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/25'
                        : 'text-[#8888a0] hover:text-[#f0f0f5] border border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                      style={{ background: '#22c55e', opacity: showSavedRoofs ? 1 : 0.35 }}
                    />
                    <span className="flex-1 min-w-0 truncate">
                      {t('tools.scanner.savedRoofsLayer.label', 'Techos guardados')}
                    </span>
                    {showSavedRoofs && savedRoofsCount > 0 && (
                      <span className="text-[9px] text-[#22c55e]/70 font-normal shrink-0">
                        {savedRoofsCount}
                      </span>
                    )}
                    <span
                      className={`ml-1 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                        showSavedRoofs ? 'border-transparent' : 'border-white/20'
                      }`}
                      style={showSavedRoofs ? { background: '#22c55e' } : {}}
                    >
                      {showSavedRoofs && <Check className="w-2.5 h-2.5 text-[#0a0a0f]" />}
                    </span>
                  </button>

                  {(Object.keys(OVERLAY_LABEL_KEYS) as OverlayKey[]).map((key) => {
                    const active = overlayEnabled[key];
                    const color = key === 'grid' ? '#f59e0b' : '#a855f7';
                    return (
                      <button
                        key={key}
                        onClick={() => onToggleOverlay(key)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-[11px] font-medium transition-all text-left min-h-[44px] ${
                          active
                            ? key === 'grid'
                              ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/25'
                              : 'bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/25'
                            : 'text-[#8888a0] hover:text-[#f0f0f5] border border-transparent hover:bg-white/[0.04]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                          style={{ background: color, opacity: active ? 1 : 0.35 }}
                        />
                        {t(OVERLAY_LABEL_KEYS[key])}
                        <span
                          className={`ml-auto w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                            active ? 'border-transparent' : 'border-white/20'
                          }`}
                          style={active ? { background: color } : {}}
                        >
                          {active && <Check className="w-2.5 h-2.5 text-[#0a0a0f]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ===== COMPONENT =====

export default function ScannerMap({
  buildings,
  selectedBuildingId,
  center,
  zoom,
  onBuildingSelect,
  onBoundsChange,
  searchMarker,
  measureMode = false,
  onMeasureModeChange,
  selectedBuildingCoordinates,
  selectedBuildingCenter,
  selectedScanId,
  onRoofDrawn,
  candidates = [],
  onConfirmCandidate,
  onRejectCandidate,
  parcelBoundary,
  panelRoofPolygon,
  capasPosition = 'bottom-right',
  scanCandidates = [],
  selectedCandidateId,
  onCandidateClick,
  tipo,
  savedRoofs = [],
  showSavedRoofs = true,
  onToggleSavedRoofs,
  onSavedRoofClick,
}: ScannerMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapRef>(null);

  // tipo-aware initial style: when tipo='land' and the user has no stored preference,
  // default to satellite (land parcels read better on aerial imagery).
  // Stored user choice always wins — we only influence the very first render.
  const [styleMode, setStyleMode] = useState<StyleMode>(() => {
    const stored = loadStoredStyle();
    // loadStoredStyle returns 'dark' as fallback when nothing is stored.
    // Distinguish "genuinely stored" vs "fallback dark" by re-reading localStorage.
    const hasStored = (() => {
      try { return localStorage.getItem(STYLE_STORAGE_KEY) !== null; } catch { return false; }
    })();
    if (!hasStored && tipo === 'land') return 'satellite';
    return stored;
  });
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [overlayPopup, setOverlayPopup] = useState<{ lng: number; lat: number; title: string; subtitle?: string } | null>(null);
  const isSatellite = styleMode === 'satellite' || styleMode === 'sentinel';
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom,
  });

  // ===== P2 draw state =====
  const [drawMode, setDrawMode] = useState(false);
  const [drawVertices, setDrawVertices] = useState<Array<[number, number]>>([]);
  const [cursorPos, setCursorPos] = useState<[number, number] | null>(null);
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const drawVerticesRef = useRef(drawVertices);
  drawVerticesRef.current = drawVertices;

  // ===== P3 candidate review state =====
  const [activeCandidate, setActiveCandidate] = useState<number | null>(null);

  // ===== Panel layout overlay state =====
  const panelLayout = usePanelLayout(panelRoofPolygon ?? null);

  // ===== Saved roof popup state =====
  const [savedRoofPopup, setSavedRoofPopup] = useState<{
    roof: SavedRoof;
    lng: number;
    lat: number;
  } | null>(null);

  // ===== Saved roofs as GeoJSON (polygon or circle fallback) =====
  const savedRoofsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    for (const r of savedRoofs) {
      const kwp = r.system_kwp ?? 0;
      // quality_solid: 1 = solid outline (MEDIUM/HIGH/BASE), 0 = dashed (ESTIMATED)
      const qualitySolid = r.quality === 'ESTIMATED' ? 0 : 1;

      if (r.roof_geom && r.roof_geom.type === 'Polygon') {
        features.push({
          type: 'Feature',
          geometry: r.roof_geom,
          properties: {
            id: r.id,
            kwp,
            quality: r.quality ?? 'ESTIMATED',
            quality_solid: qualitySolid,
            lead_id: r.lead_id ?? null,
            address: r.address ?? null,
            total_m2: r.total_roof_m2 ?? null,
            render_as: 'polygon',
          },
        });
      } else {
        // No polygon stored — render as a small point circle
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
          properties: {
            id: r.id,
            kwp,
            quality: r.quality ?? 'ESTIMATED',
            quality_solid: qualitySolid,
            lead_id: r.lead_id ?? null,
            address: r.address ?? null,
            total_m2: r.total_roof_m2 ?? null,
            render_as: 'point',
          },
        });
      }
    }
    return { type: 'FeatureCollection', features };
  }, [savedRoofs]);

  // ===== Overlay layers state =====
  const [overlayEnabled, setOverlayEnabled] = useState<Record<OverlayKey, boolean>>({
    grid: false,
    datacenters: false,
  });
  const [overlayData, setOverlayData] = useState<Record<OverlayKey, GeoJSON.FeatureCollection | null>>({
    grid: null,
    datacenters: null,
  });
  const overlayLoadedRef = useRef<Record<OverlayKey, boolean>>({ grid: false, datacenters: false });

  const toggleOverlay = useCallback((key: OverlayKey) => {
    setOverlayEnabled((prev) => {
      const next = !prev[key];
      if (next && !overlayLoadedRef.current[key]) {
        overlayLoadedRef.current[key] = true;
        fetch(OVERLAY_URLS[key])
          .then((r) => r.json())
          .then((data: GeoJSON.FeatureCollection) => {
            setOverlayData((d) => ({ ...d, [key]: data }));
          })
          .catch((err) => {
            console.error(`[ScannerMap] Failed to load overlay ${key}:`, err);
            overlayLoadedRef.current[key] = false;
          });
      }
      return { ...prev, [key]: next };
    });
  }, []);

  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);

  useEffect(() => {
    if (
      prevCenter.current[0] === center[0] &&
      prevCenter.current[1] === center[1] &&
      prevZoom.current === zoom
    ) return;

    prevCenter.current = center;
    prevZoom.current = zoom;

    const map = (mapRef.current as any)?.getMap?.();
    if (!map) return;
    map.flyTo({
      center: [center[0], center[1]],
      zoom,
      duration: 1200,
    });
  }, [center, zoom]);

  // ===== P1.1 Fit-to-bounds: once per result set =====
  const fitSignatureRef = useRef<string>('');
  useEffect(() => {
    const feats = buildings.features;
    if (feats.length === 0) {
      fitSignatureRef.current = '';
      return;
    }
    const firstId = (feats[0].properties as any)?.id ?? 0;
    const lastId = (feats[feats.length - 1].properties as any)?.id ?? 0;
    const signature = `${feats.length}:${firstId}:${lastId}`;
    if (signature === fitSignatureRef.current) return;
    fitSignatureRef.current = signature;

    const map = (mapRef.current as any)?.getMap?.();
    if (!map) return;

    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const f of feats) {
      const geom = f.geometry;
      if (geom?.type !== 'Polygon') continue;
      for (const ring of (geom as GeoJSON.Polygon).coordinates) {
        for (const [lng, lat] of ring) {
          if (lng < west) west = lng;
          if (lng > east) east = lng;
          if (lat < south) south = lat;
          if (lat > north) north = lat;
        }
      }
    }
    if (!isFinite(west) || !isFinite(south)) return;
    try {
      map.fitBounds(
        [[west, south], [east, north]],
        { padding: 80, maxZoom: 16, duration: 1000 }
      );
    } catch {
      /* ignore */
    }
  }, [buildings]);

  // ===== P1.2 Fly-to-selected =====
  const prevSelectedRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedBuildingId == null) {
      prevSelectedRef.current = null;
      return;
    }
    if (prevSelectedRef.current === selectedBuildingId) return;
    prevSelectedRef.current = selectedBuildingId;

    const map = (mapRef.current as any)?.getMap?.();
    if (!map || !selectedBuildingCenter) return;
    map.flyTo({
      center: [selectedBuildingCenter.lng, selectedBuildingCenter.lat],
      zoom: Math.max(map.getZoom?.() ?? 16, 16.5),
      duration: 900,
    });
  }, [selectedBuildingId, selectedBuildingCenter]);

  // ===== P1.3 Persist style on change =====
  useEffect(() => {
    try {
      localStorage.setItem(STYLE_STORAGE_KEY, styleMode);
    } catch {
      /* ignore */
    }
  }, [styleMode]);

  const selectedFilter = selectedBuildingId != null
    ? ['==', ['get', 'id'], selectedBuildingId]
    : EMPTY_FILTER;

  const hoverFilter = hoveredId != null
    ? ['==', ['get', 'id'], hoveredId]
    : EMPTY_FILTER;

  const selectedLineWidth = measureMode ? 4 : 3;

  // ===== Candidates as GeoJSON =====
  const candidatesGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    candidates.forEach((c, idx) => {
      if (!c.roofGeom || c.roofGeom.type !== 'Polygon') return;
      features.push({
        type: 'Feature',
        geometry: c.roofGeom as GeoJSON.Polygon,
        properties: { idx, area: Math.round(c.totalRoofM2), kwp: c.systemKwp },
      });
    });
    return { type: 'FeatureCollection', features };
  }, [candidates]);

  // ===== Phase 3: Scan candidates GeoJSON (land + roof) =====
  const scanCandidatesGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    for (const c of scanCandidates) {
      let geometry: GeoJSON.Polygon;
      if (c.geom && c.geom.type === 'Polygon') {
        geometry = c.geom;
      } else {
        // Synthesize a square footprint from lat/lng + area_m2
        geometry = {
          type: 'Polygon',
          coordinates: [syntheticSquareRing(c.lat, c.lng, c.area_m2)],
        };
      }
      const fill =
        c.kind === 'land'
          ? (LAND_TIER_FILL[c.tier ?? ''] ?? LAND_DEFAULT_FILL)
          : '#a855f7';
      const outline =
        c.kind === 'land'
          ? (LAND_TIER_OUTLINE[c.tier ?? ''] ?? LAND_DEFAULT_OUTLINE)
          : '#a855f7';
      features.push({
        type: 'Feature',
        geometry,
        properties: {
          id: c.id,
          kind: c.kind,
          tier: c.tier ?? null,
          fill,
          outline,
          selected: c.id === selectedCandidateId ? 1 : 0,
          label: c.address ?? (c.kind === 'land' ? 'Terreno' : 'Techo'),
          area_m2: Math.round(c.area_m2),
          kwp: c.kwp ?? null,
          mwp: c.mwp ?? null,
          grade: c.grade ?? null,
        },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [scanCandidates, selectedCandidateId]);

  // ===== Live draw polygon =====
  const drawGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (drawVertices.length === 0) return EMPTY_FC;
    const ring: Array<[number, number]> = [...drawVertices];
    if (cursorPos) ring.push(cursorPos);
    const lineFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: ring },
      properties: {},
    };
    const features: GeoJSON.Feature[] = [lineFeature];
    if (drawVertices.length >= 3) {
      const closed = [...ring, ring[0]];
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [closed] },
        properties: {},
      });
    }
    return { type: 'FeatureCollection', features };
  }, [drawVertices, cursorPos]);

  const drawVertexGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    return {
      type: 'FeatureCollection',
      features: drawVertices.map((v) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: v },
        properties: {},
      })),
    };
  }, [drawVertices]);

  // ===== P2: finish drawing =====
  const finishDrawing = useCallback(() => {
    const verts = drawVerticesRef.current;
    if (verts.length < 3) {
      setDrawMode(false);
      setDrawVertices([]);
      setCursorPos(null);
      return;
    }
    const closed: [number, number][] = [...verts, verts[0]];
    const polygon: GeoJSONPolygon = { type: 'Polygon', coordinates: [closed] };
    const areaSqm = calculatePolygonArea(verts.map(([lng, lat]) => ({ lat, lon: lng })));
    const kwp = computeEstimatedKwp(areaSqm);

    setDrawMode(false);
    setDrawVertices([]);
    setCursorPos(null);
    onRoofDrawn?.({ polygon, areaSqm: Math.round(areaSqm), kwp });
  }, [onRoofDrawn]);

  const cancelDrawing = useCallback(() => {
    setDrawMode(false);
    setDrawVertices([]);
    setCursorPos(null);
  }, []);

  const toggleDraw = useCallback(() => {
    setDrawMode((prev) => {
      if (prev) {
        setDrawVertices([]);
        setCursorPos(null);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!drawMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishDrawing();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelDrawing();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawMode, finishDrawing, cancelDrawing]);

  // ===== Map interactions =====

  const handleClick = useCallback(
    (e: {
      features?: Array<{ properties?: Record<string, unknown>; layer?: { id?: string } }>;
      lngLat?: { lng: number; lat: number };
    }) => {
      if (drawModeRef.current) {
        if (e.lngLat) {
          setDrawVertices((prev) => [...prev, [e.lngLat!.lng, e.lngLat!.lat]]);
        }
        return;
      }

      // Saved roofs layer click
      const savedRoofFeat = e.features?.find(
        (f) => f.layer?.id === 'saved-roofs-hit' || f.layer?.id === 'saved-roofs-point-hit'
      );
      if (savedRoofFeat?.properties?.id != null && e.lngLat) {
        const roofId = savedRoofFeat.properties.id as string;
        const matchedRoof = savedRoofs.find((r) => r.id === roofId);
        if (matchedRoof) {
          setSavedRoofPopup({ roof: matchedRoof, lng: e.lngLat.lng, lat: e.lngLat.lat });
          onSavedRoofClick?.(matchedRoof);
        }
        return;
      }

      const overlayFeat = e.features?.find((f) =>
        f.layer?.id === 'grid-lines' ||
        f.layer?.id === 'grid-substations' ||
        f.layer?.id === 'dc-circles'
      );
      if (overlayFeat && e.lngLat) {
        const p = (overlayFeat.properties ?? {}) as Record<string, unknown>;
        const layerId = overlayFeat.layer?.id;
        let title: string = (p.name as string) || (layerId === 'dc-circles' ? t('tools.scanner.map.dataCenter') : t('tools.scanner.map.transmissionLine'));
        let subtitle: string | undefined;
        if (layerId === 'grid-lines') {
          const parts: string[] = [];
          if (p.voltage) parts.push(`${parseInt(p.voltage as string, 10) / 1000} kV`);
          if (p.operator) parts.push(p.operator as string);
          subtitle = parts.join(' · ') || undefined;
        } else if (layerId === 'grid-substations') {
          const parts: string[] = [t('tools.scanner.map.substation')];
          if (p.voltage) parts.push(`${parseInt(p.voltage as string, 10) / 1000} kV`);
          if (p.operator) parts.push(p.operator as string);
          subtitle = parts.join(' · ');
        } else if (layerId === 'dc-circles') {
          const parts: string[] = [];
          if (p.operator) parts.push(p.operator as string);
          if (p.source === 'osm') parts.push('OSM');
          subtitle = parts.join(' · ') || undefined;
        }
        setOverlayPopup({ lng: e.lngLat.lng, lat: e.lngLat.lat, title, subtitle });
        return;
      }
      setOverlayPopup(null);
      setSavedRoofPopup(null);

      // Phase 3 scan-candidate layer click
      const scanCandFeat = e.features?.find((f) => f.layer?.id === 'scan-candidates-fill');
      if (scanCandFeat?.properties?.id != null) {
        onCandidateClick?.(scanCandFeat.properties.id as string);
        return;
      }

      const candFeat = e.features?.find((f) => f.layer?.id === 'candidates-fill');
      if (candFeat?.properties?.idx != null) {
        setActiveCandidate(candFeat.properties.idx as number);
        return;
      }

      const feature = e.features?.find((f) => f.layer?.id === 'buildings-fill') ?? e.features?.[0];
      if (feature?.properties?.id != null) {
        onBuildingSelect(feature.properties.id as number);
      }
    },
    [onBuildingSelect, savedRoofs, onSavedRoofClick]
  );

  const handleDblClick = useCallback(
    (e: {
      features?: Array<{ properties?: Record<string, unknown> }>;
      preventDefault?: () => void;
    }) => {
      if (drawModeRef.current) {
        e.preventDefault?.();
        finishDrawing();
        return;
      }
      const feature = e.features?.[0];
      if (feature?.properties?.id != null) {
        e.preventDefault?.();
        onBuildingSelect(feature.properties.id as number);
      }
    },
    [onBuildingSelect, finishDrawing]
  );

  const handleMouseEnter = useCallback(
    (e: { features?: Array<{ properties?: Record<string, unknown>; geometry?: any }> ; lngLat?: { lng: number; lat: number } }) => {
      if (drawModeRef.current) return;
      const feature = e.features?.[0];
      if (feature?.properties?.id != null) {
        setHoveredId(feature.properties.id as number);
        setHoverInfo({
          lng: e.lngLat?.lng ?? 0,
          lat: e.lngLat?.lat ?? 0,
          name: (feature.properties.name as string) || t('tools.scanner.map.buildingFallback'),
          score: (feature.properties.score as number) || 0,
          area: (feature.properties.area as number) || 0,
          type: (feature.properties.type as string) || 'building',
        });
        const map = (mapRef.current as any)?.getMap?.();
        if (map) map.getCanvas().style.cursor = 'pointer';
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: { features?: Array<{ properties?: Record<string, unknown> }> ; lngLat?: { lng: number; lat: number } }) => {
      if (drawModeRef.current) {
        if (e.lngLat) setCursorPos([e.lngLat.lng, e.lngLat.lat]);
        return;
      }
      const feature = e.features?.[0];
      if (feature?.properties?.id != null && e.lngLat) {
        setHoverInfo((prev) => prev ? { ...prev, lng: e.lngLat!.lng, lat: e.lngLat!.lat } : prev);
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    if (drawModeRef.current) return;
    setHoveredId(null);
    setHoverInfo(null);
    const map = (mapRef.current as any)?.getMap?.();
    if (map) map.getCanvas().style.cursor = '';
  }, []);

  const handleMoveEnd = useCallback(() => {
    const map = (mapRef.current as any)?.getMap?.();
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    onBoundsChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }, [onBoundsChange]);

  useEffect(() => {
    const map = (mapRef.current as any)?.getMap?.();
    if (!map) return;
    if (drawMode) {
      map.doubleClickZoom?.disable?.();
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.doubleClickZoom?.enable?.();
      map.getCanvas().style.cursor = '';
    }
    return () => {
      const m = (mapRef.current as any)?.getMap?.();
      if (m) {
        m.doubleClickZoom?.enable?.();
        m.getCanvas().style.cursor = '';
      }
    };
  }, [drawMode]);

  const toggleMeasure = useCallback(() => {
    onMeasureModeChange?.(!measureMode);
  }, [measureMode, onMeasureModeChange]);

  const interactiveLayerIds = [
    'buildings-fill',
    'candidates-fill',
    'scan-candidates-fill',
    'saved-roofs-hit',
    'saved-roofs-point-hit',
    'grid-lines',
    'grid-substations',
    'dc-circles',
  ];
  const buildingCount = buildings.features.length;

  const activeCand = activeCandidate != null ? candidates[activeCandidate] : null;
  const activeCandCenter = activeCand
    ? { lng: activeCand.lng, lat: activeCand.lat }
    : null;

  // Capas FAB position — bottom-right by default, or custom
  const capasPosClass = capasPosition === 'bottom-left'
    ? 'absolute bottom-4 left-3'
    : 'absolute bottom-4 right-3';

  return (
    <div className="relative w-full h-full scanner-map-wrap">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        onMoveEnd={handleMoveEnd}
        onClick={handleClick}
        onDblClick={handleDblClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        interactiveLayerIds={interactiveLayerIds}
        mapStyle={STYLE_MAP[styleMode] as any}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        maxZoom={21}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        <GeolocateControl
          position="top-right"
          trackUserLocation={false}
          showAccuracyCircle={false}
        />

        {/* Building polygons */}
        <Source id="buildings" type="geojson" data={buildings}>
          <Layer
            id="buildings-fill"
            type="fill"
            paint={{
              'fill-color': SCORE_FILL_COLOR,
              'fill-opacity': [
                'case',
                ['==', ['get', 'id'], hoveredId ?? -1],
                isSatellite ? 0.65 : 0.7,
                isSatellite ? 0.45 : 0.5,
              ],
            }}
          />
          <Layer
            id="buildings-outline"
            type="line"
            filter={['!', ['to-boolean', ['get', 'synthetic']]]}
            paint={{
              'line-color': isSatellite ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
              'line-width': isSatellite ? 2 : 1,
            }}
          />
          <Layer
            id="buildings-outline-synthetic"
            type="line"
            filter={['to-boolean', ['get', 'synthetic']]}
            paint={{
              'line-color': isSatellite ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)',
              'line-width': isSatellite ? 2 : 1,
              'line-dasharray': [2, 2],
            }}
          />
          <Layer
            id="buildings-hover"
            type="line"
            filter={hoverFilter as any}
            paint={{
              'line-color': isSatellite ? '#00ffcc' : 'rgba(255,255,255,0.6)',
              'line-width': isSatellite ? 3 : 2,
            }}
          />
          <Layer
            id="selected-building"
            type="line"
            filter={selectedFilter as any}
            paint={{
              'line-color': '#00ffcc',
              'line-width': selectedLineWidth,
            }}
          />
          <Layer
            id="selected-building-fill"
            type="fill"
            filter={selectedFilter as any}
            paint={{
              'fill-color': '#00ffcc',
              'fill-opacity': 0.18,
            }}
          />
          <Layer
            id="selected-building-label"
            type="symbol"
            filter={selectedFilter as any}
            layout={{
              'text-field': ['concat', ['to-string', ['get', 'area']], ' m²'],
              'text-size': 13,
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-allow-overlap': true,
            }}
            paint={{
              'text-color': '#ffffff',
              'text-halo-color': '#0a0a0f',
              'text-halo-width': 2,
            }}
          />
        </Source>

        {/* P3: Candidate roofs */}
        <Source id="candidates" type="geojson" data={candidatesGeoJSON}>
          <Layer
            id="candidates-fill"
            type="fill"
            paint={{ 'fill-color': '#a855f7', 'fill-opacity': 0.18 }}
          />
          <Layer
            id="candidates-outline"
            type="line"
            paint={{
              'line-color': '#a855f7',
              'line-width': 2.5,
              'line-dasharray': [2, 2],
            }}
          />
        </Source>

        {/* Phase 3: Scan candidate review layer (land + roof) */}
        {/* Uses data-driven fill/outline colors so tier coloring works without
            separate sources. Selected candidate gets a bright cyan outline via
            the 'scan-candidates-selected-outline' layer (filtered by selected=1). */}
        <Source id="scan-candidates" type="geojson" data={scanCandidatesGeoJSON}>
          {/* Roof candidates: purple fill 0.25 */}
          <Layer
            id="scan-candidates-roof-fill"
            type="fill"
            filter={['==', ['get', 'kind'], 'roof']}
            paint={{
              'fill-color': '#a855f7',
              'fill-opacity': 0.25,
            }}
          />
          {/* Roof candidates: purple dashed outline */}
          <Layer
            id="scan-candidates-roof-outline"
            type="line"
            filter={['==', ['get', 'kind'], 'roof']}
            paint={{
              'line-color': '#a855f7',
              'line-width': 1.5,
              'line-dasharray': [2, 2],
            }}
          />
          {/* Land candidates: tier-colored fill 0.30 (data-driven via 'fill' property) */}
          <Layer
            id="scan-candidates-land-fill"
            type="fill"
            filter={['==', ['get', 'kind'], 'land']}
            paint={{
              'fill-color': ['get', 'fill'],
              'fill-opacity': 0.3,
            }}
          />
          {/* Land candidates: tier-colored dashed outline (data-driven via 'outline' property) */}
          <Layer
            id="scan-candidates-land-outline"
            type="line"
            filter={['==', ['get', 'kind'], 'land']}
            paint={{
              'line-color': ['get', 'outline'],
              'line-width': 1.5,
              'line-dasharray': [2, 2],
            }}
          />
          {/* Invisible wider fill for hit-testing — covers both kinds */}
          <Layer
            id="scan-candidates-fill"
            type="fill"
            paint={{
              'fill-color': '#000000',
              'fill-opacity': 0,
            }}
          />
          {/* Selected candidate highlight — cyan outline, width 3 */}
          <Layer
            id="scan-candidates-selected-outline"
            type="line"
            filter={['==', ['get', 'selected'], 1]}
            paint={{
              'line-color': '#00ffcc',
              'line-width': 3,
              'line-opacity': 1,
            }}
          />
        </Source>

        {/* P2: Live draw overlay */}
        <Source id="roof-draw" type="geojson" data={drawGeoJSON}>
          <Layer
            id="roof-draw-fill"
            type="fill"
            filter={['==', ['geometry-type'], 'Polygon']}
            paint={{ 'fill-color': '#00ffcc', 'fill-opacity': 0.12 }}
          />
          <Layer
            id="roof-draw-line"
            type="line"
            filter={['==', ['geometry-type'], 'LineString']}
            paint={{ 'line-color': '#00ffcc', 'line-width': 2 }}
          />
        </Source>
        <Source id="roof-draw-vertices" type="geojson" data={drawVertexGeoJSON}>
          <Layer
            id="roof-draw-vertex-dots"
            type="circle"
            paint={{
              'circle-radius': 4,
              'circle-color': '#0a0a0f',
              'circle-stroke-color': '#00ffcc',
              'circle-stroke-width': 2,
            }}
          />
        </Source>

        <ParcelBoundaryLayer boundary={parcelBoundary} />

        {/* ===== SAVED ROOFS LAYER ===== */}
        {/* Separate source/layer from scan_candidates (purple) — uses green/amber/red kWp ramp */}
        {showSavedRoofs && (
          <Source id="saved-roofs" type="geojson" data={savedRoofsGeoJSON}>
            {/* Polygon fill — green/amber/red by kWp */}
            <Layer
              id="saved-roofs-polygon-fill"
              type="fill"
              filter={['==', ['get', 'render_as'], 'polygon']}
              paint={{
                'fill-color': SAVED_ROOF_COLOR_EXPR,
                'fill-opacity': 0.35,
              }}
            />
            {/* Polygon outline — solid for MEDIUM/HIGH/BASE, dashed for ESTIMATED */}
            <Layer
              id="saved-roofs-polygon-outline"
              type="line"
              filter={['==', ['get', 'render_as'], 'polygon']}
              paint={{
                'line-color': SAVED_ROOF_COLOR_EXPR,
                'line-width': 1.5,
                'line-dasharray': SAVED_ROOF_OUTLINE_DASH,
              }}
            />
            {/* Point circle for roofs without stored geometry */}
            <Layer
              id="saved-roofs-point"
              type="circle"
              filter={['==', ['get', 'render_as'], 'point']}
              paint={{
                'circle-radius': 5,
                'circle-color': SAVED_ROOF_COLOR_EXPR,
                'circle-opacity': 0.8,
                'circle-stroke-color': SAVED_ROOF_COLOR_EXPR,
                'circle-stroke-width': 1,
                'circle-stroke-opacity': 1,
              }}
            />
            {/* Invisible wider polygon fill for hit-testing */}
            <Layer
              id="saved-roofs-hit"
              type="fill"
              filter={['==', ['get', 'render_as'], 'polygon']}
              paint={{ 'fill-color': '#000000', 'fill-opacity': 0 }}
            />
            {/* Invisible wider circle for hit-testing */}
            <Layer
              id="saved-roofs-point-hit"
              type="circle"
              filter={['==', ['get', 'render_as'], 'point']}
              paint={{ 'circle-radius': 10, 'circle-opacity': 0 }}
            />
          </Source>
        )}

        {/* OVERLAY: Red eléctrica */}
        {overlayEnabled.grid && (
          <Source id="grid-overlay" type="geojson" data={overlayData.grid ?? EMPTY_FC}>
            <Layer
              id="grid-lines"
              type="line"
              filter={['==', ['geometry-type'], 'LineString']}
              paint={{
                'line-color': [
                  'case',
                  ['>=', ['to-number', ['get', 'voltage'], 0], 200000],
                  '#f59e0b',
                  '#fbbf24',
                ],
                'line-width': [
                  'case',
                  ['>=', ['to-number', ['get', 'voltage'], 0], 200000],
                  2.5,
                  1.5,
                ],
                'line-opacity': 0.85,
              }}
            />
            <Layer
              id="grid-substations"
              type="circle"
              filter={['==', ['geometry-type'], 'Point']}
              paint={{
                'circle-radius': 5,
                'circle-color': '#f59e0b',
                'circle-stroke-color': '#0a0a0f',
                'circle-stroke-width': 1.5,
                'circle-opacity': 0.9,
              }}
            />
          </Source>
        )}

        {/* OVERLAY: Data centers */}
        {overlayEnabled.datacenters && (
          <Source id="dc-overlay" type="geojson" data={overlayData.datacenters ?? EMPTY_FC}>
            <Layer
              id="dc-circles"
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': [
                  'case',
                  ['==', ['get', 'source'], 'osm'],
                  '#22d3ee',
                  '#a855f7',
                ],
                'circle-stroke-color': '#0a0a0f',
                'circle-stroke-width': 1.5,
                'circle-opacity': 0.9,
              }}
            />
          </Source>
        )}

        <PanelLayoutOverlay
          roofPolygon={panelLayout.roofPolygon ?? undefined}
          visible={panelLayout.visible}
        />

        {measureMode && selectedBuildingId != null && selectedBuildingCoordinates && selectedBuildingCoordinates.length > 2 && (
          <BuildingDimensions coordinates={selectedBuildingCoordinates} />
        )}

        {/* Building hover tooltip */}
        {hoverInfo && hoveredId != null && !drawMode && (
          <Marker
            longitude={hoverInfo.lng}
            latitude={hoverInfo.lat}
            anchor="bottom"
            offset={[0, -10] as [number, number]}
          >
            <div
              className="pointer-events-none px-3 py-2 text-xs space-y-0.5 shadow-lg"
              style={{
                background: '#12121aee',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                whiteSpace: 'nowrap',
              }}
            >
              <div className="font-semibold text-[#f0f0f5] truncate max-w-[200px]">
                {hoverInfo.name}
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="capitalize text-[#8888a0]">{hoverInfo.type}</span>
                <span className="text-[#555566]">{Math.round(hoverInfo.area)} m²</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {(() => {
                  const g = getGradeFromScore(hoverInfo.score);
                  return (
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: g.color }}
                      />
                      <span style={{ color: g.color }}>
                        {t('tools.scanner.map.gradeScore', { grade: g.grade, score: hoverInfo.score })}
                      </span>
                    </span>
                  );
                })()}
              </div>
              <div className="text-[10px] text-[#555566] pt-0.5">{t('tools.scanner.map.clickToSelect')}</div>
            </div>
          </Marker>
        )}

        {/* P3: Candidate review popup */}
        {activeCand && activeCandCenter && (
          <Marker
            longitude={activeCandCenter.lng}
            latitude={activeCandCenter.lat}
            anchor="bottom"
            offset={[0, -8] as [number, number]}
          >
            <div
              className="px-3 py-2.5 text-xs shadow-lg w-[220px]"
              style={{
                background: '#12121aee',
                borderRadius: 10,
                border: '1px solid rgba(168,85,247,0.4)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="font-semibold text-[#f0f0f5] truncate mb-1.5">
                {activeCand.address || t('tools.scanner.map.detectedRoofFallback')}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8888a0] mb-2">
                <span>{Math.round(activeCand.totalRoofM2).toLocaleString()} m²</span>
                <span className="text-[#a855f7]">~{activeCand.systemKwp} kWp</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    if (activeCandidate != null) onConfirmCandidate?.(activeCandidate);
                    setActiveCandidate(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/25 transition-colors text-[11px] font-medium"
                >
                  <Check className="w-3 h-3" /> {t('tools.scanner.map.confirm')}
                </button>
                <button
                  onClick={() => {
                    if (activeCandidate != null) onRejectCandidate?.(activeCandidate);
                    setActiveCandidate(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#ef4444]/15 text-[#ef4444] hover:bg-[#ef4444]/25 transition-colors text-[11px] font-medium"
                >
                  <X className="w-3 h-3" /> {t('tools.scanner.review.reject')}
                </button>
              </div>
            </div>
          </Marker>
        )}

        {/* Overlay feature popup (grid / datacenter) */}
        {overlayPopup && (
          <Marker
            longitude={overlayPopup.lng}
            latitude={overlayPopup.lat}
            anchor="bottom"
            offset={[0, -8] as [number, number]}
          >
            <div
              className="relative px-3 py-2 text-xs shadow-lg"
              style={{
                background: '#12121aee',
                borderRadius: 8,
                border: '1px solid rgba(245,158,11,0.3)',
                backdropFilter: 'blur(8px)',
                maxWidth: 220,
              }}
            >
              <div className="font-semibold text-[#f0f0f5] truncate mb-0.5 pr-4">{overlayPopup.title}</div>
              {overlayPopup.subtitle && (
                <div className="text-[10px] text-[#8888a0]">{overlayPopup.subtitle}</div>
              )}
              <button
                onClick={() => setOverlayPopup(null)}
                className="absolute top-1 right-1.5 text-[#555566] hover:text-[#8888a0] text-[10px]"
              >
                ✕
              </button>
            </div>
          </Marker>
        )}

        {/* Saved roof popup */}
        {savedRoofPopup && (
          <Marker
            longitude={savedRoofPopup.lng}
            latitude={savedRoofPopup.lat}
            anchor="bottom"
            offset={[0, -8] as [number, number]}
          >
            <div
              className="relative px-3 py-2.5 text-xs shadow-lg w-[240px]"
              style={{
                background: '#12121aee',
                borderRadius: 10,
                border: '1px solid rgba(34,197,94,0.35)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <button
                onClick={() => setSavedRoofPopup(null)}
                className="absolute top-1.5 right-2 text-[#555566] hover:text-[#8888a0] text-[10px]"
                aria-label={t('tools.scanner.savedRoofsLayer.closePopup', 'Cerrar')}
              >
                ✕
              </button>
              <div className="font-semibold text-[#f0f0f5] truncate mb-1 pr-4">
                {savedRoofPopup.roof.address || t('tools.scanner.savedRoofsLayer.unnamed', 'Techo guardado')}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-[#8888a0] mb-2">
                {savedRoofPopup.roof.system_kwp != null && (
                  <>
                    <span>{t('tools.scanner.savedRoofsLayer.kwp', 'Sistema')}</span>
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          savedRoofPopup.roof.system_kwp > 100
                            ? '#ef4444'
                            : savedRoofPopup.roof.system_kwp > 30
                            ? '#f59e0b'
                            : '#22c55e',
                      }}
                    >
                      {savedRoofPopup.roof.system_kwp.toFixed(1)} kWp
                      {savedRoofPopup.roof.system_kwp > 100 && (
                        <span className="ml-1 text-[9px] text-[#ef4444]/80">
                          {t('tools.scanner.savedRoofsLayer.suspicious', '⚠ sospechoso')}
                        </span>
                      )}
                    </span>
                  </>
                )}
                {savedRoofPopup.roof.total_roof_m2 != null && (
                  <>
                    <span>{t('tools.scanner.savedRoofsLayer.area', 'Área')}</span>
                    <span className="text-[#f0f0f5]">
                      {Math.round(savedRoofPopup.roof.total_roof_m2).toLocaleString()} m²
                    </span>
                  </>
                )}
                {savedRoofPopup.roof.quality && (
                  <>
                    <span>{t('tools.scanner.savedRoofsLayer.quality', 'Calidad')}</span>
                    <span className="text-[#f0f0f5] capitalize">
                      {savedRoofPopup.roof.quality.toLowerCase()}
                    </span>
                  </>
                )}
              </div>
              {savedRoofPopup.roof.lead_id && (
                <a
                  href={`/leads/${savedRoofPopup.roof.lead_id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/25 transition-colors text-[11px] font-medium"
                >
                  {t('tools.scanner.savedRoofsLayer.viewLead', 'Ver lead')}
                </a>
              )}
            </div>
          </Marker>
        )}

        {/* Search pin marker */}
        {searchMarker && (
          <Marker
            longitude={searchMarker.lng}
            latitude={searchMarker.lat}
            anchor="bottom"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full bg-[#00ffcc]/20 animate-ping" />
              <div className="absolute w-8 h-8 rounded-full bg-[#00ffcc]/25" />
              <svg width="32" height="40" viewBox="0 0 32 40" fill="none" className="relative drop-shadow-lg">
                <path
                  d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"
                  fill="#00ffcc"
                />
                <circle cx="16" cy="15" r="6" fill="#0a0a0f" />
              </svg>
            </div>
          </Marker>
        )}
      </Map>

      {/* ===== MAP CONTROLS (measure + draw) — top-right, below nav controls ===== */}
      {/* These sit in the map, the parent's FAB stack (mobile) or can be hidden on mobile
          because the parent exposes them via the mode switcher. We keep them visible
          on desktop only. */}
      <div className="hidden md:flex absolute top-[6.5rem] right-3 z-10 flex-col gap-2">
        {/* Measure toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMeasure}
          style={{ minWidth: 44, minHeight: 44 }}
          className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all shadow-md ${
            measureMode
              ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/40 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
              : 'bg-[#12121a]/90 border-white/[0.08] hover:border-[#8b5cf6]/25'
          }`}
          title={measureMode ? t('tools.scanner.map.measureOff') : t('tools.scanner.map.measureOn')}
        >
          <Ruler className={`w-5 h-5 ${measureMode ? 'text-[#8b5cf6]' : 'text-[#8888a0]'}`} />
        </motion.button>

        {/* Draw Roof toggle — only when a building is selected */}
        {selectedBuildingId != null && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDraw}
            style={{ minWidth: 44, minHeight: 44 }}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all shadow-md ${
              drawMode
                ? 'bg-[#00ffcc]/20 border-[#00ffcc]/40 shadow-[0_0_12px_rgba(0,255,204,0.15)]'
                : 'bg-[#12121a]/90 border-white/[0.08] hover:border-[#00ffcc]/25'
            }`}
            title={drawMode ? t('tools.scanner.map.cancelDrawing') : t('tools.scanner.map.drawRoof')}
          >
            <PencilRuler className={`w-5 h-5 ${drawMode ? 'text-[#00ffcc]' : 'text-[#8888a0]'}`} />
          </motion.button>
        )}
      </div>

      {/* ===== DRAW MODE HINT BANNER ===== */}
      <AnimatePresence>
        {drawMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#12121a]/90 backdrop-blur-xl border border-[#00ffcc]/20 max-w-[90vw]"
          >
            <PencilRuler className="w-4 h-4 text-[#00ffcc] shrink-0" />
            <span className="text-xs text-[#f0f0f5]">
              {drawVertices.length < 3
                ? t('tools.scanner.map.clickToAddPoints', { count: drawVertices.length })
                : t('tools.scanner.map.doubleClickToFinish')}
            </span>
            {drawVertices.length >= 3 && (
              <button
                onClick={finishDrawing}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00ffcc]/15 text-[#00ffcc] hover:bg-[#00ffcc]/25 transition-colors text-[11px] font-medium shrink-0"
              >
                <Check className="w-3 h-3" /> {t('tools.scanner.map.done')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Buildings found counter — top-center ===== */}
      <AnimatePresence>
        {buildingCount > 0 && !drawMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]"
          >
            <Building2 className="w-3.5 h-3.5 text-[#8888a0]" />
            <span className="text-xs font-medium text-[#f0f0f5]">
              {t('tools.scanner.map.buildingsFound', { count: buildingCount })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BOTTOM-RIGHT: Solar score legend ===== */}
      <AnimatePresence>
        {(buildingCount > 0 || candidates.length > 0 || scanCandidates.length > 0 || (showSavedRoofs && savedRoofs.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 right-3 z-10 px-3 py-2.5 rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]"
          >
            <div className="text-[10px] text-[#555566] uppercase tracking-wider mb-2 font-semibold">
              {t('tools.scanner.map.solarScoreLabel')}
            </div>
            <div className="space-y-1.5">
              {SCORE_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
                  <span className="text-[10px] text-[#8888a0] font-medium">{item.label}</span>
                </div>
              ))}
            </div>
            {showSavedRoofs && savedRoofs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <div className="text-[9px] text-[#555566] uppercase tracking-wider mb-1.5 font-semibold">
                  {t('tools.scanner.savedRoofsLayer.label', 'Techos guardados')}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: '#22c55e', opacity: 0.7 }} />
                    <span className="text-[10px] text-[#8888a0]">≤30 kWp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: '#f59e0b', opacity: 0.7 }} />
                    <span className="text-[10px] text-[#8888a0]">30–100 kWp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: '#ef4444', opacity: 0.7 }} />
                    <span className="text-[10px] text-[#8888a0]">{t('tools.scanner.savedRoofsLayer.suspicious', '>100 kWp ⚠')}</span>
                  </div>
                </div>
              </div>
            )}
            {candidates.length > 0 && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                <div className="w-3 h-3 rounded-sm border-2 border-dashed border-[#a855f7]" />
                <span className="text-[10px] text-[#8888a0] font-medium">{t('tools.scanner.map.detected')}</span>
              </div>
            )}
            {scanCandidates.some((c) => c.kind === 'roof') && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                <div className="w-3 h-3 rounded-sm border-2 border-dashed border-[#a855f7]" style={{ background: 'rgba(168,85,247,0.25)' }} />
                <span className="text-[10px] text-[#8888a0] font-medium">{t('tools.scanner.map.roofUnderReview')}</span>
              </div>
            )}
            {scanCandidates.some((c) => c.kind === 'land') && (
              <>
                <div className="text-[9px] text-[#555566] uppercase tracking-wider mt-2 pt-2 border-t border-white/[0.06] font-semibold">
                  {t('tools.scanner.topnav.lands')}
                </div>
                {(['comercial', 'agro', 'utility'] as const).map((tier) =>
                  scanCandidates.some((c) => c.tier === tier) ? (
                    <div key={tier} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm border-2 border-dashed"
                        style={{
                          background: `${LAND_TIER_FILL[tier]}44`,
                          borderColor: LAND_TIER_OUTLINE[tier],
                        }}
                      />
                      <span className="text-[10px] text-[#8888a0] font-medium capitalize">{t(`tools.scanner.review.tier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}</span>
                    </div>
                  ) : null
                )}
                {scanCandidates.some((c) => c.kind === 'land' && !c.tier) && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm border-2 border-dashed"
                      style={{ background: `${LAND_DEFAULT_FILL}44`, borderColor: LAND_DEFAULT_OUTLINE }}
                    />
                    <span className="text-[10px] text-[#8888a0] font-medium">{t('tools.scanner.review.landLabel')}</span>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No-scan-id guard hint */}
      {drawMode && selectedScanId == null && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/30 text-[10px] text-[#f59e0b]">
          {t('tools.scanner.map.roofSavedOnFinish')}
        </div>
      )}

      {/* Panel layout badge */}
      {!drawMode && panelLayout.roofPolygon && (
        <div className="absolute bottom-28 right-3 z-10">
          <PanelLayoutBadge
            roofPolygon={panelLayout.roofPolygon}
            visible={panelLayout.visible}
            onToggle={panelLayout.toggle}
          />
        </div>
      )}

      {/* ===== CAPAS FAB — single unified layer/style control ===== */}
      <CapasFAB
        styleMode={styleMode}
        onStyleChange={setStyleMode}
        overlayEnabled={overlayEnabled}
        onToggleOverlay={toggleOverlay}
        showSavedRoofs={showSavedRoofs}
        onToggleSavedRoofs={onToggleSavedRoofs ?? (() => undefined)}
        savedRoofsCount={savedRoofs.length}
        positionClass={capasPosClass}
      />
    </div>
  );
}
