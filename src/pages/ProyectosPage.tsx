import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Phone,
  MessageCircle,
  CheckCircle2,
  MapPin,
  Zap,
  DollarSign,
  Calendar,
  Sun,
} from 'lucide-react';

const WHATSAPP_NUMBER = '50765831822';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
};

interface Proyecto {
  id: string;
  titulo: string;
  ubicacion: string;
  tipo: 'Residencial' | 'Comercial' | 'Off-Grid';
  año: string;
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
    titulo: 'Casa familiar en Pedasi',
    ubicacion: 'Pedasi, Los Santos',
    tipo: 'Residencial',
    año: '2024',
    potencia: '10 kWp',
    facturaAntes: '$280/mes',
    facturaDespues: '$35/mes',
    ahorro: '$2,940/ano',
    payback: '3.8 anos',
    paneles: '24 paneles 415W',
    descripcion: 'Familia de 4 personas con piscina y aire acondicionado central. El sistema cubre el 88% del consumo mensual. En temporada seca genera excedentes que se venden a la red via net metering.',
    tags: ['Net Metering', 'Piscina', 'A/C'],
  },
  {
    id: 'chitre-restaurante',
    titulo: 'Restaurante en Chitre',
    ubicacion: 'Chitre, Herrera',
    tipo: 'Comercial',
    año: '2024',
    potencia: '30 kWp',
    facturaAntes: '$1,100/mes',
    facturaDespues: '$180/mes',
    ahorro: '$11,040/ano',
    payback: '3.2 anos',
    paneles: '72 paneles 415W',
    descripcion: 'Restaurante con alta demanda por refrigeracion y aires acondicionados. La instalacion en techo plano de concreto fue completada en 2 dias. ROI excepcional por las altas horas de operacion diurna.',
    tags: ['Techo plano', 'Refrigeracion', 'Comercial'],
  },
  {
    id: 'las-tablas-finca',
    titulo: 'Finca ganadera en Las Tablas',
    ubicacion: 'Las Tablas, Los Santos',
    tipo: 'Off-Grid',
    año: '2023',
    potencia: '15 kWp + 30 kWh bateria',
    facturaAntes: 'Sin red electrica',
    facturaDespues: '$0/mes',
    ahorro: 'vs generador: $1,800/ano',
    payback: '6 anos (vs generador)',
    paneles: '36 paneles 415W + LiFePO4',
    descripcion: 'Finca de 200 hectareas sin acceso a la red de ENSA. El generador diesel consumia 200 litros semanales. El sistema solar elimino ese costo y proporciona electricidad estable para bombas de agua, refrigeracion de vacunas e iluminacion.',
    tags: ['Off-Grid', 'Baterias', 'Bomba de agua'],
  },
  {
    id: 'pedasi-playa',
    titulo: 'Casa de playa en Playa Venao',
    ubicacion: 'Playa Venao, Los Santos',
    tipo: 'Residencial',
    año: '2024',
    potencia: '8 kWp',
    facturaAntes: '$195/mes',
    facturaDespues: '$22/mes',
    ahorro: '$2,076/ano',
    payback: '4.1 anos',
    paneles: '20 paneles 400W',
    descripcion: 'Casa de vacaciones usada principalmente los fines de semana y temporada alta. Orientacion perfecta al sur. En temporada seca genera suficiente excedente para cubrir varios meses de minimo de tarifa.',
    tags: ['Casa vacacional', 'Net Metering', 'Orientacion optima'],
  },
  {
    id: 'los-santos-hotel',
    titulo: 'Hotel boutique en la Peninsula',
    ubicacion: 'Los Santos, Panama',
    tipo: 'Comercial',
    año: '2025',
    potencia: '60 kWp',
    facturaAntes: '$2,800/mes',
    facturaDespues: '$350/mes',
    ahorro: '$29,400/ano',
    payback: '2.9 anos',
    paneles: '144 paneles 420W',
    descripcion: 'Hotel de 20 habitaciones con alberca, restaurante y spa. Instalacion en dos fases: techos de habitaciones y area de estacionamiento con estructura especial. El propietario recupera la inversion en menos de 3 anos.',
    tags: ['Hotel', 'Multi-techo', 'Alta demanda'],
  },
  {
    id: 'divisa-taller',
    titulo: 'Taller mecanico en Divisa',
    ubicacion: 'Divisa, Herrera',
    tipo: 'Comercial',
    año: '2023',
    potencia: '20 kWp',
    facturaAntes: '$680/mes',
    facturaDespues: '$95/mes',
    ahorro: '$7,020/ano',
    payback: '3.5 anos',
    paneles: '48 paneles 415W',
    descripcion: 'Taller mecanico con compresores, elevadores y equipos de soldadura. Alta demanda en horas pico de la manana. El sistema reduce la factura en 86% y protege contra los frecuentes cortes de luz en la zona.',
    tags: ['Industrial', 'Demanda alta', 'Compresores'],
  },
];

const tipoColors: Record<string, string> = {
  Residencial: 'text-[#60a5fa] border-[#60a5fa]/30 bg-[#60a5fa]/10',
  Comercial: 'text-[#a78bfa] border-[#a78bfa]/30 bg-[#a78bfa]/10',
  'Off-Grid': 'text-[#34d399] border-[#34d399]/30 bg-[#34d399]/10',
};

export default function ProyectosPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-[#FEFDFB] overflow-x-hidden" style={{ background: '#071F17' }}>
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(212,168,67,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.2) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-[#0B3D2E]/40 blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#D4A843]/[0.06] blur-[120px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 border-b border-[#D4A843]/10">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <img src="/solaris-icon.png" alt="Solaris" className="w-9 h-9" />
            <div>
              <span className="text-lg font-bold tracking-wide text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                SOLARIS
              </span>
              <span className="ml-2 text-xs text-[#D4A843]/60 font-normal">Panama</span>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
              507-6583-1822
            </a>
            <button
              onClick={() => navigate('/landing')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#D4A843]/20"
              style={{ background: 'linear-gradient(135deg, #D4A843, #f5d080)', color: '#071F17' }}
            >
              Cotizacion Gratis
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="px-6 pb-3 max-w-6xl mx-auto">
          <nav className="text-xs text-white/30 flex items-center gap-1.5">
            <button onClick={() => navigate('/')} className="hover:text-white/60 transition-colors">Inicio</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/60">Proyectos</span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-20 pb-16 max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] text-xs font-medium mb-6">
            <Sun className="w-3.5 h-3.5" />
            150+ proyectos completados en Azuero
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6 max-w-4xl mx-auto"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Proyectos reales,{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #D4A843 0%, #f5d080 50%, #D4A843 100%)' }}
            >
              resultados reales
            </span>
          </h1>

          <p className="text-lg text-white/50 leading-relaxed mb-10 max-w-2xl mx-auto">
            Aqui no hay imagenes de stock ni numeros inventados.
            Estos son sistemas que instalamos en la Peninsula de Azuero,
            con sus especificaciones exactas y los ahorros documentados.
          </p>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: '150+', label: 'Sistemas instalados' },
              { value: '$2.1M', label: 'Ahorro generado para clientes' },
              { value: '3.8 anos', label: 'Payback promedio' },
              { value: '25 anos', label: 'Garantia paneles' },
            ].map((stat, i) => (
              <motion.div
                key={stat.value}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center gap-1.5 px-4 py-4 rounded-2xl border border-[#D4A843]/10"
                style={{ background: 'rgba(11,61,46,0.4)' }}
              >
                <span className="text-xl font-bold text-white">{stat.value}</span>
                <span className="text-[10px] text-white/40 text-center">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Proyectos grid */}
      <section className="relative z-10 px-6 py-8 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {proyectos.map((p, i) => (
            <motion.div
              key={p.id}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="rounded-2xl border border-[#D4A843]/10 overflow-hidden hover:border-[#D4A843]/20 transition-all duration-300"
              style={{ background: 'rgba(11,61,46,0.25)' }}
            >
              {/* Project header */}
              <div className="px-6 pt-6 pb-4 border-b border-[#D4A843]/8">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3
                      className="text-base font-bold text-white mb-1"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {p.titulo}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-white/40">
                      <MapPin className="w-3.5 h-3.5" />
                      {p.ubicacion}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${tipoColors[p.tipo]}`}>
                      {p.tipo}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-white/30">
                      <Calendar className="w-3 h-3" />
                      {p.año}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#D4A843]/70">
                  <Zap className="w-3.5 h-3.5" />
                  {p.potencia} — {p.paneles}
                </div>
              </div>

              {/* ROI metrics */}
              <div className="grid grid-cols-3 divide-x divide-[#D4A843]/8 border-b border-[#D4A843]/8">
                <div className="px-4 py-4 text-center">
                  <div className="text-xs text-white/30 mb-1">Antes</div>
                  <div className="text-sm font-bold text-[#ef4444]">{p.facturaAntes}</div>
                </div>
                <div className="px-4 py-4 text-center">
                  <div className="text-xs text-white/30 mb-1">Despues</div>
                  <div className="text-sm font-bold text-[#22c55e]">{p.facturaDespues}</div>
                </div>
                <div className="px-4 py-4 text-center">
                  <div className="text-xs text-white/30 mb-1">Payback</div>
                  <div className="text-sm font-bold text-[#D4A843]">{p.payback}</div>
                </div>
              </div>

              {/* Description + tags */}
              <div className="px-6 py-5">
                <p className="text-xs text-white/40 leading-relaxed mb-4">{p.descripcion}</p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {p.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-white/8 text-white/30"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#D4A843]/60 font-medium">
                    <DollarSign className="w-3.5 h-3.5" />
                    {p.ahorro}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Zonas de servicio */}
      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2
            className="text-3xl font-bold text-white mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Zonas de servicio
          </h2>
          <p className="text-base text-white/40 max-w-xl mx-auto">
            Instalamos en toda la Peninsula de Azuero y zonas aledanas
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-3">
          {[
            'Pedasi', 'Chitre', 'Las Tablas', 'Los Santos', 'Divisa',
            'Tonosí', 'Playa Venao', 'Azuero', 'Herrera', 'Ocú', 'Guararé',
          ].map((zona, i) => (
            <motion.div
              key={zona}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D4A843]/10 text-sm text-white/60"
              style={{ background: 'rgba(11,61,46,0.3)' }}
            >
              <MapPin className="w-3.5 h-3.5 text-[#D4A843]" />
              {zona}
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-xs font-medium mb-5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Tu proyecto podria ser el proximo en este portafolio
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Listo para empezar?
          </h2>
          <p className="text-base text-white/40 mb-8 max-w-lg mx-auto">
            Solicita tu cotizacion gratuita hoy. En 24 horas tendras los numeros
            exactos de tu sistema y tu ahorro proyectado.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              onClick={() => navigate('/landing')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base shadow-lg shadow-[#D4A843]/25"
              style={{ background: 'linear-gradient(135deg, #D4A843, #f5d080)', color: '#071F17' }}
            >
              Solicitar Cotizacion Gratis
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-base font-medium transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#25d366]" />
              WhatsApp Directo
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#D4A843]/10 px-6 py-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/25">
          <div className="flex items-center gap-3">
            <img src="/solaris-icon.png" alt="Solaris" className="w-5 h-5 opacity-50" />
            <span>Solaris Panama — Energia Solar en la Peninsula de Azuero</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/nosotros')} className="hover:text-white/50 transition-colors">
              Nosotros
            </button>
            <button onClick={() => navigate('/servicios')} className="hover:text-white/50 transition-colors">
              Servicios
            </button>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/50 transition-colors"
            >
              507-6583-1822
            </a>
            <span>© 2025 Solaris Panama</span>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <motion.a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.4 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #25d366 0%, #128c4e 100%)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7 fill-white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="absolute inset-0 rounded-full animate-ping bg-[#25d366]/30 -z-10" />
      </motion.a>
    </div>
  );
}
