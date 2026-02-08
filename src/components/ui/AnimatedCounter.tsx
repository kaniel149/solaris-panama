import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: 'number' | 'currency' | 'percentage';
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

function formatValue(
  val: number,
  format: 'number' | 'currency' | 'percentage',
  decimals: number,
  prefix?: string,
  suffix?: string
): string {
  let formatted: string;

  switch (format) {
    case 'currency':
      formatted = val.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix ?? '$'}${formatted}${suffix ?? ''}`;
    case 'percentage':
      formatted = val.toFixed(decimals);
      return `${prefix ?? ''}${formatted}${suffix ?? '%'}`;
    default:
      formatted = val.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix ?? ''}${formatted}${suffix ?? ''}`;
  }
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 800,
  format = 'number',
  prefix,
  suffix,
  decimals = 0,
  className,
}) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;

      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={className}>
      {formatValue(display, format, decimals, prefix, suffix)}
    </span>
  );
};
