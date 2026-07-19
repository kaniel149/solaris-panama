// OwnerOsintTools — OSINT launchpad + manual owner entry.
//
// "Find the owner" is the weakest link in the scan→contact→proposal pipeline:
// Panama has no reliable free API for private property-owner names, and ANATI's
// migrated cadastre only covers Panamá province (Azuero parcels return no owner).
// Instead of pretending the automated waterfall found an owner, this gives the rep
// a fast OSINT launchpad (pre-filled external searches) PLUS a manual entry form
// that feeds straight back into the lead + proposal + WhatsApp/call flow.

import { useState } from 'react';
import { Search, ExternalLink, UserPlus, Save, Phone, Mail, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { buildWhatsAppUrl, buildCallUrl } from '@/services/ownerResearchService';

export interface ManualOwnerInput {
  ownerName: string;
  phone: string;
  email: string;
  whatsappUrl: string | null;
  callUrl: string | null;
}

interface OwnerOsintToolsProps {
  buildingName?: string;
  center: { lat: number; lng: number };
  address?: string | null;
  fincaNumber?: string | null;
  /** Called when the rep saves a manually-found owner — merges into enrichedData upstream. */
  onManualOwner: (owner: ManualOwnerInput) => void;
}

const enc = encodeURIComponent;

export function OwnerOsintTools({
  buildingName,
  center,
  address,
  fincaNumber,
  onManualOwner,
}: OwnerOsintToolsProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const query = [buildingName, address].filter(Boolean).join(' ').trim() || `${center.lat},${center.lng}`;
  const latlng = `${center.lat},${center.lng}`;
  const entity = buildingName?.trim() || query;

  // Pre-filled OSINT searches — each opens in a new tab. No API keys, no scraping.
  const links: Array<{ label: string; hint: string; url: string }> = [
    { label: 'Registro Público', hint: fincaNumber ? t('tools.scanner.osint.hintLot', { number: fincaNumber }) : t('tools.scanner.osint.hintOwner'), url: 'https://www.rpautoconsulta.gob.pa/' },
    { label: 'Google', hint: t('tools.scanner.osint.hintOwnerContact'), url: `https://www.google.com/search?q=${enc(`${query} propietario OR dueño OR contacto Panamá`)}` },
    { label: 'OpenCorporates', hint: t('tools.scanner.osint.hintCompaniesPa'), url: `https://opencorporates.com/companies/pa?q=${enc(entity)}` },
    { label: 'Panamá Emprende', hint: t('tools.scanner.osint.hintBusinessNotice'), url: 'https://www.panamaemprende.gob.pa/' },
    { label: 'Google Maps', hint: t('tools.scanner.osint.hintLocation'), url: `https://www.google.com/maps/search/?api=1&query=${enc(latlng)}` },
    { label: 'Street View', hint: t('tools.scanner.osint.hintFacade'), url: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${enc(latlng)}` },
    { label: 'LinkedIn', hint: t('tools.scanner.osint.hintCompany'), url: `https://www.linkedin.com/search/results/companies/?keywords=${enc(entity)}` },
    { label: 'Facebook', hint: t('tools.scanner.osint.hintPage'), url: `https://www.facebook.com/search/top?q=${enc(entity)}` },
  ];

  const cleanPhone = phone.replace(/\D/g, '');
  const hasPhone = cleanPhone.length >= 7;
  const canSave = name.trim().length > 1 || hasPhone;

  const handleSave = () => {
    if (!canSave) return;
    const trimmedPhone = phone.trim();
    onManualOwner({
      ownerName: name.trim(),
      phone: trimmedPhone,
      email: email.trim(),
      whatsappUrl: hasPhone ? buildWhatsAppUrl(trimmedPhone, name.trim() || buildingName) : null,
      callUrl: hasPhone ? buildCallUrl(trimmedPhone) : null,
    });
    setSaved(true);
  };

  const inputCls =
    'w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-[#f0f0f5] placeholder:text-[#555566] focus:outline-none focus:border-[#00ffcc]/40 transition-colors';

  return (
    <GlassCard padding="md">
      <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Search className="w-3.5 h-3.5 text-[#00ffcc]" />
        {t('tools.scanner.osint.title')}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-[#00ffcc]/30 transition-colors group"
          >
            <span className="min-w-0">
              <span className="block text-xs font-medium text-[#f0f0f5] truncate">{l.label}</span>
              <span className="block text-[10px] text-[#555566] truncate">{l.hint}</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-[#8888a0] group-hover:text-[#00ffcc] shrink-0" />
          </a>
        ))}
      </div>

      <div className="mt-3">
        {!showForm ? (
          <Button
            variant="secondary"
            fullWidth
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={() => setShowForm(true)}
          >
            {t('tools.scanner.osint.enterManually')}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#8b5cf6] shrink-0" />
              <input
                className={inputCls}
                placeholder={t('tools.scanner.osint.placeholderName')}
                value={name}
                onChange={(e) => { setName(e.target.value); setSaved(false); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#22c55e] shrink-0" />
              <input
                className={inputCls}
                placeholder={t('tools.scanner.osint.placeholderPhone')}
                inputMode="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#f59e0b] shrink-0" />
              <input
                className={inputCls}
                placeholder={t('tools.scanner.osint.placeholderEmail')}
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
              />
            </div>
            <Button
              variant={saved ? 'secondary' : 'accent'}
              fullWidth
              size="sm"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSave}
              disabled={!canSave}
            >
              {saved ? t('tools.scanner.osint.savedConfirmation') : t('tools.scanner.osint.saveContact')}
            </Button>
            {!canSave && (
              <p className="text-[10px] text-[#555566] text-center">{t('tools.scanner.osint.needNameOrPhone')}</p>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default OwnerOsintTools;
