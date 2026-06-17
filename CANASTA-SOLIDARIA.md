# CANASTA SOLIDARIA — PLAN DE IMPLEMENTACIÓN

> Creado: 2026-06-16 | Feature completa de donación colectiva y sorteo
> Workflow: 🟪 pendiente | 🟦 en progreso | ✅ hecho | ❌ descartado con justificación
> Última actualización: 2026-06-16

---

## IDEA CENTRAL

Un espacio donde la comunidad dona colectivamente para armar una **canasta familiar con alimentos básicos**. Cada producto de la canasta se "ilumina" a medida que se va financiando con las donaciones. Cuando se llega al monto objetivo, se hace un **sorteo en vivo** entre todos los donantes. El admin compra los productos reales y los entrega/envía al ganador.

---

## REGLAS DE NEGOCIO (✅ confirmadas)

### Donación
- **Mínimo por donación: $1.000**
- **Una sola donación por persona por campaña** (igualdad de chances, sin ventaja por monto)
- **Anti-abuso:** validación por userId en DB + fallback por IP
- El monto es libre desde $1.000 (alguien puede donar los $60.000 enteros y completar la canasta)
- La plata va directo a MercadoPago del admin (fondo de propósito específico, no retirable como wallet)

### Campaña
- **Meta total: $60.000** → $54.545 productos + 10% reserva operativa ($5.455 para envío y gastos)
- El **10% de reserva** se muestra públicamente para total transparencia
- Los precios de los productos los carga el admin por campaña (los precios suben, cada campaña puede tener precios actualizados)
- **Una campaña activa a la vez**
- **Fin de campaña:** al llegar al 100% del monto → admin lanza sorteo manualmente → nueva campaña arranca

### Canasta básica — productos sugeridos (~14 ítems)
> El admin define los precios por campaña. Esta es la lista base propuesta:

| Producto | Cantidad sugerida |
|----------|------------------|
| Leche entera (1L) | 6 unidades |
| Arroz | 2kg |
| Fideos | 2kg |
| Aceite de girasol (1.5L) | 1 unidad |
| Azúcar | 1kg |
| Harina 000 | 2kg |
| Yerba mate | 500g |
| Sal fina | 500g |
| Lentejas o porotos | 500g |
| Puré de tomates | 2 unidades |
| Polenta | 500g |
| Galletitas de agua | 2 paquetes |
| Jabón en pan | 3 unidades |
| Papel higiénico | 4 rollos |

### Formulario del donante (NUEVO)
Al momento de donar se pide:
- **Nombre completo** (requerido)
- **Teléfono** (requerido — para avisar si gana)
- **Email** (requerido — ya puede estar pre-cargado si está logueado)
- **Localidad / Provincia** (requerido — para calcular envío si gana)
- **¿Cómo preferís recibir el premio?** radio: Envío por correo / Retiro en persona (informativo)

Esta información llega al admin y también queda asociada a la `Donation` en DB.

### Sorteo y cascada de ganadores (NUEVO)
- **Sistema de ranking:** el sorteo genera 3 posiciones (1°, 2°, 3°)
- **1° ganador:** recibe notificación push + email con 48hs para responder
- **Si no responde en 48hs:** pasa al 2° ganador con las mismas condiciones
- **Si tampoco responde:** pasa al 3° ganador
- **Si ninguno responde:** el admin decide (campaña archivada, fondo a la siguiente, etc.)
- El admin marca manualmente el estado del ganador desde el panel: PENDIENTE / CONFIRMADO / SIN_RESPUESTA

### Carrito de compras — donación integrada (NUEVO)
- En el carrito aparece un toggle opcional: "Sumar a la canasta solidaria 🧺"
- Si lo activa: muestra un input de monto (mínimo $1.000)
- El carrito muestra:
  - "Tu compra: $20.000" (color normal)
  - "Donación solidaria: $1.000" (color naranja/dorado, diferente)
  - "Total: $21.000"
- **Técnico:** son 2 pagos separados en MP (no se pueden unir porque van a cuentas distintas)
  1. Pago principal → al seller via marketplace split (normal)
  2. Donación → a la cuenta MP del admin (separado)
- Flujo: usuario paga la compra → al confirmarse, si eligió donar → se abre el checkout de donación
- El email de confirmación de compra incluye un apartado con los datos de la donación

### Flyer desde el admin (NUEVO)
- El admin puede crear un banner/flyer visible en la página principal
- El flyer muestra: nombre de campaña, progreso actual, fecha estimada de sorteo, CTA "Donar ahora"
- Se genera con `html-to-image` o es un componente estilizado configurable
- El admin puede activarlo/desactivarlo sin deployar
- Aparece en home como banner fijo (sticky top o sección destacada)

---

## ARQUITECTURA — QUÉ HAY QUE CONSTRUIR

### BLOQUE A — BASE DE DATOS (Prisma)

| # | Estado | Modelo | Descripción |
|---|--------|--------|-------------|
| A-01 | 🟪 | `DonationCampaign` | id, nombre, descripción, meta ($60.000), reservaPct (10), estado (ACTIVE/DRAWN/CANCELLED), fechaSorteoEstimada, createdAt |
| A-02 | 🟪 | `DonationProduct` | id, campaignId, nombre, imagen, precioObjetivo, orden. La suma = meta × (1 - reservaPct) |
| A-03 | 🟪 | `Donation` | id, userId, campaignId, monto, mpPaymentId, estado (PENDING/CONFIRMED/FAILED), donorName, donorPhone, donorEmail, donorLocalidad, donorPrefEntrega (ENVIO/RETIRO), createdAt |
| A-04 | 🟪 | `DonationDraw` | id, campaignId, winner1Id, winner2Id, winner3Id, winnerFinalId, estadoGanador (PENDIENTE/CONFIRMADO/SIN_RESPUESTA), conductedAt, notasAdmin |

**Relaciones clave:**
- `DonationCampaign` 1→N `DonationProduct`
- `DonationCampaign` 1→N `Donation`
- `DonationCampaign` 1→1 `DonationDraw`
- `Donation` N→1 `User`

---

### BLOQUE B — PÁGINAS FRONTEND

| # | Estado | Ruta | Descripción |
|---|--------|------|-------------|
| B-01 | 🟪 | `/canasta` | Página principal campaña activa: canasta 3D, productos con iluminación, progreso, contador, feed donantes |
| B-02 | 🟪 | `/canasta/donar` | Formulario donante + monto + checkout MP. Si ya donó: muestra su donación actual |
| B-03 | 🟪 | `/canasta/terminos` | T&C propios de la canasta solidaria |
| B-04 | 🟪 | `/canasta/historial` | Campañas pasadas: fecha, total, ganador, foto entrega si hay |
| B-05 | 🟪 | `/` (home) | Botón "Ayudar es posible 🧺" + banner del admin si está activo |

---

### BLOQUE C — API ROUTES

| # | Estado | Endpoint | Método | Descripción |
|---|--------|----------|--------|-------------|
| C-01 | 🟪 | `/api/canasta/campaign` | GET | Campaña activa con productos, total recaudado, cantidad donantes |
| C-02 | 🟪 | `/api/canasta/donate` | POST | Valida reglas, guarda Donation en PENDING, crea preferencia MP, devuelve init_point |
| C-03 | 🟪 | `/api/canasta/webhook` | POST | IPN de MP → actualiza Donation a CONFIRMED, dispara push si hito (50%, 100%) |
| C-04 | 🟪 | `/api/canasta/check-eligibility` | GET | ¿Ya donó el usuario en esta campaña? → true/false + datos de su donación |
| C-05 | 🟪 | `/api/canasta/recent-donors` | GET | Feed de últimas 10 donaciones confirmadas (nombre anonimizado, monto, hace X min) |
| C-06 | 🟪 | `/api/admin/canasta/campaign` | POST/PUT | Crear o editar campaña, activar/desactivar banner en home |
| C-07 | 🟪 | `/api/admin/canasta/draw` | POST | Selecciona random 3 ganadores entre confirmados, guarda DonationDraw, envía notif al 1° |
| C-08 | 🟪 | `/api/admin/canasta/winner-status` | PUT | Admin actualiza estado del ganador (CONFIRMADO / SIN_RESPUESTA → pasa al siguiente) |
| C-09 | 🟪 | `/api/admin/canasta/participants` | GET | Lista completa de donantes para la ruleta del sorteo |
| C-10 | 🟪 | `/api/admin/canasta/notify` | POST | Admin dispara push masivo a todos los usuarios (lanzamiento campaña, resultado, etc.) |

---

### BLOQUE D — PANEL ADMIN (/admin/canasta)

| # | Estado | Sección | Descripción |
|---|--------|---------|-------------|
| D-01 | 🟪 | Dashboard | Stats en tiempo real: $ recaudado, % completado, cantidad donantes, días estimados al sorteo |
| D-02 | 🟪 | Gestión de campaña | Crear nueva campaña. Campos: nombre, descripción, meta total, % reserva, fecha estimada, productos (nombre+imagen+precio). Toggle banner en home |
| D-03 | 🟪 | Lista de donantes | Tabla: nombre, localidad, teléfono, email, monto, fecha, estado del pago. Exportable |
| D-04 | 🟪 | Ruleta de sorteo | Interfaz con todos los participantes elegibles. Botón "Sortear" → animación de ruleta → muestra ganador 1°/2°/3°. El resultado ya viene calculado del backend |
| D-05 | 🟪 | Gestión de ganadores | Cards de los 3 ganadores con: datos de contacto, estado (PENDIENTE/CONFIRMADO/SIN_RESPUESTA), botón "Marcar como sin respuesta → pasar al siguiente" |
| D-06 | 🟪 | Flyer/Banner | Editor de banner para home: texto, color, imagen. Preview en vivo. Toggle activar/desactivar |
| D-07 | 🟪 | Notificación masiva | Botón para push a todos: con título y cuerpo. Usa el sistema de push existente |
| D-08 | 🟪 | Historial de campañas | Lista de campañas cerradas con resumen: total, donantes, ganador final, fecha |

---

### BLOQUE E — VISUAL (página /canasta)

| # | Estado | Elemento | Descripción |
|---|--------|---------|-------------|
| E-01 | 🟪 | Canasta 3D liviana | CSS `perspective` + `transform: rotateX(20deg)` + múltiples `box-shadow`. Sin Three.js. Con Framer Motion para micro-animaciones al entrar |
| E-02 | 🟪 | Productos en la canasta | Grid de tarjetas con imagen del producto. Apagadas = gris desaturado. Iluminadas = color vibrante + glow |
| E-03 | 🟪 | Estado visual por producto | El % de iluminación = progreso proporcional. Si el total recaudado superó el precio de ese producto → 100% encendido. Si no → gradiente parcial. CSS `filter: saturate()` + `brightness()` animado |
| E-04 | 🟪 | Barra de progreso total | "$38.000 de $60.000 recaudados" con barra animada. Color naranja/dorado |
| E-05 | 🟪 | Contador de sorteo | DD:HH:MM:SS. Si no hay fecha estimada → "Se sortea al completarse la canasta" |
| E-06 | 🟪 | Feed de donantes recientes | "Ana G. donó $2.000 · hace 3 min" — actualiza cada 30s. Solo confirmados. Nombre + inicial apellido |
| E-07 | 🟪 | Botón CTA donar | Grande, visible. Si ya donaste → "Ya participás 🎉" deshabilitado + ver tu donación |
| E-08 | 🟪 | % reserva visible | Texto pequeño debajo de la barra: "Incluye 10% para costos de envío y gastos operativos" |

---

### BLOQUE F — INTEGRACIÓN MERCADOPAGO

| # | Estado | Ítem | Descripción |
|---|--------|------|-------------|
| F-01 | 🟪 | Preferencia donación directa | Crear preferencia con las credenciales del admin (no marketplace). `external_reference` = donationId |
| F-02 | 🟪 | Webhook IPN canasta | `/api/canasta/webhook` escucha IPN, busca por `external_reference`, actualiza Donation → CONFIRMED |
| F-03 | 🟪 | PENDING handling | Pago en PENDING (transferencia bancaria) → Donation queda PENDING → solo CONFIRMED entra al sorteo |
| F-04 | 🟪 | Carrito: 2 pagos separados | Compra → pago al seller (normal). Luego si el usuario eligió donar → segunda preferencia MP al admin. Flujo secuencial post-compra |
| F-05 | 🟪 | Email post-compra con donación | Si la compra incluyó donación → el email de confirmación tiene una sección "Tu donación a la canasta solidaria" con monto y estado |

---

### BLOQUE G — NOTIFICACIONES Y COMUNICACIÓN

| # | Estado | Ítem | Descripción |
|---|--------|------|-------------|
| G-01 | 🟪 | Push lanzamiento campaña | Admin lo dispara manualmente: "¡Nueva canasta solidaria activa! Participá desde $1.000 → ver canasta" |
| G-02 | 🟪 | Push hito 50% | Automático al llegar al 50% de recaudación: "¡Ya vamos al 50%! Faltan $30.000 para completar la canasta" |
| G-03 | 🟪 | Push al completarse | "¡La canasta se completó! El sorteo es próximamente. ¿Participaste?" |
| G-04 | 🟪 | Notif + email al 1° ganador | Push in-app + email (Resend) con: nombre, campaña, datos de entrega, instrucciones y plazo de 48hs |
| G-05 | 🟪 | Notif al 2°/3° si anterior no responde | Push + email al siguiente ganador cuando el admin lo marque como SIN_RESPUESTA |
| G-06 | 🟪 | Email confirmación donación | Inmediato post-pago: "Gracias por tu donación de $X. Ya estás participando en el sorteo. Te avisamos si ganás." |
| G-07 | 🟪 | Flyer compartible | Botón en /canasta: "Compartir" → genera imagen (html-to-image) con progreso actual, para redes sociales |
| G-08 | 🟪 | Banner home desde admin | El admin activa un banner/card en home visible para todos. Con progreso en tiempo real |

---

### BLOQUE H — LEGAL Y TRANSPARENCIA

| # | Estado | Ítem | Descripción |
|---|--------|------|-------------|
| H-01 | 🟪 | T&C propios `/canasta/terminos` | Naturaleza voluntaria, no reembolsable, criterios del sorteo, 1 entrada por persona, cascada de ganadores (48hs), uso del 10% reserva, política de no respuesta |
| H-02 | 🟪 | Aviso pre-pago | Checkbox obligatorio: "Entiendo que esta donación es voluntaria y no reembolsable. Acepto los [Términos de la Canasta Solidaria]" |
| H-03 | 🟪 | Transparencia del fondo | En /canasta: total recaudado, % reserva, cantidad de donantes. Sin montos individuales (privacidad) |
| H-04 | 🟪 | Historial público | /canasta/historial: campañas cerradas, total recaudado, nombre ganador (inicial apellido), foto entrega si disponible |
| H-05 | 🟪 | Aclaración no es lotería | Texto visible: "Esta es una colecta solidaria comunitaria, no una rifa comercial. La donación financia una canasta real para un vecino real." |

---

### BLOQUE I — CARRITO (integración checkout)

| # | Estado | Ítem | Descripción |
|---|--------|------|-------------|
| I-01 | 🟪 | Toggle en carrito | Componente `CartDonationToggle` con switch y input monto (si hay campaña activa y el usuario no donó aún) |
| I-02 | 🟪 | Display en carrito | Línea separada en el resumen: "Donación solidaria 🧺 $1.000" en color naranja. Debajo del subtotal de productos |
| I-03 | 🟪 | Total visual | "Compra: $20.000 + Donación: $1.000 = Total del día: $21.000" |
| I-04 | 🟪 | Formulario donante en carrito | Al activar la donación: despliega mini-formulario (nombre, teléfono, localidad) si no está pre-cargado del perfil |
| I-05 | 🟪 | Flujo de pago doble | 1) Se paga la compra normalmente. 2) Si se confirmó la compra → redirect al checkout de donación MP. 3) Vuelta a confirmación |
| I-06 | 🟪 | Email unificado | El email de confirmación de compra incluye sección "Donación solidaria" con monto y estado (pendiente/confirmado) |

---

## ORDEN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1 — Fundación DB y API base
1. Migración: `DonationCampaign`, `DonationProduct`, `Donation`, `DonationDraw`
2. API GET `/api/canasta/campaign` con progreso calculado
3. Seed con primera campaña de prueba + 14 productos

### Fase 2 — Flujo de donación core
4. Formulario donante + validaciones
5. Integración MP: preferencia de donación al admin
6. Webhook IPN canasta
7. API check-eligibility
8. Email confirmación donación (Resend)

### Fase 3 — Página /canasta visual
9. Layout página con canasta CSS 3D
10. Tarjetas de productos con estado apagado/iluminado
11. Barra de progreso + contador + feed donantes recientes
12. Botón CTA + formulario donante integrado

### Fase 4 — Panel admin
13. `/admin/canasta` dashboard con stats
14. Gestión de campaña (crear/editar/activar banner)
15. Lista de donantes con datos de contacto
16. Ruleta de sorteo animada
17. Gestión de ganadores con cascada

### Fase 5 — Comunicación
18. Push hitos automáticos (50%, 100%)
19. Notificación masiva desde admin
20. Email al ganador (y al 2°/3° si corresponde)
21. Generador de flyer compartible

### Fase 6 — Integración carrito
22. `CartDonationToggle` en checkout
23. Flujo de 2 pagos secuenciales
24. Email de compra actualizado con sección donación

### Fase 7 — Legal y pulido
25. Página `/canasta/terminos`
26. Checkbox pre-pago
27. Página `/canasta/historial`
28. Banner home desde admin
29. Botón "Ayudar es posible" en home

---

## DECISIONES PENDIENTES ✅ / ❓

| # | Estado | Decisión |
|---|--------|----------|
| P-01 | ✅ | Mínimo donación: **$1.000** |
| P-02 | ✅ | Reserva operativa: **10%** visible públicamente |
| P-03 | ✅ | Meta total: **$60.000** ($54.545 productos + $5.455 reserva) |
| P-04 | ✅ | Fondo general (no se elige a qué producto va la donación) |
| P-05 | ✅ | Sorteo solo al llegar al 100% |
| P-06 | ✅ | 1 donación por persona por campaña |
| P-07 | ✅ | Cascada de ganadores: 1°→2°→3° con 48hs cada uno |
| P-08 | ✅ | Formulario de donante con nombre, teléfono, email, localidad |
| P-09 | ❓ | **¿Qué alimentos exactos y en qué cantidad?** → Lista base propuesta arriba, admin puede ajustar por campaña |
| P-10 | ❓ | **¿Si los 3 ganadores no responden?** → ¿Plata pasa a la siguiente campaña? ¿Admin decide? Definir para los T&C |
| P-11 | ❓ | **¿El banner en home es un popup o sección fija?** → Propuesta: sección fija visible, sin popup intrusivo |
| P-12 | ❓ | **¿Los donantes anónimos (sin cuenta) pueden donar?** → Propuesta: solo usuarios registrados (para validar 1 por persona) |

---

## NOTAS TÉCNICAS

- **3D liviano:** CSS `perspective` + Framer Motion para entrada. Sin Three.js ni WebGL.
- **MP split:** Las donaciones van a las credenciales del admin (variables de entorno separadas `ADMIN_MP_ACCESS_TOKEN`). No usar el split del marketplace.
- **Ruleta:** Backend calcula el ganador antes de la animación. Frontend solo anima. La ruleta gira y "frena" en el nombre ya determinado.
- **Progreso por producto (fondo general):** total_recaudado se distribuye proporcionalmente. Producto con precio X tiene % = min(100, (total_recaudado / meta_sin_reserva) × 100). No es por producto individual, es el avance general aplicado a todos.
- **Rate limiting:** Reutilizar `rate-limit.ts` en `/api/canasta/donate`.
- **Push existente:** Reutilizar `sendPushToUser` y `createNotification`. Push masivo usa el sistema de `PushCampaign`.
- **Carrito:** Las credenciales MP del admin para la donación tienen que estar en variables de entorno del servidor. El frontend nunca las ve.

---

## ARCHIVOS A CREAR/MODIFICAR

| Archivo | Acción | Por qué |
|---------|--------|---------|
| `prisma/schema.prisma` | Modificar | Agregar 4 nuevos modelos |
| `src/app/canasta/page.tsx` | Crear | Página principal canasta |
| `src/app/canasta/donar/page.tsx` | Crear | Formulario + checkout |
| `src/app/canasta/terminos/page.tsx` | Crear | T&C legales |
| `src/app/canasta/historial/page.tsx` | Crear | Historial público |
| `src/app/admin/canasta/page.tsx` | Crear | Dashboard admin canasta |
| `src/app/api/canasta/campaign/route.ts` | Crear | GET campaña activa |
| `src/app/api/canasta/donate/route.ts` | Crear | POST donación |
| `src/app/api/canasta/webhook/route.ts` | Crear | IPN MercadoPago |
| `src/app/api/canasta/check-eligibility/route.ts` | Crear | GET elegibilidad |
| `src/app/api/canasta/recent-donors/route.ts` | Crear | GET feed donantes |
| `src/app/api/admin/canasta/...` | Crear | APIs admin (x5) |
| `src/components/canasta/CanastaVisual.tsx` | Crear | Canasta 3D + productos |
| `src/components/canasta/DonationProgress.tsx` | Crear | Barra progreso + counter |
| `src/components/canasta/RecentDonors.tsx` | Crear | Feed en tiempo real |
| `src/components/canasta/CartDonationToggle.tsx` | Crear | Toggle en carrito |
| `src/components/canasta/DrawRoulette.tsx` | Crear | Ruleta sorteo (admin) |
| `src/components/canasta/HomeBanner.tsx` | Crear | Banner home desde admin |
| `src/app/page.tsx` | Modificar | Agregar botón + HomeBanner |
| `src/lib/mp.ts` | Modificar | Agregar función donación al admin |
| `src/lib/resend.ts` | Modificar | Template email donación + ganador |

---

*Este documento se actualiza a medida que avanza la implementación.*
