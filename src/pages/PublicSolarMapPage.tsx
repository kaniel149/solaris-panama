import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRoofScanner } from '@/hooks/useRoofScanner';
import ScannerMap from '@/components/scanner/ScannerMap';
import PublicMapHeader from '@/components/public/PublicMapHeader';
import BuildingSolarCard from '@/components/public/BuildingSolarCard';
import { PUBLIC_CONFIG } from '@/config/public';

// ===== Types =====

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Empty GeoJSON to avoid null issues before first scan
const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export default function PublicSolarMapPage() {
  const {
    selectedBuilding,
    selectedBuildingId,
    stats,
    buildingsGeoJSON,
    scanViewport,
    selectBuilding,
    setFilters,
  } = useRoofScanner();

  // Map state
  const [mapCenter] = useState<[number, number]>(PUBLIC_CONFIG.defaultCenter);
  const [mapZoom] = useState(PUBLIC_CONFIG.defaultZoom);

  // Debounce scan
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<string>('');

  // Set public-friendly filters on mount
  useEffect(() => {
    setFilters({
      minArea: PUBLIC_CONFIG.minBuildingArea,
      minScore: PUBLIC_CONFIG.minSuitabilityScore,
    });
  }, [setFilters]);

  // Auto-scan on viewport change (debounced)
  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      const boundsKey = `${bounds.north.toFixed(4)},${bounds.south.toFixed(4)},${bounds.east.toFixed(4)},${bounds.west.toFixed(4)}`;
      if (boundsKey === lastBoundsRef.current) return;
      lastBoundsRef.current = boundsKey;

      if (scanTimer.current) clearTimeout(scanTimer.current);
      scanTimer.current = setTimeout(() => {
        scanViewport(bounds);
      }, 600);
    },
    [scanViewport]
  );

  const handleBuildingSelect = useCallback(
    (id: number) => {
      selectBuilding(id);
    },
    [selectBuilding]
  );

  const handleCloseCard = useCallback(() => {
    selectBuilding(null);
  }, [selectBuilding]);

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] overflow-hidden">
      {/* Header */}
      <PublicMapHeader buildingCount={stats.total} />

      {/* Map — offset top for header */}
      <div className="absolute inset-0 top-14">
        <ScannerMap
          buildings={buildingsGeoJSON ?? EMPTY_GEOJSON}
          selectedBuildingId={selectedBuildingId}
          center={mapCenter}
          zoom={mapZoom}
          onBuildingSelect={handleBuildingSelect}
          onBoundsChange={handleBoundsChange}
        />
      </div>

      {/* Building Solar Card */}
      <AnimatePresence>
        {selectedBuilding && (
          <BuildingSolarCard
            building={selectedBuilding}
            onClose={handleCloseCard}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
