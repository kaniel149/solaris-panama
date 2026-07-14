import { describe, it, expect } from 'vitest'
import { aggregateCallCounts } from '@/services/leadEventsService'

describe('aggregateCallCounts', () => {
  it('counts calls per lead_id', () => {
    const rows = [
      { lead_id: 'a' },
      { lead_id: 'b' },
      { lead_id: 'a' },
      { lead_id: 'a' },
    ]
    expect(aggregateCallCounts(rows)).toEqual({ a: 3, b: 1 })
  })

  it('ignores rows with a null lead_id', () => {
    const rows = [{ lead_id: null }, { lead_id: 'x' }, { lead_id: null }]
    expect(aggregateCallCounts(rows)).toEqual({ x: 1 })
  })

  it('returns an empty map for no rows', () => {
    expect(aggregateCallCounts([])).toEqual({})
  })
})
