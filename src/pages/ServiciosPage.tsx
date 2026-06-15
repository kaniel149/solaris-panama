import { useState, type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ChevronRight,
  Phone,
  CheckCircle2,
  Home,
  Building2,
  Wifi,
  Wrench,
  DollarSign,
  Shield,
  Zap,
  Clock,
} from 'lucide-react';
import { Button, SectionHeader } from '../components/marketing';
import {
  SEOHead,
  serviceSchema,
  breadcrumbSchema,
  pageBreadcrumb,
  faqSchema,
  PANAMA_FAQS_ES,
} from '../components/seo';

const WHATSAPP_NUMBER = '50765831822';
const WHATSAPP_PREFILL =
  'Hola Solaris, quiero cotizar un sistema solar. ¿Me pueden ayudar?';

// ─── Motion variants (premium reveal — bustan parity) ────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const revealViewport = { once: true, margin: '-80px' } as const;

// ─── Service data (Spanish — real Panama specs, preserved from prior page) ────
type Servicio = {
  id: string;
  icon: typeof Home;
  titulo: string;
  subtitulo: string;
  desc: string;
  detalles: string[];
  ejemplo: {
    factura: string;
    sistema: string;
    inversion: string;
    payback: string;
    ahorro25: string;
  };
  cta: string;
};

const servicios: Servicio[] = [
  {
    id: 'residencial',
    icon: Home,
    titulo: 'Solar Residencial',
    subtitulo: 'Para tu hogar en Azuero',
    desc: 'Sistemas de 3 a 20 kWp diseñados para hogares unifamiliares, fincas y propiedades en la Península de Azuero. Instalación en un día, ahorro desde el primer mes.',
    detalles: [
      'Sistemas 3-20 kWp (30-200 paneles)',
      'Ahorro promedio: 70-100% de la factura',
      'Retorno de inversión: 3-5 años',
      'Garantía de paneles: 25 años',
      'Garantía de inversor: 10 años',
      'Monitoreo remoto en tiempo real',
    ],
    ejemplo: {
      factura: '$280/mes',
      sistema: '10 kWp',
      inversion: '$12,500',
      payback: '3.8 años',
      ahorro25: '$73,500',
    },
    cta: 'Cotizar sistema residencial',
  },
  {
    id: 'comercial',
    icon: Building2,
    titulo: 'Solar Comercial',
    subtitulo: 'Para empresas, hoteles y negocios',
    desc: 'Sistemas de 20 a 500+ kWp para supermercados, hoteles, restaurantes, talleres y cualquier negocio con factura elevada. ROI en 3-4 años, con financiamiento disponible.',
    detalles: [
      'Sistemas 20-500+ kWp',
      'Ahorro de $3,000-$25,000 al mes',
      'Diseño a medida con estudio de sombras',
      'Trámites ante ENSA/EDEMET incluidos',
      'Financiamiento disponible sin cuota inicial',
      'Informe mensual de generación y ahorro',
    ],
    ejemplo: {
      factura: '$5,000/mes',
      sistema: '100 kWp',
      inversion: '$85,000',
      payback: '3.6 años',
      ahorro25: '$1.2M',
    },
    cta: 'Cotizar sistema comercial',
  },
  {
    id: 'off-grid',
    icon: Wifi,
    titulo: 'Solar Off-Grid',
    subtitulo: 'Independencia total de la red',
    desc: 'Sistemas autónomos con baterías de litio para propiedades sin acceso a la red eléctrica, fincas remotas, cabañas o quienes quieren independencia total del distribuidor.',
    detalles: [
      'Baterías de litio LiFePO4 (10+ años de vida)',
      'Funcionamiento 24/7 sin red eléctrica',
      'Protección total contra apagones',
      'Ideal para fincas, cabañas y casas de playa',
      'Carga de vehículos eléctricos incluida',
      'Expansión modular si crece el consumo',
    ],
    ejemplo: {
      factura: 'Sin red eléctrica',
      sistema: '8 kWp + 20 kWh batería',
      inversion: '$18,000',
      payback: 'Vs. diésel: 5 años',
      ahorro25: '$40,000+ vs. generador',
    },
    cta: 'Cotizar sistema off-grid',
  },
  {
    id: 'mantenimiento',
    icon: Wrench,
    titulo: 'Mantenimiento y Monitoreo',
    subtitulo: 'Para sistemas ya instalados',
    desc: 'Revisión anual de paneles, limpieza profesional, actualización de firmware y diagnóstico remoto. Para sistemas Solaris y de otras marcas.',
    detalles: [
      'Limpieza profesional de paneles (1-2 veces/año)',
      'Revisión de conexiones y estructura',
      'Diagnóstico remoto vía plataforma digital',
      'Reemplazo de equipos bajo garantía',
      'Disponible para sistemas de cualquier marca',
      'Plan de mantenimiento anual con descuento',
    ],
    ejemplo: {
      factura: 'Sistema existente',
      sistema: 'Cualquier tamaño',
      inversion: 'Desde $150/año',
      payback: 'Previene pérdidas del 15-25%',
      ahorro25: 'Maximiza la vida útil del sistema',
    },
    cta: 'Agendar mantenimiento',
  },
];

const proceso = [
  {
    num: '01',
    titulo: 'Contacto inicial',
    desc: 'Llamas o escribes por WhatsApp. En 5 minutos sabemos si solar es viable para ti.',
  },
  {
    num: '02',
    titulo: 'Visita técnica',
    desc: 'Vamos a tu propiedad a evaluar el techo, medir el consumo y analizar la orientación solar.',
  },
  {
    num: '03',
    titulo: 'Propuesta con números reales',
    desc: 'En 24 horas tienes una propuesta detallada: sistema, costo, ahorro mensual y payback.',
  },
  {
    num: '04',
    titulo: 'Instalación en un día',
    desc: 'Nuestro equipo instala el sistema completo. Al final del día, el sistema genera energía.',
  },
  {
    num: '05',
    titulo: 'Activación y monitoreo',
    desc: 'Tramitamos la conexión con ENSA/EDEMET y configuramos tu plataforma de monitoreo.',
  },
];

// ─── Shared marketing chrome (light premium theme) ───────────────────────────

function MarketingNav() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 border-b border-grove/10 bg-shell/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/solaris-icon.png" alt="Solaris Panamá" className="h-9 w-9" />
          <span className="font-display text-xl tracking-wide text-ink">
            SOLARIS <span className="text-base text-bustan-lagoon/80">Panamá</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/nosotros" className="rounded-lg px-3 py-2 text-sm text-ink/60 transition-colors hover:text-ink">
            {t('marketing.nav.about')}
          </Link>
          <Link to="/servicios" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink">
            {t('marketing.nav.services')}
          </Link>
          <Link to="/proyectos" className="rounded-lg px-3 py-2 text-sm text-ink/60 transition-colors hover:text-ink">
            {t('marketing.nav.projects')}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 text-sm text-ink/60 transition-colors hover:text-ink sm:flex"
          >
            <Phone className="h-4 w-4" />
            507-6583-1822
          </a>
          <Button to="/landing" size="sm" icon={null}>
            {t('marketing.nav.getQuote')}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  const { t } = useTranslation();
  return (
    <footer className="relative z-10 border-t border-grove/10 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-ink/40 sm:flex-row">
        <div className="flex items-center gap-3">
          <img src="/solaris-icon.png" alt="Solaris Panamá" className="h-5 w-5 opacity-70" />
          <span>{t('marketing.footer.tagline')}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/nosotros" className="transition-colors hover:text-ink">
            {t('marketing.nav.about')}
          </Link>
          <Link to="/proyectos" className="transition-colors hover:text-ink">
            {t('marketing.nav.projects')}
          </Link>
          <Link to="/login" className="transition-colors hover:text-ink">
            {t('marketing.nav.crm')}
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            507-6583-1822
          </a>
          <span>{t('marketing.footer.copyright')}</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ServiciosPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(0);

  function handleCotizar(servicioId: string) {
    navigate(`/landing?servicio=${servicioId}`);
  }

  const schemas = [
    serviceSchema(),
    breadcrumbSchema(pageBreadcrumb('Servicios', '/servicios')),
    faqSchema(PANAMA_FAQS_ES),
  ];

  return (
    <div className="bustan-home min-h-screen overflow-x-hidden">
      <SEOHead
        title={t('marketing.seo.servicesTitle')}
        description={t('marketing.seo.servicesDescription')}
        path="/servicios"
        schema={schemas}
      />

      <MarketingNav />

      {/* Breadcrumb */}
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <nav className="flex items-center gap-1.5 text-xs text-ink/40">
          <Link to="/" className="transition-colors hover:text-ink">
            {t('marketing.nav.home')}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink/70">{t('marketing.nav.services')}</span>
        </nav>
      </div>

      {/* ── HERO ── */}
      <section className="relative px-6 pb-16 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div
              variants={fadeUp}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-bustan-sun/30 bg-bustan-sun/10 px-4 py-1.5 text-xs font-medium text-bustan-grove"
            >
              <Zap className="h-3.5 w-3.5 text-bustan-sun" />
              {t('marketing.hero.badge')}
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display text-display-md leading-[1.08] text-ink md:text-display-xl"
            >
              Soluciones solares{' '}
              <span className="text-bustan-gradient">para cada necesidad</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/[0.66]">
              {t('marketing.services.subtitle')} Diseñamos e instalamos el sistema exacto para tu
              consumo, tu techo y tu presupuesto.
            </motion.p>
            {/* Quick nav chips */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
              {servicios.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 rounded-full border border-grove/15 bg-shell/70 px-4 py-2 text-sm text-ink/70 shadow-soft transition-all hover:-translate-y-0.5 hover:border-grove/30 hover:shadow-lift"
                  >
                    <Icon className="h-4 w-4 text-bustan-lagoon" />
                    {s.titulo}
                  </a>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── SERVICE DETAIL CARDS ── */}
      <section className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {servicios.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.id}
              id={s.id}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              className="overflow-hidden rounded-card border border-grove/12 bg-shell/82 shadow-soft backdrop-blur-xl transition-all duration-300 hover:shadow-lift"
            >
              <div className="grid gap-0 md:grid-cols-[1fr_320px]">
                {/* Main */}
                <div className="p-8">
                  <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bustan-lagoon/10 text-bustan-lagoon">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl text-ink">{s.titulo}</h2>
                      <p className="text-sm font-medium text-bustan-lagoon">{s.subtitulo}</p>
                    </div>
                  </div>

                  <p className="mb-6 text-sm leading-relaxed text-ink/[0.66]">{s.desc}</p>

                  <div className="mb-6 grid gap-2 sm:grid-cols-2">
                    {s.detalles.map((d) => (
                      <div key={d} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-bustan-lagoon" />
                        <span className="text-xs text-ink/70">{d}</span>
                      </div>
                    ))}
                  </div>

                  <Button onClick={() => handleCotizar(s.id)} size="md" icon={null}>
                    {s.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* ROI example */}
                <div className="flex flex-col justify-center gap-4 border-t border-grove/10 bg-bustan-mist/40 p-6 md:border-l md:border-t-0">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-bustan-lagoon">
                    Ejemplo típico
                  </div>
                  <div className="space-y-3">
                    <RoiRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Factura actual" value={s.ejemplo.factura} />
                    <RoiRow icon={<Zap className="h-3.5 w-3.5" />} label="Sistema" value={s.ejemplo.sistema} />
                    <RoiRow icon={<Shield className="h-3.5 w-3.5" />} label="Inversión" value={s.ejemplo.inversion} />
                    <RoiRow icon={<Clock className="h-3.5 w-3.5" />} label="Payback" value={s.ejemplo.payback} valueClass="text-bustan-lagoon" />
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-ink/50">Ahorro total 25 años</span>
                      <span className="text-base font-bold text-bustan-grove">{s.ejemplo.ahorro25}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* ── PROCESS TIMELINE ── */}
      <section className="px-6 py-24" id="proceso">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            tag={t('marketing.process.sectionTag')}
            title="Cómo funciona el proceso"
            subtitle="De la primera llamada a energía generando en tu techo — sin complicaciones."
          />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-5"
          >
            {proceso.map((p) => (
              <motion.div
                key={p.num}
                variants={fadeUp}
                className="flex flex-col items-center gap-4 rounded-card border border-grove/10 bg-shell/70 px-5 py-7 text-center shadow-soft"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bustan-grove text-base font-bold text-bustan-shell shadow-lift">
                  {p.num}
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-ink">{p.titulo}</h3>
                  <p className="text-xs leading-relaxed text-ink/[0.55]">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <p className="mt-10 text-center text-sm text-ink/[0.55]">
            {t('marketing.process.statsLine')}
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-24" id="faq">
        <div className="mx-auto max-w-3xl">
          <SectionHeader
            tag={t('marketing.faq.sectionTag')}
            title={t('marketing.faq.title')}
            subtitle={t('marketing.faq.subtitle')}
          />
          <div className="mt-12 flex flex-col gap-3">
            {PANAMA_FAQS_ES.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={item.question}
                  className="overflow-hidden rounded-card border border-grove/12 bg-shell/70 shadow-soft"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-semibold text-ink">{item.question}</span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="shrink-0 text-bustan-lagoon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </motion.span>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-ink/[0.66]">{item.answer}</p>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-card border border-grove/12 bg-shell/82 p-10 text-center shadow-lift backdrop-blur-2xl md:p-14">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-bustan-lagoon/10 blur-3xl" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-bustan-lagoon/20 bg-bustan-lagoon/10 px-3 py-1.5 text-xs font-medium text-bustan-lagoon">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('marketing.cta.urgency')}
              </div>
              <h2 className="font-display text-display-sm text-ink md:text-display-md">
                ¿Qué servicio necesitas?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-ink/[0.6]">
                Cuéntanos tu situación y te diremos exactamente qué sistema funciona mejor para tu
                consumo y tu presupuesto.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button to="/landing" size="lg" icon={null}>
                  {t('marketing.cta.ctaPrimary')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="lg"
                >
                  {t('marketing.cta.ctaWhatsapp')}
                </Button>
                <Button href="tel:+50765831822" variant="secondary" size="lg" icon={<Phone className="h-4 w-4" />}>
                  {t('marketing.cta.ctaCall')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
      {/* Global segment-aware StickyWhatsApp is mounted once in App.tsx. */}
    </div>
  );
}

// ─── Small helper (local) ────────────────────────────────────────────────────
function RoiRow({
  icon,
  label,
  value,
  valueClass = 'text-ink',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-grove/10 py-2">
      <span className="flex items-center gap-1.5 text-xs text-ink/50">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
