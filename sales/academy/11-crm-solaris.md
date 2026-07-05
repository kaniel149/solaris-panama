# Módulo 11: El CRM de Solaris (Paso a Paso)

> **Academia de Ventas Solaris Panama** | Nivel: Vendedor nuevo
> Tiempo estimado: 1.5 horas de estudio + práctica guiada en el sistema

---

## 🎯 Objetivos del Módulo

Al terminar este módulo, usted podrá:

1. Acceder al CRM de Solaris e identificar cada sección de la pantalla.
2. Encontrar un lead, leer sus datos de contacto y saber de dónde vino.
3. Actualizar el estado de un lead correctamente con cada avance del proceso.
4. Registrar una nota útil después de cada contacto (llamada, WhatsApp, visita).
5. Marcar un trato como ganado con el valor de la venta en dólares.
6. Usar los filtros y la búsqueda para encontrar cualquier lead en segundos.
7. Leer las insignias de atribución sin tocarlas ni modificarlas.

---

## Acceso al CRM

**URL del CRM:** [VERIFICAR CON GERENTE — confirmar la URL de producción]
**Credenciales:** [VERIFICAR CON GERENTE — proceso de creación de usuario para vendedores nuevos]

Una vez dentro, verá una barra lateral izquierda con dos grupos de opciones. El primero se llama **CRM** y contiene las secciones que usted usará todos los días.

---

## Tour de Pantallas

### 1. Barra lateral (navegación principal)

La barra lateral tiene dos grupos:

**Grupo CRM:** Dashboard · **Leads** (su pantalla principal) · Clients · Proposals · Projects · Calendar · Monitoring · Lead Pipeline (kanban de techos del escáner — el gerente le indicará cuándo usarlo).

**Grupo Maps & Tools:** Scanner · Calculator · Proposal Generator.

Para el trabajo diario de ventas, su pantalla principal es **Leads**.

---

### 2. Pantalla de Leads — Vista General

Cuando abre **Leads**, lo primero que ve son dos filas de tarjetas con números.

**Fila 1 — Estado del pipeline:**

| Tarjeta | Qué mide |
|---------|---------|
| Total | Todos los leads en el sistema |
| Nuevos | Leads que llegaron pero usted aún no ha contactado |
| Contactados | Leads que ya recibieron al menos un mensaje suyo |
| Calificados | Leads con los que habló y confirmó que califican |
| Ganados | Contratos firmados |
| Vencidos | Leads que llevan demasiado tiempo sin contacto — requieren acción hoy |

**Fila 2 — Origen de los leads:** Google Ads LP (página con gclid) · Google Lead Form (formulario en Google) · Meta Lead Ads (formulario en Facebook/Instagram) · WhatsApp (bridge o import manual). Estos números son de solo lectura — no los modifique.

---

### 3. Barra de herramientas

Debajo de las tarjetas de estadísticas encontrará cuatro controles:

1. **Campo de búsqueda** — Escriba el nombre o el teléfono de un prospecto para encontrarlo al instante.
2. **Filtro de estado** — Menú desplegable con todos los estados posibles. Use "Todos los estados" para ver el pipeline completo, o seleccione uno para enfocarse.
3. **Filtro de fuente** — Filtra por origen del lead (Google, Meta, WhatsApp, etc.).
4. **Botón "Ocultar proveedores"** — Por defecto, el CRM esconde los contactos marcados como proveedores, socios o "no es lead". Si necesita verlos, active este botón.

---

### 4. La Tabla de Leads

La tabla muestra sus leads ordenados del más reciente al más antiguo. Cada fila tiene cinco columnas:

- **Nombre** — El nombre del prospecto. Si el lead tiene más de varios días sin contacto, verá una etiqueta roja "Requiere seguimiento" debajo del nombre.
- **Teléfono** — El número de contacto. Al lado hay un ícono verde de WhatsApp; al hacer clic abre WhatsApp con un mensaje pre-escrito en español, listo para enviar.
- **Fuente** — De dónde vino el lead (Google, Meta, WhatsApp, manual, etc.). Puede mostrar etiquetas adicionales como `gclid` o `platform id` — esas son insignias de atribución (las explicamos más adelante).
- **Estado** — Un menú de color que muestra el estado actual. Puede cambiarlo directamente desde aquí haciendo clic.
- **Fecha** — La fecha en que el lead entró al sistema.

Para ver el detalle completo de un lead, haga clic en su fila.

---

### 5. Panel de Detalle del Lead

Al hacer clic en un lead, aparece un panel lateral a la derecha con toda la información:

**Contacto:**
- Nombre y teléfono con botones de WhatsApp y llamada.
- Email (si lo capturó el formulario).
- Factura mensual en dólares (si el prospecto lo indicó en el formulario — `$XX/mes`).

**Fuente y estado:**
- Insignia con el origen del lead.
- Nombre de la campaña (si el lead viene de una campaña de ads configurada).
- Etiqueta de "Seguimiento vencido" en rojo si el lead lleva demasiado tiempo inactivo.

**Automatización** (solo lectura): WA auto (WhatsApp enviado automáticamente al llegar), Meta CAPI enviado, Google offline enviado. No toque estos campos.

**Atribución** (solo lectura — se explica en la sección siguiente).

**Valor de la venta** (solo si estado = "Ganado"): campo numérico en dólares. Si el lead tiene `gclid`, al guardar se reporta automáticamente a Google Ads como conversión offline.

**Estado:** botones de colores para cambiar con un clic.

**Mensaje:** texto que el prospecto dejó en el formulario (si lo completó).

**Notas:** historial del equipo con autor y fecha. Campo para agregar nota nueva (Enter o botón de enviar).

---

## Los Estados del Lead — Cuáles Son y Cuándo Usarlos

El CRM tiene los siguientes estados. Use el correcto en todo momento — los estados incorrectos dañan los reportes y confunden al equipo.

| Estado | Código | Cuándo usarlo |
|--------|--------|---------------|
| **Nuevo** | `new` | El lead acaba de llegar. Usted aún no lo ha contactado. |
| **Contactado** | `contacted` | Envió el primer mensaje o llamó. Está esperando respuesta. |
| **Calificado** | `qualified` | Tuvo una conversación real, confirmó que tiene techo propio, factura relevante, e interés genuino. |
| **Propuesta** | `proposal_sent` | Le envió o presentó la propuesta formal. |
| **Frío** | `cold` | Respondió pero mostró poco interés. Seguimiento mensual. |
| **Tibio** | `warm` | Muestra interés moderado. Responde de vez en cuando. |
| **Caliente** | `hot` | Listo para cerrar. Alta probabilidad en los próximos días. |
| **Ganado** | `won` | Contrato firmado. Ingrese el valor de la venta en dólares. |
| **Perdido** | `lost` | Decidió no avanzar. Cierre con elegancia (ver Módulo 09). |

Los estados **Proveedor**, **Socio** y **No es Lead** los usa solo el gerente para contactos que no son prospectos de venta.

> **Importante:** Los módulos anteriores de la Academia mencionan estados como "En descubrimiento", "Visita agendada", "Negociación" y "Nurture". Esos son conceptos de proceso de ventas — el CRM real no tiene esos nombres exactos. Use **Calificado** durante el descubrimiento, **Propuesta** cuando la propuesta esté enviada, **Tibio** o **Frío** para nurture. [VERIFICAR CON GERENTE si se agregaron estados personalizados desde la última actualización].

---

## Flujo Diario: Cómo Usar el CRM Paso a Paso

### Paso 1 — Al llegar en la mañana: revisar leads nuevos y vencidos

1. Abra **Leads**.
2. Mire la tarjeta **Nuevos** — ¿hay leads que llegaron durante la noche?
3. Mire la tarjeta **Vencidos** — ¿hay leads que muestran "Requiere seguimiento"?
4. Ordene su día comenzando por los vencidos, luego los nuevos.

### Paso 2 — Cuando llega un lead nuevo

1. Haga clic en el lead para abrir el panel de detalle.
2. Lea su nombre, teléfono, fuente y el mensaje que dejó (si hay).
3. Haga clic en el ícono de WhatsApp para abrir el chat con el mensaje pre-escrito.
4. Personalice el mensaje antes de enviarlo (agregue el nombre, mencione su propiedad o zona si la sabe).
5. **Vuelva al CRM** y cambie el estado de **Nuevo** a **Contactado**.
6. Agregue una nota corta: "WhatsApp enviado [fecha]. Esperando respuesta."

### Paso 3 — Cuando el prospecto responde y hay una conversación real

1. Haga clic en el lead.
2. Escuche o lea lo que dice. Evalúe si califica (¿tiene techo propio? ¿factura alta? ¿interés real?).
3. Si califica: cambie el estado a **Calificado**.
4. Agregue una nota descriptiva: "Llamada 10 min. Casa propia, zinc ~60m². Factura $180/mes. Quiere visita. Propone el martes 15/7 a las 10am."
5. Si no califica todavía: déjelo en **Contactado** y programe el siguiente toque.

### Paso 4 — Cuando envía la propuesta

1. Cambie el estado a **Propuesta**.
2. Agregue una nota: "Propuesta enviada por WhatsApp el [fecha]. Sistema 5 kWp, inversión $7,200, payback 5.2 años."

### Paso 5 — Después de cada contacto sin respuesta

Si el lead no responde, no cambie el estado todavía. Agregue una nota con la fecha y el intento: "T+48h WhatsApp enviado. Sin respuesta." Siga la secuencia del Módulo 09 (T+0, T+48h, T+5d, T+10d).

### Paso 6 — Cuando cierra un trato como ganado

1. Cambie el estado a **Ganado**.
2. En el campo "Valor de la venta", ingrese el monto del contrato en dólares (solo el número, sin símbolo).
3. Haga clic fuera del campo para guardar.
4. Agregue una nota: "Contrato firmado el [fecha]. Sistema X kWp. Instalación estimada [mes]."

### Paso 7 — Cuando el trato se pierde

1. Cambie el estado a **Perdido**.
2. Agregue una nota con el motivo (breve): "Decidió no avanzar. Esposo en desacuerdo. Puerta abierta."
3. Cierre con el guión del Módulo 09. No elimine el lead — puede reactivarse en el futuro.

### Paso 8 — Al cerrar el día

Revise que todos sus leads contactados tengan nota nueva · ningún lead en "Nuevo" de más de 24 horas · ningún "Contactado" de más de 10 días sin nota.

---

## Filtros y Búsqueda: Encontrar Cualquier Lead

**Búsqueda:** escriba el nombre o teléfono — el sistema filtra en tiempo real.
**Filtro de estado:** menú "Todos los estados" — seleccione uno para enfocarse en una etapa del pipeline.
**Filtro de fuente:** menú "Todas las fuentes" — útil después de una campaña de Meta o Google para ver solo esos leads.
**Actualizar lista:** ícono de actualizar junto al botón "Agregar" — úselo si sospecha que llegaron leads nuevos mientras el CRM estaba abierto.

---

## Las Insignias de Atribución — Qué Son y Por Qué No Se Tocan

Cuando un prospecto llega desde un anuncio de Google o Meta, el CRM guarda automáticamente el origen exacto. Esa información aparece como etiquetas en la columna "Fuente" y en la sección "Atribución" del panel de detalle:

| Insignia | Qué indica |
|----------|-----------|
| `gclid` | El lead hizo clic en un anuncio de Google. El gclid es el identificador de ese clic. |
| `fbclid` | El lead hizo clic en un anuncio de Facebook o Instagram. |
| `platform id` | El ID interno que Meta asignó a este lead en su sistema de Lead Ads. |
| `utm_source / utm_medium` | Parámetros de campaña que identifican el canal y el tipo de tráfico. |
| `utm_campaign` | El nombre de la campaña de anuncios que generó este lead. |

**Regla absoluta:** Usted nunca modifica estos campos. Son datos técnicos que el sistema usa para reportar conversiones a Google y Meta y optimizar los anuncios automáticamente. Cambiarlos o borrarlos rompe los reportes de publicidad.

Si ve un lead sin ninguna insignia de atribución, es normal — significa que vino por WhatsApp directo, referido, o fue agregado manualmente.

---

## Agregar un Lead Manualmente

Si un prospecto le contacta directamente y no está en el CRM: clic en **Agregar** (dorado, arriba a la derecha) → complete nombre, teléfono (formato `50765831822`) y fuente (`Referral` para referidos, `Cold call` en frío, `Manual` si no encaja) → **Guardar** → agregue nota inicial con el contexto del primer contacto.

---

## ⚠️ Errores Comunes

| Error | Por qué es un problema | Qué hacer en cambio |
|-------|----------------------|---------------------|
| Dejar un lead en "Nuevo" por más de 24 horas | Ese prospecto ya contactó a la competencia o perdió el interés | Contáctelo en las primeras 2 horas de que llegó al CRM |
| Cambiar el estado sin agregar nota | El gerente o un compañero no puede saber qué pasó | Siempre agrega nota + estado al mismo tiempo |
| Escribir notas genéricas: "Llamé" | No sirve para dar seguimiento o transferir el lead | Escriba: canal, duración, lo que dijo el prospecto, próximo paso |
| Marcar "Ganado" sin ingresar el valor en dólares | El sistema no puede reportar la conversión a Google Ads; se pierde datos de rentabilidad | Siempre complete el campo de valor al marcar ganado |
| Modificar las insignias de atribución | Rompe los reportes automáticos de publicidad | Nunca toque esos campos — son de solo lectura |
| Seleccionar la fuente incorrecta al agregar un lead manualmente | Contamina los reportes de origen de leads | Seleccione "Manual" si no está seguro — el gerente puede corregirlo |
| Filtrar por un estado y olvidar quitar el filtro | Cree que vio todos sus leads cuando solo vio una parte | Verifique que el filtro diga "Todos los estados" al inicio de cada día |
| Enviar el WhatsApp automático sin personalizar el nombre | El mensaje llega con "amigo" en vez del nombre real | Siempre revise el mensaje antes de enviarlo |

---

## 🎭 Ejercicio Práctico: Tres Leads en el CRM

Este ejercicio simula un turno real. Trabaje con el gerente o un compañero como observador.

**Contexto:** Es martes a las 8:30 AM. Usted abre el CRM y encuentra estos tres leads:

---

**Lead A — Jorge Ríos**
Llegó esta mañana. Fuente: Meta Lead Ads. Teléfono: 6XXX-XXXX. Mensaje: "Quiero información sobre paneles para mi casa en Chitré."

Tarea:
1. Abra el panel de detalle. Lea la fuente y las insignias de atribución.
2. Haga clic en WhatsApp, personalice el mensaje con su nombre y zona, y simule el envío.
3. Cambie el estado a **Contactado**.
4. Agregue una nota: "WhatsApp enviado 08:35. Prospecto en Chitré, residencial. Esperando respuesta."

---

**Lead B — Hotel Playa Verde**
Llegó hace 6 días. Estado: Calificado. Última nota de hace 5 días: "Llamada 20 min. Gerente confirmó techo plano 400m², factura $1,800/mes. Propuesta pendiente."

Tarea:
1. Confirme que el lead muestra "Requiere seguimiento" (lleva más de X días sin nota).
2. Simule enviar el mensaje T+5d del Módulo 09 por WhatsApp.
3. Actualice la nota: "T+5d WhatsApp enviado. Sin respuesta aún. Follow-up programado para el jueves."
4. Evalúe si debe cambiarlo a **Frío** o mantenerlo en **Calificado** — discútalo con el observador.

---

**Lead C — María Antonia Castillo**
Llegó hace 3 semanas. Estado: Propuesta. Notas previas muestran: T+0, T+48h, T+5d, T+10d enviados. Sin respuesta.

Tarea:
1. Cambie el estado a **Perdido**.
2. Agregue una nota: "Sin respuesta después de 4 contactos en 3 semanas. Marcado como perdido el [fecha]. Puerta abierta."
3. Discuta con el observador: si en 30 días esta persona escribe de nuevo, ¿qué hace primero antes de responder?

---

**Criterios de evaluación:**
- El estado se cambió correctamente en cada caso.
- Las notas son descriptivas (no genéricas).
- El estudiante no modificó las insignias de atribución.
- El WhatsApp fue personalizado antes del envío simulado.

---

## ✅ Checklist Diario del CRM

Al inicio del día:
- [ ] Revisé los leads "Nuevos" — ninguno tiene más de 24 horas sin contacto.
- [ ] Revisé los leads "Vencidos" — todos tienen acción programada para hoy.
- [ ] El filtro dice "Todos los estados" (no quedé con un filtro del día anterior).

Durante el día:
- [ ] Cada vez que contacto a un prospecto, agrego nota al CRM antes de pasar al siguiente.
- [ ] Cada cambio de estado tiene una nota que lo explica.

Al cerrar el día:
- [ ] No hay ningún lead en estado "Nuevo" de más de 24 horas.
- [ ] Todos los leads que contacté hoy tienen nota nueva.
- [ ] Los tratos ganados tienen el valor de la venta ingresado.
- [ ] Los tratos perdidos tienen nota con el motivo.

---

## 📝 Quiz — Módulo 11

Responda sin consultar el material.

**1.** ¿Cuál es la sección del CRM que un vendedor debe tener abierta durante toda la jornada?
   - a) Dashboard
   - b) Leads
   - c) Calendar
   - d) Monitoring

**2.** Un lead acaba de llegar a las 9:00 AM. ¿Cuánto tiempo máximo puede pasar antes de que usted lo contacte?
   - a) 24 horas
   - b) 48 horas
   - c) Lo antes posible — idealmente en las primeras 2 horas
   - d) Al día siguiente por la mañana

**3.** Acaba de tener una llamada de 15 minutos con un prospecto. Confirmó que tiene casa propia, techo de zinc de 80 m² y factura de $160 al mes. ¿A qué estado cambia el lead?
   - a) Contactado
   - b) Calificado
   - c) Propuesta
   - d) Tibio

**4.** ¿Qué debe hacer SIEMPRE al mismo tiempo que cambia el estado de un lead?
   - a) Enviar un email al gerente
   - b) Agregar una nota descriptiva
   - c) Llamar al prospecto
   - d) Actualizar el filtro de fuente

**5.** Un prospecto firmó el contrato por $8,500. ¿Cuál es el paso correcto en el CRM?
   - a) Cambiar estado a Ganado y dejar el campo de valor vacío
   - b) Cambiar estado a Ganado e ingresar 8500 en el campo "Valor de la venta"
   - c) Cambiar estado a Caliente
   - d) Notificar al gerente y esperar que él lo registre

**6.** ¿Qué significa la insignia `gclid` en la columna "Fuente" de un lead?
   - a) El lead llegó por WhatsApp
   - b) El lead hizo clic en un anuncio de Google
   - c) El lead fue agregado manualmente
   - d) El lead fue referido por un cliente

**7.** ¿Puede usted modificar los campos de atribución (gclid, fbclid, utm_campaign)?
   - a) Sí, si el dato está incorrecto
   - b) Sí, pero solo con permiso del gerente
   - c) No — son de solo lectura y no deben tocarse nunca
   - d) Sí, al cerrar el trato como ganado

**8.** Un lead tiene 7 días en estado "Contactado" sin notas recientes. ¿Qué indica la etiqueta roja en su nombre?
   - a) Que el lead fue eliminado
   - b) Que el lead vino de Meta Ads
   - c) Que requiere seguimiento — lleva demasiado tiempo sin contacto
   - d) Que el gerente lo está revisando

**9.** ¿Qué fuente selecciona al agregar manualmente un lead que le llegó por referido de un cliente?
   - a) Manual
   - b) WhatsApp
   - c) Referral
   - d) Cold call

**10.** Al final del día, ¿cuál de estas situaciones es inaceptable?
   - a) Hay 2 leads en estado "Propuesta" de hace 3 días
   - b) Hay un lead ganado de hoy con el valor ingresado
   - c) Hay un lead en estado "Nuevo" que llegó ayer a las 8:00 AM y nadie lo contactó
   - d) Hay 5 leads en estado "Perdido" con notas de cierre

---

### Respuestas del Quiz

| # | Respuesta | Explicación breve |
|---|-----------|------------------|
| 1 | **b** | Leads es la pantalla central del trabajo diario de ventas |
| 2 | **c** | Primeras 2 horas — mientras el prospecto está con interés activo (ver Módulo 09, T+0) |
| 3 | **b** | Calificado — confirmó techo, factura e interés genuino |
| 4 | **b** | Sin nota, el cambio de estado no le dice nada a usted ni al equipo en el futuro |
| 5 | **b** | El valor en dólares es obligatorio — activa el reporte de conversión a Google Ads |
| 6 | **b** | gclid = Google Click Identifier — identifica el clic en un anuncio de Google |
| 7 | **c** | Nunca — modificarlos rompe los reportes automáticos de publicidad |
| 8 | **c** | La etiqueta roja "Requiere seguimiento" indica inactividad excesiva |
| 9 | **c** | Referral — para leads que vienen de referencias de clientes existentes |
| 10 | **c** | Un lead nuevo de más de 24 horas sin contacto es una oportunidad perdida |

---

> Módulo anterior: **10 — Simulaciones y Certificación**
> Este es el módulo final de la Academia v1.0.
>
> [VERIFICAR CON GERENTE]: URL de acceso al CRM · proceso de creación de usuario para vendedores nuevos · si se agregaron estados personalizados después de enero 2026 · monto exacto del crédito por referido mencionado en Módulo 09
