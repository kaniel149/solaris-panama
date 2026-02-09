import { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface FinancingCalculatorProps {
  investment: number;
  annualSavings: number;
  paybackYears: number;
}

export function FinancingCalculator({ investment, annualSavings, paybackYears }: FinancingCalculatorProps) {
  const [mode, setMode] = useState<'cash' | 'loan'>('cash');
  const [loanPercent, setLoanPercent] = useState(80);
  const [interestRate, setInterestRate] = useState(8);
  const [termYears, setTermYears] = useState(10);

  const loanCalc = useMemo(() => {
    const loanAmount = investment * (loanPercent / 100);
    const downPayment = investment - loanAmount;
    const monthlyRate = interestRate / 100 / 12;
    const totalMonths = termYears * 12;

    // Monthly payment (PMT formula)
    const monthlyPayment = monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
      : loanAmount / totalMonths;

    const totalPayments = monthlyPayment * totalMonths;
    const totalInterest = totalPayments - loanAmount;
    const totalCostWithInterest = downPayment + totalPayments;

    // Monthly savings to cover the loan
    const monthlySavings = annualSavings / 12;
    const netMonthly = monthlySavings - monthlyPayment;

    // 25-year net savings
    const degradation = 0.005;
    const inflation = 0.03;
    let cumSavings = 0;
    for (let y = 1; y <= 25; y++) {
      cumSavings += annualSavings * Math.pow(1 - degradation, y - 1) * Math.pow(1 + inflation, y - 1);
    }
    const netSavings25yr = cumSavings - totalCostWithInterest;

    return {
      loanAmount,
      downPayment,
      monthlyPayment,
      totalInterest,
      totalCostWithInterest,
      monthlySavings,
      netMonthly,
      netSavings25yr,
    };
  }, [investment, annualSavings, loanPercent, interestRate, termYears]);

  // Cash calculations
  const cashCalc = useMemo(() => {
    const degradation = 0.005;
    const inflation = 0.03;
    let cumSavings = 0;
    for (let y = 1; y <= 25; y++) {
      cumSavings += annualSavings * Math.pow(1 - degradation, y - 1) * Math.pow(1 + inflation, y - 1);
    }
    return {
      netSavings25yr: cumSavings - investment,
      totalCost: investment,
    };
  }, [investment, annualSavings]);

  return (
    <GlassCard padding="md">
      <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-4">
        Financing Calculator
      </h3>

      {/* Toggle */}
      <div className="flex rounded-lg bg-white/[0.03] border border-white/[0.06] p-0.5 mb-5">
        <button
          onClick={() => setMode('cash')}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
            mode === 'cash'
              ? 'bg-[#00ffcc]/10 text-[#00ffcc] shadow-sm'
              : 'text-[#555570] hover:text-[#8888a0]'
          }`}
        >
          Cash Purchase
        </button>
        <button
          onClick={() => setMode('loan')}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
            mode === 'loan'
              ? 'bg-[#8b5cf6]/10 text-[#8b5cf6] shadow-sm'
              : 'text-[#555570] hover:text-[#8888a0]'
          }`}
        >
          Loan Financing
        </button>
      </div>

      {mode === 'loan' && (
        <div className="space-y-4 mb-5">
          {/* Loan Amount Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#8888a0]">Loan Amount</span>
              <span className="text-xs text-[#f0f0f5] font-medium">
                {loanPercent}% ({fmtCurrency(investment * loanPercent / 100)})
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={loanPercent}
              onChange={(e) => setLoanPercent(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#8b5cf6] bg-white/[0.06]"
            />
            <div className="flex justify-between text-[10px] text-[#555570] mt-0.5">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Interest Rate Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[#8888a0]">Interest Rate</span>
              <span className="text-xs text-[#f0f0f5] font-medium">{interestRate}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={15}
              step={0.5}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#8b5cf6] bg-white/[0.06]"
            />
            <div className="flex justify-between text-[10px] text-[#555570] mt-0.5">
              <span>5%</span>
              <span>15%</span>
            </div>
          </div>

          {/* Term Selector */}
          <div>
            <span className="text-xs text-[#8888a0] block mb-2">Loan Term</span>
            <div className="flex gap-2">
              {[5, 7, 10, 15, 20].map((term) => (
                <button
                  key={term}
                  onClick={() => setTermYears(term)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    termYears === term
                      ? 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30'
                      : 'bg-white/[0.03] text-[#555570] border-white/[0.06] hover:text-[#8888a0]'
                  }`}
                >
                  {term} yr
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cash column */}
        <div className={`p-4 rounded-xl border transition-all ${
          mode === 'cash'
            ? 'bg-[#00ffcc]/5 border-[#00ffcc]/20'
            : 'bg-white/[0.02] border-white/[0.04]'
        }`}>
          <div className="text-[11px] text-[#555570] uppercase tracking-wider mb-3">Cash Purchase</div>
          <div className="space-y-2.5">
            <div>
              <div className="text-[10px] text-[#555570]">Total Cost</div>
              <div className="text-sm text-[#f0f0f5] font-bold">{fmtCurrency(investment)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#555570]">Payback Period</div>
              <div className="text-sm text-[#f0f0f5] font-medium">{paybackYears} years</div>
            </div>
            <div>
              <div className="text-[10px] text-[#555570]">25-Year Net Savings</div>
              <div className="text-sm text-[#22c55e] font-bold">{fmtCurrency(cashCalc.netSavings25yr)}</div>
            </div>
          </div>
        </div>

        {/* Loan column */}
        <div className={`p-4 rounded-xl border transition-all ${
          mode === 'loan'
            ? 'bg-[#8b5cf6]/5 border-[#8b5cf6]/20'
            : 'bg-white/[0.02] border-white/[0.04]'
        }`}>
          <div className="text-[11px] text-[#555570] uppercase tracking-wider mb-3">Loan Financing</div>
          <div className="space-y-2.5">
            <div>
              <div className="text-[10px] text-[#555570]">Monthly Payment</div>
              <div className="text-sm text-[#f0f0f5] font-bold">{fmtCurrency(loanCalc.monthlyPayment)}/mo</div>
            </div>
            <div>
              <div className="text-[10px] text-[#555570]">Total Cost (with interest)</div>
              <div className="text-sm text-[#f0f0f5] font-medium">{fmtCurrency(loanCalc.totalCostWithInterest)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#555570]">25-Year Net Savings</div>
              <div className={`text-sm font-bold ${loanCalc.netSavings25yr >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {fmtCurrency(loanCalc.netSavings25yr)}
              </div>
            </div>
            {loanCalc.netMonthly > 0 && (
              <div>
                <div className="text-[10px] text-[#555570]">Net Monthly (Savings - Payment)</div>
                <div className="text-sm text-[#00ffcc] font-medium">{fmtCurrency(loanCalc.netMonthly)}/mo</div>
              </div>
            )}
            {loanCalc.downPayment > 0 && (
              <div>
                <div className="text-[10px] text-[#555570]">Down Payment</div>
                <div className="text-sm text-[#c0c0d0]">{fmtCurrency(loanCalc.downPayment)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
