/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import Map, {
  Source,
  Layer,
  NavigationControl,
  GeolocateControl,
} from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import { motion } from 'framer-motion';
import { Satellite, Moon } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

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
  onCenterChange?: (center: [number, number], zoom: number) => void;
}

const EMPTY_FILTER = ['==', ['get', 'id'], -1];

export default function ScannerMap({
  buildings,
  selectedBuildingId,
  center,
  zoom,
  onBuildingSelect,
  onBoundsChange,
  onCenterChange,
}: ScannerMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapStyle, setMapStyle] = useState(DARK_STYLE);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom,
  });

  // Sync center/zoom from parent
  useEffect(() => {
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
    const c = map.getCenter();
    onCenterChange?.([c.lng, c.lat], map.getZoom());
  }, [onBoundsChange, onCenterChange]);

  const toggleStyle = useCallback(() => {
    setMapStyle((s) => (s === DARK_STYLE ? SATELLITE_STYLE : DARK_STYLE));
  }, []);

  const interactiveLayerIds = ['buildings-fill'];

  // Fallback when no Mapbox token
  if (!MAPBOX_TOKEN) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center px-8 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#00ffcc]/10 flex items-center justify-center mx-auto mb-4">
            <Satellite className="w-8 h-8 text-[#00ffcc]" />
          </div>
          <h3 className="text-lg font-bold text-[#f0f0f5] mb-2">Mapbox Token Required</h3>
          <p className="text-sm text-[#8888a0] mb-4">
            Add <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#00ffcc] text-xs">VITE_MAPBOX_TOKEN</code> to your <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#00ffcc] text-xs">.env.local</code> file.
          </p>
          <p className="text-xs text-[#555566]">
            Get a free token at{' '}
            <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-[#00ffcc] hover:underline">
              mapbox.com
            </a>
            {' '}(50k free map loads/month)
          </p>
        </div>
      </div>
    );
  }

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
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
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

          {/* Selected building highlight */}
          <Layer
            id="selected-building"
            type="line"
            filter={selectedFilter}
            paint={{
              'line-color': '#00ffcc',
              'line-width': 3,
            }}
          />
        </Source>
      </Map>

      {/* Style toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleStyle}
        className="absolute top-3 right-14 z-10 p-2.5 rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] hover:border-[#00ffcc]/20 transition-all"
        title={mapStyle === DARK_STYLE ? 'Satellite view' : 'Dark view'}
      >
        {mapStyle === DARK_STYLE ? (
          <Satellite className="w-4 h-4 text-[#8888a0]" />
        ) : (
          <Moon className="w-4 h-4 text-[#8888a0]" />
        )}
      </motion.button>
    </div>
  );
}
