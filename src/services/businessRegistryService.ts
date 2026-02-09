// Business Registry Service — Panama Emprende + OpenCorporates + Apollo.io
// Verifies business licenses and corporate records for Panama buildings

import type { BusinessLicense, CorporateInfo } from '@/types/enrichment';

/**
 * Verify a business via Panama Emprende (Aviso de Operacion registry).
 * Routes through /api/roof-scan?action=panama-emprende to keep scraping server-side.
 */
export async function verifyBusiness(commercialName: string): Promise<BusinessLicense | null> {
  try {
    const url = `/api/roof-scan?action=panama-emprende&businessName=${encodeURIComponent(commercialName)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.error || !data.legalName) return null;

    return {
      avisoNumber: data.avisoNumber || '',
      legalName: data.legalName || '',
      commercialName: data.commercialName || commercialName,
      status: parseBusinessStatus(data.status),
      entryDate: data.entryDate || '',
      activityDescription: data.activityDescription || '',
    };
  } catch {
    return null;
  }
}

/**
 * Search for a company in OpenCorporates registry.
 * Routes through /api/roof-scan?action=opencorporates.
 */
export async function searchCompany(name: string): Promise<CorporateInfo | null> {
  try {
    const url = `/api/roof-scan?action=opencorporates&companyName=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.error || !data.companyName) return null;

    return {
      companyNumber: data.companyNumber || '',
      companyName: data.companyName || '',
      status: data.status || 'unknown',
      incorporationDate: data.incorporationDate || '',
      registeredAddress: data.registeredAddress || '',
      officers: Array.isArray(data.officers) ? data.officers.map((o: Record<string, string>) => ({
        name: o.name || '',
        role: o.role || '',
        startDate: o.startDate || undefined,
      })) : [],
    };
  } catch {
    return null;
  }
}

/**
 * Enrich with Apollo.io organization data (optional, only if API key exists).
 * Routes through /api/roof-scan?action=apollo-enrich.
 */
export async function enrichWithApollo(domain: string): Promise<{
  name: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  employeeCount: number | null;
  industry: string | null;
} | null> {
  try {
    const url = `/api/roof-scan?action=apollo-enrich&domain=${encodeURIComponent(domain)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || data.error) return null;

    return {
      name: data.name || null,
      phone: data.phone || null,
      email: data.email || null,
      linkedin: data.linkedin || null,
      employeeCount: data.employeeCount || null,
      industry: data.industry || null,
    };
  } catch {
    return null;
  }
}

// ===== Helpers =====

function parseBusinessStatus(status: string | undefined): BusinessLicense['status'] {
  if (!status) return 'unknown';
  const lower = status.toLowerCase();
  if (lower.includes('activ') || lower.includes('vigent')) return 'active';
  if (lower.includes('inactiv') || lower.includes('cancelad')) return 'inactive';
  if (lower.includes('suspend')) return 'suspended';
  return 'unknown';
}
