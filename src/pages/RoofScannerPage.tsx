import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Building2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useRoofScanner } from '@/hooks/useRoofScanner';
import { useLeadManager } from '@/hooks/useLeadManager';
import { useAreaSelection } from '@/hooks/useAreaSelection';
import { geocodeAddress, type GeocodingResult } from '@/services/geocodingService';
import ScannerMap from '@/components/scanner/ScannerMap';
import ScanPanel from '@/components/scanner/ScanPanel';
import BuildingDetail from '@/components/scanner/BuildingDetail';
import DrawToolbar from '@/components/scanner/DrawToolbar';
import MapSearchOverlay from '@/components/scanner/MapSearchOverlay';

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

const PANEL_SPRING = { type: 'spring' as const, damping: 28, stiffness: 280 };

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
  const [searchMarker, setSearchMarker] = useState<{ lng: number; lat: number } | null>(null);

  // Panel hover state with delayed close
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const leftTimer = useRef<ReturnType<typeof setTimeout>>();
  const rightTimer = useRef<ReturnType<typeof setTimeout>>();

  const openLeft = useCallback(() => {
    clearTimeout(leftTimer.current);
    setLeftOpen(true);
  }, []);
  const closeLeft = useCallback(() => {
    leftTimer.current = setTimeout(() => setLeftOpen(false), 400);
  }, []);
  const openRight = useCallback(() => {
    clearTimeout(rightTimer.current);
    setRightOpen(true);
  }, []);
  const closeRight = useCallback(() => {
    rightTimer.current = setTimeout(() => setRightOpen(false), 400);
  }, []);

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

  const handleSearchPlace = useCallback((result: GeocodingResult) => {
    setMapCenter([result.lng, result.lat]);
    setMapZoom(17);
    setSearchMarker({ lng: result.lng, lat: result.lat });
  }, []);

  const handleScanViewport = useCallback(() => {
    const bounds = getActiveBounds() ?? mapBounds;
    scanViewport(bounds);
  }, [scanViewport, mapBounds, getActiveBounds]);

  const handleBuildingSelect = useCallback(
    (id: number) => {
      selectBuilding(id);
      setRightOpen(true);
      const building = buildings.find((b) => b.id === id);
      if (building?.center) {
        setMapCenter([building.center.lng, building.center.lat]);
        setMapZoom(16.5);
        setSearchMarker({ lng: building.center.lng, lat: building.center.lat });
      }
    },
    [selectBuilding, buildings]
  );

  const handleCloseDetail = useCallback(() => {
    selectBuilding(null);
    setSearchMarker(null);
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

  const handleSaveAsLead = useCallback(() => {
    if (!selectedBuilding) return;
    createLeadFromBuilding(selectedBuilding, selectedZoneNameRef.current);
  }, [selectedBuilding, createLeadFromBuilding]);

  const handleSaveAllAsLeads = useCallback(() => {
    setIsSavingLeads(true);
    try {
      saveAllAsLeads(buildings, selectedZoneNameRef.current);
    } finally {
      setIsSavingLeads(false);
    }
  }, [buildings, saveAllAsLeads]);

  const handleEnrichAll = useCallback(async () => {
    await enrichAllLeads();
  }, [enrichAllLeads]);

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

  // Score color for right tab
  const selectedScore = selectedBuilding?.suitability.score ?? 0;
  const scoreColor =
    selectedScore >= 80 ? '#00ffcc' : selectedScore >= 60 ? '#22c55e' : selectedScore >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#0a0a0f]">
      {/* ===== MAP — FULL AREA ===== */}
      <div className="absolute inset-0">
        <ScannerMap
          center={mapCenter}
          zoom={mapZoom}
          buildings={buildingsGeoJSON ?? EMPTY_GEOJSON}
          selectedBuildingId={selectedBuildingId}
          onBuildingSelect={handleBuildingSelect}
          onBoundsChange={handleBoundsChange}
          searchMarker={searchMarker}
        />
      </div>

      {/* ===== MAP OVERLAYS ===== */}
      <MapSearchOverlay onSelectPlace={handleSearchPlace} />

      <DrawToolbar
        isScanning={isScanning}
        onScanViewport={handleScanViewport}
        onClear={clearBuildings}
      />

      {/* ===== LEFT PANEL — hover-activated overlay ===== */}
      <div
        className="absolute left-0 top-0 bottom-0 z-30"
        onMouseEnter={openLeft}
        onMouseLeave={closeLeft}
      >
        <motion.div
          animate={{ x: leftOpen ? 0 : -340 }}
          transition={PANEL_SPRING}
          className="h-full relative"
        >
          <ScanPanel
            buildings={buildings}
            selectedBuildingId={selectedBuildingId}
            isScanning={isScanning}
            stats={stats}
            onSearch={handleSearch}
            onScanViewport={handleScanViewport}
            onBuildingSelect={handleBuildingSelect}
            onFilterChange={handleFilterChange}
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

          {/* Collapsed tab — sticks out on the right, offset below sidebar tab */}
          <div
            className={`absolute top-20 right-0 translate-x-full flex flex-col items-center gap-2 py-3 px-2 rounded-r-xl bg-[#12121a]/90 backdrop-blur-xl border border-l-0 border-white/[0.06] cursor-pointer transition-opacity duration-200 ${leftOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <ScanLine className="w-4 h-4 text-[#00ffcc]" />
            {buildings.length > 0 && (
              <span className="text-[10px] font-bold text-[#00ffcc] bg-[#00ffcc]/10 rounded-full min-w-[24px] h-6 flex items-center justify-center px-1">
                {buildings.length}
              </span>
            )}
            <ChevronRight className="w-3 h-3 text-[#555566]" />
          </div>
        </motion.div>
      </div>

      {/* ===== RIGHT PANEL — hover-activated overlay ===== */}
      <AnimatePresence>
        {selectedBuilding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-0 top-0 bottom-0 z-30"
            onMouseEnter={openRight}
            onMouseLeave={closeRight}
          >
            <motion.div
              animate={{ x: rightOpen ? 0 : 380 }}
              transition={PANEL_SPRING}
              className="h-full relative"
            >
              {/* Collapsed tab — sticks out on the left */}
              <div
                className={`absolute top-3 left-0 -translate-x-full flex flex-col items-center gap-2 py-3 px-2 rounded-l-xl bg-[#12121a]/90 backdrop-blur-xl border border-r-0 border-white/[0.06] cursor-pointer transition-opacity duration-200 ${rightOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                <Building2 className="w-4 h-4" style={{ color: scoreColor }} />
                <span
                  className="text-[10px] font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1"
                  style={{ color: scoreColor, backgroundColor: `${scoreColor}15` }}
                >
                  {selectedScore}
                </span>
                <ChevronLeft className="w-3 h-3 text-[#555566]" />
              </div>

              <BuildingDetail
                building={selectedBuilding}
                isAnalyzing={isAnalyzing}
                onClose={handleCloseDetail}
                onAnalyze={handleAnalyze}
                onSaveAsLead={handleSaveAsLead}
                isLeadSaved={isSelectedLeadSaved}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
