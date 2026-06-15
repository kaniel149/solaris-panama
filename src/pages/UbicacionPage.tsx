import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Phone,
  CheckCircle2,
  MapPin,
  Sun,
  HelpCircle,
} from 'lucide-react';
import { Button, SectionHeader } from '../components/marketing';
import {
  SEOHead,
  breadcrumbSchema,
  faqSchema,
  townLocalBusinessSchema,
  townServiceSchema,
} from '../components/seo';
import { BASE_URL } from '../components/seo';
import { getTownBySlug, TOWNS } from '@/config/towns';

const WHATSAPP_NUMBER = '50765831822';

// ─── Motion variants (match the rest of the premium marketing pages) ──────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const revealViewport = { once: true, margin: '-80px' } as const;

// ─── Shared marketing chrome ─────────────────────────────────────────────────

function MarketingNav() {
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
            Nosotros
          </Link>
          <Link to="/servicios" className="rounded-lg px-3 py-2 text-sm text-ink/60 transition-colors hover:text-ink">
            Servicios
          </Link>
          <Link to="/proyectos" className="rounded-lg px-3 py-2 text-sm text-ink/60 transition-colors hover:text-ink">
            Proyectos
          </Link>
          <Link to="/ubicaciones" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink">
            Cobertura
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
            Cotización Gratis
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-grove/10 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-ink/40 sm:flex-row">
        <div className="flex items-center gap-3">
          <img src="/solaris-icon.png" alt="Solaris Panamá" className="h-5 w-5 opacity-70" />
          <span>Energía solar en Panamá y la Península de Azuero.</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/nosotros" className="transition-colors hover:text-ink">Nosotros</Link>
          <Link to="/servicios" className="transition-colors hover:text-ink">Servicios</Link>
          <Link to="/ubicaciones" className="transition-colors hover:text-ink">Cobertura</Link>
          <Link to="/login" className="transition-colors hover:text-ink">CRM</Link>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            507-6583-1822
          </a>
          <span>© 2026 Solaris Panamá</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UbicacionPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const town = useMemo(() => getTownBySlug(slug), [slug]);

  // Unknown slug → send to the coverage hub (keeps a clean SPA experience).
  if (!town) {
    return <Navigate to="/ubicaciones" replace />;
  }

  const path = `/ubicaciones/${town.slug}`;
  const whatsappPrefill = `Hola Solaris, quiero cotizar un sistema solar para mi propiedad en ${town.name}.`;
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappPrefill)}`;

  const townInput = {
    name: town.name,
    province: town.province,
    slug: town.slug,
    lat: town.lat,
    lng: town.lng,
  };

  const schemas = [
    townLocalBusinessSchema(townInput),
    townServiceSchema(townInput),
    faqSchema(town.faqs),
    breadcrumbSchema([
      { name: 'Inicio', url: BASE_URL },
      { name: 'Cobertura', url: `${BASE_URL}/ubicaciones` },
      { name: town.name, url: `${BASE_URL}${path}` },
    ]),
  ];

  // Up to 4 other locations to surface for internal linking.
  const otherTowns = TOWNS.filter((t) => t.slug !== town.slug).slice(0, 6);

  return (
    <div className="bustan-home min-h-screen overflow-x-hidden">
      <SEOHead
        title={`Paneles Solares en ${town.name}`}
        description={town.metaDescription}
        path={path}
        schema={schemas}
      />

      <MarketingNav />

      {/* Breadcrumb */}
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <nav className="flex items-center gap-1.5 text-xs text-ink/40">
          <Link to="/" className="transition-colors hover:text-ink">Inicio</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/ubicaciones" className="transition-colors hover:text-ink">Cobertura</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink/70">{town.name}</span>
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
              <MapPin className="h-3.5 w-3.5 text-bustan-lagoon" />
              {town.name}, {town.province} · Panamá
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display text-display-md leading-[1.08] text-ink md:text-display-xl"
            >
              Paneles Solares en{' '}
              <span className="text-bustan-gradient">{town.name}</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/[0.66]">
              {town.intro}
            </motion.p>

            {/* Primary CTAs */}
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button to="/landing" size="lg" icon={null}>
                Cotización Gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="whatsapp"
                size="lg"
              >
                WhatsApp Directo
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── LOCAL ANGLE ── */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-card border border-grove/12 bg-shell/82 p-8 shadow-soft backdrop-blur-xl md:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-bustan-sun/10 blur-3xl" />
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-bustan-lagoon/20 bg-bustan-lagoon/10 px-3 py-1.5 text-xs font-medium text-bustan-lagoon">
                <Sun className="h-3.5 w-3.5 text-bustan-sun" />
                Energía solar para {town.name}
              </div>
              <p className="text-lg leading-relaxed text-ink/[0.78]">{town.localAngle}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            tag="Por qué Solaris"
            title={`Lo que ofrecemos en ${town.name}`}
            subtitle="Sistemas a tu medida, equipos sin impuestos bajo la Ley 417 y soporte profesional."
          />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            className="mt-12 grid gap-6 md:grid-cols-3"
          >
            {town.benefits.map((benefit) => (
              <motion.div
                key={benefit}
                variants={fadeUp}
                className="flex items-start gap-3 rounded-card border border-grove/12 bg-shell/70 p-6 shadow-soft"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-bustan-lagoon" />
                <p className="text-sm leading-relaxed text-ink/[0.72]">{benefit}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <SectionHeader
            tag="Preguntas frecuentes"
            title={`Energía solar en ${town.name}`}
          />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            className="mt-10 space-y-4"
          >
            {town.faqs.map((faq) => (
              <motion.details
                key={faq.question}
                variants={fadeUp}
                className="group rounded-card border border-grove/12 bg-shell/70 p-5 shadow-soft"
              >
                <summary className="flex cursor-pointer list-none items-start gap-3 font-medium text-ink">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-bustan-lagoon" />
                  <span className="flex-1">{faq.question}</span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink/30 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 pl-7 text-sm leading-relaxed text-ink/[0.62]">{faq.answer}</p>
              </motion.details>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── OTHER LOCATIONS (internal linking) ── */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <SectionHeader tag="Cobertura" title="También instalamos en" />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            {otherTowns.map((t) => (
              <motion.div key={t.slug} variants={fadeUp}>
                <Link
                  to={`/ubicaciones/${t.slug}`}
                  className="flex items-center gap-2 rounded-full border border-grove/12 bg-shell/70 px-4 py-2 text-sm text-ink/70 shadow-soft transition-colors hover:text-ink"
                >
                  <MapPin className="h-3.5 w-3.5 text-bustan-lagoon" />
                  {t.name}
                </Link>
              </motion.div>
            ))}
            <motion.div variants={fadeUp}>
              <Link
                to="/ubicaciones"
                className="flex items-center gap-2 rounded-full border border-bustan-lagoon/25 bg-bustan-lagoon/10 px-4 py-2 text-sm font-medium text-bustan-lagoon shadow-soft transition-colors hover:bg-bustan-lagoon/15"
              >
                Ver toda la cobertura
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
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
                Respuesta en menos de 24 horas
              </div>
              <h2 className="font-display text-display-sm text-ink md:text-display-md">
                ¿Listo para ahorrar en {town.name}?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-ink/[0.6]">
                Solicita tu cotización gratuita. Calculamos tu ahorro real a partir de tu factura,
                no con un porcentaje genérico.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button to="/landing" size="lg" icon={null}>
                  Solicitar Cotización Gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="lg"
                >
                  WhatsApp Directo
                </Button>
                <Button href="tel:+50765831822" variant="secondary" size="lg" icon={<Phone className="h-4 w-4" />}>
                  Llamar Ahora
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
