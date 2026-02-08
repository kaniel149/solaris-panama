import React from 'react';
import { motion } from 'framer-motion';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

type CardVariant = 'default' | 'elevated' | 'interactive';

interface GlassCardProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]',
  elevated:
    'bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
  interactive:
    'bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] cursor-pointer',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'default',
  padding = 'md',
  header,
  footer,
  children,
  className,
  onClick,
}) => {
  const isInteractive = variant === 'interactive' || !!onClick;

  const Wrapper = isInteractive ? motion.div : 'div';
  const motionProps = isInteractive
    ? {
        whileHover: {
          scale: 1.005,
          borderColor: 'rgba(0, 255, 204, 0.15)',
          boxShadow: '0 0 30px rgba(0, 255, 204, 0.06)',
        },
        transition: { type: 'spring', stiffness: 300, damping: 25 },
      }
    : {};

  return (
    <Wrapper
      className={cn(
        'rounded-xl transition-colors duration-200',
        variantStyles[variant],
        !header && !footer && paddingStyles[padding],
        className
      )}
      onClick={onClick}
      {...(motionProps as any)}
    >
      {header && (
        <div className={cn('border-b border-white/[0.06]', paddingStyles[padding])}>
          {header}
        </div>
      )}
      {(header || footer) ? (
        <div className={paddingStyles[padding]}>{children}</div>
      ) : (
        children
      )}
      {footer && (
        <div className={cn('border-t border-white/[0.06]', paddingStyles[padding])}>
          {footer}
        </div>
      )}
    </Wrapper>
  );
};
