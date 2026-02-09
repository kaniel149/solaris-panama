// framer-motion removed — parent handles animation
import { useState, useCallback, useEffect } from 'react';
import {
  X, Building2, Sun, Zap, DollarSign, ExternalLink,
  Layers, Ruler, BarChart3, ArrowRight, Sparkles, MapPin, UserPlus,
  Search, Phone, Mail, Globe, MessageCircle, Loader2, Store, Navigation, MapPinned,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { PANAMA_DEFAULTS } from '@/services/solarCalculator';
import { researchOwner, buildWhatsAppUrl, buildCallUrl, type OwnerResearchResult } from '@/services/ownerResearchService';
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
  onSaveAsLead?: () => void;
  isLeadSaved?: boolean;
}

// ===== CONSTANTS =====

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHLY_FRACTIONS = [0.092, 0.090, 0.098, 0.085, 0.075, 0.070, 0.072, 0.070, 0.068, 0.070, 0.075, 0.085];
const FRACTION_SUM = MONTHLY_FRACTIONS.reduce((s, f) => s + f, 0);

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

// ===== COMPONENT =====

export default function BuildingDetail({
  building,
  isAnalyzing,
  onClose,
  onAnalyze,
  onSaveAsLead,
  isLeadSaved,
}: BuildingDetailProps) {
  const [ownerData, setOwnerData] = useState<OwnerResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchAttempted, setResearchAttempted] = useState(false);

  // Reset owner research when building changes
  useEffect(() => {
    setOwnerData(null);
    setResearchAttempted(false);
  }, [building?.id]);

  const handleResearchOwner = useCallback(async () => {
    if (!building) return;
    setIsResearching(true);
    setResearchAttempted(false);
    try {
      const result = await researchOwner({
        buildingName: building.name || `Building ${building.id}`,
        lat: building.center.lat,
        lng: building.center.lng,
        osmId: building.osmId,
        area: building.area,
      });
      setOwnerData(result);
      setResearchAttempted(true);
    } catch {
      setResearchAttempted(true);
    } finally {
      setIsResearching(false);
    }
  }, [building]);

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

          {/* Owner Research */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#8b5cf6]" />
              Owner / Contact
            </h3>

            {!ownerData && !isResearching && !researchAttempted && (
              <Button
                variant="secondary"
                fullWidth
                icon={<Search className="w-4 h-4" />}
                onClick={handleResearchOwner}
              >
                Find Owner Info
              </Button>
            )}

            {!ownerData && !isResearching && researchAttempted && (
              <div className="text-center py-3 space-y-2">
                <p className="text-sm text-[#555566]">
                  No contact info found in public directories
                </p>
                <Button
                  variant="secondary"
                  fullWidth
                  size="sm"
                  icon={<Search className="w-3.5 h-3.5" />}
                  onClick={handleResearchOwner}
                >
                  Try Again
                </Button>
              </div>
            )}

            {isResearching && (
              <div className="flex items-center gap-2 py-3 justify-center">
                <Loader2 className="w-4 h-4 text-[#8b5cf6] animate-spin" />
                <span className="text-sm text-[#8888a0]">Searching directories...</span>
              </div>
            )}

            {ownerData && (
              <div className="space-y-2.5">
                {/* Address */}
                {ownerData.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                      <Navigation className="w-3.5 h-3.5 text-[#22c55e]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-[#555566]">Address</div>
                      <div className="text-sm text-[#f0f0f5] font-medium leading-tight">{ownerData.address}</div>
                    </div>
                  </div>
                )}

                {/* Owner / Business name — only shown when verified at building */}
                {ownerData.ownerName && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-[#8b5cf6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#555566]">Building Occupant</div>
                      <div className="text-sm text-[#f0f0f5] font-medium truncate">{ownerData.ownerName}</div>
                    </div>
                  </div>
                )}

                {/* Phone — only from verified building occupant */}
                {ownerData.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-[#22c55e]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-[#555566]">Phone</div>
                      <div className="text-sm text-[#f0f0f5] font-medium">{ownerData.phone}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <a
                        href={buildWhatsAppUrl(ownerData.phone, ownerData.ownerName || undefined)}
                        target="_blank"
                        rel="noopener"
                        className="p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                      </a>
                      <a
                        href={buildCallUrl(ownerData.phone)}
                        className="p-1.5 rounded-lg bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 transition-colors"
                        title="Call"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#0ea5e9]" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Email */}
                {ownerData.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5 text-[#f59e0b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#555566]">Email</div>
                      <a href={`mailto:${ownerData.email}`} className="text-sm text-[#0ea5e9] hover:underline truncate block">
                        {ownerData.email}
                      </a>
                    </div>
                  </div>
                )}

                {/* Website */}
                {ownerData.website && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#0ea5e9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-[#555566]">Website</div>
                      <a
                        href={ownerData.website.startsWith('http') ? ownerData.website : `https://${ownerData.website}`}
                        target="_blank"
                        rel="noopener"
                        className="text-sm text-[#0ea5e9] hover:underline truncate block"
                      >
                        {ownerData.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}

                {/* Social Media — only verified links */}
                {ownerData.socialMedia && (ownerData.socialMedia.facebook || ownerData.socialMedia.instagram || ownerData.socialMedia.linkedin) && (
                  <div className="flex gap-2 pt-1">
                    {ownerData.socialMedia.facebook && (
                      <a href={ownerData.socialMedia.facebook} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors">Facebook</a>
                    )}
                    {ownerData.socialMedia.instagram && (
                      <a href={ownerData.socialMedia.instagram} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/20 transition-colors">Instagram</a>
                    )}
                    {ownerData.socialMedia.linkedin && (
                      <a href={ownerData.socialMedia.linkedin} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors">LinkedIn</a>
                    )}
                  </div>
                )}

                {/* Quick Research Links — Google Maps + Google Search */}
                <div className="flex gap-2 pt-1">
                  <a
                    href={ownerData.googleMapsUrl}
                    target="_blank"
                    rel="noopener"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-xs text-[#8888a0] hover:text-[#f0f0f5]"
                  >
                    <MapPinned className="w-3.5 h-3.5" />
                    Google Maps
                  </a>
                  <a
                    href={ownerData.googleSearchUrl}
                    target="_blank"
                    rel="noopener"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-xs text-[#8888a0] hover:text-[#f0f0f5]"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Google Search
                  </a>
                </div>

                {/* Nearby Businesses — clearly separated */}
                {ownerData.nearbyBusinesses && ownerData.nearbyBusinesses.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.04]">
                    <div className="text-[11px] text-[#555566] uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      Businesses Nearby
                    </div>
                    <div className="space-y-1.5">
                      {ownerData.nearbyBusinesses.slice(0, 5).map((biz, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-[#f0f0f5] truncate">{biz.name}</div>
                              <div className="text-[10px] text-[#555566]">
                                {biz.type} · {biz.distance}m
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
                    </div>
                  </div>
                )}

                {/* Sources + Refresh */}
                <div className="flex items-center justify-between pt-1">
                  {ownerData.sources.length > 0 && (
                    <div className="text-[10px] text-[#555566]">
                      via {ownerData.sources.join(', ')}
                    </div>
                  )}
                  <button
                    onClick={handleResearchOwner}
                    className="text-[10px] text-[#8888a0] hover:text-[#00ffcc] transition-colors flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </GlassCard>

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
                  <div className="text-[10px] text-[#555566] mb-1">CO₂/yr</div>
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
              onClick={onSaveAsLead}
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
