import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ChevronRight,
  Phone,
  CheckCircle2,
  MapPin,
  Zap,
  DollarSign,
  Calendar,
  Sun,
} from 'lucide-react';
import { Button, SectionHeader } from '../components/marketing';
import {
  SEOHead,
  serviceSchema,
  breadcrumbSchema,
  pageBreadcrumb,
  projectListSchema,
} from '../components/seo';

const WHATSAPP_NUMBER = '50765831822';
const WHATSAPP_PREFILL =
  'Hola Solaris, vi sus proyectos y quiero cotizar un sistema solar para mi propiedad.';

// ─── Motion variants ─────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const revealViewport = { once: true, margin: '-80px' } as const;

// ─── Project data (Spanish — real Panama installations, preserved) ───────────
type TipoProyecto = 'Residencial' | 'Comercial' | 'Off-Grid';

interface Proyecto {
  id: string;
  titulo: string;
  ubicacion: string;
  tipo: TipoProyecto;
  anio: string;
  potencia: string;
  facturaAntes: string;
  facturaDespues: string;
  ahorro: string;
  payback: string;
  paneles: string;
  descripcion: string;
  tags: string[];
}

const proyectos: Proyecto[] = [
  {
    id: 'pedasi-familia',
    titulo: 'Casa familiar en Pedasí',
    ubicacion: 'Pedasí, Los Santos',
    tipo: 'Residencial',
    anio: '2024',
    potencia: '10 kWp',
    facturaAntes: '$280/mes',
    facturaDespues: '$35/mes',
    ahorro: '$2,940/año',
    payback: '3.8 años',
    paneles: '24 paneles 415W',
    descripcion:
      'Familia de 4 personas con piscina y aire acondicionado central. El sistema cubre el 88% del consumo mensual. En temporada seca genera excedentes que se venden a la red vía net metering.',
    tags: ['Net metering', 'Piscina', 'A/C'],
  },
  {
    id: 'chitre-restaurante',
    titulo: 'Restaurante en Chitré',
    ubicacion: 'Chitré, Herrera',
    tipo: 'Comercial',
    anio: '2024',
    potencia: '30 kWp',
    facturaAntes: '$1,100/mes',
    facturaDespues: '$180/mes',
    ahorro: '$11,040/año',
    payback: '3.2 años',
    paneles: '72 paneles 415W',
    descripcion:
      'Restaurante con alta demanda por refrigeración y aires acondicionados. La instalación en techo plano de concreto se completó en 2 días. ROI excepcional por las altas horas de operación diurna.',
    tags: ['Techo plano', 'Refrigeración', 'Comercial'],
  },
  {
    id: 'las-tablas-finca',
    titulo: 'Finca ganadera en Las Tablas',
    ubicacion: 'Las Tablas, Los Santos',
    tipo: 'Off-Grid',
    anio: '2023',
    potencia: '15 kWp + 30 kWh batería',
    facturaAntes: 'Sin red eléctrica',
    facturaDespues: '$0/mes',
    ahorro: 'vs. generador: $1,800/año',
    payback: '6 años (vs. generador)',
    paneles: '36 paneles 415W + LiFePO4',
    descripcion:
      'Finca de 200 hectáreas sin acceso a la red de ENSA. El generador diésel consumía 200 litros semanales. El sistema solar eliminó ese costo y aporta electricidad estable para bombas de agua, refrigeración de vacunas e iluminación.',
    tags: ['Off-grid', 'Baterías', 'Bomba de agua'],
  },
  {
    id: 'pedasi-playa',
    titulo: 'Casa de playa en Playa Venao',
    ubicacion: 'Playa Venao, Los Santos',
    tipo: 'Residencial',
    anio: '2024',
    potencia: '8 kWp',
    facturaAntes: '$195/mes',
    facturaDespues: '$22/mes',
    ahorro: '$2,076/año',
    payback: '4.1 años',
    paneles: '20 paneles 400W',
    descripcion:
      'Casa de vacaciones usada principalmente los fines de semana y temporada alta. Orientación perfecta al sur. En temporada seca genera suficiente excedente para cubrir varios meses de mínimo de tarifa.',
    tags: ['Casa vacacional', 'Net metering', 'Orientación óptima'],
  },
  {
    id: 'los-santos-hotel',
    titulo: 'Hotel boutique en la Península',
    ubicacion: 'Los Santos, Panamá',
    tipo: 'Comercial',
    anio: '2025',
    potencia: '60 kWp',
    facturaAntes: '$2,800/mes',
    facturaDespues: '$350/mes',
    ahorro: '$29,400/año',
    payback: '2.9 años',
    paneles: '144 paneles 420W',
    descripcion:
      'Hotel de 20 habitaciones con alberca, restaurante y spa. Instalación en dos fases: techos de habitaciones y estacionamiento con estructura especial. El propietario recupera la inversión en menos de 3 años.',
    tags: ['Hotel', 'Multi-techo', 'Alta demanda'],
  },
  {
    id: 'divisa-taller',
    titulo: 'Taller mecánico en Divisa',
    ubicacion: 'Divisa, Herrera',
    tipo: 'Comercial',
    anio: '2023',
    potencia: '20 kWp',
    facturaAntes: '$680/mes',
    facturaDespues: '$95/mes',
    ahorro: '$7,020/año',
    payback: '3.5 años',
    paneles: '48 paneles 415W',
    descripcion:
      'Taller mecánico con compresores, elevadores y equipos de soldadura. Alta demanda en horas pico de la mañana. El sistema reduce la factura en 86% y protege contra los frecuentes cortes de luz en la zona.',
    tags: ['Industrial', 'Demanda alta', 'Compresores'],
  },
];

const tipoColors: Record<TipoProyecto, string> = {
  Residencial: 'text-bustan-lagoon border-bustan-lagoon/25 bg-bustan-lagoon/10',
  Comercial: 'text-bustan-grove border-bustan-grove/25 bg-bustan-grove/10',
  'Off-Grid': 'text-[#0f7a3d] border-[#0f7a3d]/25 bg-[#0f7a3d]/10',
};

const summaryStats = [
  { value: '150+', label: 'Sistemas instalados' },
  { value: '$2.1M', label: 'Ahorro generado a clientes' },
  { value: '3.8 años', label: 'Payback promedio' },
  { value: '25 años', label: 'Garantía de paneles' },
];

const zonas = [
  'Pedasí', 'Chitré', 'Las Tablas', 'Los Santos', 'Divisa',
  'Tonosí', 'Playa Venao', 'Azuero', 'Herrera', 'Ocú', 'Guararé',
];

// ─── Shared marketing chrome ─────────────────────────────────────────────────

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
          <Link to="/servicios" className="rounded-lg px-3 py-2 text-sm text-ink/60 transition-colors hover:text-ink">
            {t('marketing.nav.services')}
          </Link>
          <Link to="/proyectos" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink">
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
          <Link to="/servicios" className="transition-colors hover:text-ink">
            {t('marketing.nav.services')}
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

export default function ProyectosPage() {
  const { t } = useTranslation();

  const schemas = [
    serviceSchema(),
    breadcrumbSchema(pageBreadcrumb('Proyectos', '/proyectos')),
    projectListSchema(
      proyectos.map((p) => ({
        name: p.titulo,
        location: p.ubicacion,
        description: p.descripcion,
      }))
    ),
  ];

  return (
    <div className="bustan-home min-h-screen overflow-x-hidden">
      <SEOHead
        title={t('marketing.seo.projectsTitle')}
        description={t('marketing.seo.projectsDescription')}
        path="/proyectos"
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
          <span className="text-ink/70">{t('marketing.nav.projects')}</span>
        </nav>
      </div>

      {/* ── HERO ── */}
      <section className="relative px-6 pb-12 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div
              variants={fadeUp}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-bustan-sun/30 bg-bustan-sun/10 px-4 py-1.5 text-xs font-medium text-bustan-grove"
            >
              <Sun className="h-3.5 w-3.5 text-bustan-sun" />
              150+ proyectos completados en Azuero
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display text-display-md leading-[1.08] text-ink md:text-display-xl"
            >
              Proyectos reales,{' '}
              <span className="text-bustan-gradient">resultados reales</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/[0.66]">
              Aquí no hay imágenes de stock ni números inventados. Estos son sistemas que instalamos en
              la Península de Azuero, con sus especificaciones exactas y los ahorros documentados.
            </motion.p>
          </motion.div>

          {/* Summary stats */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {summaryStats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="flex flex-col items-center gap-1.5 rounded-card border border-grove/12 bg-shell/70 px-4 py-5 shadow-soft"
              >
                <span className="font-display text-2xl text-bustan-grove">{stat.value}</span>
                <span className="text-center text-[11px] text-ink/[0.55]">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PROJECTS GRID ── */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            className="grid gap-6 md:grid-cols-2"
          >
            {proyectos.map((p) => (
              <motion.div
                key={p.id}
                variants={fadeUp}
                className="overflow-hidden rounded-card border border-grove/12 bg-shell/82 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                {/* Header */}
                <div className="border-b border-grove/10 px-6 pb-4 pt-6">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg text-ink">{p.titulo}</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-ink/[0.5]">
                        <MapPin className="h-3.5 w-3.5" />
                        {p.ubicacion}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tipoColors[p.tipo]}`}>
                        {p.tipo}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-ink/40">
                        <Calendar className="h-3 w-3" />
                        {p.anio}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-bustan-lagoon">
                    <Zap className="h-3.5 w-3.5" />
                    {p.potencia} — {p.paneles}
                  </div>
                </div>

                {/* ROI metrics */}
                <div className="grid grid-cols-3 divide-x divide-grove/10 border-b border-grove/10">
                  <div className="px-4 py-4 text-center">
                    <div className="mb-1 text-xs text-ink/40">Antes</div>
                    <div className="text-sm font-bold text-bustan-papaya">{p.facturaAntes}</div>
                  </div>
                  <div className="px-4 py-4 text-center">
                    <div className="mb-1 text-xs text-ink/40">Después</div>
                    <div className="text-sm font-bold text-bustan-lagoon">{p.facturaDespues}</div>
                  </div>
                  <div className="px-4 py-4 text-center">
                    <div className="mb-1 text-xs text-ink/40">Payback</div>
                    <div className="text-sm font-bold text-bustan-grove">{p.payback}</div>
                  </div>
                </div>

                {/* Description + tags */}
                <div className="px-6 py-5">
                  <p className="mb-4 text-xs leading-relaxed text-ink/[0.6]">{p.descripcion}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {p.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-grove/12 bg-bustan-mist/40 px-2.5 py-1 text-[10px] font-medium text-ink/[0.55]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-bustan-grove">
                      <DollarSign className="h-3.5 w-3.5" />
                      {p.ahorro}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SERVICE ZONES ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            tag="Cobertura"
            title="Zonas de servicio"
            subtitle="Instalamos en toda la Península de Azuero y zonas aledañas."
          />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            className="mt-12 flex flex-wrap justify-center gap-3"
          >
            {zonas.map((zona) => (
              <motion.div
                key={zona}
                variants={fadeUp}
                className="flex items-center gap-2 rounded-full border border-grove/12 bg-shell/70 px-4 py-2 text-sm text-ink/70 shadow-soft"
              >
                <MapPin className="h-3.5 w-3.5 text-bustan-lagoon" />
                {zona}
              </motion.div>
            ))}
          </motion.div>
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
                Tu proyecto podría ser el próximo en este portafolio
              </div>
              <h2 className="font-display text-display-sm text-ink md:text-display-md">
                ¿Listo para empezar?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-ink/[0.6]">
                Solicita tu cotización gratuita hoy. En 24 horas tendrás los números exactos de tu
                sistema y tu ahorro proyectado.
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
