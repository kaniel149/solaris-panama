import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { useLeadManager } from '@/hooks/useLeadManager';
import { LeadTabs, type LeadTab } from '@/components/leads/LeadTabs';
import { LeadOverviewTab } from '@/components/leads/LeadOverviewTab';
import { LeadResearchTab } from '@/components/leads/LeadResearchTab';
import { LeadProposalTab } from '@/components/leads/LeadProposalTab';
import { LeadFinancialTab } from '@/components/leads/LeadFinancialTab';
import { LeadActivityTab } from '@/components/leads/LeadActivityTab';
import { Button } from '@/components/ui/Button';
import { LEAD_STATUS_CONFIG, LEAD_KANBAN_COLUMNS } from '@/types/lead';
import { exportLeadsCSV, downloadCSV } from '@/services/leadStorageService';
import {
  buildWhatsAppUrl,
  buildCallUrl,
  formatPanamaPhone,
} from '@/services/ownerResearchService';
import { getProposalsForLead } from '@/services/leadProposalService';
import type { LeadActivity } from '@/types/leadActivity';

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
    isResearching,
    enrichLead,
    researchLeadOwner,
    updateLeadStatus,
    updateLeadNotes,
    addLeadTag,
    removeLeadTag,
    logCallMade,
    logWhatsAppSent,
    logExported,
    getLeadActivities,
  } = useLeadManager();

  const lead = allLeads.find((l) => l.id === id) ?? null;

  const [activeTab, setActiveTab] = useState<LeadTab>('overview');
  const [activities, setActivities] = useState<LeadActivity[]>([]);

  // Load activities
  useEffect(() => {
    if (lead) {
      setActivities(getLeadActivities(lead.id));
    }
  }, [lead, getLeadActivities]);

  // Count proposals for badge
  const proposalCount = lead ? getProposalsForLead(lead.id).length : 0;

  // Refresh activities after any action
  const refreshActivities = useCallback(() => {
    if (lead) {
      setTimeout(() => setActivities(getLeadActivities(lead.id)), 50);
    }
  }, [lead, getLeadActivities]);

  const handleExportSingle = useCallback(() => {
    if (!lead) return;
    const csv = exportLeadsCSV([lead]);
    downloadCSV(csv, `lead-${lead.buildingName.replace(/\s+/g, '-').toLowerCase()}.csv`);
    logExported(lead.id);
    refreshActivities();
  }, [lead, logExported, refreshActivities]);

  const handleCall = useCallback(() => {
    if (!lead?.enrichment?.phone) return;
    window.open(buildCallUrl(lead.enrichment.phone), '_self');
    logCallMade(lead.id, lead.enrichment.phone);
    refreshActivities();
  }, [lead, logCallMade, refreshActivities]);

  const handleWhatsApp = useCallback(() => {
    if (!lead?.enrichment?.phone) return;
    const url = buildWhatsAppUrl(
      lead.enrichment.phone,
      lead.enrichment?.businessName || undefined
    );
    window.open(url, '_blank');
    logWhatsAppSent(lead.id, lead.enrichment.phone);
    refreshActivities();
  }, [lead, logWhatsAppSent, refreshActivities]);

  const handleResearchOwner = useCallback(async () => {
    if (!lead) return;
    await researchLeadOwner(lead.id);
    refreshActivities();
  }, [lead, researchLeadOwner, refreshActivities]);

  const handleStatusChange = useCallback(
    (status: typeof LEAD_KANBAN_COLUMNS[number]) => {
      if (!lead) return;
      updateLeadStatus(lead.id, status);
      refreshActivities();
    },
    [lead, updateLeadStatus, refreshActivities]
  );

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
  const phone = lead.enrichment?.phone;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/leads')}
        className="flex items-center gap-2 text-sm text-[#8888a0] hover:text-[#f0f0f5] transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Pipeline
      </button>

      {/* Header: name + score + status + quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: Building info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#f0f0f5]">
                {lead.enrichment?.businessName || lead.buildingName}
              </h1>
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: scoreColor }}
              >
                {lead.leadScore}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#555570]">
              <span className="capitalize">{lead.buildingType}</span>
              <span>&middot;</span>
              <span>{Math.round(lead.area)} m&sup2;</span>
              <span>&middot;</span>
              <span>{lead.estimatedSystemKwp} kWp</span>
              {lead.zone && (
                <>
                  <span>&middot;</span>
                  <span>{lead.zone}</span>
                </>
              )}
            </div>
            {/* Status pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {LEAD_KANBAN_COLUMNS.map((status) => {
                const config = LEAD_STATUS_CONFIG[status];
                const isActive = lead.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium rounded-full transition-all border cursor-pointer',
                      isActive ? 'shadow-sm' : 'opacity-40 hover:opacity-70'
                    )}
                    style={{
                      backgroundColor: isActive
                        ? config.bgColor
                        : 'rgba(255,255,255,0.02)',
                      color: isActive ? config.color : '#8888a0',
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
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-2">
            {phone && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Phone className="w-4 h-4" />}
                  onClick={handleCall}
                >
                  {formatPanamaPhone(phone)}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<MessageCircle className="w-4 h-4 text-[#25d366]" />}
                  onClick={handleWhatsApp}
                >
                  WhatsApp
                </Button>
              </>
            )}
            {!lead.enrichment && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Sparkles className="w-4 h-4" />}
                loading={isEnriching}
                onClick={() => enrichLead(lead.id).then(refreshActivities)}
              >
                Enrich
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportSingle}
            >
              CSV
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <LeadTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        proposalCount={proposalCount}
        activityCount={activities.length}
      />

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="pt-5"
      >
        {activeTab === 'overview' && (
          <LeadOverviewTab
            lead={lead}
            onUpdateNotes={(notes) => {
              updateLeadNotes(lead.id, notes);
              refreshActivities();
            }}
            onAddTag={(tag) => {
              addLeadTag(lead.id, tag);
              refreshActivities();
            }}
            onRemoveTag={(tag) => {
              removeLeadTag(lead.id, tag);
              refreshActivities();
            }}
          />
        )}
        {activeTab === 'research' && (
          <LeadResearchTab
            lead={lead}
            isResearching={isResearching}
            isEnriching={isEnriching}
            onResearchOwner={handleResearchOwner}
            onEnrich={() => enrichLead(lead.id).then(refreshActivities)}
          />
        )}
        {activeTab === 'proposal' && <LeadProposalTab lead={lead} />}
        {activeTab === 'financial' && <LeadFinancialTab lead={lead} />}
        {activeTab === 'activity' && <LeadActivityTab activities={activities} />}
      </motion.div>
    </div>
  );
}
