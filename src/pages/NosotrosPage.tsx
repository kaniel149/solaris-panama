import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Phone,
  MessageCircle,
  CheckCircle2,
  Shield,
  Users,
  Award,
  MapPin,
  Zap,
  Heart,
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

const valores = [
  {
    icon: <Zap className="w-6 h-6" />,
    titulo: 'Velocidad',
    desc: 'Propuesta en 24 horas. Instalacion en un dia. Sin burocracia.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    titulo: 'Transparencia',
    desc: 'Numeros reales, garantias claras. Sin letra pequena ni sorpresas.',
  },
  {
    icon: <Heart className="w-6 h-6" />,
    titulo: 'Compromiso Local',
    desc: 'Somos de Azuero. Conocemos la peninsula, el clima y las necesidades de cada familia.',
  },
  {
    icon: <Award className="w-6 h-6" />,
    titulo: 'Calidad Premium',
    desc: 'Solo paneles Tier-1 certificados. Inversores con 10-25 anos de garantia.',
  },
];

const hitos = [
  { año: '2019', evento: 'Fundacion de Solaris Panama en Chitre, Herrera.' },
  { año: '2021', evento: 'Primeras 50 instalaciones residenciales en la Peninsula de Azuero.' },
  { año: '2023', evento: 'Expansion a proyectos comerciales. Primer sistema de 100+ kWp instalado.' },
  { año: '2024', evento: 'Mas de 150 instalaciones completadas. Certificacion bajo Ley 417.' },
  { año: '2025', evento: 'Lanzamiento de plataforma digital de monitoreo para clientes.' },
  { año: '2026', evento: 'Expansion a toda la region de Azuero. ROI promedio de clientes: 3.8 anos.' },
];

export default function NosotrosPage() {
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
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3"
          >
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
            <span className="text-white/60">Sobre Nosotros</span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-20 pb-20 max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] text-xs font-medium mb-6">
              <MapPin className="w-3.5 h-3.5" />
              Fundada en Chitre, Herrera · 2019
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              La empresa solar{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #D4A843 0%, #f5d080 50%, #D4A843 100%)' }}
              >
                de tu vecino
              </span>
            </h1>

            <p className="text-lg text-white/50 leading-relaxed mb-8 max-w-2xl">
              No somos una empresa de la capital. Somos de Azuero. Conocemos
              el calor, las lluvias, las tarifas de ENSA y EDEMET, y la vida
              en la peninsula. Eso nos hace diferentes.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={() => navigate('/landing')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold text-base shadow-lg shadow-[#D4A843]/25"
                style={{ background: 'linear-gradient(135deg, #D4A843, #f5d080)', color: '#071F17' }}
              >
                Solicitar Cotizacion Gratis
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <button
                onClick={() => navigate('/servicios')}
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-base font-medium transition-all"
              >
                Ver Nuestros Servicios
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 px-6 py-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: '150+', label: 'Instalaciones completadas' },
            { value: '95%', label: 'Clientes satisfechos' },
            { value: '7 anos', label: 'Experiencia en Azuero' },
            { value: '$2,940', label: 'Ahorro anual promedio' },
          ].map((stat, i) => (
            <motion.div
              key={stat.value}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-col items-center gap-2 px-5 py-6 rounded-2xl border border-[#D4A843]/10"
              style={{ background: 'rgba(11,61,46,0.4)' }}
            >
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-xs text-white/40 text-center">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mision */}
      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="text-3xl sm:text-4xl font-bold text-white mb-5"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Nuestra Mision
            </h2>
            <p className="text-base text-white/50 leading-relaxed mb-6">
              Hacer que la energia solar sea accesible, simple y rentable para
              cada familia y empresa en la Peninsula de Azuero. Sin tecnicismos,
              sin promesas vacias. Solo resultados reales.
            </p>
            <p className="text-base text-white/50 leading-relaxed mb-8">
              Creemos que cada techo en Panama tiene el potencial de convertirse
              en una fuente de ingreso pasivo. Nuestra mision es hacer que eso
              ocurra — con rapidez, transparencia y garantias reales.
            </p>
            <div className="space-y-3">
              {[
                'Propuesta personalizada en menos de 24 horas',
                'Instalacion profesional en un solo dia',
                'Monitoreo remoto incluido sin costo adicional',
                'Garantia de rendimiento por 25 anos',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white/60">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl p-8 border border-[#D4A843]/15"
            style={{ background: 'linear-gradient(135deg, rgba(11,61,46,0.6) 0%, rgba(7,31,23,0.9) 60%)' }}
          >
            <h3
              className="text-xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Por que Azuero?
            </h3>
            <div className="space-y-4 text-sm text-white/50 leading-relaxed">
              <p>
                La Peninsula de Azuero recibe en promedio <strong className="text-[#D4A843]">5.0 horas de sol por dia</strong> — incluso en temporada de lluvias. Eso nos situa entre las mejores zonas del mundo para energia solar.
              </p>
              <p>
                Las tarifas electricas de ENSA y EDEMET son de las mas altas de Centroamerica a nivel residencial. Eso significa que el retorno de inversion de un sistema solar aqui es extraordinario: entre <strong className="text-[#D4A843]">3 y 5 anos</strong>.
              </p>
              <p>
                Ademas, la Ley 417 de Panama exonera del pago de impuestos de importacion a todos los equipos de energia renovable. Eso reduce el costo del sistema entre un <strong className="text-[#D4A843]">15 y 20%</strong> versus otros paises.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Valores */}
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
            Nuestros Valores
          </h2>
          <p className="text-base text-white/40 max-w-xl mx-auto">
            Los principios que guian cada decision, cada instalacion y cada llamada con un cliente
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {valores.map((v, i) => (
            <motion.div
              key={v.titulo}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group p-6 rounded-2xl border border-[#D4A843]/8 hover:border-[#D4A843]/20 transition-all duration-300"
              style={{ background: 'rgba(11,61,46,0.25)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#D4A843]/10 flex items-center justify-center text-[#D4A843] mb-4 group-hover:bg-[#D4A843]/20 transition-colors">
                {v.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{v.titulo}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Historia */}
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
            Nuestra Historia
          </h2>
          <p className="text-base text-white/40 max-w-xl mx-auto">
            Desde una idea en Chitre hasta la empresa solar de referencia en Azuero
          </p>
        </motion.div>

        <div className="relative max-w-2xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#D4A843]/40 via-[#D4A843]/20 to-transparent" />

          <div className="space-y-8">
            {hitos.map((h, i) => (
              <motion.div
                key={h.año}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex gap-6 pl-14 relative"
              >
                {/* Dot */}
                <div className="absolute left-4 top-1.5 w-4 h-4 rounded-full bg-[#D4A843] border-2 border-[#071F17] -translate-x-1/2" />

                <div>
                  <div className="text-xs font-bold text-[#D4A843] mb-1">{h.año}</div>
                  <p className="text-sm text-white/60 leading-relaxed">{h.evento}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo */}
      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl p-8 md:p-12 border border-[#D4A843]/15 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(11,61,46,0.6) 0%, rgba(7,31,23,0.9) 60%)' }}
        >
          <Users className="w-10 h-10 text-[#D4A843] mx-auto mb-5" />
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Un equipo local, comprometido
          </h2>
          <p className="text-base text-white/50 leading-relaxed max-w-2xl mx-auto mb-6">
            Nuestro equipo esta formado por tecnicos certificados, ingenieros electricos
            y asesores de ventas — todos con experiencia en el mercado panaméno y
            residentes en la Peninsula de Azuero. Cuando llamas a Solaris, hablas
            con alguien que conoce tu zona, tu distribuidor electrico y tu situacion.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-white/30">
            <span className="px-3 py-1.5 rounded-full border border-white/10">Ingenieros certificados</span>
            <span className="px-3 py-1.5 rounded-full border border-white/10">Tecnicos locales</span>
            <span className="px-3 py-1.5 rounded-full border border-white/10">Asesores bilingues</span>
            <span className="px-3 py-1.5 rounded-full border border-white/10">Soporte post-instalacion</span>
          </div>
        </motion.div>
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
            100% Gratis — Sin compromiso
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Conocenos en persona
          </h2>
          <p className="text-base text-white/40 mb-8 max-w-lg mx-auto">
            Visitamos tu propiedad sin costo. Te mostramos el calculo real de
            ahorro y la propuesta completa. Sin presion.
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
            <button onClick={() => navigate('/servicios')} className="hover:text-white/50 transition-colors">
              Servicios
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
