/**
 * JSON-LD schema helpers for Solaris Panamá SEO (Spanish, Panama market).
 * Ported & localized from bustan-energy. Marketing site only.
 *
 * Target keywords (ES):
 *   paneles solares panamá, energía solar panamá, instalación de paneles solares,
 *   energía solar azuero, paneles solares pedasí, ley 417 panamá, ahorro factura eléctrica.
 */

export const BASE_URL = 'https://solaris-panama.com';
const BUSINESS_ID = `${BASE_URL}/#business`;

/** Languages this site renders. Spanish is canonical; English/Hebrew are operator-facing. */
export type SeoLang = 'es' | 'en' | 'he';

// ─── LocalBusiness ────────────────────────────────────────────────────────────
// Included on every page via SEOHead. Core entity signal for Google.

export function localBusinessSchema(_lang: SeoLang = 'es') {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'SolarEnergyCompany'],
    '@id': BUSINESS_ID,
    name: 'Solaris Panamá',
    alternateName: ['Solaris Energía Solar', 'Solaris Panama', 'Solaris Azuero'],
    description:
      'Empresa líder en instalación de paneles solares en Panamá — energía solar para hogares, comercios e industrias en la Península de Azuero y Ciudad de Panamá. Equipos sin impuestos bajo la Ley 417.',
    url: BASE_URL,
    telephone: '+507-6583-1822',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Pedasí',
      addressRegion: 'Los Santos',
      addressCountry: 'PA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 7.5333,
      longitude: -80.0333,
    },
    areaServed: [
      { '@type': 'City', name: 'Pedasí' },
      { '@type': 'City', name: 'Las Tablas' },
      { '@type': 'City', name: 'Chitré' },
      { '@type': 'City', name: 'Los Santos' },
      { '@type': 'City', name: 'Ciudad de Panamá' },
      { '@type': 'AdministrativeArea', name: 'Península de Azuero' },
      { '@type': 'Country', name: 'Panamá' },
    ],
    priceRange: '$$$',
    currenciesAccepted: 'USD',
    paymentAccepted: ['Efectivo', 'Transferencia bancaria', 'Tarjeta de crédito', 'Financiamiento'],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '08:00',
      closes: '18:00',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Servicios de Energía Solar',
    },
    keywords:
      'paneles solares panamá, energía solar panamá, instalación de paneles solares, energía solar azuero, paneles solares pedasí, ley 417',
    sameAs: [
      'https://www.facebook.com/solaris.panama',
      'https://www.instagram.com/sola.rispanama',
    ],
  };
}

// ─── WebSite ─────────────────────────────────────────────────────────────────

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: 'Solaris Panamá',
    url: BASE_URL,
    publisher: { '@id': BUSINESS_ID },
    inLanguage: ['es'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export function serviceSchema(_lang: SeoLang = 'es') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${BASE_URL}/servicios#service`,
    provider: { '@id': BUSINESS_ID },
    serviceType: 'Instalación de Paneles Solares',
    name: 'Instalación Solar Integral',
    description:
      'Soluciones solares de extremo a extremo: evaluación del sitio, diseño del sistema, suministro de equipos, instalación y mantenimiento para hogares, comercios e industrias en Panamá.',
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Península de Azuero' },
      { '@type': 'City', name: 'Ciudad de Panamá' },
      { '@type': 'Country', name: 'Panamá' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Paquetes de Energía Solar',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Energía Solar Residencial',
            description:
              'Sistemas solares en techo para hogares y villas, de 3kW a 30kW. Reduce tu factura eléctrica hasta 95%.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Energía Solar Comercial e Industrial',
            description:
              'Sistemas solares para comercios, hoteles, fincas e industrias, de 30kW a 1MW. Opciones EPC y PPA.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Parques Solares',
            description:
              'Instalaciones de gran escala montadas en suelo, de 1MW en adelante, con conexión a la red ETESA/distribuidoras.',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Almacenamiento con Baterías',
            description:
              'Respaldo de energía y energía 24/7. Sistemas de baterías para hogares y negocios ante apagones.',
          },
        },
      ],
    },
  };
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export function faqSchema(
  faqs: ReadonlyArray<{ readonly question: string; readonly answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Pre-built Spanish FAQ set for Panama solar (import and pass to faqSchema).
export const PANAMA_FAQS_ES = [
  {
    question: '¿Cuánto cuesta instalar paneles solares en Panamá?',
    answer:
      'Un sistema residencial (3-15kW) en Panamá suele costar entre $4,000 y $20,000 según el tamaño del techo, el consumo, el inversor y el tipo de equipo. Gracias a la Ley 417, los equipos solares se importan sin impuestos, lo que reduce el costo. Solicita una cotización gratuita para conocer tu precio exacto.',
  },
  {
    question: '¿Cuánto puedo ahorrar con paneles solares en mi factura eléctrica?',
    answer:
      'El ahorro depende de tu consumo diurno y de la tarifa de tu distribuidora. Nuestros clientes en Azuero pasaron de pagar $280 a $35 al mes — un ahorro de hasta el 95%. Calculamos tu ahorro real a partir de tu factura, no con un porcentaje genérico.',
  },
  {
    question: '¿Qué es la Ley 417 y cómo me beneficia?',
    answer:
      'La Ley 417 es el incentivo panameño a la energía renovable que permite importar equipos solares (paneles, inversores, estructuras) sin impuestos de importación ni ITBMS. Esto reduce significativamente el costo total de tu sistema solar. Nosotros gestionamos todo el proceso por ti.',
  },
  {
    question: '¿En cuánto tiempo recupero mi inversión en energía solar?',
    answer:
      'Con las tarifas eléctricas de Panamá, el retorno de inversión típico es de 3 a 5 años para sistemas residenciales y comerciales. Después de ese período, disfrutas de electricidad casi gratis durante más de 20 años, ya que los paneles tienen garantía de 25 años.',
  },
  {
    question: '¿Los paneles solares funcionan en época lluviosa en Panamá?',
    answer:
      'Sí. Los paneles modernos generan electricidad incluso en días nublados, produciendo entre el 10% y el 25% de su capacidad máxima. Panamá recibe abundante sol durante todo el año, por lo que la producción anual sigue siendo excelente, especialmente en la Península de Azuero.',
  },
  {
    question: '¿Cuánto tarda la instalación de paneles solares?',
    answer:
      'La mayoría de los sistemas residenciales se instalan en un solo día. Los sistemas comerciales más grandes (30kW+) toman de 3 a 7 días. Nuestro equipo certificado realiza una instalación limpia y profesional, con monitoreo remoto incluido.',
  },
  {
    question: '¿Qué garantía ofrecen los paneles y el sistema?',
    answer:
      'Instalamos paneles Tier-1 con garantía de rendimiento de 25 años e inversores con 10 a 25 años de protección. Cada propuesta detalla por escrito las garantías de los equipos seleccionados y la cobertura de mano de obra de Solaris.',
  },
  {
    question: '¿Necesito permisos para instalar paneles solares en Panamá?',
    answer:
      'Sí, los sistemas conectados a la red requieren la aprobación de la distribuidora eléctrica y, en muchos casos, de la ASEP. Solaris gestiona todo el trámite de interconexión por ti — desde la solicitud hasta la inspección final y la conexión a la red.',
  },
];

// ─── Article ──────────────────────────────────────────────────────────────────

export interface ArticleSchemaInput {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
  imageUrl?: string;
}

export function articleSchema(article: ArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: article.dateModified ?? article.datePublished,
    inLanguage: 'es-PA',
    url: `${BASE_URL}/blog/${article.slug}`,
    author: {
      '@type': 'Organization',
      name: 'Solaris Panamá',
      url: BASE_URL,
    },
    publisher: { '@id': BUSINESS_ID },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blog/${article.slug}`,
    },
    ...(article.imageUrl
      ? { image: { '@type': 'ImageObject', url: article.imageUrl } }
      : {}),
  };
}

// ─── BreadcrumbList ───────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function homeBreadcrumb(): BreadcrumbItem[] {
  return [{ name: 'Inicio', url: BASE_URL }];
}

export function pageBreadcrumb(pageName: string, path: string): BreadcrumbItem[] {
  return [...homeBreadcrumb(), { name: pageName, url: `${BASE_URL}${path}` }];
}

// ─── Organization ─────────────────────────────────────────────────────────────

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Solaris Panamá',
    legalName: 'Solaris Panamá',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/solaris-logo-dark.png`,
      width: 400,
      height: 120,
    },
    description:
      'Empresa de energía solar con sede en la Península de Azuero, Panamá. Especialistas en soluciones solares residenciales, comerciales e industriales bajo la Ley 417.',
    foundingLocation: {
      '@type': 'Place',
      name: 'Pedasí, Los Santos, Panamá',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Pedasí',
      addressRegion: 'Los Santos',
      addressCountry: 'PA',
    },
    areaServed: { '@type': 'Country', name: 'Panamá' },
    knowsAbout: [
      'Energía Solar',
      'Sistemas Fotovoltaicos',
      'Instalación de Paneles Solares',
      'Ley 417',
      'Proyectos EPC Solares',
      'Almacenamiento con Baterías',
      'Energía Solar Residencial',
      'Energía Solar Comercial',
      'Parques Solares',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'ventas',
        telephone: '+507-6583-1822',
        availableLanguage: ['Spanish', 'English'],
      },
    ],
    sameAs: [
      'https://www.facebook.com/solaris.panama',
      'https://www.instagram.com/sola.rispanama',
    ],
  };
}

// ─── WebPage ──────────────────────────────────────────────────────────────────

export function webPageSchema(opts: { name: string; description: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${opts.url}#webpage`,
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: 'es-PA',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      name: 'Solaris Panamá',
      url: BASE_URL,
      publisher: { '@id': BUSINESS_ID },
    },
  };
}

// ─── ItemList (portfolio / project gallery) ────────────────────────────────────
// Used on /proyectos to expose real installations as a structured list — a top
// E-E-A-T / trust signal for solar. Each item is a CreativeWork describing a
// completed Panama installation.

export interface ItemListEntry {
  /** Project name, e.g. "Casa familiar en Pedasí". */
  name: string;
  /** Locality, e.g. "Pedasí, Los Santos". */
  location: string;
  /** Short Spanish description of the installation. */
  description: string;
}

export function projectListSchema(items: ReadonlyArray<ItemListEntry>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${BASE_URL}/proyectos#projects`,
    name: 'Proyectos Solares en Panamá',
    description:
      'Instalaciones solares completadas por Solaris en hogares, comercios e industrias de la Península de Azuero y Panamá.',
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'CreativeWork',
        name: item.name,
        description: item.description,
        about: 'Instalación de paneles solares',
        locationCreated: {
          '@type': 'Place',
          name: item.location,
          address: {
            '@type': 'PostalAddress',
            addressLocality: item.location,
            addressCountry: 'PA',
          },
        },
        creator: { '@id': BUSINESS_ID },
      },
    })),
  };
}

// ─── Town / location (areaServed = town) ───────────────────────────────────────
// Emitted on the data-driven location pages (/ubicaciones/:slug). Reuses the
// canonical #business entity but advertises a town-specific service area + geo,
// the strongest local-SEO signal for "paneles solares en {ciudad}".

export interface TownSchemaInput {
  /** Town display name, e.g. "Pedasí". */
  name: string;
  /** Province / region, e.g. "Los Santos". */
  province: string;
  /** URL slug used in the canonical path. */
  slug: string;
  /** Latitude (GeoCoordinates). */
  lat: number;
  /** Longitude (GeoCoordinates). */
  lng: number;
}

export function townLocalBusinessSchema(town: TownSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'SolarEnergyCompany'],
    '@id': `${BASE_URL}/ubicaciones/${town.slug}#business`,
    name: `Solaris Panamá — Paneles Solares en ${town.name}`,
    parentOrganization: { '@id': BUSINESS_ID },
    description: `Instalación de paneles solares y energía solar en ${town.name}, ${town.province}, Panamá. Sistemas residenciales y comerciales con equipos sin impuestos bajo la Ley 417.`,
    url: `${BASE_URL}/ubicaciones/${town.slug}`,
    telephone: '+507-6583-1822',
    image: `${BASE_URL}/solaris-logo-dark.png`,
    priceRange: '$$$',
    currenciesAccepted: 'USD',
    address: {
      '@type': 'PostalAddress',
      addressLocality: town.name,
      addressRegion: town.province,
      addressCountry: 'PA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: town.lat,
      longitude: town.lng,
    },
    areaServed: { '@type': 'City', name: town.name },
  };
}

export function townServiceSchema(town: TownSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${BASE_URL}/ubicaciones/${town.slug}#service`,
    provider: { '@id': BUSINESS_ID },
    serviceType: 'Instalación de Paneles Solares',
    name: `Instalación de Paneles Solares en ${town.name}`,
    description: `Energía solar llave en mano en ${town.name}, ${town.province}: estudio del techo, diseño, suministro de equipos, instalación y mantenimiento. Ahorra hasta 95% en tu factura eléctrica.`,
    areaServed: { '@type': 'City', name: town.name },
  };
}
