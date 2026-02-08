export interface GoogleSolarData {
  solarPotential?: {
    maxArrayPanelsCount?: number;
    maxArrayAreaMeters2?: number;
    maxSunshineHoursPerYear?: number;
    carbonOffsetFactorKgPerMwh?: number;
    panelCapacityWatts?: number;
    panelHeightMeters?: number;
    panelWidthMeters?: number;
    panelLifetimeYears?: number;
    financialAnalyses?: Array<{
      monthlyBill?: { currencyCode: string; units: string };
      panelConfigIndex?: number;
      financialDetails?: {
        initialAcKwhPerYear?: number;
        remainingLifetimeUtilityBill?: { currencyCode: string; units: string };
        federalIncentive?: { currencyCode: string; units: string };
        costOfElectricityWithoutSolar?: { currencyCode: string; units: string };
        netMeteringAllowed?: boolean;
        solarPercentage?: number;
        percentageExportedToGrid?: number;
      };
    }>;
    solarPanelConfigs?: Array<{
      panelsCount: number;
      yearlyEnergyDcKwh: number;
      roofSegmentSummaries: Array<{
        pitchDegrees: number;
        azimuthDegrees: number;
        panelsCount: number;
        yearlyEnergyDcKwh: number;
        segmentIndex: number;
      }>;
    }>;
  };
  imageryDate?: { year: number; month: number; day: number };
  imageryQuality?: string;
}

export interface Building {
  id: string;
  client_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  roof_area_m2: number | null;
  roof_type: string | null;
  roof_azimuth: number | null;
  roof_tilt: number | null;
  monthly_consumption_kwh: number | null;
  annual_consumption_kwh: number | null;
  google_solar_data: GoogleSolarData | null;
  created_at: string;
  updated_at: string;
}

export type BuildingInsert = Omit<Building, 'id' | 'created_at' | 'updated_at'>;
export type BuildingUpdate = Partial<BuildingInsert>;
