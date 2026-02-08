import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  showShortcut?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value: controlledValue,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  showShortcut = true,
  className,
  autoFocus = false,
}) => {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const displayValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInternalValue(val);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange?.(val);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    if (!showShortcut) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showShortcut]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555566]" />
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-10 rounded-lg bg-[#12121a] border border-white/[0.06] text-sm text-[#f0f0f5] placeholder-[#555566] pl-10 pr-20 outline-none transition-all duration-200 focus:border-[#00ffcc] focus:shadow-[0_0_0_3px_rgba(0,255,204,0.1)]"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {displayValue && (
          <button
            onClick={handleClear}
            className="p-0.5 rounded text-[#555566] hover:text-[#f0f0f5] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {showShortcut && !displayValue && (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#555566] font-mono">
            <span className="text-[9px]">&#8984;</span>K
          </kbd>
        )}
      </div>
    </div>
  );
};
