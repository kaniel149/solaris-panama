// ===== AI PROPOSAL GENERATOR SERVICE =====
// Generates professional solar proposals using Claude API
// Falls back to template-based generation if API is unavailable

// ===== INTERFACES =====

export interface ProposalInput {
  // Client info
  clientName: string;
  contactName: string;
  clientEmail?: string;
  clientPhone?: string;
  sector: string; // commercial, industrial, hospitality, retail, etc.

  // Building info
  buildingName?: string;
  buildingAddress: string;
  roofAreaM2: number;
  usableAreaM2?: number;
  roofType?: string; // flat, tilted, metal, concrete

  // System design
  systemSizeKwp: number;
  panelCount: number;
  panelModel: string; // default: "LONGi Hi-MO X6 580W"
  inverterModel: string; // default: "Huawei SUN2000-100KTL"

  // Financial data (from solarCalculator)
  totalInvestment: number;
  annualSavings: number;
  monthlySavings: number;
  paybackYears: number;
  irr: number;
  npv: number;
  roi25Year: number;
  lcoe: number;
  year1ProductionKwh: number;
  lifetimeSavings: number;

  // Environmental
  annualCO2OffsetTons: number;
  lifetimeCO2OffsetTons: number;
  equivalentTrees: number;

  // Net metering
  selfConsumedPct: number;
  exportedPct: number;

  // Options
  language: 'en' | 'es';
  includeFinancing?: boolean;
  financingType?: 'cash' | 'loan' | 'lease' | 'ppa';
  monthlyLoanPayment?: number;

  // Optional context from roof scanner
  roofScanSource?: 'google_solar' | 'pvwatts_estimate' | 'local_panama' | 'manual';
  imageryDate?: string;
}

export interface ProposalSection {
  id: string;
  title: string;
  content: string; // Markdown content
  icon?: string;
}

export interface GeneratedProposal {
  id: string;
  generatedAt: string;
  language: 'en' | 'es';
  coverTitle: string;
  coverSubtitle: string;
  sections: ProposalSection[];
  // Metadata
  clientName: string;
  systemSizeKwp: number;
  totalInvestment: number;
  annualSavings: number;
  paybackYears: number;
}

// ===== CONSTANTS =====

export const SECTION_IDS = [
  'executive-summary',
  'building-assessment',
  'system-design',
  'energy-production',
  'financial-analysis',
  'environmental-impact',
  'legal-regulatory',
  'implementation-timeline',
] as const;

const SECTION_TITLES_EN: Record<string, string> = {
  'executive-summary': 'Executive Summary',
  'building-assessment': 'Building Assessment',
  'system-design': 'System Design',
  'energy-production': 'Energy Production',
  'financial-analysis': 'Financial Analysis',
  'environmental-impact': 'Environmental Impact',
  'legal-regulatory': 'Legal & Regulatory Framework',
  'implementation-timeline': 'Implementation Timeline',
};

const SECTION_TITLES_ES: Record<string, string> = {
  'executive-summary': 'Resumen Ejecutivo',
  'building-assessment': 'Evaluacion del Edificio',
  'system-design': 'Diseno del Sistema',
  'energy-production': 'Produccion de Energia',
  'financial-analysis': 'Analisis Financiero',
  'environmental-impact': 'Impacto Ambiental',
  'legal-regulatory': 'Marco Legal y Regulatorio',
  'implementation-timeline': 'Cronograma de Implementacion',
};

const SECTION_ICONS: Record<string, string> = {
  'executive-summary': 'sun',
  'building-assessment': 'building',
  'system-design': 'cpu',
  'energy-production': 'zap',
  'financial-analysis': 'dollar-sign',
  'environmental-impact': 'leaf',
  'legal-regulatory': 'shield',
  'implementation-timeline': 'calendar',
};

// ===== PROMPT BUILDER =====

export function buildPrompt(input: ProposalInput): { systemPrompt: string; userPrompt: string } {
  const lang = input.language === 'es' ? 'Spanish' : 'English';
  const usableArea = input.usableAreaM2 ?? Math.round(input.roofAreaM2 * 0.75);

  const systemPrompt = `You are a senior solar energy consultant at Solaris Panama, a leading commercial rooftop solar company in Panama City. You write professional, persuasive, and technically accurate solar energy proposals.

Your proposals are tailored to the client's industry, building type, and financial situation. You always reference Panama's specific legal framework:

- Ley 417 (December 2023): Provides 0% import duty (arancel) and 0% ITBMS/VAT on all solar photovoltaic equipment, including panels, inverters, mounting structures, cables, and monitoring systems. This significantly reduces project costs compared to pre-2023 pricing.
- Ley 37 (June 2013): Establishes the net metering (medicion neta) framework. Distributed generators up to 500 kW can connect to the grid. Excess energy exported is credited at a 25% cap, settled semi-annually with the distribution company (ENSA or Naturgy).
- Ley 38 (June 2016): Establishes incentives for renewable energy in Panama, including tax deductions for solar investments.
- ASEP (Autoridad Nacional de los Servicios Publicos): Requires an interconnection permit for grid-tied systems. Process takes 2-4 weeks after application.
- Municipal permits: Construction permits may be required depending on the municipality and structural modifications.
- Environmental compliance: Systems larger than 500 kW may require an environmental impact assessment.

You write in ${lang}. Your tone is professional, confident, and data-driven. Use specific numbers, not vague claims. Format your output as a JSON object.`;

  const financingSection = input.includeFinancing && input.financingType === 'loan' && input.monthlyLoanPayment
    ? `
Financing:
- Financing type: Bank loan
- Monthly loan payment: $${input.monthlyLoanPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Net monthly benefit during loan: $${(input.monthlySavings - input.monthlyLoanPayment).toFixed(2)}`
    : '';

  const roofScanNote = input.roofScanSource
    ? `\nRoof data source: ${input.roofScanSource === 'google_solar' ? 'Google Solar API satellite analysis' : input.roofScanSource === 'pvwatts_estimate' ? 'NREL PVWatts simulation' : input.roofScanSource === 'local_panama' ? 'Panama-calibrated local estimate' : 'Manual assessment'}${input.imageryDate ? ` (imagery date: ${input.imageryDate})` : ''}`
    : '';

  const userPrompt = `Generate a professional solar energy proposal with the following project data:

CLIENT INFORMATION:
- Company: ${input.clientName}
- Contact: ${input.contactName}
${input.clientEmail ? `- Email: ${input.clientEmail}` : ''}
${input.clientPhone ? `- Phone: ${input.clientPhone}` : ''}
- Industry sector: ${input.sector}

BUILDING INFORMATION:
${input.buildingName ? `- Building name: ${input.buildingName}` : ''}
- Address: ${input.buildingAddress}
- Total roof area: ${input.roofAreaM2.toLocaleString()} m2
- Usable roof area: ${usableArea.toLocaleString()} m2
- Roof type: ${input.roofType ?? 'Flat concrete'}${roofScanNote}

PROPOSED SYSTEM DESIGN:
- System size: ${input.systemSizeKwp} kWp
- Panel count: ${input.panelCount} panels
- Panel model: ${input.panelModel}
- Inverter model: ${input.inverterModel}

FINANCIAL PROJECTIONS:
- Total investment: $${input.totalInvestment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Annual savings: $${input.annualSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Monthly savings: $${input.monthlySavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Simple payback period: ${input.paybackYears.toFixed(1)} years
- Internal rate of return (IRR): ${(input.irr * 100).toFixed(1)}%
- Net present value (NPV): $${input.npv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- 25-year ROI: ${input.roi25Year.toFixed(1)}%
- LCOE: $${input.lcoe.toFixed(4)}/kWh
- Year 1 production: ${input.year1ProductionKwh.toLocaleString()} kWh
- 25-year lifetime savings: $${input.lifetimeSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${financingSection}

NET METERING:
- Self-consumed: ${input.selfConsumedPct}%
- Exported to grid: ${input.exportedPct}%
- Net metering credit cap: 25% of exported energy (Ley 37/2013)

ENVIRONMENTAL IMPACT:
- Annual CO2 offset: ${input.annualCO2OffsetTons.toFixed(1)} tons
- 25-year CO2 offset: ${input.lifetimeCO2OffsetTons.toFixed(1)} tons
- Equivalent trees planted: ${input.equivalentTrees.toLocaleString()}

Return your response as a JSON object with this exact structure:
{
  "coverTitle": "Proposal title for the cover page",
  "coverSubtitle": "Subtitle with system size and client name",
  "sections": [
    {
      "id": "executive-summary",
      "title": "Section title",
      "content": "Markdown content for this section"
    },
    {
      "id": "building-assessment",
      "title": "Section title",
      "content": "Markdown content"
    },
    {
      "id": "system-design",
      "title": "Section title",
      "content": "Markdown content"
    },
    {
      "id": "energy-production",
      "title": "Section title",
      "content": "Markdown content"
    },
    {
      "id": "financial-analysis",
      "title": "Section title",
      "content": "Markdown content with tables"
    },
    {
      "id": "environmental-impact",
      "title": "Section title",
      "content": "Markdown content"
    },
    {
      "id": "legal-regulatory",
      "title": "Section title",
      "content": "Markdown content referencing specific Panama laws"
    },
    {
      "id": "implementation-timeline",
      "title": "Section title",
      "content": "6-phase timeline: Design, Permits, Procurement, Installation, Testing, Commissioning"
    }
  ]
}

Make each section detailed (150-300 words). Use markdown formatting: headers, bold, bullet points, and tables where appropriate. Include specific numbers from the data provided. The financial analysis section should include a simplified 5-year cash flow projection table.`;

  return { systemPrompt, userPrompt };
}

// ===== MAIN GENERATION FUNCTION =====

export async function generateProposal(input: ProposalInput): Promise<GeneratedProposal> {
  const { systemPrompt, userPrompt } = buildPrompt(input);

  try {
    const response = await fetch('/api/generate-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt, language: input.language }),
    });

    if (!response.ok) {
      console.error('[proposal-generator] API error:', response.status);
      return generateFromTemplate(input);
    }

    const data = await response.json();
    const content = data.content || '';

    // Parse the JSON response from Claude
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[proposal-generator] Could not parse JSON from AI response');
      return generateFromTemplate(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      id: proposalId,
      generatedAt: new Date().toISOString(),
      language: input.language,
      coverTitle: parsed.coverTitle || getDefaultCoverTitle(input),
      coverSubtitle: parsed.coverSubtitle || getDefaultCoverSubtitle(input),
      sections: (parsed.sections || []).map((s: { id: string; title: string; content: string }) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        icon: SECTION_ICONS[s.id] || 'file',
      })),
      clientName: input.clientName,
      systemSizeKwp: input.systemSizeKwp,
      totalInvestment: input.totalInvestment,
      annualSavings: input.annualSavings,
      paybackYears: input.paybackYears,
    };
  } catch (error) {
    console.error('[proposal-generator] Generation failed, falling back to template:', error);
    return generateFromTemplate(input);
  }
}

// ===== TEMPLATE-BASED FALLBACK =====

export function generateFromTemplate(input: ProposalInput): GeneratedProposal {
  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const isSpanish = input.language === 'es';
  const titles = isSpanish ? SECTION_TITLES_ES : SECTION_TITLES_EN;
  const usableArea = input.usableAreaM2 ?? Math.round(input.roofAreaM2 * 0.75);
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const sections: ProposalSection[] = [
    {
      id: 'executive-summary',
      title: titles['executive-summary'],
      icon: SECTION_ICONS['executive-summary'],
      content: isSpanish
        ? `**Solaris Panama** se complace en presentar esta propuesta de energia solar fotovoltaica para **${input.clientName}**.

Proponemos la instalacion de un sistema de **${input.systemSizeKwp} kWp** compuesto por **${input.panelCount} paneles** ${input.panelModel} en su propiedad ubicada en ${input.buildingAddress}.

### Beneficios Principales

- **Ahorro anual estimado:** $${fmt(input.annualSavings)}
- **Periodo de recuperacion:** ${input.paybackYears.toFixed(1)} anos
- **Retorno de inversion a 25 anos:** ${input.roi25Year.toFixed(1)}%
- **Reduccion de CO2:** ${input.annualCO2OffsetTons.toFixed(1)} toneladas/ano

Gracias a la **Ley 417 (2023)**, su inversion se beneficia de **0% arancel de importacion** y **0% ITBMS** en todos los equipos solares, reduciendo significativamente el costo total del proyecto.

La inversion total de **$${fmt(input.totalInvestment)}** se recupera en aproximadamente **${input.paybackYears.toFixed(1)} anos**, generando ahorros acumulados de **$${fmt(input.lifetimeSavings)}** durante la vida util de 25 anos del sistema.`
        : `**Solaris Panama** is pleased to present this solar photovoltaic energy proposal for **${input.clientName}**.

We propose the installation of a **${input.systemSizeKwp} kWp** system consisting of **${input.panelCount}** ${input.panelModel} panels at your property located at ${input.buildingAddress}.

### Key Benefits

- **Estimated annual savings:** $${fmt(input.annualSavings)}
- **Payback period:** ${input.paybackYears.toFixed(1)} years
- **25-year ROI:** ${input.roi25Year.toFixed(1)}%
- **CO2 reduction:** ${input.annualCO2OffsetTons.toFixed(1)} tons/year

Thanks to **Ley 417 (2023)**, your investment benefits from **0% import duty** and **0% ITBMS/VAT** on all solar equipment, significantly reducing total project costs.

The total investment of **$${fmt(input.totalInvestment)}** is recovered in approximately **${input.paybackYears.toFixed(1)} years**, generating cumulative savings of **$${fmt(input.lifetimeSavings)}** over the 25-year system lifetime.`,
    },
    {
      id: 'building-assessment',
      title: titles['building-assessment'],
      icon: SECTION_ICONS['building-assessment'],
      content: isSpanish
        ? `### Ubicacion y Caracteristicas

| Parametro | Valor |
|-----------|-------|
| Direccion | ${input.buildingAddress} |
| Sector | ${input.sector} |
| Area total del techo | ${input.roofAreaM2.toLocaleString()} m2 |
| Area utilizable | ${usableArea.toLocaleString()} m2 |
| Tipo de techo | ${input.roofType ?? 'Concreto plano'} |
${input.roofScanSource ? `| Fuente de datos | ${input.roofScanSource === 'google_solar' ? 'Google Solar API' : input.roofScanSource === 'pvwatts_estimate' ? 'NREL PVWatts' : input.roofScanSource === 'local_panama' ? 'Estimacion local calibrada' : 'Evaluacion manual'} |` : ''}

### Evaluacion de Idoneidad

El techo de su edificio presenta condiciones favorables para la instalacion solar:

- **Orientacion:** Optima para maximizar la captacion solar en la latitud de Panama (8-9°N)
- **Sombreado:** Se ha evaluado el impacto de sombras de estructuras cercanas
- **Integridad estructural:** Se recomienda una evaluacion estructural detallada antes de la instalacion
- **Acceso:** Se ha verificado el acceso adecuado para instalacion y mantenimiento`
        : `### Location and Characteristics

| Parameter | Value |
|-----------|-------|
| Address | ${input.buildingAddress} |
| Sector | ${input.sector} |
| Total roof area | ${input.roofAreaM2.toLocaleString()} m2 |
| Usable area | ${usableArea.toLocaleString()} m2 |
| Roof type | ${input.roofType ?? 'Flat concrete'} |
${input.roofScanSource ? `| Data source | ${input.roofScanSource === 'google_solar' ? 'Google Solar API' : input.roofScanSource === 'pvwatts_estimate' ? 'NREL PVWatts' : input.roofScanSource === 'local_panama' ? 'Panama-calibrated estimate' : 'Manual assessment'} |` : ''}

### Suitability Assessment

Your building's rooftop presents favorable conditions for solar installation:

- **Orientation:** Optimal for maximizing solar capture at Panama's latitude (8-9°N)
- **Shading:** Impact from nearby structures has been evaluated
- **Structural integrity:** A detailed structural assessment is recommended prior to installation
- **Access:** Adequate access for installation and maintenance has been verified`,
    },
    {
      id: 'system-design',
      title: titles['system-design'],
      icon: SECTION_ICONS['system-design'],
      content: isSpanish
        ? `### Especificaciones Tecnicas

| Componente | Especificacion |
|-----------|----------------|
| Capacidad del sistema | ${input.systemSizeKwp} kWp |
| Paneles solares | ${input.panelCount} x ${input.panelModel} |
| Inversores | ${input.inverterModel} |
| Estructura de montaje | Aluminio anodizado, inclinacion 10° |
| Cableado | Cable solar 6mm2, proteccion UV |
| Monitoreo | Sistema de monitoreo remoto en tiempo real |

### Configuracion del Sistema

El sistema esta disenado para maximizar la generacion de energia dentro del area disponible de ${usableArea.toLocaleString()} m2. Los paneles ${input.panelModel} ofrecen una eficiencia superior del 22.4%, lo que permite generar mas energia por metro cuadrado.

El inversor ${input.inverterModel} proporciona una eficiencia de conversion del 98.6% y cuenta con monitoreo integrado a nivel de string para deteccion temprana de anomalias.

### Garantias

- **Paneles:** 25 anos de garantia de rendimiento (>84.8% en ano 25)
- **Inversor:** 10 anos de garantia (extensible a 25 anos)
- **Estructura:** 15 anos contra corrosion
- **Instalacion:** 5 anos de garantia de mano de obra`
        : `### Technical Specifications

| Component | Specification |
|-----------|---------------|
| System capacity | ${input.systemSizeKwp} kWp |
| Solar panels | ${input.panelCount} x ${input.panelModel} |
| Inverters | ${input.inverterModel} |
| Mounting structure | Anodized aluminum, 10° tilt |
| Wiring | 6mm2 solar cable, UV protected |
| Monitoring | Real-time remote monitoring system |

### System Configuration

The system is designed to maximize energy generation within the available area of ${usableArea.toLocaleString()} m2. The ${input.panelModel} panels offer a superior efficiency of 22.4%, enabling more energy generation per square meter.

The ${input.inverterModel} inverter provides 98.6% conversion efficiency and includes built-in string-level monitoring for early anomaly detection.

### Warranties

- **Panels:** 25-year performance warranty (>84.8% at year 25)
- **Inverter:** 10-year warranty (extendable to 25 years)
- **Mounting structure:** 15-year corrosion warranty
- **Installation:** 5-year workmanship warranty`,
    },
    {
      id: 'energy-production',
      title: titles['energy-production'],
      icon: SECTION_ICONS['energy-production'],
      content: isSpanish
        ? `### Produccion Estimada

| Metrica | Valor |
|---------|-------|
| Produccion ano 1 | ${input.year1ProductionKwh.toLocaleString()} kWh |
| Produccion mensual promedio | ${Math.round(input.year1ProductionKwh / 12).toLocaleString()} kWh |
| Horas solares pico | 4.5 horas/dia |
| Ratio de rendimiento | 80% |
| Degradacion anual | 0.5% |

### Distribucion de Energia

- **Autoconsumo:** ${input.selfConsumedPct}% de la energia generada se consume directamente en sus instalaciones
- **Exportacion a la red:** ${input.exportedPct}% se exporta bajo el esquema de medicion neta
- **Credito neto:** 25% de la energia exportada se acredita (Ley 37/2013)

### Perfil Estacional

Panama cuenta con dos estaciones marcadas que afectan la produccion solar:

- **Temporada seca (diciembre-abril):** Mayor irradiancia, produccion ~10-15% superior al promedio
- **Temporada lluviosa (mayo-noviembre):** Produccion ligeramente inferior, compensada por temperaturas mas moderadas

La produccion total estimada a 25 anos es de **${Math.round(input.year1ProductionKwh * 24.1).toLocaleString()} kWh**, considerando la degradacion gradual de los paneles.`
        : `### Estimated Production

| Metric | Value |
|--------|-------|
| Year 1 production | ${input.year1ProductionKwh.toLocaleString()} kWh |
| Average monthly production | ${Math.round(input.year1ProductionKwh / 12).toLocaleString()} kWh |
| Peak sun hours | 4.5 hours/day |
| Performance ratio | 80% |
| Annual degradation | 0.5% |

### Energy Distribution

- **Self-consumption:** ${input.selfConsumedPct}% of generated energy is consumed directly on-site
- **Grid export:** ${input.exportedPct}% is exported under the net metering scheme
- **Net credit:** 25% of exported energy is credited (Ley 37/2013)

### Seasonal Profile

Panama has two distinct seasons affecting solar production:

- **Dry season (December-April):** Higher irradiance, production ~10-15% above average
- **Rainy season (May-November):** Slightly lower production, offset by more moderate temperatures

Total estimated production over 25 years is **${Math.round(input.year1ProductionKwh * 24.1).toLocaleString()} kWh**, accounting for gradual panel degradation.`,
    },
    {
      id: 'financial-analysis',
      title: titles['financial-analysis'],
      icon: SECTION_ICONS['financial-analysis'],
      content: isSpanish
        ? `### Resumen de Inversion

| Metrica | Valor |
|---------|-------|
| Inversion total | $${fmt(input.totalInvestment)} |
| Ahorro anual (ano 1) | $${fmt(input.annualSavings)} |
| Ahorro mensual (ano 1) | $${fmt(input.monthlySavings)} |
| Periodo de recuperacion | ${input.paybackYears.toFixed(1)} anos |
| TIR (IRR) | ${(input.irr * 100).toFixed(1)}% |
| VAN (NPV) | $${fmt(input.npv)} |
| ROI a 25 anos | ${input.roi25Year.toFixed(1)}% |
| LCOE | $${input.lcoe.toFixed(4)}/kWh |
| Ahorro total a 25 anos | $${fmt(input.lifetimeSavings)} |
${input.includeFinancing && input.monthlyLoanPayment ? `| Pago mensual del prestamo | $${fmt(input.monthlyLoanPayment)} |` : ''}

### Proyeccion de Flujo de Caja (5 Anos)

| Ano | Ahorro | Costo O&M | Flujo Neto | Acumulado |
|-----|--------|-----------|------------|-----------|
| 1 | $${fmt(input.annualSavings)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings - input.systemSizeKwp * 15)} | $${fmt(input.annualSavings - input.systemSizeKwp * 15 - input.totalInvestment)} |
| 2 | $${fmt(input.annualSavings * 1.03)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings * 1.03 - input.systemSizeKwp * 15)} | $${fmt((input.annualSavings + input.annualSavings * 1.03) - input.systemSizeKwp * 15 * 2 - input.totalInvestment)} |
| 3 | $${fmt(input.annualSavings * 1.0609)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings * 1.0609 - input.systemSizeKwp * 15)} | $${fmt((input.annualSavings + input.annualSavings * 1.03 + input.annualSavings * 1.0609) - input.systemSizeKwp * 15 * 3 - input.totalInvestment)} |
| 4 | $${fmt(input.annualSavings * 1.0927)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings * 1.0927 - input.systemSizeKwp * 15)} | $${fmt((input.annualSavings + input.annualSavings * 1.03 + input.annualSavings * 1.0609 + input.annualSavings * 1.0927) - input.systemSizeKwp * 15 * 4 - input.totalInvestment)} |
| 5 | $${fmt(input.annualSavings * 1.1255)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings * 1.1255 - input.systemSizeKwp * 15)} | $${fmt((input.annualSavings + input.annualSavings * 1.03 + input.annualSavings * 1.0609 + input.annualSavings * 1.0927 + input.annualSavings * 1.1255) - input.systemSizeKwp * 15 * 5 - input.totalInvestment)} |

*Los ahorros anuales aumentan un 3% por ano debido a la escalada de tarifas electricas.*

### Ventajas Fiscales (Ley 417)

- **0% arancel de importacion** en paneles, inversores y equipos
- **0% ITBMS (IVA)** en todos los componentes del sistema
- Ahorro fiscal estimado: ~15-20% del costo total del proyecto`
        : `### Investment Summary

| Metric | Value |
|--------|-------|
| Total investment | $${fmt(input.totalInvestment)} |
| Annual savings (year 1) | $${fmt(input.annualSavings)} |
| Monthly savings (year 1) | $${fmt(input.monthlySavings)} |
| Payback period | ${input.paybackYears.toFixed(1)} years |
| IRR | ${(input.irr * 100).toFixed(1)}% |
| NPV | $${fmt(input.npv)} |
| 25-year ROI | ${input.roi25Year.toFixed(1)}% |
| LCOE | $${input.lcoe.toFixed(4)}/kWh |
| 25-year lifetime savings | $${fmt(input.lifetimeSavings)} |
${input.includeFinancing && input.monthlyLoanPayment ? `| Monthly loan payment | $${fmt(input.monthlyLoanPayment)} |` : ''}

### Cash Flow Projection (5 Years)

| Year | Savings | O&M Cost | Net Flow | Cumulative |
|------|---------|----------|----------|------------|
| 1 | $${fmt(input.annualSavings)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings - input.systemSizeKwp * 15)} | $${fmt(input.annualSavings - input.systemSizeKwp * 15 - input.totalInvestment)} |
| 2 | $${fmt(input.annualSavings * 1.03)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings * 1.03 - input.systemSizeKwp * 15)} | $${fmt((input.annualSavings + input.annualSavings * 1.03) - input.systemSizeKwp * 15 * 2 - input.totalInvestment)} |
| 3 | $${fmt(input.annualSavings * 1.0609)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings * 1.0609 - input.systemSizeKwp * 15)} | $${fmt((input.annualSavings + input.annualSavings * 1.03 + input.annualSavings * 1.0609) - input.systemSizeKwp * 15 * 3 - input.totalInvestment)} |
| 4 | $${fmt(input.annualSavings * 1.0927)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings * 1.0927 - input.systemSizeKwp * 15)} | $${fmt((input.annualSavings + input.annualSavings * 1.03 + input.annualSavings * 1.0609 + input.annualSavings * 1.0927) - input.systemSizeKwp * 15 * 4 - input.totalInvestment)} |
| 5 | $${fmt(input.annualSavings * 1.1255)} | $${fmt(input.systemSizeKwp * 15)} | $${fmt(input.annualSavings * 1.1255 - input.systemSizeKwp * 15)} | $${fmt((input.annualSavings + input.annualSavings * 1.03 + input.annualSavings * 1.0609 + input.annualSavings * 1.0927 + input.annualSavings * 1.1255) - input.systemSizeKwp * 15 * 5 - input.totalInvestment)} |

*Annual savings increase 3% per year due to electricity rate escalation.*

### Tax Advantages (Ley 417)

- **0% import duty** on panels, inverters, and equipment
- **0% ITBMS (VAT)** on all system components
- Estimated tax savings: ~15-20% of total project cost`,
    },
    {
      id: 'environmental-impact',
      title: titles['environmental-impact'],
      icon: SECTION_ICONS['environmental-impact'],
      content: isSpanish
        ? `### Contribucion Ambiental

Su sistema solar contribuira significativamente a la reduccion de emisiones de gases de efecto invernadero:

| Metrica | Valor |
|---------|-------|
| CO2 evitado (anual) | ${input.annualCO2OffsetTons.toFixed(1)} toneladas |
| CO2 evitado (25 anos) | ${input.lifetimeCO2OffsetTons.toFixed(1)} toneladas |
| Equivalente en arboles plantados | ${input.equivalentTrees.toLocaleString()} arboles |

### Contexto de Sostenibilidad

Panama se ha comprometido a alcanzar el 70% de su matriz energetica con fuentes renovables. Al instalar energia solar, ${input.clientName} se posiciona como lider en sostenibilidad corporativa en el sector ${input.sector}.

### Beneficios Adicionales

- **Reputacion corporativa:** Demuestre su compromiso con el medio ambiente
- **Certificaciones verdes:** Contribuye a obtener certificaciones LEED u otras
- **Responsabilidad social:** Impacto positivo en la comunidad local
- **Marketing verde:** Material para comunicaciones de sostenibilidad`
        : `### Environmental Contribution

Your solar system will contribute significantly to reducing greenhouse gas emissions:

| Metric | Value |
|--------|-------|
| Annual CO2 offset | ${input.annualCO2OffsetTons.toFixed(1)} tons |
| 25-year CO2 offset | ${input.lifetimeCO2OffsetTons.toFixed(1)} tons |
| Equivalent trees planted | ${input.equivalentTrees.toLocaleString()} trees |

### Sustainability Context

Panama has committed to reaching 70% renewable energy in its power matrix. By installing solar energy, ${input.clientName} positions itself as a sustainability leader in the ${input.sector} sector.

### Additional Benefits

- **Corporate reputation:** Demonstrate your commitment to the environment
- **Green certifications:** Contributes toward LEED or similar certifications
- **Social responsibility:** Positive impact on the local community
- **Green marketing:** Material for sustainability communications`,
    },
    {
      id: 'legal-regulatory',
      title: titles['legal-regulatory'],
      icon: SECTION_ICONS['legal-regulatory'],
      content: isSpanish
        ? `### Marco Legal de Panama para Energia Solar

#### Ley 417 (Diciembre 2023) - Incentivos Fiscales

- **0% arancel de importacion** para equipos fotovoltaicos
- **0% ITBMS (IVA)** en paneles, inversores, estructuras y cableado
- Aplicable a sistemas residenciales y comerciales
- Vigente por 10 anos desde su promulgacion

#### Ley 37 (Junio 2013) - Medicion Neta

- Permite la conexion de generadores distribuidos hasta **500 kW**
- La energia excedente se exporta a la red electrica
- **Credito del 25%** sobre la energia exportada
- Liquidacion semestral con la distribuidora (ENSA/Naturgy)
- Se requiere medidor bidireccional

#### Ley 38 (Junio 2016) - Incentivos Renovables

- Deducciones fiscales para inversiones en energia renovable
- Beneficios adicionales para empresas que instalen sistemas solares

#### Permisos Requeridos

1. **Permiso de interconexion ASEP** - Tramite ante la Autoridad Nacional de los Servicios Publicos (2-4 semanas)
2. **Permiso municipal de construccion** - Segun el municipio, puede requerirse para modificaciones estructurales
3. **Contrato de medicion neta** - Firmado con la distribuidora electrica
4. **Evaluacion ambiental** - Requerida solo para sistemas mayores a 500 kW

Solaris Panama se encarga de tramitar todos los permisos necesarios como parte del servicio integral.`
        : `### Panama Legal Framework for Solar Energy

#### Ley 417 (December 2023) - Tax Incentives

- **0% import duty** on photovoltaic equipment
- **0% ITBMS (VAT)** on panels, inverters, mounting structures, and wiring
- Applicable to residential and commercial systems
- Valid for 10 years from enactment

#### Ley 37 (June 2013) - Net Metering

- Allows distributed generators up to **500 kW** to connect to the grid
- Excess energy is exported to the electrical grid
- **25% credit** on exported energy
- Semi-annual settlement with distribution company (ENSA/Naturgy)
- Bidirectional meter required

#### Ley 38 (June 2016) - Renewable Incentives

- Tax deductions for renewable energy investments
- Additional benefits for companies installing solar systems

#### Required Permits

1. **ASEP interconnection permit** - Filed with the National Authority of Public Services (2-4 weeks)
2. **Municipal construction permit** - Depending on the municipality, may be required for structural modifications
3. **Net metering contract** - Signed with the electricity distributor
4. **Environmental assessment** - Required only for systems larger than 500 kW

Solaris Panama handles all necessary permit processing as part of our turnkey service.`,
    },
    {
      id: 'implementation-timeline',
      title: titles['implementation-timeline'],
      icon: SECTION_ICONS['implementation-timeline'],
      content: isSpanish
        ? `### Cronograma del Proyecto (${input.systemSizeKwp > 200 ? '14-18' : '8-12'} semanas)

#### Fase 1: Diseno Detallado (Semanas 1-2)
- Evaluacion estructural del techo
- Diseno electrico y mecanico detallado
- Simulacion de produccion energetica
- Planos de ingenieria finales

#### Fase 2: Permisos y Tramites (Semanas 2-4)
- Solicitud de permiso de interconexion ante ASEP
- Tramite de permiso municipal (si aplica)
- Coordinacion con la distribuidora electrica
- Preparacion de contrato de medicion neta

#### Fase 3: Adquisicion de Equipos (Semanas 3-6)
- Orden de compra de paneles ${input.panelModel}
- Orden de inversores ${input.inverterModel}
- Adquisicion de estructura de montaje y cableado
- Logistica de importacion (beneficio Ley 417: 0% arancel)

#### Fase 4: Instalacion (Semanas ${input.systemSizeKwp > 200 ? '6-12' : '5-8'})
- Instalacion de estructura de montaje
- Colocacion de ${input.panelCount} paneles solares
- Cableado DC y AC
- Instalacion de inversores y tableros electricos

#### Fase 5: Pruebas y Comisionamiento (Semana ${input.systemSizeKwp > 200 ? '13-14' : '9-10'})
- Pruebas de aislamiento y continuidad
- Verificacion de strings y polaridad
- Pruebas de rendimiento del inversor
- Configuracion del sistema de monitoreo

#### Fase 6: Puesta en Marcha (Semana ${input.systemSizeKwp > 200 ? '15-18' : '11-12'})
- Inspeccion de la distribuidora
- Conexion del medidor bidireccional
- Activacion del sistema
- Capacitacion del personal del cliente
- Entrega de documentacion y garantias

**Solaris Panama asigna un gerente de proyecto dedicado para supervisar cada fase y mantener comunicacion constante con el cliente.**`
        : `### Project Timeline (${input.systemSizeKwp > 200 ? '14-18' : '8-12'} weeks)

#### Phase 1: Detailed Design (Weeks 1-2)
- Structural roof assessment
- Detailed electrical and mechanical design
- Energy production simulation
- Final engineering drawings

#### Phase 2: Permits & Approvals (Weeks 2-4)
- ASEP interconnection permit application
- Municipal construction permit (if applicable)
- Coordination with electricity distributor
- Net metering contract preparation

#### Phase 3: Equipment Procurement (Weeks 3-6)
- Purchase order for ${input.panelModel} panels
- Order ${input.inverterModel} inverters
- Procurement of mounting structure and wiring
- Import logistics (Ley 417 benefit: 0% duty)

#### Phase 4: Installation (Weeks ${input.systemSizeKwp > 200 ? '6-12' : '5-8'})
- Mounting structure installation
- Placement of ${input.panelCount} solar panels
- DC and AC wiring
- Inverter and electrical panel installation

#### Phase 5: Testing & Commissioning (Weeks ${input.systemSizeKwp > 200 ? '13-14' : '9-10'})
- Insulation and continuity testing
- String and polarity verification
- Inverter performance testing
- Monitoring system configuration

#### Phase 6: Go-Live (Weeks ${input.systemSizeKwp > 200 ? '15-18' : '11-12'})
- Distribution company inspection
- Bidirectional meter connection
- System activation
- Client staff training
- Documentation and warranty handover

**Solaris Panama assigns a dedicated project manager to oversee each phase and maintain constant communication with the client.**`,
    },
  ];

  return {
    id: proposalId,
    generatedAt: new Date().toISOString(),
    language: input.language,
    coverTitle: getDefaultCoverTitle(input),
    coverSubtitle: getDefaultCoverSubtitle(input),
    sections,
    clientName: input.clientName,
    systemSizeKwp: input.systemSizeKwp,
    totalInvestment: input.totalInvestment,
    annualSavings: input.annualSavings,
    paybackYears: input.paybackYears,
  };
}

// ===== HELPERS =====

function getDefaultCoverTitle(input: ProposalInput): string {
  if (input.language === 'es') {
    return `Propuesta de Energia Solar Fotovoltaica`;
  }
  return `Solar Photovoltaic Energy Proposal`;
}

function getDefaultCoverSubtitle(input: ProposalInput): string {
  if (input.language === 'es') {
    return `Sistema de ${input.systemSizeKwp} kWp para ${input.clientName}`;
  }
  return `${input.systemSizeKwp} kWp System for ${input.clientName}`;
}

