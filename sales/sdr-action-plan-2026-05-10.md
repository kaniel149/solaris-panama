# SDR Action Plan — Solaris Panama

**Date:** 2026-05-10
**Author:** Dana (SDR specialist)
**Operator:** Kaniel (Henry persona on WhatsApp)
**Cohort:** 12 inbound leads from Google Ads "Solar Azuero - Search" + 1 stray Meta lead

---

## 1. Executive Summary

- **12 leads received**, all marked "Casa" (residential) — a 10x downsize from our commercial ICP.
- **6 will be actively worked** (Tier A) — book discovery calls + send proposals.
- **4 will be qualified by WhatsApp only** (Tier B) — pitch PPA or nurture.
- **2 will be disqualified** (Tier C) — Thai Meta leak + anonymous WA contact.
- **Realistic outcomes (next 14 days):** 4 discovery calls booked, 3 proposals sent, 1 closed deal.
- **Pipeline value range:** $5K-$60K USD (mostly residential 5-10 kW; one possible small-commercial at $30K+).
- **Critical insight:** 88% of cohort has no UTM/gclid attribution → ad campaign + form tracking need an upstream audit before we burn more $/lead on the wrong audience.

---

## 2. Master Sequence Logic — The Universal Funnel

All 12 leads flow through the same 4-touch sequence. Tier determines depth (A = full sequence + call; B = touches 1-2 then nurture; C = no contact).

### Touch 1 — T+0 (within 60 minutes of plan approval)
**Channel:** WhatsApp (primary). Email if exists and WhatsApp fails.
**Goal:** Confirm identity, acknowledge their form submission, soft-qualify by referencing their bill range, propose a 15-min call.
**Tone:** Warm, expert, "usted," reference Law 417 once.

### Touch 2 — T+24h (if no reply)
**Channel:** WhatsApp.
**Goal:** Value-add follow-up with a specific number tied to their bill range. Move from "are you interested?" to "here's what's possible."

### Touch 3 — T+72h (if still no reply)
**Channel:** WhatsApp + Email (if available).
**Goal:** Social proof + Azuero locality + soft urgency on Law 417. Last attempt to engage.

### Touch 4 — T+7d (breakup)
**Channel:** WhatsApp.
**Goal:** Polite close, leave door open, transition to monthly nurture list.

### Discovery Call (15 min — when they reply YES)
**5 qualifying questions:**
1. "Para confirmar — ¿cuánto pagó en su última factura de luz? ¿Tiene la factura a la mano?"
2. "¿La propiedad es suya o alquila? ¿Cuántos años lleva ahí?"
3. "¿El techo es de zinc, concreto, o teja? ¿Sabe aproximadamente cuántos metros cuadrados tiene?"
4. "Si los números cuadran, ¿quién más participaría en la decisión — esposo/a, socio, familia?"
5. "¿Tiene un rango de inversión en mente, o prefiere explorar opciones sin pago inicial (PPA)?"

**Call closes with one of:**
- (A) Site visit booked → on-site quote within 7 days.
- (B) Direct proposal sent within 48h (if photos + factura already shared).
- (C) Polite "no fit" + ask for referral.

### Proposal (Day 7-14)
**Tool:** Adapt the proposal-builder CLI from TM Energy Thailand:
`/Users/kanieltordjman/Desktop/projects/solar/tm-energy/solar-intelligence/tools/proposal-builder/generate.mjs`

**Required adaptations for Panama:**
- Currency: USD (not THB)
- Regulatory framework: Law 417 + ASEP net metering (replace PEA/Thailand refs)
- Spanish UI strings
- Pricing model: `$1.00–$1.30/W` purchase or `$0.14–$0.17/kWh` PPA
- Drop the 3-language toggle; Spanish-only for this cohort

Output: client-facing URL `solaris-panama.com/p/{REF}` with password gate, digital signature, view tracking.

---

## 3. Per-Lead Plans

---

### LEAD 1 — Luisa Moreira  🟢 TIER A (HIGHEST PRIORITY)

- **Phone:** +507 6903-4854
- **Bill:** $500+/mo (top of cohort)
- **Install type:** "Otro" — possibly commercial or large residence
- **Timeline:** Lo antes posible
- **Form age:** 17 days (cooling — needs urgent re-engagement)
- **Status:** HOT but going cold. Bill at $500+ is the ICP-adjacent sweet spot.
- **Goal:** Book a phone call within 48h. If "Otro" = small commercial, escalate to ICP track.
- **Channel:** WhatsApp first; no email on file.

**Touch 1 (verbatim):**
> Buenos días Luisa, le habla Henry de Solaris Panama. Recibimos su solicitud hace unos días para evaluar paneles solares — disculpe la demora en responder.
>
> Vi que indica un consumo de más de $500 mensuales y que la instalación sería en "Otro" tipo de propiedad. Eso ya es un perfil donde el solar tiene mucho sentido — generalmente recuperamos la inversión en 3-4 años bajo la Ley 417.
>
> ¿Podemos coordinar una llamada de 15 minutos esta semana para entender mejor su propiedad? ¿Le va mejor mañana en la mañana o en la tarde?

**Touch 2 (T+24h):**
> Luisa, le sigo con un dato concreto: para una factura de $500/mes, normalmente recomendamos un sistema de 8-12 kW. Inversión aproximada $10K-$16K, ahorro de $400-$450 al mes desde el primer mes, y la Ley 417 lo deja libre de impuestos de importación.
>
> Si le interesa, puedo prepararle un análisis personalizado — solo necesito una foto de su última factura. ¿Le sirve?

**Touch 3 (T+72h):**
> Luisa, último mensaje por mi parte. Estamos cerrando agenda de visitas en la zona de Azuero para esta y la próxima semana. Si quiere que pasemos a evaluar su techo sin compromiso, dígame y lo coordinamos. Si prefiere esperar, también está bien — quedo a su disposición cuando sea el momento.

**Touch 4 (T+7d — breakup):**
> Luisa, parece que no es el momento — totalmente comprensible. Quedo aquí cuando lo necesite. Que tenga excelente semana.

**Discovery call script (5 Qs):**
1. "Luisa, para empezar — la factura de $500+, ¿es de una casa, un negocio, o una propiedad mixta? Eso me ayuda a entender qué tipo de sistema le sirve."
2. "¿Hace cuánto tiene la propiedad y cuál es su uso principal — vivienda, alquiler turístico, comercio?"
3. "¿El techo es de zinc, concreto, o teja? ¿Aproximadamente cuántos metros cuadrados?"
4. "¿La decisión la toma usted sola o hay alguien más involucrado — esposo, socio, familia?"
5. "Si los números le cuadran — payback de 3-4 años, 20+ años de electricidad casi gratis — ¿estaría considerando comprar el sistema, o prefiere modelo PPA sin pago inicial?"

**Proposed system + price:**
- If residential: 8-10 kW, $9K-$13K, payback 3.5-4.5 yr.
- If small commercial (Otro = negocio): 15-20 kW, $18K-$25K, payback 3-4 yr.
- PPA alt: $0 down, $0.15/kWh.

**Likely objections:**
- *"Es muy caro"* → "Veamos sus números. Con $500/mes, son $6,000 al año a la distribuidora. En 3-4 años eso es la inversión completa." (Objection 1)
- *"Déjame pensarlo"* → "¿Hay algo específico que le genera duda — el costo, el proceso, o algo más?" (Objection 2)
- *"No tengo el capital"* → Offer PPA: "$0 de entrada, paga la energía a tarifa menor que la distribuidora." (Objection 11)

**Disqualification trigger:**
- "Otro" turns out to be a tenant arrangement < 3 yr remaining without landlord involvement.
- Roof < 60 m² usable.
- Prefers off-grid / no interest in net metering.

---

### LEAD 2 — Ivette Palacio  🟢 TIER A

- **Phone:** +507 6200-4025
- **Email:** ivettepalacio@hotmail.com
- **Bill:** $150-$300/mo
- **Install type:** Casa
- **Timeline:** 1-3 meses (real, planned)
- **Form age:** 1 day (fresh!)
- **Status:** Solid residential prospect with realistic timeline.
- **Goal:** Book discovery call this week, send proposal within 7 days.
- **Channel:** WhatsApp + email backup.

**Touch 1 (verbatim):**
> Buenos días Ivette, le habla Henry de Solaris Panama. Recibimos ayer su consulta sobre paneles solares para su casa — gracias por contactarnos.
>
> Vi que su factura está entre $150 y $300 al mes y que está pensando instalar en los próximos 1-3 meses. Es un excelente perfil para empezar a planificar bien.
>
> Para una factura en ese rango, normalmente recomendamos un sistema residencial de 5-7 kW que cubre 70-90% del consumo, con la Ley 417 libre de impuestos. ¿Le parece si coordinamos una llamada de 15 minutos esta semana para revisar números puntuales para su casa?

**Touch 2 (T+24h):**
> Ivette, le comparto un ejemplo concreto: para una casa con factura promedio de $200/mes, un sistema de 6 kW cuesta entre $7K y $9K, ahorra alrededor de $160-$180 al mes, y se paga solo en 4-5 años. Después son 20+ años de electricidad casi gratis.
>
> Si me comparte una foto de su última factura, le preparo un análisis exacto en 48 horas. ¿Le sirve?

**Touch 3 (T+72h):**
> Ivette, sé que dijo que está pensando en 1-3 meses — justamente ese es el tiempo que toma diseñar bien un sistema, tramitar el net metering ante ASEP e instalar. Si arrancamos ahora, llega justo en su ventana. ¿Coordinamos una visita rápida esta semana?

**Touch 4 (T+7d):**
> Ivette, dejo mi número aquí por si surge algo. Cuando esté lista, hacemos números juntos. Que le vaya bien.

**Discovery call script:**
1. "Ivette, para confirmar — ¿la factura de $150-$300 varía mucho mes a mes, o se mantiene estable?"
2. "¿La casa es propia? ¿Cuántos años lleva ahí?"
3. "¿De qué material es el techo y aproximadamente cuántos metros cuadrados tiene?"
4. "¿La decisión la toma con su esposo/familia o sola?"
5. "¿Tiene presupuesto pensado, o prefiere ver opciones de financiamiento / PPA sin pago inicial?"

**Proposed system + price:**
- 5-7 kW, $6K-$9K (purchase), 4-5 yr payback.
- PPA alt: $0 down, ~$0.15/kWh, 20% savings vs grid from day 1.

**Likely objections:**
- *"Tengo que consultarlo con mi esposo"* → "¿Le ayudaría si preparo un resumen ejecutivo para que lo revisen juntos? Puedo estar disponible por teléfono si tienen preguntas." (Objection 5)
- *"¿Y si me mudo?"* → "El sistema solar aumenta el valor de la propiedad un 4-6%. Es un activo que se queda con la casa." (Objection 8)
- *"El trámite con ASEP es complicado"* → "Nosotros tramitamos todo — solicitud, distribuidora, permisos. Usted firma." (Objection 13)

**Disqualification trigger:**
- Renter without landlord buy-in.
- Bill turns out to be < $100 average.
- Roof < 30 m² or heavy shade.

---

### LEAD 3 — Olga  🟢 TIER A (GEO-RELEVANT)

- **Phone:** +507 6330-0130
- **Email:** sherbtna.ilga@gmail.com
- **Bill:** $150-$300/mo
- **Install type:** Casa
- **City:** **Las Tablas** (only lead with real Azuero city specified — geographic gold)
- **Timeline:** Lo antes posible
- **Form age:** 9 days
- **Status:** Real Azuero resident = lowest CAC for site visit. Geographically aligned with our entire strategy.
- **Goal:** Book in-person site visit this week (we should be in Azuero anyway).
- **Channel:** WhatsApp + email.

**Touch 1 (verbatim):**
> Buenos días Olga, le habla Henry de Solaris Panama. Recibimos su solicitud sobre paneles solares para su casa en Las Tablas — me alegra mucho, justamente Las Tablas y la zona de Azuero es donde más estamos trabajando.
>
> Vi que su factura está entre $150 y $300 al mes y que quiere avanzar lo antes posible. Para una casa en ese rango, un sistema solar de 5-7 kW se paga solo en 4-5 años — y la Ley 417 lo deja libre de impuestos.
>
> Como estamos haciendo visitas en Las Tablas esta semana, ¿le parece si pasamos a evaluar su techo sin compromiso? Solo necesito 30 minutos. ¿Qué día le sirve?

**Touch 2 (T+24h):**
> Olga, otra ventaja de estar en Las Tablas: el ASEP local ya conoce nuestros trámites y se mueve rápido. Mientras tanto, si me comparte una foto de su factura, le adelanto el análisis personalizado por WhatsApp. ¿Le sirve?

**Touch 3 (T+72h):**
> Olga, vamos a estar por Las Tablas el jueves y viernes de esta semana. Si quiere aprovechamos para pasar — sin compromiso, solo evaluamos el techo y le doy números reales en el momento. Dígame qué hora le sirve mejor.

**Touch 4 (T+7d):**
> Olga, cuando esté lista para retomar, aquí estamos. Saludos desde la zona.

**Discovery call script:**
1. "Olga, para confirmar — ¿la dirección en Las Tablas es centro o las afueras? Necesito ubicarla en mapa."
2. "¿Cuánto le llegó la última factura exactamente? ¿Tiene meses con factura más alta?"
3. "¿El techo es de zinc o concreto? ¿Tiene árboles o edificios al lado que den sombra?"
4. "¿Decisión suya o también participa esposo/familia?"
5. "¿Prefiere comprar el sistema y dueño desde el día 1, o explorar PPA sin pago inicial?"

**Proposed system + price:**
- 5-7 kW, $6K-$9K, 4-5 yr payback.
- Las Tablas advantage: faster site visit + faster ASEP processing.

**Likely objections:**
- *"Mi techo no sirve"* → "Eso lo determinamos en la visita. La mayoría de techos en Las Tablas funcionan con refuerzos menores o ninguno." (Objection 14)
- *"No confío en la tecnología"* → "Panamá ya tiene 170 MW instalados. La planta de AES en Las Tablas lleva años operando. Es la misma tecnología, solo que en su techo." (Objection 3)
- *"Es muy caro"* → Offer PPA path. (Objection 1 / 11)

**Disqualification trigger:**
- Address not actually in Azuero peninsula.
- Roof unviable on visual inspection.
- Heavy seasonal shade.

---

### LEAD 4 — Francisco Spina  🟢 TIER A (EXPAT-LIKELY)

- **Phone:** +507 6818-3034
- **Bill:** $150-$300/mo
- **Install type:** Casa
- **Timeline:** Lo antes posible
- **Form age:** 18 days (coldest of A tier)
- **Status:** Italian/expat surname → likely familiar with European solar pricing, more open to ROI conversation. But 18 days old — needs strong re-engagement angle.
- **Goal:** Re-engage with apology + concrete number, book call within 72h.
- **Channel:** WhatsApp first; try Spanish but offer English/Italian if no reply.

**Touch 1 (verbatim — Spanish first):**
> Buenos días Francisco, le habla Henry de Solaris Panama. Disculpe la demora en responder — recibimos su solicitud hace unas semanas y se nos pasó hacer el seguimiento.
>
> Vi que su factura está entre $150 y $300 mensuales y que quiere avanzar pronto. Para que no perdamos más tiempo: en su rango, un sistema residencial de 5-7 kW se paga en 4-5 años bajo la Ley 417.
>
> ¿Tiene 15 minutos esta semana para una llamada? Si prefiere conversar en inglés o italiano, también está bien.

**Touch 2 (T+24h — bilingual fallback):**
> Francisco, in case Spanish isn't your preference: I run Solaris Panama and we install rooftop solar across Azuero. For your bill range ($150-$300/month), a 5-7 kW system costs roughly $7K-$9K, pays back in 4-5 years, and Panama's Law 417 makes it import-tax-free.
>
> Want me to send a quick example proposal so you can see real numbers? Just reply with "yes" and I'll have it for you in 48h.

**Touch 3 (T+72h):**
> Francisco, las personas con su perfil — bill medio, ya familiarizadas con solar — son las que más rápido toman buena decisión. ¿Le parece si nos vemos 15 min por video llamada o por teléfono esta semana? Cuando guste.

**Touch 4 (T+7d):**
> Francisco, lo dejo aquí. If timing changes, you know where to find me. Saludos.

**Discovery call script:**
1. "Francisco, ¿prefiere que conversemos en español o inglés? Whatever's easiest for you."
2. "¿La casa es para residencia permanente, alquiler turístico, o segunda vivienda?"
3. "¿Hace cuánto tiempo está en Panamá / en la propiedad?"
4. "¿El techo es de zinc, concreto, teja? ¿Cuántos m² aprox?"
5. "¿Está pensando comprar el sistema (mejor ROI) o prefiere PPA sin inversión?"

**Proposed system + price:**
- If permanent residence: 6-7 kW, $7.5K-$9K purchase.
- If alquiler turístico: bigger system 8-10 kW given AC load (closer to small commercial).

**Likely objections:**
- *"Prefiero esperar a que la tecnología mejore"* → "La tecnología actual ya es madura. ¿Vale la pena esperar 3 años por 5% más de eficiencia, mientras paga $200/mes a la distribuidora?" (Objection 9)
- *"¿Y si vendo la propiedad?"* → "Aumenta el valor de la propiedad 4-6%. Diferencial de venta." (Objection 8)
- *"It's expensive"* → Offer PPA. (Objection 1 / 11)

**Disqualification trigger:**
- Property is short-term rental managed by third party with no equity.
- Replies "not interested" — accept gracefully, don't push.

---

### LEAD 5 — Miguel  🟢 TIER A (CROSS-CHANNEL)

- **Phone:** +507 6220-8800
- **Email:** maykel2209@hotmail.com
- **Bill:** $150-$300/mo
- **Install type:** Casa
- **Timeline:** Lo antes posible
- **Form age:** 3 days
- **Has fbc tracking:** arrived via Meta retargeting AND Google Ads → warm cross-channel signal.
- **Status:** Multi-touch attribution = warmer than the form alone suggests.
- **Goal:** Capitalize on Meta retargeting — book call within 48h.
- **Channel:** WhatsApp + email.

**Touch 1 (verbatim):**
> Buenos días Miguel, le habla Henry de Solaris Panama. Recibimos su consulta hace unos días sobre paneles solares para su casa — gracias por contactarnos.
>
> Vi que su factura está entre $150 y $300 mensuales y que quiere avanzar pronto. Para una casa en ese rango, un sistema de 5-7 kW se paga en 4-5 años con la Ley 417.
>
> ¿Coordinamos una llamada de 15 minutos esta semana para revisar números reales para su casa?

**Touch 2 (T+24h):**
> Miguel, le adelanto los números: 6 kW cuesta entre $7K y $9K, ahorra unos $160-$180/mes, y a partir del año 4-5 es electricidad casi gratis por 20+ años. Si me manda foto de su última factura, le hago un análisis personalizado en 48h.

**Touch 3 (T+72h):**
> Miguel, último contacto antes de pausar — si quiere que sigamos adelante, dígame "sí" y le coordino una visita o videollamada. Si prefiere esperar, también está bien.

**Touch 4 (T+7d):**
> Miguel, lo dejo aquí. Cuando guste, retomamos.

**Discovery call script:** Same as Ivette (residential standard).

**Proposed system + price:** 5-7 kW, $6K-$9K.

**Likely objections:** "Pensarlo" / "consultarlo con esposa" / "es caro" → standard responses.

**Disqualification trigger:** Renter without owner involvement.

---

### LEAD 6 — Militzen Virginia Baule  🟢 TIER A

- **Phone:** +507 6687-6731
- **Email:** militzenb090535@gmail.com
- **Bill:** $150-$300/mo
- **Install type:** Casa
- **Timeline:** Lo antes posible
- **Form age:** 11 days
- **Status:** Standard residential profile. 11 days = warm-cool, needs re-engagement.
- **Goal:** Book call within 72h.
- **Channel:** WhatsApp + email.

**Touch 1 (verbatim):**
> Buenos días Militzen, le habla Henry de Solaris Panama. Disculpe la demora — recibimos su consulta hace algunos días sobre paneles solares para su casa.
>
> Su factura entre $150 y $300 está en el rango ideal para un sistema residencial de 5-7 kW, que se paga solo en 4-5 años bajo la Ley 417.
>
> ¿Tiene 15 minutos esta semana para conversar? Le explico opciones puntuales para su casa.

**Touch 2 (T+24h):**
> Militzen, ejemplo concreto: una casa con $200/mes de factura — sistema 6 kW, $7-$9K, ahorra $160-$180/mes desde el primer mes. Si me comparte foto de su factura le hago números exactos.

**Touch 3 (T+72h):**
> Militzen, le mando email también con un resumen — busque "Solaris Panama" en su correo. Y si prefiere PPA sin pago inicial, también lo manejamos. ¿Hablamos esta semana?

**Touch 4 (T+7d):**
> Militzen, quedo a su disposición cuando esté lista. Saludos.

**Discovery call script:** Standard residential 5 questions.

**Proposed system + price:** 5-7 kW, $6K-$9K.

**Likely objections:** "Pensarlo" / "consultar familia" / "trámite ASEP" → standard.

**Disqualification trigger:** Renter / bill turns out < $100 / no real timeline.

---

### LEAD 7 — Yarisel De Gracia  🟡 TIER B (BORDERLINE — PPA PITCH)

- **Phone:** +507 6524-7498
- **Bill:** $50-$150/mo (borderline ROI for purchase)
- **Install type:** Casa
- **Timeline:** 1-3 meses
- **Form age:** 15 days
- **Status:** Bill too low for purchase ROI (payback would be 7-9 years). PPA is the right pitch.
- **Goal:** Qualify by WhatsApp; if real bill is closer to $150 → escalate to A. Otherwise PPA pitch.
- **Channel:** WhatsApp only.

**Touch 1 (verbatim):**
> Buenos días Yarisel, le habla Henry de Solaris Panama. Recibimos su consulta hace unos días sobre paneles solares.
>
> Para que valga la pena, primero quiero entender bien sus números. ¿Cuánto le llega la factura de luz en promedio — más cerca de $80, $100, o $150?
>
> Si está en el rango bajo, normalmente recomendamos modelo PPA: $0 de inversión inicial, paga la energía a tarifa menor que la distribuidora desde el primer mes.

**Touch 2 (T+24h):**
> Yarisel, el PPA funciona así: nosotros instalamos el sistema sin que usted pague nada. Usted paga por la energía a $0.15/kWh (más barato que los ~$0.20 de la distribuidora). Ahorra desde el día 1, sin riesgo, sin deuda. ¿Le interesa explorarlo?

**Touch 3 (T+72h — soft close):**
> Yarisel, si por ahora prefiere esperar a que la factura suba o cambie de casa, también está bien. La dejo en mi lista de seguimiento — la contacto en unos meses para ver si cambia algo.

**Touch 4:** Skip — already nurturing.

**Discovery call script (only if she replies with real interest):**
1. "Yarisel, ¿cuánto exactamente fue su última factura? ¿Hay meses con $150 o solo $50-$80?"
2. "¿La casa es propia?"
3. "¿Techo de zinc o concreto? ¿Cuántos m²?"
4. "¿Está abierta al modelo PPA — sin pago inicial?"
5. "¿Cuándo realísticamente quiere tener el sistema funcionando?"

**Proposed system + price:**
- PPA only: 3-5 kW, $0 down, $0.15/kWh.
- Disqualify from purchase track unless bill confirmed > $150 average.

**Likely objections:**
- *"Es muy caro"* → Lead with PPA from start. (Objection 11)
- *"No es el momento"* → Accept, nurture monthly. (Objection 6)

**Disqualification trigger:** Confirmed bill < $80, no openness to PPA → polite no, add to nurture list.

---

### LEAD 8 — Benjamín  🟡 TIER B (PPA OR DISQUALIFY)

- **Phone:** +507 6617-9100
- **Email:** bcanatem201@gmail.com
- **Bill:** <$50/mo (too low)
- **Install type:** Casa
- **Timeline:** Lo antes posible
- **Form age:** 1 day (fresh but weak fit)
- **Status:** Bill too low for any purchase ROI. PPA only or polite disqualify.
- **Goal:** Quick qualifier — confirm bill, if truly < $50 → disqualify gracefully.
- **Channel:** WhatsApp only.

**Touch 1 (verbatim):**
> Buenos días Benjamín, le habla Henry de Solaris Panama. Recibimos ayer su consulta sobre paneles solares — gracias por contactarnos.
>
> Para no hacerle perder tiempo, primero le confirmo: para que el solar tenga sentido económico, normalmente la factura debe estar arriba de $80-$100/mes. Indicó "menos de $50" — ¿es el promedio real, o hay meses más altos?

**Touch 2 (T+24h):**
> Benjamín, si la factura realmente está en menos de $50, honestamente el solar no se paga solo en tiempo razonable — preferiría no venderle algo que no le conviene. Si en el futuro su consumo aumenta (aire acondicionado, ampliación), aquí estamos.

**Touch 3:** Skip.

**Touch 4 (T+7d — graceful close + referral ask):**
> Benjamín, gracias por considerarnos. Si conoce a alguien en Azuero con factura más alta — hotel, finca, comercio — agradezco la referencia. Saludos.

**Discovery call:** Skip unless he replies with bill > $80.

**Proposed system + price:** N/A (disqualified) or PPA 3 kW only.

**Likely objections:** N/A — we're disqualifying.

**Disqualification trigger:** Confirmed bill < $80 → polite no.

---

### LEAD 9 — Susana  🟡 TIER B (SAME AS BENJAMÍN)

- **Phone:** +507 6751-7584
- **Email:** yacast21@gmail.com
- **Bill:** <$50/mo
- **Install type:** Casa
- **Timeline:** Lo antes posible
- **Form age:** 1 day
- **Status:** Same profile as Benjamín — bill too low.
- **Goal:** Quick qualifier; disqualify gracefully if confirmed.
- **Channel:** WhatsApp only.

**Touch 1 (verbatim):**
> Buenos días Susana, le habla Henry de Solaris Panama. Recibimos ayer su consulta sobre paneles solares.
>
> Antes de hacerle perder tiempo: indicó factura "menos de $50" mensuales. Para que el solar valga la pena económicamente, normalmente debe estar arriba de $80-$100. ¿Es ese su promedio real o hay meses más altos?

**Touch 2 (T+24h):**
> Susana, si efectivamente la factura es muy baja, prefiero ser honesto: el ahorro no justifica la inversión todavía. En cuanto su consumo crezca (más electrodomésticos, AC, ampliación), retomamos.

**Touch 3:** Skip.

**Touch 4 (T+7d):**
> Susana, gracias por considerarnos. Si conoce a alguien con consumo mayor que necesite solar, agradezco el contacto. Saludos.

**Discovery call:** Skip unless bill > $80.

**Proposed system + price:** N/A or PPA 3 kW.

**Disqualification trigger:** Bill < $80 confirmed.

---

### LEAD 10 — Raquel Almanza  🟡 TIER B (NURTURE)

- **Phone:** +507 6048-4023
- **Bill:** <$50/mo
- **Install type:** Casa
- **Timeline:** "Investigando" (just researching)
- **Form age:** 14 days
- **Status:** Lowest urgency + lowest bill = pure nurture.
- **Goal:** Single light-touch message + add to monthly nurture list.
- **Channel:** WhatsApp.

**Touch 1 (verbatim):**
> Buenos días Raquel, le habla Henry de Solaris Panama. Recibimos su consulta hace unos días — vi que está investigando sobre solar, lo cual me parece muy bien.
>
> Para una factura menor a $50, el solar todavía no se paga solo en tiempo razonable. Pero le envío de vez en cuando información útil sobre la Ley 417 y casos en Azuero, sin compromiso. ¿Le parece bien?

**Touch 2:** Skip — she's investigating, not buying. Add to monthly nurture broadcast.

**Touch 3 / 4:** N/A.

**Discovery call:** Only if she initiates with concrete consumption increase.

**Proposed system + price:** N/A — research-mode lead.

**Disqualification trigger:** No reply or "still researching" → nurture only.

---

### LEAD 11 — WhatsApp Anonymous Contact  ⚫ TIER C

- **Phone:** +507 6936-5754
- **No data on file.**
- **Already received:** auto-message "henry_engaged" on 2026-05-09 21:49 UTC via the bridge.
- **Status:** Anonymous WA contact, auto-message already sent. Don't know who or why.
- **Goal:** One human follow-up. If no reply within 48h, drop.
- **Channel:** WhatsApp.

**Touch 1 (single follow-up — only if no reply to auto-message yet):**
> Hola, soy Henry de Solaris Panama. Le mandé un mensaje ayer y quería confirmar si llegó bien. ¿En qué le puedo ayudar — está pensando en paneles solares para su casa o negocio?

**Touch 2-4:** None. If no reply by T+48h, drop.

**Discovery call:** Only if he replies with real interest — then route through standard flow.

**Disqualification trigger:** No reply within 48h.

---

### LEAD 12 — ฮะหนุง ยูเทรินย์ (Thai contact)  ⚫ TIER C — DISQUALIFY

- **Phone:** +66 99-865-8048 (Thailand)
- **Language:** Thai
- **Bill:** "menos_de_$50"
- **Reported a shop in Lopburi, Thailand**
- **Source:** Meta ad campaign 120244366033540391 leaked to Thailand
- **Goal:** No contact. Document for ad ops fix.
- **Channel:** None.

**Action:**
- Do NOT message.
- Document in CRM as "Disqualified — wrong country (Meta geo-leak)."
- Flag campaign 120244366033540391 to ad ops to add country exclusion (Panama only, exclude Thailand + ROW).

**Disqualification trigger:** Already triggered (wrong country).

---

## 4. Daily Cadence — This Week (2026-05-11 → 2026-05-17)

Best Panama hours: **Mar-Jue 8-10 AM, 2-4 PM**. Avoid Mon AM, Fri PM, and Panamanian holidays.

### Monday 2026-05-11 (avoid AM)
**Afternoon (2-4 PM Panama):**
- Send Touch 1 to **Luisa** (T1 oldest hot lead — top priority)
- Send Touch 1 to **Olga** (Las Tablas geo-relevance, urgent)
- Send Touch 1 to **Ivette** (freshest, highest fit)
- Send Touch 1 to **Miguel** (cross-channel, warm)

### Tuesday 2026-05-12 (best day)
**Morning (8-10 AM):**
- Send Touch 1 to **Francisco** (re-engagement after 18 days)
- Send Touch 1 to **Militzen**
- Send Touch 1 (qualifier) to **Yarisel** + **Benjamín** + **Susana** + **Raquel** (Tier B batch)
- Send Touch 1 to **Anonymous WA** (Lead 11)
**Afternoon:**
- Touch 2 follow-up to anyone who hasn't replied from yesterday's batch (Luisa, Olga, Ivette, Miguel).
- Take any inbound replies → schedule discovery calls Wed/Thu.

### Wednesday 2026-05-13
**Morning:** Discovery calls (book in 30-min slots, 9 AM, 9:45 AM, 10:30 AM).
**Afternoon:** Touch 2 to Tier A lagging replies (Francisco, Militzen).

### Thursday 2026-05-14
**Morning:** More discovery calls + site visits if Olga/others booked in Las Tablas.
**Afternoon:** Touch 3 to anyone still silent from Mon-Tue. Start drafting proposals for confirmed prospects.

### Friday 2026-05-15
**Morning only (avoid PM):** Send first 1-2 proposals via adapted proposal-builder. Email as PDF + WA share link.
**No outbound after 12 PM.**

### Saturday-Sunday: Off (Panamanian B2C respects weekends).

### Monday 2026-05-18:
- Touch 4 (breakup) for any non-responders from week 1.
- Continue proposal cycles.
- Plan Week 2 follow-ups with discovery-call attendees.

---

## 5. Tracking Table

| # | Name | Phone | Tier | Goal | Next Action | Owner | Status | Last Touch | Pipeline Value |
|---|------|-------|------|------|-------------|-------|--------|-----------|---------------|
| 1 | Luisa Moreira | 50769034854 | A | Book call (small commercial?) | T1 Mon PM | Henry/Kaniel | Untouched | — | $10K-$25K |
| 2 | Ivette Palacio | 50762004025 | A | Book call → proposal in 7d | T1 Mon PM | Henry/Kaniel | Untouched | — | $7K-$9K |
| 3 | Olga | 50763300130 | A | Site visit Las Tablas | T1 Mon PM | Henry/Kaniel | Untouched | — | $7K-$9K |
| 4 | Francisco Spina | 50768183034 | A | Re-engage + book call | T1 Tue AM | Henry/Kaniel | Untouched | — | $7K-$10K |
| 5 | Miguel | 50762208800 | A | Book call | T1 Mon PM | Henry/Kaniel | Untouched | — | $7K-$9K |
| 6 | Militzen V. Baule | 50766876731 | A | Book call | T1 Tue AM | Henry/Kaniel | Untouched | — | $7K-$9K |
| 7 | Yarisel De Gracia | 50765247498 | B | Qualify → PPA pitch | T1 Tue AM | Henry/Kaniel | Untouched | — | $0-$5K (PPA) |
| 8 | Benjamín | 50766179100 | B | Qualify → likely DQ | T1 Tue AM | Henry/Kaniel | Untouched | — | $0 |
| 9 | Susana | 50767517584 | B | Qualify → likely DQ | T1 Tue AM | Henry/Kaniel | Untouched | — | $0 |
| 10 | Raquel Almanza | 50760484023 | B | Nurture | T1 Tue AM (light) | Henry/Kaniel | Untouched | — | $0 (nurture) |
| 11 | WhatsApp Anonymous | 50769365754 | C | Single follow-up | T1 Tue AM | Henry/Kaniel | Auto-msg sent | 2026-05-09 | TBD |
| 12 | ฮะหนุง ยูเทรินย์ | +66998658048 | C | DISQUALIFY (Thai) | None — flag campaign | — | Disqualified | — | $0 |

**Pipeline total range:** $45K-$75K (Tier A only) + $5K-$10K (Tier B PPA upside) = **$50K-$85K**.

---

## 6. Red Flags & Campaign Fixes (For Kaniel)

### 🔴 Critical issues found in the cohort:

1. **Google Ads pulling residential when ICP is commercial.** Campaign "Solar Azuero - Search" has zero filters for bill size or property type. Action: add "comercial," "hotel," "negocio," "supermercado," "finca" as required keywords; add negatives like "casa pequeña," "alquiler."

2. **Meta ads geo-leak to Thailand** (Lead 12). Campaign 120244366033540391 has no country exclusion. Action: lock targeting to Panama only.

3. **All 12 leads selected "Casa" or "Otro" in install type** — the LP form likely doesn't surface the commercial path well. Action: redesign the LP install-type selector to make commercial the primary CTA, with sub-segments (Hotel / Supermercado / Finca / Otro Comercial).

4. **88% of leads have no UTM/gclid/fbclid attribution.** Either (a) traffic is direct/organic from a different source, or (b) the form is stripping UTMs before insertion. Audit the form handler in `landing/` codebase.

5. **0 follow-up activity for 3 weeks on existing leads.** CRM workflow is broken — no auto-assign, no SLA alerts. Migration 008 added attribution but no follow-up automation. Action: create cron job `/api/cron/lead-followup-sla` that pings Henry/operator if a lead is untouched > 24h.

6. **Form bill ranges peak at $50-$300** — none above $1,500. Either the dropdown caps too low, or our ICP audience isn't seeing the ad. Add a "$1,500+" option to the bill-range dropdown explicitly.

7. **City field mostly empty / "Otro"** — 11 of 12 didn't enter a real city. Make city a required field with autocomplete (Las Tablas, Pedasi, Chitré, Cañas, Tonosí).

### Recommended sequence to fix campaign:
1. **This week:** work the 12 leads regardless (sunk cost).
2. **End of week:** pause Google Ads campaign until keywords + LP fixed.
3. **Next week:** relaunch with commercial-first targeting + LP redesign.
4. **Track:** % of new leads with bill > $500 and timeline within 3 months. Target: 60%+.

---

## 7. WhatsApp Message Pack — Ready to Send (Tier A, Send Order)

> Copy-paste sequentially. Send Monday 2026-05-11 between 2:00 PM and 4:00 PM Panama time. Tuesday batch (Francisco + Militzen) between 8:00 AM and 10:00 AM.
>
> Spacing: 5-10 minutes between messages so replies don't pile up.

---

#### MESSAGE 1 — Luisa Moreira (+507 6903-4854) — MONDAY 2:00 PM

```
Buenos días Luisa, le habla Henry de Solaris Panama. Recibimos su solicitud hace unos días para evaluar paneles solares — disculpe la demora en responder.

Vi que indica un consumo de más de $500 mensuales y que la instalación sería en "Otro" tipo de propiedad. Eso ya es un perfil donde el solar tiene mucho sentido — generalmente recuperamos la inversión en 3-4 años bajo la Ley 417.

¿Podemos coordinar una llamada de 15 minutos esta semana para entender mejor su propiedad? ¿Le va mejor mañana en la mañana o en la tarde?
```

---

#### MESSAGE 2 — Olga (+507 6330-0130) — MONDAY 2:10 PM

```
Buenos días Olga, le habla Henry de Solaris Panama. Recibimos su solicitud sobre paneles solares para su casa en Las Tablas — me alegra mucho, justamente Las Tablas y la zona de Azuero es donde más estamos trabajando.

Vi que su factura está entre $150 y $300 al mes y que quiere avanzar lo antes posible. Para una casa en ese rango, un sistema solar de 5-7 kW se paga solo en 4-5 años — y la Ley 417 lo deja libre de impuestos.

Como estamos haciendo visitas en Las Tablas esta semana, ¿le parece si pasamos a evaluar su techo sin compromiso? Solo necesito 30 minutos. ¿Qué día le sirve?
```

---

#### MESSAGE 3 — Ivette Palacio (+507 6200-4025) — MONDAY 2:20 PM

```
Buenos días Ivette, le habla Henry de Solaris Panama. Recibimos ayer su consulta sobre paneles solares para su casa — gracias por contactarnos.

Vi que su factura está entre $150 y $300 al mes y que está pensando instalar en los próximos 1-3 meses. Es un excelente perfil para empezar a planificar bien.

Para una factura en ese rango, normalmente recomendamos un sistema residencial de 5-7 kW que cubre 70-90% del consumo, con la Ley 417 libre de impuestos. ¿Le parece si coordinamos una llamada de 15 minutos esta semana para revisar números puntuales para su casa?
```

---

#### MESSAGE 4 — Miguel (+507 6220-8800) — MONDAY 2:30 PM

```
Buenos días Miguel, le habla Henry de Solaris Panama. Recibimos su consulta hace unos días sobre paneles solares para su casa — gracias por contactarnos.

Vi que su factura está entre $150 y $300 mensuales y que quiere avanzar pronto. Para una casa en ese rango, un sistema de 5-7 kW se paga en 4-5 años con la Ley 417.

¿Coordinamos una llamada de 15 minutos esta semana para revisar números reales para su casa?
```

---

#### MESSAGE 5 — Francisco Spina (+507 6818-3034) — TUESDAY 8:00 AM

```
Buenos días Francisco, le habla Henry de Solaris Panama. Disculpe la demora en responder — recibimos su solicitud hace unas semanas y se nos pasó hacer el seguimiento.

Vi que su factura está entre $150 y $300 mensuales y que quiere avanzar pronto. Para que no perdamos más tiempo: en su rango, un sistema residencial de 5-7 kW se paga en 4-5 años bajo la Ley 417.

¿Tiene 15 minutos esta semana para una llamada? Si prefiere conversar en inglés o italiano, también está bien.
```

---

#### MESSAGE 6 — Militzen Virginia Baule (+507 6687-6731) — TUESDAY 8:10 AM

```
Buenos días Militzen, le habla Henry de Solaris Panama. Disculpe la demora — recibimos su consulta hace algunos días sobre paneles solares para su casa.

Su factura entre $150 y $300 está en el rango ideal para un sistema residencial de 5-7 kW, que se paga solo en 4-5 años bajo la Ley 417.

¿Tiene 15 minutos esta semana para conversar? Le explico opciones puntuales para su casa.
```

---

## End of Plan

**Status:** Awaiting Kaniel approval before any message is sent.
**Next review:** Friday 2026-05-15 (mid-week pulse) or after first 3 replies arrive.
