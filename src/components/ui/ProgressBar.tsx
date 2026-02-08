import React from 'react';
import { motion } from 'framer-motion';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

type ProgressSize = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: string;
  size?: ProgressSize;
  className?: string;
}

const sizeStyles: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  color = '#00ffcc',
  size = 'md',
  className,
}) => {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-[#8888a0]">{label}</span>}
          {showValue && (
            <span className="text-xs font-medium text-[#f0f0f5]">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full rounded-full bg-white/[0.04] overflow-hidden', sizeStyles[size])}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};
