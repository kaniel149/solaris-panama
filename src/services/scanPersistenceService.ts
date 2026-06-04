import type { RoofScanResult } from '@/services/roofScannerService'
import type { EnrichedOwnerResult } from '@/types/enrichment'

export interface SavedScan { id: string; shareToken: string }

function sessionId(): string {
  const k = 'solaris-scan-session'
  let v = localStorage.getItem(k)
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v) }
  return v
}

export async function persistScan(
  scan: RoofScanResult, owner: EnrichedOwnerResult | null, financials: unknown,
): Promise<SavedScan | null> {
  try {
    const res = await fetch('/api/scans/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...scan, fincaNumber: owner?.cadastre?.fincaNumber ?? null,
        owner, financials, sessionId: sessionId() }),
    })
    if (!res.ok) return null
    const j = await res.json()
    return { id: j.id, shareToken: j.share_token }
  } catch { return null }
}
