import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

type ConfirmVariant = 'danger' | 'warning';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  variant?: ConfirmVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

const variantConfig: Record<ConfirmVariant, { icon: React.ReactNode; iconBg: string }> = {
  danger: {
    icon: <Trash2 className="w-5 h-5 text-[#ef4444]" />,
    iconBg: 'bg-[#ef4444]/10',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />,
    iconBg: 'bg-[#f59e0b]/10',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  variant = 'danger',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
}) => {
  const config = variantConfig[variant];

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-4', config.iconBg)}>
          {config.icon}
        </div>
        <h3 className="text-lg font-semibold text-[#f0f0f5] mb-2">{title}</h3>
        <p className="text-sm text-[#8888a0] mb-6 max-w-xs">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <Button variant="ghost" onClick={onClose} fullWidth disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            fullWidth
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
