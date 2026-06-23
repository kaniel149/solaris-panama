import { useRef, useEffect, useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  Sun,
  Zap,
  Shield,
  TrendingUp,
  ChevronDown,
  ArrowRight,
  Phone,
  Building2,
  Home,
  Battery,
  MapPin,
  ChevronRight,
  Factory,
  CheckCircle2,
  DollarSign,
  Wrench,
  FileText,
  Star,
  MessageCircle,
} from 'lucide-react';
import { Button } from '../components/marketing';
import { SectionHeader } from '../components/marketing';
import {
  SEOHead,
  breadcrumbSchema,
  homeBreadcrumb,
  faqSchema,
  serviceSchema,
  websiteSchema,
} from '../components/seo';

const SolarInstallationScroll = lazy(() => import('../components/SolarInstallationScroll'));

// ─── Brand constants ────────────────────────────────────────────────────────
const WHATSAPP_NUMBER =
  (import.meta.env.VITE_PUBLIC_WHATSAPP_PHONE as string | undefined) || '50765831822';
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}`;
const PHONE_DISPLAY = '507-6583-1822';
const PHONE_HREF = 'tel:+50765831822';

// Quote-request route (existing Panama lead-capture page).
const QUOTE_ROUTE = '/landing';

// ─── Animation variants ─────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const heroStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Standard scroll-reveal viewport — below-the-fold sections only.
const revealViewport = { once: true, margin: '-80px' } as const;

// Shared micro-interaction classes
const cardHover =
  'transition-all duration-300 ease-out-soft hover:-translate-y-0.5 hover:shadow-lift';
const arrowSlide = 'transition-transform duration-200 ease-out-soft group-hover:translate-x-1';

// ─── Animated counter ───────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, started = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    let frame: number;
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVBAR — premium light, on-brand
// ═══════════════════════════════════════════════════════════════════════════
function MarketingNavbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ease-out-soft ${
        scrolled
          ? 'border-b border-grove/10 bg-[rgba(255,244,226,0.86)] backdrop-blur-xl shadow-soft'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/solaris-icon.png" alt="Solaris Panamá" width={36} height={36} className="h-9 w-9" />
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-xl tracking-tight text-grove">SOLARIS</span>
            <span className="text-xs font-medium text-bustan-lagoon">Panamá</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: t('marketing.nav.about'), to: '/nosotros' },
            { label: t('marketing.nav.services'), to: '/servicios' },
            { label: t('marketing.nav.projects'), to: '/proyectos' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink/[0.62] transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={PHONE_HREF}
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink/[0.62] transition-colors hover:text-ink sm:flex"
          >
            <Phone className="h-4 w-4" aria-hidden />
            {PHONE_DISPLAY}
          </a>
          <button
            onClick={() => navigate(QUOTE_ROUTE)}
            className="flex items-center gap-1.5 rounded-button bg-bustan-sun px-5 py-2.5 text-sm font-semibold text-grove shadow-lift transition-all duration-200 ease-out-soft hover:brightness-105 active:scale-[0.98]"
          >
            {t('marketing.nav.getQuote')}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. HERO
// ═══════════════════════════════════════════════════════════════════════════
function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-0 pb-16 pt-28">
      {/* Layered gradient background (no external image dependency) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-bustan-grove" />
        <img
          src="/images/hero-panama-solar.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(0,143,138,0.45) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 80% 100%, rgba(242,184,75,0.22) 0%, transparent 60%)',
          }}
        />
        <div className="absolute inset-0 bg-grove/35" />
        {/* Fade into the warm paper canvas below */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--bustan-paper)]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,244,226,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,244,226,0.55) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Hero content — animates on mount (above the fold) */}
      <motion.div
        className="relative z-10 mx-auto max-w-4xl px-6 text-center"
        variants={heroStagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="mb-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-shell/25 bg-shell/15 px-4 py-1.5 text-sm font-medium text-shell">
            <Sun size={14} aria-hidden />
            {t('marketing.hero.badge')}
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mb-6 font-display text-display-md leading-[1.05] tracking-tight text-shell sm:text-display-lg md:text-display-xl"
        >
          {t('marketing.hero.title')}
          <br />
          <span className="text-bustan-gradient">{t('marketing.hero.titleAccent')}</span>{' '}
          <span className="text-shell/90">{t('marketing.hero.titleSuffix')}</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-shell/90 md:text-xl"
        >
          {t('marketing.hero.subtitle')}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button variant="primary" size="lg" to={QUOTE_ROUTE} className="group w-full shadow-lift sm:w-auto">
            {t('marketing.hero.ctaPrimary')}
            <ArrowRight size={18} className={arrowSlide} aria-hidden />
          </Button>

          <Button
            variant="whatsapp"
            size="lg"
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            {t('marketing.hero.ctaSecondary')}
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-shell/45 sm:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <span className="text-xs uppercase tracking-widest">Desliza</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1b. GATEWAY SPLIT — route residential vs. commercial/industrial buyers
// ═══════════════════════════════════════════════════════════════════════════
type GatewayCard = { title: string; body: string; points: string[]; cta: string };

function GatewaySplit() {
  const { t } = useTranslation();

  const residential = t('marketing.gateway.residential', { returnObjects: true }) as GatewayCard;
  const commercial = t('marketing.gateway.commercial', { returnObjects: true }) as GatewayCard;

  const cards = [
    {
      data: residential,
      to: '/servicios',
      icon: <Home size={26} strokeWidth={1.5} aria-hidden />,
      card: 'bg-white text-grove border border-grove/12',
      iconWrap: 'bg-bustan-lagoon/10 text-bustan-lagoon',
      chip: 'border-grove/12 bg-[var(--bustan-paper)] text-grove',
      cta: 'bg-bustan-lagoon text-shell',
    },
    {
      data: commercial,
      to: QUOTE_ROUTE,
      icon: <Factory size={26} strokeWidth={1.5} aria-hidden />,
      card: 'bg-grove text-shell',
      iconWrap: 'bg-shell/[0.12] text-bustan-sun',
      chip: 'border-shell/20 bg-shell/[0.08] text-shell/85',
      cta: 'bg-bustan-sun text-grove',
    },
  ];

  return (
    <section className="relative z-20 -mt-12 px-6 pb-6 md:-mt-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-bustan-lagoon">
            {t('marketing.gateway.tag')}
          </span>
          <h2 className="mx-auto mt-2 max-w-3xl font-display text-2xl leading-tight tracking-tight text-grove md:text-3xl">
            {t('marketing.gateway.title')}
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.data.title}
              to={c.to}
              className={`group flex flex-col rounded-[2rem] p-7 shadow-[0_24px_70px_rgba(36,70,62,0.16)] transition hover:-translate-y-1 md:p-9 ${c.card}`}
            >
              <div className={`mb-5 inline-grid h-14 w-14 place-items-center rounded-2xl ${c.iconWrap}`}>
                {c.icon}
              </div>
              <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{c.data.title}</h3>
              <p className="mt-3 text-sm leading-6 opacity-80">{c.data.body}</p>
              <ul className="mt-5 grid gap-2">
                {c.data.points.map((p) => (
                  <li
                    key={p}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${c.chip}`}
                  >
                    <CheckCircle2 size={15} strokeWidth={2} className="shrink-0" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <span
                className={`mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold shadow-lg transition group-hover:gap-3 ${c.cta}`}
              >
                {c.data.cta}
                <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. STATS BAR
// ═══════════════════════════════════════════════════════════════════════════
type Stat = { value: number; suffix: string; label: string };

function StatItem({
  target,
  suffix,
  label,
  started,
  icon,
}: {
  target: number;
  suffix: string;
  label: string;
  started: boolean;
  icon: React.ReactNode;
}) {
  const value = useCountUp(target, 1800, started);
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8">
      <div className="mb-1 text-ink/[0.45]">{icon}</div>
      <span className="font-display text-4xl font-bold tabular-nums text-bustan-lagoon md:text-5xl">
        {value}
        {suffix}
      </span>
      <span className="text-center text-sm text-ink/[0.6]">{label}</span>
    </div>
  );
}

function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' });
  // Fallback: never let the counters get stuck at 0 if useInView misjudges
  // (e.g. paid traffic that converts without scrolling, short viewports).
  const [forceStart, setForceStart] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setForceStart(true), 1200);
    return () => clearTimeout(id);
  }, []);
  const started = inView || forceStart;
  const { t } = useTranslation();

  const stats: Stat[] = [
    t('marketing.hero.stats.installations', { returnObjects: true }) as Stat,
    t('marketing.hero.stats.capacity', { returnObjects: true }) as Stat,
    t('marketing.hero.stats.warranty', { returnObjects: true }) as Stat,
    t('marketing.hero.stats.savings', { returnObjects: true }) as Stat,
  ];

  const icons = [
    <Home size={20} key="h" />,
    <Zap size={20} key="z" />,
    <Shield size={20} key="s" />,
    <TrendingUp size={20} key="t" />,
  ];

  return (
    <div ref={ref} className="relative overflow-hidden border-y border-grove/12 bg-shell/[0.64]">
      <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-grove/[0.14] md:grid-cols-4">
        {stats.map((stat, i) => (
          <StatItem
            key={stat.label}
            target={stat.value}
            suffix={stat.suffix}
            label={stat.label}
            started={started}
            icon={icons[i]}
          />
        ))}
      </div>
      {/* Trust line */}
      <div className="pb-6 pt-2 text-center">
        <p className="text-xs uppercase tracking-widest text-ink/[0.5]">
          {t('marketing.hero.trustLine')}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SERVICES (4 gradient cards)
// ═══════════════════════════════════════════════════════════════════════════
function ServicesSection() {
  const { t } = useTranslation();

  const services = [
    {
      icon: <Home size={24} />,
      title: t('marketing.services.residential.title'),
      description: t('marketing.services.residential.description'),
      cta: t('marketing.services.residential.cta'),
      to: '/servicios',
      accent: 'from-[#006f6b] to-[#008f8a]',
      bullets: ['Reduce tu factura eléctrica', 'Aumenta el valor de tu propiedad', 'Respaldo con baterías disponible'],
    },
    {
      icon: <Building2 size={24} />,
      title: t('marketing.services.commercial.title'),
      description: t('marketing.services.commercial.description'),
      cta: t('marketing.services.commercial.cta'),
      to: '/servicios',
      accent: 'from-[#24463e] to-[#2f5d52]',
      bullets: ['PPA — sin inversión inicial', 'Maximiza tu ROI', 'Reduce tus costos operativos'],
    },
    {
      icon: <Sun size={24} />,
      title: t('marketing.services.solarFarm.title'),
      description: t('marketing.services.solarFarm.description'),
      cta: t('marketing.services.solarFarm.cta'),
      to: '/servicios',
      accent: 'from-[#f2b84b] to-[#ffd27a]',
      bullets: ['Licenciamiento completo', 'Conexión a la red ETESA', 'Desde 1 MW en adelante'],
    },
    {
      icon: <Battery size={24} />,
      title: t('marketing.services.batteryStorage.title'),
      description: t('marketing.services.batteryStorage.description'),
      cta: t('marketing.services.batteryStorage.cta'),
      to: '/servicios',
      accent: 'from-[#2f5d52] to-[#006f6b]',
      bullets: ['Protección ante apagones', 'Energía 24/7', 'Optimización de demanda'],
    },
  ];

  const serviceImages = [
    '/images/services/01-residential.jpg',
    '/images/services/02-commercial.jpg',
    '/images/services/03-solarfarm.jpg',
    '/images/services/04-battery.jpg',
  ];

  return (
    <section className="px-6 py-24" id="services">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          tag={t('marketing.services.sectionTag')}
          title={t('marketing.services.title')}
          subtitle={t('marketing.services.subtitle')}
          className="mb-16"
        />

        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
        >
          {services.map((svc, i) => (
            <motion.div key={svc.title} variants={fadeUp}>
              <div
                className={`group relative flex h-full flex-col overflow-hidden rounded-card border border-grove/[0.14] shadow-soft hover:border-bustan-lagoon/30 ${cardHover}`}
              >
                {/* Gradient header band with icon */}
                <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${svc.accent}`}>
                  <img
                    src={serviceImages[i % serviceImages.length]}
                    alt={svc.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-grove/85 via-grove/40 to-grove/20" />
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.35) 0%, transparent 45%)',
                    }}
                  />
                  <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-xl border border-shell/40 bg-shell/[0.18] text-shell backdrop-blur-md">
                    {svc.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col bg-shell/[0.82] p-6 backdrop-blur-xl">
                  <h3 className="mb-2 text-xl font-semibold text-ink">{svc.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-ink/[0.72]">{svc.description}</p>
                  <ul className="mb-5 flex flex-col gap-1.5">
                    {svc.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-ink/[0.64]">
                        <ChevronRight size={12} className="shrink-0 text-bustan-lagoon" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={svc.to}
                    className="group mt-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-bustan-lagoon"
                  >
                    {svc.cta}
                    <ArrowRight size={14} className={arrowSlide} aria-hidden />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SCROLL ANIMATION (integrated)
// ═══════════════════════════════════════════════════════════════════════════
function ScrollAnimationSection() {
  const { t } = useTranslation();

  return (
    <section>
      {/* Header */}
      <div className="bg-gradient-to-b from-[var(--bustan-paper)] to-shell px-6 py-16">
        <SectionHeader
          tag={t('marketing.scrollAnimation.sectionTag')}
          title={t('marketing.scrollAnimation.title')}
          subtitle={t('marketing.scrollAnimation.subtitle')}
        />
      </div>

      {/* The scroll component */}
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-shell">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-grove/[0.18] border-t-bustan-lagoon" />
          </div>
        }
      >
        <SolarInstallationScroll />
      </Suspense>

      {/* Transition back to the warm site canvas */}
      <div className="h-24 bg-gradient-to-b from-shell to-[var(--bustan-paper)]" />
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. WHY SOLARIS (split layout)
// ═══════════════════════════════════════════════════════════════════════════
const whyIcons = [
  <TrendingUp size={22} key="1" />,
  <Shield size={22} key="2" />,
  <Wrench size={22} key="3" />,
  <FileText size={22} key="4" />,
  <MapPin size={22} key="5" />,
  <DollarSign size={22} key="6" />,
];

type WhyItem = { title: string; description: string };

function WhySection() {
  const { t } = useTranslation();
  const items = t('marketing.why.items', { returnObjects: true }) as WhyItem[];

  return (
    <section className="bg-gradient-to-b from-mist/[0.35] to-transparent px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          tag={t('marketing.why.sectionTag')}
          title={t('marketing.why.title')}
          subtitle={t('marketing.why.subtitle')}
          className="mb-16"
        />

        <motion.div
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
        >
          {items.map((feat, i) => (
            <motion.div key={feat.title} variants={fadeUp}>
              <div className={`flex h-full gap-5 rounded-card border border-grove/12 bg-shell/[0.76] p-6 ${cardHover}`}>
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bustan-lagoon/[0.16] bg-mist/[0.72] text-bustan-lagoon">
                  {whyIcons[i % whyIcons.length]}
                </div>
                <div>
                  <h3 className="mb-1.5 text-lg font-semibold text-ink">{feat.title}</h3>
                  <p className="text-sm leading-relaxed text-ink/[0.72]">{feat.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. PROCESS (4-step timeline)
// ═══════════════════════════════════════════════════════════════════════════
const stepNums = ['01', '02', '03', '04'];

type ProcessStep = { title: string; description: string };

function ProcessSection() {
  const { t } = useTranslation();
  const steps = t('marketing.process.steps', { returnObjects: true }) as ProcessStep[];

  return (
    <section className="px-6 py-24" id="process">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          tag={t('marketing.process.sectionTag')}
          title={t('marketing.process.title')}
          subtitle={t('marketing.process.subtitle')}
        />

        <motion.div
          className="relative mt-16 grid grid-cols-1 gap-0 md:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
        >
          {/* Connector line */}
          <div className="absolute left-[12.5%] right-[12.5%] top-[34px] hidden h-px bg-gradient-to-r from-transparent via-bustan-lagoon/[0.28] to-transparent md:block" />

          {steps.map((step, i) => (
            <motion.div
              key={stepNums[i]}
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              className="relative flex flex-col items-center px-6 pb-8 text-center md:pb-0"
            >
              {i < steps.length - 1 && (
                <div className="absolute left-1/2 top-[68px] h-full w-px -translate-x-1/2 bg-gradient-to-b from-bustan-lagoon/[0.28] to-transparent md:hidden" />
              )}
              <div className="relative z-10 mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-bustan-lagoon/[0.32] bg-shell/[0.84] font-display text-xl font-bold text-bustan-lagoon">
                {stepNums[i]}
              </div>
              <h3 className="mb-2 text-base font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink/[0.64]">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats line */}
        <div className="mt-10 text-center">
          <p className="text-sm font-semibold text-bustan-lagoon">{t('marketing.process.statsLine')}</p>
        </div>

        <div className="mt-10 flex justify-center">
          <Button variant="primary" size="lg" to={QUOTE_ROUTE} className="group w-full sm:w-auto">
            {t('marketing.process.cta')}
            <ArrowRight size={18} className={arrowSlide} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. PROJECTS GALLERY (6 items)
// ═══════════════════════════════════════════════════════════════════════════
type Project = { name: string; location: string; size: string; savings: string; type: string };

const projectAccents = [
  'from-[#24463e] to-[#2f5d52]',
  'from-[#006f6b] to-[#008f8a]',
  'from-[#2f5d52] to-[#006f6b]',
  'from-[#24463e] to-[#006f6b]',
  'from-[#006f6b] to-[#24463e]',
  'from-[#008f8a] to-[#2f5d52]',
];

const projectImages = [
  '/images/projects/01-casa.jpg',
  '/images/projects/02-hotel.jpg',
  '/images/projects/03-finca.jpg',
  '/images/projects/04-residencia.jpg',
  '/images/projects/05-bodega.jpg',
  '/images/projects/06-villa.jpg',
];

function ProjectsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = t('marketing.projects.items', { returnObjects: true }) as Project[];

  return (
    <section className="px-6 py-24" id="work">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          tag={t('marketing.projects.sectionTag')}
          title={t('marketing.projects.title')}
          subtitle={t('marketing.projects.subtitle')}
          className="mb-16"
        />

        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
        >
          {items.map((project, i) => (
            <motion.div key={project.name} variants={fadeUp}>
              <div
                className={`group relative h-full overflow-hidden rounded-card border border-grove/[0.14] shadow-soft ${cardHover}`}
              >
                {/* Gradient hero with savings + type badges */}
                <div className={`relative h-48 overflow-hidden bg-gradient-to-br ${projectAccents[i % projectAccents.length]}`}>
                  <img
                    src={projectImages[i % projectImages.length]}
                    alt={project.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-grove/90 via-grove/30 to-grove/10" />
                  <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                      backgroundSize: '32px 32px',
                    }}
                  />
                  <div className="absolute bottom-4 left-5">
                    <span className="font-display text-4xl font-bold text-shell">{project.size}</span>
                  </div>
                  {/* Savings badge */}
                  <div className="absolute right-4 top-4 rounded-full bg-bustan-sun/90 px-3 py-1 text-xs font-semibold text-grove">
                    -{project.savings} factura
                  </div>
                  {/* Type badge */}
                  <div className="absolute left-4 top-4 rounded-full border border-shell/30 bg-shell/15 px-3 py-1 text-xs font-medium text-shell backdrop-blur-md">
                    {project.type}
                  </div>
                </div>

                {/* Details */}
                <div className="bg-shell/[0.88] px-6 py-5 backdrop-blur-lg">
                  <h3 className="mb-1 text-lg font-semibold text-ink">{project.name}</h3>
                  <span className="flex items-center gap-1 text-sm text-ink/[0.64]">
                    <MapPin size={12} aria-hidden />
                    {project.location}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 flex justify-center">
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/proyectos')}
            icon={null}
            className="group"
          >
            {t('marketing.projects.viewAll')}
            <ArrowRight size={14} className={arrowSlide} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. TESTIMONIAL
// ═══════════════════════════════════════════════════════════════════════════
function TestimonialSection() {
  const { t } = useTranslation();

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-card border border-grove/12 bg-shell/[0.82] p-8 shadow-lift backdrop-blur-xl md:p-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-bustan-lagoon">
              {t('marketing.testimonial.sectionTag')}
            </span>
            <div className="mt-1 flex items-center gap-1" aria-label={t('marketing.testimonial.rating')}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className="fill-bustan-sun text-bustan-sun" aria-hidden />
              ))}
            </div>
            <p className="mt-4 font-display text-2xl leading-snug text-ink md:text-3xl">
              {t('marketing.testimonial.quotePrefix')}{' '}
              <span className="font-bold text-[#ef4444]">{t('marketing.testimonial.quoteFrom')}</span>{' '}
              {t('marketing.testimonial.quoteMid')}{' '}
              <span className="font-bold text-[#16a34a]">{t('marketing.testimonial.quoteTo')}</span>{' '}
              {t('marketing.testimonial.quoteSuffix')}
            </p>
            <p className="mt-4 text-sm text-ink/[0.6]">{t('marketing.testimonial.author')}</p>
          </div>

          <div className="shrink-0 rounded-2xl border border-bustan-sun/30 bg-bustan-sun/10 px-8 py-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-bustan-lagoon">
              {t('marketing.testimonial.savingsLabel')}
            </div>
            <div className="mt-1 font-display text-4xl font-bold text-grove">
              {t('marketing.testimonial.savingsValue')}
            </div>
            <div className="mt-1 text-xs text-ink/[0.5]">{t('marketing.testimonial.savingsUnit')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. FAQ (accordion)
// ═══════════════════════════════════════════════════════════════════════════
function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border bg-shell/[0.74] transition-colors duration-200 ease-out-soft ${
        isOpen ? 'border-bustan-lagoon/[0.28] shadow-soft' : 'border-grove/12'
      }`}
    >
      <button
        onClick={onToggle}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between px-6 py-5 text-left"
      >
        <span className="pr-4 text-base font-medium text-ink">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-bustan-lagoon"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm leading-relaxed text-ink/[0.74]">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type FAQEntry = { question: string; answer: string };

function FAQSection() {
  const { t } = useTranslation();
  const items = t('marketing.faq.items', { returnObjects: true }) as FAQEntry[];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className="px-6 py-24" id="faq">
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          tag={t('marketing.faq.sectionTag')}
          title={t('marketing.faq.title')}
          subtitle={t('marketing.faq.subtitle')}
          className="mb-14"
        />

        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <FAQItem
              key={i}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. FINAL CTA
// ═══════════════════════════════════════════════════════════════════════════
function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="px-6 py-28" id="contact">
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-card border border-grove/[0.14] bg-shell/[0.82] px-8 py-16 text-center shadow-lift backdrop-blur-2xl">
        {/* Soft lagoon glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-card"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 110%, rgba(0,111,107,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <SectionHeader
            tag={t('marketing.cta.sectionTag')}
            title={t('marketing.cta.title')}
            subtitle={t('marketing.cta.subtitle')}
            className="mb-10"
          />

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="primary" size="lg" to={QUOTE_ROUTE} className="group w-full sm:w-auto">
              {t('marketing.cta.ctaPrimary')}
              <ArrowRight size={18} className={arrowSlide} aria-hidden />
            </Button>

            <Button
              variant="whatsapp"
              size="lg"
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              {t('marketing.cta.ctaWhatsapp')}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              href={PHONE_HREF}
              icon={<Phone size={18} aria-hidden />}
              className="w-full sm:w-auto"
            >
              {t('marketing.cta.ctaCall')}
            </Button>
          </div>

          <p className="mt-6 text-sm text-ink/[0.55]">{t('marketing.cta.urgency')}</p>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. FOOTER
// ═══════════════════════════════════════════════════════════════════════════
function MarketingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-grove/12 bg-shell/[0.58] px-6 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/solaris-icon.png" alt="Solaris Panamá" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-lg tracking-tight text-grove">SOLARIS Panamá</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/[0.62]">
            {t('marketing.footer.tagline')}
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-bustan-lagoon">
            {t('marketing.footer.quickLinks')}
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm text-ink/[0.62]">
            <li><Link to="/nosotros" className="transition-colors hover:text-ink">{t('marketing.nav.about')}</Link></li>
            <li><Link to="/servicios" className="transition-colors hover:text-ink">{t('marketing.nav.services')}</Link></li>
            <li><Link to="/proyectos" className="transition-colors hover:text-ink">{t('marketing.nav.projects')}</Link></li>
            <li><Link to="/login" className="transition-colors hover:text-ink">{t('marketing.nav.crm')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-bustan-lagoon">
            {t('marketing.footer.contactTitle')}
          </h4>
          <ul className="flex flex-col gap-2.5 text-sm text-ink/[0.62]">
            <li>
              <a href={PHONE_HREF} className="flex items-center gap-2 transition-colors hover:text-ink">
                <Phone size={14} aria-hidden />
                {PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-ink"
              >
                <MessageCircle size={14} className="text-[#25d366]" aria-hidden />
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={14} aria-hidden />
              Pedasí, Los Santos · Panamá
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-grove/10 pt-6 text-xs text-ink/[0.45] sm:flex-row">
        <span>{t('marketing.footer.copyright')}</span>
        <span>{t('marketing.footer.rights')}</span>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const { t } = useTranslation();

  const faqItems = (t('marketing.faq.items', { returnObjects: true }) as FAQEntry[]) || [];
  const schemas = [
    websiteSchema(),
    breadcrumbSchema(homeBreadcrumb()),
    serviceSchema(),
    ...(Array.isArray(faqItems) && faqItems.length > 0 ? [faqSchema(faqItems)] : []),
  ];

  return (
    <>
      <SEOHead
        title={t('marketing.seo.homeTitle')}
        description={t('marketing.seo.homeDescription')}
        path="/"
        schema={schemas}
      />

      <div className="bustan-home min-h-screen">
        <MarketingNavbar />
        <HeroSection />
        <GatewaySplit />
        <StatsBar />
        <ServicesSection />
        <ScrollAnimationSection />
        <WhySection />
        <ProcessSection />
        <ProjectsSection />
        <TestimonialSection />
        <FAQSection />
        <CTASection />
        <MarketingFooter />
        {/* Global segment-aware StickyWhatsApp is mounted once in App.tsx. */}
      </div>
    </>
  );
}
