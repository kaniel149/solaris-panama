import { useMemo } from 'react';
import { Marker } from '@vis.gl/react-maplibre';
import {
  calculateEdgeLengths,
  edgeMidpoint,
  formatDistance,
} from '@/utils/geoCalculations';

interface BuildingDimensionsProps {
  /** Building polygon coordinates in { lat, lon } format */
  coordinates: Array<{ lat: number; lon: number }>;
}

/**
 * Renders edge length labels on the map for a selected building polygon.
 * Uses MapLibre GL Marker elements positioned at the midpoint of each edge.
 */
export default function BuildingDimensions({ coordinates }: BuildingDimensionsProps) {
  const edges = useMemo(() => {
    if (coordinates.length < 2) return [];

    const lengths = calculateEdgeLengths(coordinates);

    return coordinates.map((coord, i) => {
      const next = coordinates[(i + 1) % coordinates.length];
      const mid = edgeMidpoint(coord, next);
      const length = lengths[i];

      // Skip very short edges (< 1m) — likely closing segment duplicates
      if (length < 1) return null;

      return {
        key: `edge-${i}`,
        lng: mid.lon,
        lat: mid.lat,
        length,
        label: formatDistance(length),
      };
    }).filter(Boolean) as Array<{
      key: string;
      lng: number;
      lat: number;
      length: number;
      label: string;
    }>;
  }, [coordinates]);

  if (edges.length === 0) return null;

  return (
    <>
      {edges.map((edge) => (
        <Marker
          key={edge.key}
          longitude={edge.lng}
          latitude={edge.lat}
          anchor="center"
        >
          <div
            className="pointer-events-none select-none px-1.5 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap"
            style={{
              background: '#0a0a0fee',
              color: '#ffffff',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            {edge.label}
          </div>
        </Marker>
      ))}

      {/* Corner dots */}
      {coordinates.map((coord, i) => (
        <Marker
          key={`corner-${i}`}
          longitude={coord.lon}
          latitude={coord.lat}
          anchor="center"
        >
          <div
            className="pointer-events-none"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#00ffcc',
              border: '1.5px solid #0a0a0f',
              boxShadow: '0 0 4px rgba(0,255,204,0.4)',
            }}
          />
        </Marker>
      ))}
    </>
  );
}
