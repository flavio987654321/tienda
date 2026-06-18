# CANASTA SOLIDARIA — PLAN DE IMPLEMENTACIÓN

> Creado: 2026-06-16 | Feature completa de donación colectiva y sorteo
> Workflow: 🟪 pendiente | 🟦 en progreso | ✅ hecho | ❌ descartado con justificación
> Última actualización: 2026-06-18

---

## IDEA CENTRAL

Un espacio donde la comunidad dona colectivamente para armar una **canasta familiar con alimentos básicos**. Cada producto de la canasta se "ilumina" a medida que se va financiando con las donaciones. Cuando se llega al monto objetivo, se hace un **sorteo en vivo** entre todos los donantes. El admin compra los productos reales y los entrega/envía al ganador.

---

## REGLAS DE NEGOCIO (✅ confirmadas)

### Donación
- **Mínimo por donación: $1.000**
- **Una sola donación por persona por campaña** (igualdad de chances, sin ventaja por monto)
- **Se puede donar con o sin cuenta registrada** (igual que las compras en tienda)
- **Anti-abuso:** si está logueado, valida por userId. Si es invitado, valida por combinación email+teléfono. Fallback adicional por IP/día
- El monto es libre desde $1.000 (alguien puede donar los $60.000 enteros y completar la canasta)
- La plata va directo a MercadoPago del admin (fondo de propósito específico, no retirable como wallet)

### Campaña
- **No se fija un monto "tope" a mano.** La meta sale sola de sumar los precios de los productos cargados + 10% de reserva. Si el admin agrega o quita productos, la meta se recalcula automáticamente.
- El **10% de reserva** se muestra públicamente para total transparencia
- Los precios de los productos los carga el admin por campaña (los precios suben, cada campaña puede tener precios actualizados)
- **Una campaña activa a la vez**
- **Corte automático:** en cuanto el total donado confirma cubrir el último producto + el 10% de reserva, el sistema **corta las donaciones automáticamente** (la campaña pasa a estado `COMPLETED`, el endpoint de donar rechaza nuevos pagos) y queda lista para el sorteo
- **No arranca una campaña nueva** hasta que el admin entregue el premio y cierre la anterior manualmente

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

### Sorteo y cascada de ganadores (✅ confirmado)
- **Sistema de ranking:** el sorteo genera 3 posiciones (1°, 2°, 3°)
- **1° ganador:** recibe notificación push + email con 48hs para responder. Admin también intenta contactarlo directamente (teléfono)
- **Si no responde en 48hs:** pasa al 2° ganador con las mismas condiciones
- **Si tampoco responde:** pasa al 3° ganador
- **Si ninguno de los 3 responde:** se vuelve a programar el sorteo automáticamente para el día siguiente (nuevo sorteo entre los mismos donantes confirmados, se descartan los 3 que no respondieron)
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

### Botón flotante en el home (DEFINIDO ✅)
- Se agrega un **segundo botón flotante** en el home, mismo patrón que el botón de contacto existente (`src/app/page.tsx:1031-1045`)
- Posición: **del lado izquierdo** de la pantalla (ej: `bottom-6 left-6`), NO apilado arriba del botón de contacto que sigue a la derecha. Mismo tamaño (`w-14 h-14`), círculo
- Ícono: `HeartHandshake` de Lucide (manos en gesto de ayuda, estilo silueta)
- Color distinto al de contacto (ej: dorado/naranja `bg-amber-500`) para diferenciarlo
- Al hacer click → navega a `/canasta` (página completa, no popup ni modal)
- Solo se muestra si hay una campaña ACTIVE (si no hay campaña activa, el botón no aparece)
- Animación de entrada igual a la del botón de contacto (`motion.div` con spring)

### Flyer compartible (para redes, no para el home)
- Botón "Compartir" dentro de `/canasta` que genera una imagen (html-to-image) con el progreso actual de la campaña
- Pensado para compartir en WhatsApp/redes, no es parte de la página principal

---

## ARQUITECTURA — QUÉ HAY QUE CONSTRUIR

### BLOQUE A — BASE DE DATOS (Prisma)

| # | Estado | Modelo | Descripción |
|---|--------|--------|-------------|
| A-01 | ✅ | `DonationCampaign` | id, nombre, descripción, meta ($60.000), reservaPct (10), estado (ACTIVE/DRAWN/CANCELLED), fechaSorteoEstimada, createdAt |
| A-02 | ✅ | `DonationProduct` | id, campaignId, nombre, imagen, precioObjetivo, orden. La suma = meta × (1 - reservaPct) |
| A-03 | ✅ | `Donation` | id, userId (nullable — null si es invitado), campaignId, monto, mpPaymentId, estado (PENDING/CONFIRMED/FAILED), donorName, donorPhone, donorEmail, donorLocalidad, donorPrefEntrega (ENVIO/RETIRO), createdAt. Índice único en (campaignId, donorEmail, donorPhone) para evitar doble donación de invitados |
| A-04 | ✅ | `DonationDraw` | id, campaignId, intentoNro (1, 2, 3...), winner1Id, winner2Id, winner3Id, winnerFinalId, estadoGanador (PENDIENTE/CONFIRMADO/SIN_RESPUESTA), excluidos (array de userIds descartados de intentos previos), conductedAt, reintentoProgramadoPara, notasAdmin |

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
| B-05 | 🟪 | `/` (home) | Botón flotante (ícono `HeartHandshake`) del lado izquierdo, mismo patrón visual que el de contacto (que queda a la derecha). Solo visible si hay campaña ACTIVE. Link a `/canasta` |

---

### BLOQUE C — API ROUTES

| # | Estado | Endpoint | Método | Descripción |
|---|--------|----------|--------|-------------|
| C-01 | ✅ | `/api/canasta/campaign` | GET | Campaña activa con productos, total recaudado, cantidad donantes |
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
| D-02 | 🟦 | Gestión de campaña | ✅ Editar productos (foto, precio), ✅ % reserva editable, ✅ agregar alimentos nuevos. 🟪 Falta: crear campaña nueva desde cero, fecha estimada de sorteo, toggle banner en home |
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
| E-01 | ✅ | Canasta 3D liviana | Hecho con CSS `perspective` + Framer Motion. Paleta clara/cálida (no la oscura del resto del sitio) |
| E-02 | ✅ | Productos en la canasta | Grid de tarjetas con ícono real (Lucide) o foto subida desde admin. Apagadas = gris desaturado |
| E-03 | ✅ | Estado visual por producto | Llenado en cascada según `sortOrder` (no proporcional parejo) |
| E-04 | ✅ | Barra de progreso total | Hecha, con efecto shimmer animado |
| E-05 | 🟪 | Contador de sorteo | Falta el countdown real DD:HH:MM:SS — hoy solo muestra la fecha si existe |
| E-06 | 🟪 | Feed de donantes recientes | Falta — depende de que existan donaciones reales (Fase 2) |
| E-07 | 🟪 | Botón CTA donar | Hoy el botón siempre dice "Donar desde $1.000" — falta el estado "Ya participás" cuando el usuario ya donó |
| E-08 | ✅ | % reserva visible | Hecho, debajo de la barra de progreso |

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
| P-09 | ✅ | **Resuelto en la práctica:** no hace falta definir la lista de antemano — el admin carga, edita precio/foto y agrega alimentos nuevos directo desde `/admin/canasta`, y la meta se recalcula sola |
| P-10 | ✅ | **Resuelto, es lo mismo que P-13:** si ninguno de los 3 responde, se reprograma el sorteo para el día siguiente excluyendo a esos 3 (no hace falta una regla aparte) |
| P-11 | ✅ | **Resuelto, ver P-14:** no es un banner, es el botón flotante en el home |
| P-12 | ✅ | **Donantes sin cuenta SÍ pueden donar** (igual que la tienda permite comprar con o sin registro). Validación de "1 por persona" se hace por combinación email+teléfono en vez de userId cuando es invitado |
| P-13 | ✅ | Si ningún ganador (1°/2°/3°) responde → se reprograma sorteo automáticamente para el día siguiente, excluyendo a los que no respondieron, entre el resto de donantes confirmados |
| P-14 | ✅ | Botón de acceso a la canasta en el home: **botón flotante con ícono `HeartHandshake`**, ubicado del **lado izquierdo** de la pantalla (el de contacto sigue a la derecha), mismo estilo. Lleva a `/canasta` completa |

---

## NOTAS TÉCNICAS

- **3D liviano:** CSS `perspective` + Framer Motion para entrada. Sin Three.js ni WebGL.
- **MP split:** Las donaciones van a las credenciales del admin. Ya existe `MP_ACCESS_TOKEN` en `.env.local` (token de la plataforma/admin, usado en `platformClient()` de `src/lib/mp.ts`) — se reutiliza ese, no hace falta crear una variable nueva. No usar el split del marketplace para donaciones.
- **Ruleta:** Backend calcula el ganador antes de la animación. Frontend solo anima. La ruleta gira y "frena" en el nombre ya determinado.
- **Progreso por producto (fondo general):** se llenan en cascada según el orden (`sortOrder`). El total recaudado completa el primer producto al 100%, después el segundo, así sucesivamente — efecto visual de "se va llenando un producto a la vez", más fiel a la idea original ("la leche aparece con color pero casi llena").
- **Rate limiting:** Reutilizar `rate-limit.ts` en `/api/canasta/donate`.
- **Push existente:** Reutilizar `sendPushToUser` y `createNotification`. Push masivo usa el sistema de `PushCampaign`.
- **Carrito:** Las credenciales MP del admin para la donación tienen que estar en variables de entorno del servidor. El frontend nunca las ve.

---

## BLOQUE J — SORTEO EN VIVO (diseño técnico detallado)

> Resultado de análisis con agente de planificación especializado. Cubre seguridad, tiempo real y anti-bugs antes de tocar código.

### Modelo de datos nuevo (extiende lo ya creado)
- `DonationCampaign`: agregar `scheduledDrawAt` (fecha/hora exacta que el admin programa), `drawStatus` (SCHEDULED/LIVE/FINISHED), `drawStartedAt` (timestamp real de cuándo arrancó)
- `DonationDraw`: agregar `revealAt` (momento exacto en que se puede mostrar el resultado, calculado como inicio + duración de animación)
- Constraint a nivel de base de datos (no solo en el código) que impide dos campañas `ACTIVE` al mismo tiempo — así no vuelve a pasar lo de las campañas duplicadas

### Cómo se sincroniza la ruleta "en vivo" para todos
- La página pública (`/canasta/sorteo`) consulta al servidor cada 2 segundos "¿ya arrancó?". Cuando lo activás desde el panel, todos los que están mirando lo detectan casi al instante y la ruleta arranca sincronizada, sin depender del reloj de la computadora de cada uno (el servidor manda su propia hora real en cada respuesta)
- Es polling simple, no algo más pesado — para este tamaño de proyecto es la opción más simple y confiable, sin riesgo de que se rompa con muchas personas mirando a la vez

### Seguridad anti-manipulación del resultado (✅ confirmado, diseño a prueba de trampas)
- El ganador se calcula y se guarda en la base **en el instante en que apretás "Activar sorteo"**, nunca durante la animación
- Ningún dato del ganador se entrega al navegador de nadie hasta el segundo exacto en que la ruleta tiene que frenar — verificado explícitamente para que ni inspeccionando el código ni mirando las peticiones de red se pueda adivinar antes de tiempo
- El panel admin de "Gestión de ganadores" solo permite cambiar el *estado* (pendiente/confirmado/sin respuesta), nunca permite editar a mano quién ganó

### Seguridad anti doble-click (✅ confirmado)
- Capa visual: el botón se desactiva apenas se toca una vez
- Capa real (la que importa): la base de datos no permite que la misma acción se repita dos veces, sea por doble click, dos pestañas abiertas, o lo que sea — aplica a "Donar", "Activar sorteo" y "Marcar sin respuesta"

### Decisiones tomadas sobre el sorteo
- **Duración de la animación de la ruleta: 10 segundos**
- **Lista pública de participantes: nombre y apellido completo** (no inicial)
- **Si los 3 ganadores no responden:** el admin programa la nueva fecha/hora a mano otra vez para el día siguiente (no es automático)
- **Reprogramar un sorteo ya programado (antes de que arranque):** sí, hay un botón para editar la fecha/hora las veces que haga falta, mientras no haya arrancado todavía

### Página pública `/canasta/sorteo` — estados
1. **Antes de la hora:** contador de cuenta regresiva + lista de participantes al costado
2. **En vivo (girando):** la ruleta animada, con info de contexto visible (total recaudado, cantidad de participantes, nombre de campaña)
3. **Resultado mostrado:** se revela 1°, 2° y 3° puesto
4. **Sorteo ya pasado:** cualquiera que entre después ve el resultado final directo, sin animación

### Estado: ✅ TODO CONSTRUIDO (18/06)
1. ✅ Migración de los campos nuevos + constraint de "una sola campaña activa" + constraint de "un solo intento de sorteo por número"
2. ✅ Endpoint de estado del sorteo (`GET /api/canasta/draw-status`, público, nunca expone ganador antes de `revealAt`)
3. ✅ Programar/editar fecha desde el admin (`PUT /api/admin/canasta/campaign`, bloqueado una vez que el sorteo arrancó)
4. ✅ Activar sorteo (`POST /api/admin/canasta/draw/activate`) — calcula y guarda el resultado con `crypto.randomInt`, protegido con compare-and-swap transaccional
5. ✅ Cascada de ganadores (`PUT /api/admin/canasta/draw/winner-status`) — avanza 1°→2°→3°, reprograma si los 3 fallan
6. ✅ Tabla de donantes en el admin (`GET /api/admin/canasta/donors` + UI en `/admin/canasta`)
7. ✅ Email manual a todos los donantes (`POST /api/admin/canasta/notify-donors`)
8. ✅ Función de email automático al admin lista (`sendCanastaCompletedAdminEmail` en `src/lib/resend.ts`) — falta conectarla al momento real de "se completó la meta", que depende del webhook de pagos (Fase de pagos, pendiente)
9. ✅ Endpoint público de participantes (`GET /api/canasta/participants`, solo nombre y apellido)
10. ✅ Página pública del sorteo (`/canasta/sorteo`) con sus 4 estados
11. ✅ Animación de la ruleta (`RouletteWheel.tsx`) — efecto de suspenso genérico, nunca conoce el resultado real de antemano
12. ✅ Pruebas de seguridad automatizadas contra la base real (`prisma/test-race-conditions.ts`): 5 activaciones simultáneas → solo 1 sorteo creado; 5 "marcar sin respuesta" simultáneas → la cascada avanza una sola vez; confirmado que el resultado nunca se marca como revelable antes de tiempo

**Pendiente de esta sección (queda para cuando se construyan los pagos):** conectar el momento real en que una donación confirmada completa la meta → disparar `sendCanastaCompletedAdminEmail` y pasar `campaign.status` a `COMPLETED` automáticamente.

**Regla a aplicar en el formulario de donación / webhook (decidido el 18/06, pendiente de implementar):** tope máximo por donación = **20-25% de la meta de la campaña** (no un monto fijo en pesos, porque la meta cambia según los productos cargados). Sin este tope, una sola persona podría cubrir toda la canasta y el sorteo perdería sentido (un único donante = ganador garantizado, sin nada que sortear). Validar tanto en el frontend (UX) como en el backend (seguridad, no confiar solo en el cliente).

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
