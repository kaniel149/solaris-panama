import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Building2, ChevronLeft, ChevronUp, ChevronDown,
  Radar, Loader2, X, PencilRuler,
  Search,
} from 'lucide-react';
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
import {
  fetchCandidates,
  approveCandidate,
  rejectCandidate,
  applyLearnedFilters,
  type ScanCandidate,
  type CandidateRejectionReason,
} from '@/services/candidateService';
import ScannerMap from '@/components/scanner/ScannerMap';
// Import ScannerMap's local ScanCandidate shape for the prop (different from service shape).
import type { ScanCandidate as MapScanCandidate } from '@/components/scanner/ScannerMap';
import ScanPanel from '@/components/scanner/ScanPanel';
import BuildingDetail from '@/components/scanner/BuildingDetail';
import BuildingMeasurements from '@/components/scanner/BuildingMeasurements';
import MapSearchOverlay from '@/components/scanner/MapSearchOverlay';
import ScanRequestsPanel from '@/components/scanner/ScanRequestsPanel';
import BillUploadCard, { type BillPrefillData } from '@/components/scanner/BillUploadCard';
import ScannerTopNav, {
  type ScannerMode,
  type ScannerTipo,
  type GradeFilter,
  type PanamaZone,
} from '@/components/scanner/ScannerTopNav';
import CandidateReviewPanel from '@/components/scanner/CandidateReviewPanel';
import ScannerLegend from '@/components/scanner/ScannerLegend';

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

// Snap heights for the mobile bottom sheet (as % of viewport height)
// peek = 72px (drag handle + key action row), half = 45%, full = 88%
const SHEET_SNAP_PEEK = 72;
const SHEET_SNAP_HALF = 0.45; // ratio of window.innerHeight
const SHEET_SNAP_FULL = 0.88;

type SheetSnap = 'peek' | 'half' | 'full';

function snapToHeight(snap: SheetSnap, vh: number): number {
  if (snap === 'peek') return SHEET_SNAP_PEEK;
  if (snap === 'half') return Math.round(vh * SHEET_SNAP_HALF);
  return Math.round(vh * SHEET_SNAP_FULL);
}

// ===== MOBILE BOTTOM SHEET =====

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (s: SheetSnap) => void;
  children: React.ReactNode;
  /** Peek-state action bar rendered above the drag handle */
  peekContent?: React.ReactNode;
}

function BottomSheet({ snap, onSnapChange, children, peekContent }: BottomSheetProps) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const height = snapToHeight(snap, vh);

  // Drag to snap
  const dragStartY = useRef<number>(0);

  return (
    <motion.div
      animate={{ height }}
      transition={{ type: 'spring', damping: 32, stiffness: 340 }}
      className="absolute bottom-0 left-0 right-0 z-30 flex flex-col rounded-t-2xl bg-[#0d0d14]/97 backdrop-blur-2xl border-t border-white/[0.07] overflow-hidden"
      style={{ maxHeight: '92dvh' }}
    >
      {/* Drag handle area */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-2.5 pb-0 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={(e) => {
          dragStartY.current = e.clientY;
          const el = e.currentTarget;
          const onMove = (mv: PointerEvent) => {
            const dy = mv.clientY - dragStartY.current;
            if (dy < -40 && snap !== 'full') {
              onSnapChange(snap === 'peek' ? 'half' : 'full');
              el.releasePointerCapture(mv.pointerId);
            } else if (dy > 40 && snap !== 'peek') {
              onSnapChange(snap === 'full' ? 'half' : 'peek');
              el.releasePointerCapture(mv.pointerId);
            }
          };
          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
          };
          el.setPointerCapture(e.pointerId);
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
        }}
      >
        {/* Visual drag pill */}
        <div className="w-10 h-1 rounded-full bg-white/20 mb-2" />

        {/* Tap to cycle snaps */}
        <button
          onClick={() => onSnapChange(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] text-[#8888a0] hover:text-[#f0f0f5] transition-colors"
          aria-label={snap === 'full' ? 'Minimizar panel' : 'Expandir panel'}
        >
          {snap === 'full'
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronUp className="w-3.5 h-3.5" />
          }
          <span className="hidden sm:inline">
            {snap === 'peek' ? 'Expandir' : snap === 'half' ? 'Completo' : 'Minimizar'}
          </span>
        </button>
      </div>

      {/* Peek bar — always visible above fold */}
      {peekContent && (
        <div className="flex-shrink-0 px-4 pb-2">
          {peekContent}
        </div>
      )}

      {/* Scrollable content — hidden in peek state */}
      <AnimatePresence initial={false}>
        {snap !== 'peek' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto overscroll-contain min-h-0"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ===== MODE SEGMENTED CONTROL (internal legacy scan/draw/browse) =====

type InternalScannerMode = 'scan' | 'draw' | 'browse';

interface ModeSegmentProps {
  mode: InternalScannerMode;
  onChange: (m: InternalScannerMode) => void;
  hasBuildingSelected: boolean;
}

function ModeSegment({ mode, onChange, hasBuildingSelected }: ModeSegmentProps) {
  const options: { key: InternalScannerMode; label: string; icon: React.ReactNode }[] = [
    { key: 'scan', label: 'Escanear', icon: <ScanLine className="w-3.5 h-3.5" /> },
    { key: 'draw', label: 'Dibujar', icon: <PencilRuler className="w-3.5 h-3.5" /> },
    { key: 'browse', label: 'Explorar', icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center bg-[#0a0a0f]/80 rounded-xl border border-white/[0.07] p-1 gap-0.5">
      {options.map((opt) => {
        const active = mode === opt.key;
        const disabled = opt.key === 'draw' && !hasBuildingSelected;
        return (
          <button
            key={opt.key}
            onClick={() => !disabled && onChange(opt.key)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              active
                ? 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/25'
                : disabled
                ? 'text-[#333340] cursor-not-allowed'
                : 'text-[#8888a0] hover:text-[#f0f0f5]'
            }`}
            title={disabled ? 'Selecciona un edificio primero' : undefined}
          >
            {opt.icon}
            <span className="hidden xs:inline sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ===== MOBILE FAB STACK (top-right on mobile) =====

interface MobileFABStackProps {
  mode: InternalScannerMode;
  onModeChange: (m: InternalScannerMode) => void;
  isScanning: boolean;
  isQueuing: boolean;
  onScanViewport: () => void;
  onQueueScan: () => void;
  onOpenSearch: () => void;
  measureMode: boolean;
  onToggleMeasure: () => void;
  hasBuildingSelected: boolean;
  onOpenSheet: () => void;
  buildingCount: number;
}

function MobileFABStack({
  isScanning,
  onScanViewport,
  onOpenSearch,
}: MobileFABStackProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onOpenSearch}
        style={{ minWidth: 44, minHeight: 44 }}
        className="w-11 h-11 rounded-full flex items-center justify-center bg-[#12121a]/90 border border-white/[0.08] shadow-lg backdrop-blur-xl"
        aria-label="Buscar lugar"
      >
        <Search className="w-5 h-5 text-[#8888a0]" />
      </motion.button>

      {/* Scan */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onScanViewport}
        disabled={isScanning}
        style={{ minWidth: 44, minHeight: 44 }}
        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg backdrop-blur-xl border transition-all ${
          isScanning
            ? 'bg-[#00ffcc]/15 border-[#00ffcc]/30 shadow-[0_0_14px_rgba(0,255,204,0.2)]'
            : 'bg-[#12121a]/90 border-white/[0.08] hover:border-[#00ffcc]/25'
        }`}
        aria-label="Escanear área"
      >
        <ScanLine className={`w-5 h-5 ${isScanning ? 'text-[#00ffcc] animate-spin' : 'text-[#8888a0]'}`} />
      </motion.button>
    </div>
  );
}

// ===== SHAPE MAPPING =====

/**
 * Maps a candidateService.ScanCandidate (DB shape) to the local ScannerMap
 * ScanCandidate shape.  The two types differ in field names:
 *   service: latitude/longitude, estimated_kwp/estimated_mwp, geom: Record<string,unknown>|null
 *   map:     lat/lng,           kwp/mwp,                      geom?: GeoJSON.Polygon
 */
function toMapCandidate(c: ScanCandidate): MapScanCandidate {
  // candidateService stores geom as Record<string,unknown>|null (raw DB JSON).
  // We need GeoJSON.Polygon for ScannerMap — cast after validating type field.
  let geom: GeoJSON.Polygon | undefined;
  if (
    c.geom &&
    typeof c.geom === 'object' &&
    (c.geom as { type?: unknown }).type === 'Polygon'
  ) {
    // The PostGIS geom column returns valid GeoJSON; the cast is safe here.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    geom = c.geom as unknown as GeoJSON.Polygon;
  }

  return {
    id: c.id,
    kind: c.kind,
    geom,
    lat: c.latitude,
    lng: c.longitude,
    area_m2: c.area_m2,
    kwp: c.estimated_kwp > 0 ? c.estimated_kwp : undefined,
    mwp: c.estimated_mwp > 0 ? c.estimated_mwp : undefined,
    tier: c.tier,
    grade: c.grade,
    address: c.address ?? undefined,
  };
}

// ===== MAIN COMPONENT =====

export default function RoofScannerPage() {
  const scanner = useRoofScanner();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const { requests: scanRequests, isQueuing, queueScan } = useScanRequests();

  const selectedZoneNameRef = useRef<string | undefined>(undefined);
  selectedZoneNameRef.current = areaSelectedZone?.name;

  // Local state
  const [mapCenter, setMapCenter] = useState<[number, number]>([-79.52, 9.0]);
  const [mapZoom, setMapZoom] = useState(14);
  const [mapBounds, setMapBounds] = useState<MapBounds>({
    north: 9.05, south: 8.95, east: -79.47, west: -79.57,
  });
  const [isSavingLeads, setIsSavingLeads] = useState(false);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);
  const [searchMarker, setSearchMarker] = useState<{ lng: number; lat: number } | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [parcelBoundary, setParcelBoundary] = useState<Array<{ lat: number; lng: number }> | undefined>(undefined);
  const [cadastre, setCadastre] = useState<CadastreInfo | null>(null);
  const [billPrefillKwh, setBillPrefillKwh] = useState<number | null>(null);
  const [drawnRoofPolygon, setDrawnRoofPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [detectedCandidates, setDetectedCandidates] = useState<DetectedRoofCandidate[]>([]);
  const scanIdByBuildingRef = useRef<Map<number, string>>(new Map());

  // ===== RESPONSIVE STATE =====
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ===== INTERNAL SCANNER MODE (scan/draw/browse within building detail) =====
  const [scannerMode, setScannerMode] = useState<InternalScannerMode>('scan');

  // When a building is deselected, exit draw mode
  useEffect(() => {
    if (!selectedBuilding && scannerMode === 'draw') {
      setScannerMode('scan');
    }
  }, [selectedBuilding, scannerMode]);

  // ===== TOP NAV STATE =====
  /** tipo: which kind of candidates are active — roofs or land parcels */
  const [tipo, setTipo] = useState<ScannerTipo>('roof');
  /** navMode: top-level display mode from ScannerTopNav */
  const [navMode, setNavMode] = useState<ScannerMode>('mapa');
  /** grade filter: which grade letters to show */
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
  /** active zone chip id */
  const [activeZone, setActiveZone] = useState<string | undefined>(undefined);
  /** legend popover open */
  const [legendOpen, setLegendOpen] = useState(false);

  // ===== CANDIDATE STATE =====
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | undefined>(undefined);

  // ===== CANDIDATE FETCH =====
  const loadCandidates = useCallback(async (kind: ScannerTipo) => {
    setCandidatesLoading(true);
    try {
      const data = await fetchCandidates({ kind });
      setCandidates(data);
    } catch (err) {
      console.error('[RoofScannerPage] fetchCandidates error:', err);
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  // Fetch on mount and whenever tipo changes
  useEffect(() => {
    void loadCandidates(tipo);
  }, [tipo, loadCandidates]);

  // ===== GRADE-FILTERED CANDIDATES =====
  const filteredCandidates = useMemo<ScanCandidate[]>(() => {
    if (gradeFilter === 'all') return candidates;
    return candidates.filter((c) => c.grade === gradeFilter);
  }, [candidates, gradeFilter]);

  /** Mapped to ScannerMap's local shape */
  const mapCandidates = useMemo<MapScanCandidate[]>(
    () => filteredCandidates.map(toMapCandidate),
    [filteredCandidates]
  );

  // ===== COUNTS FOR TOP NAV =====
  const candidateCounts = useMemo(() => {
    const roofs = candidates.filter((c) => c.kind === 'roof').length;
    const land = candidates.filter((c) => c.kind === 'land').length;
    const pending = candidates.length; // all fetched are pending by default
    return { roofs, land, pending };
  }, [candidates]);

  // ===== MOBILE SHEET STATE =====
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');

  // When a building is selected on mobile, snap to half
  useEffect(() => {
    if (isMobile && selectedBuilding) {
      setSheetSnap('half');
    }
  }, [isMobile, selectedBuilding]);

  // ===== MOBILE SEARCH OVERLAY =====
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // ===== DESKTOP PANEL STATE =====
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

  // ===== DERIVED =====
  const isSelectedLeadSaved = useMemo(() => {
    if (!selectedBuilding) return false;
    return allLeads.some((l) => l.osmId === selectedBuilding.osmId);
  }, [selectedBuilding, allLeads]);

  // ===== HANDLERS =====

  const handleSearch = useCallback(async (address: string) => {
    try {
      const result = await geocodeAddress(address);
      setMapCenter([result.lng, result.lat]);
      setMapZoom(17);
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
  }, []);

  const handleBillData = useCallback(async (data: BillPrefillData) => {
    setBillPrefillKwh(data.monthly_kwh);
    if (data.address) {
      try {
        const geo = await geocodeAddress(data.address);
        setMapCenter([geo.lng, geo.lat]);
        setMapZoom(17);
        setSearchMarker({ lng: geo.lng, lat: geo.lat });
      } catch {
        // silently skip
      }
    }
    toast({
      type: 'success',
      title: 'Factura procesada',
      description: `Consumo mensual: ${data.monthly_kwh.toLocaleString('es-PA')} kWh/mes`,
    });
  }, [toast]);

  const handleSearchPlace = useCallback((result: GeocodingResult) => {
    setMapCenter([result.lng, result.lat]);
    setMapZoom(17);
    setSearchMarker({ lng: result.lng, lat: result.lat });
    setMobileSearchOpen(false);
  }, []);

  const handleScanViewport = useCallback(() => {
    const bounds = getActiveBounds() ?? mapBounds;
    scanViewport(bounds);
  }, [scanViewport, mapBounds, getActiveBounds]);

  const handleQueueScan = useCallback(async () => {
    const bounds = getActiveBounds() ?? mapBounds;
    const { west: minLng, south: minLat, east: maxLng, north: maxLat } = bounds;
    const bbox: number[] = [minLng, minLat, maxLng, maxLat];

    if (Math.abs(maxLng - minLng) > MAX_BBOX_SIDE_DEG || Math.abs(maxLat - minLat) > MAX_BBOX_SIDE_DEG) {
      toast({
        type: 'warning',
        title: 'Área demasiado grande',
        description: `Acerca el mapa: cada lado debe ser menor a ${MAX_BBOX_SIDE_DEG}°.`,
      });
      return;
    }

    const areaGeojson = {
      type: 'Polygon' as const,
      coordinates: [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]],
    };

    // Thread scan_type via the filters bag.
    // The create_scan_request RPC passes filters to the cron as a jsonb column;
    // the cron reads filters.scan_type to branch between roof and land logic.
    // This avoids needing an RPC signature change — the filters bag is already
    // forwarded verbatim to the cron worker.
    const filters: Record<string, unknown> = { scan_type: tipo };

    const result = await queueScan(areaGeojson, bbox, filters);
    if ('error' in result) {
      toast({ type: 'error', title: 'No se pudo encolar el escaneo', description: result.error });
      return;
    }
    toast({
      type: 'success',
      title: 'Escaneo encolado',
      description: tipo === 'land'
        ? 'El cron buscará terrenos en el área seleccionada.'
        : 'Los leads aparecerán a medida que el worker procese el área.',
    });
  }, [getActiveBounds, mapBounds, queueScan, toast, tipo]);

  const handleBuildingSelect = useCallback(
    (id: number) => {
      selectBuilding(id);
      setRightOpen(true);
      setSavedLeadId(null);
      const building = buildings.find((b) => b.id === id);
      if (building?.center) {
        setMapCenter([building.center.lng, building.center.lat]);
        setMapZoom(16.5);
        setSearchMarker({ lng: building.center.lng, lat: building.center.lat });

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
    setSavedLeadId(null);
    setDrawnRoofPolygon(null);
    setScannerMode('scan');
    if (isMobile) setSheetSnap('peek');
  }, [selectBuilding, isMobile]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedBuilding) return;
    await analyzeBuilding(selectedBuilding);
  }, [selectedBuilding, analyzeBuilding]);

  const handleFilterChange = useCallback(
    (filters: { minArea: number; minScore: number }) => setFilters(filters),
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
    createLeadFromBuilding(selectedBuilding, selectedZoneNameRef.current, enrichedData);

    const scan = selectedBuilding.solarAnalysis;
    if (!scan) return;

    const owner: EnrichedOwnerResult | null = enrichedData ?? null;
    const financials = calculateSolarFinancials({
      systemSizeKwp: scan.maxSystemSizeKwp,
      pshAvg: scan.peakSunHoursPerYear / 365,
    });
    const estAnnualSavingsUsd: number | null = financials.annual_savings_usd;
    const paybackYears: number | null = financials.payback_discounted_years;

    void (async () => {
      const saved = await persistScan(scan as RoofScanResult, owner, financials);
      const rawPhone = owner?.phone ?? '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      if (!/^507[2-8]\d{7}$/.test(cleanPhone)) return;

      const attribution = getAttribution();
      try {
        const resp = await fetch('/api/leads/intake', {
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
        const json = await resp.json().catch(() => null);
        if (json?.id) setSavedLeadId(String(json.id));
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

  // ===== P2: Roof draw =====
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
      setDrawnRoofPolygon(polygon as unknown as GeoJSON.Polygon);
      try {
        let scanId = scanIdByBuildingRef.current.get(selectedBuilding.id) ?? null;
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

  // ===== P3: Candidate confirm / reject (legacy DetectedRoofCandidate flow) =====
  const handleConfirmCandidate = useCallback(
    async (index: number) => {
      const candidate = detectedCandidates[index];
      if (!candidate) return;
      try {
        await insertDetectedRoof(candidate);
        setDetectedCandidates((prev) => prev.filter((_, i) => i !== index));
        toast({ type: 'success', title: 'Lead creado' });
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

  // ===== CandidateReviewPanel handlers (scan_candidates table) =====

  const handleApproveCandidate = useCallback(async (id: string) => {
    try {
      await approveCandidate(id);
      toast({ type: 'success', title: 'Lead creado' });
      void loadCandidates(tipo);
    } catch (err) {
      toast({
        type: 'error',
        title: 'Error al aprobar candidato',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [tipo, loadCandidates, toast]);

  const handleRejectCandidateFromPanel = useCallback(async (id: string, reason: CandidateRejectionReason) => {
    try {
      await rejectCandidate(id, reason);
      void loadCandidates(tipo);
    } catch (err) {
      toast({
        type: 'error',
        title: 'Error al rechazar candidato',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [tipo, loadCandidates, toast]);

  const handleBulkApprove = useCallback(async (ids: string[]) => {
    await Promise.allSettled(ids.map((id) => approveCandidate(id)));
    toast({ type: 'success', title: `${ids.length} leads creados` });
    void loadCandidates(tipo);
  }, [tipo, loadCandidates, toast]);

  const handleBulkReject = useCallback(async (ids: string[]) => {
    await Promise.allSettled(ids.map((id) => rejectCandidate(id, 'other')));
    void loadCandidates(tipo);
  }, [tipo, loadCandidates]);

  const handleReScan = useCallback(async () => {
    try {
      await applyLearnedFilters();
      toast({ type: 'success', title: 'Filtros aplicados', description: 'Lista actualizada con filtros aprendidos.' });
      void loadCandidates(tipo);
    } catch (err) {
      toast({
        type: 'error',
        title: 'Error al re-escanear',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [tipo, loadCandidates, toast]);

  const handleFocusCandidate = useCallback((candidate: ScanCandidate) => {
    setSelectedCandidateId(candidate.id);
    setMapCenter([candidate.longitude, candidate.latitude]);
    setMapZoom(17);
  }, []);

  // ===== TOP NAV HANDLERS =====

  const handleTipo = useCallback((t: ScannerTipo) => {
    setTipo(t);
    // loadCandidates fires via the useEffect above on tipo change
  }, []);

  const handleMode = useCallback((m: ScannerMode) => {
    if (m === 'panel') {
      navigate('/dashboard');
      return;
    }
    if (m === 'leads') {
      navigate('/leads');
      return;
    }
    setNavMode(m);
  }, [navigate]);

  const handleZone = useCallback((zone: PanamaZone) => {
    setActiveZone(zone.id);
    setMapCenter(zone.center);
    setMapZoom(zone.zoom);
  }, []);

  // ===== DERIVED =====

  const selectedBuildingCenter = useMemo(
    () => selectedBuilding
      ? { lng: selectedBuilding.center.lng, lat: selectedBuilding.center.lat }
      : null,
    [selectedBuilding]
  );

  const selectedScore = selectedBuilding?.suitability.score ?? 0;
  const scoreColor =
    selectedScore >= 80 ? '#00ffcc' :
    selectedScore >= 60 ? '#22c55e' :
    selectedScore >= 40 ? '#f59e0b' : '#ef4444';

  // ===== PEEK BAR CONTENT =====
  const peekBar = (
    <div className="flex items-center gap-2 py-1">
      {/* Mode segmented control */}
      <ModeSegment
        mode={scannerMode}
        onChange={setScannerMode}
        hasBuildingSelected={!!selectedBuilding}
      />

      {/* Scan / queue actions */}
      <div className="ml-auto flex items-center gap-1.5">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleScanViewport}
          disabled={isScanning}
          style={{ minWidth: 44, minHeight: 44 }}
          className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
            isScanning
              ? 'bg-[#00ffcc]/15 border-[#00ffcc]/30'
              : 'bg-white/[0.04] border-white/[0.07] hover:border-[#00ffcc]/25'
          }`}
          aria-label="Escanear"
        >
          <ScanLine className={`w-5 h-5 ${isScanning ? 'text-[#00ffcc] animate-spin' : 'text-[#8888a0]'}`} />
        </motion.button>

        {buildings.length > 0 && (
          <button
            onClick={clearBuildings}
            style={{ minWidth: 44, minHeight: 44 }}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.07] text-[#8888a0] hover:text-[#f0f0f5] transition-colors"
            aria-label="Limpiar edificios"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleQueueScan}
          disabled={isQueuing}
          style={{ minWidth: 44, minHeight: 44 }}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.07] text-[#8888a0] hover:text-[#0ea5e9] transition-colors"
          aria-label="Escaneo en segundo plano"
        >
          {isQueuing ? <Loader2 className="w-5 h-5 animate-spin text-[#0ea5e9]" /> : <Radar className="w-5 h-5" />}
        </motion.button>
      </div>
    </div>
  );

  // ===== CANDIDATE REVIEW PANEL (shared JSX) =====
  const candidateReviewPanel = (
    <CandidateReviewPanel
      candidates={filteredCandidates}
      onApprove={handleApproveCandidate}
      onReject={handleRejectCandidateFromPanel}
      onBulkApprove={handleBulkApprove}
      onBulkReject={handleBulkReject}
      onReScan={handleReScan}
      onFocus={handleFocusCandidate}
      selectedId={selectedCandidateId}
      loading={candidatesLoading}
      kind={tipo}
    />
  );

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-[#0a0a0f]">

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
          panelRoofPolygon={drawnRoofPolygon}
          capasPosition="bottom-right"
          scanCandidates={mapCandidates}
          selectedCandidateId={selectedCandidateId}
          onCandidateClick={setSelectedCandidateId}
          tipo={tipo}
        />
      </div>

      {/* ===== SCANNER TOP NAV ===== */}
      {/* Sits above the map at z-20; ScannerMap controls are at z-10/z-20 */}
      <ScannerTopNav
        tipo={tipo}
        onTipo={handleTipo}
        mode={navMode}
        onMode={handleMode}
        zone={activeZone}
        onZone={handleZone}
        gradeFilter={gradeFilter}
        onGrade={setGradeFilter}
        onOpenLegend={() => setLegendOpen(true)}
        counts={candidateCounts}
      />

      {/* ===== LEGEND POPOVER ===== */}
      {/* Floats top-right, below the nav bar — ScannerLegend uses absolute top-[60px] right-3 */}
      <ScannerLegend
        open={legendOpen}
        onClose={() => setLegendOpen(false)}
      />

      {/* Desktop search is handled by the ScanPanel search bar on the left hover panel.
          Mobile search overlay is retained below (triggered by the search icon). */}

      {/* ===== ASYNC SCAN STATUS ===== */}
      <ScanRequestsPanel requests={scanRequests} />

      {/* ===== DESKTOP LAYOUT (>=768px) ===== */}
      {!isMobile && (
        <>
          {/* LEFT PANEL — hover-activated */}
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
              {/* Extra top padding so the panel content clears the ScannerTopNav (~56px) */}
              <div className="pt-14">
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
              </div>

              {/* Bill OCR card */}
              <div className="px-2 pb-2">
                {billPrefillKwh !== null && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#00ffcc]/[0.07] border border-[#00ffcc]/15 px-3 py-2">
                    <span className="text-[11px] text-[#00ffcc]">
                      Consumo de factura: <strong>{billPrefillKwh.toLocaleString('es-PA')} kWh/mes</strong>
                    </span>
                  </div>
                )}
                <BillUploadCard onUseBillData={handleBillData} />
              </div>

              {/* Desktop collapse tab — sticks out right when panel is closed */}
              <motion.div
                animate={{ opacity: leftOpen ? 0 : 1, pointerEvents: leftOpen ? 'none' : 'auto' }}
                transition={{ duration: 0.15 }}
                className="absolute top-20 right-0 translate-x-full flex flex-col items-center gap-2 py-3 px-2 rounded-r-xl bg-[#12121a]/90 backdrop-blur-xl border border-l-0 border-white/[0.06] cursor-pointer"
                aria-label="Abrir panel de escaneo"
              >
                <ScanLine className="w-4 h-4 text-[#00ffcc]" />
                {buildings.length > 0 && (
                  <span className="text-[10px] font-bold text-[#00ffcc] bg-[#00ffcc]/10 rounded-full min-w-[24px] h-6 flex items-center justify-center px-1">
                    {buildings.length}
                  </span>
                )}
                <ChevronLeft className="w-3 h-3 text-[#555566] rotate-180" />
              </motion.div>
            </motion.div>
          </div>

          {/* MEASUREMENT PANEL */}
          <AnimatePresence>
            {measureMode && selectedBuilding && (
              <div className="absolute right-[440px] top-16 z-30">
                <BuildingMeasurements
                  building={selectedBuilding}
                  onFullAnalysis={!selectedBuilding.analyzed ? handleAnalyze : undefined}
                  onSave={handleSaveAsLead}
                />
              </div>
            )}
          </AnimatePresence>

          {/* RIGHT PANEL — building detail OR candidate review (Escáner mode) */}
          {navMode === 'escaner' && !selectedBuilding ? (
            /* Candidate review panel — full-height right panel */
            <motion.div
              initial={{ opacity: 0, x: 340 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 340 }}
              transition={PANEL_SPRING}
              className="absolute right-0 top-14 bottom-0 z-30 w-[340px] overflow-hidden"
              onMouseEnter={openRight}
              onMouseLeave={closeRight}
            >
              <div className="h-full overflow-y-auto overscroll-contain">
                {candidateReviewPanel}
              </div>
            </motion.div>
          ) : (
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
                    {/* Collapsed tab */}
                    <motion.div
                      animate={{ opacity: rightOpen ? 0 : 1, pointerEvents: rightOpen ? 'none' : 'auto' }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-3 left-0 -translate-x-full flex flex-col items-center gap-2 py-3 px-2 rounded-l-xl bg-[#12121a]/90 backdrop-blur-xl border border-r-0 border-white/[0.06] cursor-pointer"
                      aria-label="Abrir detalle del edificio"
                    >
                      <Building2 className="w-4 h-4" style={{ color: scoreColor }} />
                      <span
                        className="text-[10px] font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1"
                        style={{ color: scoreColor, backgroundColor: `${scoreColor}15` }}
                      >
                        {selectedScore}
                      </span>
                      <ChevronLeft className="w-3 h-3 text-[#555566]" />
                    </motion.div>

                    <BuildingDetail
                      building={selectedBuilding}
                      isAnalyzing={isAnalyzing}
                      onClose={handleCloseDetail}
                      onAnalyze={handleAnalyze}
                      onSaveAsLead={handleSaveAsLead}
                      isLeadSaved={isSelectedLeadSaved}
                      savedLeadId={savedLeadId}
                      monthlyKwhOverride={billPrefillKwh}
                    />

                    {/* Registro Público / parcel info */}
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
                          Sin finca registrada — posible Derecho Posesorio.
                        </p>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* DESKTOP: draw toolbar — bottom center */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 p-1.5 rounded-2xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleScanViewport}
              disabled={isScanning}
              style={{ minWidth: 44, minHeight: 44 }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isScanning ? 'bg-[#00ffcc]/10 text-[#00ffcc]' : 'text-[#8888a0] hover:bg-white/[0.06] hover:text-white/80'
              }`}
              title="Escanear edificios en vista"
            >
              <ScanLine className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleQueueScan}
              disabled={isQueuing}
              style={{ minWidth: 44, minHeight: 44 }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isQueuing ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' : 'text-[#8888a0] hover:bg-[#0ea5e9]/10 hover:text-[#0ea5e9]'
              }`}
              title="Encolar escaneo de fondo"
            >
              {isQueuing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radar className="w-5 h-5" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearBuildings}
              style={{ minWidth: 44, minHeight: 44 }}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-[#8888a0] hover:bg-white/[0.06] hover:text-white/80 transition-all"
              title="Limpiar edificios"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </>
      )}

      {/* ===== MOBILE LAYOUT (<768px) ===== */}
      {isMobile && (
        <>
          {/* Mobile: top-right FAB stack (search + scan) — above map nav controls */}
          {/* Pushed down by the top nav bar (~56px + 3 gap = ~60px offset) */}
          <div
            className="absolute right-3 z-20 flex flex-col gap-2"
            style={{ top: 'calc(64px + env(safe-area-inset-top, 0px))' }}
          >
            <MobileFABStack
              mode={scannerMode}
              onModeChange={setScannerMode}
              isScanning={isScanning}
              isQueuing={isQueuing}
              onScanViewport={handleScanViewport}
              onQueueScan={handleQueueScan}
              onOpenSearch={() => setMobileSearchOpen((v) => !v)}
              measureMode={measureMode}
              onToggleMeasure={() => setMeasureMode((v) => !v)}
              hasBuildingSelected={!!selectedBuilding}
              onOpenSheet={() => setSheetSnap('half')}
              buildingCount={buildings.length}
            />
          </div>

          {/* Mobile search overlay — shown when triggered */}
          <AnimatePresence>
            {mobileSearchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute z-30"
                style={{
                  top: `calc(64px + env(safe-area-inset-top, 0px))`,
                  left: '0.75rem',
                  right: '4.5rem',
                }}
              >
                <MapSearchOverlay
                  onSelectPlace={handleSearchPlace}
                  className="relative z-30 w-full"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile bottom sheet */}
          <BottomSheet
            snap={sheetSnap}
            onSnapChange={setSheetSnap}
            peekContent={peekBar}
          >
            {/* When a building is selected, show building detail */}
            {selectedBuilding ? (
              <div className="relative pb-safe">
                <BuildingDetail
                  building={selectedBuilding}
                  isAnalyzing={isAnalyzing}
                  onClose={handleCloseDetail}
                  onAnalyze={handleAnalyze}
                  onSaveAsLead={handleSaveAsLead}
                  isLeadSaved={isSelectedLeadSaved}
                  savedLeadId={savedLeadId}
                  monthlyKwhOverride={billPrefillKwh}
                />
                {/* Parcel info */}
                <div className="px-3 pb-4">
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
                      Sin finca registrada — posible Derecho Posesorio.
                    </p>
                  )}
                </div>
              </div>
            ) : navMode === 'escaner' ? (
              /* Escáner mode: show candidate review queue in the sheet */
              <div className="pb-safe">
                {candidateReviewPanel}
              </div>
            ) : (
              /* Mapa mode: Scan results / ScanPanel content */
              <div className="pb-safe">
                <ScanPanel
                  buildings={buildings}
                  selectedBuildingId={selectedBuildingId}
                  isScanning={isScanning}
                  stats={stats}
                  onSearch={handleSearch}
                  onScanViewport={handleScanViewport}
                  onBuildingSelect={(id) => {
                    handleBuildingSelect(id);
                    setSheetSnap('half');
                  }}
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
                <div className="px-3 pb-4">
                  {billPrefillKwh !== null && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#00ffcc]/[0.07] border border-[#00ffcc]/15 px-3 py-2">
                      <span className="text-[11px] text-[#00ffcc]">
                        Factura: <strong>{billPrefillKwh.toLocaleString('es-PA')} kWh/mes</strong>
                      </span>
                    </div>
                  )}
                  <BillUploadCard onUseBillData={handleBillData} />
                </div>
              </div>
            )}
          </BottomSheet>
        </>
      )}
    </div>
  );
}
