import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  selectSize?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<string, string> = {
  sm: 'h-8 text-xs px-2.5',
  md: 'h-10 text-sm px-3.5',
  lg: 'h-12 text-base px-4',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, selectSize = 'md', className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-[#8888a0]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full rounded-lg bg-[#12121a] border text-[#f0f0f5] outline-none transition-all duration-200 appearance-none pr-10 cursor-pointer',
              'focus:border-[#00ffcc] focus:shadow-[0_0_0_3px_rgba(0,255,204,0.1)]',
              error
                ? 'border-[#ef4444] focus:border-[#ef4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                : 'border-white/[0.06]',
              sizeStyles[selectSize],
              props.disabled && 'opacity-40 cursor-not-allowed',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-[#555566] bg-[#12121a]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-[#12121a] text-[#f0f0f5]"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555566] pointer-events-none" />
        </div>
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#555566]">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
