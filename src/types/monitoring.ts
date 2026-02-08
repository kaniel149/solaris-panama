export type MonitoringPlatform = 'solaredge' | 'huawei' | 'sungrow' | 'enphase' | 'fronius' | 'generic';
export type MonitoringStatus = 'active' | 'offline' | 'maintenance';

export interface MonitoringApiCredentials {
  api_key?: string;
  api_secret?: string;
  username?: string;
  password?: string;
  site_id?: string;
  station_code?: string;
}

export interface MonitoringSite {
  id: string;
  project_id: string;
  platform: MonitoringPlatform;
  site_id: string;
  api_credentials: MonitoringApiCredentials | null;
  system_size_kwp: number | null;
  commissioned_at: string | null;
  last_sync: string | null;
  status: MonitoringStatus;
  created_at: string;
  updated_at: string;
}

export type MonitoringSiteInsert = Omit<MonitoringSite, 'id' | 'created_at' | 'updated_at'>;
export type MonitoringSiteUpdate = Partial<MonitoringSiteInsert>;

export interface MonitoringFilters {
  platform?: MonitoringPlatform;
  status?: MonitoringStatus;
  page?: number;
  limit?: number;
}
