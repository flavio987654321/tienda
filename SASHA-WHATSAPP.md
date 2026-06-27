# SASHA EN WHATSAPP — PLAN POR FASES

> Creado: 2026-06-24 | Solo planificación, sin código todavía.
> Workflow: 🟪 pendiente | 🟦 en progreso | ✅ hecho | ❌ descartado con justificación
> Punto de partida: Sasha ya existe y funciona en `/dashboard` (ver `ASISTENTE-IA.md`) — mismo modelo (Claude Haiku 4.5), mismo `getStoreSnapshot()`, mismo `buildSystemPrompt()`. Este documento es sobre **agregarle un canal nuevo** (WhatsApp), no sobre rehacer el cerebro.

---

## IDEA CENTRAL

Llevar a Sasha de "solo dentro del panel" a "también por WhatsApp", en dos saltos de alcance bien distintos:

1. **FASE 1-3**: la **dueña** le escribe a Sasha por WhatsApp y le pregunta lo mismo que ya puede preguntar en el panel (pedidos, stock, productos, etc.). Es agregar un canal de transporte nuevo a algo que ya existe — bajo riesgo, bajo volumen.
2. **FASE 4+**: los **clientes finales** de cada tienda le escriben a un bot por WhatsApp (atención al cliente, consultas de productos, etc.). Es un producto distinto: otro system prompt, otro control de acceso a datos, otro volumen de mensajes (y de costo), y ahí sí probablemente haga falta la verificación de empresa de Meta por el volumen.

**No se mezclan las dos fases.** No se empieza la FASE 4 hasta que 1-3 estén funcionando en producción con uso real.

---

## DECISIÓN DE INFRAESTRUCTURA (a confirmar antes de la FASE 1)

| Opción | Pro | Contra |
|---|---|---|
| **Meta Cloud API directa, sin Business Verification** | Gratis en mensajes, no requiere CUIT/monotributo, tier no verificado (250 conversaciones/24hs) alcanza de sobra para 1 dueña por tienda | Configuración inicial más manual (app en Meta for Developers, webhook propio) |
| Twilio / 360dialog (intermediario) | Onboarding más simple, soporte si algo falla | Cobra por mensaje, capa de abstracción extra que no hace falta para este volumen |

**Recomendación de arranque:** Meta Cloud API directa sin verificar, dado que ya se confirmó que el tier no verificado alcanza para el caso de uso de FASE 1-3 (una sola persona por tienda escribiéndole a Sasha).

---

## FASE 1 — MVP: la dueña habla con Sasha por WhatsApp (un solo número de prueba)

> Objetivo: probar que el circuito completo funciona (Meta → webhook → Claude → Meta → WhatsApp) con un caso mínimo, antes de pensar en multi-tienda.

| # | Estado | Descripción |
|---|--------|-------------|
| F1-01 | 🟪 | Crear cuenta en Meta Business Manager (con Facebook personal, sin verificación de empresa) + app en Meta for Developers con el producto WhatsApp. |
| F1-02 | 🟪 | Configurar el número de WhatsApp Business de prueba que da Meta (gratis, hasta 5 destinatarios verificados) — probar mandar/recibir mensajes manualmente desde la consola de Meta antes de escribir una línea de código. |
| F1-03 | 🟪 | Definir el endpoint webhook (`POST /api/whatsapp/webhook`) que Meta va a llamar cuando llegue un mensaje — solo diseño del contrato, todavía sin handler real. |
| F1-04 | 🟪 | Probar el webhook con **una sola tienda hardcodeada** (la del dueño que está probando) — sin lógica de "a qué tienda pertenece este número" todavía. Esto valida que Meta → tu servidor → Claude → Meta → WhatsApp funciona de punta a punta. |
| F1-05 | 🟪 | Reusar tal cual `buildSystemPrompt()` + `getStoreSnapshot()` ya existentes — Sasha contesta lo mismo que contestaría en el panel, solo que el transporte es WhatsApp en vez de `ReadableStream` al browser. |
| F1-06 | 🟪 | Decisión: WhatsApp no soporta streaming de texto como el chat del panel — Sasha va a esperar a tener la respuesta completa antes de mandarla (un solo mensaje, no fragmentado). Ajustar expectativas de latencia percibida (puede sentirse "más lento" que el panel aunque tarde lo mismo). |

**Criterio de salida de FASE 1:** un mensaje real desde tu propio WhatsApp llega a Sasha y te contesta con datos reales de tu tienda, de punta a punta, con una sola tienda hardcodeada.

---

## FASE 2 — Multi-tienda: identificar quién escribe

> Objetivo: que cualquier dueña pueda vincular su WhatsApp y Sasha sepa de qué tienda hablar, sin que nadie pueda hacerse pasar por otra.

| # | Estado | Descripción |
|---|--------|-------------|
| F2-01 | 🟪 | Campo nuevo en `User` (o `Store`) para guardar el número de WhatsApp vinculado — requiere migración Prisma. |
| F2-02 | 🟪 | Flujo de vinculación: la dueña pide vincular desde el panel → se genera un código corto → lo manda por WhatsApp desde su número → el servidor lo valida y guarda el número vinculado a su cuenta. (Mismo patrón de "verificación por código" que cualquier 2FA — no inventar nada nuevo). |
| F2-03 | 🟪 | En el webhook: derivar la tienda **siempre** a partir del número de teléfono entrante que llega en el payload de Meta (nunca confiar en nada que mande el usuario en el texto del mensaje) — mismo principio que S-01 de `ASISTENTE-IA.md` (nunca aceptar el ID de tienda del cliente). |
| F2-04 | 🟪 | Si el número no está vinculado a ninguna cuenta: Sasha responde con instrucciones de cómo vincularlo desde el panel — nunca calcula ni expone datos de tienda a un número desconocido. |
| F2-05 | 🟪 | Revisar gates existentes (suscripción `EXPIRED`/`CANCELLED`, tienda sin `tipoTienda` configurado) — deben bloquear también por WhatsApp, igual que en el endpoint del panel (S-12). |

**Criterio de salida de FASE 2:** dos dueñas distintas, cada una desde su propio WhatsApp, hablan con Sasha y cada una ve solo los datos de su propia tienda.

---

## FASE 3 — Historial, rate limit y endurecimiento para producción

> Objetivo: que sea seguro y estable dejarlo andando sin supervisión, con varias tiendas reales usándolo.

| # | Estado | Descripción |
|---|--------|-------------|
| F3-01 | 🟪 | Persistir el historial de conversación de WhatsApp (reusar o extender `AsistenteMensaje` si tiene sentido, distinguiendo canal `panel` vs `whatsapp`) — a diferencia del panel, en WhatsApp no hay "memoria en el browser", tiene que vivir en DB sí o sí. |
| F3-02 | 🟪 | Rate limit por número de teléfono (no por `user.id` como en el panel, porque WhatsApp no tiene sesión) — mismo mecanismo (`checkRateLimit`), distinta clave. |
| F3-03 | 🟪 | Tope diario por tienda (igual que S-10 del panel) para evitar gasto descontrolado si alguien (vinculado o no) abusa del canal. |
| F3-04 | 🟪 | Manejo de errores específico de WhatsApp: mensajes que llegan fuera de orden, reintentos de Meta si tu servidor no responde a tiempo al webhook (Meta reintenta si no devolvés 200 rápido), mensajes con contenido no soportado (audio, imágenes) — decidir si Sasha los ignora con una respuesta clara o si se descartan en silencio. |
| F3-05 | 🟪 | Confirmar costo real con uso de varias tiendas en simultáneo (mismo análisis de tokens que ya existe para el panel, sumado al volumen nuevo de WhatsApp). |
| F3-06 | 🟪 | Evaluar si conviene pasar a Business Verification en este punto (no por necesidad técnica, sino si Meta empieza a limitar por volumen agregado de todas las tiendas juntas contra el mismo número/app). |

**Criterio de salida de FASE 3:** funcionando en producción con las tiendas reales actuales, sin supervisión manual, con costo y abuso acotados — equivalente en madurez a como está hoy Sasha en el panel.

---

## FASE 4 — Clientes finales (alcance nuevo, no es continuación automática)

> Esta fase **no arranca** hasta que 1-3 estén validadas en producción. Es un producto distinto, no "más de lo mismo".

| # | Estado | Descripción |
|---|--------|-------------|
| F4-01 | 🟪 | Definir alcance real: ¿Sasha-para-clientes responde preguntas sobre productos de ESA tienda (catálogo, precios, stock), o también gestiona pedidos/pagos? Cuanto más haga, más riesgo y más diseño de seguridad necesita. |
| F4-02 | 🟪 | System prompt nuevo y separado del de la dueña — un cliente final nunca debe poder preguntar por datos de otros clientes, ventas totales, ni nada que no sea su propia interacción con el catálogo. |
| F4-03 | 🟪 | Un número de WhatsApp **por tienda** (no uno solo compartido) para que cada negocio tenga su propia identidad de cara al cliente final — esto sí probablemente empuja a necesitar Business Verification por volumen agregado de mensajes de clientes. |
| F4-04 | 🟪 | Resolver la traba de Monotributo/CUIT: evaluar si la verificación se hace a nombre de la plataforma (TiendaApps como intermediario verificado, similar a cómo Twilio/360dialog operan) en vez de exigirle a cada dueña verificar su propio negocio — esto cambia el modelo de negocio del canal, no es solo un detalle técnico. |
| F4-05 | 🟪 | Anti-abuso reforzado: a diferencia de la dueña (1 persona, uso interno), acá cualquier desconocido en internet puede escribirle al número de la tienda — rate limit más agresivo, detección de spam, y un tope de gasto por tienda mucho más estricto. |
| F4-06 | 🟪 | Decidir si los mensajes de clientes le llegan también a la dueña como notificación (para no perder el control de lo que su "vendedor IA" está diciendo a sus clientes) o si queda 100% autónomo. |
| F4-07 | 🟪 | Revisión de seguridad completa nueva (equivalente al BLOQUE S de `ASISTENTE-IA.md`), porque la superficie de ataque cambia completamente al exponerse a desconocidos en vez de a la dueña autenticada. |

---

## PREGUNTAS ABIERTAS (a resolver antes de empezar a programar)

- ¿El número de WhatsApp de FASE 1-2 es el número personal del dueño de TiendaApps (para probar) o ya se separa uno dedicado desde el día uno?
- ¿Vale la pena versionar el "canal" desde la FASE 1 (campo `channel: "panel" | "whatsapp"` en los mensajes guardados) aunque todavía no haga falta, para no tener que migrar datos después? (Evaluar contra la regla de no construir para necesidades hipotéticas — si la migración futura es trivial, mejor no adelantarla.)
- Para FASE 4: ¿el modelo de costo a clientes cambia? (¿Es gratis para el dueño como hoy, o se factura aparte el volumen de WhatsApp-clientes dado que puede crecer mucho más que el uso interno?)

---

## ORDEN RECOMENDADO

1. FASE 1 (circuito completo con una tienda hardcodeada) — valida que la integración con Meta funciona antes de invertir en diseño de multi-tienda.
2. FASE 2 (multi-tienda + vinculación segura) — recién acá se vuelve usable por más de una persona.
3. FASE 3 (historial, rate limit, endurecimiento) — recién acá se vuelve seguro dejarlo en producción sin mirar.
4. Pausa y validación con uso real de las tiendas actuales antes de decidir si se avanza a FASE 4.
5. FASE 4 (clientes finales) — solo si 1-3 demostraron valor y no hay sorpresas de costo/abuso.

---

*Este documento es de planificación. No se escribe código de ninguna fase hasta que se decida explícitamente arrancar, empezando siempre por FASE 1.*
