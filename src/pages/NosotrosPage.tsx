import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ChevronRight,
  Phone,
  CheckCircle2,
  Shield,
  Users,
  Award,
  MapPin,
  Zap,
  Heart,
  Sun,
} from 'lucide-react';
import { Button, SectionHeader } from '../components/marketing';
import {
  SEOHead,
  organizationSchema,
  webPageSchema,
  breadcrumbSchema,
  pageBreadcrumb,
  BASE_URL,
} from '../components/seo';

const WHATSAPP_NUMBER = '50765831822';
const WHATSAPP_PREFILL =
  'Hola Solaris, quiero conocer más sobre sus servicios de energía solar.';

// ─── Motion variants ─────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const revealViewport = { once: true, margin: '-80px' } as const;

// ─── Content data (Spanish — preserved Panama facts) ─────────────────────────
const valores = [
  {
    icon: Zap,
    titulo: 'Velocidad',
    desc: 'Propuesta en 24 horas. Instalación en un día. Sin burocracia.',
  },
  {
    icon: Shield,
    titulo: 'Transparencia',
    desc: 'Números reales, garantías claras. Sin letra pequeña ni sorpresas.',
  },
  {
    icon: Heart,
    titulo: 'Compromiso local',
    desc: 'Somos de Azuero. Conocemos la península, el clima y las necesidades de cada familia.',
  },
  {
    icon: Award,
    titulo: 'Calidad premium',
    desc: 'Solo paneles Tier-1 certificados. Inversores con 10-25 años de garantía.',
  },
];

const hitos = [
  { anio: '2019', evento: 'Fundación de Solaris Panamá en Chitré, Herrera.' },
  { anio: '2021', evento: 'Primeras 50 instalaciones residenciales en la Península de Azuero.' },
  { anio: '2023', evento: 'Expansión a proyectos comerciales. Primer sistema de 100+ kWp instalado.' },
  { anio: '2024', evento: 'Más de 150 instalaciones completadas. Certificación bajo Ley 417.' },
  { anio: '2025', evento: 'Lanzamiento de plataforma digital de monitoreo para clientes.' },
  { anio: '2026', evento: 'Expansión a toda la región de Azuero. ROI promedio de clientes: 3.8 años.' },
];

const stats = [
  { value: '150+', label: 'Instalaciones completadas' },
  { value: '95%', label: 'Clientes satisfechos' },
  { value: '7 años', label: 'Experiencia en Azuero' },
  { value: '$2,940', label: 'Ahorro anual promedio' },
];

const equipoTags = [
  'Ingenieros certificados',
  'Técnicos locales',
  'Asesores bilingües',
  'Soporte post-instalación',
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
          <Link to="/nosotros" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink">
            {t('marketing.nav.about')}
          </Link>
          <Link to="/servicios" className="rounded-lg px-3 py-2 text-sm text-ink/60 transition-colors hover:text-ink">
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
          <Link to="/servicios" className="transition-colors hover:text-ink">
            {t('marketing.nav.services')}
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

export default function NosotrosPage() {
  const { t } = useTranslation();

  const schemas = [
    organizationSchema(),
    webPageSchema({
      name: t('marketing.seo.aboutTitle'),
      description: t('marketing.seo.aboutDescription'),
      url: `${BASE_URL}/nosotros`,
    }),
    breadcrumbSchema(pageBreadcrumb('Nosotros', '/nosotros')),
  ];

  return (
    <div className="bustan-home min-h-screen overflow-x-hidden">
      <SEOHead
        title={t('marketing.seo.aboutTitle')}
        description={t('marketing.seo.aboutDescription')}
        path="/nosotros"
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
          <span className="text-ink/70">{t('marketing.nav.about')}</span>
        </nav>
      </div>

      {/* ── HERO ── */}
      <section className="relative px-6 pb-16 pt-16 md:pt-20">
        <div className="mx-auto max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.div
              variants={fadeUp}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-bustan-sun/30 bg-bustan-sun/10 px-4 py-1.5 text-xs font-medium text-bustan-grove"
            >
              <MapPin className="h-3.5 w-3.5 text-bustan-sun" />
              Fundada en Chitré, Herrera · 2019
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display text-display-md leading-[1.08] text-ink md:text-display-xl"
            >
              La empresa solar{' '}
              <span className="text-bustan-gradient">de tu vecino</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/[0.66]">
              No somos una empresa de la capital. Somos de Azuero. Conocemos el calor, las lluvias,
              las tarifas de ENSA y EDEMET, y la vida en la península. Eso nos hace diferentes.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/landing" size="lg" icon={null}>
                {t('marketing.hero.ctaPrimary')}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button to="/servicios" variant="secondary" size="lg" icon={null}>
                Ver nuestros servicios
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <section className="border-y border-grove/12 bg-shell/64 px-6 py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              className="flex flex-col items-center gap-2 text-center"
            >
              <span className="font-display text-display-sm text-bustan-grove">{stat.value}</span>
              <span className="text-xs text-ink/[0.55]">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── MISSION (split) ── */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={revealViewport}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-bustan-lagoon">
              Nuestra misión
            </p>
            <h2 className="font-display text-display-sm leading-[1.1] text-ink md:text-display-md">
              Energía solar accesible para cada familia de Azuero
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink/[0.66]">
              Hacer que la energía solar sea accesible, simple y rentable para cada familia y empresa
              en la Península de Azuero. Sin tecnicismos, sin promesas vacías. Solo resultados reales.
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink/[0.66]">
              Creemos que cada techo en Panamá tiene el potencial de convertirse en una fuente de
              ahorro. Nuestra misión es hacer que eso ocurra — con rapidez, transparencia y garantías
              reales.
            </p>
            <div className="mt-8 space-y-3">
              {[
                'Propuesta personalizada en menos de 24 horas',
                'Instalación profesional en un solo día',
                'Monitoreo remoto incluido sin costo adicional',
                'Garantía de rendimiento por 25 años',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-bustan-lagoon" />
                  <span className="text-sm text-ink/70">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={revealViewport}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-card border border-grove/12 bg-bustan-grove p-8 text-bustan-shell shadow-lift md:p-10"
          >
            <Sun className="mb-4 h-9 w-9 text-bustan-sun" />
            <h3 className="font-display text-2xl text-bustan-shell">¿Por qué Azuero?</h3>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-bustan-shell/85">
              <p>
                La Península de Azuero recibe en promedio{' '}
                <strong className="text-bustan-sun">5.0 horas de sol pico por día</strong> — incluso en
                temporada de lluvias. Eso nos sitúa entre las mejores zonas del mundo para energía solar.
              </p>
              <p>
                Las tarifas eléctricas de ENSA y EDEMET son de las más altas de Centroamérica a nivel
                residencial. Eso hace que el retorno de inversión de un sistema solar aquí sea
                extraordinario: entre <strong className="text-bustan-sun">3 y 5 años</strong>.
              </p>
              <p>
                Además, la Ley 417 de Panamá exonera del pago de impuestos de importación a los equipos
                de energía renovable, reduciendo el costo del sistema entre un{' '}
                <strong className="text-bustan-sun">15 y 20%</strong> versus otros países.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            tag="Nuestros valores"
            title="Los principios que nos guían"
            subtitle="Cada decisión, cada instalación y cada llamada con un cliente nacen de estos valores."
          />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {valores.map((v) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.titulo}
                  variants={fadeUp}
                  className="group rounded-card border border-grove/12 bg-shell/70 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-bustan-lagoon/10 text-bustan-lagoon transition-colors group-hover:bg-bustan-lagoon/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-ink">{v.titulo}</h3>
                  <p className="text-sm leading-relaxed text-ink/[0.6]">{v.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── HISTORY TIMELINE ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            tag="Nuestra historia"
            title="De una idea en Chitré a la referencia solar de Azuero"
            subtitle="Siete años construyendo confianza, techo por techo."
          />
          <div className="relative mx-auto mt-16 max-w-2xl">
            <div className="absolute bottom-0 left-6 top-0 w-px bg-gradient-to-b from-bustan-sun/50 via-bustan-lagoon/30 to-transparent" />
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              className="space-y-8"
            >
              {hitos.map((h) => (
                <motion.div key={h.anio} variants={fadeUp} className="relative flex gap-6 pl-14">
                  <div className="absolute left-6 top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-bustan-paper bg-bustan-sun" />
                  <div>
                    <div className="mb-1 text-sm font-bold text-bustan-lagoon">{h.anio}</div>
                    <p className="text-sm leading-relaxed text-ink/70">{h.evento}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={revealViewport}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-card border border-grove/12 bg-shell/82 p-8 text-center shadow-lift backdrop-blur-xl md:p-12"
          >
            <Users className="mx-auto mb-5 h-10 w-10 text-bustan-lagoon" />
            <h2 className="font-display text-display-sm text-ink md:text-display-md">
              Un equipo local, comprometido
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink/[0.66]">
              Nuestro equipo está formado por técnicos certificados, ingenieros eléctricos y asesores
              de ventas — todos con experiencia en el mercado panameño y residentes en la Península de
              Azuero. Cuando llamas a Solaris, hablas con alguien que conoce tu zona, tu distribuidor
              eléctrico y tu situación.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-ink/[0.55]">
              {equipoTags.map((tag) => (
                <span key={tag} className="rounded-full border border-grove/15 bg-bustan-mist/40 px-3 py-1.5">
                  {tag}
                </span>
              ))}
            </div>
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
                {t('marketing.cta.urgency')}
              </div>
              <h2 className="font-display text-display-sm text-ink md:text-display-md">
                Conócenos en persona
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-ink/[0.6]">
                Visitamos tu propiedad sin costo. Te mostramos el cálculo real de ahorro y la propuesta
                completa. Sin presión.
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
