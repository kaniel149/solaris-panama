import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  MessageCircle,
  Phone,
  Shield,
  Star,
  Sun,
  User,
  Zap,
  Home,
  Briefcase,
  Sprout,
  Calendar,
  MapPin,
  CloudRain,
  Wrench,
} from 'lucide-react';
import { trackLeadConversion } from '@/lib/gtag';
import { track, identify } from '@/lib/analytics';

// ─── Constants ─────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = '50765831822';
const PANAMA_PHONE_REGEX = /^6\d{7}$/;
const API_URL = '/api/leads/intake';

// ─── Types ─────────────────────────────────────────────────────────────────
interface QuizState {
  monthly_bill: string;
  location: string;
  installation_type: string;
  timeframe: string;
  nombre: string;
  telefono: string;
}

type StepId = 0 | 1 | 2 | 3 | 4 | 5;

// ─── Options ───────────────────────────────────────────────────────────────
const BILL_OPTIONS = [
  { value: '<$50', label: 'Menos de $50', subtitle: 'Consumo bajo' },
  { value: '$50-$150', label: '$50 – $150', subtitle: 'Consumo moderado' },
  { value: '$150-$300', label: '$150 – $300', subtitle: 'Más común en Azuero' },
  { value: '$300-$500', label: '$300 – $500', subtitle: 'Alto consumo' },
  { value: '$500+', label: 'Más de $500', subtitle: 'Negocio o finca' },
];

const LOCATION_OPTIONS = [
  { value: 'Pedasí', label: 'Pedasí' },
  { value: 'Chitré', label: 'Chitré' },
  { value: 'Las Tablas', label: 'Las Tablas' },
  { value: 'Los Santos', label: 'Los Santos' },
  { value: 'Herrera', label: 'Herrera' },
  { value: 'Otro', label: 'Otra zona' },
];

const INSTALL_OPTIONS = [
  { value: 'Casa', label: 'Mi casa', icon: Home },
  { value: 'Negocio', label: 'Mi negocio', icon: Briefcase },
  { value: 'Finca', label: 'Una finca', icon: Sprout },
  { value: 'Otro', label: 'Otro', icon: FileText },
];

const TIMEFRAME_OPTIONS = [
  { value: 'Lo antes posible', label: 'Lo antes posible', highlight: true },
  { value: '1-3 meses', label: 'En 1 – 3 meses' },
  { value: '3-6 meses', label: 'En 3 – 6 meses' },
  { value: 'Investigando', label: 'Solo estoy investigando' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(
    (k) => {
      const v = params.get(k);
      if (v) utm[k] = v;
    }
  );
  return utm;
}

// ─── Sub-components ────────────────────────────────────────────────────────
function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4A843]/15 bg-white/[0.02] backdrop-blur-sm">
      <span className="text-[#D4A843]">{icon}</span>
      <span className="text-white/80 text-xs font-medium">{text}</span>
    </div>
  );
}

function OptionCard({
  label,
  subtitle,
  selected,
  onClick,
  icon,
  highlight,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full relative flex items-center gap-4 p-4 md:p-5 rounded-2xl border text-left transition-all ${
        selected
          ? 'border-[#D4A843] bg-[#D4A843]/10 shadow-[0_0_0_4px_rgba(212,168,67,0.15)]'
          : 'border-white/[0.08] bg-white/[0.02] hover:border-[#D4A843]/30 hover:bg-white/[0.04]'
      }`}
    >
      {icon && (
        <span
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            selected ? 'bg-[#D4A843] text-[#071F17]' : 'bg-white/[0.05] text-[#D4A843]'
          }`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1">
        <span className={`block font-semibold text-base ${selected ? 'text-white' : 'text-white/90'}`}>
          {label}
        </span>
        {subtitle && (
          <span className="block text-xs text-white/50 mt-0.5">{subtitle}</span>
        )}
      </span>
      {highlight && !selected && (
        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e]">
          Popular
        </span>
      )}
      {selected && <CheckCircle2 className="w-6 h-6 text-[#D4A843] flex-shrink-0" />}
    </motion.button>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, (current / total) * 100);
  return (
    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-[#D4A843] to-[#f5d080]"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function LpAzueroPage() {
  const [step, setStep] = useState<StepId>(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [quiz, setQuiz] = useState<QuizState>({
    monthly_bill: '',
    location: '',
    installation_type: '',
    timeframe: '',
    nombre: '',
    telefono: '',
  });
  const [errors, setErrors] = useState<{ nombre?: string; telefono?: string }>({});
  const quizRef = useRef<HTMLDivElement>(null);

  // Track initial page view with UTM context
  useEffect(() => {
    const utm = getUtmParams();
    track('lp_azuero_viewed', {
      referrer: document.referrer,
      ...utm,
    });
  }, []);

  // Track each step entrance (funnel analysis)
  useEffect(() => {
    if (step === 0 || done) return;
    track('lp_quiz_step_viewed', {
      step,
      ...(step === 5 && { has_all_answers: true }),
    });
  }, [step, done]);

  // Scroll to quiz when user starts
  const startQuiz = () => {
    track('lp_quiz_started', { source: 'hero_cta' });
    setStep(1);
    setTimeout(() => {
      quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const estimatedSavings = useMemo(() => {
    const map: Record<string, number> = {
      '<$50': 30,
      '$50-$150': 100,
      '$150-$300': 200,
      '$300-$500': 350,
      '$500+': 600,
    };
    const monthly = map[quiz.monthly_bill] || 0;
    const annual = monthly * 0.85 * 12;
    return annual > 0 ? `$${Math.round(annual).toLocaleString()}` : null;
  }, [quiz.monthly_bill]);

  // Auto-advance to next step after selection
  const selectAndAdvance = (field: keyof QuizState, value: string, nextStep: StepId) => {
    track('lp_quiz_answered', {
      step,
      field,
      value,
    });
    setQuiz((q) => ({ ...q, [field]: value }));
    setTimeout(() => setStep(nextStep), 300);
  };

  const validateContact = (): boolean => {
    const newErrors: typeof errors = {};
    if (!quiz.nombre.trim() || quiz.nombre.trim().length < 2) {
      newErrors.nombre = 'Ingresa tu nombre completo';
    }
    const cleanPhone = quiz.telefono.replace(/\D/g, '');
    if (!PANAMA_PHONE_REGEX.test(cleanPhone)) {
      newErrors.telefono = 'Ingresa un número celular válido (6XXXXXXX)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateContact()) {
      track('lp_quiz_validation_error', {
        errors: Object.keys(errors).join(','),
      });
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    const utm = getUtmParams();
    const cleanPhone = quiz.telefono.replace(/\D/g, '');

    track('lp_quiz_submit_attempt', {
      monthly_bill: quiz.monthly_bill,
      location: quiz.location,
      installation_type: quiz.installation_type,
      timeframe: quiz.timeframe,
      ...utm,
    });

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quiz.nombre.trim(),
          phone: `507${cleanPhone}`,
          monthly_bill: null,
          location: quiz.location,
          message: `Monthly: ${quiz.monthly_bill} | Install: ${quiz.installation_type} | Timeframe: ${quiz.timeframe}`,
          source: 'lp_azuero',
          campaign: utm.utm_campaign || 'Solar Azuero - Search',
          ...utm,
        }),
      });

      trackLeadConversion();
      identify(`507${cleanPhone}`, {
        name: quiz.nombre.trim(),
        phone: `507${cleanPhone}`,
        location: quiz.location,
        monthly_bill_range: quiz.monthly_bill,
      });
      track('lp_lead_submitted', {
        ...utm,
        monthly_bill: quiz.monthly_bill,
        location: quiz.location,
        installation_type: quiz.installation_type,
        timeframe: quiz.timeframe,
      });

      // Build pre-filled WhatsApp message
      const waMessage = encodeURIComponent(
        `Hola Solaris! 👋\n\n` +
          `Vengo de la página web. Me llamo ${quiz.nombre.trim()}.\n\n` +
          `💡 Pago mensual de luz: ${quiz.monthly_bill}\n` +
          `🏠 Instalación para: ${quiz.installation_type}\n` +
          `📍 Zona: ${quiz.location}\n` +
          `⏱ Quiero instalar: ${quiz.timeframe}\n\n` +
          `Me gustaría recibir la cotización.`
      );
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;

      setDone(true);
      // Redirect after brief "thanks" screen
      setTimeout(() => {
        window.location.href = waUrl;
      }, 2200);
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071F17] text-white overflow-x-hidden">
      {/* Ambient background with tropical solar photo */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Hero background image — solar panels on tropical roof */}
        <div
          className="absolute top-0 left-0 right-0 h-[85vh] opacity-[0.18] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1600&q=80')",
            maskImage:
              'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071F17]/40 via-[#071F17]/80 to-[#071F17]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#D4A843]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#0b3d2e]/40 blur-[120px]" />
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-10 md:pt-12 md:pb-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Real Solaris Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <img
              src="/solaris-icon.png"
              alt="Solaris Panamá"
              className="w-10 h-10 drop-shadow-[0_0_12px_rgba(212,168,67,0.35)]"
            />
            <span className="text-xl font-bold tracking-tight">Solaris Panamá</span>
          </div>

          {/* Trust badges (above headline) */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
            <TrustBadge icon={<Shield className="w-3.5 h-3.5" />} text="Instaladores certificados" />
            <TrustBadge icon={<Star className="w-3.5 h-3.5" />} text="4.9★ en Azuero" />
            <TrustBadge icon={<FileText className="w-3.5 h-3.5" />} text="Ley 417" />
          </div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight mb-4"
          >
            De <span className="text-[#ef4444]">$280</span> a{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #D4A843 0%, #f5d080 100%)' }}
            >
              $35 al mes
            </span>{' '}
            de luz.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-white/70 mb-8 max-w-xl mx-auto leading-relaxed"
          >
            Responde 4 preguntas rápidas y recibe tu cotización{' '}
            <span className="text-[#D4A843] font-semibold">gratuita</span> por WhatsApp en menos de 5 minutos.
          </motion.p>

          {/* CTA — scrolls to quiz */}
          {step === 0 && (
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startQuiz}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base md:text-lg shadow-2xl shadow-[#D4A843]/30"
              style={{
                background: 'linear-gradient(135deg, #D4A843, #f5d080)',
                color: '#071F17',
              }}
            >
              Empezar ahora · Es gratis
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          )}

          {step === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 flex items-center justify-center gap-4 text-xs text-white/50"
            >
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 2 min
              </span>
              <span>·</span>
              <span>Sin compromiso</span>
              <span>·</span>
              <span className="text-[#25d366] flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> Por WhatsApp
              </span>
            </motion.div>
          )}

          {/* Stats strip */}
          {step === 0 && (
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-10 max-w-xl mx-auto">
              {[
                { value: '234+', label: 'Casas en Azuero' },
                { value: '95%', label: 'Ahorro eléctrico' },
                { value: '<3 años', label: 'Retorno inversión' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                  className="p-4 rounded-2xl border border-[#D4A843]/10 bg-white/[0.02] backdrop-blur-sm"
                >
                  <div className="text-2xl md:text-3xl font-bold text-[#D4A843]">{s.value}</div>
                  <div className="text-[11px] md:text-xs text-white/60 mt-1 font-medium">{s.label}</div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Quiz ────────────────────────────────────────────────────────── */}
      <section ref={quizRef} className="relative px-4 pb-16">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {step > 0 && !done && (
              <motion.div
                key={`step-${step}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-[#D4A843]/10 bg-[#0b3d2e]/40 backdrop-blur-xl p-6 md:p-8 shadow-2xl"
              >
                {/* Progress */}
                <div className="flex items-center justify-between mb-5 text-xs text-white/60">
                  <span>
                    Paso {step} de 5
                    {step < 5 && <span className="text-[#D4A843]"> · {Math.round((step / 5) * 100)}%</span>}
                  </span>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep((s) => (Math.max(1, s - 1) as StepId))}
                      className="text-white/50 hover:text-white/80 transition-colors"
                    >
                      ← Atrás
                    </button>
                  )}
                </div>
                <ProgressBar current={step} total={5} />

                {/* Step 1: Monthly bill */}
                {step === 1 && (
                  <div className="mt-7">
                    <h2 className="text-2xl font-bold mb-2">¿Cuánto pagas mensualmente de luz?</h2>
                    <p className="text-white/60 text-sm mb-6">
                      Esto nos ayuda a calcular tu ahorro exacto
                    </p>
                    <div className="space-y-2.5">
                      {BILL_OPTIONS.map((opt) => (
                        <OptionCard
                          key={opt.value}
                          label={opt.label}
                          subtitle={opt.subtitle}
                          selected={quiz.monthly_bill === opt.value}
                          onClick={() => selectAndAdvance('monthly_bill', opt.value, 2)}
                          highlight={opt.value === '$150-$300'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Location */}
                {step === 2 && (
                  <div className="mt-7">
                    <h2 className="text-2xl font-bold mb-2">¿En qué zona vives?</h2>
                    <p className="text-white/60 text-sm mb-6">
                      Así sabremos qué instalador está más cerca de ti
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {LOCATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => selectAndAdvance('location', opt.value, 3)}
                          className={`flex items-center gap-2 px-4 py-3.5 rounded-xl border transition-all text-sm font-medium ${
                            quiz.location === opt.value
                              ? 'border-[#D4A843] bg-[#D4A843]/10 text-white'
                              : 'border-white/[0.08] bg-white/[0.02] text-white/80 hover:border-[#D4A843]/30'
                          }`}
                        >
                          <MapPin className="w-4 h-4 text-[#D4A843] flex-shrink-0" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Installation type */}
                {step === 3 && (
                  <div className="mt-7">
                    <h2 className="text-2xl font-bold mb-2">¿La instalación es para?</h2>
                    <p className="text-white/60 text-sm mb-6">
                      Cada tipo tiene un sistema diseñado especialmente
                    </p>
                    <div className="space-y-2.5">
                      {INSTALL_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <OptionCard
                            key={opt.value}
                            label={opt.label}
                            selected={quiz.installation_type === opt.value}
                            onClick={() => selectAndAdvance('installation_type', opt.value, 4)}
                            icon={<Icon className="w-5 h-5" />}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 4: Timeframe */}
                {step === 4 && (
                  <div className="mt-7">
                    <h2 className="text-2xl font-bold mb-2">¿Cuándo te gustaría instalar?</h2>
                    <p className="text-white/60 text-sm mb-6">
                      Priorizamos clientes listos para avanzar
                    </p>
                    <div className="space-y-2.5">
                      {TIMEFRAME_OPTIONS.map((opt) => (
                        <OptionCard
                          key={opt.value}
                          label={opt.label}
                          selected={quiz.timeframe === opt.value}
                          onClick={() => selectAndAdvance('timeframe', opt.value, 5)}
                          icon={<Calendar className="w-5 h-5" />}
                          highlight={opt.highlight}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 5: Contact */}
                {step === 5 && (
                  <form onSubmit={handleSubmit} className="mt-7">
                    <h2 className="text-2xl font-bold mb-2">Último paso 🎉</h2>
                    <p className="text-white/60 text-sm mb-6">
                      Déjanos tu nombre y WhatsApp para enviarte la cotización
                      {estimatedSavings && (
                        <>
                          {' '}· Ahorro estimado:{' '}
                          <span className="text-[#22c55e] font-bold">{estimatedSavings}/año</span>
                        </>
                      )}
                    </p>

                    {/* Name */}
                    <div className="mb-4">
                      <label className="block text-xs text-white/60 mb-1.5 font-medium">
                        Nombre completo <span className="text-[#D4A843]">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                          type="text"
                          value={quiz.nombre}
                          onChange={(e) => setQuiz({ ...quiz, nombre: e.target.value })}
                          placeholder="Ej. Carlos Mendoza"
                          className={`w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/[0.04] border text-white placeholder:text-white/20 focus:outline-none transition-all ${
                            errors.nombre
                              ? 'border-[#ef4444]/60'
                              : 'border-white/[0.08] focus:border-[#D4A843]/40 focus:bg-white/[0.06]'
                          }`}
                        />
                      </div>
                      {errors.nombre && (
                        <p className="text-[#ef4444] text-xs mt-1.5">{errors.nombre}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="mb-6">
                      <label className="block text-xs text-white/60 mb-1.5 font-medium">
                        WhatsApp <span className="text-[#D4A843]">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <span className="absolute left-10 top-1/2 -translate-y-1/2 text-white/60 text-sm">+507</span>
                        <input
                          type="tel"
                          value={quiz.telefono}
                          onChange={(e) => setQuiz({ ...quiz, telefono: e.target.value })}
                          placeholder="6123 4567"
                          className={`w-full pl-20 pr-4 py-3.5 rounded-xl bg-white/[0.04] border text-white placeholder:text-white/20 focus:outline-none transition-all ${
                            errors.telefono
                              ? 'border-[#ef4444]/60'
                              : 'border-white/[0.08] focus:border-[#D4A843]/40 focus:bg-white/[0.06]'
                          }`}
                        />
                      </div>
                      {errors.telefono && (
                        <p className="text-[#ef4444] text-xs mt-1.5">{errors.telefono}</p>
                      )}
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ scale: submitting ? 1 : 1.02 }}
                      whileTap={{ scale: submitting ? 1 : 0.98 }}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-base shadow-xl transition-all ${
                        submitting
                          ? 'bg-[#D4A843]/30 text-[#D4A843]/60 cursor-wait'
                          : 'shadow-[#D4A843]/30'
                      }`}
                      style={
                        submitting
                          ? undefined
                          : {
                              background: 'linear-gradient(135deg, #D4A843, #f5d080)',
                              color: '#071F17',
                            }
                      }
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#D4A843]/30 border-t-[#D4A843] rounded-full inline-block animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-5 h-5" />
                          Recibir cotización en WhatsApp
                        </>
                      )}
                    </motion.button>

                    <p className="text-center text-[11px] text-white/40 mt-3">
                      Al enviar aceptas ser contactado por Solaris Panamá por WhatsApp.
                    </p>
                  </form>
                )}
              </motion.div>
            )}

            {/* Thank-you screen */}
            {done && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-[#22c55e]/20 bg-[#0b3d2e]/40 backdrop-blur-xl p-8 md:p-10 text-center shadow-2xl"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#22c55e]/15 mb-5">
                  <CheckCircle2 className="w-8 h-8 text-[#22c55e]" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">¡Listo, {quiz.nombre.split(' ')[0]}! 🎉</h2>
                <p className="text-white/70 mb-5 leading-relaxed">
                  Te estamos redirigiendo a WhatsApp con tu cotización pre-llenada...
                </p>
                <div className="inline-flex items-center gap-2 text-[#25d366] font-semibold">
                  <span className="w-4 h-4 border-2 border-[#25d366]/30 border-t-[#25d366] rounded-full animate-spin" />
                  Abriendo WhatsApp...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Social proof — shown while user is in quiz */}
          {step > 0 && !done && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex items-center justify-center gap-3 text-xs text-white/50"
            >
              <div className="flex -space-x-2">
                {['bg-[#D4A843]', 'bg-[#25d366]', 'bg-[#0ea5e9]'].map((c, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full border-2 border-[#071F17] ${c}`}
                  />
                ))}
              </div>
              <span>
                <span className="text-white font-semibold">12 personas</span> recibieron cotización hoy
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Before / After savings visual ───────────────────────────────── */}
      {step === 0 && (
        <section className="relative px-4 py-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-2">
              Así se ve tu factura <span className="text-[#D4A843]">antes y después</span>
            </h2>
            <p className="text-center text-white/50 text-sm mb-8">
              Caso real de una familia en Las Tablas · Sistema de 8 paneles
            </p>

            <div className="grid grid-cols-2 gap-3 md:gap-5">
              {/* BEFORE */}
              <div className="relative p-5 md:p-6 rounded-3xl border border-[#ef4444]/20 bg-[#ef4444]/5">
                <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-[#ef4444] text-white text-[10px] font-bold uppercase tracking-wider">
                  Antes
                </span>
                <div className="flex items-center gap-2 text-white/70 text-xs mb-3">
                  <Zap className="w-3.5 h-3.5" /> Sin paneles solares
                </div>
                <div className="text-3xl md:text-4xl font-bold text-[#ef4444] mb-1">$280</div>
                <div className="text-xs text-white/50">por mes</div>
                <div className="mt-4 pt-4 border-t border-white/[0.05] text-xs text-white/60">
                  📅 $3,360 al año
                </div>
              </div>

              {/* AFTER */}
              <div className="relative p-5 md:p-6 rounded-3xl border border-[#22c55e]/30 bg-[#22c55e]/5 overflow-hidden">
                <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-[#22c55e] text-[#071F17] text-[10px] font-bold uppercase tracking-wider">
                  Después
                </span>
                <div className="flex items-center gap-2 text-white/70 text-xs mb-3">
                  <Sun className="w-3.5 h-3.5 text-[#D4A843]" /> Con Solaris
                </div>
                <div className="text-3xl md:text-4xl font-bold text-[#22c55e] mb-1">$35</div>
                <div className="text-xs text-white/50">por mes</div>
                <div className="mt-4 pt-4 border-t border-white/[0.05] text-xs text-[#22c55e] font-semibold">
                  💰 $2,940 ahorro al año
                </div>
                <div
                  className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-[#22c55e]/10 blur-2xl"
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Local Testimonial ───────────────────────────────────────────── */}
      {step === 0 && (
        <section className="relative px-4 py-10">
          <div className="max-w-2xl mx-auto">
            <div className="relative p-6 md:p-8 rounded-3xl border border-[#D4A843]/15 bg-gradient-to-br from-[#0b3d2e]/50 to-[#0b3d2e]/20 backdrop-blur-xl">
              {/* Corner quote */}
              <div
                className="absolute -top-4 -left-2 text-[#D4A843]/30 text-7xl leading-none font-serif select-none"
                aria-hidden
              >
                “
              </div>

              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D4A843] text-[#D4A843]" />
                ))}
              </div>

              <p className="text-white/90 text-base md:text-lg leading-relaxed mb-5 relative z-10">
                Antes pagábamos <span className="text-[#ef4444] font-semibold">$320 al mes</span> y
                no entendíamos por qué. Con Solaris en <span className="text-[#D4A843] font-semibold">1 día</span>{' '}
                instalaron todo. Ahora mi factura es de <span className="text-[#22c55e] font-semibold">$28</span>{' '}
                y el sistema se pagó solo en menos de 3 años.
              </p>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4A843] to-[#f5d080] flex items-center justify-center text-[#071F17] font-bold text-lg">
                  M
                </div>
                <div>
                  <div className="font-semibold text-white">Marco Vergara</div>
                  <div className="text-xs text-white/50 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Chitré, Herrera · Cliente desde 2024
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Why us ──────────────────────────────────────────────────────── */}
      {step === 0 && (
        <section className="relative px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              ¿Por qué <span className="text-[#D4A843]">Solaris</span> en Azuero?
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: <Zap className="w-5 h-5" />,
                  title: 'Instalación en 1 día',
                  desc: 'Sin molestias. De la mañana a la noche, tu sistema funcionando.',
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: 'Garantía 25 años',
                  desc: 'Paneles con garantía oficial de fabricante. Nosotros respaldamos la instalación.',
                },
                {
                  icon: <DollarSign className="w-5 h-5" />,
                  title: 'Ley 417 aplicada',
                  desc: 'Aprovechamos los incentivos fiscales panameños en tu favor.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl border border-[#D4A843]/10 bg-white/[0.02] backdrop-blur-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D4A843]/15 flex items-center justify-center text-[#D4A843] mb-3">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-white mb-1.5">{item.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ (Objection handling) ────────────────────────────────────── */}
      {step === 0 && (
        <section className="relative px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
              Preguntas frecuentes
            </h2>
            <p className="text-center text-white/50 text-sm mb-8">
              Las dudas más comunes de nuestros clientes en Azuero
            </p>
            <div className="space-y-3">
              {[
                {
                  icon: <CloudRain className="w-5 h-5" />,
                  q: '¿Qué pasa en temporada de lluvia o tormenta?',
                  a: 'Los paneles funcionan con luz difusa (día nublado = 20-40% producción). En tormentas fuertes tu casa sigue con electricidad gracias al inversor + conexión a red. Garantía completa contra vientos hasta 180 km/h.',
                },
                {
                  icon: <DollarSign className="w-5 h-5" />,
                  q: '¿Cuánto cuesta la instalación y cómo se paga?',
                  a: 'Sistema residencial típico: $3,500 – $8,000 dependiendo del consumo. Ofrecemos financiamiento bancario panameño (hasta 60 meses) — la cuota mensual suele ser menor que tu factura actual de luz.',
                },
                {
                  icon: <Wrench className="w-5 h-5" />,
                  q: '¿Qué pasa si se daña un panel o el inversor?',
                  a: 'Garantía de 25 años en paneles + 10 años en inversor. Nuestro equipo técnico está en Pedasí y Chitré — respuesta en menos de 48 horas. Mantenimiento básico incluido el primer año.',
                },
              ].map((item, i) => (
                <FaqItem key={i} icon={item.icon} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA strip ─────────────────────────────────────────────── */}
      {step === 0 && (
        <section className="relative px-4 py-12">
          <div className="max-w-2xl mx-auto text-center rounded-3xl border border-[#D4A843]/20 bg-gradient-to-br from-[#D4A843]/10 to-[#0b3d2e]/30 backdrop-blur-xl p-8 md:p-10">
            <Sun className="w-12 h-12 text-[#D4A843] mx-auto mb-4" />
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              ¿Listo para dejar de pagarle a la ENSA?
            </h3>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              2 minutos. Sin compromiso. Recibes la cotización directamente en tu WhatsApp.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startQuiz}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base md:text-lg shadow-2xl shadow-[#D4A843]/30"
              style={{
                background: 'linear-gradient(135deg, #D4A843, #f5d080)',
                color: '#071F17',
              }}
            >
              Quiero mi cotización gratis
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative px-4 py-8 border-t border-white/[0.04] text-center pb-24 md:pb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src="/solaris-icon.png" alt="Solaris" className="w-6 h-6 opacity-60" />
          <span className="text-sm font-semibold text-white/70">Solaris Panamá</span>
        </div>
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} · Pedasí, Los Santos ·{' '}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            className="text-[#25d366] hover:underline"
          >
            +507 6583-1822
          </a>
        </p>
      </footer>

      {/* ── Sticky WhatsApp CTA (mobile only, while quiz not started) ─── */}
      {step === 0 && !done && (
        <motion.a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            'Hola, quisiera información sobre paneles solares en Azuero.'
          )}`}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-6 py-4 bg-[#25d366] text-white font-bold shadow-2xl shadow-[#25d366]/30 border-t border-[#25d366]/50"
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp directo · +507 6583-1822
        </motion.a>
      )}
    </div>
  );
}

// ─── FAQ Item component ────────────────────────────────────────────────
function FaqItem({
  icon,
  q,
  a,
}: {
  icon: React.ReactNode;
  q: string;
  a: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left p-4 md:p-5 rounded-2xl border border-[#D4A843]/10 bg-white/[0.02] hover:border-[#D4A843]/25 hover:bg-white/[0.03] transition-all"
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#D4A843]/15 flex items-center justify-center text-[#D4A843] mt-0.5">
          {icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-white text-[15px] leading-snug">{q}</h4>
            <ChevronDown
              className={`w-4 h-4 text-white/50 flex-shrink-0 transition-transform ${
                open ? 'rotate-180' : ''
              }`}
            />
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.p
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 10 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-white/65 leading-relaxed overflow-hidden"
              >
                {a}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
}
