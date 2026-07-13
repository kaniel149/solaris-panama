import { describe, it, expect } from 'vitest'
import { isInAzueroRegion, isStaleLead, AZUERO_ZONES } from '@/services/leadService'

describe('isInAzueroRegion', () => {
  it('matches every Azuero peninsula zone label (case-insensitive)', () => {
    for (const z of AZUERO_ZONES) {
      expect(isInAzueroRegion(z, null)).toBe(true)
      expect(isInAzueroRegion(z.toUpperCase(), null)).toBe(true)
    }
  })

  it('matches on the location text when zone is empty', () => {
    expect(isInAzueroRegion(null, 'Calle 5, Las Tablas, Los Santos')).toBe(true)
    expect(isInAzueroRegion(null, 'Chitré centro')).toBe(true)
  })

  it('rejects zones outside the peninsula', () => {
    expect(isInAzueroRegion('Panamá', null)).toBe(false)
    expect(isInAzueroRegion('Chiriquí', 'David')).toBe(false)
    expect(isInAzueroRegion(null, null)).toBe(false)
  })
})

describe('isStaleLead', () => {
  const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString()

  it('flags a "new" lead older than 48h', () => {
    expect(isStaleLead({ status: 'new', created_at: daysAgo(3), updated_at: daysAgo(3) })).toBe(true)
    expect(isStaleLead({ status: 'new', created_at: daysAgo(1), updated_at: daysAgo(1) })).toBe(false)
  })

  it('flags a "contacted" lead idle more than 5 days', () => {
    expect(isStaleLead({ status: 'contacted', created_at: daysAgo(20), updated_at: daysAgo(6) })).toBe(true)
    expect(isStaleLead({ status: 'contacted', created_at: daysAgo(20), updated_at: daysAgo(2) })).toBe(false)
  })

  it('never flags terminal / non-pipeline statuses', () => {
    expect(isStaleLead({ status: 'won', created_at: daysAgo(90), updated_at: daysAgo(90) })).toBe(false)
    expect(isStaleLead({ status: 'not_a_lead', created_at: daysAgo(90), updated_at: daysAgo(90) })).toBe(false)
  })
})
