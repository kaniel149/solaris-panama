// ===== PANAMA DEFAULTS =====
export const PANAMA_DEFAULTS = {
  electricityRate: 0.195,        // $/kWh commercial
  rateEscalation: 0.03,         // 3%/year
  netMeteringCap: 0.25,         // 25% credit cap
  maxNetMeteringKw: 500,        // kW max
  peakSunHours: 4.5,            // hours/day average
  annualIrradiance: 1650,       // kWh/m2/year
  performanceRatio: 0.80,       // 80%
  degradationRate: 0.005,       // 0.5%/year
  systemLifetime: 25,           // years
  costPerWp: 0.95,              // $/Wp installed
  panelWattage: 580,            // W per panel
  panelEfficiency: 0.224,       // 22.4%
  panelAreaM2: 2.58,            // m2 per panel (580W LONGi)
  inverterEfficiency: 0.98,
  omCostPerKwpYear: 15,         // $/kWp/year O&M
  inverterReplacementYear: 12,
  inverterReplacementCostPerWp: 0.10,
  discountRate: 0.08,           // 8%
  selfConsumptionRatio: 0.70,   // 70% for commercial
  gridEmissionFactor: 0.537,    // tCO2/MWh Panama grid
  treesPerTonCO2: 45.36,
  carsPerTonCO2Annual: 4.6,
  importTaxExemption: true,     // Ley 417
  vatExemption: true,           // Ley 417
  latitude: 8.9824,             // Panama City
  longitude: -79.5199,
};

// ===== INTERFACES =====
export interface CalculatorInputs {
  monthlyBill: number;
  monthlyConsumptionKwh?: number;
  electricityRate?: number;
  rateEscalation?: number;
  systemSizeKwp?: number;
  costPerWp?: number;
  panelWattage?: number;
  latitude?: number;
  longitude?: number;
  peakSunHours?: number;
  discountRate?: number;
  selfConsumptionRatio?: number;
  financingType?: 'cash' | 'loan' | 'lease' | 'ppa';
  loanAmountPct?: number;
  loanInterestRate?: number;
  loanTermYears?: number;
}

export interface CalculatorResults {
  systemSizeKwp: number;
  panelCount: number;
  requiredRoofAreaM2: number;
  totalSystemCost: number;
  year1ProductionKwh: number;
  monthlyProductionKwh: number[];
  annualProductionByYear: number[];
  capacityFactor: number;
  simplePaybackYears: number;
  npv25Year: number;
  irr: number;
  lcoe: number;
  roi25Year: number;
  year1Savings: number;
  monthlySavings: number;
  lifetimeSavings25Year: number;
  annualSavingsByYear: number[];
  annualCashFlow: number[];
  cumulativeCashFlow: number[];
  selfConsumedKwh: number;
  exportedKwh: number;
  creditedKwh: number;
  lostKwh: number;
  annualCO2OffsetTons: number;
  lifetimeCO2OffsetTons: number;
  equivalentTreesPlanted: number;
  equivalentCarsRemoved: number;
  monthlyLoanPayment?: number;
  totalInterestPaid?: number;
  netSavingsAfterLoan?: number;
}

export interface QuickEstimateResult {
  systemSizeKwp: number;
  panelCount: number;
  annualSavingsUsd: number;
  paybackYears: number;
  monthlySavingsUsd: number;
  co2OffsetTons: number;
  totalInvestment: number;
}

// Panama monthly solar irradiance fractions (dry season Dec-Apr is peak)
const MONTHLY_SOLAR_FRACTIONS = [
  0.092, // Jan
  0.090, // Feb
  0.098, // Mar
  0.085, // Apr
  0.075, // May
  0.070, // Jun
  0.072, // Jul
  0.070, // Aug
  0.068, // Sep
  0.070, // Oct
  0.075, // Nov
  0.085, // Dec (normalized total ~0.95, remaining spread)
];

// Normalize fractions to sum to 1.0
const FRACTION_SUM = MONTHLY_SOLAR_FRACTIONS.reduce((s, f) => s + f, 0);
const NORMALIZED_MONTHLY_FRACTIONS = MONTHLY_SOLAR_FRACTIONS.map(f => f / FRACTION_SUM);

// Business type peak sun hour adjustments
const BUSINESS_SUN_MULTIPLIERS: Record<string, number> = {
  Supermarket: 1.0,
  Hotel: 0.95,
  Warehouse: 1.05,
  Office: 0.98,
  Factory: 1.02,
  Other: 1.0,
};

// City peak sun hours
const CITY_SUN_HOURS: Record<string, number> = {
  'Panama City': 4.5,
  'Colón': 4.2,
  'David': 4.8,
  'Santiago': 4.6,
  'Chitré': 4.7,
};

// ===== CORE FUNCTIONS =====

/** Calculate optimal system size from consumption */
export function calculateSystemSize(inputs: CalculatorInputs): {
  kwp: number;
  panelCount: number;
  roofAreaM2: number;
} {
  const rate = inputs.electricityRate ?? PANAMA_DEFAULTS.electricityRate;
  const psh = inputs.peakSunHours ?? PANAMA_DEFAULTS.peakSunHours;
  const pr = PANAMA_DEFAULTS.performanceRatio;
  const panelW = inputs.panelWattage ?? PANAMA_DEFAULTS.panelWattage;

  const monthlyKwh = inputs.monthlyConsumptionKwh ?? (inputs.monthlyBill / rate);
  const annualKwh = monthlyKwh * 12;

  // Size system to cover self-consumed portion + net metering credit potential
  // Optimal: size so total production * selfConsumption ≈ annual consumption
  // But also consider net metering: exported kWh only credited at 25% cap
  let optimalKwp = annualKwh / (psh * 365 * pr);

  // Cap at net metering max (500 kW)
  optimalKwp = Math.min(optimalKwp, PANAMA_DEFAULTS.maxNetMeteringKw);

  // If explicit system size provided, use it
  if (inputs.systemSizeKwp !== undefined && inputs.systemSizeKwp > 0) {
    optimalKwp = inputs.systemSizeKwp;
  }

  const panelCount = Math.ceil((optimalKwp * 1000) / panelW);
  // Actual kWp from panel count
  const actualKwp = (panelCount * panelW) / 1000;
  const roofAreaM2 = panelCount * PANAMA_DEFAULTS.panelAreaM2 * 1.3; // 1.3 spacing factor

  return { kwp: actualKwp, panelCount, roofAreaM2 };
}

/** Calculate year-by-year production with degradation */
export function calculateProduction(
  systemKwp: number,
  peakSunHours: number,
  performanceRatio: number
): number[] {
  const years: number[] = [];
  const baseAnnualKwh = systemKwp * peakSunHours * 365 * performanceRatio;

  for (let year = 0; year < PANAMA_DEFAULTS.systemLifetime; year++) {
    const degradationFactor = Math.pow(1 - PANAMA_DEFAULTS.degradationRate, year);
    years.push(baseAnnualKwh * degradationFactor);
  }

  return years;
}

/** Calculate monthly production profile */
export function calculateMonthlyProduction(yearlyKwh: number): number[] {
  return NORMALIZED_MONTHLY_FRACTIONS.map(fraction => yearlyKwh * fraction);
}

/** Calculate net metering breakdown */
function calculateNetMetering(
  annualProductionKwh: number,
  annualConsumptionKwh: number,
  selfConsumptionRatio: number
): {
  selfConsumedKwh: number;
  exportedKwh: number;
  creditedKwh: number;
  lostKwh: number;
} {
  const selfConsumedKwh = Math.min(
    annualProductionKwh * selfConsumptionRatio,
    annualConsumptionKwh
  );
  const exportedKwh = annualProductionKwh - selfConsumedKwh;

  // Panama net metering: only 25% of exported energy gets credited
  const creditedKwh = exportedKwh * PANAMA_DEFAULTS.netMeteringCap;
  const lostKwh = exportedKwh - creditedKwh;

  return { selfConsumedKwh, exportedKwh, creditedKwh, lostKwh };
}

/** Calculate loan monthly payment (standard amortization) */
function calculateLoanPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;

  if (monthlyRate === 0) return principal / numPayments;

  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/** Calculate NPV */
function calculateNPV(
  cashFlows: number[],
  discountRate: number,
  initialInvestment: number
): number {
  let npv = -initialInvestment;
  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + discountRate, i + 1);
  }
  return npv;
}

/** Calculate IRR using bisection method */
function calculateIRR(
  cashFlows: number[],
  initialInvestment: number
): number {
  let low = -0.5;
  let high = 2.0;
  const tolerance = 0.0001;
  const maxIterations = 200;

  // Check if IRR exists (total cash flow must exceed investment)
  const totalCashFlow = cashFlows.reduce((s, cf) => s + cf, 0);
  if (totalCashFlow <= initialInvestment) return 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    const mid = (low + high) / 2;
    const npv = calculateNPV(cashFlows, mid, initialInvestment);

    if (Math.abs(npv) < tolerance) return mid;

    if (npv > 0) {
      low = mid;
    } else {
      high = mid;
    }

    if (high - low < tolerance / 100) break;
  }

  return (low + high) / 2;
}

/** Calculate LCOE (Levelized Cost of Energy) */
function calculateLCOE(
  totalSystemCost: number,
  annualOMCost: number,
  inverterReplacementCost: number,
  annualProductionByYear: number[],
  discountRate: number
): number {
  let totalDiscountedCost = totalSystemCost;
  let totalDiscountedProduction = 0;

  for (let year = 0; year < annualProductionByYear.length; year++) {
    const discountFactor = Math.pow(1 + discountRate, year + 1);

    // O&M cost
    totalDiscountedCost += annualOMCost / discountFactor;

    // Inverter replacement in year 12
    if (year + 1 === PANAMA_DEFAULTS.inverterReplacementYear) {
      totalDiscountedCost += inverterReplacementCost / discountFactor;
    }

    totalDiscountedProduction += annualProductionByYear[year] / discountFactor;
  }

  return totalDiscountedProduction > 0 ? totalDiscountedCost / totalDiscountedProduction : 0;
}

/** Calculate all financial metrics - MAIN FUNCTION */
export function calculateFinancials(inputs: CalculatorInputs): CalculatorResults {
  // 1. Merge inputs with defaults
  const rate = inputs.electricityRate ?? PANAMA_DEFAULTS.electricityRate;
  const rateEsc = inputs.rateEscalation ?? PANAMA_DEFAULTS.rateEscalation;
  const psh = inputs.peakSunHours ?? PANAMA_DEFAULTS.peakSunHours;
  const pr = PANAMA_DEFAULTS.performanceRatio;
  const costPerWp = inputs.costPerWp ?? PANAMA_DEFAULTS.costPerWp;
  const discountRate = inputs.discountRate ?? PANAMA_DEFAULTS.discountRate;
  const selfConsumptionRatio = inputs.selfConsumptionRatio ?? PANAMA_DEFAULTS.selfConsumptionRatio;
  const lifetime = PANAMA_DEFAULTS.systemLifetime;

  // 2. Calculate system size
  const sizeResult = calculateSystemSize(inputs);
  const systemKwp = sizeResult.kwp;
  const panelCount = sizeResult.panelCount;
  const roofAreaM2 = sizeResult.roofAreaM2;

  // Total system cost
  const totalSystemCost = systemKwp * 1000 * costPerWp;

  // Monthly consumption
  const monthlyConsumptionKwh = inputs.monthlyConsumptionKwh ?? (inputs.monthlyBill / rate);
  const annualConsumptionKwh = monthlyConsumptionKwh * 12;

  // 3. Calculate production
  const annualProductionByYear = calculateProduction(systemKwp, psh, pr);
  const year1ProductionKwh = annualProductionByYear[0];
  const monthlyProductionKwh = calculateMonthlyProduction(year1ProductionKwh);

  // Capacity factor
  const capacityFactor = year1ProductionKwh / (systemKwp * 8760);

  // 4. Net metering for year 1
  const nm = calculateNetMetering(year1ProductionKwh, annualConsumptionKwh, selfConsumptionRatio);

  // 5. O&M and inverter replacement
  const annualOMCost = systemKwp * PANAMA_DEFAULTS.omCostPerKwpYear;
  const inverterReplacementCost = systemKwp * 1000 * PANAMA_DEFAULTS.inverterReplacementCostPerWp;

  // 6. Year-by-year savings and cash flows
  const annualSavingsByYear: number[] = [];
  const annualCashFlow: number[] = [];
  const cumulativeCashFlow: number[] = [];

  let cumulativeCF = -totalSystemCost;
  let paybackYear = -1;

  for (let year = 0; year < lifetime; year++) {
    const productionKwh = annualProductionByYear[year];
    const currentRate = rate * Math.pow(1 + rateEsc, year);

    // Self-consumed savings (full retail rate)
    const selfConsumedKwh = Math.min(
      productionKwh * selfConsumptionRatio,
      annualConsumptionKwh
    );
    const exportedKwh = productionKwh - selfConsumedKwh;
    const creditedKwh = exportedKwh * PANAMA_DEFAULTS.netMeteringCap;

    // Total savings = self-consumed value + credited value
    const yearSavings = (selfConsumedKwh + creditedKwh) * currentRate;

    // Costs for this year
    let yearCosts = annualOMCost;
    if (year + 1 === PANAMA_DEFAULTS.inverterReplacementYear) {
      yearCosts += inverterReplacementCost;
    }

    const netCashFlow = yearSavings - yearCosts;

    annualSavingsByYear.push(yearSavings);
    annualCashFlow.push(netCashFlow);

    cumulativeCF += netCashFlow;
    cumulativeCashFlow.push(cumulativeCF);

    // Track payback year (first year cumulative becomes positive)
    if (paybackYear < 0 && cumulativeCF >= 0) {
      // Linear interpolation for more precise payback
      const prevCF = year === 0 ? -totalSystemCost : cumulativeCashFlow[year - 1];
      const fraction = -prevCF / netCashFlow;
      paybackYear = year + fraction;
    }
  }

  // If never paid back
  const simplePaybackYears = paybackYear >= 0 ? paybackYear : lifetime + 1;

  // 7. Financial metrics
  const npv25Year = calculateNPV(annualCashFlow, discountRate, totalSystemCost);
  const irr = calculateIRR(annualCashFlow, totalSystemCost);
  const lcoe = calculateLCOE(
    totalSystemCost,
    annualOMCost,
    inverterReplacementCost,
    annualProductionByYear,
    discountRate
  );

  const lifetimeSavings25Year = annualSavingsByYear.reduce((s, v) => s + v, 0);
  const roi25Year = ((lifetimeSavings25Year - totalSystemCost) / totalSystemCost) * 100;

  const year1Savings = annualSavingsByYear[0];
  const monthlySavings = year1Savings / 12;

  // 8. Environmental impact
  const annualCO2OffsetTons = (year1ProductionKwh / 1000) * PANAMA_DEFAULTS.gridEmissionFactor;
  const totalProductionKwh = annualProductionByYear.reduce((s, v) => s + v, 0);
  const lifetimeCO2OffsetTons = (totalProductionKwh / 1000) * PANAMA_DEFAULTS.gridEmissionFactor;
  const equivalentTreesPlanted = lifetimeCO2OffsetTons * PANAMA_DEFAULTS.treesPerTonCO2;
  const equivalentCarsRemoved = annualCO2OffsetTons * PANAMA_DEFAULTS.carsPerTonCO2Annual;

  // 9. Loan calculation (if applicable)
  let monthlyLoanPayment: number | undefined;
  let totalInterestPaid: number | undefined;
  let netSavingsAfterLoan: number | undefined;

  if (inputs.financingType === 'loan') {
    const loanPct = inputs.loanAmountPct ?? 0.80;
    const loanRate = inputs.loanInterestRate ?? 0.07;
    const loanTerm = inputs.loanTermYears ?? 7;

    const loanAmount = totalSystemCost * loanPct;
    monthlyLoanPayment = calculateLoanPayment(loanAmount, loanRate, loanTerm);
    const totalLoanPayments = monthlyLoanPayment * loanTerm * 12;
    totalInterestPaid = totalLoanPayments - loanAmount;

    // Net savings during loan: annual savings - annual loan payments
    const annualLoanPayment = monthlyLoanPayment * 12;
    netSavingsAfterLoan = year1Savings - annualLoanPayment;
  }

  return {
    systemSizeKwp: systemKwp,
    panelCount,
    requiredRoofAreaM2: roofAreaM2,
    totalSystemCost,
    year1ProductionKwh,
    monthlyProductionKwh,
    annualProductionByYear,
    capacityFactor,
    simplePaybackYears,
    npv25Year,
    irr,
    lcoe,
    roi25Year,
    year1Savings,
    monthlySavings,
    lifetimeSavings25Year,
    annualSavingsByYear,
    annualCashFlow,
    cumulativeCashFlow,
    selfConsumedKwh: nm.selfConsumedKwh,
    exportedKwh: nm.exportedKwh,
    creditedKwh: nm.creditedKwh,
    lostKwh: nm.lostKwh,
    annualCO2OffsetTons,
    lifetimeCO2OffsetTons,
    equivalentTreesPlanted,
    equivalentCarsRemoved,
    monthlyLoanPayment,
    totalInterestPaid,
    netSavingsAfterLoan,
  };
}

/** Quick estimate for embeddable calculator */
export function quickEstimate(
  monthlyBill: number,
  businessType: string,
  city: string
): QuickEstimateResult {
  const basePSH = CITY_SUN_HOURS[city] ?? 4.5;
  const sunMultiplier = BUSINESS_SUN_MULTIPLIERS[businessType] ?? 1.0;
  const psh = basePSH * sunMultiplier;

  const rate = PANAMA_DEFAULTS.electricityRate;
  const pr = PANAMA_DEFAULTS.performanceRatio;
  const costPerWp = PANAMA_DEFAULTS.costPerWp;
  const selfConsumption = PANAMA_DEFAULTS.selfConsumptionRatio;
  const panelW = PANAMA_DEFAULTS.panelWattage;

  const monthlyKwh = monthlyBill / rate;
  const annualKwh = monthlyKwh * 12;

  // Size system to match consumption
  let systemKwp = annualKwh / (psh * 365 * pr);
  systemKwp = Math.min(systemKwp, PANAMA_DEFAULTS.maxNetMeteringKw);

  const panelCount = Math.ceil((systemKwp * 1000) / panelW);
  const actualKwp = (panelCount * panelW) / 1000;

  const totalInvestment = actualKwp * 1000 * costPerWp;
  const year1Production = actualKwp * psh * 365 * pr;

  // Savings: self-consumed at full rate + exported credited at 25%
  const selfConsumedKwh = Math.min(year1Production * selfConsumption, annualKwh);
  const exportedKwh = year1Production - selfConsumedKwh;
  const creditedKwh = exportedKwh * PANAMA_DEFAULTS.netMeteringCap;
  const annualSavingsUsd = (selfConsumedKwh + creditedKwh) * rate;

  const paybackYears = totalInvestment / annualSavingsUsd;
  const monthlySavingsUsd = annualSavingsUsd / 12;
  const co2OffsetTons = (year1Production / 1000) * PANAMA_DEFAULTS.gridEmissionFactor;

  return {
    systemSizeKwp: actualKwp,
    panelCount,
    annualSavingsUsd,
    paybackYears,
    monthlySavingsUsd,
    co2OffsetTons,
    totalInvestment,
  };
}
