import React from 'react';
import { X } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  color?: string;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  selected = false,
  color = '#00ffcc',
  removable = false,
  onRemove,
  onClick,
  className,
}) => {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
        onClick && 'cursor-pointer',
        selected
          ? 'border-current bg-current/10'
          : 'border-white/[0.06] bg-white/[0.02] text-[#8888a0] hover:bg-white/[0.04] hover:text-[#f0f0f5]',
        className
      )}
      style={
        selected
          ? {
              color,
              borderColor: `${color}33`,
              backgroundColor: `${color}15`,
              boxShadow: `0 0 12px ${color}20`,
            }
          : undefined
      }
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="shrink-0 ml-0.5 p-0.5 rounded-full hover:bg-white/[0.08] transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
