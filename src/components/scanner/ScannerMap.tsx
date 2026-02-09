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
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri',
      maxzoom: 19,
    },
    'esri-labels': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    'esri-roads': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
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
    (e: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      const feature = e.features?.[0];
      if (feature?.properties?.id != null) {
        setHoveredId(feature.properties.id as number);
        const map = (mapRef.current as any)?.getMap?.();
        if (map) map.getCanvas().style.cursor = 'pointer';
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
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
        onMouseLeave={handleMouseLeave}
        interactiveLayerIds={interactiveLayerIds}
        mapStyle={STYLE_MAP[styleMode] as any}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
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
          {/* Fill layer - color by score */}
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
                0.7,
                0.5,
              ],
            }}
          />

          {/* Outline layer */}
          <Layer
            id="buildings-outline"
            type="line"
            paint={{
              'line-color': 'rgba(255,255,255,0.3)',
              'line-width': 1,
            }}
          />

          {/* Hover highlight */}
          <Layer
            id="buildings-hover"
            type="line"
            filter={hoverFilter}
            paint={{
              'line-color': 'rgba(255,255,255,0.6)',
              'line-width': 2,
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
