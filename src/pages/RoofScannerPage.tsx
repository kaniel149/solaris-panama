import { useState, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRoofScanner } from '@/hooks/useRoofScanner';
import { useLeadManager } from '@/hooks/useLeadManager';
import { useAreaSelection } from '@/hooks/useAreaSelection';
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

  // Destructure stable functions/values from hooks individually
  // (avoids using entire hook return objects as useCallback deps, which are new every render)
  const {
    selectZone,
    clearZone,
    getActiveBounds,
    zones,
    selectedZone: areaSelectedZone,
  } = useAreaSelection();

  const {
    createLeadFromBuilding,
    saveAllAsLeads,
    enrichAllLeads,
    leads: allLeads,
    isEnriching,
    enrichProgress,
  } = useLeadManager();

  // Ref for selected zone name — avoids adding areaSelectedZone as callback dep
  const selectedZoneNameRef = useRef<string | undefined>(undefined);
  selectedZoneNameRef.current = areaSelectedZone?.name;

  // Local state
  const [mapCenter, setMapCenter] = useState<[number, number]>([-79.52, 9.0]);
  const [mapZoom, setMapZoom] = useState(14);
  const [mapBounds, setMapBounds] = useState<MapBounds>({
    north: 9.05,
    south: 8.95,
    east: -79.47,
    west: -79.57,
  });
  const [isSavingLeads, setIsSavingLeads] = useState(false);

  // Check if selected building is already saved as lead
  const isSelectedLeadSaved = useMemo(() => {
    if (!selectedBuilding) return false;
    return allLeads.some((l) => l.osmId === selectedBuilding.osmId);
  }, [selectedBuilding, allLeads]);

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
    const bounds = getActiveBounds() ?? mapBounds;
    scanViewport(bounds);
  }, [scanViewport, mapBounds, getActiveBounds]);

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

  // Zone selection handler - fly map to zone
  const handleSelectZone = useCallback(
    (zoneId: string) => {
      selectZone(zoneId);
      const zone = zones.find((z) => z.id === zoneId);
      if (zone) {
        setMapCenter([zone.center.lng, zone.center.lat]);
        setMapZoom(15);
      }
    },
    [selectZone, zones]
  );

  // Save selected building as lead
  const handleSaveAsLead = useCallback(() => {
    if (!selectedBuilding) return;
    createLeadFromBuilding(
      selectedBuilding,
      selectedZoneNameRef.current
    );
  }, [selectedBuilding, createLeadFromBuilding]);

  // Save all buildings as leads
  const handleSaveAllAsLeads = useCallback(() => {
    setIsSavingLeads(true);
    try {
      saveAllAsLeads(
        buildings,
        selectedZoneNameRef.current
      );
    } finally {
      setIsSavingLeads(false);
    }
  }, [buildings, saveAllAsLeads]);

  // Enrich all leads
  const handleEnrichAll = useCallback(async () => {
    await enrichAllLeads();
  }, [enrichAllLeads]);

  // Analyze top N buildings
  const handleAnalyzeTop = useCallback(
    async (count: number) => {
      const topBuildings = [...buildings]
        .sort((a, b) => b.suitability.score - a.suitability.score)
        .slice(0, count)
        .filter((b) => !b.analyzed);
      for (const b of topBuildings) {
        await analyzeBuilding(b);
      }
    },
    [buildings, analyzeBuilding]
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
        // Lead pipeline props
        zones={zones}
        selectedZoneId={areaSelectedZone?.id ?? null}
        onSelectZone={handleSelectZone}
        onClearZone={clearZone}
        onSaveAllAsLeads={handleSaveAllAsLeads}
        onEnrichAll={handleEnrichAll}
        onAnalyzeTop={handleAnalyzeTop}
        isSavingLeads={isSavingLeads}
        isEnriching={isEnriching}
        enrichProgress={enrichProgress}
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
            onSaveAsLead={handleSaveAsLead}
            isLeadSaved={isSelectedLeadSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
