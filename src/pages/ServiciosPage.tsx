import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Phone,
  MessageCircle,
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

const WHATSAPP_NUMBER = '50765831822';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const servicios = [
  {
    id: 'residencial',
    icon: <Home className="w-7 h-7" />,
    titulo: 'Solar Residencial',
    subtitulo: 'Para tu hogar en Azuero',
    desc: 'Sistemas de 3 a 20 kWp diseñados para hogares unifamiliares, fincas y propiedades en la Peninsula de Azuero. Instalacion en un dia, ahorro desde el primer mes.',
    detalles: [
      'Sistemas 3-20 kWp (30-200 paneles)',
      'Ahorro promedio: 70-100% de la factura',
      'Payback: 3-5 anos',
      'Garantia de paneles: 25 anos',
      'Garantia de inversor: 10 anos',
      'Monitoreo remoto en tiempo real',
    ],
    ejemplo: {
      factura: '$280/mes',
      sistema: '10 kWp',
      inversion: '$12,500',
      payback: '3.8 anos',
      ahorro25: '$73,500',
    },
    cta: 'Cotizar sistema residencial',
  },
  {
    id: 'comercial',
    icon: <Building2 className="w-7 h-7" />,
    titulo: 'Solar Comercial',
    subtitulo: 'Para empresas, hoteles y negocios',
    desc: 'Sistemas de 20 a 500+ kWp para supermercados, hoteles, restaurantes, talleres y cualquier negocio con factura elevada. ROI en 3-4 anos, con financiamiento disponible.',
    detalles: [
      'Sistemas 20-500+ kWp',
      'Ahorro de $3,000-$25,000 al mes',
      'Diseño a medida con estudio de sombras',
      'Tramites ante ENSA/EDEMET incluidos',
      'Financiamiento disponible sin cuota inicial',
      'Informe mensual de generacion y ahorro',
    ],
    ejemplo: {
      factura: '$5,000/mes',
      sistema: '100 kWp',
      inversion: '$85,000',
      payback: '3.6 anos',
      ahorro25: '$1.2M',
    },
    cta: 'Cotizar sistema comercial',
  },
  {
    id: 'off-grid',
    icon: <Wifi className="w-7 h-7" />,
    titulo: 'Solar Off-Grid',
    subtitulo: 'Independencia total de la red',
    desc: 'Sistemas autonomos con baterias de litio para propiedades sin acceso a la red electrica, fincas remotas, cabanas o quienes quieren independencia total del distribuidor.',
    detalles: [
      'Baterias de litio LiFePO4 (10+ anos de vida)',
      'Funcionamiento 24/7 sin red electrica',
      'Proteccion total contra apagones',
      'Ideal para fincas, cabanas y casas de playa',
      'Carga de vehiculos electricos incluida',
      'Expansion modular si crece el consumo',
    ],
    ejemplo: {
      factura: 'Sin red electrica',
      sistema: '8 kWp + 20 kWh bateria',
      inversion: '$18,000',
      payback: 'Vs generador diesel: 5 anos',
      ahorro25: '$40,000+ vs generador',
    },
    cta: 'Cotizar sistema off-grid',
  },
  {
    id: 'mantenimiento',
    icon: <Wrench className="w-7 h-7" />,
    titulo: 'Mantenimiento y Monitoreо',
    subtitulo: 'Para sistemas ya instalados',
    desc: 'Revision anual de paneles, limpieza profesional, actualizacion de firmware y diagnostico remoto. Para sistemas Solaris y de otras marcas.',
    detalles: [
      'Limpieza profesional de paneles (1-2 veces/ano)',
      'Revision de conexiones y estructura',
      'Diagnostico remoto via plataforma digital',
      'Reemplazo de equipos bajo garantia',
      'Disponible para sistemas de cualquier marca',
      'Plan de mantenimiento anual con descuento',
    ],
    ejemplo: {
      factura: 'Sistema existente',
      sistema: 'Cualquier tamano',
      inversion: 'Desde $150/ano',
      payback: 'Previene perdidas del 15-25%',
      ahorro25: 'Maximiza vida util del sistema',
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
    titulo: 'Visita tecnica',
    desc: 'Vamos a tu propiedad a evaluar el techo, medir el consumo y analizar la orientacion solar.',
  },
  {
    num: '03',
    titulo: 'Propuesta con numeros reales',
    desc: 'En 24 horas tienes una propuesta detallada: sistema, costo, ahorro mensual y payback.',
  },
  {
    num: '04',
    titulo: 'Instalacion en un dia',
    desc: 'Nuestro equipo instala el sistema completo. Al final del dia, el sistema genera energia.',
  },
  {
    num: '05',
    titulo: 'Activacion y monitoreo',
    desc: 'Tramitamos la conexion con ENSA/EDEMET y configuramos tu plataforma de monitoreo.',
  },
];

export default function ServiciosPage() {
  const navigate = useNavigate();

  function handleCotizar(servicioId: string) {
    navigate(`/landing?servicio=${servicioId}`);
  }

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
            <span className="text-white/60">Servicios</span>
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
            <Zap className="w-3.5 h-3.5" />
            Ley 417 — Equipos sin impuestos en Panama
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6 max-w-4xl mx-auto"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Soluciones Solares{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #D4A843 0%, #f5d080 50%, #D4A843 100%)' }}
            >
              para cada necesidad
            </span>
          </h1>

          <p className="text-lg text-white/50 leading-relaxed mb-10 max-w-2xl mx-auto">
            Desde hogares familiares hasta grandes negocios comerciales.
            Diseñamos e instalamos el sistema exacto para tu consumo, tu techo
            y tu presupuesto.
          </p>

          {/* Quick nav */}
          <div className="flex flex-wrap justify-center gap-3">
            {servicios.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D4A843]/15 text-sm text-white/60 hover:text-white hover:border-[#D4A843]/30 transition-all"
                style={{ background: 'rgba(11,61,46,0.3)' }}
              >
                {s.icon}
                {s.titulo}
              </a>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Servicios */}
      <section className="relative z-10 px-6 py-8 max-w-6xl mx-auto space-y-8">
        {servicios.map((s, i) => (
          <motion.div
            key={s.id}
            id={s.id}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-2xl border border-[#D4A843]/10 overflow-hidden"
            style={{ background: 'rgba(11,61,46,0.25)' }}
          >
            <div className="grid md:grid-cols-[1fr_320px] gap-0">
              {/* Main content */}
              <div className="p-8">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#D4A843]/10 flex items-center justify-center text-[#D4A843]">
                    {s.icon}
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold text-white"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {s.titulo}
                    </h2>
                    <p className="text-sm text-[#D4A843]/70">{s.subtitulo}</p>
                  </div>
                </div>

                <p className="text-sm text-white/50 leading-relaxed mb-6">{s.desc}</p>

                <div className="grid sm:grid-cols-2 gap-2 mb-6">
                  {s.detalles.map((d) => (
                    <div key={d} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-white/60">{d}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  onClick={() => handleCotizar(s.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-[#D4A843]/20"
                  style={{ background: 'linear-gradient(135deg, #D4A843, #f5d080)', color: '#071F17' }}
                >
                  {s.cta}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Ejemplo de ROI */}
              <div
                className="p-6 border-t md:border-t-0 md:border-l border-[#D4A843]/10 flex flex-col justify-center gap-4"
                style={{ background: 'rgba(11,61,46,0.4)' }}
              >
                <div className="text-xs text-[#D4A843]/60 uppercase tracking-wider font-semibold mb-1">
                  Ejemplo tipico
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/40 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      Factura actual
                    </span>
                    <span className="text-sm font-semibold text-white">{s.ejemplo.factura}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/40 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Sistema
                    </span>
                    <span className="text-sm font-semibold text-white">{s.ejemplo.sistema}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/40 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Inversion
                    </span>
                    <span className="text-sm font-semibold text-white">{s.ejemplo.inversion}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-white/40 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Payback
                    </span>
                    <span className="text-sm font-semibold text-[#22c55e]">{s.ejemplo.payback}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-white/40">Ahorro total 25 anos</span>
                    <span className="text-base font-bold text-[#D4A843]">{s.ejemplo.ahorro25}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Proceso */}
      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Como funciona el proceso
          </h2>
          <p className="text-base text-white/40 max-w-xl mx-auto">
            De la primera llamada a energia generando en tu techo — sin complicaciones
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {proceso.map((p, i) => (
            <motion.div
              key={p.num}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative flex flex-col items-center text-center gap-4 px-5 py-7 rounded-2xl border border-[#D4A843]/8"
              style={{ background: 'rgba(11,61,46,0.25)' }}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4A843] to-[#0B3D2E] flex items-center justify-center text-white font-bold text-base shadow-lg">
                {p.num}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{p.titulo}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{p.desc}</p>
              </div>
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
            Cotizacion 100% gratis y sin compromiso
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Que servicio necesitas?
          </h2>
          <p className="text-base text-white/40 mb-8 max-w-lg mx-auto">
            Cuentanos tu situacion y te diremos exactamente que sistema funciona
            mejor para tu consumo y tu presupuesto.
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
            <button onClick={() => navigate('/proyectos')} className="hover:text-white/50 transition-colors">
              Proyectos
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
