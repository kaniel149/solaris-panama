// ==========================================
// BillUploadCard — Panama Bill OCR Feature
// Upload or capture electricity bill image → extract kWh and address via Gemini Vision
// ==========================================

import { useState, useRef, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Camera, Upload, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, AlertCircle, Zap, MapPin,
  RotateCcw, ArrowRight,
} from 'lucide-react';
import {
  scanBill,
  getUtilityLabel,
  getAverageMonthlyKwh,
  type BillOcrResult,
} from '@/services/billOcrService';

// ===== TYPES =====

export interface BillPrefillData {
  /** Average monthly consumption from OCR */
  monthly_kwh: number;
  /** Street address from the bill, used to prefill map search */
  address: string | null;
  /** Raw OCR result for downstream use */
  raw: BillOcrResult;
}

interface BillUploadCardProps {
  /** Called when the user clicks "Usar estos datos" */
  onUseBillData: (data: BillPrefillData) => void;
}

// ===== CONSTANTS =====

const ACCEPTED_TYPES = 'image/jpeg,image/jpg,image/png,image/webp';
const MAX_FILE_MB = 5;

// ===== HELPERS =====

function formatKwh(n: number | null): string {
  if (n === null) return '—';
  return `${Math.round(n).toLocaleString('es-PA')} kWh`;
}

function formatUsd(n: number | null): string {
  if (n === null) return '—';
  return `$${n.toFixed(2)}`;
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return '#22c55e';
  if (c >= 0.6) return '#f59e0b';
  return '#ef4444';
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return 'Alta confianza';
  if (c >= 0.6) return 'Confianza media';
  return 'Baja confianza';
}

// ===== COMPONENT =====

export default function BillUploadCard({ onUseBillData }: BillUploadCardProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BillOcrResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setErrorMsg(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFile = useCallback(async (file: File) => {
    // Size guard (client-side mirror of server guard)
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorMsg(
        `La imagen es demasiado grande (máx. ${MAX_FILE_MB} MB). Recorte la factura e intente de nuevo.`
      );
      return;
    }

    // Show preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setErrorMsg(null);
    setResult(null);
    setIsLoading(true);

    try {
      const response = await scanBill(file);
      if (response.ok) {
        setResult(response.data);
      } else {
        setErrorMsg(response.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleUseData = useCallback(() => {
    if (!result) return;
    const monthly_kwh = getAverageMonthlyKwh(result);
    if (!monthly_kwh || monthly_kwh <= 0) {
      setErrorMsg(
        'No se pudo detectar el consumo en kWh. Ingrese el valor manualmente.'
      );
      return;
    }
    onUseBillData({
      monthly_kwh,
      address: result.service_address,
      raw: result,
    });
  }, [result, onUseBillData]);

  const averageKwh = result ? getAverageMonthlyKwh(result) : null;
  const canUse = averageKwh !== null && averageKwh > 0;

  return (
    <div className="rounded-xl bg-[#12121a]/90 backdrop-blur-xl border border-white/[0.06] overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-[#f59e0b]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#f0f0f5]">Sube tu factura</p>
            <p className="text-[11px] text-[#555566] leading-tight">
              Extrae tu consumo en kWh automáticamente
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#555566] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#555566] flex-shrink-0" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="bill-upload-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.04]">

              {/* Upload zone (hidden when result is shown) */}
              {!result && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="relative rounded-lg border-2 border-dashed border-white/[0.08] hover:border-[#f59e0b]/30 transition-colors bg-white/[0.02]"
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Loader2 className="w-6 h-6 text-[#f59e0b] animate-spin" />
                      <p className="text-xs text-[#8888a0]">Analizando factura…</p>
                    </div>
                  ) : previewUrl ? (
                    <div className="flex flex-col items-center justify-center py-4 gap-2">
                      <img
                        src={previewUrl}
                        alt="Vista previa de factura"
                        className="max-h-24 rounded object-contain opacity-60"
                      />
                      <p className="text-[11px] text-[#555566]">Procesando…</p>
                    </div>
                  ) : (
                    <label
                      htmlFor={inputId}
                      className="flex flex-col items-center justify-center py-6 gap-2 cursor-pointer"
                    >
                      <div className="flex gap-2">
                        <Upload className="w-5 h-5 text-[#8888a0]" />
                        <Camera className="w-5 h-5 text-[#8888a0]" />
                      </div>
                      <p className="text-xs text-[#8888a0] text-center leading-snug">
                        Arrastra tu factura aquí o{' '}
                        <span className="text-[#f59e0b]">haz clic para seleccionar</span>
                        <br />
                        <span className="text-[#444455]">
                          JPG / PNG / WEBP · máx. {MAX_FILE_MB} MB
                        </span>
                      </p>
                    </label>
                  )}

                  <input
                    ref={fileInputRef}
                    id={inputId}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    capture="environment"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Error state */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-2 rounded-lg bg-[#ef4444]/[0.08] border border-[#ef4444]/20 px-3 py-2.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-[#ef4444] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#ef4444] leading-snug">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result card */}
              <AnimatePresence>
                {result && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="space-y-3"
                  >
                    {/* Confidence badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className="w-3.5 h-3.5"
                          style={{ color: confidenceColor(result.confidence) }}
                        />
                        <span
                          className="text-[11px] font-medium"
                          style={{ color: confidenceColor(result.confidence) }}
                        >
                          {confidenceLabel(result.confidence)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={reset}
                        className="flex items-center gap-1 text-[11px] text-[#555566] hover:text-[#8888a0] transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Nueva
                      </button>
                    </div>

                    {/* Extracted fields */}
                    <div className="space-y-1.5">
                      {/* Utility */}
                      <ResultRow
                        label="Distribuidora"
                        value={getUtilityLabel(result.utility)}
                      />

                      {/* Monthly kWh — highlighted */}
                      <div className="flex items-center justify-between rounded-lg bg-[#00ffcc]/[0.06] border border-[#00ffcc]/15 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#00ffcc]" />
                          <span className="text-xs text-[#8888a0]">
                            {result.kwh_history.length >= 3
                              ? 'Promedio mensual'
                              : 'Consumo mensual'}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-[#00ffcc]">
                          {formatKwh(averageKwh)}
                        </span>
                      </div>

                      {/* Total bill */}
                      {result.total_usd !== null && (
                        <ResultRow
                          label="Total factura"
                          value={formatUsd(result.total_usd)}
                        />
                      )}

                      {/* Tariff */}
                      {result.tariff_code && (
                        <ResultRow
                          label="Categoría tarifaria"
                          value={result.tariff_code}
                        />
                      )}

                      {/* Address */}
                      {result.service_address && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3 h-3 text-[#555566] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-[#555566] mb-0.5">
                              Dirección del servicio
                            </p>
                            <p className="text-xs text-[#c0c0d0] break-words leading-snug">
                              {result.service_address}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Meter / NIS */}
                      {result.meter_or_nis && (
                        <ResultRow label="NIS / Medidor" value={result.meter_or_nis} />
                      )}
                    </div>

                    {/* CTA */}
                    {canUse ? (
                      <button
                        type="button"
                        onClick={handleUseData}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#00ffcc]/10 border border-[#00ffcc]/20 text-sm font-semibold text-[#00ffcc] hover:bg-[#00ffcc]/[0.18] hover:border-[#00ffcc]/40 transition-all duration-200"
                      >
                        Usar estos datos
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <p className="text-[11px] text-[#f59e0b] text-center leading-snug">
                        No se detectó consumo en kWh.{' '}
                        <button
                          type="button"
                          onClick={reset}
                          className="underline hover:no-underline"
                        >
                          Intente con otra imagen
                        </button>{' '}
                        o{' '}
                        <a
                          href="#kwh-manual"
                          className="underline hover:no-underline"
                          onClick={() => setIsExpanded(false)}
                        >
                          ingréselo manualmente
                        </a>
                        .
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Fallback hint (no result yet) */}
              {!result && !isLoading && !errorMsg && (
                <p className="text-[11px] text-[#444455] text-center">
                  Compatible con facturas de Naturgy, EDEMET y EDECHI.
                </p>
              )}

              {/* Fallback after error */}
              {errorMsg && (
                <p className="text-[11px] text-[#444455] text-center">
                  ¿Prefiere ingresar el consumo directamente?{' '}
                  <button
                    type="button"
                    className="text-[#8888a0] underline hover:no-underline"
                    onClick={() => {
                      setIsExpanded(false);
                      reset();
                    }}
                  >
                    Entrada manual
                  </button>
                </p>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== SUB-COMPONENTS =====

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#555566] flex-shrink-0">{label}</span>
      <span className="text-xs text-[#c0c0d0] text-right truncate">{value}</span>
    </div>
  );
}
