// Proposal tab — generate, view and manage proposals for a lead

import { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import ProposalPreview from '@/components/leads/ProposalPreview';
import { useLeadProposal } from '@/hooks/useLeadProposal';
import {
  getProposalWhatsAppUrl,
  type StoredProposal,
} from '@/services/leadProposalService';
import type { Lead } from '@/types/lead';

const STATUS_DOT: Record<StoredProposal['status'], string> = {
  draft: 'bg-white/30',
  sent: 'bg-blue-400',
  viewed: 'bg-amber-400',
  accepted: 'bg-emerald-400',
  rejected: 'bg-red-400',
};

interface LeadProposalTabProps {
  lead: Lead;
}

export function LeadProposalTab({ lead }: LeadProposalTabProps) {
  const {
    proposals,
    isGenerating,
    error,
    generateProposal,
    regenerateProposal,
    updateStatus,
  } = useLeadProposal(lead.id, lead);

  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    proposals.length > 0 ? proposals[0].id : null
  );
  const [langMenu, setLangMenu] = useState(false);

  const selectedProposal = proposals.find((p) => p.id === selectedProposalId) ?? null;

  const handleGenerate = async (lang: 'en' | 'es') => {
    setLangMenu(false);
    const stored = await generateProposal(lang);
    if (stored) setSelectedProposalId(stored.id);
  };

  const handleWhatsApp = () => {
    if (!selectedProposal) return;
    const phone = lead.enrichment?.phone || undefined;
    const url = getProposalWhatsAppUrl(selectedProposal, phone);
    window.open(url, '_blank');
    if (selectedProposal.status === 'draft') {
      updateStatus(selectedProposal.id, 'sent');
    }
  };

  // No proposals — empty state
  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6]/10 flex items-center justify-center">
          <FileText className="w-8 h-8 text-[#8b5cf6]" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-semibold text-[#f0f0f5]">No Proposals Yet</h3>
          <p className="text-sm text-[#555570] max-w-md">
            Generate an AI-powered solar proposal for this lead with financial analysis,
            system specifications, and Panama regulatory context.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            loading={isGenerating}
            onClick={() => handleGenerate('en')}
          >
            Generate (English)
          </Button>
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            loading={isGenerating}
            onClick={() => handleGenerate('es')}
          >
            Generar (Español)
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: proposal list + generate button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {proposals.map((p) => {
            const isActive = selectedProposalId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProposalId(p.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap ${
                  isActive
                    ? 'bg-white/[0.06] border-[#00ffcc]/30 text-[#f0f0f5]'
                    : 'bg-white/[0.02] border-white/[0.06] text-[#8888a0] hover:bg-white/[0.04]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                v{p.version}
                <span className="text-[10px] text-[#555570]">
                  {new Date(p.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            loading={isGenerating}
            onClick={() => setLangMenu(!langMenu)}
          >
            New Proposal
          </Button>
          <AnimatePresence>
            {langMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 bg-[#1a1a2e] border border-white/[0.08] rounded-xl shadow-xl z-20 overflow-hidden"
              >
                <button
                  onClick={() => handleGenerate('en')}
                  className="block w-full text-left px-4 py-2.5 text-xs text-[#f0f0f5] hover:bg-white/[0.05] transition-colors"
                >
                  English
                </button>
                <button
                  onClick={() => handleGenerate('es')}
                  className="block w-full text-left px-4 py-2.5 text-xs text-[#f0f0f5] hover:bg-white/[0.05] transition-colors"
                >
                  Español
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}

      {/* Selected proposal preview */}
      {selectedProposal ? (
        <ProposalPreview
          proposal={selectedProposal}
          onRegenerate={regenerateProposal}
          onWhatsApp={handleWhatsApp}
          onStatusChange={(status) => updateStatus(selectedProposal.id, status)}
          isGenerating={isGenerating}
        />
      ) : (
        <GlassCard padding="lg">
          <p className="text-sm text-[#555570] text-center py-6">
            Select a proposal version above to preview
          </p>
        </GlassCard>
      )}
    </div>
  );
}
