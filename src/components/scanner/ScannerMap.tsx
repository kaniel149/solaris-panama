/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import Map, {
  Source,
  Layer,
  NavigationControl,
  GeolocateControl,
} from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { motion } from 'framer-motion';
import { Satellite, Moon } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

// Free tile styles (no token needed)
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const SATELLITE_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

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
        title={mapStyle === DARK_STYLE ? 'Light view' : 'Dark view'}
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
