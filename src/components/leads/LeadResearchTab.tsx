import {
  Phone, User, ExternalLink, Shield, Briefcase,
  Building2, Users, Search, MessageCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ConfidenceScore } from '@/components/scanner/ConfidenceScore';
import {
  buildWhatsAppUrl,
  buildCallUrl,
  formatPanamaPhone,
} from '@/services/ownerResearchService';
import type { Lead } from '@/types/lead';

function getBusinessStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-[#10b981]/10 text-[#10b981]';
    case 'inactive': return 'bg-[#ef4444]/10 text-[#ef4444]';
    case 'suspended': return 'bg-[#f59e0b]/10 text-[#f59e0b]';
    default: return 'bg-[#555566]/10 text-[#555566]';
  }
}

interface LeadResearchTabProps {
  lead: Lead;
  isResearching: boolean;
  isEnriching: boolean;
  onResearchOwner: () => void;
  onEnrich: () => void;
}

export function LeadResearchTab({
  lead,
  isResearching,
  isEnriching,
  onResearchOwner,
  onEnrich,
}: LeadResearchTabProps) {
  const e = lead.enrichment;
  const hasResearch = e && (e.confidenceScore != null && e.confidenceScore > 0);

  // No enrichment at all
  if (!e) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6]/10 flex items-center justify-center">
          <Search className="w-8 h-8 text-[#8b5cf6]" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-semibold text-[#f0f0f5]">No Research Data</h3>
          <p className="text-sm text-[#555570] max-w-md">
            Run Google Places enrichment first, then deep research to find owner information, business licenses, and corporate records.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            icon={<Search className="w-4 h-4" />}
            loading={isEnriching}
            onClick={onEnrich}
          >
            Enrich with Google Places
          </Button>
          <Button
            variant="secondary"
            icon={<Search className="w-4 h-4" />}
            loading={isResearching}
            onClick={onResearchOwner}
          >
            Deep Research
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Confidence Score + Sources + Re-run */}
      <div className="flex items-start gap-5">
        {hasResearch && (
          <GlassCard padding="md" className="flex-1">
            <ConfidenceScore
              score={e.confidenceScore!}
              sourcesWithData={e.enrichmentSources?.filter(s => s.found).length ?? 0}
              totalSources={e.enrichmentSources?.length ?? 0}
              size="lg"
            />
            {e.enrichmentSources && e.enrichmentSources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {e.enrichmentSources.map((src) => (
                  <span
                    key={src.source}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      src.found
                        ? 'bg-[#10b981]/10 text-[#10b981]'
                        : 'bg-white/[0.03] text-[#555566]'
                    }`}
                  >
                    {src.source.replace(/_/g, ' ')}
                    {src.found ? ` (${src.dataPoints.length})` : ''}
                  </span>
                ))}
              </div>
            )}
          </GlassCard>
        )}
        <div className="flex flex-col gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={<Search className="w-4 h-4" />}
            loading={isResearching}
            onClick={onResearchOwner}
          >
            Re-run Deep Research
          </Button>
          {!e.businessName && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Search className="w-4 h-4" />}
              loading={isEnriching}
              onClick={onEnrich}
            >
              Re-enrich Google Places
            </Button>
          )}
        </div>
      </div>

      {/* 3-column grid: Contact, Cadastre, Business License */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Contact Info */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#00ffcc]" />
            Contact Info
          </h3>
          <div className="space-y-3">
            {e.ownerName && (
              <div>
                <div className="text-[11px] text-[#555570]">Owner / Occupant</div>
                <div className="text-sm text-[#f0f0f5] font-medium">{e.ownerName}</div>
              </div>
            )}
            {e.businessName && (
              <div>
                <div className="text-[11px] text-[#555570]">Business Name</div>
                <div className="text-sm text-[#f0f0f5] font-medium">{e.businessName}</div>
              </div>
            )}
            {e.phone && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-[#555570]">Phone</div>
                  <div className="text-sm text-[#f0f0f5]">{formatPanamaPhone(e.phone)}</div>
                </div>
                <div className="flex gap-1.5">
                  <a
                    href={buildWhatsAppUrl(e.phone, e.businessName || undefined)}
                    target="_blank"
                    rel="noopener"
                    className="p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  </a>
                  <a
                    href={buildCallUrl(e.phone)}
                    className="p-1.5 rounded-lg bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 transition-colors"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#0ea5e9]" />
                  </a>
                </div>
              </div>
            )}
            {e.email && (
              <div>
                <div className="text-[11px] text-[#555570]">Email</div>
                <a href={`mailto:${e.email}`} className="text-sm text-[#0ea5e9] hover:underline">
                  {e.email}
                </a>
              </div>
            )}
            {e.website && (
              <div>
                <div className="text-[11px] text-[#555570]">Website</div>
                <a
                  href={e.website.startsWith('http') ? e.website : `https://${e.website}`}
                  target="_blank"
                  rel="noopener"
                  className="text-sm text-[#0ea5e9] hover:underline truncate block"
                >
                  {e.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {e.address && (
              <div>
                <div className="text-[11px] text-[#555570]">Address</div>
                <div className="text-sm text-[#c0c0d0]">{e.address}</div>
              </div>
            )}
            {e.socialMedia && (
              <div className="flex gap-2 flex-wrap pt-1">
                {e.socialMedia.facebook && (
                  <a href={e.socialMedia.facebook} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors">
                    Facebook
                  </a>
                )}
                {e.socialMedia.instagram && (
                  <a href={e.socialMedia.instagram} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/20 transition-colors">
                    Instagram
                  </a>
                )}
                {e.socialMedia.linkedin && (
                  <a href={e.socialMedia.linkedin} target="_blank" rel="noopener" className="px-2.5 py-1 text-[11px] rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors">
                    LinkedIn
                  </a>
                )}
              </div>
            )}
            {e.rating != null && e.rating > 0 && (
              <div>
                <div className="text-[11px] text-[#555570]">Google Rating</div>
                <div className="text-sm text-[#f59e0b] font-medium">{e.rating.toFixed(1)} / 5</div>
              </div>
            )}
            {!e.ownerName && !e.businessName && !e.phone && !e.email && (
              <p className="text-xs text-[#555570]">No contact info found</p>
            )}
          </div>
        </GlassCard>

        {/* Column 2: Cadastre */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#f59e0b]" />
            Cadastre / Property
          </h3>
          {e.cadastre ? (
            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-[#555570]">Finca Number</div>
                <div className="text-sm text-[#f0f0f5] font-medium font-mono">{e.cadastre.fincaNumber}</div>
              </div>
              {e.cadastre.parcelArea > 0 && (
                <div>
                  <div className="text-[11px] text-[#555570]">Parcel Area</div>
                  <div className="text-sm text-[#c0c0d0]">{new Intl.NumberFormat('en-US').format(e.cadastre.parcelArea)} m²</div>
                </div>
              )}
              {e.cadastre.landUse && e.cadastre.landUse !== 'unknown' && (
                <div>
                  <div className="text-[11px] text-[#555570]">Land Use</div>
                  <div className="text-sm text-[#c0c0d0] capitalize">{e.cadastre.landUse}</div>
                </div>
              )}
              {e.cadastre.assessedValue != null && e.cadastre.assessedValue > 0 && (
                <div>
                  <div className="text-[11px] text-[#555570]">Assessed Value</div>
                  <div className="text-sm text-[#c0c0d0]">
                    ${new Intl.NumberFormat('en-US').format(e.cadastre.assessedValue)}
                  </div>
                </div>
              )}
              {(e.registroPublicoUrl || e.cadastre.registroPublicoUrl) && (
                <a
                  href={e.registroPublicoUrl || e.cadastre.registroPublicoUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 text-xs text-[#0ea5e9] hover:underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  View in Registro Publico
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#555570]">No cadastre data found</p>
          )}
        </GlassCard>

        {/* Column 3: Business License */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[#0ea5e9]" />
            Business License
          </h3>
          {e.businessLicense ? (
            <div className="space-y-3">
              {e.businessLicense.commercialName && (
                <div>
                  <div className="text-[11px] text-[#555570]">Commercial Name</div>
                  <div className="text-sm text-[#f0f0f5] font-medium">{e.businessLicense.commercialName}</div>
                </div>
              )}
              {e.businessLicense.legalName && (
                <div>
                  <div className="text-[11px] text-[#555570]">Legal Name</div>
                  <div className="text-sm text-[#c0c0d0]">{e.businessLicense.legalName}</div>
                </div>
              )}
              {e.businessLicense.avisoNumber && (
                <div>
                  <div className="text-[11px] text-[#555570]">Aviso de Operacion</div>
                  <div className="text-sm text-[#c0c0d0] font-mono">{e.businessLicense.avisoNumber}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] text-[#555570]">Status</div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${getBusinessStatusColor(e.businessLicense.status)}`}>
                  {e.businessLicense.status}
                </span>
              </div>
              {e.businessLicense.activityDescription && (
                <div>
                  <div className="text-[11px] text-[#555570]">Activity</div>
                  <div className="text-sm text-[#c0c0d0]">{e.businessLicense.activityDescription}</div>
                </div>
              )}
              {e.businessLicense.entryDate && (
                <div>
                  <div className="text-[11px] text-[#555570]">Since</div>
                  <div className="text-sm text-[#c0c0d0]">{e.businessLicense.entryDate}</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#555570]">No business license found</p>
          )}
        </GlassCard>
      </div>

      {/* Corporate Registry (full width) */}
      {e.corporateInfo && (
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#00ffcc]" />
            Corporate Registry
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-[11px] text-[#555570]">Company Name</div>
              <div className="text-sm text-[#f0f0f5] font-medium">{e.corporateInfo.companyName}</div>
            </div>
            {e.corporateInfo.companyNumber && (
              <div>
                <div className="text-[11px] text-[#555570]">Registration #</div>
                <div className="text-sm text-[#c0c0d0] font-mono">{e.corporateInfo.companyNumber}</div>
              </div>
            )}
            {e.corporateInfo.status && (
              <div>
                <div className="text-[11px] text-[#555570]">Status</div>
                <div className="text-sm text-[#c0c0d0] capitalize">{e.corporateInfo.status}</div>
              </div>
            )}
            {e.corporateInfo.incorporationDate && (
              <div>
                <div className="text-[11px] text-[#555570]">Incorporated</div>
                <div className="text-sm text-[#c0c0d0]">{e.corporateInfo.incorporationDate}</div>
              </div>
            )}
            {e.corporateInfo.registeredAddress && (
              <div className="md:col-span-2">
                <div className="text-[11px] text-[#555570]">Registered Address</div>
                <div className="text-sm text-[#c0c0d0]">{e.corporateInfo.registeredAddress}</div>
              </div>
            )}
          </div>
          {/* Officers table */}
          {e.corporateInfo.officers.length > 0 && (
            <div>
              <h4 className="text-[11px] text-[#555570] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Officers ({e.corporateInfo.officers.length})
              </h4>
              <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="text-left py-2 px-3 text-[#555570] font-medium">Name</th>
                      <th className="text-left py-2 px-3 text-[#555570] font-medium">Role</th>
                      <th className="text-left py-2 px-3 text-[#555570] font-medium">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.corporateInfo.officers.map((officer, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="py-2 px-3 text-[#f0f0f5]">{officer.name}</td>
                        <td className="py-2 px-3 text-[#c0c0d0] capitalize">{officer.role}</td>
                        <td className="py-2 px-3 text-[#555570]">{officer.startDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
