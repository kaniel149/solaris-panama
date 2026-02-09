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
import { motion } from 'framer-motion';
import { Satellite, Moon, MapIcon } from 'lucide-react';
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
}

interface HoverInfo {
  lng: number;
  lat: number;
  name: string;
  score: number;
  area: number;
}

const EMPTY_FILTER = ['==', ['get', 'id'], -1];

// ===== COMPONENT =====

export default function ScannerMap({
  buildings,
  selectedBuildingId,
  center,
  zoom,
  onBuildingSelect,
  onBoundsChange,
  searchMarker,
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

  const handleClick = useCallback(
    (e: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id != null) {
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

  const interactiveLayerIds = ['buildings-fill'];

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        onMoveEnd={handleMoveEnd}
        onClick={handleClick}
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
          {/* Fill layer - color by score, brighter on satellite */}
          <Layer
            id="buildings-fill"
            type="fill"
            paint={{
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'score'],
                0,
                '#ef4444',
                50,
                '#f59e0b',
                100,
                '#22c55e',
              ],
              'fill-opacity': [
                'case',
                ['==', ['get', 'id'], hoveredId ?? -1],
                isSatellite ? 0.65 : 0.7,
                isSatellite ? 0.45 : 0.5,
              ],
            }}
          />

          {/* Outline layer — much brighter on satellite for visibility */}
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
              'line-width': 3,
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

        {/* Building hover tooltip — rendered as a Marker to follow mouse position on map */}
        {hoverInfo && hoveredId != null && (
          <Marker
            longitude={hoverInfo.lng}
            latitude={hoverInfo.lat}
            anchor="bottom"
            offset={[0, -10] as [number, number]}
          >
            <div
              className="pointer-events-none px-2.5 py-1.5 text-xs space-y-0.5 shadow-lg"
              style={{
                background: '#12121aee',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                whiteSpace: 'nowrap',
              }}
            >
              <div className="font-semibold text-[#f0f0f5] truncate max-w-[180px]">{hoverInfo.name}</div>
              <div className="flex items-center gap-2 text-[10px]">
                <span style={{ color: hoverInfo.score >= 80 ? '#00ffcc' : hoverInfo.score >= 60 ? '#22c55e' : hoverInfo.score >= 40 ? '#f59e0b' : '#ef4444' }}>
                  Score: {hoverInfo.score}/100
                </span>
                <span className="text-[#555566]">{Math.round(hoverInfo.area)} m²</span>
              </div>
              <div className="text-[10px] text-[#555566]">Click to select</div>
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
    </div>
  );
}
