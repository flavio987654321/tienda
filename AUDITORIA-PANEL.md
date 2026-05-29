# AUDITORÍA — PANEL DE DUEÑO

> Creado: 2026-05-29 | Basado en auditoría técnica completa del panel `/dashboard`.
> Workflow: 🔲 pendiente | 🔄 en progreso | ✅ hecho | ❌ descartado con justificación
> Última actualización: 2026-05-29

---

## LEYENDA DE IMPACTO
- 🔴 BLOQUEANTE — sin esto la plataforma no es usable comercialmente
- 🟠 ALTO — afecta conversión o experiencia central del cliente final
- 🟡 MEDIO — mejora importante pero workaround existe
- 🟢 BAJO — pulido y nice-to-have

---

## BLOQUE G — SEGURIDAD Y PERMISOS

> Riesgos de exposición de datos, acceso no autorizado y vectores de ataque.
> Ninguno de estos ítems debe llegar a producción sin resolverse.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| G-01 | ✅ | 🔴 | **Verificar RLS en Supabase Console** — no hay archivos de migración RLS en el proyecto. `NotificationBell` y `DashboardLayout` usan el publishable key desde el browser. Sin políticas RLS en `Notification` y `Affiliate`, un usuario autenticado podría recibir datos de otras tiendas. Verificar en Supabase Console que cada tabla tiene RLS habilitado con políticas restrictivas por `store_id` o `user_id` |
| G-02 | ✅ | 🟠 | **IDOR en `/api/cupones/[id]/imagen`** — el endpoint no existía (los botones Ver/Descargar en la UI devolvían 404). Se eliminaron los botones rotos del panel de cupones. Si en el futuro se implementa generación de imágenes, validar `coupon.storeId === store.id` antes de responder. |
| G-03 | 🔲 | 🟠 | **`mpAccessToken` y `mpRefreshToken` en plaintext en DB** — los tokens de MercadoPago se almacenan directamente en la tabla `Store` sin encriptación adicional. Si hay una brecha, quedan completamente expuestos. Evaluar encriptación en reposo o migración a tabla separada con acceso restringido |
| G-04 | 🔲 | 🟠 | **Sin rate limiting en endpoints críticos** — `/api/auth/registro` y `/api/vendedoras` (POST) no tienen rate limiting. Un actor malicioso puede crear cuentas o aplicaciones masivas. Implementar rate limiting por IP (ej: `upstash/ratelimit` + Redis) |
| G-05 | 🔲 | 🟡 | **Campos de texto sin longitud máxima validada en servidor** — nombre de tienda, descripción, social links, y otros campos de texto libre no tienen validación de longitud máxima en el servidor. Strings muy largos pueden inflar la DB o causar errores 500 inesperados. Agregar `maxLength` en Zod schemas de cada endpoint |

---

## BLOQUE H — BUGS Y ERRORES CONFIRMADOS

> Errores verificados en el código que producen comportamiento incorrecto.
> Ordenados de mayor a menor criticidad.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| H-01 | ✅ | 🔴 | **Token Supabase expirado no redirige al login** — si la sesión expira mientras el dueño trabaja, el próximo request devuelve 401 pero la UI muestra un error genérico sin redirigir. El dueño queda atrapado en el panel con errores inexplicables. En el fetch wrapper o en los API routes, interceptar 401 y hacer `router.push('/login')` |
| H-02 | ✅ | 🟠 | **Race condition en generación de slugs** — `uniqueStoreSlug()` en `/api/auth/registro` hace check-then-create: busca si el slug existe y si no lo crea. Con dos registros simultáneos, ambos pueden obtener el mismo slug y el segundo falla con error 500 sin mensaje claro. Usar constraint UNIQUE en DB + retry con nuevo sufijo en caso de `P2002` (Prisma unique violation) |
| H-03 | ✅ | 🟠 | **Sin Error Boundary en `/dashboard/configuracion`** — es un client component pesado con estado complejo. Si `GET /api/configuracion` falla (timeout, DB down), el componente queda en estado roto sin UI de fallback: el dueño ve pantalla en blanco. Agregar try-catch en `useEffect` con estado de error + mensaje + botón "Reintentar" |
| H-04 | ✅ | 🟠 | **Formularios sin deshabilitar el botón durante el request** — múltiples formularios del panel (productos, cupones, configuración, afiliadas) no deshabilitan el botón submit durante el request. Doble click genera productos duplicados, cupones duplicados, o doble aplicación de afiliada. Usar estado `isLoading` + `disabled={isLoading}` en todos los formularios del panel |
| H-05 | ✅ | 🟠 | **CSV import sin límite de tamaño ni idempotency** — `/api/productos/import` no valida el tamaño del archivo antes de procesarlo. Un CSV de 50MB puede saturar el servidor. Además, doble-click en el botón lanza dos requests simultáneos con los mismos datos. Agregar: validación de tamaño (ej: 5MB máx) + deshabilitar botón durante el procesamiento |
| H-06 | ✅ | 🟠 | **12+ silent failures en notificaciones** — múltiples lugares usan `.catch(() => {})` sin loguear: notificación de nuevo producto a afiliadas, email al dueño en aplicación de afiliada, notificaciones de confirmación de pedidos. Si el sistema de notificaciones falla, nadie lo sabe. Reemplazar todos los `.catch(() => {})` por `.catch((err) => console.error('[notify]', err))` como mínimo |
| H-07 | 🔲 | 🟡 | **Race condition en edición multi-tab** — si el dueño tiene el panel abierto en dos tabs y edita el mismo pedido o la misma configuración de tienda simultáneamente, la última escritura gana y la primera se pierde silenciosamente. Agregar `updatedAt` check en los endpoints de update (optimistic locking) o al menos mostrar warning si el recurso fue modificado desde la última carga |
| H-08 | ✅ | 🟡 | **`as any` en `/dashboard/ajustes`** — `const tier = (sub as any)?.tier ?? "BASIC"` (línea 23). Si el modelo `Subscription` cambia en el schema de Prisma, este cast falla silenciosamente en producción sin error de compilación. Tipar correctamente usando el tipo generado por Prisma |
| H-09 | ✅ | 🟡 | **`storeConfig` guardado sin validación de estructura** — los endpoints POST y PUT de `/api/configuracion` no validan que `storeConfig` sea un JSON válido con la estructura esperada antes de persistir. Un cliente que envíe datos malformados puede corromper la configuración de la tienda. Agregar schema Zod para `storeConfig` y validar en el endpoint |
| H-10 | 🔲 | 🟢 | **`NotificationBell` con assertion `!` sin error handling** — `createBrowserClient(url!, key!)` crashea en runtime si las env vars no están seteadas. Reemplazar por guardado condicional: si faltan las vars, no montar el componente de tiempo real |

---

## BLOQUE I — UX DEL PANEL DE DUEÑO

> Mejoras de experiencia que no son bugs pero sí afectan la usabilidad diaria del dueño.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| I-01 | ✅ | 🟠 | **"¿Deseas salir sin guardar?" en editor de configuración** — el FloatingEditor acumula estado local. Si el dueño edita colores, textos o imágenes y navega a otra sección del dashboard sin guardar, pierde todos los cambios sin advertencia. Interceptar `beforeunload` + navegación de `next/navigation` para mostrar confirmación si hay cambios pendientes |
| I-02 | ✅ | 🟠 | **Confirmación de 2 pasos al eliminar** — productos y cupones se eliminan con un solo click, sin confirmación. La acción es irreversible (no hay soft-delete). Agregar dialog de confirmación: "¿Eliminar [nombre]? Esta acción no se puede deshacer." |
| I-03 | ✅ | 🟠 | **Progress indicator en upload de imágenes** — al subir imágenes al storage de Supabase (productos y editor de configuración), no hay feedback de progreso. El dueño no sabe si está cargando o colgado. Mostrar skeleton/spinner durante el upload y mensaje de error si falla |
| I-04 | ✅ | 🟡 | **Ocultar "Consultas" del sidebar para tiendas sin modelo de leads** — el ítem "Consultas" aparece en el sidebar para todos los tipos de tienda, pero solo es relevante para `VEHICULOS` e `INMOBILIARIA`. Para tiendas de ropa, moda, etc., lleva a una página con 0 datos. Ocultar o deshabilitar según `tipoTienda` |
| I-05 | ✅ | 🟡 | **Loading skeleton en `/dashboard/configuracion`** — la página de configuración (la más usada para personalización) no tiene skeleton loader visible durante la carga inicial. El dueño ve un flash en blanco antes de que aparezca la Gallery de templates |
| I-06 | ✅ | 🟡 | **Feedback de loading en toggle de cupón** — el toggle activo/inactivo de cupones no muestra estado de carga. El dueño puede hacer click múltiples veces sin saber si el primer click se procesó. Agregar `isLoading` local que deshabilite el toggle durante el PATCH |
| I-07 | 🔲 | 🟡 | **Indicator de reconexión Realtime en sidebar** — cuando la conexión Supabase Realtime se cae (internet intermitente), los badges de pedidos y afiliadas quedan desactualizados sin indicador visual. El dueño puede perderse eventos mientras la conexión está caída. Mostrar dot/badge de "Reconectando..." cuando la conexión está offline |
| I-08 | 🔲 | 🟢 | **Badge de "Consultas" solo si hay leads pendientes** — si se decide mantener "Consultas" visible para todos, agregar badge numérico rojo (como pedidos y afiliadas) solo cuando hay leads en estado PENDING. Actualmente no tiene badge |

---

## BLOQUE J — NUEVAS FUNCIONALIDADES DEL PANEL

> Funcionalidades ausentes detectadas durante la auditoría, ordenadas por prioridad.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| J-01 | ✅ | 🟠 | **Exportar pedidos a CSV** — el dueño no puede sacar sus datos de pedidos fácilmente. Botón "Exportar" en `/dashboard/pedidos` que descarga un CSV con: número de orden, fecha, cliente, productos, total, estado, método de envío, tracking, afiliada. Complejidad: baja |
| J-02 | ✅ | 🟠 | **Acción directa sobre retiros de afiliadas** — el panel muestra los retiros pendientes de afiliadas (transferencias bancarias), pero el dueño no tiene botón de acción directa para marcarlos como pagados. Agregar botón "Marcar como pagado" + confirmación + registro de fecha de pago |
| J-03 | ✅ | 🟡 | **Historial de cambios en pedidos (audit log)** — no hay trazabilidad de quién cambió el estado de un pedido ni cuándo. Si hay un conflicto con un cliente, el dueño no puede demostrar cuándo confirmó o despachó. Agregar tabla `OrderStatusLog` con `orderId`, `fromStatus`, `toStatus`, `changedBy`, `changedAt` |
| J-04 | ✅ | 🟡 | **Notificaciones push (Web Push / PWA)** — service worker en `public/sw.js`, tabla `PushSubscription` en DB, endpoints `/api/push/subscribe` y `/api/push/vapid-key`, helper `sendPushToUser`. Toggle en sidebar del dashboard. Push enviado en checkout (nuevo pedido) y en solicitud de afiliada. Requiere: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` en .env y SQL: `CREATE TABLE "PushSubscription" ...` (ver instrucciones abajo). |
| J-05 | ✅ | 🟡 | **Métricas comparativas de afiliadas** — en `/dashboard/vendedoras` se ven los números individuales de cada afiliada pero no hay comparación entre ellas ni ranking. Agregar tabla/ranking de top afiliadas por ventas del mes + variación vs mes anterior |
| J-06 | ❌ | 🟡 | **Multi-imagen en variantes de producto** — el sistema de asignación de imágenes por `variantValue` (color) ya implementado en el producto cubre el caso de uso principal. `imageUrl` por fila de variante sería redundante para la mayoría de tiendas. |
| J-07 | ✅ | 🟢 | **Plantilla de respuesta rápida a leads/consultas** — 4 templates predefinidos (saludo, stock, envío, cerrar venta) con botón Copiar y botón Abrir WhatsApp. Se muestran en el panel expandible de cada consulta cuando hay teléfono del cliente. |
| J-08 | ✅ | 🟢 | **Programar publicación de productos** — campo `publishAt` en formulario de producto con date-time picker. Si la fecha es futura, el producto se guarda oculto. Endpoint `/api/cron/publish-scheduled` activa los productos cuando llega la fecha. Protegido con `CRON_SECRET`. SQL: `ALTER TABLE "Product" ADD COLUMN "publishAt" TIMESTAMP(3);` |

---

## BLOQUE K — ARQUITECTURA Y DEUDA TÉCNICA

> Problemas estructurales que no rompen funcionalidad hoy pero comprometen el crecimiento.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| K-01 | ✅ | 🟠 | **Sistema de logging de errores** — hoy los errores silenciosos son invisibles. Integrar Sentry (o similar) para capturar excepciones no manejadas, errores de Prisma, y los 12+ silent catches. Con esto se puede detectar problemas en producción sin esperar que el usuario lo reporte |
| K-02 | 🔲 | 🟡 | **Schema Zod para `storeConfig`** — el campo `storeConfig: Json` de Prisma es un blob sin estructura definida. Con el tiempo acumula propiedades incontroladas de distintas versiones del editor. Definir un `StoreConfigSchema` Zod y validar en cada lectura/escritura |
| K-03 | 🔲 | 🟡 | **Capa de servicios separada de los API route handlers** — la lógica de negocio (calcular comisiones, actualizar wallet, generar notificaciones, enviar emails) está inline dentro de los route handlers. Esto imposibilita el testing unitario. Extraer a `/src/services/` con funciones puras testeables |
| K-04 | ✅ | 🟡 | **Soft-delete para productos** — al eliminar un producto, los `OrderItem` que lo referencian pueden quedar huérfanos o mostrar datos rotos en el historial de pedidos. Agregar campo `deletedAt` en `Product` y filtrar `deletedAt IS NULL` en todas las consultas |
| K-05 | 🔲 | 🟡 | **Resolver doble fuente de verdad en badges del sidebar** — `DashboardLayout` combina polling HTTP periódico Y suscripción Supabase Realtime para actualizar los mismos badges. Esto genera posibles inconsistencias y requests innecesarios. Usar exclusivamente Realtime o exclusivamente polling, no ambos |
| K-06 | ❌ | 🟢 | **Virtualización en tabla de productos** — `ProductsTable` ya tiene paginación client-side con PAGE_SIZE=20; nunca hay más de 20 filas en el DOM. Virtualización sería redundante dado el paginado existente. |
| K-07 | 🔲 | 🟢 | **Endpoint `mode=tiendas-disponibles` sin UI conectada** — `/api/vendedoras?mode=tiendas-disponibles` está implementado en el backend (para un futuro "marketplace de afiliadas") pero no tiene ninguna pantalla que lo consuma. Código muerto activo. Eliminar o documentar como feature futura |

---

## ORDEN DE EJECUCIÓN SUGERIDO

```
FASE 1 — Bloqueantes pre-lanzamiento (hacer ANTES de abrir al público)
  G-01 → verificar RLS en Supabase Console
  H-01 → redirigir al login cuando el token expira
  H-03 → Error Boundary en /configuracion
  H-04 → deshabilitar botón submit durante requests
  H-05 → límite de tamaño en CSV import
  G-02 → IDOR en imagen de cupón
  I-02 → confirmación al eliminar productos/cupones

FASE 2 — Estabilidad (primera semana post-lanzamiento)
  H-06 → loguear silent failures de notificaciones
  K-01 → integrar Sentry o sistema de logging
  H-02 → race condition en slug (fix con Prisma P2002 retry)
  I-01 → "¿Deseas salir sin guardar?" en editor
  I-03 → progress indicator en uploads

FASE 3 — UX y mejoras (mes 1)
  I-04 → ocultar Consultas del sidebar según tipoTienda
  I-05 → skeleton loader en configuración
  I-06 → loading en toggle de cupón
  H-08 → tipar correctamente subscription tier
  H-09 → validar storeConfig con Zod (K-02)
  J-01 → exportar pedidos a CSV

FASE 4 — Funcionalidades nuevas (mes 2-3)
  J-02 → acción directa en retiros de afiliadas
  J-03 → historial de cambios en pedidos
  J-05 → métricas comparativas de afiliadas
  G-03 → evaluar encriptación de tokens MP
  K-03 → capa de servicios separada
  K-04 → soft-delete en productos

FASE 5 — Deseables (roadmap futuro)
  J-04 → notificaciones push / PWA
  J-06 → multi-imagen en variantes
  K-06 → virtualización de tabla de productos
  J-07 → templates de respuesta a leads
  J-08 → programar publicación de productos
```

---

> Última actualización: 2026-05-29
