import { motion } from 'framer-motion';
import {
  Sun,
  Building2,
  Zap,
  DollarSign,
  Leaf,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  Ruler,
  BarChart3,
  Shield,
  Star,
  Phone,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Lead } from '@/types/lead';

// ===== HELPERS =====

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
  }).format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#00ffcc';
  if (score >= 55) return '#22c55e';
  if (score >= 35) return '#f59e0b';
  return '#ef4444';
}

function getGradeLabel(grade: string): string {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Fair';
    case 'D': return 'Poor';
    case 'F': return 'Low';
    default: return grade;
  }
}

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

// ===== CONSTANTS =====

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHLY_FRACTIONS = [0.092, 0.090, 0.098, 0.085, 0.075, 0.070, 0.072, 0.070, 0.068, 0.070, 0.075, 0.085];
const FRACTION_SUM = MONTHLY_FRACTIONS.reduce((s, f) => s + f, 0);

// ===== SUB-COMPONENTS =====

function CoverStatBadge({ label, value, index }: { label: string; value: string; index: number }) {
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

function SectionWrapper({
  order,
  title,
  icon: Icon,
  children,
}: {
  order: number;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={sectionVariants}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-[#12121a]/80 backdrop-blur-xl',
        'border border-white/[0.06]'
      )}
    >
      <div className="p-6 sm:p-8">
        {/* Section header */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
              'bg-[#00ffcc]/10 border border-[#00ffcc]/20',
              'text-sm font-bold text-[#00ffcc]'
            )}
          >
            {order}
          </div>
          <div className="flex items-center gap-2.5">
            <Icon className="w-4.5 h-4.5 text-[#8888a0] flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-[#f0f0f5] leading-tight">
              {title}
            </h2>
          </div>
        </div>
        <div className="h-px bg-white/[0.04] mb-5" />
        {children}
      </div>
    </motion.div>
  );
}

// ===== MAIN COMPONENT =====

interface LeadReportPreviewProps {
  lead: Lead;
  className?: string;
}

export function LeadReportPreview({ lead, className }: LeadReportPreviewProps) {
  const displayName = lead.enrichment?.businessName || lead.buildingName;
  const scoreColor = getScoreColor(lead.leadScore);

  // Monthly production data
  const monthlyData = MONTH_LABELS.map((month, i) => ({
    month,
    production: Math.round(
      (lead.estimatedAnnualKwh * MONTHLY_FRACTIONS[i]) / FRACTION_SUM
    ),
  }));

  // Panel count estimate (using 2.2 m² per panel, 60% roof utilization)
  const panelCount = Math.floor((lead.area * 0.6) / 2.2);

  const coverStats = [
    { label: 'Area', value: `${formatNumber(Math.round(lead.area))} m²` },
    { label: 'Score', value: `${lead.leadScore}` },
    { label: 'System', value: `${lead.estimatedSystemKwp} kWp` },
    { label: 'Payback', value: `${lead.estimatedPaybackYears} yrs` },
  ];

  // Grade-based recommendation
  const gradeNum = lead.suitabilityScore;
  let recommendation: { text: string; steps: string[] };
  if (gradeNum >= 75) {
    recommendation = {
      text: 'This building is an excellent candidate for commercial solar installation. The large roof area, favorable building type, and high suitability score indicate significant potential for a profitable solar energy system.',
      steps: [
        'Contact business owner or property manager',
        'Schedule on-site roof survey and structural assessment',
        'Generate detailed financial proposal with site-specific data',
        'Present ROI analysis and Ley 417 tax benefits',
      ],
    };
  } else if (gradeNum >= 55) {
    recommendation = {
      text: 'This building shows good potential for commercial solar. With a reasonable roof area and favorable conditions, a solar installation could provide meaningful energy savings and return on investment.',
      steps: [
        'Reach out to building owner with initial assessment',
        'Verify roof condition and structural capacity',
        'Generate proposal highlighting key financial benefits',
        'Discuss net metering options under ASEP regulations',
      ],
    };
  } else if (gradeNum >= 35) {
    recommendation = {
      text: 'This building has moderate potential for solar. While the conditions are not ideal, a smaller installation could still be economically viable, especially with Panama\'s favorable solar irradiance.',
      steps: [
        'Conduct preliminary site assessment',
        'Evaluate partial roof utilization options',
        'Compare smaller system sizes for optimal ROI',
      ],
    };
  } else {
    recommendation = {
      text: 'This building has limited solar potential based on current assessment data. Consider re-evaluating if building modifications are planned or if additional roof data becomes available.',
      steps: [
        'Monitor for building renovation plans',
        'Reassess if roof area or conditions change',
      ],
    };
  }

  return (
    <div className={cn('w-full max-w-[900px] mx-auto space-y-6 pb-16', className)}>
      {/* ===== 1. COVER SECTION ===== */}
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
        <div className="h-1 w-full bg-gradient-to-r from-[#00ffcc] via-[#00d4aa] to-[#8b5cf6]" />

        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-[#00ffcc]/[0.04] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-[#8b5cf6]/[0.04] blur-3xl pointer-events-none" />

        <div className="relative p-8 sm:p-12 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00ffcc]/20 to-[#8b5cf6]/10 flex items-center justify-center border border-[#00ffcc]/10 mx-auto">
            <Sun className="w-7 h-7 text-[#00ffcc]" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#00ffcc] via-[#00e6b8] to-[#8b5cf6] bg-clip-text text-transparent leading-tight">
              Solar Opportunity Report
            </h1>
            <p className="text-base sm:text-lg text-[#8888a0]">
              {displayName} | {lead.estimatedSystemKwp} kWp Potential
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-[#555570]">
            <Calendar className="w-4 h-4" />
            <span>Generated on {formatDate(lead.createdAt)}</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-[#555570]">
            <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span>Prepared by Solaris Panama</span>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

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

      {/* ===== SECTIONS ===== */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        {/* ===== 2. BUILDING OVERVIEW ===== */}
        <SectionWrapper order={1} title="Building Overview" icon={Building2}>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                <Ruler className="w-3.5 h-3.5 text-[#8b5cf6]" />
              </div>
              <div>
                <div className="text-[11px] text-[#555566]">Roof Area</div>
                <div className="text-sm text-[#f0f0f5] font-medium">
                  {formatNumber(Math.round(lead.area))} m²
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-[#0ea5e9]" />
              </div>
              <div>
                <div className="text-[11px] text-[#555566]">Building Type</div>
                <div className="text-sm text-[#f0f0f5] font-medium capitalize">
                  {lead.buildingType}
                </div>
              </div>
            </div>
            {lead.zone && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-[#f59e0b]" />
                </div>
                <div>
                  <div className="text-[11px] text-[#555566]">Zone</div>
                  <div className="text-sm text-[#f0f0f5] font-medium">
                    {lead.zone}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-[#22c55e]" />
              </div>
              <div>
                <div className="text-[11px] text-[#555566]">Coordinates</div>
                <div className="text-sm text-[#f0f0f5] font-medium">
                  {lead.center.lat.toFixed(5)}, {lead.center.lng.toFixed(5)}
                </div>
              </div>
            </div>
          </div>
        </SectionWrapper>

        {/* ===== 3. SOLAR SUITABILITY ===== */}
        <SectionWrapper order={2} title="Solar Suitability" icon={Sun}>
          {/* Overall score */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="text-4xl font-bold"
              style={{ color: scoreColor }}
            >
              {lead.suitabilityScore}
            </div>
            <div>
              <span
                className="px-3 py-1 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: `${scoreColor}15`,
                  color: scoreColor,
                }}
              >
                Grade {lead.suitabilityGrade} - {getGradeLabel(lead.suitabilityGrade)}
              </span>
              <p className="text-xs text-[#555570] mt-1.5">
                Overall suitability score based on building analysis
              </p>
            </div>
          </div>

          {/* Factor breakdown */}
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
                      backgroundColor: getScoreColor(
                        (factor.score / factor.max) * 100
                      ),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionWrapper>

        {/* ===== 4. SOLAR POTENTIAL ===== */}
        <SectionWrapper order={3} title="Solar Potential" icon={Zap}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <DataHighlightCard
              icon={Zap}
              label="System Size"
              value={`${lead.estimatedSystemKwp} kWp`}
              sub="Estimated capacity"
            />
            <DataHighlightCard
              icon={Sun}
              label="Panel Count"
              value={`~${panelCount} panels`}
              sub="Standard 550W panels"
            />
            <DataHighlightCard
              icon={BarChart3}
              label="Annual Energy"
              value={`${formatNumber(lead.estimatedAnnualKwh)} kWh`}
              sub="Estimated production"
            />
            <DataHighlightCard
              icon={Leaf}
              label="CO2 Offset"
              value={`${lead.estimatedCO2OffsetTons} t/yr`}
              sub="Carbon reduction"
            />
          </div>

          {/* Monthly production chart */}
          <div className="mt-5">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#0ea5e9]" />
              Estimated Monthly Production
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="reportBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00ffcc" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#00ffcc" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#555566', fontSize: 10 }}
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
                    formatter={(value: number) => [
                      formatNumber(value) + ' kWh',
                      'Production',
                    ]}
                  />
                  <Bar
                    dataKey="production"
                    fill="url(#reportBarGrad)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionWrapper>

        {/* ===== 5. FINANCIAL ANALYSIS ===== */}
        <SectionWrapper order={4} title="Financial Analysis" icon={DollarSign}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DataHighlightCard
              icon={DollarSign}
              label="Investment"
              value={formatCurrency(lead.estimatedInvestment)}
              sub="Turnkey installed"
            />
            <DataHighlightCard
              icon={Zap}
              label="Annual Savings"
              value={formatCurrency(lead.estimatedAnnualSavings)}
              sub={`${formatCurrency(lead.estimatedAnnualSavings / 12)}/month`}
            />
            <DataHighlightCard
              icon={Sun}
              label="Payback Period"
              value={`${lead.estimatedPaybackYears} years`}
              sub="Simple payback"
            />
            <DataHighlightCard
              icon={DollarSign}
              label="25yr ROI"
              value={
                lead.estimatedInvestment > 0
                  ? `${Math.round(
                      ((lead.estimatedAnnualSavings * 25 - lead.estimatedInvestment) /
                        lead.estimatedInvestment) *
                        100
                    )}%`
                  : 'N/A'
              }
              sub="Return on investment"
            />
          </div>

          <div className="mt-5 p-4 rounded-xl bg-[#22c55e]/5 border border-[#22c55e]/10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-[#22c55e]" />
              <span className="text-sm font-medium text-[#22c55e]">
                Ley 417 Tax Benefits
              </span>
            </div>
            <p className="text-xs text-[#c0c0d0] leading-relaxed">
              Under Panama's Ley 417 (2023), solar energy installations qualify for
              fiscal incentives including tax deductions on equipment costs and
              accelerated depreciation, further improving the financial returns of
              this investment.
            </p>
          </div>
        </SectionWrapper>

        {/* ===== 6. BUSINESS INFORMATION (conditional) ===== */}
        {lead.enrichment && (
          <SectionWrapper order={5} title="Business Information" icon={Building2}>
            <div className="space-y-3">
              {lead.enrichment.businessName && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-[#0ea5e9]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#555566]">Business Name</div>
                    <div className="text-sm text-[#f0f0f5] font-medium">
                      {lead.enrichment.businessName}
                    </div>
                  </div>
                </div>
              )}
              {lead.enrichment.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-[#22c55e]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#555566]">Phone</div>
                    <div className="text-sm text-[#f0f0f5] font-medium">
                      {lead.enrichment.phone}
                    </div>
                  </div>
                </div>
              )}
              {lead.enrichment.website && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#555566]">Website</div>
                    <a
                      href={lead.enrichment.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#00ffcc] hover:underline"
                    >
                      {lead.enrichment.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              )}
              {lead.enrichment.rating && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-[#f59e0b]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#555566]">Google Rating</div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-3.5 h-3.5',
                            i < Math.round(lead.enrichment!.rating!)
                              ? 'text-[#f59e0b] fill-[#f59e0b]'
                              : 'text-[#555570]'
                          )}
                        />
                      ))}
                      <span className="text-sm text-[#8888a0] ml-1.5">
                        {lead.enrichment.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {lead.enrichment.address && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#ef4444]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#ef4444]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#555566]">Address</div>
                    <div className="text-sm text-[#f0f0f5] font-medium">
                      {lead.enrichment.address}
                    </div>
                  </div>
                </div>
              )}
              {lead.enrichment.types.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-[#06b6d4]" />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#555566]">Business Types</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.enrichment.types.slice(0, 5).map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 text-[10px] rounded-full bg-white/[0.04] text-[#8888a0] capitalize"
                        >
                          {type.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionWrapper>
        )}

        {/* ===== 7. RECOMMENDATION ===== */}
        <SectionWrapper
          order={lead.enrichment ? 6 : 5}
          title="Recommendation"
          icon={Sparkles}
        >
          <p className="text-sm text-[#c0c0d0] leading-relaxed mb-5">
            {recommendation.text}
          </p>

          <div>
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
              Next Steps
            </h3>
            <div className="space-y-2">
              {recommendation.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#00ffcc]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-[#00ffcc]" />
                  </div>
                  <span className="text-sm text-[#c0c0d0]">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>
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
          <span>This report was generated by Solaris Panama AI</span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-[#8888a0] font-medium">Solaris Panama</p>
          <p className="text-[11px] text-[#555570]">
            info@solarispanama.com | +507 000-0000 | Panama City, Panama
          </p>
        </div>
      </motion.div>

      {/* ===== PRINT STYLES ===== */}
      <style>{`
        @media print {
          .proposal-content,
          [class*="text-[#c0c0d0]"],
          [class*="text-[#e0e0ea]"] {
            color: #222 !important;
          }
          [class*="bg-[#12121a]"] {
            background: #fff !important;
            border-color: #e5e7eb !important;
            box-shadow: none !important;
          }
          [class*="text-[#f0f0f5]"] {
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
