// ProposalPreview — renders a StoredProposal with section navigation and action bar

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sun, FileText, Download, Send, RotateCcw, Eye,
  CheckCircle2, XCircle, Clock, MessageCircle,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import type { StoredProposal } from '@/services/leadProposalService';

// ===== Helpers =====

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

function renderMarkdown(md: string): string {
  // Table support
  let html = md;

  // Process tables: detect lines with | separators
  const lines = html.split('\n');
  const result: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableRow = line.startsWith('|') && line.endsWith('|') && line.includes('|');
    const isSeparator = isTableRow && /^\|[\s\-:|]+\|$/.test(line);

    if (isTableRow && !isSeparator) {
      if (!inTable) {
        result.push('<table class="w-full text-xs border-collapse my-3">');
        inTable = true;
      }
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      // First row after table start = thead
      const isHeader = i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim());
      if (isHeader) {
        result.push('<thead><tr>');
        cells.forEach((c) => result.push(`<th class="px-3 py-2 text-left text-[#8888a0] font-medium border-b border-white/[0.06]">${c}</th>`));
        result.push('</tr></thead><tbody>');
      } else {
        result.push('<tr class="border-b border-white/[0.03]">');
        cells.forEach((c) => result.push(`<td class="px-3 py-2 text-[#c0c0d0]">${c}</td>`));
        result.push('</tr>');
      }
    } else if (isSeparator) {
      // Skip separator row
      continue;
    } else {
      if (inTable) {
        result.push('</tbody></table>');
        inTable = false;
      }
      result.push(line);
    }
  }
  if (inTable) result.push('</tbody></table>');

  html = result.join('\n');

  // Markdown transforms
  return html
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#f0f0f5]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#### (.*$)/gm, '<h4 class="text-sm font-semibold text-[#c0c0d0] mt-3 mb-1.5">$1</h4>')
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold text-[#f0f0f5] mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold text-[#f0f0f5] mt-6 mb-3">$2</h2>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 text-[#8888a0] text-sm leading-relaxed">&bull; $1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 text-[#8888a0] text-sm leading-relaxed">$1. $2</li>')
    .replace(/\n\n/g, '<br/>')
    .replace(/^(?!<)((?!<table|<thead|<tbody|<tr|<td|<th|<h[2-4]|<li|<br|<strong|<em).+)$/gm, '<p class="text-[#8888a0] text-sm leading-relaxed mb-2">$1</p>');
}

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ===== Status badge config =====

const STATUS_CONFIG: Record<StoredProposal['status'], { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'text-white/50', bg: 'bg-white/10', icon: Clock },
  sent: { label: 'Sent', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Send },
  viewed: { label: 'Viewed', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Eye },
  accepted: { label: 'Accepted', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
};

// ===== Component =====

interface ProposalPreviewProps {
  proposal: StoredProposal;
  onRegenerate?: () => void;
  onWhatsApp?: () => void;
  onStatusChange?: (status: StoredProposal['status']) => void;
  isGenerating?: boolean;
}

export default function ProposalPreview({
  proposal,
  onRegenerate,
  onWhatsApp,
  onStatusChange,
  isGenerating,
}: ProposalPreviewProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track active section via intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-section-id'));
          }
        }
      },
      { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' }
    );

    const refs = sectionRefs.current;
    Object.values(refs).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [proposal.sections]);

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  const sc = STATUS_CONFIG[proposal.status];
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-4">
      {/* Key metrics banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'System Size', value: `${proposal.systemKwp} kWp`, color: '#00ffcc' },
          { label: 'Investment', value: formatCurrency(proposal.totalInvestment), color: '#8b5cf6' },
          { label: 'Annual Savings', value: formatCurrency(proposal.annualSavings), color: '#22c55e' },
          { label: 'Payback', value: `${proposal.paybackYears.toFixed(1)} yrs`, color: '#0ea5e9' },
        ].map((m) => (
          <div key={m.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] text-[#555566] uppercase tracking-wider mb-1">{m.label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Status + version info */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', sc.bg, sc.color)}>
          <StatusIcon className="w-3 h-3" />
          {sc.label}
        </span>
        <span className="text-xs text-[#555566]">
          v{proposal.version} &middot; {proposal.language.toUpperCase()} &middot;{' '}
          {new Date(proposal.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <div className="flex gap-6">
        {/* Section navigation (desktop) */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-1">
            <p className="text-[10px] font-semibold text-[#555566] uppercase tracking-wider mb-2">Contents</p>
            {proposal.sections.map((section, i) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center gap-2 cursor-pointer',
                  activeSection === section.id
                    ? 'bg-[#00ffcc]/10 text-[#00ffcc]'
                    : 'text-[#8888a0] hover:bg-white/[0.03] hover:text-[#f0f0f5]',
                )}
              >
                <span className="text-[10px] font-mono text-[#555566] w-4">{i + 1}.</span>
                <span className="truncate">{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Proposal content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Cover */}
          <div className="rounded-xl bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sun className="w-6 h-6 text-[#00ffcc]" />
              <span className="text-lg font-bold bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9] bg-clip-text text-transparent">
                Solaris Panama
              </span>
            </div>
            <h1 className="text-lg font-bold text-[#f0f0f5] mb-1">{proposal.coverTitle}</h1>
            <p className="text-sm text-[#8888a0]">{proposal.coverSubtitle}</p>
            <p className="text-xs text-[#555566] mt-2">
              {new Date(proposal.generatedAt).toLocaleDateString(
                proposal.language === 'en' ? 'en-US' : 'es-PA',
                { year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </p>
          </div>

          {/* Sections */}
          {proposal.sections.map((section, i) => (
            <motion.div
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              data-section-id={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="rounded-xl bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] p-5"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-[10px] font-mono text-[#00ffcc]/60 bg-[#00ffcc]/[0.08] rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <h2 className="text-base font-bold bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9] bg-clip-text text-transparent">
                  {section.title}
                </h2>
              </div>
              <div
                className="prose-sm"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(renderMarkdown(section.content)),
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#8888a0] bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-[#f0f0f5] transition-all disabled:opacity-40"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </button>
          )}
          {onStatusChange && proposal.status === 'draft' && (
            <button
              onClick={() => onStatusChange('sent')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#0ea5e9] bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 hover:bg-[#0ea5e9]/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Mark as Sent
            </button>
          )}
          {onStatusChange && (proposal.status === 'sent' || proposal.status === 'viewed') && (
            <>
              <button
                onClick={() => onStatusChange('accepted')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 hover:bg-[#22c55e]/20 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Accepted
              </button>
              <button
                onClick={() => onStatusChange('rejected')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 hover:bg-[#ef4444]/20 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                Rejected
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#555566] bg-white/[0.02] border border-white/[0.04] cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
            <span className="text-[9px] opacity-60">(Soon)</span>
          </button>
          {onWhatsApp && (
            <button
              onClick={onWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#25d366] bg-[#25d366]/10 border border-[#25d366]/20 hover:bg-[#25d366]/20 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          )}
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#555566] bg-white/[0.02] border border-white/[0.04] cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5" />
            Email
            <span className="text-[9px] opacity-60">(Soon)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
