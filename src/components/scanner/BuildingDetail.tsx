// framer-motion removed — parent handles animation
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, Sun, Zap, DollarSign, ExternalLink,
  Layers, Ruler, BarChart3, ArrowRight, Sparkles, MapPin, UserPlus,
  Search, Phone, Mail, Globe, MessageCircle, Loader2, Store, Navigation, MapPinned,
  Copy, Shield, Briefcase, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { PANAMA_DEFAULTS } from '@/services/solarCalculator';
import {
  researchBuildingOwner,
  buildWhatsAppUrl,
  buildCallUrl,
} from '@/services/ownerResearchService';
import { ResearchProgress, type ResearchStep } from '@/components/scanner/ResearchProgress';
import { ConfidenceScore } from '@/components/scanner/ConfidenceScore';
import type { EnrichedOwnerResult, ProgressStatus } from '@/types/enrichment';
import type { RoofScanResult } from '@/services/roofScannerService';
import type { SuitabilityResult } from '@/services/roofClassifier';

// ===== TYPES =====

export interface DetailBuilding {
  id: number;
  osmId: number;
  name: string;
  area: number;
  buildingType: string;
  center: { lat: number; lng: number };
  suitability: SuitabilityResult;
  analyzed: boolean;
  solarAnalysis?: RoofScanResult;
}

interface BuildingDetailProps {
  building: DetailBuilding | null;
  isAnalyzing: boolean;
  onClose: () => void;
  onAnalyze: () => void;
  onSaveAsLead?: (enrichedData?: EnrichedOwnerResult) => void;
  isLeadSaved?: boolean;
}

// ===== CONSTANTS =====

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHLY_FRACTIONS = [0.092, 0.090, 0.098, 0.085, 0.075, 0.070, 0.072, 0.070, 0.068, 0.070, 0.075, 0.085];
const FRACTION_SUM = MONTHLY_FRACTIONS.reduce((s, f) => s + f, 0);

const SOURCE_LABELS: Record<string, string> = {
  OpenStreetMap: 'OSM',
  Nominatim: 'Nominatim',
  'Google Places': 'Google',
  'ANATI Cadastre': 'ANATI',
  'Panama Emprende': 'Emprende',
  OpenCorporates: 'OpenCorp',
  'Apollo.io': 'Apollo',
};

// ===== HELPERS =====

function getScoreColor(score: number): string {
  if (score >= 80) return '#00ffcc';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getGradeLabel(grade: string): string {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Fair';
    case 'D': return 'Poor';
    default: return grade;
  }
}

const fmt = (n: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n);

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function getBusinessStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'active': return { bg: 'bg-[#10b981]/10', text: 'text-[#10b981]' };
    case 'inactive': return { bg: 'bg-[#ef4444]/10', text: 'text-[#ef4444]' };
    case 'suspended': return { bg: 'bg-[#f59e0b]/10', text: 'text-[#f59e0b]' };
    default: return { bg: 'bg-[#555566]/10', text: 'text-[#555566]' };
  }
}

// ===== COMPONENT =====

export default function BuildingDetail({
  building,
  isAnalyzing,
  onClose,
  onAnalyze,
  onSaveAsLead,
  isLeadSaved,
}: BuildingDetailProps) {
  const [enrichedData, setEnrichedData] = useState<EnrichedOwnerResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchAttempted, setResearchAttempted] = useState(false);
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [showOfficers, setShowOfficers] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [copiedFinca, setCopiedFinca] = useState(false);

  // Reset state when building changes
  useEffect(() => {
    setEnrichedData(null);
    setResearchAttempted(false);
    setResearchSteps([]);
    setOverallProgress(0);
    setShowOfficers(false);
    setShowNearby(false);
  }, [building?.id]);

  const handleResearch = useCallback(async () => {
    if (!building) return;
    setIsResearching(true);
    setResearchAttempted(false);
    setEnrichedData(null);

    // Initialize steps
    const initialSteps: ResearchStep[] = [
      { source: 'OpenStreetMap', label: 'OpenStreetMap', status: 'pending' },
      { source: 'Nominatim', label: 'Reverse Geocode', status: 'pending' },
      { source: 'ANATI Cadastre', label: 'ANATI Cadastre', status: 'pending' },
      { source: 'Google Places', label: 'Google Maps', status: 'pending' },
      { source: 'Panama Emprende', label: 'Panama Emprende', status: 'pending' },
      { source: 'OpenCorporates', label: 'OpenCorporates', status: 'pending' },
    ];
    setResearchSteps(initialSteps);
    setOverallProgress(0);

    // Track completed count for progress
    let completedCount = 0;
    let totalSteps = initialSteps.length;

    try {
      const result = await researchBuildingOwner({
        lat: building.center.lat,
        lng: building.center.lng,
        osmId: building.osmId,
        buildingName: building.name || `Building ${building.id}`,
        onProgress: (step: string, status: ProgressStatus) => {
          setResearchSteps((prev) => {
            const existing = prev.find((s) => s.source === step);
            if (existing) {
              return prev.map((s) =>
                s.source === step ? { ...s, status } : s
              );
            }
            // Apollo.io might be added dynamically
            totalSteps = prev.length + 1;
            return [...prev, { source: step, label: step, status }];
          });

          if (status === 'done' || status === 'error') {
            completedCount++;
            setOverallProgress(Math.round((completedCount / totalSteps) * 100));
          }
        },
      });

      // Update steps with data point counts from enrichment sources
      setResearchSteps((prev) =>
        prev.map((step) => {
          const sourceData = result.enrichmentSources.find(
            (s) => s.source === step.source.toLowerCase().replace(/\s+/g, '_') ||
                   step.source.toLowerCase().includes(s.source.replace('_', ' '))
          );
          if (sourceData) {
            return { ...step, dataPoints: sourceData.dataPoints.length, status: sourceData.found ? 'done' : 'error' };
          }
          return step;
        })
      );

      setOverallProgress(100);
      setEnrichedData(result);
      setResearchAttempted(true);
    } catch {
      setResearchAttempted(true);
    } finally {
      setIsResearching(false);
    }
  }, [building]);

  const handleCopyFinca = useCallback((finca: string) => {
    navigator.clipboard.writeText(finca);
    setCopiedFinca(true);
    setTimeout(() => setCopiedFinca(false), 1500);
  }, []);

  if (!building) return null;

  const scoreColor = getScoreColor(building.suitability.score);

  // Calculate solar financials when analyzed
  const analysis = building.solarAnalysis;
  const kwp = analysis?.maxSystemSizeKwp ?? 0;
  const yearlyKwh = analysis?.yearlyEnergyKwh ?? 0;
  const panelCount = analysis?.maxPanelCount ?? 0;
  const investment = kwp * 1000 * PANAMA_DEFAULTS.costPerWp;
  const savings = yearlyKwh * PANAMA_DEFAULTS.electricityRate * PANAMA_DEFAULTS.selfConsumptionRatio;
  const payback = savings > 0 ? investment / savings : 0;
  const co2 = (yearlyKwh / 1000) * PANAMA_DEFAULTS.gridEmissionFactor;

  // Monthly production data
  const monthlyData = MONTH_LABELS.map((month, i) => ({
    month,
    production: Math.round((yearlyKwh * MONTHLY_FRACTIONS[i]) / FRACTION_SUM),
  }));

  return (
      <div
        className="w-[420px] h-full bg-[#0a0a0f]/98 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[#f0f0f5] truncate">
              {building.name || `Building #${building.id}`}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="px-3 py-1 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: `${scoreColor}15`,
                  color: scoreColor,
                }}
              >
                {building.suitability.score} - {getGradeLabel(building.suitability.grade)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Score Breakdown */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
              Suitability Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Roof Area', score: building.suitability.factors.area ?? 0, max: 50 },
                { label: 'Building Type', score: building.suitability.factors.type ?? 0, max: 30 },
                { label: 'Name Match', score: building.suitability.factors.name ?? 0, max: 20 },
              ].map((factor) => (
                <div key={factor.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#8888a0]">{factor.label}</span>
                    <span className="text-xs font-medium text-[#f0f0f5]">
                      {factor.score}/{factor.max}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(factor.score / factor.max) * 100}%`,
                        backgroundColor: getScoreColor((factor.score / factor.max) * 100),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Building Info */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
              Building Info
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                  <Ruler className="w-3.5 h-3.5 text-[#8b5cf6]" />
                </div>
                <div>
                  <div className="text-[11px] text-[#555566]">Area</div>
                  <div className="text-sm text-[#f0f0f5] font-medium">
                    {fmt(building.area)} m²
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-[#0ea5e9]" />
                </div>
                <div>
                  <div className="text-[11px] text-[#555566]">Type</div>
                  <div className="text-sm text-[#f0f0f5] font-medium capitalize">
                    {building.buildingType}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-[#22c55e]" />
                </div>
                <div>
                  <div className="text-[11px] text-[#555566]">Location</div>
                  <div className="text-sm text-[#f0f0f5] font-medium">
                    {building.center.lat.toFixed(5)}, {building.center.lng.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Deep Research Section */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#8b5cf6]" />
              Deep Research
            </h3>

            {/* Initial state: research button */}
            {!enrichedData && !isResearching && !researchAttempted && (
              <Button
                variant="secondary"
                fullWidth
                icon={<Search className="w-4 h-4" />}
                onClick={handleResearch}
              >
                Start Deep Research
              </Button>
            )}

            {/* No results state */}
            {!enrichedData && !isResearching && researchAttempted && (
              <div className="text-center py-3 space-y-2">
                <p className="text-sm text-[#555566]">
                  No contact info found in public directories
                </p>
                <Button
                  variant="secondary"
                  fullWidth
                  size="sm"
                  icon={<Search className="w-3.5 h-3.5" />}
                  onClick={handleResearch}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Research in progress */}
            {isResearching && researchSteps.length > 0 && (
              <ResearchProgress steps={researchSteps} overallProgress={overallProgress} />
            )}

            {isResearching && researchSteps.length === 0 && (
              <div className="flex items-center gap-2 py-3 justify-center">
                <Loader2 className="w-4 h-4 text-[#8b5cf6] animate-spin" />
                <span className="text-sm text-[#8888a0]">Initializing research...</span>
              </div>
            )}

            {/* Research results */}
            {enrichedData && (
              <div className="space-y-4">
                {/* Confidence Score */}
                <ConfidenceScore
                  score={enrichedData.confidenceScore}
                  sourcesWithData={enrichedData.totalSourcesWithData}
                  totalSources={enrichedData.totalSourcesQueried}
                  size="md"
                />

                {/* Address */}
                {enrichedData.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                      <Navigation className="w-3.5 h-3.5 text-[#22c55e]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-[#555566]">Address</div>
                      <div className="text-sm text-[#f0f0f5] font-medium leading-tight">{enrichedData.address}</div>
                    </div>
                  </div>
                )}

                {/* Owner / Business name */}
                {enrichedData.ownerName && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-[#8b5cf6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#555566]">Building Occupant</div>
                      <div className="text-sm text-[#f0f0f5] font-medium truncate">{enrichedData.ownerName}</div>
                    </div>
                  </div>
                )}

                {/* Contact Info with Source Labels */}
                {enrichedData.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-[#22c55e]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#555566]">Phone</div>
                      <div className="text-sm text-[#f0f0f5] font-medium">{enrichedData.phone}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {enrichedData.whatsappUrl && (
                        <a
                          href={enrichedData.whatsappUrl}
                          target="_blank"
                          rel="noopener"
                          className="p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                        </a>
                      )}
                      {enrichedData.callUrl && (
                        <a
                          href={enrichedData.callUrl}
                          className="p-1.5 rounded-lg bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 transition-colors"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#0ea5e9]" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {enrichedData.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5 text-[#f59e0b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#555566]">Email</div>
                      <a href={`mailto:${enrichedData.email}`} className="text-sm text-[#0ea5e9] hover:underline truncate block">
                        {enrichedData.email}
                      </a>
                    </div>
                  </div>
                )}

                {enrichedData.website && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#0ea5e9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#555566]">Website</div>
                      <a
                        href={enrichedData.website.startsWith('http') ? enrichedData.website : `https://${enrichedData.website}`}
                        target="_blank"
                        rel="noopener"
                        className="text-sm text-[#0ea5e9] hover:underline truncate block"
                      >
                        {enrichedData.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}

                {/* Social Media */}
                {(enrichedData.socialMedia.facebook || enrichedData.socialMedia.instagram || enrichedData.socialMedia.linkedin) && (
                  <div className="flex gap-2 flex-wrap">
                    {enrichedData.socialMedia.facebook && (
                      <a href={enrichedData.socialMedia.facebook} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors">Facebook</a>
                    )}
                    {enrichedData.socialMedia.instagram && (
                      <a href={enrichedData.socialMedia.instagram} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/20 transition-colors">Instagram</a>
                    )}
                    {enrichedData.socialMedia.linkedin && (
                      <a href={enrichedData.socialMedia.linkedin} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors">LinkedIn</a>
                    )}
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Cadastre Section */}
          <AnimatePresence>
            {enrichedData?.cadastre && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <GlassCard padding="md">
                  <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#f59e0b]" />
                    Cadastre / Property Record
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-[#555566]">Finca Number</div>
                        <div className="text-sm text-[#f0f0f5] font-medium">{enrichedData.cadastre.fincaNumber}</div>
                      </div>
                      <button
                        onClick={() => handleCopyFinca(enrichedData.cadastre!.fincaNumber)}
                        className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
                        title="Copy finca number"
                      >
                        {copiedFinca ? (
                          <span className="text-[10px] text-[#10b981] px-1">Copied</span>
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#8888a0]" />
                        )}
                      </button>
                    </div>
                    {enrichedData.cadastre.parcelArea > 0 && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Parcel Area</div>
                        <div className="text-sm text-[#f0f0f5] font-medium">{fmt(enrichedData.cadastre.parcelArea)} m²</div>
                      </div>
                    )}
                    {enrichedData.cadastre.landUse && enrichedData.cadastre.landUse !== 'unknown' && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Land Use</div>
                        <div className="text-sm text-[#f0f0f5] font-medium capitalize">{enrichedData.cadastre.landUse}</div>
                      </div>
                    )}
                    {enrichedData.cadastre.assessedValue != null && enrichedData.cadastre.assessedValue > 0 && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Assessed Value</div>
                        <div className="text-sm text-[#f0f0f5] font-medium">{fmtCurrency(enrichedData.cadastre.assessedValue)}</div>
                      </div>
                    )}
                    {enrichedData.cadastre.registroPublicoUrl && (
                      <a
                        href={enrichedData.cadastre.registroPublicoUrl}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center justify-center gap-1.5 w-full py-2 mt-1 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-xs text-[#0ea5e9] hover:text-[#00ffcc]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View in Registro Publico
                      </a>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Business License Section */}
          <AnimatePresence>
            {enrichedData?.businessLicense && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <GlassCard padding="md">
                  <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#0ea5e9]" />
                    Business License
                  </h3>
                  <div className="space-y-2.5">
                    {enrichedData.businessLicense.commercialName && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Commercial Name</div>
                        <div className="text-sm text-[#f0f0f5] font-medium">{enrichedData.businessLicense.commercialName}</div>
                      </div>
                    )}
                    {enrichedData.businessLicense.legalName && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Legal Name</div>
                        <div className="text-sm text-[#f0f0f5] font-medium">{enrichedData.businessLicense.legalName}</div>
                      </div>
                    )}
                    {enrichedData.businessLicense.avisoNumber && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Aviso de Operacion</div>
                        <div className="text-sm text-[#f0f0f5] font-medium">{enrichedData.businessLicense.avisoNumber}</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] text-[#555566]">Status</div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${getBusinessStatusColor(enrichedData.businessLicense.status).bg} ${getBusinessStatusColor(enrichedData.businessLicense.status).text}`}
                      >
                        {enrichedData.businessLicense.status}
                      </span>
                    </div>
                    {enrichedData.businessLicense.activityDescription && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Activity</div>
                        <div className="text-sm text-[#c0c0d0]">{enrichedData.businessLicense.activityDescription}</div>
                      </div>
                    )}
                    {enrichedData.businessLicense.entryDate && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Since</div>
                        <div className="text-sm text-[#c0c0d0]">{enrichedData.businessLicense.entryDate}</div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Corporate Info Section */}
          <AnimatePresence>
            {enrichedData?.corporateInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <GlassCard padding="md">
                  <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#00ffcc]" />
                    Corporate Registry
                  </h3>
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-[11px] text-[#555566]">Company</div>
                      <div className="text-sm text-[#f0f0f5] font-medium">{enrichedData.corporateInfo.companyName}</div>
                    </div>
                    {enrichedData.corporateInfo.companyNumber && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Registration #</div>
                        <div className="text-sm text-[#f0f0f5] font-medium">{enrichedData.corporateInfo.companyNumber}</div>
                      </div>
                    )}
                    {enrichedData.corporateInfo.status && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Status</div>
                        <div className="text-sm text-[#f0f0f5] font-medium capitalize">{enrichedData.corporateInfo.status}</div>
                      </div>
                    )}
                    {enrichedData.corporateInfo.incorporationDate && (
                      <div>
                        <div className="text-[11px] text-[#555566]">Incorporated</div>
                        <div className="text-sm text-[#c0c0d0]">{enrichedData.corporateInfo.incorporationDate}</div>
                      </div>
                    )}

                    {/* Officers (collapsible) */}
                    {enrichedData.corporateInfo.officers.length > 0 && (
                      <div className="pt-1 border-t border-white/[0.04]">
                        <button
                          onClick={() => setShowOfficers(!showOfficers)}
                          className="flex items-center gap-1.5 text-xs text-[#8888a0] hover:text-[#f0f0f5] transition-colors w-full"
                        >
                          <Users className="w-3 h-3" />
                          <span>Officers ({enrichedData.corporateInfo.officers.length})</span>
                          {showOfficers ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                        </button>
                        <AnimatePresence>
                          {showOfficers && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 space-y-1.5"
                            >
                              {enrichedData.corporateInfo.officers.map((officer, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                                >
                                  <div className="w-6 h-6 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center shrink-0">
                                    <Users className="w-3 h-3 text-[#8b5cf6]" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs text-[#f0f0f5] font-medium truncate">{officer.name}</div>
                                    <div className="text-[10px] text-[#555566] capitalize">{officer.role}</div>
                                  </div>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nearby Businesses & Quick Links */}
          {enrichedData && (
            <GlassCard padding="md">
              {/* Quick Research Links */}
              <div className="flex gap-2 mb-3">
                <a
                  href={enrichedData.googleMapsUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-xs text-[#8888a0] hover:text-[#f0f0f5]"
                >
                  <MapPinned className="w-3.5 h-3.5" />
                  Google Maps
                </a>
                <a
                  href={enrichedData.googleSearchUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-xs text-[#8888a0] hover:text-[#f0f0f5]"
                >
                  <Search className="w-3.5 h-3.5" />
                  Google Search
                </a>
              </div>

              {/* Nearby Businesses */}
              {enrichedData.nearbyBusinesses.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowNearby(!showNearby)}
                    className="flex items-center gap-1.5 text-[11px] text-[#555566] uppercase tracking-wider hover:text-[#8888a0] transition-colors w-full mb-2"
                  >
                    <Store className="w-3 h-3" />
                    Businesses Nearby ({enrichedData.nearbyBusinesses.length})
                    {showNearby ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                  </button>
                  <AnimatePresence>
                    {showNearby && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5"
                      >
                        {enrichedData.nearbyBusinesses.slice(0, 5).map((biz, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-[#f0f0f5] truncate">{biz.name}</div>
                                <div className="text-[10px] text-[#555566]">
                                  {biz.type}{biz.distance > 0 ? ` · ${biz.distance}m` : ''}
                                </div>
                              </div>
                              {biz.phone && (
                                <div className="flex gap-1 shrink-0">
                                  <a
                                    href={buildWhatsAppUrl(biz.phone, biz.name)}
                                    target="_blank"
                                    rel="noopener"
                                    className="p-1 rounded bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                                    title="WhatsApp"
                                  >
                                    <MessageCircle className="w-3 h-3 text-[#25D366]" />
                                  </a>
                                  <a
                                    href={buildCallUrl(biz.phone)}
                                    className="p-1 rounded bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 transition-colors"
                                    title="Call"
                                  >
                                    <Phone className="w-3 h-3 text-[#0ea5e9]" />
                                  </a>
                                </div>
                              )}
                            </div>
                            {biz.website && (
                              <a
                                href={biz.website.startsWith('http') ? biz.website : `https://${biz.website}`}
                                target="_blank"
                                rel="noopener"
                                className="text-[10px] text-[#0ea5e9] hover:underline truncate block mt-0.5"
                              >
                                {biz.website.replace(/^https?:\/\//, '')}
                              </a>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Enrichment Sources Summary */}
              {enrichedData.enrichmentSources.length > 0 && (
                <div className="pt-2 mt-2 border-t border-white/[0.04]">
                  <div className="flex flex-wrap gap-1.5">
                    {enrichedData.enrichmentSources.map((src) => (
                      <span
                        key={src.source}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          src.found
                            ? 'bg-[#10b981]/10 text-[#10b981]'
                            : 'bg-white/[0.03] text-[#555566]'
                        }`}
                      >
                        {SOURCE_LABELS[src.source] || src.source}
                        {src.found ? ' \u2713' : ' \u2717'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleResearch}
                  className="text-[10px] text-[#8888a0] hover:text-[#00ffcc] transition-colors flex items-center gap-1"
                >
                  <Search className="w-3 h-3" />
                  Refresh
                </button>
              </div>
            </GlassCard>
          )}

          {/* Solar Analysis */}
          {!building.analyzed && !isAnalyzing && (
            <div className="py-2">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                icon={<Sparkles className="w-5 h-5" />}
                onClick={onAnalyze}
              >
                Analyze Solar Potential
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <GlassCard padding="md">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#00ffcc]" />
                  <span className="text-sm font-medium text-[#f0f0f5]">
                    Analyzing...
                  </span>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div
                      className="h-3 rounded bg-white/[0.04] animate-pulse"
                      style={{ width: `${60 + Math.random() * 30}%` }}
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {building.analyzed && analysis && (
            <>
              {/* Hero Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'System Size', value: `${fmt(kwp, 1)} kWp`, icon: Zap, color: '#00ffcc' },
                  { label: 'Annual Energy', value: `${fmt(yearlyKwh)} kWh`, icon: Sun, color: '#f59e0b' },
                  { label: 'Panels', value: `${fmt(panelCount)}`, icon: Layers, color: '#8b5cf6' },
                  { label: 'Investment', value: fmtCurrency(investment), icon: DollarSign, color: '#0ea5e9' },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <metric.icon className="w-3.5 h-3.5" style={{ color: metric.color }} />
                      <span className="text-[10px] text-[#555566] uppercase tracking-wider">
                        {metric.label}
                      </span>
                    </div>
                    <div className="text-base font-bold text-[#f0f0f5]">{metric.value}</div>
                  </div>
                ))}
              </div>

              {/* Monthly Production Chart */}
              <GlassCard padding="md">
                <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#0ea5e9]" />
                  Monthly Production
                </h3>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barCategoryGap="15%">
                      <defs>
                        <linearGradient id="detailBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00ffcc" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#00ffcc" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#555566', fontSize: 9 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{
                          backgroundColor: '#1a1a2e',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 10,
                          color: '#f0f0f5',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [fmt(value) + ' kWh', 'Production']}
                      />
                      <Bar dataKey="production" fill="url(#detailBarGrad)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Financial Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] text-[#555566] mb-1">Savings/yr</div>
                  <div className="text-sm font-bold text-[#22c55e]">{fmtCurrency(savings)}</div>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] text-[#555566] mb-1">Payback</div>
                  <div className="text-sm font-bold text-[#0ea5e9]">{payback.toFixed(1)} yrs</div>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] text-[#555566] mb-1">CO2/yr</div>
                  <div className="text-sm font-bold text-[#00ffcc]">{fmt(co2, 1)} t</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons (fixed bottom) */}
        <div className="px-5 py-4 border-t border-white/[0.06] space-y-2">
          {onSaveAsLead && (
            <Button
              variant={isLeadSaved ? 'secondary' : 'accent'}
              fullWidth
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => onSaveAsLead(enrichedData ?? undefined)}
              disabled={isLeadSaved}
            >
              {isLeadSaved ? 'Saved as Lead' : 'Save as Lead'}
            </Button>
          )}
          {building.analyzed && (
            <>
              <Button
                variant="primary"
                fullWidth
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => { window.location.hash = '#/tools/proposal-generator'; }}
              >
                Generate Proposal
              </Button>
              <Button
                variant="secondary"
                fullWidth
                icon={<ExternalLink className="w-4 h-4" />}
                onClick={() => { window.location.hash = '#/projects'; }}
              >
                Save to Project
              </Button>
            </>
          )}
        </div>
      </div>
  );
}
