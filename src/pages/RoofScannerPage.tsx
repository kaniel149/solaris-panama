import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRoofScanner } from '@/hooks/useRoofScanner';
import { geocodeAddress } from '@/services/geocodingService';
import ScannerMap from '@/components/scanner/ScannerMap';
import ScanPanel from '@/components/scanner/ScanPanel';
import BuildingDetail from '@/components/scanner/BuildingDetail';
import DrawToolbar from '@/components/scanner/DrawToolbar';

// ===== TYPES =====

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

// ===== MAIN COMPONENT =====

export default function RoofScannerPage() {
  const scanner = useRoofScanner();

  const {
    buildings,
    selectedBuilding,
    selectedBuildingId,
    isScanning,
    isAnalyzing,
    stats,
    buildingsGeoJSON,
    scanViewport,
    selectBuilding,
    analyzeBuilding,
    clearBuildings,
    setFilters,
  } = scanner;

  // Local state
  const [mapCenter, setMapCenter] = useState<[number, number]>([-79.52, 9.0]);
  const [mapZoom, setMapZoom] = useState(14);
  const [mapBounds, setMapBounds] = useState<MapBounds>({
    north: 9.05,
    south: 8.95,
    east: -79.47,
    west: -79.57,
  });

  // Handlers
  const handleSearch = useCallback(async (address: string) => {
    try {
      const result = await geocodeAddress(address);
      setMapCenter([result.lng, result.lat]);
      setMapZoom(17);
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
  }, []);

  const handleScanViewport = useCallback(() => {
    scanViewport(mapBounds);
  }, [scanViewport, mapBounds]);

  const handleBuildingSelect = useCallback(
    (id: number) => {
      selectBuilding(id);
    },
    [selectBuilding]
  );

  const handleCloseDetail = useCallback(() => {
    selectBuilding(null);
  }, [selectBuilding]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedBuilding) return;
    await analyzeBuilding(selectedBuilding);
  }, [selectedBuilding, analyzeBuilding]);

  const handleFilterChange = useCallback(
    (filters: { minArea: number; minScore: number }) => {
      setFilters(filters);
    },
    [setFilters]
  );

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  const handleCenterChange = useCallback(
    (center: [number, number], zoom: number) => {
      setMapCenter(center);
      setMapZoom(zoom);
    },
    []
  );

  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-4rem)] flex overflow-hidden bg-[#0a0a0f]">
      {/* Left Panel */}
      <ScanPanel
        buildings={buildings}
        selectedBuildingId={selectedBuildingId}
        isScanning={isScanning}
        stats={stats}
        onSearch={handleSearch}
        onScanViewport={handleScanViewport}
        onBuildingSelect={handleBuildingSelect}
        onFilterChange={handleFilterChange}
      />

      {/* Map Area */}
      <div className="flex-1 relative">
        <ScannerMap
          center={mapCenter}
          zoom={mapZoom}
          buildings={buildingsGeoJSON ?? EMPTY_GEOJSON}
          selectedBuildingId={selectedBuildingId}
          onBuildingSelect={handleBuildingSelect}
          onBoundsChange={handleBoundsChange}
          onCenterChange={handleCenterChange}
        />

        <DrawToolbar
          isScanning={isScanning}
          onScanViewport={handleScanViewport}
          onClear={clearBuildings}
        />
      </div>

      {/* Right Detail Drawer */}
      <AnimatePresence>
        {selectedBuilding && (
          <BuildingDetail
            building={selectedBuilding}
            isAnalyzing={isAnalyzing}
            onClose={handleCloseDetail}
            onAnalyze={handleAnalyze}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
