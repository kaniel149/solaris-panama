import React from 'react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const roundedStyles: Record<string, string> = {
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = 'md',
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-white/[0.04]',
        roundedStyles[rounded],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-xl bg-[#12121a]/80 border border-white/[0.06] p-5 space-y-4',
      className
    )}
  >
    <div className="flex items-center gap-3">
      <Skeleton width={40} height={40} rounded="full" />
      <div className="space-y-2 flex-1">
        <Skeleton height={14} width="60%" />
        <Skeleton height={10} width="40%" />
      </div>
    </div>
    <Skeleton height={12} width="100%" />
    <Skeleton height={12} width="80%" />
    <Skeleton height={12} width="90%" />
  </div>
);

export const SkeletonMetric: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-xl bg-[#12121a]/80 border border-white/[0.06] p-5 space-y-3',
      className
    )}
  >
    <Skeleton height={10} width="50%" />
    <Skeleton height={28} width="70%" />
    <Skeleton height={8} width="30%" />
  </div>
);
