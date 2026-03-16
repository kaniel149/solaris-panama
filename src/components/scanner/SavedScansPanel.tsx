import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, MapPin, Sun, Zap, Calendar, Trash2,
  Share2, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getRoofScans,
  deleteRoofScan,
  type RoofScanRow,
} from '@/services/roofScanService';

interface SavedScansPanelProps {
  onSelectScan?: (scan: RoofScanRow) => void;
  onShareScan?: (scan: RoofScanRow) => void;
  refreshTrigger?: number;
  className?: string;
}

export default function SavedScansPanel({
  onSelectScan,
  onShareScan,
  refreshTrigger = 0,
  className = '',
}: SavedScansPanelProps) {
  const { t } = useTranslation();
  const [scans, setScans] = useState<RoofScanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadScans = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getRoofScans({ limit: 20 });
      setScans(data);
    } catch (err) {
      console.error('Failed to load saved scans:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans, refreshTrigger]);

  const handleDelete = useCallback(async (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(scanId);
    try {
      await deleteRoofScan(scanId);
      setScans(prev => prev.filter(s => s.id !== scanId));
    } catch (err) {
      console.error('Failed to delete scan:', err);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const qualityColor = (quality: string) => {
    switch (quality) {
      case 'HIGH': return 'text-green-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'BASE': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading && scans.length === 0) {
    return (
      <div className={`px-4 py-3 ${className}`}>
        <div className="flex items-center gap-2 text-[#555566] text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header - Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-[#8888a0] hover:text-[#c0c0d0] transition-colors"
      >
        <span className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          {t('tools.scanner.savedScans')}
          {scans.length > 0 && (
            <span className="bg-[#00ffcc]/10 text-[#00ffcc] px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {scans.length}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Scans List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {scans.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-[#555566]">
                {t('tools.scanner.noSavedScans')}
              </div>
            ) : (
              <div className="px-2 pb-2 space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {scans.map((scan) => (
                  <motion.div
                    key={scan.id}
                    layout
                    className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] rounded-lg px-3 py-2.5 cursor-pointer transition-colors"
                    onClick={() => onSelectScan?.(scan)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3 h-3 text-[#00ffcc] flex-shrink-0" />
                          <span className="text-xs font-medium text-[#e0e0f0] truncate">
                            {scan.address}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[#555566]">
                          <span className="flex items-center gap-1">
                            <Sun className="w-2.5 h-2.5" />
                            {scan.system_kwp?.toFixed(1)} kWp
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" />
                            {scan.yearly_kwh?.toLocaleString()} kWh
                          </span>
                          <span className={`font-medium ${qualityColor(scan.quality)}`}>
                            {scan.quality}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#444455]">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(scan.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onShareScan && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareScan(scan);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-[#555566] hover:text-[#00ffcc] transition-colors"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(scan.id, e)}
                          disabled={deletingId === scan.id}
                          className="p-1 rounded hover:bg-red-500/10 text-[#555566] hover:text-red-400 transition-colors"
                        >
                          {deletingId === scan.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
