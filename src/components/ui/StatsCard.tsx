import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface StatsCardProps {
  label: string;
  value: number;
  format?: 'number' | 'currency' | 'percentage';
  prefix?: string;
  suffix?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  format = 'number',
  prefix,
  suffix,
  trend,
  icon,
  className,
}) => {
  const isPositive = trend ? trend.value >= 0 : undefined;

  return (
    <div
      className={cn(
        'rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] p-5 flex flex-col gap-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#8888a0] uppercase tracking-wider">{label}</span>
        {icon && <div className="text-[#555566]">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-[#f0f0f5]">
        <AnimatedCounter value={value} format={format} prefix={prefix} suffix={suffix} />
      </div>
      {trend && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-[#ef4444]" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'
            )}
          >
            {isPositive ? '+' : ''}{trend.value}%
          </span>
          {trend.label && <span className="text-xs text-[#555566]">{trend.label}</span>}
        </div>
      )}
    </div>
  );
};
