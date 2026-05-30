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
import { Satellite, Moon, MapIcon, Ruler, Building2, PencilRuler, Check, X } from 'lucide-react';
import { getGradeFromScore, calculatePolygonArea } from '@/utils/geoCalculations';
import {
  computeEstimatedKwp,
  type GeoJSONPolygon,
  type DetectedRoofCandidate,
} from '@/services/scannerRpcService';
import BuildingDimensions from './BuildingDimensions';
import 'maplibre-gl/dist/maplibre-gl.css';

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

type StyleMode = 'dark' | 'street' | 'satellite';

const STYLE_MAP: Record<StyleMode, string | Record<string, unknown>> = {
  dark: DARK_STYLE,
  street: STREET_STYLE,
  satellite: SATELLITE_STYLE,
};

const STYLE_ORDER: StyleMode[] = ['dark', 'street', 'satellite'];

const STYLE_STORAGE_KEY = 'scanner.mapStyle';

function loadStoredStyle(): StyleMode {
  try {
    const raw = localStorage.getItem(STYLE_STORAGE_KEY);
    if (raw === 'dark' || raw === 'street' || raw === 'satellite') return raw;
  } catch {
    /* ignore */
  }
  return 'dark';
}

// Icon for the NEXT style in the cycle
function StyleToggleIcon({ mode }: { mode: StyleMode }) {
  const nextIndex = (STYLE_ORDER.indexOf(mode) + 1) % STYLE_ORDER.length;
  const next = STYLE_ORDER[nextIndex];
  switch (next) {
    case 'street':
      return <MapIcon className="w-4 h-4 text-[#8888a0]" />;
    case 'satellite':
      return <Satellite className="w-4 h-4 text-[#8888a0]" />;
    case 'dark':
    default:
      return <Moon className="w-4 h-4 text-[#8888a0]" />;
  }
}

const STYLE_LABELS: Record<StyleMode, string> = {
  dark: 'Street view',
  street: 'Satellite view',
  satellite: 'Dark view',
};

// ===== SOLAR SCORE COLOR RAMP =====
// Shared between the fill layer and the legend so they always match.
// 0 -> red, 50 -> orange, 75 -> yellow, 90+ -> green.
const SCORE_RAMP: Array<{ stop: number; color: string }> = [
  { stop: 0, color: '#ef4444' }, // red
  { stop: 50, color: '#f97316' }, // orange
  { stop: 75, color: '#facc15' }, // yellow
  { stop: 90, color: '#22c55e' }, // green
];

// MapLibre interpolate expression built from SCORE_RAMP
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
  /** Centroid (lng/lat) of the selected building — fly-to target */
  selectedBuildingCenter?: { lng: number; lat: number } | null;
  /** Persisted roof_scans id for the selected building (null when not yet saved) */
  selectedScanId?: string | null;
  /** Called when the user finishes drawing a roof polygon */
  onRoofDrawn?: (payload: {
    polygon: GeoJSONPolygon;
    areaSqm: number;
    kwp: number;
  }) => void;

  // ===== P3: Candidate review =====
  /** Auto-detected roof candidates awaiting confirm/reject */
  candidates?: DetectedRoofCandidate[];
  /** Confirm a candidate (create lead). Index into `candidates`. */
  onConfirmCandidate?: (index: number) => void;
  /** Reject a candidate (discard). Index into `candidates`. */
  onRejectCandidate?: (index: number) => void;
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

// ===== SCORE LEGEND DATA (synced to SCORE_RAMP) =====

const SCORE_LEGEND = [
  { label: '90+', color: '#22c55e' },
  { label: '75', color: '#facc15' },
  { label: '50', color: '#f97316' },
  { label: '0', color: '#ef4444' },
];

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
}: ScannerMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [styleMode, setStyleMode] = useState<StyleMode>(loadStoredStyle);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const isSatellite = styleMode === 'satellite';
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

  // Track last center/zoom values to avoid redundant flyTo calls
  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);

  // Sync center/zoom from parent (only when values actually change)
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
    // Signature = count + first/last feature id (cheap, stable per result set)
    const firstId = (feats[0].properties as any)?.id ?? 0;
    const lastId = (feats[feats.length - 1].properties as any)?.id ?? 0;
    const signature = `${feats.length}:${firstId}:${lastId}`;
    if (signature === fitSignatureRef.current) return;
    fitSignatureRef.current = signature;

    const map = (mapRef.current as any)?.getMap?.();
    if (!map) return;

    // Compute bounds across all building rings
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
        [
          [west, south],
          [east, north],
        ],
        { padding: 80, maxZoom: 16, duration: 1000 }
      );
    } catch {
      /* ignore invalid bounds */
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

  // Build selected filter
  const selectedFilter = selectedBuildingId != null
    ? ['==', ['get', 'id'], selectedBuildingId]
    : EMPTY_FILTER;

  // Hover filter for opacity boost
  const hoverFilter = hoveredId != null
    ? ['==', ['get', 'id'], hoveredId]
    : EMPTY_FILTER;

  // Selected building outline width — thicker in measure mode
  const selectedLineWidth = measureMode ? 4 : 3;

  // ===== Candidates as GeoJSON (purple dashed) =====
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

  // ===== Live draw polygon as GeoJSON =====
  const drawGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (drawVertices.length === 0) return EMPTY_FC;
    // Build the live ring: committed vertices + cursor (rubber-band)
    const ring: Array<[number, number]> = [...drawVertices];
    if (cursorPos) ring.push(cursorPos);
    const lineFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: ring },
      properties: {},
    };
    const features: GeoJSON.Feature[] = [lineFeature];
    // Fill preview once we have 3+ committed vertices
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

  // Vertex markers as points
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

  // ===== P2: finish drawing -> compute + emit =====
  const finishDrawing = useCallback(() => {
    const verts = drawVerticesRef.current;
    if (verts.length < 3) {
      // not enough points — just exit
      setDrawMode(false);
      setDrawVertices([]);
      setCursorPos(null);
      return;
    }
    // Close ring [lng, lat]
    const closed: [number, number][] = [...verts, verts[0]];
    const polygon: GeoJSONPolygon = { type: 'Polygon', coordinates: [closed] };
    // Reuse geoCalculations.calculatePolygonArea (shoelace + lat correction).
    // It expects {lat, lon}.
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

  // Keyboard: Enter finishes, Escape cancels (only while drawing)
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
      // Draw mode: add a vertex
      if (drawModeRef.current) {
        if (e.lngLat) {
          setDrawVertices((prev) => [...prev, [e.lngLat!.lng, e.lngLat!.lat]]);
        }
        return;
      }

      // Candidate click takes priority over building
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
    [onBuildingSelect]
  );

  const handleDblClick = useCallback(
    (e: {
      features?: Array<{ properties?: Record<string, unknown> }>;
      preventDefault?: () => void;
    }) => {
      if (drawModeRef.current) {
        // double-click finishes the polygon (and don't zoom)
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
          name: (feature.properties.name as string) || `Building`,
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

  // ===== Toggle double-click-zoom + crosshair cursor while drawing =====
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

  const toggleStyle = useCallback(() => {
    setStyleMode((prev) => {
      const idx = STYLE_ORDER.indexOf(prev);
      return STYLE_ORDER[(idx + 1) % STYLE_ORDER.length];
    });
  }, []);

  const toggleMeasure = useCallback(() => {
    onMeasureModeChange?.(!measureMode);
  }, [measureMode, onMeasureModeChange]);

  const interactiveLayerIds = ['buildings-fill', 'candidates-fill'];
  const buildingCount = buildings.features.length;

  // active candidate for the review panel
  const activeCand = activeCandidate != null ? candidates[activeCandidate] : null;
  const activeCandCenter = activeCand
    ? { lng: activeCand.lng, lat: activeCand.lat }
    : null;

  return (
    <div className="relative w-full h-full">
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
          {/* Fill layer - color by SOLAR SCORE ramp */}
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

          {/* Outline layer — solid for real roof_geom, dashed for synthetic.
              `synthetic` property (truthy) marks area-derived footprints. */}
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

          {/* Hover highlight */}
          <Layer
            id="buildings-hover"
            type="line"
            filter={hoverFilter as any}
            paint={{
              'line-color': isSatellite ? '#00ffcc' : 'rgba(255,255,255,0.6)',
              'line-width': isSatellite ? 3 : 2,
            }}
          />

          {/* Selected building highlight — glow outline */}
          <Layer
            id="selected-building"
            type="line"
            filter={selectedFilter as any}
            paint={{
              'line-color': '#00ffcc',
              'line-width': selectedLineWidth,
            }}
          />

          {/* Selected building fill — bright overlay */}
          <Layer
            id="selected-building-fill"
            type="fill"
            filter={selectedFilter as any}
            paint={{
              'fill-color': '#00ffcc',
              'fill-opacity': 0.18,
            }}
          />

          {/* Selected building area label */}
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

        {/* ===== P3: Candidate roofs — purple dashed ===== */}
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

        {/* ===== P2: Live draw overlay ===== */}
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

        {/* Building dimensions overlay — shown when measure mode ON and building selected */}
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
                        Grade {g.grade} ({hoverInfo.score})
                      </span>
                    </span>
                  );
                })()}
              </div>
              <div className="text-[10px] text-[#555566] pt-0.5">Click to select</div>
            </div>
          </Marker>
        )}

        {/* ===== P3: Candidate review popup ===== */}
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
                {activeCand.address || 'Techo detectado'}
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
                  <Check className="w-3 h-3" /> Confirmar
                </button>
                <button
                  onClick={() => {
                    if (activeCandidate != null) onRejectCandidate?.(activeCandidate);
                    setActiveCandidate(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#ef4444]/15 text-[#ef4444] hover:bg-[#ef4444]/25 transition-colors text-[11px] font-medium"
                >
                  <X className="w-3 h-3" /> Rechazar
                </button>
              </div>
            </div>
          </Marker>
        )}

        {/* Pin marker with pulsing ring */}
        {searchMarker && (
          <Marker
            longitude={searchMarker.lng}
            latitude={searchMarker.lat}
            anchor="bottom"
          >
            <div className="relative flex items-center justify-center">
              {/* Pulsing ring */}
              <div className="absolute w-12 h-12 rounded-full bg-[#00ffcc]/20 animate-ping" />
              <div className="absolute w-8 h-8 rounded-full bg-[#00ffcc]/25" />
              {/* Pin */}
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

      {/* ===== TOP-RIGHT CONTROLS ===== */}

      {/* Style toggle button — 3-way cycle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleStyle}
        className="absolute top-3 right-14 z-10 p-2.5 rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] hover:border-[#00ffcc]/20 transition-all"
        title={STYLE_LABELS[styleMode]}
      >
        <StyleToggleIcon mode={styleMode} />
      </motion.button>

      {/* Measure toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleMeasure}
        className={`absolute top-3 right-[6.5rem] z-10 p-2.5 rounded-xl backdrop-blur-xl border transition-all ${
          measureMode
            ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/40 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
            : 'bg-[#12121a]/80 border-white/[0.06] hover:border-[#8b5cf6]/20'
        }`}
        title={measureMode ? 'Disable measurements' : 'Enable measurements'}
      >
        <Ruler className={`w-4 h-4 ${measureMode ? 'text-[#8b5cf6]' : 'text-[#8888a0]'}`} />
      </motion.button>

      {/* Draw Roof toggle button — only when a building is selected */}
      {selectedBuildingId != null && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleDraw}
          className={`absolute top-3 right-[9.5rem] z-10 p-2.5 rounded-xl backdrop-blur-xl border transition-all ${
            drawMode
              ? 'bg-[#00ffcc]/20 border-[#00ffcc]/40 shadow-[0_0_12px_rgba(0,255,204,0.15)]'
              : 'bg-[#12121a]/80 border-white/[0.06] hover:border-[#00ffcc]/20'
          }`}
          title={drawMode ? 'Cancelar dibujo (Esc)' : 'Dibujar techo'}
        >
          <PencilRuler className={`w-4 h-4 ${drawMode ? 'text-[#00ffcc]' : 'text-[#8888a0]'}`} />
        </motion.button>
      )}

      {/* ===== DRAW MODE HINT BANNER ===== */}
      <AnimatePresence>
        {drawMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#12121a]/90 backdrop-blur-xl border border-[#00ffcc]/20"
          >
            <PencilRuler className="w-4 h-4 text-[#00ffcc]" />
            <span className="text-xs text-[#f0f0f5]">
              {drawVertices.length < 3
                ? `Haz clic para agregar puntos (${drawVertices.length})`
                : 'Doble clic o Enter para finalizar · Esc para cancelar'}
            </span>
            {drawVertices.length >= 3 && (
              <button
                onClick={finishDrawing}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00ffcc]/15 text-[#00ffcc] hover:bg-[#00ffcc]/25 transition-colors text-[11px] font-medium"
              >
                <Check className="w-3 h-3" /> Listo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== TOP: Buildings found counter ===== */}
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
              {buildingCount} building{buildingCount !== 1 ? 's' : ''} found
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BOTTOM-RIGHT: Solar score legend (synced to SCORE_RAMP) ===== */}
      <AnimatePresence>
        {(buildingCount > 0 || candidates.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 right-3 z-10 px-3 py-2.5 rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]"
          >
            <div className="text-[10px] text-[#555566] uppercase tracking-wider mb-2 font-semibold">
              Solar score
            </div>
            <div className="space-y-1.5">
              {SCORE_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: item.color }}
                  />
                  <span className="text-[10px] text-[#8888a0] font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            {candidates.length > 0 && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                <div className="w-3 h-3 rounded-sm border-2 border-dashed border-[#a855f7]" />
                <span className="text-[10px] text-[#8888a0] font-medium">Detected</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No-scan-id guard hint (passed up via onRoofDrawn handler in parent;
          here we surface a subtle indicator if drawing without a scanId) */}
      {drawMode && selectedScanId == null && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/30 text-[10px] text-[#f59e0b]">
          El techo se guardará al finalizar el dibujo
        </div>
      )}
    </div>
  );
}
