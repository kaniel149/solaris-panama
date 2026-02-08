import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastConfig: Record<ToastType, { icon: React.ReactNode; borderColor: string }> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 text-[#22c55e]" />,
    borderColor: 'border-l-[#22c55e]',
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-[#ef4444]" />,
    borderColor: 'border-l-[#ef4444]',
  },
  info: {
    icon: <Info className="w-4 h-4 text-[#0ea5e9]" />,
    borderColor: 'border-l-[#0ea5e9]',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />,
    borderColor: 'border-l-[#f59e0b]',
  },
};

let toastCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: Omit<ToastItem, 'id'>) => {
      const id = `toast-${++toastCounter}`;
      const newToast: ToastItem = { id, ...options };

      setToasts((prev) => {
        const next = [...prev, newToast];
        return next.slice(-5);
      });

      const duration = options.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const config = toastConfig[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className={cn(
                  'pointer-events-auto rounded-lg bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.06] border-l-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3.5 flex items-start gap-3',
                  config.borderColor
                )}
              >
                <div className="mt-0.5 shrink-0">{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f0f0f5]">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-[#8888a0] mt-0.5">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 p-1 rounded text-[#555566] hover:text-[#f0f0f5] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export const Toast = ToastProvider;
