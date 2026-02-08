import React, { useState } from 'react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
type StatusType = 'online' | 'offline' | 'away' | 'busy';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  status?: StatusType;
  ringColor?: string;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  sm: { container: 'w-7 h-7', text: 'text-[10px]', status: 'w-2 h-2 border' },
  md: { container: 'w-9 h-9', text: 'text-xs', status: 'w-2.5 h-2.5 border-[1.5px]' },
  lg: { container: 'w-11 h-11', text: 'text-sm', status: 'w-3 h-3 border-2' },
  xl: { container: 'w-14 h-14', text: 'text-base', status: 'w-3.5 h-3.5 border-2' },
};

const statusColors: Record<StatusType, string> = {
  online: 'bg-[#22c55e]',
  offline: 'bg-[#555566]',
  away: 'bg-[#f59e0b]',
  busy: 'bg-[#ef4444]',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  ringColor,
  className,
}) => {
  const [imgError, setImgError] = useState(false);
  const s = sizeStyles[size];
  const showImage = src && !imgError;

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center overflow-hidden bg-[#1a1a2e] text-[#8888a0] font-medium',
          s.container
        )}
        style={ringColor ? { boxShadow: `0 0 0 2px ${ringColor}` } : undefined}
      >
        {showImage ? (
          <img
            src={src}
            alt={name || 'avatar'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={s.text}>{getInitials(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-[#0a0a0f]',
            s.status,
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};
