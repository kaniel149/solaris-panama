import React from 'react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string; glow: string }> = {
  default: {
    bg: 'bg-white/[0.06]',
    text: 'text-[#8888a0]',
    dot: 'bg-[#8888a0]',
    glow: '',
  },
  success: {
    bg: 'bg-[#22c55e]/10',
    text: 'text-[#22c55e]',
    dot: 'bg-[#22c55e]',
    glow: 'shadow-[0_0_8px_rgba(34,197,94,0.2)]',
  },
  warning: {
    bg: 'bg-[#f59e0b]/10',
    text: 'text-[#f59e0b]',
    dot: 'bg-[#f59e0b]',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.2)]',
  },
  error: {
    bg: 'bg-[#ef4444]/10',
    text: 'text-[#ef4444]',
    dot: 'bg-[#ef4444]',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.2)]',
  },
  info: {
    bg: 'bg-[#0ea5e9]/10',
    text: 'text-[#0ea5e9]',
    dot: 'bg-[#0ea5e9]',
    glow: 'shadow-[0_0_8px_rgba(14,165,233,0.2)]',
  },
  purple: {
    bg: 'bg-[#8b5cf6]/10',
    text: 'text-[#8b5cf6]',
    dot: 'bg-[#8b5cf6]',
    glow: 'shadow-[0_0_8px_rgba(139,92,246,0.2)]',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className,
}) => {
  const v = variantStyles[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap',
        v.bg,
        v.text,
        v.glow,
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', v.dot)} />}
      {children}
    </span>
  );
};
