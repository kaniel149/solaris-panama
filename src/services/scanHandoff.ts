// scanHandoff — one-shot context bridge from the Roof Scanner to the full
// Proposal Generator page. The scanner already knows the building, roof area,
// owner contact and system size; this carries that forward so the rep doesn't
// re-type everything (the old buttons set window.location.hash, which is a no-op
// under BrowserRouter — they navigated nowhere and passed nothing).

const KEY = 'solaris:scanHandoff';

export interface ScanHandoff {
  clientName?: string;
  contactName?: string;
  clientEmail?: string;
  clientPhone?: string;
  sector?: string;
  buildingName?: string;
  buildingAddress?: string;
  roofAreaM2?: number;
  monthlyBill?: number;
  monthlyConsumptionKwh?: number;
  systemSizeKwp?: number;
  ts?: number;
}

/** Stash a handoff payload before navigating to the proposal editor. */
export function writeScanHandoff(payload: ScanHandoff): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...payload, ts: Date.now() }));
  } catch {
    // sessionStorage unavailable (private mode / quota) — non-fatal.
  }
}

/**
 * Read AND clear the handoff (one-shot). Returns null if none or if the payload
 * is stale (older than 5 min) so a refresh much later doesn't resurrect it.
 */
export function readScanHandoff(): ScanHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as ScanHandoff;
    if (parsed.ts && Date.now() - parsed.ts > 5 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
