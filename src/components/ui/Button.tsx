import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/20 hover:bg-[#00ffcc]/20 hover:border-[#00ffcc]/40 hover:shadow-[0_0_20px_rgba(0,255,204,0.15)]',
  secondary:
    'bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 hover:bg-[#8b5cf6]/20 hover:border-[#8b5cf6]/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]',
  ghost:
    'bg-transparent text-[#8888a0] border border-transparent hover:bg-white/[0.04] hover:text-[#f0f0f5]',
  danger:
    'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20 hover:border-[#ef4444]/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  accent:
    'bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 hover:bg-[#0ea5e9]/20 hover:border-[#0ea5e9]/40 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  className,
  children,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
      disabled={isDisabled}
      {...(props as any)}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin', size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
      ) : icon ? (
        icon
      ) : null}
      {children}
      {iconRight && !loading && iconRight}
    </motion.button>
  );
};
