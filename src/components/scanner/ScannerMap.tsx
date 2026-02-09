/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import Map, {
  Source,
  Layer,
  NavigationControl,
  GeolocateControl,
} from 'react-map-gl/maplibre';
import { Marker } from '@vis.gl/react-maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { motion, AnimatePresence } from 'framer-motion';
import { Satellite, Moon, MapIcon, Ruler, Building2 } from 'lucide-react';
import { getGradeFromScore, GRADE_COLORS } from '@/utils/geoCalculations';
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

// ===== GRADE LEGEND DATA =====

const GRADE_LEGEND = [
  { grade: 'A', range: '80-100', color: GRADE_COLORS.A },
  { grade: 'B', range: '60-79', color: GRADE_COLORS.B },
  { grade: 'C', range: '40-59', color: GRADE_COLORS.C },
  { grade: 'D', range: '0-39', color: GRADE_COLORS.D },
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
}: ScannerMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [styleMode, setStyleMode] = useState<StyleMode>('dark');
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const isSatellite = styleMode === 'satellite';
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom,
  });

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

  const handleClick = useCallback(
    (e: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id != null) {
        onBuildingSelect(feature.properties.id as number);
      }
    },
    [onBuildingSelect]
  );

  const handleDblClick = useCallback(
    (e: { features?: Array<{ properties?: Record<string, unknown> }>; preventDefault?: () => void }) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id != null) {
        e.preventDefault?.();
        onBuildingSelect(feature.properties.id as number);
      }
    },
    [onBuildingSelect]
  );

  const handleMouseEnter = useCallback(
    (e: { features?: Array<{ properties?: Record<string, unknown>; geometry?: any }> ; lngLat?: { lng: number; lat: number } }) => {
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
      const feature = e.features?.[0];
      if (feature?.properties?.id != null && e.lngLat) {
        setHoverInfo((prev) => prev ? { ...prev, lng: e.lngLat!.lng, lat: e.lngLat!.lat } : prev);
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
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

  const toggleStyle = useCallback(() => {
    setStyleMode((prev) => {
      const idx = STYLE_ORDER.indexOf(prev);
      return STYLE_ORDER[(idx + 1) % STYLE_ORDER.length];
    });
  }, []);

  const toggleMeasure = useCallback(() => {
    onMeasureModeChange?.(!measureMode);
  }, [measureMode, onMeasureModeChange]);

  const interactiveLayerIds = ['buildings-fill'];
  const buildingCount = buildings.features.length;

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
          {/* Fill layer - color by score with grade-based stops */}
          <Layer
            id="buildings-fill"
            type="fill"
            paint={{
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'score'],
                0,
                GRADE_COLORS.D,
                39,
                GRADE_COLORS.D,
                40,
                GRADE_COLORS.C,
                59,
                GRADE_COLORS.C,
                60,
                GRADE_COLORS.B,
                79,
                GRADE_COLORS.B,
                80,
                GRADE_COLORS.A,
                100,
                GRADE_COLORS.A,
              ],
              'fill-opacity': [
                'case',
                ['==', ['get', 'id'], hoveredId ?? -1],
                isSatellite ? 0.65 : 0.7,
                isSatellite ? 0.45 : 0.5,
              ],
            }}
          />

          {/* Outline layer */}
          <Layer
            id="buildings-outline"
            type="line"
            paint={{
              'line-color': isSatellite ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
              'line-width': isSatellite ? 2 : 1,
            }}
          />

          {/* Hover highlight */}
          <Layer
            id="buildings-hover"
            type="line"
            filter={hoverFilter}
            paint={{
              'line-color': isSatellite ? '#00ffcc' : 'rgba(255,255,255,0.6)',
              'line-width': isSatellite ? 3 : 2,
            }}
          />

          {/* Selected building highlight — glow outline */}
          <Layer
            id="selected-building"
            type="line"
            filter={selectedFilter}
            paint={{
              'line-color': '#00ffcc',
              'line-width': selectedLineWidth,
            }}
          />

          {/* Selected building fill — bright overlay */}
          <Layer
            id="selected-building-fill"
            type="fill"
            filter={selectedFilter}
            paint={{
              'fill-color': '#00ffcc',
              'fill-opacity': 0.18,
            }}
          />

          {/* Selected building area label */}
          <Layer
            id="selected-building-label"
            type="symbol"
            filter={selectedFilter}
            layout={{
              'text-field': ['concat', ['to-string', ['get', 'area']], ' m\u00B2'],
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

        {/* Building dimensions overlay — shown when measure mode ON and building selected */}
        {measureMode && selectedBuildingId != null && selectedBuildingCoordinates && selectedBuildingCoordinates.length > 2 && (
          <BuildingDimensions coordinates={selectedBuildingCoordinates} />
        )}

        {/* Building hover tooltip */}
        {hoverInfo && hoveredId != null && (
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

      {/* ===== TOP-LEFT: Buildings found counter ===== */}
      <AnimatePresence>
        {buildingCount > 0 && (
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

      {/* ===== BOTTOM-RIGHT: Grade legend ===== */}
      <AnimatePresence>
        {buildingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 right-3 z-10 px-3 py-2.5 rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]"
          >
            <div className="text-[10px] text-[#555566] uppercase tracking-wider mb-2 font-semibold">
              Suitability
            </div>
            <div className="space-y-1.5">
              {GRADE_LEGEND.map((item) => (
                <div key={item.grade} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: item.color }}
                  />
                  <span className="text-[10px] text-[#8888a0] font-medium">
                    {item.grade}
                  </span>
                  <span className="text-[10px] text-[#555566]">
                    {item.range}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
