import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface MonthlyProductionChartProps {
  monthlyKwh: number[];
  yearlyKwh: number;
  className?: string;
}

const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_LABELS_HE = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

const MONTH_LABELS: Record<string, string[]> = {
  en: MONTH_LABELS_EN,
  es: MONTH_LABELS_ES,
  he: MONTH_LABELS_HE,
};

export default function MonthlyProductionChart({
  monthlyKwh,
  yearlyKwh,
  className = '',
}: MonthlyProductionChartProps) {
  const { t, i18n } = useTranslation();
  const labels = MONTH_LABELS[i18n.language] || MONTH_LABELS_EN;

  const chartData = useMemo(() => {
    if (!monthlyKwh || monthlyKwh.length === 0) {
      // Estimate from yearly using Panama distribution
      const factors = [0.088, 0.085, 0.090, 0.082, 0.075, 0.072, 0.074, 0.076, 0.074, 0.078, 0.080, 0.086];
      return factors.map((f, i) => ({
        month: labels[i],
        kwh: Math.round(yearlyKwh * f),
      }));
    }
    return monthlyKwh.map((kwh, i) => ({
      month: labels[i],
      kwh,
    }));
  }, [monthlyKwh, yearlyKwh, labels]);

  const maxKwh = Math.max(...chartData.map(d => d.kwh));

  return (
    <div className={className}>
      <h4 className="text-xs font-medium text-[#8888a0] mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00ffcc]" />
        {t('tools.scanner.monthlyChart')}
      </h4>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: '#555566' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#555566' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#e0e0f0',
              }}
              formatter={(value: number) => [`${value.toLocaleString()} kWh`, 'Production']}
            />
            <Bar dataKey="kwh" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.kwh === maxKwh ? '#00ffcc' : '#00ffcc40'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
