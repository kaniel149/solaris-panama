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

// Initial bounds for Panama City at zoom 14 (~0.05 deg spread)
const INITIAL_BOUNDS: MapBounds = {
  north: 9.025,
  south: 8.975,
  east: -79.495,
  west: -79.545,
};

export default function PublicSolarMapPage() {
  const {
    selectedBuilding,
    selectedBuildingId,
    isScanning,
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
  const initialScanDone = useRef(false);

  // Set public-friendly filters on mount + trigger initial scan
  useEffect(() => {
    setFilters({
      minArea: PUBLIC_CONFIG.minBuildingArea,
      minScore: PUBLIC_CONFIG.minSuitabilityScore,
    });

    // Trigger initial scan after a short delay to let map render
    const timer = setTimeout(() => {
      if (!initialScanDone.current) {
        initialScanDone.current = true;
        scanViewport(INITIAL_BOUNDS);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [setFilters, scanViewport]);

  // Auto-scan on viewport change (debounced)
  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      const boundsKey = `${bounds.north.toFixed(4)},${bounds.south.toFixed(4)},${bounds.east.toFixed(4)},${bounds.west.toFixed(4)}`;
      if (boundsKey === lastBoundsRef.current) return;
      lastBoundsRef.current = boundsKey;
      initialScanDone.current = true;

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

      {/* Scanning indicator */}
      {isScanning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-[#12121a]/90 backdrop-blur-xl border border-[#00ffcc]/20">
          <div className="w-3 h-3 rounded-full bg-[#00ffcc] animate-pulse" />
          <span className="text-xs text-[#f0f0f5]">Escaneando edificios...</span>
        </div>
      )}

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
