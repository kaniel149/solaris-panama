import { describe, it, expect } from 'vitest'
import { isInAzueroRegion, isStaleLead, AZUERO_ZONES, matchesEntryTime, matchesBillBucket } from '@/services/leadService'

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

  it('flags a "visit_scheduled" lead idle more than 7 days', () => {
    expect(isStaleLead({ status: 'visit_scheduled', created_at: daysAgo(30), updated_at: daysAgo(8) })).toBe(true)
    expect(isStaleLead({ status: 'visit_scheduled', created_at: daysAgo(30), updated_at: daysAgo(3) })).toBe(false)
  })

  it('flags a "proposal_sent" lead idle more than 10 days', () => {
    expect(isStaleLead({ status: 'proposal_sent', created_at: daysAgo(30), updated_at: daysAgo(11) })).toBe(true)
    expect(isStaleLead({ status: 'proposal_sent', created_at: daysAgo(30), updated_at: daysAgo(4) })).toBe(false)
  })

  it('never flags terminal / off-funnel statuses (the stale set is new/contacted/visit_scheduled/proposal_sent only)', () => {
    for (const status of ['signed', 'paid', 'lost', 'vendor', 'partner', 'not_a_lead'] as const) {
      expect(isStaleLead({ status, created_at: daysAgo(90), updated_at: daysAgo(90) })).toBe(false)
    }
  })
})

describe('matchesEntryTime', () => {
  const NOW = Date.parse('2026-07-14T12:00:00.000Z')
  const ago = (ms: number) => new Date(NOW - ms).toISOString()
  const H = 60 * 60 * 1000
  const D = 24 * H

  it('"" (all time) matches everything', () => {
    expect(matchesEntryTime(ago(100 * D), '', NOW)).toBe(true)
  })

  it('"day" matches only the last 24h', () => {
    expect(matchesEntryTime(ago(2 * H), 'day', NOW)).toBe(true)
    expect(matchesEntryTime(ago(25 * H), 'day', NOW)).toBe(false)
  })

  it('"week" matches only the last 7 days', () => {
    expect(matchesEntryTime(ago(6 * D), 'week', NOW)).toBe(true)
    expect(matchesEntryTime(ago(8 * D), 'week', NOW)).toBe(false)
  })

  it('"old" matches only leads older than 2 weeks', () => {
    expect(matchesEntryTime(ago(15 * D), 'old', NOW)).toBe(true)
    expect(matchesEntryTime(ago(10 * D), 'old', NOW)).toBe(false)
  })
})

describe('matchesBillBucket', () => {
  it('"" matches any value including null', () => {
    expect(matchesBillBucket(50, '')).toBe(true)
    expect(matchesBillBucket(null, '')).toBe(true)
  })

  it('exact buckets match the LP option values (numbers or strings)', () => {
    expect(matchesBillBucket(50, '50')).toBe(true)
    expect(matchesBillBucket('50', '50')).toBe(true)
    expect(matchesBillBucket(150, '150')).toBe(true)
    expect(matchesBillBucket(150, '50')).toBe(false)
  })

  it('"250-300" is an inclusive range', () => {
    expect(matchesBillBucket(250, '250-300')).toBe(true)
    expect(matchesBillBucket(300, '250-300')).toBe(true)
    expect(matchesBillBucket(301, '250-300')).toBe(false)
    expect(matchesBillBucket(249, '250-300')).toBe(false)
  })

  it('"500+" matches 500 and above', () => {
    expect(matchesBillBucket(500, '500+')).toBe(true)
    expect(matchesBillBucket(900, '500+')).toBe(true)
    expect(matchesBillBucket(499, '500+')).toBe(false)
  })

  it('"none" matches only missing values', () => {
    expect(matchesBillBucket(null, 'none')).toBe(true)
    expect(matchesBillBucket(undefined, 'none')).toBe(true)
    expect(matchesBillBucket('', 'none')).toBe(true)
    expect(matchesBillBucket(50, 'none')).toBe(false)
  })

  it('a value bucket excludes leads with no bill', () => {
    expect(matchesBillBucket(null, '50')).toBe(false)
  })
})
