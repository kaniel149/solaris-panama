import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Printer,
  Download,
  Tag,
  X,
  Plus,
  Star,
  Phone,
  Globe,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useLeadManager } from '@/hooks/useLeadManager';
import { LeadReportPreview } from '@/components/leads/LeadReportPreview';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { LEAD_STATUS_CONFIG, LEAD_KANBAN_COLUMNS } from '@/types/lead';
import { exportLeadsCSV, downloadCSV } from '@/services/leadStorageService';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

function getScoreColor(score: number): string {
  if (score >= 75) return '#00ffcc';
  if (score >= 55) return '#22c55e';
  if (score >= 35) return '#f59e0b';
  return '#ef4444';
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    allLeads,
    isEnriching,
    enrichLead,
    updateLeadStatus,
    updateLeadNotes,
    addLeadTag,
    removeLeadTag,
  } = useLeadManager();

  const lead = allLeads.find((l) => l.id === id) ?? null;

  const [tagInput, setTagInput] = useState('');
  const [notesValue, setNotesValue] = useState(lead?.notes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSaveNotes = useCallback(() => {
    if (!lead) return;
    updateLeadNotes(lead.id, notesValue);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 1500);
  }, [lead, notesValue, updateLeadNotes]);

  const handleAddTag = useCallback(() => {
    if (!lead || !tagInput.trim()) return;
    addLeadTag(lead.id, tagInput.trim());
    setTagInput('');
  }, [lead, tagInput, addLeadTag]);

  const handleExportSingle = useCallback(() => {
    if (!lead) return;
    const csv = exportLeadsCSV([lead]);
    downloadCSV(csv, `lead-${lead.buildingName.replace(/\s+/g, '-').toLowerCase()}.csv`);
  }, [lead]);

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-[#8888a0]">Lead not found</p>
          <Button variant="ghost" onClick={() => navigate('/leads')}>
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  const scoreColor = getScoreColor(lead.leadScore);

  return (
    <div className="min-h-screen p-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/leads')}
        className="flex items-center gap-2 text-sm text-[#8888a0] hover:text-[#f0f0f5] transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Pipeline
      </button>

      <div className="flex gap-6">
        {/* Left: Report Preview */}
        <div className="flex-1 min-w-0">
          <LeadReportPreview lead={lead} />
        </div>

        {/* Right: Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="w-[320px] shrink-0 space-y-4"
        >
          {/* Status Selector */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
              Status
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_KANBAN_COLUMNS.map((status) => {
                const config = LEAD_STATUS_CONFIG[status];
                const isActive = lead.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => updateLeadStatus(lead.id, status)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-full transition-all',
                      isActive
                        ? 'shadow-sm'
                        : 'opacity-50 hover:opacity-80'
                    )}
                    style={{
                      backgroundColor: isActive
                        ? config.bgColor
                        : 'rgba(255,255,255,0.03)',
                      color: isActive ? config.color : '#8888a0',
                      borderWidth: 1,
                      borderColor: isActive
                        ? config.color + '40'
                        : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Lead Score */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
              Lead Score
            </h3>
            <div className="flex items-center gap-3">
              <span
                className="text-4xl font-bold"
                style={{ color: scoreColor }}
              >
                {lead.leadScore}
              </span>
              <div className="flex-1">
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${lead.leadScore}%`,
                      backgroundColor: scoreColor,
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#555570] mt-1 block">
                  {lead.suitabilityGrade === 'A'
                    ? 'Excellent opportunity'
                    : lead.suitabilityGrade === 'B'
                    ? 'Good potential'
                    : lead.suitabilityGrade === 'C'
                    ? 'Moderate potential'
                    : 'Limited potential'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
              Actions
            </h3>
            <div className="space-y-2">
              {!lead.enrichment && (
                <Button
                  variant="secondary"
                  fullWidth
                  size="sm"
                  icon={<Sparkles className="w-4 h-4" />}
                  loading={isEnriching}
                  onClick={() => enrichLead(lead.id)}
                >
                  Enrich Lead
                </Button>
              )}
              <Button
                variant="primary"
                fullWidth
                size="sm"
                icon={<FileText className="w-4 h-4" />}
                onClick={() => navigate('/tools/proposal-generator')}
              >
                Generate Proposal
              </Button>
              <Button
                variant="ghost"
                fullWidth
                size="sm"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Print Report
              </Button>
              <Button
                variant="ghost"
                fullWidth
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={handleExportSingle}
              >
                Export CSV
              </Button>
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
                    onClick={() => removeLeadTag(lead.id, tag)}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
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
              <span className="text-[10px] text-[#22c55e] mt-1 block">
                Saved
              </span>
            )}
          </GlassCard>

          {/* Business Info (if enriched) */}
          {lead.enrichment && (
            <GlassCard padding="md">
              <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
                Business Info
              </h3>
              <div className="space-y-2.5">
                {lead.enrichment.businessName && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#0ea5e9]/10 flex items-center justify-center">
                      <Star className="w-3 h-3 text-[#0ea5e9]" />
                    </div>
                    <span className="text-sm text-[#f0f0f5]">
                      {lead.enrichment.businessName}
                    </span>
                  </div>
                )}
                {lead.enrichment.phone && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#22c55e]/10 flex items-center justify-center">
                      <Phone className="w-3 h-3 text-[#22c55e]" />
                    </div>
                    <span className="text-sm text-[#c0c0d0]">
                      {lead.enrichment.phone}
                    </span>
                  </div>
                )}
                {lead.enrichment.website && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#8b5cf6]/10 flex items-center justify-center">
                      <Globe className="w-3 h-3 text-[#8b5cf6]" />
                    </div>
                    <a
                      href={lead.enrichment.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#00ffcc] hover:underline truncate"
                    >
                      {lead.enrichment.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {lead.enrichment.rating && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#f59e0b]/10 flex items-center justify-center">
                      <Star className="w-3 h-3 text-[#f59e0b]" />
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-3 h-3',
                            i < Math.round(lead.enrichment!.rating!)
                              ? 'text-[#f59e0b] fill-[#f59e0b]'
                              : 'text-[#555570]'
                          )}
                        />
                      ))}
                      <span className="text-xs text-[#8888a0] ml-1">
                        {lead.enrichment.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
                {lead.enrichment.address && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#ef4444]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#ef4444]" />
                    </div>
                    <span className="text-sm text-[#c0c0d0]">
                      {lead.enrichment.address}
                    </span>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

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
                    {new Date(lead.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              {lead.updatedAt !== lead.createdAt && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-[#555570]" />
                  <div>
                    <div className="text-[11px] text-[#555570]">Last Updated</div>
                    <div className="text-xs text-[#c0c0d0]">
                      {new Date(lead.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
