import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PUBLIC_CONFIG } from '@/config/public';

/**
 * Single source of truth for the Panama WhatsApp line.
 * Reads VITE_PUBLIC_WHATSAPP_PHONE via PUBLIC_CONFIG (same as the rest of the site);
 * falls back to the real Solaris Panama line if the env var is missing/placeholder.
 */
const FALLBACK_NUMBER = '50765831822';
const WHATSAPP_NUMBER =
  PUBLIC_CONFIG.whatsappPhone && PUBLIC_CONFIG.whatsappPhone !== '50700000000'
    ? PUBLIC_CONFIG.whatsappPhone
    : FALLBACK_NUMBER;

type Segment = 'comercial' | 'residencial' | 'default';
type Lang = 'es' | 'en' | 'he';

/** Decide the audience segment from the current route (Spanish slugs first). */
function segmentFor(pathname: string): Segment {
  const p = pathname.toLowerCase();
  // Commercial / industrial intent
  if (/(comercial|industrial|fabrica|f[aá]brica|empresa|negocio|resort|hotel|factura|bill|ppa|epc)/.test(p))
    return 'comercial';
  // Residential / home intent
  if (/(residencial|casa|hogar|vivienda|villa|bateria|bater[ií]a|home|residential)/.test(p))
    return 'residencial';
  return 'default';
}

const LABELS: Record<Segment, Record<Lang, string>> = {
  comercial: {
    es: '¿Solar para tu empresa? Escríbenos',
    en: 'Solar for your business? Chat',
    he: 'סולארי לעסק? דברו איתנו',
  },
  residencial: {
    es: '¿Solar para tu hogar? Escríbenos',
    en: 'Solar for your home? Chat',
    he: 'סולארי לבית? דברו איתנו',
  },
  default: {
    es: 'Escríbenos por WhatsApp',
    en: 'Chat on WhatsApp',
    he: 'דברו איתנו ב-WhatsApp',
  },
};

const PREFILL: Record<Segment, Record<Lang, string>> = {
  comercial: {
    es: 'Hola Solaris, quiero información sobre energía solar para mi empresa o local comercial.',
    en: 'Hi Solaris, I would like information about solar energy for my business or commercial site.',
    he: 'שלום Solaris, אשמח למידע על אנרגיה סולארית לעסק שלי.',
  },
  residencial: {
    es: 'Hola Solaris, quiero información sobre paneles solares para mi casa.',
    en: 'Hi Solaris, I would like information about solar panels for my home.',
    he: 'שלום Solaris, אשמח למידע על פאנלים סולאריים לבית.',
  },
  default: {
    es: 'Hola Solaris, quiero conocer mis opciones de energía solar.',
    en: 'Hi Solaris, I would like to learn about my solar options.',
    he: 'שלום Solaris, אשמח להכיר את אפשרויות האנרגיה הסולארית.',
  },
};

/** App / CRM / auth surfaces where the marketing CTA must never appear. */
const HIDDEN_ROUTES =
  /^\/(dashboard|crm-leads|projects|clients|proposals|calendar|monitoring|tools|leads|settings|mapa-comercial|login|admin|crm|platform)(\/|$)/;

/**
 * Floating, segment-aware WhatsApp CTA for the Panama marketing site.
 * The prefilled message + label adapt to the page the visitor is on
 * (comercial vs. residencial vs. generic). Hidden on app/CRM/login routes.
 */
export function StickyWhatsApp() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();

  // Never show on internal app surfaces.
  if (HIDDEN_ROUTES.test(pathname)) return null;

  const rawLang = (i18n.language || 'es').slice(0, 2).toLowerCase();
  const lang: Lang = rawLang === 'en' ? 'en' : rawLang === 'he' ? 'he' : 'es';

  const segment = segmentFor(pathname);
  const label = LABELS[segment][lang] ?? LABELS[segment].es;
  const prefill = PREFILL[segment][lang] ?? PREFILL[segment].es;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(prefill)}`;

  const onClick = () => {
    try {
      // Fire-and-forget analytics if PostHog is present.
      (
        window as unknown as { posthog?: { capture?: (e: string, p?: unknown) => void } }
      ).posthog?.capture?.('whatsapp_click', { segment, path: pathname });
      // Mirror to gtag if Panama's GA4 stack is loaded.
      (
        window as unknown as { gtag?: (...args: unknown[]) => void }
      ).gtag?.('event', 'whatsapp_click', { segment, page_path: pathname });
    } catch {
      /* no-op */
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={label}
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-0 rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] transition-all duration-300 hover:shadow-[0_14px_38px_rgba(37,211,102,0.6)] sm:bottom-6 sm:right-6"
    >
      {/* Icon — always visible, 56px tap target */}
      <span className="relative grid h-14 w-14 place-items-center">
        <span
          className="absolute inline-flex h-14 w-14 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s]"
          aria-hidden
        />
        <svg viewBox="0 0 32 32" className="relative h-7 w-7 fill-current" aria-hidden>
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.13 6.744 3.05 9.38L1.05 31.3l6.116-1.954A15.9 15.9 0 0 0 16.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0Zm9.31 22.59c-.386 1.09-1.92 1.994-3.142 2.258-.836.178-1.928.32-5.604-1.204-4.7-1.948-7.726-6.724-7.962-7.034-.226-.31-1.9-2.53-1.9-4.826 0-2.296 1.166-3.426 1.636-3.906.386-.394.846-.574 1.36-.574.165 0 .314.008.448.015.39.017.586.04.844.656.32.77 1.1 2.69 1.193 2.884.094.194.157.42.03.73-.12.31-.226.453-.45.72-.226.266-.43.47-.656.756-.21.25-.446.52-.187.97.26.44 1.156 1.906 2.48 3.086 1.71 1.523 3.114 1.996 3.62 2.21.376.157.823.12 1.097-.18.347-.386.776-1.026 1.21-1.656.31-.45.7-.504 1.11-.35.42.146 2.65 1.25 3.106 1.476.456.226.756.336.87.524.115.187.115 1.09-.27 2.18Z" />
        </svg>
      </span>
      {/* Label — expands on hover (desktop); compact pill on touch */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap pr-0 text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[260px] group-hover:pr-5 group-hover:opacity-100">
        {label}
      </span>
    </a>
  );
}

export default StickyWhatsApp;
