import React, { forwardRef } from 'react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  inputSize?: InputSize;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-8 text-xs px-2.5',
  md: 'h-10 text-sm px-3.5',
  lg: 'h-12 text-base px-4',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, inputSize = 'md', className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[#8888a0]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555566]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg bg-[#12121a] border text-[#f0f0f5] placeholder-[#555566] outline-none transition-all duration-200',
              'focus:border-[#00ffcc] focus:shadow-[0_0_0_3px_rgba(0,255,204,0.1)]',
              error
                ? 'border-[#ef4444] focus:border-[#ef4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                : 'border-white/[0.06]',
              sizeStyles[inputSize],
              icon ? 'pl-10' : '',
              props.disabled && 'opacity-40 cursor-not-allowed',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#555566]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
