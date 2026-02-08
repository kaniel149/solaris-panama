import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, FileText, Building2, Sun, DollarSign, Users,
  ChevronRight, ChevronLeft, Zap, Leaf, Shield,
  Download, Send, Eye, Edit3, RotateCcw, CheckCircle2,
  Globe, Calculator, ArrowRight, Info, AlertTriangle,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { calculateFinancials, PANAMA_DEFAULTS } from '@/services/solarCalculator';
import type { CalculatorInputs, CalculatorResults } from '@/services/solarCalculator';

// ===== Local Helpers =====

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M';
  return '$' + Math.round(value).toLocaleString('en-US');
}

function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ===== Markdown Renderer =====

function renderMarkdown(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-[#f0f0f5] mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-[#f0f0f5] mt-6 mb-3">$1</h2>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 text-[#8888a0]">&bull; $1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 text-[#8888a0]">$1. $2</li>')
    .replace(/\n\n/g, '</p><p class="text-[#8888a0] leading-relaxed mb-3">')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p class="text-[#8888a0] leading-relaxed mb-3">${match}</p>`;
    });
}

// ===== Types =====

interface ProposalSection {
  id: string;
  title: string;
  content: string;
}

interface GeneratedProposal {
  title: string;
  language: 'en' | 'es';
  sections: ProposalSection[];
  generatedAt: string;
}

interface ProposalInput {
  clientName: string;
  contactName: string;
  clientEmail: string;
  sector: string;
  buildingAddress: string;
  roofAreaM2: number;
  roofType: string;
  monthlyBill: number;
  monthlyConsumptionKwh: number;
  panelModel: string;
  inverterModel: string;
  financials: CalculatorResults;
  language: 'en' | 'es';
}

interface FormState {
  clientName: string;
  contactName: string;
  clientEmail: string;
  clientPhone: string;
  sector: string;
  buildingName: string;
  buildingAddress: string;
  roofAreaM2: number;
  roofType: string;
  monthlyBill: number;
  monthlyConsumptionKwh: number;
  panelModel: string;
  inverterModel: string;
  costPerWp: number;
  financingType: 'cash' | 'loan';
  loanAmountPct: number;
  loanInterestRate: number;
  loanTermYears: number;
  language: 'en' | 'es';
  generatedProposal: GeneratedProposal | null;
}

// ===== Constants =====

const STEPS = [
  { num: 1, label: 'Client & Building', icon: Building2 },
  { num: 2, label: 'System Design', icon: Sun },
  { num: 3, label: 'Generate', icon: Sparkles },
  { num: 4, label: 'Preview', icon: Eye },
];

const SECTORS = [
  'Supermarket', 'Hotel', 'Warehouse', 'Office', 'Factory',
  'Shopping Mall', 'Hospital', 'Restaurant', 'Other',
] as const;

const ROOF_TYPES = ['Flat Concrete', 'Metal Sheet', 'Tilted', 'Mixed'] as const;

const PANEL_MODELS = [
  'LONGi Hi-MO X6 580W',
  'Canadian Solar HiHero 600W',
  'JA Solar DeepBlue 550W',
] as const;

const INVERTER_MODELS = [
  'Huawei SUN2000-100KTL',
  'SMA Sunny Tripower X',
  'SolarEdge SE100K',
] as const;

const PROPOSAL_SECTION_NAMES_EN = [
  'Executive Summary',
  'Company Overview',
  'Site Assessment',
  'System Design',
  'Energy Production',
  'Financial Analysis',
  'Environmental Impact',
  'Implementation Timeline',
];

const PROPOSAL_SECTION_NAMES_ES = [
  'Resumen Ejecutivo',
  'Perfil de la Empresa',
  'Evaluacion del Sitio',
  'Diseno del Sistema',
  'Produccion de Energia',
  'Analisis Financiero',
  'Impacto Ambiental',
  'Cronograma de Implementacion',
];

const DEFAULT_FORM: FormState = {
  clientName: '',
  contactName: '',
  clientEmail: '',
  clientPhone: '',
  sector: 'Office',
  buildingName: '',
  buildingAddress: '',
  roofAreaM2: 500,
  roofType: 'Flat Concrete',
  monthlyBill: 3000,
  monthlyConsumptionKwh: Math.round(3000 / PANAMA_DEFAULTS.electricityRate),
  panelModel: 'LONGi Hi-MO X6 580W',
  inverterModel: 'Huawei SUN2000-100KTL',
  costPerWp: PANAMA_DEFAULTS.costPerWp,
  financingType: 'cash',
  loanAmountPct: 80,
  loanInterestRate: 7,
  loanTermYears: 7,
  language: 'en',
  generatedProposal: null,
};

// ===== Animation Variants =====

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const slideInRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
};

// ===== Template-based Proposal Generator (fallback) =====

function generateProposalFromTemplate(input: ProposalInput): GeneratedProposal {
  const { clientName, sector, buildingAddress, roofAreaM2, roofType, monthlyBill, monthlyConsumptionKwh, panelModel, inverterModel, financials, language } = input;
  const isEn = language === 'en';
  const sectionNames = isEn ? PROPOSAL_SECTION_NAMES_EN : PROPOSAL_SECTION_NAMES_ES;
  const sections: ProposalSection[] = [
    {
      id: 'executive-summary',
      title: sectionNames[0],
      content: isEn
        ? `**Solaris Panama** is pleased to present this solar energy proposal for **${clientName}**, located at ${buildingAddress}.\n\nBased on our analysis, a **${formatNumber(financials.systemSizeKwp, 1)} kWp** rooftop solar system will reduce your electricity costs by an estimated **${formatCurrency(financials.year1Savings)} annually**, with a payback period of just **${financials.simplePaybackYears.toFixed(1)} years**.\n\nOver the 25-year system lifetime, your total savings are projected to reach **${formatCurrency(financials.lifetimeSavings25Year)}**, delivering a **${financials.roi25Year.toFixed(0)}% return on investment**.`
        : `**Solaris Panama** tiene el placer de presentar esta propuesta de energia solar para **${clientName}**, ubicada en ${buildingAddress}.\n\nSegun nuestro analisis, un sistema solar de **${formatNumber(financials.systemSizeKwp, 1)} kWp** en techo reducira sus costos de electricidad en aproximadamente **${formatCurrency(financials.year1Savings)} anuales**, con un periodo de recuperacion de solo **${financials.simplePaybackYears.toFixed(1)} anos**.\n\nDurante los 25 anos de vida del sistema, sus ahorros totales se proyectan en **${formatCurrency(financials.lifetimeSavings25Year)}**, generando un **${financials.roi25Year.toFixed(0)}% de retorno sobre la inversion**.`,
    },
    {
      id: 'company-overview',
      title: sectionNames[1],
      content: isEn
        ? `Solaris Panama is a leading provider of commercial and industrial rooftop solar solutions in Panama. We leverage **AI-powered design tools** and the latest photovoltaic technology to deliver optimized, turnkey solar systems.\n\n- Licensed and insured solar installer\n- End-to-end project management\n- Partnerships with tier-1 equipment manufacturers\n- Post-installation monitoring and O&M services\n- Fully compliant with ASEP and SNE regulations`
        : `Solaris Panama es un proveedor lider de soluciones solares comerciales e industriales en techo en Panama. Utilizamos **herramientas de diseno impulsadas por IA** y la tecnologia fotovoltaica mas avanzada para ofrecer sistemas solares optimizados y llave en mano.\n\n- Instalador solar licenciado y asegurado\n- Gestion integral de proyectos\n- Alianzas con fabricantes de equipos de primer nivel\n- Monitoreo post-instalacion y servicios de O&M\n- Totalmente conforme con las regulaciones de ASEP y SNE`,
    },
    {
      id: 'site-assessment',
      title: sectionNames[2],
      content: isEn
        ? `### Building Details\n\n- **Address:** ${buildingAddress}\n- **Sector:** ${sector}\n- **Roof Area:** ${formatNumber(roofAreaM2)} m2\n- **Roof Type:** ${roofType}\n- **Current Monthly Bill:** ${formatCurrency(monthlyBill)}\n- **Monthly Consumption:** ${formatNumber(monthlyConsumptionKwh)} kWh\n\nThe ${roofType.toLowerCase()} roof at this location provides ${roofAreaM2 >= financials.requiredRoofAreaM2 ? 'sufficient' : 'limited'} area for the proposed system. Panama City receives an average of **4.5 peak sun hours per day**, making it an excellent location for solar energy generation.`
        : `### Detalles del Edificio\n\n- **Direccion:** ${buildingAddress}\n- **Sector:** ${sector}\n- **Area de Techo:** ${formatNumber(roofAreaM2)} m2\n- **Tipo de Techo:** ${roofType}\n- **Factura Mensual Actual:** ${formatCurrency(monthlyBill)}\n- **Consumo Mensual:** ${formatNumber(monthlyConsumptionKwh)} kWh\n\nEl techo de tipo ${roofType.toLowerCase()} en esta ubicacion proporciona area ${roofAreaM2 >= financials.requiredRoofAreaM2 ? 'suficiente' : 'limitada'} para el sistema propuesto. La Ciudad de Panama recibe un promedio de **4.5 horas pico de sol por dia**, lo que la convierte en una excelente ubicacion para la generacion de energia solar.`,
    },
    {
      id: 'system-design',
      title: sectionNames[3],
      content: isEn
        ? `### Proposed System\n\n- **System Capacity:** ${formatNumber(financials.systemSizeKwp, 1)} kWp\n- **Panel Model:** ${panelModel}\n- **Panel Count:** ${financials.panelCount} panels\n- **Inverter Model:** ${inverterModel}\n- **Required Roof Area:** ${formatNumber(financials.requiredRoofAreaM2)} m2 (including spacing)\n- **System Efficiency:** ${(PANAMA_DEFAULTS.performanceRatio * 100).toFixed(0)}% performance ratio\n\nThe system uses **tier-1 monocrystalline PERC panels** with industry-leading efficiency and a 25-year linear power warranty. The string inverter configuration ensures optimal energy harvest across all roof sections.`
        : `### Sistema Propuesto\n\n- **Capacidad del Sistema:** ${formatNumber(financials.systemSizeKwp, 1)} kWp\n- **Modelo de Panel:** ${panelModel}\n- **Cantidad de Paneles:** ${financials.panelCount} paneles\n- **Modelo de Inversor:** ${inverterModel}\n- **Area de Techo Requerida:** ${formatNumber(financials.requiredRoofAreaM2)} m2 (incluyendo espaciado)\n- **Eficiencia del Sistema:** ${(PANAMA_DEFAULTS.performanceRatio * 100).toFixed(0)}% ratio de rendimiento\n\nEl sistema utiliza **paneles monocristalinos PERC de primer nivel** con eficiencia lider en la industria y garantia de potencia lineal de 25 anos. La configuracion de inversor string asegura una cosecha optima de energia en todas las secciones del techo.`,
    },
    {
      id: 'energy-production',
      title: sectionNames[4],
      content: isEn
        ? `### Annual Energy Production\n\n- **Year 1 Production:** ${formatNumber(financials.year1ProductionKwh)} kWh\n- **Self-Consumed:** ${formatNumber(financials.selfConsumedKwh)} kWh (${((financials.selfConsumedKwh / financials.year1ProductionKwh) * 100).toFixed(1)}%)\n- **Exported to Grid:** ${formatNumber(financials.exportedKwh)} kWh\n- **Net Metering Credit:** ${formatNumber(financials.creditedKwh)} kWh (25% cap per Ley 37)\n\nThe system is designed to cover approximately **${((financials.selfConsumedKwh / (monthlyConsumptionKwh * 12)) * 100).toFixed(0)}%** of your annual electricity consumption. Annual degradation of 0.5% is factored into all long-term projections.`
        : `### Produccion Anual de Energia\n\n- **Produccion Ano 1:** ${formatNumber(financials.year1ProductionKwh)} kWh\n- **Autoconsumo:** ${formatNumber(financials.selfConsumedKwh)} kWh (${((financials.selfConsumedKwh / financials.year1ProductionKwh) * 100).toFixed(1)}%)\n- **Exportado a la Red:** ${formatNumber(financials.exportedKwh)} kWh\n- **Credito de Medicion Neta:** ${formatNumber(financials.creditedKwh)} kWh (tope 25% segun Ley 37)\n\nEl sistema esta disenado para cubrir aproximadamente **${((financials.selfConsumedKwh / (monthlyConsumptionKwh * 12)) * 100).toFixed(0)}%** de su consumo anual de electricidad. La degradacion anual de 0.5% esta incluida en todas las proyecciones a largo plazo.`,
    },
    {
      id: 'financial-analysis',
      title: sectionNames[5],
      content: isEn
        ? `### Investment Overview\n\n- **Total System Cost:** ${formatCurrency(financials.totalSystemCost)}\n- **Cost per Wp:** $${DEFAULT_FORM.costPerWp.toFixed(2)}\n\n### Savings & Returns\n\n- **Year 1 Savings:** ${formatCurrency(financials.year1Savings)}\n- **Monthly Savings:** ${formatCurrency(financials.monthlySavings)}\n- **Simple Payback:** ${financials.simplePaybackYears.toFixed(1)} years\n- **25-Year Savings:** ${formatCurrency(financials.lifetimeSavings25Year)}\n- **NPV (25yr, 8%):** ${formatCurrency(financials.npv25Year)}\n- **IRR:** ${(financials.irr * 100).toFixed(1)}%\n- **ROI (25yr):** ${financials.roi25Year.toFixed(0)}%\n- **LCOE:** $${financials.lcoe.toFixed(3)}/kWh\n\n### Tax Benefits (Ley 417)\n\n- **0% import duty** on solar panels, inverters, and mounting structures\n- **0% VAT** on all solar equipment\n- These benefits are already reflected in the system cost above`
        : `### Resumen de Inversion\n\n- **Costo Total del Sistema:** ${formatCurrency(financials.totalSystemCost)}\n- **Costo por Wp:** $${DEFAULT_FORM.costPerWp.toFixed(2)}\n\n### Ahorros y Retornos\n\n- **Ahorros Ano 1:** ${formatCurrency(financials.year1Savings)}\n- **Ahorros Mensuales:** ${formatCurrency(financials.monthlySavings)}\n- **Recuperacion Simple:** ${financials.simplePaybackYears.toFixed(1)} anos\n- **Ahorros 25 Anos:** ${formatCurrency(financials.lifetimeSavings25Year)}\n- **VAN (25 anos, 8%):** ${formatCurrency(financials.npv25Year)}\n- **TIR:** ${(financials.irr * 100).toFixed(1)}%\n- **ROI (25 anos):** ${financials.roi25Year.toFixed(0)}%\n- **LCOE:** $${financials.lcoe.toFixed(3)}/kWh\n\n### Beneficios Fiscales (Ley 417)\n\n- **0% arancel de importacion** en paneles solares, inversores y estructuras de montaje\n- **0% ITBMS** en todos los equipos solares\n- Estos beneficios ya estan reflejados en el costo del sistema arriba`,
    },
    {
      id: 'environmental-impact',
      title: sectionNames[6],
      content: isEn
        ? `### Carbon Offset\n\n- **Annual CO2 Offset:** ${formatNumber(financials.annualCO2OffsetTons, 1)} tons\n- **Lifetime CO2 Offset:** ${formatNumber(financials.lifetimeCO2OffsetTons)} tons\n- **Equivalent Trees Planted:** ${formatNumber(financials.equivalentTreesPlanted)}\n- **Cars Removed from Road (annual):** ${formatNumber(financials.equivalentCarsRemoved, 1)}\n\nBy adopting solar energy, **${clientName}** will demonstrate a tangible commitment to sustainability, reducing reliance on fossil fuels and contributing to Panama's clean energy goals. This investment supports the **United Nations Sustainable Development Goals (SDGs)**, particularly SDG 7 (Affordable and Clean Energy) and SDG 13 (Climate Action).`
        : `### Compensacion de Carbono\n\n- **Compensacion Anual de CO2:** ${formatNumber(financials.annualCO2OffsetTons, 1)} toneladas\n- **Compensacion Total de CO2 (25 anos):** ${formatNumber(financials.lifetimeCO2OffsetTons)} toneladas\n- **Arboles Equivalentes Plantados:** ${formatNumber(financials.equivalentTreesPlanted)}\n- **Autos Retirados de la Carretera (anual):** ${formatNumber(financials.equivalentCarsRemoved, 1)}\n\nAl adoptar energia solar, **${clientName}** demostrara un compromiso tangible con la sostenibilidad, reduciendo la dependencia de combustibles fosiles y contribuyendo a los objetivos de energia limpia de Panama. Esta inversion apoya los **Objetivos de Desarrollo Sostenible (ODS) de las Naciones Unidas**, particularmente el ODS 7 (Energia Asequible y Limpia) y el ODS 13 (Accion por el Clima).`,
    },
    {
      id: 'implementation-timeline',
      title: sectionNames[7],
      content: isEn
        ? `### Project Phases\n\n1. **Site Survey & Engineering (Week 1-2)** - Detailed structural and electrical assessment\n2. **Permitting & ASEP Approval (Week 3-6)** - Net metering application and building permits\n3. **Equipment Procurement (Week 4-8)** - Panel, inverter, and BOS ordering and logistics\n4. **Installation (Week 7-10)** - Mounting, wiring, inverter commissioning\n5. **Grid Connection & Testing (Week 10-12)** - Utility inspection and meter installation\n6. **System Handover (Week 12)** - Training, monitoring setup, warranty documentation\n\n### Warranties\n\n- **Panels:** 25-year linear power warranty\n- **Inverter:** 10-year manufacturer warranty (extendable to 20)\n- **Workmanship:** 5-year installation warranty\n- **Monitoring:** Cloud-based 24/7 performance monitoring included`
        : `### Fases del Proyecto\n\n1. **Estudio de Sitio e Ingenieria (Semana 1-2)** - Evaluacion estructural y electrica detallada\n2. **Permisos y Aprobacion ASEP (Semana 3-6)** - Solicitud de medicion neta y permisos de construccion\n3. **Adquisicion de Equipos (Semana 4-8)** - Pedido y logistica de paneles, inversores y BOS\n4. **Instalacion (Semana 7-10)** - Montaje, cableado, puesta en marcha del inversor\n5. **Conexion a Red y Pruebas (Semana 10-12)** - Inspeccion de servicios publicos e instalacion de medidor\n6. **Entrega del Sistema (Semana 12)** - Capacitacion, configuracion de monitoreo, documentacion de garantia\n\n### Garantias\n\n- **Paneles:** Garantia de potencia lineal de 25 anos\n- **Inversor:** Garantia del fabricante de 10 anos (ampliable a 20)\n- **Mano de Obra:** Garantia de instalacion de 5 anos\n- **Monitoreo:** Monitoreo de rendimiento 24/7 basado en la nube incluido`,
    },
  ];

  return {
    title: isEn
      ? `Solar Energy Proposal - ${clientName}`
      : `Propuesta de Energia Solar - ${clientName}`,
    language,
    sections,
    generatedAt: new Date().toISOString(),
  };
}

// ===== Sub-Components =====

function StepIndicator({ currentStep, completedSteps }: { currentStep: number; completedSteps: Set<number> }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const isActive = currentStep === step.num;
        const isCompleted = completedSteps.has(step.num);
        const StepIcon = step.icon;
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  isActive && 'bg-[#00ffcc]/20 border-[#00ffcc] shadow-[0_0_20px_rgba(0,255,204,0.3)]',
                  isCompleted && !isActive && 'bg-[#22c55e]/20 border-[#22c55e]',
                  !isActive && !isCompleted && 'bg-white/[0.03] border-white/[0.08]',
                )}
                animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isCompleted && !isActive ? (
                  <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
                ) : (
                  <StepIcon className={cn(
                    'w-4 h-4',
                    isActive ? 'text-[#00ffcc]' : 'text-[#555566]',
                  )} />
                )}
              </motion.div>
              <span className={cn(
                'text-[10px] font-medium hidden sm:block',
                isActive ? 'text-[#00ffcc]' : isCompleted ? 'text-[#22c55e]' : 'text-[#555566]',
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'w-12 md:w-20 h-0.5 mx-2 mt-[-18px] sm:mt-[-18px] rounded-full transition-colors duration-300',
                completedSteps.has(step.num) ? 'bg-[#22c55e]/40' : 'bg-white/[0.06]',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface FormInputProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  suffix?: string;
  hint?: string;
}

function FormInput({ label, value, onChange, type = 'text', placeholder, required, icon, suffix, hint }: FormInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#8888a0]">
        {label} {required && <span className="text-[#ef4444]">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555566]">{icon}</div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full h-10 rounded-lg bg-[#12121a] border border-white/[0.06] text-sm text-[#f0f0f5] placeholder-[#555566] outline-none transition-all duration-200',
            'focus:border-[#00ffcc] focus:shadow-[0_0_0_3px_rgba(0,255,204,0.1)]',
            icon ? 'pl-10' : 'pl-3.5',
            suffix ? 'pr-12' : 'pr-3.5',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#555566]">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[10px] text-[#555566]">{hint}</p>}
    </div>
  );
}

interface FormSelectProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}

function FormSelect({ label, value, options, onChange, icon }: FormSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#8888a0]">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555566] pointer-events-none">{icon}</div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full h-10 appearance-none rounded-lg bg-[#12121a] border border-white/[0.06] text-sm text-[#f0f0f5] outline-none transition-all duration-200 pr-10 cursor-pointer',
            'focus:border-[#00ffcc] focus:shadow-[0_0_0_3px_rgba(0,255,204,0.1)]',
            icon ? 'pl-10' : 'pl-3.5',
          )}
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-[#12121a] text-[#f0f0f5]">{opt}</option>
          ))}
        </select>
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555566] pointer-events-none rotate-90" />
      </div>
    </div>
  );
}

interface HeroMetricCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
}

function HeroMetricCard({ label, value, sub, icon, color, glowColor }: HeroMetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] p-4 hover:border-white/[0.1] transition-all duration-300 group">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 50% 120%, ${glowColor}, transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-[#8888a0] uppercase tracking-wider">{label}</span>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <span style={{ color }}>{icon}</span>
          </div>
        </div>
        <p className="text-xl font-bold text-[#f0f0f5] tabular-nums">{value}</p>
        <p className="text-[10px] text-[#555566] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderInput({ label, value, min, max, step, prefix, unit, onChange }: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = step < 1 ? 2 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[#8888a0]">{label}</label>
        <span className="text-sm font-semibold text-[#f0f0f5] tabular-nums">
          {prefix}{formatNumber(value, decimals)}{unit}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9]"
            style={{ width: `${pct}%` }}
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <motion.div
          className="absolute w-4 h-4 rounded-full bg-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.4)] border-2 border-[#0a0a0f] pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====

export default function ProposalGeneratorPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 8, currentSection: '' });
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    if (form.clientName && form.buildingAddress && form.monthlyBill > 0) set.add(1);
    if (set.has(1)) set.add(2);
    if (form.generatedProposal) { set.add(3); set.add(4); }
    return set;
  }, [form.clientName, form.buildingAddress, form.monthlyBill, form.generatedProposal]);

  // Update form helper
  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Auto-calculate consumption from bill
  useEffect(() => {
    const calculated = Math.round(form.monthlyBill / PANAMA_DEFAULTS.electricityRate);
    if (Math.abs(form.monthlyConsumptionKwh - calculated) < 10) {
      updateForm('monthlyConsumptionKwh', calculated);
    }
  }, [form.monthlyBill, form.monthlyConsumptionKwh, updateForm]);

  // Calculator inputs (memo)
  const calcInputs: CalculatorInputs = useMemo(() => ({
    monthlyBill: form.monthlyBill,
    monthlyConsumptionKwh: form.monthlyConsumptionKwh,
    costPerWp: form.costPerWp,
    financingType: form.financingType,
    loanAmountPct: form.loanAmountPct / 100,
    loanInterestRate: form.loanInterestRate / 100,
    loanTermYears: form.loanTermYears,
  }), [form.monthlyBill, form.monthlyConsumptionKwh, form.costPerWp, form.financingType, form.loanAmountPct, form.loanInterestRate, form.loanTermYears]);

  const financials: CalculatorResults = useMemo(() => calculateFinancials(calcInputs), [calcInputs]);

  // Step validation
  const canProceed = useMemo(() => {
    if (currentStep === 1) {
      return form.clientName.trim().length > 0 && form.buildingAddress.trim().length > 0 && form.monthlyBill > 0;
    }
    if (currentStep === 2) return true;
    if (currentStep === 3) return form.generatedProposal !== null;
    return true;
  }, [currentStep, form.clientName, form.buildingAddress, form.monthlyBill, form.generatedProposal]);

  // Generate proposal
  const handleGenerate = useCallback(async (useTemplate = false) => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress({ current: 0, total: 8, currentSection: '' });

    const sectionNames = form.language === 'en' ? PROPOSAL_SECTION_NAMES_EN : PROPOSAL_SECTION_NAMES_ES;
    const input: ProposalInput = {
      clientName: form.clientName,
      contactName: form.contactName,
      clientEmail: form.clientEmail,
      sector: form.sector,
      buildingAddress: form.buildingAddress,
      roofAreaM2: form.roofAreaM2,
      roofType: form.roofType,
      monthlyBill: form.monthlyBill,
      monthlyConsumptionKwh: form.monthlyConsumptionKwh,
      panelModel: form.panelModel,
      inverterModel: form.inverterModel,
      financials,
      language: form.language,
    };

    try {
      // Simulate streaming progress
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, useTemplate ? 200 : 1500 + Math.random() * 1000));
        setGenerationProgress({ current: i + 1, total: 8, currentSection: sectionNames[i] });
      }

      // Generate from template (fallback / only option for now)
      const proposal = generateProposalFromTemplate(input);
      updateForm('generatedProposal', proposal);

      // Save draft to localStorage
      try {
        localStorage.setItem('solaris_proposal_draft', JSON.stringify({ form: { ...form, generatedProposal: proposal }, savedAt: new Date().toISOString() }));
      } catch {
        // localStorage full or unavailable
      }

      // Auto-advance to preview
      setTimeout(() => setCurrentStep(4), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate proposal. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [form, financials, updateForm]);

  // Scroll to section in preview
  const scrollToSection = useCallback((sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, []);

  // Intersection observer for active section tracking
  useEffect(() => {
    if (currentStep !== 4 || !form.generatedProposal) return;

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
  }, [currentStep, form.generatedProposal]);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('solaris_proposal_draft');
      if (saved) {
        const { form: savedForm } = JSON.parse(saved) as { form: FormState };
        if (savedForm.clientName) {
          setForm(savedForm);
        }
      }
    } catch {
      // invalid data
    }
  }, []);

  const handleSaveDraft = useCallback(() => {
    try {
      localStorage.setItem('solaris_proposal_draft', JSON.stringify({ form, savedAt: new Date().toISOString() }));
      setError(null);
    } catch {
      setError('Failed to save draft');
    }
  }, [form]);

  const handleReset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setCurrentStep(1);
    setError(null);
    localStorage.removeItem('solaris_proposal_draft');
  }, []);

  // ===== RENDER =====
  return (
    <motion.div
      className="p-6 lg:p-8 max-w-[1600px] mx-auto"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Page Header */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title="AI Proposal Generator"
          description="Create professional solar proposals powered by AI"
          gradient
          breadcrumbs={[
            { label: 'Tools', onClick: () => {} },
            { label: 'Proposal Generator' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                <Sparkles className="w-3.5 h-3.5 text-[#8b5cf6]" />
                <span className="text-xs font-medium text-[#8b5cf6]">AI-Powered</span>
              </div>
              {(form.clientName || form.generatedProposal) && (
                <Button variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset}>
                  Start Over
                </Button>
              )}
            </div>
          }
        />
      </motion.div>

      {/* Step Indicator */}
      <motion.div variants={fadeUp}>
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* ===== STEP 1: Client & Building ===== */}
        {currentStep === 1 && (
          <motion.div key="step1" {...slideInRight}>
            {/* Pre-fill banner */}
            <div className="flex items-center gap-3 p-3 mb-6 rounded-xl bg-[#0ea5e9]/[0.06] border border-[#0ea5e9]/15">
              <Info className="w-4 h-4 text-[#0ea5e9] shrink-0" />
              <p className="text-xs text-[#8888a0]">
                <span className="text-[#0ea5e9] font-medium">Tip:</span> Use the{' '}
                <span className="text-[#f0f0f5] underline underline-offset-2 cursor-pointer hover:text-[#00ffcc] transition-colors">
                  Roof Scanner
                </span>{' '}
                first for accurate building data.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Client Info */}
              <GlassCard
                variant="elevated"
                header={
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00ffcc]" />
                    <h2 className="text-sm font-semibold text-[#f0f0f5]">Client Information</h2>
                  </div>
                }
              >
                <div className="space-y-4">
                  <FormInput
                    label="Company Name"
                    value={form.clientName}
                    onChange={(v) => updateForm('clientName', v)}
                    placeholder="e.g. Grupo Rey S.A."
                    required
                    icon={<Building2 className="w-4 h-4" />}
                  />
                  <FormInput
                    label="Contact Person"
                    value={form.contactName}
                    onChange={(v) => updateForm('contactName', v)}
                    placeholder="e.g. Juan Perez"
                    icon={<Users className="w-4 h-4" />}
                  />
                  <FormInput
                    label="Email"
                    value={form.clientEmail}
                    onChange={(v) => updateForm('clientEmail', v)}
                    type="email"
                    placeholder="contact@company.com"
                  />
                  <FormInput
                    label="Phone"
                    value={form.clientPhone}
                    onChange={(v) => updateForm('clientPhone', v)}
                    type="tel"
                    placeholder="+507 6000-0000"
                  />
                  <FormSelect
                    label="Sector"
                    value={form.sector}
                    options={SECTORS}
                    onChange={(v) => updateForm('sector', v)}
                    icon={<Globe className="w-4 h-4" />}
                  />
                </div>
              </GlassCard>

              {/* Right: Building Info */}
              <GlassCard
                variant="elevated"
                header={
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0ea5e9]" />
                    <h2 className="text-sm font-semibold text-[#f0f0f5]">Building Information</h2>
                  </div>
                }
              >
                <div className="space-y-4">
                  <FormInput
                    label="Building Name"
                    value={form.buildingName}
                    onChange={(v) => updateForm('buildingName', v)}
                    placeholder="e.g. Main Warehouse (optional)"
                  />
                  <FormInput
                    label="Address"
                    value={form.buildingAddress}
                    onChange={(v) => updateForm('buildingAddress', v)}
                    placeholder="e.g. Via Espana, Panama City"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput
                      label="Roof Area"
                      value={form.roofAreaM2}
                      onChange={(v) => updateForm('roofAreaM2', parseFloat(v) || 0)}
                      type="number"
                      suffix="m2"
                    />
                    <FormSelect
                      label="Roof Type"
                      value={form.roofType}
                      options={ROOF_TYPES}
                      onChange={(v) => updateForm('roofType', v)}
                    />
                  </div>
                  <FormInput
                    label="Monthly Electricity Bill"
                    value={form.monthlyBill}
                    onChange={(v) => updateForm('monthlyBill', parseFloat(v) || 0)}
                    type="number"
                    required
                    icon={<DollarSign className="w-4 h-4" />}
                    suffix="$/month"
                  />
                  <FormInput
                    label="Monthly Consumption"
                    value={form.monthlyConsumptionKwh}
                    onChange={(v) => updateForm('monthlyConsumptionKwh', parseFloat(v) || 0)}
                    type="number"
                    suffix="kWh"
                    hint={`Auto-calculated from bill at $${PANAMA_DEFAULTS.electricityRate}/kWh. Edit if you have the actual value.`}
                  />
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {/* ===== STEP 2: System Design ===== */}
        {currentStep === 2 && (
          <motion.div key="step2" {...slideInRight}>
            {/* Auto-calculated system cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <HeroMetricCard
                label="System Size"
                value={`${formatNumber(financials.systemSizeKwp, 1)} kWp`}
                sub={`${financials.panelCount} panels`}
                icon={<Sun className="w-4 h-4" />}
                color="#00ffcc"
                glowColor="rgba(0, 255, 204, 0.08)"
              />
              <HeroMetricCard
                label="Panel Count"
                value={`${financials.panelCount}`}
                sub={form.panelModel.split(' ').slice(-1)[0]}
                icon={<Zap className="w-4 h-4" />}
                color="#0ea5e9"
                glowColor="rgba(14, 165, 233, 0.08)"
              />
              <HeroMetricCard
                label="Annual Production"
                value={`${formatNumber(financials.year1ProductionKwh)}`}
                sub="kWh/year"
                icon={<Calculator className="w-4 h-4" />}
                color="#8b5cf6"
                glowColor="rgba(139, 92, 246, 0.08)"
              />
              <HeroMetricCard
                label="Required Roof"
                value={`${formatNumber(financials.requiredRoofAreaM2)} m2`}
                sub={form.roofAreaM2 >= financials.requiredRoofAreaM2 ? 'Sufficient' : 'May need adjustment'}
                icon={<Building2 className="w-4 h-4" />}
                color={form.roofAreaM2 >= financials.requiredRoofAreaM2 ? '#22c55e' : '#ef4444'}
                glowColor={form.roofAreaM2 >= financials.requiredRoofAreaM2 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Equipment Selection */}
              <GlassCard
                variant="elevated"
                header={
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00ffcc]" />
                    <h2 className="text-sm font-semibold text-[#f0f0f5]">Equipment Selection</h2>
                  </div>
                }
              >
                <div className="space-y-4">
                  <FormSelect
                    label="Panel Model"
                    value={form.panelModel}
                    options={PANEL_MODELS}
                    onChange={(v) => updateForm('panelModel', v)}
                    icon={<Sun className="w-4 h-4" />}
                  />
                  <FormSelect
                    label="Inverter Model"
                    value={form.inverterModel}
                    options={INVERTER_MODELS}
                    onChange={(v) => updateForm('inverterModel', v)}
                    icon={<Zap className="w-4 h-4" />}
                  />
                  <SliderInput
                    label="Cost per Wp"
                    value={form.costPerWp}
                    min={0.70}
                    max={1.30}
                    step={0.01}
                    prefix="$"
                    onChange={(v) => updateForm('costPerWp', v)}
                  />

                  {/* Financing toggle */}
                  <div className="border-t border-white/[0.06] pt-4 mt-4">
                    <label className="text-xs font-medium text-[#8888a0] mb-2 block">Financing</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateForm('financingType', 'cash')}
                        className={cn(
                          'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border',
                          form.financingType === 'cash'
                            ? 'bg-[#00ffcc]/10 text-[#00ffcc] border-[#00ffcc]/30'
                            : 'bg-white/[0.02] text-[#8888a0] border-white/[0.06] hover:border-white/[0.12]',
                        )}
                      >
                        Cash
                      </button>
                      <button
                        onClick={() => updateForm('financingType', 'loan')}
                        className={cn(
                          'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border',
                          form.financingType === 'loan'
                            ? 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30'
                            : 'bg-white/[0.02] text-[#8888a0] border-white/[0.06] hover:border-white/[0.12]',
                        )}
                      >
                        Loan
                      </button>
                    </div>

                    <AnimatePresence>
                      {form.financingType === 'loan' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="mt-4 space-y-3 overflow-hidden"
                        >
                          <SliderInput label="Loan Amount" value={form.loanAmountPct} min={10} max={100} step={5} unit="%" onChange={(v) => updateForm('loanAmountPct', v)} />
                          <SliderInput label="Interest Rate" value={form.loanInterestRate} min={3} max={15} step={0.25} unit="%" onChange={(v) => updateForm('loanInterestRate', v)} />
                          <SliderInput label="Loan Term" value={form.loanTermYears} min={3} max={20} step={1} unit=" yrs" onChange={(v) => updateForm('loanTermYears', v)} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </GlassCard>

              {/* Financial Summary */}
              <GlassCard
                variant="elevated"
                header={
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#22c55e]" />
                    <h2 className="text-sm font-semibold text-[#f0f0f5]">Financial Summary</h2>
                  </div>
                }
              >
                <div className="space-y-4">
                  {/* 4 hero stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#00ffcc]/[0.04] border border-[#00ffcc]/10 text-center">
                      <p className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">Total Investment</p>
                      <p className="text-xl font-bold text-[#f0f0f5] tabular-nums">{formatCurrency(financials.totalSystemCost)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#22c55e]/[0.04] border border-[#22c55e]/10 text-center">
                      <p className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">Annual Savings</p>
                      <p className="text-xl font-bold text-[#22c55e] tabular-nums">{formatCurrency(financials.year1Savings)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#8b5cf6]/[0.04] border border-[#8b5cf6]/10 text-center">
                      <p className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">Payback Period</p>
                      <p className="text-xl font-bold text-[#8b5cf6] tabular-nums">{financials.simplePaybackYears.toFixed(1)} yrs</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0ea5e9]/[0.04] border border-[#0ea5e9]/10 text-center">
                      <p className="text-[10px] text-[#8888a0] uppercase tracking-wider mb-1">25-Year ROI</p>
                      <p className="text-xl font-bold text-[#0ea5e9] tabular-nums">{financials.roi25Year.toFixed(0)}%</p>
                    </div>
                  </div>

                  {/* Detailed metrics */}
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-2">
                    {[
                      ['Monthly Savings', formatCurrency(financials.monthlySavings)],
                      ['25-Year Savings', formatCurrency(financials.lifetimeSavings25Year)],
                      ['NPV (25yr, 8%)', formatCurrency(financials.npv25Year)],
                      ['IRR', `${(financials.irr * 100).toFixed(1)}%`],
                      ['LCOE', `$${financials.lcoe.toFixed(3)}/kWh`],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-[#8888a0]">{label}</span>
                        <span className="text-[#f0f0f5] font-medium tabular-nums">{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Loan summary */}
                  {form.financingType === 'loan' && financials.monthlyLoanPayment !== undefined && (
                    <div className="p-3 rounded-lg bg-[#8b5cf6]/[0.06] border border-[#8b5cf6]/15 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8888a0]">Monthly Payment</span>
                        <span className="text-[#f0f0f5] font-medium tabular-nums">{formatCurrency(financials.monthlyLoanPayment)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8888a0]">Total Interest</span>
                        <span className="text-[#f0f0f5] font-medium tabular-nums">{formatCurrency(financials.totalInterestPaid ?? 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8888a0]">Net Savings (Year 1)</span>
                        <span className={cn(
                          'font-medium tabular-nums',
                          (financials.netSavingsAfterLoan ?? 0) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]',
                        )}>
                          {formatCurrency(financials.netSavingsAfterLoan ?? 0)}/yr
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Environmental mini */}
                  <div className="border-t border-white/[0.06] pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="w-3.5 h-3.5 text-[#22c55e]" />
                      <span className="text-xs font-medium text-[#8888a0]">Environmental Impact</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-[#22c55e] font-semibold tabular-nums">{formatNumber(financials.annualCO2OffsetTons, 1)}</span>
                        <span className="text-[#555566] ml-1">tCO2/yr</span>
                      </div>
                      <div>
                        <span className="text-[#22c55e] font-semibold tabular-nums">{formatNumber(financials.equivalentTreesPlanted)}</span>
                        <span className="text-[#555566] ml-1">trees (25yr)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {/* ===== STEP 3: Generate ===== */}
        {currentStep === 3 && (
          <motion.div key="step3" {...slideInRight}>
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Language Selection */}
              <GlassCard
                header={
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#00ffcc]" />
                    <h2 className="text-sm font-semibold text-[#f0f0f5]">Proposal Language</h2>
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateForm('language', 'en')}
                    className={cn(
                      'p-6 rounded-xl border-2 text-center transition-all duration-300',
                      form.language === 'en'
                        ? 'bg-[#00ffcc]/[0.08] border-[#00ffcc]/40 shadow-[0_0_30px_rgba(0,255,204,0.1)]'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]',
                    )}
                  >
                    <span className="text-3xl block mb-2">&#x1F1FA;&#x1F1F8;</span>
                    <span className={cn('text-sm font-semibold', form.language === 'en' ? 'text-[#00ffcc]' : 'text-[#8888a0]')}>
                      English
                    </span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateForm('language', 'es')}
                    className={cn(
                      'p-6 rounded-xl border-2 text-center transition-all duration-300',
                      form.language === 'es'
                        ? 'bg-[#00ffcc]/[0.08] border-[#00ffcc]/40 shadow-[0_0_30px_rgba(0,255,204,0.1)]'
                        : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]',
                    )}
                  >
                    <span className="text-3xl block mb-2">&#x1F1EA;&#x1F1F8;</span>
                    <span className={cn('text-sm font-semibold', form.language === 'es' ? 'text-[#00ffcc]' : 'text-[#8888a0]')}>
                      Espanol
                    </span>
                  </motion.button>
                </div>
              </GlassCard>

              {/* Generate / Progress */}
              {!isGenerating ? (
                <div className="space-y-4">
                  {/* Main generate button */}
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0, 255, 204, 0.2)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleGenerate(false)}
                    className="w-full py-5 rounded-xl bg-gradient-to-r from-[#00ffcc]/20 to-[#0ea5e9]/20 border border-[#00ffcc]/30 text-[#00ffcc] font-semibold text-lg flex items-center justify-center gap-3 hover:from-[#00ffcc]/30 hover:to-[#0ea5e9]/30 transition-all duration-300 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Proposal with AI
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>

                  {/* Template fallback */}
                  <button
                    onClick={() => handleGenerate(true)}
                    className="w-full py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[#8888a0] text-sm font-medium hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Generate from Template (instant)
                  </button>
                </div>
              ) : (
                <GlassCard variant="elevated">
                  <div className="space-y-5">
                    {/* Header with pulsing icon */}
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Sparkles className="w-6 h-6 text-[#00ffcc]" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-[#f0f0f5]">Generating your proposal...</p>
                        <p className="text-xs text-[#555566]">This usually takes 15-20 seconds</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#8888a0]">
                          Section {generationProgress.current} of {generationProgress.total}
                        </span>
                        <span className="text-[#00ffcc] tabular-nums">
                          {Math.round((generationProgress.current / generationProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9]"
                          animate={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* Section list with checks */}
                    <div className="grid grid-cols-2 gap-2">
                      {(form.language === 'en' ? PROPOSAL_SECTION_NAMES_EN : PROPOSAL_SECTION_NAMES_ES).map((name, i) => {
                        const isDone = i < generationProgress.current;
                        const isCurrent = i === generationProgress.current - 1;
                        return (
                          <div key={name} className="flex items-center gap-2 py-1">
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                            ) : (
                              <div className={cn(
                                'w-3.5 h-3.5 rounded-full border shrink-0',
                                isCurrent ? 'border-[#00ffcc] bg-[#00ffcc]/20' : 'border-white/[0.1]',
                              )} />
                            )}
                            <span className={cn(
                              'text-xs truncate',
                              isDone ? 'text-[#f0f0f5]' : isCurrent ? 'text-[#00ffcc]' : 'text-[#555566]',
                            )}>
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Error display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-[#ef4444]/[0.08] border border-[#ef4444]/20"
                >
                  <AlertTriangle className="w-4 h-4 text-[#ef4444] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-[#ef4444] font-medium">Generation Failed</p>
                    <p className="text-xs text-[#8888a0] mt-0.5">{error}</p>
                    <button
                      onClick={() => handleGenerate(true)}
                      className="text-xs text-[#00ffcc] mt-2 hover:underline cursor-pointer"
                    >
                      Try template-based generation instead
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Already generated notice */}
              {form.generatedProposal && !isGenerating && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#22c55e]/[0.06] border border-[#22c55e]/15">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <p className="text-xs text-[#8888a0]">
                    Proposal already generated. You can{' '}
                    <button onClick={() => setCurrentStep(4)} className="text-[#00ffcc] hover:underline cursor-pointer">preview it</button>
                    {' '}or regenerate a new version.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== STEP 4: Preview & Export ===== */}
        {currentStep === 4 && form.generatedProposal && (
          <motion.div key="step4" {...slideInRight}>
            <div className="flex gap-6">
              {/* Left: Table of Contents (sticky) */}
              <div className="hidden lg:block w-64 shrink-0">
                <div className="sticky top-24">
                  <GlassCard>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">Contents</p>
                      {form.generatedProposal.sections.map((section, i) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 flex items-center gap-2 cursor-pointer',
                            activeSection === section.id
                              ? 'bg-[#00ffcc]/10 text-[#00ffcc] border-l-2 border-[#00ffcc]'
                              : 'text-[#8888a0] hover:bg-white/[0.03] hover:text-[#f0f0f5]',
                          )}
                        >
                          <span className="text-[10px] font-mono text-[#555566] w-4">{i + 1}.</span>
                          <span className="truncate">{section.title}</span>
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              </div>

              {/* Right: Proposal Content */}
              <div className="flex-1 min-w-0" ref={previewRef}>
                {/* Cover Section */}
                <GlassCard variant="elevated" className="mb-6">
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Sun className="w-8 h-8 text-[#00ffcc]" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9] bg-clip-text text-transparent">
                          Solaris Panama
                        </span>
                      </div>
                      <h1 className="text-xl font-bold text-[#f0f0f5] mb-2">
                        {form.language === 'en' ? 'Solar Energy Proposal' : 'Propuesta de Energia Solar'}
                      </h1>
                      <p className="text-base text-[#8888a0]">{form.clientName}</p>
                      <p className="text-xs text-[#555566] mt-2">
                        {new Date().toLocaleDateString(form.language === 'en' ? 'en-US' : 'es-PA', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                      {form.contactName && (
                        <p className="text-xs text-[#555566] mt-1">
                          {form.language === 'en' ? 'Prepared for' : 'Preparado para'}: {form.contactName}
                        </p>
                      )}
                    </motion.div>
                  </div>
                </GlassCard>

                {/* Proposal Sections */}
                {form.generatedProposal.sections.map((section, i) => (
                  <motion.div
                    key={section.id}
                    ref={(el) => { sectionRefs.current[section.id] = el; }}
                    data-section-id={section.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                    className="mb-4"
                  >
                    <GlassCard>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs font-mono text-[#00ffcc]/60 bg-[#00ffcc]/[0.08] rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <h2 className="text-lg font-bold bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9] bg-clip-text text-transparent">
                          {section.title}
                        </h2>
                      </div>
                      <div
                        className={cn('prose-sm', isEditing && 'outline outline-1 outline-[#00ffcc]/20 rounded-lg p-3 -m-1')}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(renderMarkdown(section.content)),
                        }}
                      />
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Sticky Action Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="sticky bottom-0 mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/[0.06] z-10"
            >
              <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={() => {
                      updateForm('generatedProposal', null);
                      setCurrentStep(3);
                    }}
                  >
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => setIsEditing(!isEditing)}
                    className={isEditing ? 'text-[#00ffcc] border-[#00ffcc]/20 bg-[#00ffcc]/10' : ''}
                  >
                    {isEditing ? 'Done Editing' : 'Edit'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="accent"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    disabled
                  >
                    Download PDF
                    <span className="text-[10px] opacity-60 ml-1">(Coming Soon)</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<FileText className="w-3.5 h-3.5" />}
                    onClick={handleSaveDraft}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send className="w-3.5 h-3.5" />}
                    disabled
                  >
                    Send to Client
                    <span className="text-[10px] opacity-60 ml-1">(Coming Soon)</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Navigation Buttons (steps 1-3) ===== */}
      {currentStep < 4 && (
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]"
        >
          <Button
            variant="ghost"
            icon={<ChevronLeft className="w-4 h-4" />}
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            Back
          </Button>

          <div className="flex items-center gap-1.5 text-xs text-[#555566]">
            <span>Step {currentStep} of 4</span>
          </div>

          {currentStep < 3 ? (
            <Button
              variant="primary"
              iconRight={<ChevronRight className="w-4 h-4" />}
              onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
              disabled={!canProceed}
            >
              Next
            </Button>
          ) : currentStep === 3 && form.generatedProposal ? (
            <Button
              variant="primary"
              iconRight={<Eye className="w-4 h-4" />}
              onClick={() => setCurrentStep(4)}
            >
              View Proposal
            </Button>
          ) : (
            <div />
          )}
        </motion.div>
      )}

      {/* ===== Back to Step 3 from Step 4 ===== */}
      {currentStep === 4 && (
        <div className="mt-4 flex justify-start">
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronLeft className="w-4 h-4" />}
            onClick={() => setCurrentStep(3)}
          >
            Back to Generator
          </Button>
        </div>
      )}
    </motion.div>
  );
}
