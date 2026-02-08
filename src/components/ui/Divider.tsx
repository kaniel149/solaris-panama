import React from 'react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface DividerProps {
  label?: string;
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spacingStyles: Record<string, string> = {
  sm: 'my-3',
  md: 'my-5',
  lg: 'my-8',
};

export const Divider: React.FC<DividerProps> = ({ label, spacing = 'md', className }) => {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', spacingStyles[spacing], className)}>
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-xs text-[#555566] font-medium whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className={cn('h-px bg-white/[0.06]', spacingStyles[spacing], className)} />
  );
};
