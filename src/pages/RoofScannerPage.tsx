import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Building2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useRoofScanner } from '@/hooks/useRoofScanner';
import { useLeadManager } from '@/hooks/useLeadManager';
import { useAreaSelection } from '@/hooks/useAreaSelection';
import { useScanRequests, MAX_BBOX_SIDE_DEG } from '@/hooks/useScanRequests';
import { useToast } from '@/components/ui/Toast';
import { geocodeAddress, type GeocodingResult } from '@/services/geocodingService';
import {
  saveRoofGeom,
  insertDetectedRoof,
  type GeoJSONPolygon,
  type DetectedRoofCandidate,
} from '@/services/scannerRpcService';
import { lookupParcel } from '@/services/cadastreService';
import type { CadastreInfo } from '@/types/enrichment';
import { persistScan } from '@/services/scanPersistenceService';
import { calculateSolarFinancials } from '@/services/solarFinancials';
import { getAttribution } from '@/lib/attribution';
import type { RoofScanResult } from '@/services/roofScannerService';
import type { EnrichedOwnerResult } from '@/types/enrichment';
import ScannerMap from '@/components/scanner/ScannerMap';
import ScanPanel from '@/components/scanner/ScanPanel';
import BuildingDetail from '@/components/scanner/BuildingDetail';
import BuildingMeasurements from '@/components/scanner/BuildingMeasurements';
import DrawToolbar from '@/components/scanner/DrawToolbar';
import MapSearchOverlay from '@/components/scanner/MapSearchOverlay';
import ScanRequestsPanel from '@/components/scanner/ScanRequestsPanel';

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
  const { toast } = useToast();

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

  // Async background scan queue (separate from the instant viewport scan).
  const { requests: scanRequests, isQueuing, queueScan } = useScanRequests();

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
  const [measureMode, setMeasureMode] = useState(false);
  const [parcelBoundary, setParcelBoundary] = useState<Array<{ lat: number; lng: number }> | undefined>(undefined);
  const [cadastre, setCadastre] = useState<CadastreInfo | null>(null);

  // P3 — auto-detected roof candidates awaiting confirm/reject.
  // Sourced from the scan/detector flow; starts empty until that flow populates it.
  const [detectedCandidates, setDetectedCandidates] = useState<DetectedRoofCandidate[]>([]);

  // P2 — persisted roof_scans id per discovered-building id (created lazily on draw/save).
  const scanIdByBuildingRef = useRef<Map<number, string>>(new Map());

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

  // ===== Async background scan =====
  // Uses the drawn zone bounds if one exists, else the current map viewport.
  const handleQueueScan = useCallback(async () => {
    const bounds = getActiveBounds() ?? mapBounds;
    const minLng = bounds.west;
    const minLat = bounds.south;
    const maxLng = bounds.east;
    const maxLat = bounds.north;
    const bbox: number[] = [minLng, minLat, maxLng, maxLat];

    // Guard: the worker rejects bboxes whose side exceeds MAX_BBOX_SIDE_DEG.
    const sideLng = Math.abs(maxLng - minLng);
    const sideLat = Math.abs(maxLat - minLat);
    if (sideLng > MAX_BBOX_SIDE_DEG || sideLat > MAX_BBOX_SIDE_DEG) {
      toast({
        type: 'warning',
        title: 'Área demasiado grande',
        description: `Acerca el mapa: cada lado debe ser menor a ${MAX_BBOX_SIDE_DEG}°.`,
      });
      return;
    }

    // GeoJSON Polygon ring of the bbox (lng/lat, closed).
    const areaGeojson = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    };

    const result = await queueScan(areaGeojson, bbox, {});
    if ('error' in result) {
      toast({
        type: 'error',
        title: 'No se pudo encolar el escaneo',
        description: result.error,
      });
      return;
    }
    toast({
      type: 'success',
      title: 'Escaneo encolado',
      description: 'Los leads aparecerán a medida que el worker procese el área.',
    });
  }, [getActiveBounds, mapBounds, queueScan, toast]);

  const handleBuildingSelect = useCallback(
    (id: number) => {
      selectBuilding(id);
      setRightOpen(true);
      const building = buildings.find((b) => b.id === id);
      if (building?.center) {
        setMapCenter([building.center.lng, building.center.lat]);
        setMapZoom(16.5);
        setSearchMarker({ lng: building.center.lng, lat: building.center.lat });

        // Look up the ANATI parcel boundary for the selected building's center
        const { lat, lng } = building.center;
        setParcelBoundary(undefined);
        setCadastre(null);
        void (async () => {
          const parcel = await lookupParcel(lat, lng);
          setParcelBoundary(parcel?.parcelBoundary);
          setCadastre(parcel);
        })();
      }
    },
    [selectBuilding, buildings]
  );

  const handleCloseDetail = useCallback(() => {
    selectBuilding(null);
    setSearchMarker(null);
    setParcelBoundary(undefined);
    setCadastre(null);
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

  const handleSaveAsLead = useCallback((enrichedData?: EnrichedOwnerResult) => {
    if (!selectedBuilding) return;

    // 1. Local CRM cache (existing behavior — unchanged)
    createLeadFromBuilding(selectedBuilding, selectedZoneNameRef.current, enrichedData);

    // 2. Persist scan + push to /api/leads/intake (attribution + CAPI + WhatsApp alert)
    const scan = selectedBuilding.solarAnalysis;
    if (!scan) return; // only persist analyzed buildings (have a RoofScanResult)

    const owner: EnrichedOwnerResult | null = enrichedData ?? null;

    // Compute 25-yr financials from the scan so financials_json is persisted and
    // est_annual_savings_usd / payback_years reach the lead intake.
    const financials = calculateSolarFinancials({
      systemSizeKwp: scan.maxSystemSizeKwp,
      pshAvg: scan.peakSunHoursPerYear / 365,
    });
    const estAnnualSavingsUsd: number | null = financials.annual_savings_usd;
    const paybackYears: number | null = financials.payback_discounted_years;

    void (async () => {
      const saved = await persistScan(scan as RoofScanResult, owner, financials);

      // Require a valid Panama phone before creating an attributed lead (mirrors server PA_PHONE_RE)
      const rawPhone = owner?.phone ?? '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      if (!/^507[2-8]\d{7}$/.test(cleanPhone)) return;

      const attribution = getAttribution();
      try {
        await fetch('/api/leads/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: owner?.ownerName || scan.address || 'Scanner lead',
            phone: cleanPhone,
            source: 'scanner',
            location: scan.address || owner?.address || selectedBuilding.name,
            system_kwp: scan.maxSystemSizeKwp,
            annual_kwh: scan.yearlyEnergyKwh,
            est_annual_savings_usd: estAnnualSavingsUsd,
            payback_years: paybackYears,
            finca_number: owner?.cadastre?.fincaNumber ?? null,
            roof_area_m2: scan.totalRoofAreaM2,
            scan_source: scan.source,
            roof_scan_id: saved?.id ?? null,
            ...attribution,
          }),
        });
      } catch (err) {
        console.error('[scanner] intake POST failed:', err);
      }
    })();
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

  // ===== P2: Roof draw -> persist geometry =====
  // scanId for the currently selected building (if one was already created).
  const selectedScanId = selectedBuildingId != null
    ? scanIdByBuildingRef.current.get(selectedBuildingId) ?? null
    : null;

  const handleRoofDrawn = useCallback(
    async (payload: { polygon: GeoJSONPolygon; areaSqm: number; kwp: number }) => {
      if (!selectedBuilding) {
        toast({ type: 'warning', title: 'Selecciona un edificio primero' });
        return;
      }
      const { polygon, areaSqm, kwp } = payload;
      try {
        let scanId = scanIdByBuildingRef.current.get(selectedBuilding.id) ?? null;

        // No persisted scan yet — create the roof_scans row first.
        if (!scanId) {
          const usableRoofM2 = Math.round(areaSqm * 0.6);
          const candidate: DetectedRoofCandidate = {
            address: selectedBuilding.name,
            lat: selectedBuilding.center.lat,
            lng: selectedBuilding.center.lng,
            roofGeom: polygon,
            totalRoofM2: areaSqm,
            usableRoofM2,
            systemKwp: kwp,
            panelCount: Math.floor(usableRoofM2 / 2.58),
            yearlyKwh: 0,
            source: 'manual',
            quality: 'MEDIUM',
            score: selectedBuilding.suitability.score,
          };
          scanId = await insertDetectedRoof(candidate);
          scanIdByBuildingRef.current.set(selectedBuilding.id, scanId);
        }

        await saveRoofGeom(scanId, polygon, areaSqm, kwp);
        toast({
          type: 'success',
          title: 'Techo guardado',
          description: `${areaSqm.toLocaleString()} m² · ~${kwp} kWp`,
        });
      } catch (err) {
        toast({
          type: 'error',
          title: 'Error al guardar el techo',
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [selectedBuilding, toast]
  );

  // ===== P3: Candidate confirm / reject =====
  const handleConfirmCandidate = useCallback(
    async (index: number) => {
      const candidate = detectedCandidates[index];
      if (!candidate) return;
      try {
        await insertDetectedRoof(candidate);
        setDetectedCandidates((prev) => prev.filter((_, i) => i !== index));
        toast({ type: 'success', title: 'Lead created' });
      } catch (err) {
        toast({
          type: 'error',
          title: 'Error al crear el lead',
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [detectedCandidates, toast]
  );

  const handleRejectCandidate = useCallback((index: number) => {
    setDetectedCandidates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Centroid (lng/lat) of the selected building — used for fly-to.
  const selectedBuildingCenter = useMemo(
    () =>
      selectedBuilding
        ? { lng: selectedBuilding.center.lng, lat: selectedBuilding.center.lat }
        : null,
    [selectedBuilding]
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
          measureMode={measureMode}
          onMeasureModeChange={setMeasureMode}
          selectedBuildingCoordinates={selectedBuilding?.coordinates}
          selectedBuildingCenter={selectedBuildingCenter}
          selectedScanId={selectedScanId}
          onRoofDrawn={handleRoofDrawn}
          candidates={detectedCandidates}
          onConfirmCandidate={handleConfirmCandidate}
          onRejectCandidate={handleRejectCandidate}
          parcelBoundary={parcelBoundary}
        />
      </div>

      {/* ===== MAP OVERLAYS ===== */}
      <MapSearchOverlay onSelectPlace={handleSearchPlace} />

      <DrawToolbar
        isScanning={isScanning}
        onScanViewport={handleScanViewport}
        onClear={clearBuildings}
        onQueueScan={handleQueueScan}
        isQueuing={isQueuing}
      />

      {/* ===== ASYNC BACKGROUND-SCAN STATUS PANEL — bottom-left corner ===== */}
      <ScanRequestsPanel requests={scanRequests} />

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

      {/* ===== MEASUREMENT PANEL — floating left of right panel ===== */}
      <AnimatePresence>
        {measureMode && selectedBuilding && (
          <div className="absolute right-[440px] top-3 z-30">
            <BuildingMeasurements
              building={selectedBuilding}
              onFullAnalysis={!selectedBuilding.analyzed ? handleAnalyze : undefined}
              onSave={handleSaveAsLead}
            />
          </div>
        )}
      </AnimatePresence>

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

              {/* Registro Público deep-link / untitled-parcel flag */}
              <div className="absolute left-3 right-3 bottom-3 z-10">
                {cadastre?.fincaNumber ? (
                  <a
                    href={cadastre.registroPublicoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full rounded-lg bg-amber-500/15 border border-amber-500/40 px-3 py-2 text-center text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors"
                  >
                    Ver finca {cadastre.fincaNumber} en Registro Público
                  </a>
                ) : (
                  <p className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-400">
                    Sin finca registrada — posible Derecho Posesorio (verificación en campo).
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
