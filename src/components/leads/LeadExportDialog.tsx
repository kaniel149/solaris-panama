import { useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Lead } from '@/types/lead';
import { exportLeadsCSV, downloadCSV } from '@/services/leadStorageService';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

interface LeadExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
}

const EXPORT_FIELDS = [
  { key: 'name', label: 'Name', default: true },
  { key: 'type', label: 'Type', default: true },
  { key: 'zone', label: 'Zone', default: true },
  { key: 'area', label: 'Area (m²)', default: true },
  { key: 'score', label: 'Score', default: true },
  { key: 'kwp', label: 'System kWp', default: true },
  { key: 'investment', label: 'Investment', default: true },
  { key: 'savings', label: 'Annual Savings', default: true },
  { key: 'payback', label: 'Payback (yrs)', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'businessName', label: 'Business Name', default: false },
  { key: 'phone', label: 'Phone', default: false },
  { key: 'website', label: 'Website', default: false },
  { key: 'lat', label: 'Latitude', default: false },
  { key: 'lng', label: 'Longitude', default: false },
  { key: 'date', label: 'Created Date', default: true },
] as const;

export function LeadExportDialog({ isOpen, onClose, leads }: LeadExportDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(EXPORT_FIELDS.filter((f) => f.default).map((f) => f.key))
  );

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExport = () => {
    const csv = exportLeadsCSV(leads);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `solaris-leads-${date}.csv`);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Export Leads"
      description={`Exporting ${leads.length} lead${leads.length !== 1 ? 's' : ''}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={selected.size === 0}
          >
            Export CSV
          </Button>
        </>
      }
    >
      <div className="space-y-1 max-h-[320px] overflow-y-auto">
        {EXPORT_FIELDS.map((field) => (
          <label
            key={field.key}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
              'hover:bg-white/[0.03]',
              selected.has(field.key) && 'bg-white/[0.02]'
            )}
          >
            <input
              type="checkbox"
              checked={selected.has(field.key)}
              onChange={() => toggle(field.key)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#00ffcc] focus:ring-[#00ffcc]/30 focus:ring-offset-0"
            />
            <span className="text-sm text-[#c0c0d0]">{field.label}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
