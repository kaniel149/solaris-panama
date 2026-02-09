// Owner Research Service — Panama directory scraping client + WhatsApp URL builder

export interface OwnerResearchResult {
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  } | null;
  sources: string[];
}

// ===== API Client =====

/**
 * Research building owner through Panama directories + Google Places
 * Calls the /api/roof-scan?action=owner-research endpoint
 */
export async function researchOwner(
  query: string,
  lat: number,
  lng: number
): Promise<OwnerResearchResult | null> {
  try {
    const params = new URLSearchParams({
      action: 'owner-research',
      query: encodeURIComponent(query),
      lat: lat.toString(),
      lng: lng.toString(),
    });

    const response = await fetch(`/api/roof-scan?${params}`);
    if (!response.ok) {
      console.error('[owner-research] API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data as OwnerResearchResult;
  } catch (err) {
    console.error('[owner-research] Failed:', err);
    return null;
  }
}

// ===== Utility Functions =====

/**
 * Build WhatsApp URL for Panama phone number
 * Formats: +507 XXXX-XXXX or raw digits
 */
export function buildWhatsAppUrl(
  phone: string,
  businessName?: string
): string {
  // Clean phone: keep only digits
  const digits = phone.replace(/[^\d]/g, '');

  // Add Panama country code if not present
  const fullNumber = digits.startsWith('507') ? digits : `507${digits}`;

  // Build greeting message
  const message = businessName
    ? `Hola, me comunico con ${businessName} respecto a una oportunidad de energ\u00eda solar para su edificio.`
    : 'Hola, me gustar\u00eda hablar sobre una oportunidad de energ\u00eda solar para su edificio.';

  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Build phone call URL
 */
export function buildCallUrl(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const fullNumber = digits.startsWith('507') ? digits : `507${digits}`;
  return `tel:+${fullNumber}`;
}

/**
 * Format phone number for display
 * +507 6XXX-XXXX (mobile) or +507 XXX-XXXX (landline)
 */
export function formatPanamaPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const local = digits.startsWith('507') ? digits.slice(3) : digits;

  if (local.length === 8) {
    // Mobile: 6XXX-XXXX or 3XX-XXXX
    return `+507 ${local.slice(0, 4)}-${local.slice(4)}`;
  }
  if (local.length === 7) {
    // Landline: XXX-XXXX
    return `+507 ${local.slice(0, 3)}-${local.slice(3)}`;
  }
  return `+507 ${local}`;
}

/**
 * Merge enrichment data with owner research results
 */
export function mergeOwnerResearch(
  existing: {
    ownerName: string | null;
    email: string | null;
    phone: string | null;
    socialMedia: { facebook?: string; instagram?: string; linkedin?: string } | null;
  } | null,
  research: OwnerResearchResult
): {
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  socialMedia: { facebook?: string; instagram?: string; linkedin?: string } | null;
} {
  return {
    ownerName: research.ownerName || existing?.ownerName || null,
    email: research.email || existing?.email || null,
    phone: research.phone || existing?.phone || null,
    socialMedia: {
      ...(existing?.socialMedia || {}),
      ...(research.socialMedia || {}),
    },
  };
}
