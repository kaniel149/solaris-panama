import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

interface CommandItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  group?: string;
}

interface CommandPaletteProps {
  commands: CommandItem[];
  placeholder?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  placeholder = 'Type a command or search...',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setActiveIndex(0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = query.trim()
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    const group = cmd.group || 'Actions';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(groups).flat();

  const handleSelect = useCallback(
    (cmd: CommandItem) => {
      cmd.onSelect();
      setOpen(false);
      setQuery('');
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % flatFiltered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatFiltered.length) % flatFiltered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatFiltered[activeIndex]) {
          handleSelect(flatFiltered[activeIndex]);
        }
      }
    },
    [flatFiltered, activeIndex, handleSelect]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  let itemIdx = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg rounded-xl bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.06] shadow-[0_16px_64px_rgba(0,0,0,0.6)] overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-3 px-4 border-b border-white/[0.06]">
              <Search className="w-4 h-4 text-[#555566] shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 h-12 bg-transparent text-sm text-[#f0f0f5] placeholder-[#555566] outline-none"
              />
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#555566] font-mono">
                ESC
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto py-2">
              {flatFiltered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[#555566]">
                  No results found
                </div>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <div key={group}>
                    <div className="px-4 py-1.5 text-[10px] font-medium text-[#555566] uppercase tracking-wider">
                      {group}
                    </div>
                    {items.map((cmd) => {
                      itemIdx++;
                      const isActive = itemIdx === activeIndex;
                      const currentIdx = itemIdx;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => handleSelect(cmd)}
                          onMouseEnter={() => setActiveIndex(currentIdx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                            isActive
                              ? 'bg-white/[0.04] text-[#f0f0f5]'
                              : 'text-[#8888a0] hover:bg-white/[0.02]'
                          )}
                        >
                          {cmd.icon && (
                            <span className="shrink-0 text-[#555566]">{cmd.icon}</span>
                          )}
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className="shrink-0 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#555566] font-mono">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
