import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Shield,
  Clock,
  DollarSign,
  FileText,
  Phone,
  User,
  CheckCircle2,
  MessageCircle,
  Star,
} from 'lucide-react';
import { trackLeadConversion } from '@/lib/gtag';

// ─── Types ─────────────────────────────────────────────────────────────────

interface FormState {
  nombre: string;
  telefono: string;
  factura: string;
}

interface FormErrors {
  nombre?: string;
  telefono?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const WHATSAPP_NUMBER = '50765831822';
const PANAMA_PHONE_REGEX = /^6\d{7}$/;

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  delay,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center gap-2 px-6 py-5 rounded-2xl backdrop-blur-xl border border-[#D4A843]/10 shadow-glass"
      style={{ background: 'rgba(11,61,46,0.4)' }}
    >
      <div className="w-10 h-10 rounded-xl bg-[#D4A843]/10 flex items-center justify-center text-[#D4A843]">
        {icon}
      </div>
      <span className="text-2xl font-bold text-white leading-tight">{value}</span>
      <span className="text-xs text-white/40 text-center leading-snug">{label}</span>
    </motion.div>
  );
}

function StepCard({
  number,
  title,
  description,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative flex flex-col items-center text-center gap-4 px-6 py-8 rounded-2xl backdrop-blur-xl border border-[#D4A843]/8 bg-[#0B3D2E]/30"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4A843] to-[#0B3D2E] flex items-center justify-center text-white font-bold text-lg shadow-lg">
        {number}
      </div>
      <div>
        <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-white/40 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    nombre: '',
    telefono: '',
    factura: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.nombre.trim()) next.nombre = 'Por favor ingresa tu nombre.';
    const phone = form.telefono.replace(/\s/g, '');
    if (!phone) next.telefono = 'Por favor ingresa tu teléfono.';
    else if (!PANAMA_PHONE_REGEX.test(phone))
      next.telefono = 'Número inválido. Debe empezar con 6 y tener 8 dígitos.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    // Track Google Ads + Meta Pixel conversion (Enhanced Conversions w/ hashed PII)
    const conv = await trackLeadConversion({
      phone: form.telefono.trim(),
      firstName: form.nombre.trim().split(' ')[0],
      lastName: form.nombre.trim().split(' ').slice(1).join(' ') || undefined,
      value: 1.0,
      currency: 'USD',
    }).catch(() => ({ eventId: '', fbc: null, fbp: null }));

    // Extract UTM + click-id params from URL
    const params = new URLSearchParams(window.location.search);

    // Save lead to database
    try {
      await fetch('/api/leads/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.nombre.trim(),
          phone: form.telefono.trim(),
          monthly_bill: form.factura || null,
          source: params.get('utm_source') === 'google' ? 'google_ads'
            : params.get('utm_source') === 'facebook' ? 'facebook'
            : params.get('utm_source') === 'instagram' ? 'instagram'
            : 'website',
          campaign: params.get('utm_campaign') || null,
          utm_source: params.get('utm_source') || null,
          utm_medium: params.get('utm_medium') || null,
          utm_campaign: params.get('utm_campaign') || null,
          utm_content: params.get('utm_content') || null,
          utm_term: params.get('utm_term') || null,
          gclid: params.get('gclid') || null,
          fbclid: params.get('fbclid') || null,
          // CAPI dedup + click attribution
          event_id: conv.eventId,
          fbc: conv.fbc,
          fbp: conv.fbp,
        }),
      });
    } catch {
      // Don't block WhatsApp if DB save fails
    }

    // Build WhatsApp message
    const facturaText = form.factura ? ` Mi factura mensual promedio es $${form.factura}.` : '';
    const message = encodeURIComponent(
      `Hola! Me interesa una cotización para paneles solares. Mi nombre es ${form.nombre.trim()} y mi teléfono es ${form.telefono.trim()}.${facturaText}`
    );
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    setSubmitting(false);
    setSubmitted(true);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-[#FEFDFB] overflow-x-hidden" style={{ background: '#071F17' }}>

      {/* ── Background ambiance ──────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(212,168,67,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.2) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Gold glow — top */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-[#0B3D2E]/30 blur-[140px]" />
        {/* Green glow — bottom-left */}
        <div className="absolute bottom-0 -left-40 w-[600px] h-[600px] rounded-full bg-[#D4A843]/[0.06] blur-[120px]" />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/solaris-icon.png" alt="Solaris" className="w-9 h-9" />
          <span className="text-base font-bold tracking-wide text-white" style={{ fontFamily: "'Playfair Display', serif" }}>SOLARIS</span>
          <span className="hidden sm:inline text-xs text-[#D4A843]/60 font-normal">Panamá</span>
        </div>
        <button
          onClick={scrollToForm}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4A843] hover:bg-[#c49835] text-[#0a0a0f] text-sm font-semibold transition-colors shadow-lg shadow-[#D4A843]/20"
        >
          Cotización Gratis
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pt-12 pb-16 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] text-xs font-medium mb-6">
            <img src="/solaris-icon.png" alt="" className="w-3.5 h-3.5" />
            Ley 417 — Equipos sin impuestos
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
            Tu Techo Puede{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #D4A843 0%, #f5d080 50%, #D4A843 100%)',
              }}
            >
              Ahorrarte Hasta 95%
            </span>
            <br className="hidden sm:block" />
            {' '}en Electricidad
          </h1>

          {/* Sub */}
          <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-8">
            Instalación profesional de paneles solares en la Península de Azuero.
            <br className="hidden sm:block" />
            Ley 417: equipos sin impuestos. Garantía de 25 años.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              onClick={scrollToForm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold text-[#0a0a0f] text-base shadow-lg shadow-[#D4A843]/30 transition-all"
              style={{ background: 'linear-gradient(135deg, #D4A843 0%, #f5d080 100%)' }}
            >
              Solicitar Cotización Gratis
              <ArrowRight className="w-4 h-4" />
            </motion.button>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 text-base font-medium transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#25d366]" />
              WhatsApp Directo
            </a>
          </div>
        </motion.div>

        {/* Social proof micro-line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-1.5 mt-8 text-xs text-white/30"
        >
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-[#D4A843] text-[#D4A843]" />
          ))}
          <span className="ml-1">+50 hogares instalados en Azuero</span>
        </motion.div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            value="$280→$35"
            label="Ahorro real por mes"
            delay={0}
          />
          <StatCard
            icon={<Shield className="w-5 h-5" />}
            value="25+ Años"
            label="Garantía del sistema"
            delay={0.1}
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            value="1 Día"
            label="Tiempo de instalación"
            delay={0.2}
          />
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            value="Ley 417"
            label="Sin impuestos de importación"
            delay={0.3}
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            ¿Cómo funciona?
          </h2>
          <p className="text-sm text-white/40">Simple y rápido — de cotización a ahorro en días</p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
          {/* Connector line — desktop only */}
          <div className="hidden sm:block absolute top-[52px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-[#D4A843]/0 via-[#D4A843]/30 to-[#D4A843]/0" />

          <StepCard
            number="1"
            title="Cotización Gratis"
            description="Completa el formulario o escríbenos por WhatsApp. Te respondemos en menos de 2 horas."
            delay={0}
          />
          <StepCard
            number="2"
            title="Diseño e Instalación"
            description="Nuestros técnicos visitan tu hogar, diseñan el sistema ideal y lo instalan en un solo día."
            delay={0.15}
          />
          <StepCard
            number="3"
            title="Ahorro Inmediato"
            description="Desde el primer mes ves la diferencia en tu factura. Tu inversión se paga sola en 3-5 años."
            delay={0.3}
          />
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(11,61,46,0.5) 0%, rgba(18,18,26,0.8) 60%)',
            border: '1px solid rgba(212,168,67,0.15)',
          }}
        >
          <div className="px-8 py-10 md:px-12 md:py-12 flex flex-col md:flex-row items-center gap-8">
            {/* Icon */}
            <div className="shrink-0 w-20 h-20 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center">
              <img src="/solaris-icon.png" alt="Solaris" className="w-10 h-10" />
            </div>

            {/* Quote */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D4A843] text-[#D4A843]" />
                ))}
              </div>
              <blockquote className="text-lg sm:text-xl font-medium text-white/90 leading-relaxed mb-4">
                "Nuestro cliente en Pedasí pasó de{' '}
                <span className="text-[#ef4444] font-bold">$280</span> a{' '}
                <span className="text-[#22c55e] font-bold">$35</span> en su factura mensual.{' '}
                Ahorro de{' '}
                <span className="text-[#D4A843] font-bold">$2,940 al año</span>."
              </blockquote>
              <p className="text-sm text-white/30">— Cliente en Pedasí, Herrera · Sistema 5kW instalado 2024</p>
            </div>

            {/* Savings callout */}
            <div className="shrink-0 text-center px-6 py-5 rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/20">
              <div className="text-xs text-[#D4A843]/70 uppercase tracking-wider font-semibold mb-1">
                Ahorro anual
              </div>
              <div className="text-3xl font-bold text-[#D4A843]">$2,940</div>
              <div className="text-xs text-white/30 mt-1">por año</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CONTACT FORM ─────────────────────────────────────────────────── */}
      <section
        id="contacto"
        ref={formRef}
        className="relative z-10 px-6 pb-24 max-w-2xl mx-auto"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0B3D2E]/50 border border-[#0B3D2E] text-[#22c55e] text-xs font-medium mb-4">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Gratis — Sin compromiso
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Solicitar Cotización Gratis
            </h2>
            <p className="text-sm text-white/40">
              Completa el formulario y te contactamos en menos de 2 horas
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl backdrop-blur-xl border border-[#D4A843]/10 shadow-glass-lg p-6 sm:p-8"
            style={{ background: 'rgba(11,61,46,0.4)' }}>
            <AnimatePresence mode="wait">
              {submitted ? (
                /* Thank you state */
                <motion.div
                  key="thanks"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center gap-5 py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-[#22c55e]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      ¡Gracias, {form.nombre.split(' ')[0]}!
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                      Se abrió WhatsApp con tu mensaje. Si no se abrió automáticamente,
                      escríbenos directo al{' '}
                      <a
                        href={`https://wa.me/${WHATSAPP_NUMBER}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#25d366] underline"
                      >
                        507-6583-1822
                      </a>
                      .
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ nombre: '', telefono: '', factura: '' });
                    }}
                    className="text-xs text-white/30 hover:text-white/60 underline transition-colors"
                  >
                    Enviar otra consulta
                  </button>
                </motion.div>
              ) : (
                /* Form */
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  noValidate
                >
                  {/* Nombre */}
                  <div>
                    <label
                      htmlFor="nombre"
                      className="block text-xs font-medium text-white/50 mb-1.5"
                    >
                      Nombre completo <span className="text-[#D4A843]">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                      <input
                        id="nombre"
                        name="nombre"
                        type="text"
                        autoComplete="name"
                        value={form.nombre}
                        onChange={handleChange}
                        placeholder="Juan Pérez"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border text-white text-sm placeholder:text-white/20 focus:outline-none focus:bg-white/[0.06] transition-all ${
                          errors.nombre
                            ? 'border-red-500/40 focus:border-red-500/60'
                            : 'border-white/[0.08] focus:border-[#D4A843]/40'
                        }`}
                      />
                    </div>
                    {errors.nombre && (
                      <p className="mt-1.5 text-xs text-red-400">{errors.nombre}</p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label
                      htmlFor="telefono"
                      className="block text-xs font-medium text-white/50 mb-1.5"
                    >
                      Teléfono <span className="text-[#D4A843]">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                      <input
                        id="telefono"
                        name="telefono"
                        type="tel"
                        autoComplete="tel"
                        value={form.telefono}
                        onChange={handleChange}
                        placeholder="6583-1822"
                        maxLength={9}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border text-white text-sm placeholder:text-white/20 focus:outline-none focus:bg-white/[0.06] transition-all ${
                          errors.telefono
                            ? 'border-red-500/40 focus:border-red-500/60'
                            : 'border-white/[0.08] focus:border-[#D4A843]/40'
                        }`}
                      />
                    </div>
                    {errors.telefono && (
                      <p className="mt-1.5 text-xs text-red-400">{errors.telefono}</p>
                    )}
                  </div>

                  {/* Factura */}
                  <div>
                    <label
                      htmlFor="factura"
                      className="block text-xs font-medium text-white/50 mb-1.5"
                    >
                      Factura mensual promedio{' '}
                      <span className="text-white/25 font-normal">(opcional)</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                      <input
                        id="factura"
                        name="factura"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={form.factura}
                        onChange={handleChange}
                        placeholder="150"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#D4A843]/40 focus:bg-white/[0.06] transition-all"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={submitting ? {} : { scale: 1.01 }}
                    whileTap={submitting ? {} : { scale: 0.99 }}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all shadow-lg ${
                      submitting
                        ? 'bg-[#D4A843]/30 text-[#D4A843]/50 cursor-not-allowed'
                        : 'text-[#0a0a0f] hover:shadow-[#D4A843]/30'
                    }`}
                    style={
                      submitting
                        ? {}
                        : { background: 'linear-gradient(135deg, #D4A843 0%, #f5d080 100%)' }
                    }
                  >
                    {submitting ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-[#D4A843]/30 border-t-[#D4A843] rounded-full inline-block"
                        />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Solicitar Cotización Gratis
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>

                  <p className="text-center text-xs text-white/20">
                    Al enviar, abriremos WhatsApp para conectarte directamente con nuestro equipo.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/25">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#D4A843]/50" />
              Empresa registrada en Panamá
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]/50" />
              Ley 417 aplicada
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D4A843]/50" />
              Respuesta en &lt;2 horas
            </span>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#D4A843]/10 px-6 py-8 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <div className="flex items-center gap-2">
            <img src="/solaris-icon.png" alt="Solaris" className="w-4 h-4 opacity-50" />
            <span>Solaris Panama — Energía Solar en la Península de Azuero</span>
          </div>
          <div className="flex items-center gap-4">
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

      {/* ── FLOATING WHATSAPP BUTTON ─────────────────────────────────────── */}
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
        {/* WhatsApp SVG icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-7 h-7 fill-white"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>

        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping bg-[#25d366]/30 -z-10" />
      </motion.a>
    </div>
  );
}
