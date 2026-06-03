// NASA POWER climatology irradiance — accurate per-location PSH (replaces 5-city IDW).
export interface NasaPowerData {
  annualGHI: number; monthlyGHI: number[]; annualTemp: number
  bestMonth: string; worstMonth: string
}
const MONTH_KEYS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const cache = new Map<string, NasaPowerData>()
const roundCoord = (n: number) => Math.round(n * 10) / 10
const cacheKey = (lat: number, lng: number) => `${roundCoord(lat)},${roundCoord(lng)}`

export function __clearCache() { cache.clear() }

export function __parseNasaPower(json: any): NasaPowerData {
  const ghi = json?.properties?.parameter?.ALLSKY_SFC_SW_DWN as Record<string, number> | undefined
  const t2m = json?.properties?.parameter?.T2M as Record<string, number> | undefined
  if (!ghi) throw new Error('NASA POWER: missing ALLSKY_SFC_SW_DWN')
  const monthlyGHI = MONTH_KEYS.map((k) => ghi[k] ?? 0)
  const annualGHI = ghi['ANN'] ?? monthlyGHI.reduce((a, b) => a + b, 0) / 12
  const annualTemp = t2m?.['ANN'] ?? 0
  const maxIdx = monthlyGHI.indexOf(Math.max(...monthlyGHI))
  const minIdx = monthlyGHI.indexOf(Math.min(...monthlyGHI))
  return { annualGHI, monthlyGHI, annualTemp, bestMonth: MONTH_NAMES[maxIdx], worstMonth: MONTH_NAMES[minIdx] }
}

export async function fetchSolarIrradiance(lat: number, lng: number): Promise<NasaPowerData> {
  const key = cacheKey(lat, lng)
  const hit = cache.get(key)
  if (hit) return hit
  const params = new URLSearchParams({
    parameters: 'ALLSKY_SFC_SW_DWN,T2M', community: 'RE',
    longitude: String(roundCoord(lng)), latitude: String(roundCoord(lat)),
    format: 'JSON', start: '2001', end: '2020',
  })
  const res = await fetch(`https://power.larc.nasa.gov/api/temporal/climatology/point?${params}`)
  if (!res.ok) throw new Error(`NASA POWER error: ${res.status}`)
  const parsed = __parseNasaPower(await res.json())
  cache.set(key, parsed)
  return parsed
}
