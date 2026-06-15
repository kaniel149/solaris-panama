import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Phone, MapPin, Sun } from 'lucide-react';
import { Button } from '../components/marketing';
import {
  SEOHead,
  serviceSchema,
  breadcrumbSchema,
  pageBreadcrumb,
  BASE_URL,
} from '../components/seo';
import { townsByRegion, TOWNS } from '@/config/towns';

const WHATSAPP_NUMBER = '50765831822';
const WHATSAPP_PREFILL =
  'Hola Solaris, quiero saber si instalan paneles solares en mi zona de Panamá.';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
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
          <Link to="/proyectos" className="transition-colors hover:text-ink">Proyectos</Link>
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

export default function UbicacionesHubPage() {
  const groups = townsByRegion();

  // CollectionPage / ItemList of every town for richer location coverage.
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${BASE_URL}/ubicaciones#collection`,
    name: 'Cobertura de Energía Solar en Panamá',
    description:
      'Ciudades y zonas de Panamá donde Solaris instala paneles solares: Península de Azuero, Ciudad de Panamá, Chiriquí, Coclé, Veraguas y Panamá Oeste.',
    url: `${BASE_URL}/ubicaciones`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: TOWNS.length,
      itemListElement: TOWNS.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `Paneles Solares en ${t.name}`,
        url: `${BASE_URL}/ubicaciones/${t.slug}`,
      })),
    },
  };

  const schemas = [
    serviceSchema(),
    collectionSchema,
    breadcrumbSchema(pageBreadcrumb('Cobertura', '/ubicaciones')),
  ];

  return (
    <div className="bustan-home min-h-screen overflow-x-hidden">
      <SEOHead
        title="Cobertura de Energía Solar en Panamá"
        description="¿Instalamos paneles solares en tu zona? Cubrimos la Península de Azuero, Ciudad de Panamá, David, Coronado, Boquete, Penonomé, Santiago y más. Cotización gratis."
        path="/ubicaciones"
        schema={schemas}
      />

      <MarketingNav />

      {/* Breadcrumb */}
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <nav className="flex items-center gap-1.5 text-xs text-ink/40">
          <Link to="/" className="transition-colors hover:text-ink">Inicio</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink/70">Cobertura</span>
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
              Instalamos en toda la República de Panamá
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display text-display-md leading-[1.08] text-ink md:text-display-xl"
            >
              Cobertura de{' '}
              <span className="text-bustan-gradient">energía solar</span> en Panamá
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/[0.66]">
              Desde nuestra base en la Península de Azuero llegamos a hogares, comercios e industrias
              en todo el país. Encuentra tu ciudad y descubre cuánto puedes ahorrar.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── TOWN GROUPS BY REGION ── */}
      {groups.map((group) => (
        <section key={group.region} className="px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-bustan-lagoon" />
              <h2 className="font-display text-display-sm text-ink">{group.region}</h2>
            </div>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {group.towns.map((t) => (
                <motion.div key={t.slug} variants={fadeUp}>
                  <Link
                    to={`/ubicaciones/${t.slug}`}
                    className="group flex h-full flex-col rounded-card border border-grove/12 bg-shell/82 p-6 shadow-soft backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="font-display text-lg text-ink">{t.name}</h3>
                      <ArrowRight className="h-4 w-4 shrink-0 text-bustan-lagoon transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs text-ink/[0.5]">{t.province}, Panamá</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink/[0.62]">{t.intro}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-bustan-grove">
                      Paneles solares en {t.name}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      ))}

      {/* ── CTA ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-card border border-grove/12 bg-shell/82 p-10 text-center shadow-lift backdrop-blur-2xl md:p-14">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-bustan-lagoon/10 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-display-sm text-ink md:text-display-md">
                ¿No ves tu ciudad?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-ink/[0.6]">
                Atendemos proyectos en toda Panamá. Escríbenos y confirmamos cobertura y tiempos para
                tu zona, sin compromiso.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button to="/landing" size="lg" icon={null}>
                  Solicitar Cotización Gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="lg"
                >
                  WhatsApp Directo
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
