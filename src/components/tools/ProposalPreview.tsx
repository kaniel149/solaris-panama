import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Building2,
  Sun,
  Zap,
  DollarSign,
  Leaf,
  Shield,
  Clock,
  Sparkles,
  Calendar,
  Save,
  type LucideIcon,
} from 'lucide-react';
import DOMPurify from 'dompurify';

// ===== LOCAL cn() HELPER =====

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// ===== TYPES (from @/services/proposalGeneratorService) =====

export interface ProposalSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface GeneratedProposal {
  id: string;
  clientName: string;
  systemSizeKwp: number;
  totalInvestment: number;
  annualSavings: number;
  paybackYears: number;
  irr: number;
  npv: number;
  co2OffsetTons: number;
  panelModel: string;
  panelCount: number;
  inverterModel: string;
  inverterCount: number;
  annualProductionKwh: number;
  roiPercent: number;
  treesEquivalent: number;
  carsEquivalent: number;
  sections: ProposalSection[];
  generatedAt: string;
}

// ===== PROPS =====

interface ProposalPreviewProps {
  proposal: GeneratedProposal;
  onSectionClick?: (sectionId: string) => void;
  activeSectionId?: string;
  editable?: boolean;
  onContentChange?: (sectionId: string, content: string) => void;
  className?: string;
}

// ===== CONSTANTS =====

const SECTION_ICONS: Record<string, LucideIcon> = {
  'executive-summary': FileText,
  'building-assessment': Building2,
  'system-design': Sun,
  'energy-production': Zap,
  'financial-analysis': DollarSign,
  'environmental-impact': Leaf,
  'legal-regulatory': Shield,
  'implementation-timeline': Clock,
};

// ===== ANIMATION VARIANTS =====

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const coverVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const metricCardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' },
  }),
};

// ===== HELPERS =====

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote',
      'code', 'pre', 'hr', 'img', 'sup', 'sub',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'src', 'alt'],
  });
}

// ===== SUB-COMPONENTS =====

function CoverStatBadge({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={metricCardVariants}
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-3 rounded-xl',
        'bg-white/[0.04] border border-white/[0.06]',
        'min-w-[120px]'
      )}
    >
      <span className="text-[10px] uppercase tracking-wider text-[#8888a0] font-medium">
        {label}
      </span>
      <span className="text-sm font-bold text-[#f0f0f5]">{value}</span>
    </motion.div>
  );
}

function DataHighlightCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 p-4 rounded-xl',
        'bg-white/[0.03] border border-white/[0.05]'
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#00ffcc]" />}
        <span className="text-[10px] uppercase tracking-wider text-[#555570] font-medium">
          {label}
        </span>
      </div>
      <span className="text-lg font-bold text-[#f0f0f5]">{value}</span>
      {sub && <span className="text-[11px] text-[#555570]">{sub}</span>}
    </div>
  );
}

function SectionDataHighlights({ sectionId, proposal }: { sectionId: string; proposal: GeneratedProposal }) {
  if (sectionId === 'financial-analysis') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <DataHighlightCard
          icon={DollarSign}
          label="Total Investment"
          value={formatCurrency(proposal.totalInvestment)}
          sub="Turnkey installed"
        />
        <DataHighlightCard
          icon={Zap}
          label="Annual Savings"
          value={formatCurrency(proposal.annualSavings)}
          sub={`${formatCurrency(proposal.annualSavings / 12)}/month`}
        />
        <DataHighlightCard
          icon={Clock}
          label="Payback Period"
          value={`${proposal.paybackYears.toFixed(1)} years`}
          sub="Simple payback"
        />
        <DataHighlightCard
          icon={DollarSign}
          label="NPV (25yr)"
          value={formatCurrency(proposal.npv)}
          sub={`${proposal.irr.toFixed(1)}% IRR`}
        />
      </div>
    );
  }

  if (sectionId === 'system-design') {
    return (
      <div className="grid grid-cols-2 gap-3 mt-5">
        <DataHighlightCard
          icon={Sun}
          label="Solar Panels"
          value={`${proposal.panelCount} panels`}
          sub={proposal.panelModel}
        />
        <DataHighlightCard
          icon={Zap}
          label="Inverters"
          value={`${proposal.inverterCount} units`}
          sub={proposal.inverterModel}
        />
      </div>
    );
  }

  if (sectionId === 'environmental-impact') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        <DataHighlightCard
          icon={Leaf}
          label="CO2 Offset"
          value={`${proposal.co2OffsetTons.toFixed(1)} tons/yr`}
          sub="Annual carbon reduction"
        />
        <DataHighlightCard
          icon={Leaf}
          label="Trees Equivalent"
          value={`${formatNumber(proposal.treesEquivalent)} trees`}
          sub="Planted per year"
        />
        <DataHighlightCard
          icon={Leaf}
          label="Cars Removed"
          value={`${formatNumber(proposal.carsEquivalent)} cars`}
          sub="Off the road per year"
        />
      </div>
    );
  }

  return null;
}

// ===== MAIN COMPONENT =====

export function ProposalPreview({
  proposal,
  onSectionClick,
  activeSectionId,
  editable = false,
  onContentChange,
  className,
}: ProposalPreviewProps) {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const sortedSections = [...proposal.sections].sort(
    (a, b) => a.order - b.order
  );

  // Scroll to active section when it changes
  useEffect(() => {
    if (activeSectionId && sectionRefs.current[activeSectionId]) {
      sectionRefs.current[activeSectionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [activeSectionId]);

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      onSectionClick?.(sectionId);
    },
    [onSectionClick]
  );

  const handleContentBlur = useCallback(
    (sectionId: string, el: HTMLDivElement) => {
      const newContent = el.innerHTML;
      onContentChange?.(sectionId, newContent);
      setEditingSection(null);
    },
    [onContentChange]
  );

  const handleEditClick = useCallback((sectionId: string) => {
    setEditingSection(sectionId);
  }, []);

  const coverStats = [
    { label: 'Investment', value: formatCurrency(proposal.totalInvestment) },
    { label: 'Annual Savings', value: formatCurrency(proposal.annualSavings) },
    { label: 'Payback', value: `${proposal.paybackYears.toFixed(1)} yrs` },
    { label: 'ROI', value: `${proposal.roiPercent.toFixed(0)}%` },
  ];

  const SectionIcon = (id: string) => SECTION_ICONS[id] || FileText;

  return (
    <div
      className={cn(
        'w-full max-w-[900px] mx-auto space-y-6 pb-16',
        className
      )}
    >
      {/* ===== COVER SECTION ===== */}
      <motion.div
        variants={coverVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-[#12121a]/90 backdrop-blur-xl',
          'border border-white/[0.06]',
          'shadow-2xl shadow-black/40'
        )}
      >
        {/* Gradient top border */}
        <div className="h-1 w-full bg-gradient-to-r from-[#00ffcc] via-[#00d4aa] to-[#8b5cf6]" />

        {/* Background glows */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-[#00ffcc]/[0.04] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-[#8b5cf6]/[0.04] blur-3xl pointer-events-none" />

        <div className="relative p-8 sm:p-12 text-center space-y-6">
          {/* Sun icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00ffcc]/20 to-[#8b5cf6]/10 flex items-center justify-center border border-[#00ffcc]/10 mx-auto">
            <Sun className="w-7 h-7 text-[#00ffcc]" />
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#00ffcc] via-[#00e6b8] to-[#8b5cf6] bg-clip-text text-transparent leading-tight">
              Solar Energy Proposal
            </h1>
            <p className="text-base sm:text-lg text-[#8888a0]">
              {proposal.clientName} | {proposal.systemSizeKwp.toFixed(0)} kWp System
            </p>
          </div>

          {/* Date */}
          <div className="flex items-center justify-center gap-2 text-sm text-[#555570]">
            <Calendar className="w-4 h-4" />
            <span>Prepared on {formatDate(proposal.generatedAt)}</span>
          </div>

          {/* Prepared by */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#555570]">
            <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span>Prepared by Solaris Panama</span>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Mini stat badges */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap items-center justify-center gap-3"
          >
            {coverStats.map((stat, i) => (
              <CoverStatBadge
                key={stat.label}
                label={stat.label}
                value={stat.value}
                index={i}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ===== PROPOSAL SECTIONS ===== */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        {sortedSections.map((section) => {
          const Icon = SectionIcon(section.id);
          const isActive = activeSectionId === section.id;
          const isEditing = editingSection === section.id;

          return (
            <motion.div
              key={section.id}
              ref={(el) => {
                sectionRefs.current[section.id] = el;
              }}
              id={`proposal-section-${section.id}`}
              variants={sectionVariants}
              onClick={() => handleSectionClick(section.id)}
              className={cn(
                'relative overflow-hidden rounded-2xl',
                'bg-[#12121a]/80 backdrop-blur-xl',
                'border transition-colors duration-300',
                isActive
                  ? 'border-[#00ffcc]/30 shadow-[0_0_20px_rgba(0,255,204,0.06)]'
                  : 'border-white/[0.06] hover:border-white/[0.1]',
                onSectionClick && 'cursor-pointer'
              )}
            >
              {/* Active indicator left border */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#00ffcc] to-[#00ffcc]/40 rounded-l-2xl" />
              )}

              <div className="p-6 sm:p-8">
                {/* Section header */}
                <div className="flex items-start gap-4 mb-5">
                  {/* Number badge */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                      'bg-[#00ffcc]/10 border border-[#00ffcc]/20',
                      'text-sm font-bold text-[#00ffcc]'
                    )}
                  >
                    {section.order}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4.5 h-4.5 text-[#8888a0] flex-shrink-0" />
                      <h2 className="text-lg sm:text-xl font-bold text-[#f0f0f5] leading-tight">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  {/* Edit / Save button */}
                  {editable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEditing) {
                          const el = document.getElementById(
                            `section-content-${section.id}`
                          ) as HTMLDivElement | null;
                          if (el) handleContentBlur(section.id, el);
                        } else {
                          handleEditClick(section.id);
                        }
                      }}
                      className={cn(
                        'flex-shrink-0 p-2 rounded-lg transition-all',
                        isEditing
                          ? 'bg-[#00ffcc]/10 text-[#00ffcc] hover:bg-[#00ffcc]/20'
                          : 'text-[#555570] hover:text-[#8888a0] hover:bg-white/[0.04]'
                      )}
                      title={isEditing ? 'Save changes' : 'Edit section'}
                    >
                      {isEditing ? (
                        <Save className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-white/[0.04] mb-5" />

                {/* Section content */}
                <div
                  id={`section-content-${section.id}`}
                  contentEditable={editable && isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    if (isEditing) {
                      handleContentBlur(
                        section.id,
                        e.currentTarget as HTMLDivElement
                      );
                    }
                  }}
                  className={cn(
                    'proposal-content text-sm sm:text-[15px] leading-relaxed text-[#c0c0d0]',
                    '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-[#f0f0f5] [&_h1]:mb-3 [&_h1]:mt-4',
                    '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#f0f0f5] [&_h2]:mb-2 [&_h2]:mt-3',
                    '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#e0e0ea] [&_h3]:mb-2 [&_h3]:mt-3',
                    '[&_p]:mb-3 [&_p]:leading-relaxed',
                    '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1',
                    '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1',
                    '[&_li]:text-[#c0c0d0]',
                    '[&_strong]:text-[#f0f0f5] [&_strong]:font-semibold',
                    '[&_a]:text-[#00ffcc] [&_a]:underline [&_a]:underline-offset-2',
                    '[&_blockquote]:border-l-2 [&_blockquote]:border-[#00ffcc]/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#8888a0]',
                    '[&_table]:w-full [&_table]:border-collapse [&_table]:my-3',
                    '[&_th]:text-left [&_th]:text-xs [&_th]:text-[#8888a0] [&_th]:uppercase [&_th]:tracking-wider [&_th]:p-2 [&_th]:border-b [&_th]:border-white/[0.08]',
                    '[&_td]:p-2 [&_td]:text-[#c0c0d0] [&_td]:border-b [&_td]:border-white/[0.04]',
                    '[&_hr]:border-white/[0.06] [&_hr]:my-4',
                    isEditing &&
                      'outline-none ring-1 ring-[#00ffcc]/20 rounded-lg p-3 bg-white/[0.02]'
                  )}
                  dangerouslySetInnerHTML={{
                    __html: sanitize(section.content),
                  }}
                />

                {/* Data highlights for specific sections */}
                <SectionDataHighlights
                  sectionId={section.id}
                  proposal={proposal}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ===== FOOTER ===== */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className={cn(
          'rounded-2xl overflow-hidden',
          'bg-[#12121a]/80 backdrop-blur-xl',
          'border border-white/[0.06]',
          'p-6 sm:p-8 text-center space-y-4'
        )}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-4" />

        <div className="flex items-center justify-center gap-2 text-xs text-[#555570]">
          <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
          <span>This proposal was generated by Solaris Panama AI</span>
        </div>

        <p className="text-xs text-[#555570]">
          Valid for 30 days from {formatDate(proposal.generatedAt)}
        </p>

        <div className="space-y-1">
          <p className="text-xs text-[#8888a0] font-medium">
            Solaris Panama
          </p>
          <p className="text-[11px] text-[#555570]">
            info@solarispanama.com | +507 000-0000 | Panama City, Panama
          </p>
        </div>
      </motion.div>

      {/* ===== PRINT STYLES ===== */}
      <style>{`
        @media print {
          .proposal-content {
            color: #222 !important;
          }
          [class*="bg-[#12121a]"] {
            background: #fff !important;
            border-color: #e5e7eb !important;
            box-shadow: none !important;
          }
          [class*="text-[#f0f0f5]"],
          [class*="text-[#c0c0d0]"],
          [class*="text-[#e0e0ea]"] {
            color: #1a1a1a !important;
          }
          [class*="text-[#8888a0]"],
          [class*="text-[#555570]"] {
            color: #666 !important;
          }
          [class*="text-[#00ffcc]"] {
            color: #059669 !important;
          }
          [class*="bg-gradient-to-r"] {
            background: #059669 !important;
            -webkit-background-clip: unset !important;
            -webkit-text-fill-color: unset !important;
          }
          [class*="backdrop-blur"] {
            backdrop-filter: none !important;
          }
          [class*="blur-3xl"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
