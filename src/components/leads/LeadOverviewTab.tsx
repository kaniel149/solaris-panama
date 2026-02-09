import { useState, useCallback, Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Zap, Sun, DollarSign, Layers, Clock, Calendar, Tag, X, Plus, MapPin,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { LeadInteractiveMap } from '@/components/leads/LeadInteractiveMap';
import { LeadSatelliteImage } from '@/components/leads/LeadSatelliteImage';
import type { Lead } from '@/types/lead';

// Error boundary for map component (WebGL can fail on some devices)
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Map failed to render:', error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[350px] flex flex-col items-center justify-center bg-white/[0.02] rounded-xl text-[#555570]">
          <MapPin className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-xs">Map unavailable</span>
        </div>
      );
    }
    return this.props.children;
  }
}

const fmt = (n: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n);

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function getScoreColor(score: number): string {
  if (score >= 75) return '#00ffcc';
  if (score >= 55) return '#22c55e';
  if (score >= 35) return '#f59e0b';
  return '#ef4444';
}

interface LeadOverviewTabProps {
  lead: Lead;
  onUpdateNotes: (notes: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function LeadOverviewTab({ lead, onUpdateNotes, onAddTag, onRemoveTag }: LeadOverviewTabProps) {
  const [tagInput, setTagInput] = useState('');
  const [notesValue, setNotesValue] = useState(lead.notes);
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSaveNotes = useCallback(() => {
    onUpdateNotes(notesValue);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 1500);
  }, [notesValue, onUpdateNotes]);

  const handleAddTag = useCallback(() => {
    if (!tagInput.trim()) return;
    onAddTag(tagInput.trim());
    setTagInput('');
  }, [tagInput, onAddTag]);

  const metrics = [
    { label: 'System Size', value: `${fmt(lead.estimatedSystemKwp, 1)} kWp`, icon: Zap, color: '#00ffcc' },
    { label: 'Annual Production', value: `${fmt(lead.estimatedAnnualKwh)} kWh`, icon: Sun, color: '#f59e0b' },
    { label: 'Investment', value: fmtCurrency(lead.estimatedInvestment), icon: DollarSign, color: '#0ea5e9' },
    { label: 'Annual Savings', value: fmtCurrency(lead.estimatedAnnualSavings), icon: DollarSign, color: '#22c55e' },
    { label: 'Payback', value: `${lead.estimatedPaybackYears} years`, icon: Clock, color: '#8b5cf6' },
    { label: 'CO2 Offset', value: `${fmt(lead.estimatedCO2OffsetTons, 1)} tons/yr`, icon: Layers, color: '#00ffcc' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Left 60% */}
      <div className="lg:col-span-3 space-y-5">
        {/* Interactive Map */}
        <GlassCard padding="none">
          <MapErrorBoundary>
          <LeadInteractiveMap
            center={lead.center}
            coordinates={lead.coordinates}
            zoom={18}
            height={350}
            className="rounded-xl overflow-hidden"
          />
          </MapErrorBoundary>
        </GlassCard>

        {/* Satellite Image */}
        <GlassCard padding="none">
          <LeadSatelliteImage
            lat={lead.center.lat}
            lng={lead.center.lng}
            zoom={19}
            className="rounded-xl overflow-hidden"
            aspectRatio="16/7"
          />
        </GlassCard>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {metrics.map((metric) => (
            <GlassCard key={metric.label} padding="md">
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                <span className="text-[11px] text-[#555570] uppercase tracking-wider">
                  {metric.label}
                </span>
              </div>
              <div className="text-lg font-bold text-[#f0f0f5]">{metric.value}</div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Right 40% */}
      <div className="lg:col-span-2 space-y-4">
        {/* Suitability Breakdown */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
            Suitability Breakdown
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Roof Area', score: lead.suitabilityFactors.area ?? 0, max: 50 },
              { label: 'Building Type', score: lead.suitabilityFactors.type ?? 0, max: 30 },
              { label: 'Name Match', score: lead.suitabilityFactors.name ?? 0, max: 20 },
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
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555570]">Area</span>
              <span className="text-sm text-[#f0f0f5] font-medium">{fmt(lead.area)} m²</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555570]">Type</span>
              <span className="text-sm text-[#f0f0f5] font-medium capitalize">{lead.buildingType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555570]">Coordinates</span>
              <span className="text-xs text-[#c0c0d0] font-mono">
                {lead.center.lat.toFixed(5)}, {lead.center.lng.toFixed(5)}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Tags */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {lead.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="ml-0.5 hover:text-[#f0f0f5] transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {lead.tags.length === 0 && (
              <span className="text-xs text-[#555570]">No tags</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add tag..."
              className="flex-1 h-8 rounded-md bg-white/[0.03] border border-white/[0.06] px-2.5 text-xs text-[#f0f0f5] placeholder-[#555570] outline-none focus:border-[#8b5cf6]/40"
            />
            <Button variant="ghost" size="sm" onClick={handleAddTag} disabled={!tagInput.trim()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </GlassCard>

        {/* Notes */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
            Notes
          </h3>
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Add notes about this lead..."
            rows={4}
            className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-sm text-[#c0c0d0] placeholder-[#555570] outline-none resize-none focus:border-[#00ffcc]/30"
          />
          {notesSaved && (
            <span className="text-[10px] text-[#22c55e] mt-1 block">Saved</span>
          )}
        </GlassCard>

        {/* Timeline */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
            Timeline
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-3.5 h-3.5 text-[#555570]" />
              <div>
                <div className="text-[11px] text-[#555570]">Created</div>
                <div className="text-xs text-[#c0c0d0]">
                  {new Date(lead.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
            {lead.updatedAt !== lead.createdAt && (
              <div className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-[#555570]" />
                <div>
                  <div className="text-[11px] text-[#555570]">Last Updated</div>
                  <div className="text-xs text-[#c0c0d0]">
                    {new Date(lead.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
            )}
            {lead.lastResearchedAt && (
              <div className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-[#00ffcc]" />
                <div>
                  <div className="text-[11px] text-[#555570]">Last Researched</div>
                  <div className="text-xs text-[#c0c0d0]">
                    {new Date(lead.lastResearchedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
