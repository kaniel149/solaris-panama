import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Share2, MessageCircle, Mail, Link2, Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import {
  saveRoofScan,
  generateShareToken,
  buildShareUrl,
  buildWhatsAppShareUrl,
  buildEmailShareUrl,
  scanResultToInput,
  type RoofScanRow,
} from '@/services/roofScanService';
import type { RoofScanResult } from '@/services/roofScannerService';

interface ScanActionsProps {
  scanResult: RoofScanResult;
  savedScan?: RoofScanRow | null;
  onSaved?: (scan: RoofScanRow) => void;
  projectId?: string;
  leadId?: string;
  className?: string;
}

export default function ScanActions({
  scanResult,
  savedScan: externalSavedScan,
  onSaved,
  projectId,
  leadId,
  className = '',
}: ScanActionsProps) {
  const { t } = useTranslation();
  const [savedScan, setSavedScan] = useState<RoofScanRow | null>(externalSavedScan ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(
    externalSavedScan?.public_share_token ?? null
  );
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleSave = useCallback(async () => {
    if (savedScan) return;
    setIsSaving(true);
    try {
      const input = scanResultToInput(scanResult, { project_id: projectId, lead_id: leadId });
      const saved = await saveRoofScan(input);
      setSavedScan(saved);
      onSaved?.(saved);
    } catch (err) {
      console.error('Failed to save scan:', err);
    } finally {
      setIsSaving(false);
    }
  }, [scanResult, savedScan, projectId, leadId, onSaved]);

  const handleShare = useCallback(async () => {
    if (!savedScan) {
      // Save first, then share
      setIsSaving(true);
      try {
        const input = scanResultToInput(scanResult, { project_id: projectId, lead_id: leadId });
        const saved = await saveRoofScan(input);
        setSavedScan(saved);
        onSaved?.(saved);

        setIsGeneratingLink(true);
        const token = await generateShareToken(saved.id);
        setShareToken(token);
        setShowShareMenu(true);
      } catch (err) {
        console.error('Failed to save/share:', err);
      } finally {
        setIsSaving(false);
        setIsGeneratingLink(false);
      }
      return;
    }

    if (shareToken) {
      setShowShareMenu(true);
      return;
    }

    setIsGeneratingLink(true);
    try {
      const token = await generateShareToken(savedScan.id);
      setShareToken(token);
      setShowShareMenu(true);
    } catch (err) {
      console.error('Failed to generate share link:', err);
    } finally {
      setIsGeneratingLink(false);
    }
  }, [savedScan, shareToken, scanResult, projectId, leadId, onSaved]);

  const handleCopyLink = useCallback(async () => {
    if (!shareToken) return;
    const url = buildShareUrl(shareToken);
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareToken]);

  const handleWhatsApp = useCallback(() => {
    if (!shareToken) return;
    const url = buildWhatsAppShareUrl(shareToken, scanResult.address);
    window.open(url, '_blank');
  }, [shareToken, scanResult.address]);

  const handleEmail = useCallback(() => {
    if (!shareToken) return;
    const url = buildEmailShareUrl(
      shareToken,
      scanResult.address,
      scanResult.maxSystemSizeKwp,
      scanResult.yearlyEnergyKwh
    );
    window.open(url, '_blank');
  }, [shareToken, scanResult]);

  return (
    <div className={`flex items-center gap-2 relative ${className}`}>
      {/* Save Button */}
      <Button
        variant={savedScan ? 'primary' : 'accent'}
        size="sm"
        onClick={handleSave}
        loading={isSaving}
        disabled={!!savedScan}
        icon={savedScan ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
      >
        {isSaving
          ? t('tools.scanner.saving')
          : savedScan
            ? t('tools.scanner.saved')
            : t('tools.scanner.saveScan')}
      </Button>

      {/* Share Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        loading={isGeneratingLink}
        icon={<Share2 className="w-3.5 h-3.5" />}
      >
        {t('tools.scanner.share')}
      </Button>

      {/* Share Menu Dropdown */}
      <AnimatePresence>
        {showShareMenu && shareToken && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowShareMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 z-50 w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-1">
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#c0c0d0] hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  {t('tools.scanner.shareViaWhatsApp')}
                </button>
                <button
                  onClick={handleEmail}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#c0c0d0] hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                  {t('tools.scanner.shareViaEmail')}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#c0c0d0] hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">{t('tools.scanner.linkCopied')}</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 text-purple-400" />
                      {t('tools.scanner.copyLink')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
