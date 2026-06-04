import { describe, it, expect } from 'vitest'
import { buildProposalOptions } from '@/services/proposalOptions'
describe('buildProposalOptions', () => {
  const opts = buildProposalOptions({ systemSizeKwp: 10, pshAvg: 4.5 })
  it('returns EPC, PPA, EPC+Battery', () => {
    expect(opts.map(o => o.id)).toEqual(['epc', 'ppa', 'epc_battery'])
  })
  it('battery option uses higher self-consumption → higher annual savings than EPC', () => {
    const epc = opts.find(o => o.id === 'epc')!
    const bat = opts.find(o => o.id === 'epc_battery')!
    expect(bat.annual_savings_usd).toBeGreaterThan(epc.annual_savings_usd)
  })
  it('PPA has zero upfront', () => {
    expect(opts.find(o => o.id === 'ppa')!.upfront_usd).toBe(0)
  })
})
