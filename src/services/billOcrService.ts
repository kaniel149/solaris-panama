// ==========================================
// Bill OCR Service — Solaris Panama
// Client-side service that calls /api/bill-ocr
// ==========================================

// ===== TYPES =====

export interface BillOcrResult {
  utility: 'naturgy' | 'edemet' | 'ensa' | 'edechi' | 'unknown';
  monthly_kwh: number | null;
  kwh_history: Array<{ month: string; kwh: number }>;
  total_usd: number | null;
  tariff_code: string | null;
  client_name: string | null;
  service_address: string | null;
  meter_or_nis: string | null;
  confidence: number;
}

export interface BillOcrError {
  error: string;
  code?: string;
}

export type BillOcrResponse =
  | { ok: true; data: BillOcrResult }
  | { ok: false; message: string };

// ===== CONSTANTS =====

const ENDPOINT = '/api/bill-ocr';
const TIMEOUT_MS = 30_000; // Gemini Vision can be slow on first cold call

const UTILITY_LABELS: Record<BillOcrResult['utility'], string> = {
  naturgy: 'Naturgy Panama',
  ensa: 'ENSA',
  edemet: 'EDEMET',
  edechi: 'EDECHI',
  unknown: 'Distribuidora desconocida',
};

// ===== MAIN FUNCTION =====

/**
 * Sends an image (as File or base64 string) to the bill-ocr endpoint.
 * Returns a typed result or a Spanish error message.
 */
export async function scanBill(imageSource: File | string): Promise<BillOcrResponse> {
  let base64: string;
  let mimeType: string;

  try {
    if (imageSource instanceof File) {
      mimeType = imageSource.type || 'image/jpeg';
      base64 = await fileToBase64(imageSource);
    } else {
      // Already a base64 string (may include data-URL prefix)
      base64 = imageSource;
      mimeType = detectMimeFromDataUrl(imageSource) ?? 'image/jpeg';
    }
  } catch {
    return {
      ok: false,
      message: 'No se pudo leer la imagen. Intente con otro archivo.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType }),
      signal: controller.signal,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        (json as BillOcrError | null)?.error ??
        'Error al procesar la factura. Intente de nuevo.';
      return { ok: false, message };
    }

    return { ok: true, data: json as BillOcrResult };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        message: 'El análisis tardó demasiado. Intente con una imagen de menor tamaño.',
      };
    }
    return {
      ok: false,
      message: 'No se pudo conectar con el servidor. Verifique su conexión.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== HELPERS =====

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

function detectMimeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}

/**
 * Returns the human-readable label for a utility identifier.
 */
export function getUtilityLabel(utility: BillOcrResult['utility']): string {
  return UTILITY_LABELS[utility] ?? 'Distribuidora desconocida';
}

/**
 * Computes an average monthly kWh from history, falling back to monthly_kwh.
 */
export function getAverageMonthlyKwh(result: BillOcrResult): number | null {
  if (result.kwh_history.length >= 3) {
    const sum = result.kwh_history.reduce((s, h) => s + h.kwh, 0);
    return Math.round(sum / result.kwh_history.length);
  }
  return result.monthly_kwh;
}
