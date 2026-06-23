import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';

// Internal type ids are kept identical to Bustan (concrete, villa, tropical,
// factory, largeroof, field, parking) so the copied frame folders resolve.
// Only the user-facing labels are localized to Panamanian Spanish.
const HOUSE_TYPES = [
  { id: 'concrete', label: 'Techo de concreto' },
  { id: 'villa', label: 'Villa' },
  { id: 'tropical', label: 'Eco-lodge tropical' },
  { id: 'factory', label: 'Fábrica' },
  { id: 'largeroof', label: 'Techo logístico' },
  { id: 'field', label: 'Parque solar' },
  { id: 'parking', label: 'Estacionamiento solar' },
] as const;

type HouseType = (typeof HOUSE_TYPES)[number]['id'];

/** 6 narrative beats (Apple-style), each owns a slice of scroll progress. */
const BEATS = [
  {
    label: 'Su techo hoy',
    description: 'Cada sistema comienza con el techo que usted ya tiene.',
    side: 'left',
    until: 0.12,
  },
  {
    label: 'Cableado y seguridad',
    description: 'Canalización, protección contra sobretensiones y rutas — bien hechas, bien ocultas.',
    side: 'right',
    until: 0.27,
  },
  {
    label: 'Estructura de montaje',
    description: 'Rieles de aluminio de grado marino, diseñados para las cargas de viento del trópico.',
    side: 'left',
    until: 0.45,
  },
  {
    label: 'Se instalan los paneles',
    description: 'Paneles Tier-1, colocados con precisión para el máximo rendimiento.',
    side: 'right',
    until: 0.62,
  },
  {
    label: 'Totalmente instalado',
    description: 'Produciendo desde el primer día — reduciendo su factura de luz cada mes.',
    side: 'left',
    until: 0.78,
  },
  {
    label: 'Construido para durar',
    description: 'Camine a su alrededor — impecable desde cada ángulo, diseñado para más de 25 años.',
    side: 'right',
    until: 1,
  },
] as const;

/** Per-context copy for the 6 beats. Ground-mount ("field") tells a land story;
 *  everything with a roof (incl. factory / large roof) uses the roof story. */
const BEAT_COPY = {
  roof: BEATS.map((b) => ({ label: b.label, description: b.description })),
  field: [
    { label: 'Su terreno hoy', description: 'Cada parque solar comienza con el terreno que usted ya tiene.' },
    { label: 'Obra civil y cimentaciones', description: 'Pilotes hincados o zapatas de concreto — listos para décadas de estabilidad.' },
    { label: 'Montaje y estructura', description: 'Mesas galvanizadas en caliente, diseñadas para el viento y el suelo tropical.' },
    { label: 'Se instalan los paneles', description: 'Módulos Tier-1 con la inclinación óptima — fila tras fila, máximo rendimiento.' },
    { label: 'Energizado y exportando', description: 'Inversores, transformador y conexión a la red — energía a escala de servicio público en línea.' },
    { label: 'Construido para durar', description: 'Recorra las filas — alineación impecable, diseñado para más de 25 años.' },
  ],
  parking: [
    { label: 'Su estacionamiento hoy', description: 'Cada estacionamiento solar comienza con el asfalto que usted ya tiene.' },
    { label: 'Cimentaciones y columnas', description: 'Columnas de acero galvanizado sobre zapatas diseñadas a la medida.' },
    { label: 'Estructura del techado', description: 'Se levanta el marco del estacionamiento — sombra y resistencia en uno solo.' },
    { label: 'Se instalan los paneles', description: 'Paneles Tier-1 coronan el techado — energía arriba, vehículos abajo.' },
    { label: 'Totalmente instalado', description: 'Produciendo energía limpia mientras da sombra a cada espacio.' },
    { label: 'Construido para durar', description: 'Recorra las filas — diseñado para el sol, las tormentas y más de 25 años.' },
  ],
} as const;

function beatKind(type: HouseType): keyof typeof BEAT_COPY {
  if (type === 'field') return 'field';
  if (type === 'parking') return 'parking';
  return 'roof';
}

type Manifest = { ext: string } & Record<HouseType, number>;

// Legacy 63-frame JPEG fallback. Used if the smooth (webp) manifest fetch fails.
// All seven placeholder type folders ship 63 JPEG frames each, so each type has
// a working tab even before the smooth manifest lands.
const LEGACY: Manifest = {
  ext: 'jpg',
  concrete: 63,
  villa: 63,
  tropical: 63,
  factory: 63,
  largeroof: 63,
  field: 63,
  parking: 63,
};

function framePath(type: HouseType, frame: number, ext: string) {
  const dir = ext === 'webp' ? 'frames-smooth' : 'frames';
  return `/${dir}/${type}/${String(frame).padStart(3, '0')}.${ext}`;
}

/** Load order: coarse pass (every 4th frame) then fine fill — canvas always has
 *  a nearby frame to show long before the full set arrives. */
function loadOrder(count: number): number[] {
  const coarse: number[] = [];
  const fine: number[] = [];
  for (let i = 1; i <= count; i++) (i % 4 === 1 ? coarse : fine).push(i);
  return [...coarse, ...fine];
}

function useFrameSequence(type: HouseType, manifest: Manifest) {
  const cache = useRef<Partial<Record<string, (HTMLImageElement | undefined)[]>>>({});
  const [, bump] = useState(0); // re-render signal as frames decode
  const count = manifest[type];
  const key = `${type}-${manifest.ext}`;

  useEffect(() => {
    let cancelled = false;
    const store = (cache.current[key] ??= new Array(count));
    const queue = loadOrder(count).filter((i) => !store[i - 1]);
    let inFlight = 0;
    const CONCURRENCY = 8;

    const next = () => {
      if (cancelled) return;
      while (inFlight < CONCURRENCY && queue.length) {
        const i = queue.shift()!;
        inFlight++;
        const img = new Image();
        img.src = framePath(type, i, manifest.ext);
        img
          .decode()
          .catch(() => undefined) // decode errors: keep going
          .finally(() => {
            inFlight--;
            if (!cancelled) {
              store[i - 1] = img;
              bump((n) => n + 1);
              next();
            }
          });
      }
    };
    next();
    return () => {
      cancelled = true;
    };
  }, [key, type, count, manifest.ext]);

  const frames = cache.current[key] ?? [];
  const loadedCount = frames.filter(Boolean).length;
  return { frames, count, loadedCount };
}

/** Nearest decoded frame to the requested index (so scrubbing never blanks). */
function nearestLoaded(frames: (HTMLImageElement | undefined)[], idx: number) {
  if (frames[idx]) return idx;
  for (let d = 1; d < frames.length; d++) {
    if (idx - d >= 0 && frames[idx - d]) return idx - d;
    if (idx + d < frames.length && frames[idx + d]) return idx + d;
  }
  return -1;
}

export default function SolarInstallationScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeType, setActiveType] = useState<HouseType>('concrete');
  const [manifest, setManifest] = useState<Manifest>(LEGACY);
  const [beat, setBeat] = useState(0);
  const drawnRef = useRef(-1);
  const everDrawnRef = useRef(false);
  const reducedMotion = useReducedMotion();

  // Smooth frame manifest (falls back to legacy 63-frame JPEGs)
  useEffect(() => {
    fetch('/frames-smooth/manifest.json')
      .then((r) => (r.ok ? r.json() : LEGACY))
      .then((m: Manifest) => setManifest(m && m.ext ? m : LEGACY))
      .catch(() => setManifest(LEGACY));
  }, []);

  const { frames, count, loadedCount } = useFrameSequence(activeType, manifest);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Physical glide: spring between scroll and frame index
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.0001,
  });
  const progressSource = reducedMotion ? scrollYProgress : smoothProgress;
  const frameIndex = useTransform(progressSource, [0, 1], [0, count - 1]);

  const drawFrame = useCallback(
    (idx: number) => {
      const canvas = canvasRef.current;
      const target = nearestLoaded(frames, idx);
      if (!canvas || target < 0) return;
      const img = frames[target]!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      ctx.drawImage(img, 0, 0);
      drawnRef.current = target;
      everDrawnRef.current = true;
    },
    [frames]
  );

  // Keep the latest drawFrame in a ref so the long-lived scroll subscription
  // never goes stale. drawFrame closes over `frames`, which changes as frames
  // decode and when the active type switches; binding it directly into the
  // frameIndex listener left the subscription stuck on an early empty-frames
  // closure (canvas froze on one frame after switching house types).
  const drawFrameRef = useRef(drawFrame);
  drawFrameRef.current = drawFrame;

  // Scroll → frame (subscribe once; always invoke the freshest drawFrame)
  useEffect(() => {
    const unsub = frameIndex.on('change', (v) => {
      const idx = Math.max(0, Math.min(Math.round(v), count - 1));
      if (idx !== drawnRef.current) drawFrameRef.current(idx);
    });
    return unsub;
  }, [frameIndex, count]);

  // Scroll → beat
  useEffect(() => {
    const unsub = progressSource.on('change', (v) => {
      const b = BEATS.findIndex((s) => v <= s.until);
      setBeat(b === -1 ? BEATS.length - 1 : b);
    });
    return unsub;
  }, [progressSource]);

  // First paint + type-switch continuity: redraw current position as soon as
  // frames decode — previous type's pixels stay on canvas until then.
  useEffect(() => {
    if (loadedCount === 0) return;
    const idx = Math.max(0, Math.min(Math.round(frameIndex.get()), count - 1));
    drawFrame(idx);
  }, [loadedCount, drawFrame, frameIndex, count]);

  // Preload inactive types after the active one is fully decoded
  useEffect(() => {
    if (loadedCount < count) return;
    HOUSE_TYPES.forEach((t) => {
      if (t.id === activeType) return;
      for (let i = 1; i <= manifest[t.id]; i++) {
        const img = new Image();
        img.src = framePath(t.id, i, manifest.ext);
      }
    });
  }, [loadedCount, count, activeType, manifest]);

  const switching = loadedCount === 0;
  const active = useMemo(() => {
    const base = BEATS[beat];
    const copy = BEAT_COPY[beatKind(activeType)][beat];
    return { side: base.side, label: copy.label, description: copy.description };
  }, [beat, activeType]);

  // Only show tabs for types that actually have frames (smooth manifest or
  // legacy). Keeps new types dormant until their frames + manifest land.
  const availableTypes = useMemo(
    () => HOUSE_TYPES.filter((t) => typeof manifest[t.id] === 'number' && manifest[t.id] > 0),
    [manifest]
  );

  return (
    <section ref={containerRef} className="relative" style={{ height: '500vh' }}>
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden bg-[var(--bustan-shell)]">
        {/* House type tabs */}
        <div className="absolute top-6 z-20 flex flex-wrap justify-center gap-2 px-4">
          {availableTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`
                px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                ${
                  activeType === type.id
                    ? 'bg-[var(--bustan-lagoon)] text-[var(--bustan-shell)] shadow-[0_14px_32px_rgba(0,111,107,0.20)]'
                    : 'bg-[rgba(216,236,232,0.72)] text-[rgba(39,52,47,0.68)] hover:bg-[rgba(216,236,232,0.96)]'
                }
              `}
            >
              {type.label}
              {activeType === type.id && switching && (
                <span className="ml-2 inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin align-middle" />
              )}
            </button>
          ))}
        </div>

        {/* Vertical progress rail (desktop) */}
        <div className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 flex-col items-center">
          <div className="relative w-px h-64 bg-[rgba(36,70,62,0.14)]">
            <motion.div
              className="absolute top-0 left-0 w-px bg-[var(--bustan-lagoon)]"
              animate={{ height: `${((beat + 1) / BEATS.length) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            {BEATS.map((_, i) => (
              <div
                key={i}
                className={`absolute -left-[3px] w-[7px] h-[7px] rounded-full transition-colors duration-300 ${
                  i <= beat ? 'bg-[var(--bustan-lagoon)]' : 'bg-[rgba(36,70,62,0.2)]'
                }`}
                style={{ top: `${(i / (BEATS.length - 1)) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="relative w-full max-w-5xl aspect-video mx-auto px-8">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />

          {/* Beat card — alternates sides on desktop */}
          <AnimatePresence mode="wait">
            <motion.div
              key={beat}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`
                hidden md:block absolute top-1/2 -translate-y-1/2 max-w-[260px] z-10
                ${active.side === 'left' ? 'left-0 lg:-left-10' : 'right-0 lg:-right-10'}
              `}
            >
              <div className="bg-[rgba(255,255,255,0.78)] backdrop-blur-md rounded-2xl p-5 shadow-[0_18px_44px_rgba(20,45,40,0.10)] border border-[rgba(36,70,62,0.08)]">
                <span className="text-[11px] font-mono text-[var(--bustan-lagoon)]">
                  {String(beat + 1).padStart(2, '0')} / {String(BEATS.length).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-semibold text-[var(--bustan-ink)] mt-1 mb-1.5">
                  {active.label}
                </h3>
                <p className="text-[13px] leading-relaxed text-[rgba(39,52,47,0.62)]">
                  {active.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* First-visit loading shimmer (only while canvas is still empty) */}
          {switching && !everDrawnRef.current && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-44 h-1.5 bg-[rgba(36,70,62,0.12)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full w-1/3 bg-[var(--bustan-lagoon)] rounded-full"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Beat card — mobile (docked bottom) */}
        <div className="md:hidden absolute bottom-10 left-4 right-4 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={beat}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="bg-[rgba(255,255,255,0.82)] backdrop-blur-md rounded-xl px-4 py-3 text-center shadow-[0_12px_30px_rgba(20,45,40,0.10)]"
            >
              <span className="text-[10px] font-mono text-[var(--bustan-lagoon)]">
                {String(beat + 1).padStart(2, '0')}/{String(BEATS.length).padStart(2, '0')}
              </span>
              <h3 className="text-base font-semibold text-[var(--bustan-ink)]">{active.label}</h3>
              <p className="text-xs text-[rgba(39,52,47,0.6)] mt-0.5">{active.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Scroll hint */}
        {beat === 0 && !switching && (
          <motion.div
            className="absolute bottom-3 text-[rgba(39,52,47,0.48)] text-xs flex flex-col items-center gap-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span>Desplácese para explorar</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M4 9l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}
      </div>
    </section>
  );
}
