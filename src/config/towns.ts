/**
 * Town / location data for the Solaris Panamá SEO location pages.
 *
 * Drives the reusable React location page (`UbicacionPage`) at
 * `/ubicaciones/:slug` and the coverage hub at `/ubicaciones`.
 *
 * All marketing copy is Latin-American (Panamanian) Spanish. Each entry has a
 * localized H1, intro and local angle, plus three benefit bullets and three
 * FAQ Q&A used to emit `LocalBusiness` + `Service` + `FAQPage` JSON-LD with
 * `areaServed` scoped to the town.
 *
 * Geo coordinates reuse `panamaZones.ts` where a matching zone exists;
 * otherwise approximate municipal centroids are used (good enough for the
 * `GeoCoordinates` SEO signal).
 */

export type TownRegion =
  | 'Azuero'
  | 'Ciudad de Panamá'
  | 'Chiriquí'
  | 'Coclé'
  | 'Veraguas'
  | 'Panamá Oeste';

export interface Town {
  /** URL slug → `/ubicaciones/{slug}`. */
  slug: string;
  /** Display name used in the H1 ("Paneles Solares en {name}"). */
  name: string;
  /** Province / administrative region (Spanish). */
  region: TownRegion;
  /** Province name for schema `areaServed` (e.g. "Los Santos"). */
  province: string;
  /** Latitude (GeoCoordinates schema). */
  lat: number;
  /** Longitude (GeoCoordinates schema). */
  lng: number;
  /** ~155-char meta description (Spanish). */
  metaDescription: string;
  /** Hero intro paragraph (Spanish, 1–2 sentences). */
  intro: string;
  /** Local positioning angle — why solar matters specifically here. */
  localAngle: string;
  /** Three town-specific benefit bullets. */
  benefits: [string, string, string];
  /** Whether commercial/industrial demand dominates this market. */
  segment: 'residencial' | 'comercial' | 'mixto';
  /** Town-specific FAQ (feeds FAQPage schema + visible accordion). */
  faqs: ReadonlyArray<{ readonly question: string; readonly answer: string }>;
}

export const TOWNS: Town[] = [
  // ─── Azuero (existing core market) ─────────────────────────────────────────
  {
    slug: 'pedasi',
    name: 'Pedasí',
    region: 'Azuero',
    province: 'Los Santos',
    lat: 7.5333,
    lng: -80.0333,
    metaDescription:
      'Paneles solares en Pedasí, Los Santos. Instalación residencial y para hoteles de playa. Ahorra hasta 95% en tu factura con la Ley 417. Cotización gratis.',
    intro:
      'Pedasí es nuestro hogar y el corazón de la Península de Azuero. Aquí hemos instalado más sistemas solares que en cualquier otra zona del país.',
    localAngle:
      'Las casas de playa y los hoteles boutique de Pedasí enfrentan facturas altas por el aire acondicionado constante. Con la excelente irradiación solar de Azuero, un sistema bien diseñado se paga solo en 3 a 5 años.',
    benefits: [
      'Cuadrilla local con base en Pedasí — instalación rápida y soporte cercano.',
      'Diseños optimizados para casas de playa y propiedades de uso vacacional.',
      'Excedentes vendidos a la red (net metering) en temporada seca.',
    ],
    segment: 'residencial',
    faqs: [
      {
        question: '¿Cuánto cuesta instalar paneles solares en Pedasí?',
        answer:
          'Un sistema residencial en Pedasí suele costar entre $4,000 y $20,000 según tu consumo y el tamaño del techo. Gracias a la Ley 417 los equipos se importan sin impuestos, lo que reduce el costo total.',
      },
      {
        question: '¿Funciona la energía solar para casas de uso vacacional en Pedasí?',
        answer:
          'Sí. En casas usadas solo los fines de semana, el sistema genera excedentes durante la semana que se acreditan a la red vía net metering, cubriendo varios meses de mínimo de tarifa.',
      },
      {
        question: '¿Tienen equipo en Pedasí para mantenimiento?',
        answer:
          'Sí. Nuestra base está en Pedasí, por lo que el soporte y el mantenimiento en Azuero son rápidos, sin esperas de logística desde la capital.',
      },
    ],
  },
  {
    slug: 'chitre',
    name: 'Chitré',
    region: 'Azuero',
    province: 'Herrera',
    lat: 7.9618,
    lng: -80.4283,
    metaDescription:
      'Paneles solares en Chitré, Herrera. Energía solar para comercios, restaurantes y hogares. Ahorra hasta 95% en luz con la Ley 417. Cotización gratis.',
    intro:
      'Chitré es el centro comercial de Azuero. Comercios, restaurantes y consultorios encuentran en la energía solar la mejor forma de controlar sus costos de electricidad.',
    localAngle:
      'Los negocios de Chitré operan de día, justo cuando los paneles producen más. Esto hace que el retorno de inversión comercial sea de los más rápidos de la región: en muchos casos menos de 3.5 años.',
    benefits: [
      'Sistemas comerciales para refrigeración, aires acondicionados y locales.',
      'Instalación en techos planos de concreto en 2 a 3 días.',
      'Deducción fiscal del 100% sobre la inversión con la Ley 417.',
    ],
    segment: 'comercial',
    faqs: [
      {
        question: '¿La energía solar conviene a un comercio en Chitré?',
        answer:
          'Mucho. Como los negocios consumen de día —cuando los paneles más producen— el ahorro es inmediato. Hemos visto restaurantes pasar de $1,100 a $180 al mes en su factura eléctrica.',
      },
      {
        question: '¿Cuánto tarda la instalación comercial en Chitré?',
        answer:
          'Un sistema comercial de 30 kW se instala normalmente en 2 a 3 días sobre techo plano de concreto, sin interrumpir la operación del negocio.',
      },
      {
        question: '¿Puedo deducir la inversión solar de mis impuestos?',
        answer:
          'Sí. La Ley 417 permite la deducción del 100% de la inversión en energía renovable, además de importar los equipos sin impuestos. Te ayudamos con la documentación.',
      },
    ],
  },
  {
    slug: 'las-tablas',
    name: 'Las Tablas',
    region: 'Azuero',
    province: 'Los Santos',
    lat: 7.7667,
    lng: -80.2833,
    metaDescription:
      'Paneles solares en Las Tablas, Los Santos. Energía solar para hogares, fincas y comercios. Ahorra hasta 95% en luz con la Ley 417. Cotización gratis.',
    intro:
      'Las Tablas combina hogares, comercios y fincas ganaderas que dependen de electricidad confiable. La energía solar reduce la factura y protege contra los cortes de luz.',
    localAngle:
      'Las fincas y propiedades rurales de Los Santos sufren cortes frecuentes. Un sistema solar con baterías garantiza electricidad estable para bombas de agua, refrigeración e iluminación, incluso fuera de la red.',
    benefits: [
      'Sistemas con baterías (off-grid o respaldo) para fincas rurales.',
      'Elimina el costo del generador diésel en propiedades aisladas.',
      'Garantía de 25 años en paneles, monitoreo remoto incluido.',
    ],
    segment: 'mixto',
    faqs: [
      {
        question: '¿Sirve la energía solar para una finca en Las Tablas?',
        answer:
          'Sí. Para fincas sin acceso a la red, un sistema solar con baterías reemplaza al generador diésel y entrega energía estable para bombas de agua, refrigeración de vacunas e iluminación.',
      },
      {
        question: '¿Los paneles aguantan los cortes de luz de la zona?',
        answer:
          'Con un sistema híbrido y baterías, tu propiedad sigue con electricidad aunque se vaya la red. Es la mejor protección contra los cortes frecuentes de Los Santos.',
      },
      {
        question: '¿Cuánto puedo ahorrar frente a un generador?',
        answer:
          'Una finca típica que gastaba en diésel ahorra alrededor de $1,800 al año tras cambiarse a solar, además de eliminar el ruido y el mantenimiento del generador.',
      },
    ],
  },
  {
    slug: 'los-santos',
    name: 'Los Santos',
    region: 'Azuero',
    province: 'Los Santos',
    lat: 7.9333,
    lng: -80.4,
    metaDescription:
      'Paneles solares en Los Santos. Instalación solar para hoteles, comercios y hogares en Azuero. Ahorra hasta 95% en luz con la Ley 417. Cotización gratis.',
    intro:
      'La provincia de Los Santos vive del turismo, el comercio y el agro. La energía solar permite a hoteles y negocios reducir drásticamente uno de sus mayores costos operativos.',
    localAngle:
      'Los hoteles boutique de la península, con piscina, restaurante y aire acondicionado, recuperan su inversión solar en menos de 3 años por sus altas horas de consumo diurno.',
    benefits: [
      'Sistemas multi-techo para hoteles y propiedades grandes.',
      'Instalación por fases sin interrumpir la operación.',
      'Retorno de inversión típico de 2.9 a 3.5 años en hotelería.',
    ],
    segment: 'comercial',
    faqs: [
      {
        question: '¿Conviene la energía solar a un hotel en Los Santos?',
        answer:
          'Sí. Un hotel de 20 habitaciones puede pasar de $2,800 a $350 al mes en su factura. Por las altas horas de operación diurna, el retorno suele ser menor a 3 años.',
      },
      {
        question: '¿Pueden instalar en varias estructuras del hotel?',
        answer:
          'Sí. Diseñamos sistemas multi-techo (habitaciones, restaurante, estacionamiento) e instalamos por fases para no afectar el servicio a los huéspedes.',
      },
      {
        question: '¿Qué incentivos hay para negocios en Los Santos?',
        answer:
          'La Ley 417 ofrece importación de equipos sin impuestos y deducción fiscal del 100% de la inversión, lo que acelera el retorno para hoteles y comercios.',
      },
    ],
  },
  {
    slug: 'guarare',
    name: 'Guararé',
    region: 'Azuero',
    province: 'Los Santos',
    lat: 7.8167,
    lng: -80.2833,
    metaDescription:
      'Paneles solares en Guararé, Los Santos. Energía solar residencial y agrícola en Azuero. Ahorra hasta 95% en luz con la Ley 417. Cotización gratis.',
    intro:
      'Guararé une tradición y campo. Hogares y productores agrícolas aprovechan el sol de Azuero para reducir su factura y ganar independencia energética.',
    localAngle:
      'La actividad agrícola de Guararé demanda bombeo de agua e infraestructura que consume energía durante el día — el escenario ideal para que la energía solar entregue el máximo ahorro.',
    benefits: [
      'Soluciones de bombeo solar para riego y agua.',
      'Sistemas residenciales con instalación en un solo día.',
      'Equipos sin impuestos bajo la Ley 417.',
    ],
    segment: 'mixto',
    faqs: [
      {
        question: '¿Puedo usar energía solar para riego en Guararé?',
        answer:
          'Sí. El bombeo solar es ideal para riego: el sistema produce justo cuando se necesita el agua, eliminando el costo eléctrico o de combustible de las bombas.',
      },
      {
        question: '¿Cuánto tarda una instalación residencial en Guararé?',
        answer:
          'La mayoría de los sistemas residenciales se instalan en un solo día, con monitoreo remoto incluido para que veas tu producción desde el celular.',
      },
      {
        question: '¿Vale la pena con la tarifa actual?',
        answer:
          'Con las tarifas de Panamá, el retorno típico es de 3 a 5 años. Después disfrutas de electricidad casi gratis por más de 20 años.',
      },
    ],
  },
  {
    slug: 'ocu',
    name: 'Ocú',
    region: 'Azuero',
    province: 'Herrera',
    lat: 7.9456,
    lng: -80.7733,
    metaDescription:
      'Paneles solares en Ocú, Herrera. Energía solar para hogares, comercios y fincas en Azuero. Ahorra hasta 95% en luz con la Ley 417. Cotización gratis.',
    intro:
      'Ocú es un pueblo de fuerte arraigo agrícola en Herrera. La energía solar reduce los costos de hogares, comercios y fincas con una de las mejores irradiaciones del país.',
    localAngle:
      'Las propiedades de Ocú, alejadas del centro urbano, se benefician de sistemas con respaldo que aseguran electricidad estable y eliminan la dependencia de la red en horas pico.',
    benefits: [
      'Sistemas con respaldo para zonas con cortes de luz.',
      'Diseños para hogares, comercios y fincas.',
      'Soporte regional desde nuestra base en Azuero.',
    ],
    segment: 'mixto',
    faqs: [
      {
        question: '¿La energía solar funciona bien en Ocú?',
        answer:
          'Excelente. Herrera tiene una de las mejores irradiaciones de Panamá, por lo que los sistemas en Ocú producen al máximo durante todo el año.',
      },
      {
        question: '¿Qué pasa cuando se va la luz?',
        answer:
          'Con un sistema híbrido con baterías, tu propiedad mantiene electricidad durante los cortes de la red. Es ideal para zonas rurales de Ocú.',
      },
      {
        question: '¿Atienden Ocú desde Azuero?',
        answer:
          'Sí. Operamos en toda la Península de Azuero, incluido Ocú, con soporte y mantenimiento regionales.',
      },
    ],
  },
  {
    slug: 'santiago',
    name: 'Santiago de Veraguas',
    region: 'Veraguas',
    province: 'Veraguas',
    lat: 8.1004,
    lng: -80.9803,
    metaDescription:
      'Paneles solares en Santiago de Veraguas. Energía solar para comercios, hogares e industria. Ahorra hasta 95% en luz con la Ley 417. Cotización gratis.',
    intro:
      'Santiago es el centro de servicios del país y un nodo comercial clave. Negocios y hogares cambian su factura de luz por energía solar propia y predecible.',
    localAngle:
      'Como punto de paso entre la capital y el occidente, Santiago concentra comercios, bodegas y consultorios con alto consumo diurno — perfecto para maximizar el ahorro solar.',
    benefits: [
      'Sistemas comerciales para bodegas, locales y oficinas.',
      'Cobertura logística sobre la carretera Interamericana.',
      'Deducción fiscal del 100% con la Ley 417.',
    ],
    segment: 'comercial',
    faqs: [
      {
        question: '¿Instalan paneles solares en Santiago de Veraguas?',
        answer:
          'Sí. Santiago está sobre nuestro corredor de servicio en la Interamericana, por lo que atendemos proyectos residenciales y comerciales con logística ágil.',
      },
      {
        question: '¿Conviene la energía solar a un comercio en Santiago?',
        answer:
          'Mucho. Los negocios consumen de día, justo cuando los paneles producen más, lo que acelera el retorno de inversión por debajo de los 4 años.',
      },
      {
        question: '¿Hay incentivos fiscales?',
        answer:
          'Sí. La Ley 417 permite importar equipos sin impuestos y deducir el 100% de la inversión, mejorando el flujo de caja del negocio.',
      },
    ],
  },

  // ─── High-demand locations outside Azuero (baseline §3.4) ───────────────────
  {
    slug: 'ciudad-de-panama',
    name: 'Ciudad de Panamá',
    region: 'Ciudad de Panamá',
    province: 'Panamá',
    lat: 8.9824,
    lng: -79.5199,
    metaDescription:
      'Paneles solares en Ciudad de Panamá. Energía solar para edificios, comercios y residencias. Reduce hasta 95% tu factura con la Ley 417. Cotización gratis.',
    intro:
      'La capital tiene las facturas eléctricas más altas del país. Techos comerciales y residenciales con alto potencial solar encuentran en la Ley 417 el camino más rápido al ahorro.',
    localAngle:
      'Edificios de oficinas, locales y residencias en Costa del Este, Obarrio, Punta Pacífica y el Área Bancaria tienen techos amplios y consumo diurno intenso: el escenario perfecto para sistemas solares de gran retorno.',
    benefits: [
      'Sistemas para edificios, oficinas y comercios de alto consumo.',
      'Aprovecha techos amplios en distritos como Costa del Este y Obarrio.',
      'Deducción fiscal del 100% de la inversión con la Ley 417.',
    ],
    segment: 'comercial',
    faqs: [
      {
        question: '¿Conviene la energía solar en Ciudad de Panamá?',
        answer:
          'Sí, especialmente. Como la capital paga las tarifas más altas del país, el ahorro por kWh solar es mayor y el retorno de inversión más rápido, sobre todo en comercios y edificios.',
      },
      {
        question: '¿Pueden instalar en un edificio o local comercial?',
        answer:
          'Sí. Diseñamos sistemas para azoteas de edificios, oficinas y locales comerciales en distritos como Costa del Este, Obarrio, Punta Pacífica y el Área Bancaria.',
      },
      {
        question: '¿Qué incentivos aplican en la capital?',
        answer:
          'La Ley 417 aplica en todo Panamá: importación de equipos sin impuestos y deducción del 100% de la inversión en energía renovable.',
      },
    ],
  },
  {
    slug: 'david',
    name: 'David, Chiriquí',
    region: 'Chiriquí',
    province: 'Chiriquí',
    lat: 8.4271,
    lng: -82.4309,
    metaDescription:
      'Paneles solares en David, Chiriquí. Energía solar para comercios, fincas y hogares con gran irradiación. Ahorra hasta 95% con la Ley 417. Cotización gratis.',
    intro:
      'David es la segunda ciudad de Panamá y una zona de gran irradiación solar. Comercios, fincas y hogares buscan independencia energética frente a tarifas crecientes.',
    localAngle:
      'El clima cálido de Chiriquí dispara el consumo de aire acondicionado y refrigeración. Con la fuerte radiación solar de la región, los sistemas producen al máximo y el ahorro es notable todo el año.',
    benefits: [
      'Excelente irradiación solar — máxima producción anual.',
      'Soluciones para comercio, agroindustria y residencias.',
      'Equipos sin impuestos bajo la Ley 417.',
    ],
    segment: 'mixto',
    faqs: [
      {
        question: '¿Produce bien la energía solar en David?',
        answer:
          'Sí. Chiriquí tiene una de las mayores irradiaciones de Panamá, por lo que los sistemas en David generan al máximo durante casi todo el año.',
      },
      {
        question: '¿Sirve para una finca o agroindustria en Chiriquí?',
        answer:
          'Sí. Diseñamos sistemas comerciales y agrícolas (riego, refrigeración, packing) que reducen costos operativos con retorno acelerado.',
      },
      {
        question: '¿Atienden la provincia de Chiriquí?',
        answer:
          'Sí, atendemos proyectos residenciales y comerciales en David y sus alrededores con equipos y logística dedicados.',
      },
    ],
  },
  {
    slug: 'coronado',
    name: 'Coronado',
    region: 'Panamá Oeste',
    province: 'Panamá Oeste',
    lat: 8.548,
    lng: -79.945,
    metaDescription:
      'Paneles solares en Coronado, Panamá Oeste. Energía solar para residencias y casas de playa. Reduce el alto consumo de A/C. Ley 417. Cotización gratis.',
    intro:
      'Coronado es una comunidad de playa con residencias premium y complejos comerciales. La energía solar reduce el alto consumo de aire acondicionado de la zona.',
    localAngle:
      'Las casas y residencias de Coronado funcionan con aire acondicionado casi todo el día. Un sistema solar bien dimensionado neutraliza ese consumo y baja la factura hasta en un 95%.',
    benefits: [
      'Diseños para residencias premium y casas de playa.',
      'Neutraliza el alto consumo de aire acondicionado.',
      'Net metering para acreditar excedentes a la red.',
    ],
    segment: 'residencial',
    faqs: [
      {
        question: '¿Vale la pena la energía solar en Coronado?',
        answer:
          'Sí. Por el uso intensivo de aire acondicionado, las facturas en Coronado son altas; un sistema solar reduce ese gasto drásticamente, con retorno de 3 a 5 años.',
      },
      {
        question: '¿Funciona para una casa de uso de fin de semana?',
        answer:
          'Sí. Los excedentes generados entre semana se acreditan a la red por net metering y se usan cuando ocupas la casa, reduciendo el saldo a pagar.',
      },
      {
        question: '¿Atienden Coronado y Panamá Oeste?',
        answer:
          'Sí, atendemos Coronado y toda la zona de playas de Panamá Oeste con instalación y soporte profesional.',
      },
    ],
  },
  {
    slug: 'boquete',
    name: 'Boquete',
    region: 'Chiriquí',
    province: 'Chiriquí',
    lat: 8.7807,
    lng: -82.4419,
    metaDescription:
      'Paneles solares en Boquete, Chiriquí. Energía solar para hoteles, cafés, casas y expatriados en tierras altas. Ahorra hasta 95% con la Ley 417. Cotiza gratis.',
    intro:
      'Boquete es destino de turismo y comunidad de expatriados. Hoteles, cafés y casas aprovechan el clima de tierras altas y la conciencia ecológica para apostar por la energía solar.',
    localAngle:
      'En Boquete, la sostenibilidad es parte del estilo de vida. Negocios turísticos y residencias buscan reducir su huella y sus costos, y el clima de altura mantiene los paneles eficientes y frescos.',
    benefits: [
      'Soluciones para hoteles boutique, cafés y casas de campo.',
      'Imagen sostenible para negocios de turismo.',
      'Monitoreo remoto y garantía de 25 años.',
    ],
    segment: 'mixto',
    faqs: [
      {
        question: '¿Funciona la energía solar en el clima de Boquete?',
        answer:
          'Sí. Aunque Boquete tiene neblina en las tardes, recibe abundante sol en la mañana y el clima fresco de altura mantiene los paneles más eficientes. La producción anual es muy buena.',
      },
      {
        question: '¿Conviene a un hotel o café en Boquete?',
        answer:
          'Sí. Además del ahorro, la energía solar refuerza la imagen sostenible que valoran los visitantes de tierras altas, con retorno típico de 3 a 5 años.',
      },
      {
        question: '¿Atienden a la comunidad de expatriados en Boquete?',
        answer:
          'Sí. Brindamos atención en español e inglés y acompañamos todo el proceso, desde el diseño hasta la interconexión a la red.',
      },
    ],
  },
  {
    slug: 'penonome',
    name: 'Penonomé',
    region: 'Coclé',
    province: 'Coclé',
    lat: 8.5189,
    lng: -80.3578,
    metaDescription:
      'Paneles solares en Penonomé, Coclé. Energía solar para comercios e industria agrícola con fuerte irradiación. Ahorra hasta 95% con la Ley 417. Cotiza gratis.',
    intro:
      'Penonomé está en el corredor central de Panamá, con fuerte irradiación solar. Comercios e industria agrícola reducen costos cambiando a energía solar propia.',
    localAngle:
      'La planicie de Coclé recibe sol intenso casi todo el año. Para comercios y agroindustria con consumo diurno, esto se traduce en uno de los retornos de inversión más atractivos del país.',
    benefits: [
      'Fuerte irradiación — alto rendimiento por panel instalado.',
      'Sistemas para agroindustria, comercios e industria.',
      'Deducción fiscal del 100% con la Ley 417.',
    ],
    segment: 'comercial',
    faqs: [
      {
        question: '¿Produce mucho un sistema solar en Penonomé?',
        answer:
          'Sí. Coclé tiene una de las mejores irradiaciones del país, por lo que cada panel instalado en Penonomé rinde más y el retorno de inversión es más rápido.',
      },
      {
        question: '¿Sirve para la industria agrícola de la zona?',
        answer:
          'Sí. Diseñamos sistemas para riego, refrigeración y procesamiento agrícola, reduciendo el costo eléctrico de la operación durante el día.',
      },
      {
        question: '¿Atienden Penonomé y la provincia de Coclé?',
        answer:
          'Sí. Penonomé está sobre nuestro corredor de servicio en la Interamericana; atendemos proyectos comerciales e industriales en toda Coclé.',
      },
    ],
  },
  {
    slug: 'aguadulce',
    name: 'Aguadulce',
    region: 'Coclé',
    province: 'Coclé',
    lat: 8.2487,
    lng: -80.5453,
    metaDescription:
      'Paneles solares en Aguadulce, Coclé. Energía solar comercial e industrial para la zona agroindustrial. Retorno acelerado con la Ley 417. Cotización gratis.',
    intro:
      'Aguadulce es zona industrial y agroindustrial de Coclé. Los grandes consumidores de energía encuentran en sistemas solares comerciales un retorno de inversión acelerado.',
    localAngle:
      'Las salineras, ingenios y plantas de Aguadulce consumen energía de forma intensa y constante durante el día. Sistemas solares de gran tamaño reducen sustancialmente ese costo fijo.',
    benefits: [
      'Sistemas comerciales e industriales de gran capacidad.',
      'Retorno acelerado por el alto consumo diurno.',
      'Importación de equipos sin impuestos (Ley 417).',
    ],
    segment: 'comercial',
    faqs: [
      {
        question: '¿La energía solar conviene a una planta en Aguadulce?',
        answer:
          'Sí. Las operaciones industriales con consumo diurno constante son ideales para la energía solar; un sistema de gran tamaño recorta el costo eléctrico fijo y se paga rápido.',
      },
      {
        question: '¿Hasta qué capacidad pueden instalar?',
        answer:
          'Diseñamos desde sistemas comerciales de 30 kW hasta instalaciones de varios cientos de kW e incluso parques solares de 1 MW en adelante.',
      },
      {
        question: '¿Qué incentivos aplican a la industria?',
        answer:
          'La Ley 417 permite importar equipos sin impuestos y deducir el 100% de la inversión, mejorando el retorno de los proyectos industriales.',
      },
    ],
  },
  {
    slug: 'panama-pacifico',
    name: 'Panamá Pacífico',
    region: 'Panamá Oeste',
    province: 'Panamá Oeste',
    lat: 8.91,
    lng: -79.597,
    metaDescription:
      'Paneles solares en Panamá Pacífico. Energía solar comercial e industrial para naves y empresas de la zona económica. Beneficios Ley 417. Cotización gratis.',
    intro:
      'Panamá Pacífico es una zona económica especial con naves industriales, bodegas y comercios. La energía solar comercial reduce costos y suma los beneficios fiscales de la Ley 417.',
    localAngle:
      'Las naves y centros logísticos de Panamá Pacífico tienen techos enormes y consumo diurno elevado — la combinación perfecta para sistemas solares de gran escala con retorno atractivo.',
    benefits: [
      'Aprovecha los amplios techos de naves y bodegas.',
      'Sistemas de gran escala para logística e industria.',
      'Beneficios fiscales de la Ley 417 y de la zona especial.',
    ],
    segment: 'comercial',
    faqs: [
      {
        question: '¿Pueden instalar en una nave de Panamá Pacífico?',
        answer:
          'Sí. Las naves industriales tienen techos amplios ideales para sistemas solares de gran escala, que reducen significativamente el costo eléctrico de la operación.',
      },
      {
        question: '¿Qué tamaño de sistema necesita una bodega o centro logístico?',
        answer:
          'Depende del consumo, pero suelen ir de 50 kW a varios cientos de kW. Hacemos un estudio del techo y de la factura para dimensionar el sistema óptimo.',
      },
      {
        question: '¿Se combinan los incentivos de la zona con la Ley 417?',
        answer:
          'Sí. La Ley 417 (equipos sin impuestos y deducción del 100%) aplica en todo el país, sumándose a los beneficios de la zona económica especial.',
      },
    ],
  },
];

/** Lookup a town by slug. */
export function getTownBySlug(slug: string): Town | undefined {
  return TOWNS.find((t) => t.slug === slug);
}

/** Towns grouped by region (for the coverage hub). */
export function townsByRegion(): { region: TownRegion; towns: Town[] }[] {
  const order: TownRegion[] = [
    'Azuero',
    'Ciudad de Panamá',
    'Panamá Oeste',
    'Coclé',
    'Veraguas',
    'Chiriquí',
  ];
  return order
    .map((region) => ({ region, towns: TOWNS.filter((t) => t.region === region) }))
    .filter((g) => g.towns.length > 0);
}
