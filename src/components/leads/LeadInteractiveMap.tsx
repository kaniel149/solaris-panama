import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Map as MapIcon, Layers } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// Free CARTO tile styles (no API key needed)
const STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  satellite: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
};

interface LeadInteractiveMapProps {
  center: { lat: number; lng: number };
  coordinates: Array<{ lat: number; lon: number }>;
  zoom?: number;
  height?: number;
  className?: string;
}

export function LeadInteractiveMap({
  center,
  coordinates,
  zoom = 18,
  height = 400,
  className,
}: LeadInteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [style, setStyle] = useState<'dark' | 'satellite'>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Convert coordinates to GeoJSON polygon
  const polygonCoords = coordinates.map((c) => [c.lon, c.lat]);
  // Close the polygon ring
  if (
    polygonCoords.length > 0 &&
    (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
      polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1])
  ) {
    polygonCoords.push([...polygonCoords[0]]);
  }

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoords],
        },
        properties: {},
      },
    ],
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES[style],
      center: [center.lng, center.lat],
      zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      setIsLoaded(true);

      // Add building polygon source
      map.addSource('building-polygon', {
        type: 'geojson',
        data: geojson,
      });

      // Fill layer (cyan highlight)
      map.addLayer({
        id: 'building-fill',
        type: 'fill',
        source: 'building-polygon',
        paint: {
          'fill-color': '#00ffcc',
          'fill-opacity': 0.2,
        },
      });

      // Outline layer
      map.addLayer({
        id: 'building-outline',
        type: 'line',
        source: 'building-polygon',
        paint: {
          'line-color': '#00ffcc',
          'line-width': 2.5,
          'line-opacity': 0.8,
        },
      });

      // Pulsing center marker
      const markerEl = document.createElement('div');
      markerEl.className = 'lead-map-marker';
      markerEl.innerHTML = `
        <div style="
          width: 12px; height: 12px; border-radius: 50%;
          background: #00ffcc; border: 2px solid white;
          box-shadow: 0 0 12px rgba(0,255,204,0.5);
          animation: lead-pulse 2s ease-in-out infinite;
        "></div>
      `;

      new maplibregl.Marker({ element: markerEl })
        .setLngLat([center.lng, center.lat])
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  const toggleStyle = () => {
    setIsLoaded(false);
    setStyle((prev) => (prev === 'dark' ? 'satellite' : 'dark'));
  };

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden border border-white/[0.06]',
        className
      )}
      style={{ height }}
    >
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a12]/80 z-10">
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-2 text-[#555570]"
          >
            <MapIcon className="w-5 h-5" />
            <span className="text-xs">Loading map...</span>
          </motion.div>
        </div>
      )}

      {/* Style toggle */}
      <button
        onClick={toggleStyle}
        className={cn(
          'absolute top-3 left-3 z-20',
          'w-8 h-8 rounded-lg flex items-center justify-center',
          'bg-[#12121a]/80 backdrop-blur-md border border-white/[0.1]',
          'text-[#8888a0] hover:text-[#f0f0f5] transition-colors'
        )}
        title={style === 'dark' ? 'Switch to Voyager' : 'Switch to Dark'}
      >
        <Layers className="w-4 h-4" />
      </button>

      {/* Coordinates badge */}
      <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-md bg-[#12121a]/80 backdrop-blur-md border border-white/[0.06]">
        <span className="text-[10px] text-[#8888a0] font-mono">
          {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
        </span>
      </div>

      {/* Pulse animation CSS */}
      <style>{`
        @keyframes lead-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(0,255,204,0.4); }
          50% { box-shadow: 0 0 20px rgba(0,255,204,0.7); }
        }
      `}</style>
    </div>
  );
}
