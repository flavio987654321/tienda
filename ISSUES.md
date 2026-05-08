# REGISTRO DE ISSUES — PANEL MODO DUEÑA

> Generado: 2026-05-07 | Estado: pendientes de fix
> Workflow: marcar ✅ cuando el fix está en producción, ❌ si se descarta con justificación.

---

## LEYENDA DE SEVERIDAD
- 🔴 CRÍTICO — pérdida de datos, dinero o brecha de seguridad grave
- 🟠 ALTO — funcionalidad rota o riesgo explotable
- 🟡 MEDIO — degradación de UX o riesgo menor
- 🟢 BAJO — mejora de calidad / hardening

---

## BLOQUE 1 — BUGS CRÍTICOS (hacer primero)

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| BUG-01 | ✅ resuelto | 🔴 | Checkout sin auth: spam de pedidos + sobreescribe nombre de usuarios existentes por upsert con email | src/app/api/checkout/route.ts:130 |
| BUG-02 | ✅ resuelto | 🔴 | Overselling: checkout verifica stock pero no lo reserva, el decremento ocurre recién al confirmar pago | src/app/api/checkout/route.ts:96 + pedidos/[id]/route.ts:47 |
| BUG-03 | ✅ resuelto | 🔴 | Race condition en registro: slug duplicado deja usuario huérfano en Supabase si el cleanup falla silenciosamente | src/app/api/auth/registro/route.ts:77 |
| BUG-04 | ✅ resuelto | 🟠 | Rate limiter de uploads usa Map en memoria: inoperante en serverless (Vercel crea N instancias) + memory leak | src/app/api/upload/route.ts:29 |
| BUG-05 | ✅ resuelto | 🟠 | Race condition en getCurrentUser: findFirst+create en vez de upsert → crash P2002 con tabs múltiples | src/lib/auth-session.ts:20 |
| BUG-06 | ✅ resuelto | 🟠 | Wallet no se actualiza si no existe al confirmar pedido: comisión creada pero balance nunca sube (dato corrupto) | src/app/api/pedidos/[id]/route.ts:92 |
| BUG-07 | ✅ resuelto | 🟠 | Transiciones de estado de pedido sin guard: puede marcar PENDING como enviado/entregado, cancelar DELIVERED | src/app/api/pedidos/[id]/route.ts:116 |


---

## BLOQUE 2 — VULNERABILIDADES DE SEGURIDAD

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| SEC-01 | ✅ resuelto | 🔴 | Brute-force de cupones: /api/cupones/validar sin auth ni rate limit → enumerar todos los códigos de cualquier tienda | src/app/api/cupones/validar/route.ts |
| SEC-02 | ✅ resuelto | 🔴 | XSS almacenado: pageBlocks valida que sea array pero no sanitiza contenido de bloques → puede inyectar scripts en storefront | src/app/api/configuracion/route.ts:34 |
| SEC-03 | ✅ resuelto | 🟠 | MIME type bypass: upload valida file.type (cliente) no magic bytes → se puede subir cualquier archivo con Content-Type falso | src/app/api/upload/route.ts:119 |
| SEC-04 | ✅ resuelto | 🟠 | URLs logo/banner sin validación: acepta javascript: y data: → XSS en storefront público | src/app/api/configuracion/route.ts:50 |
| SEC-05 | ✅ resuelto | 🟠 | Sin protección CSRF en ninguna ruta API de mutación | todas las rutas PUT/POST/PATCH/DELETE |
| SEC-06 | ✅ resuelto | 🟡 | Rol SELLER asignado ANTES de aprobación: cualquier BUYER escala rol solo aplicando a una tienda | src/app/api/vendedoras/route.ts:160 |
| SEC-07 | ✅ resuelto | 🟡 | Enumeración de usuarios: registro devuelve "El email ya esta registrado" + sin rate limit en /api/auth/registro | src/app/api/auth/registro/route.ts:29 |
| SEC-08 | ✅ resuelto | 🟢 | Sin Content-Security-Policy headers configurados | next.config.js |

---

## BLOQUE 3 — ERRORES LÓGICOS

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| LOGIC-01 | ✅ resuelto | 🟠 | Comisión calculada sobre total CON envío: vendedora cobra comisión sobre costo de envío que no le corresponde | src/app/api/pedidos/[id]/route.ts:81 |
| LOGIC-02 | ✅ resuelto | 🟡 | precioMayorista no validado contra price: puede ser mayor al precio retail sin error | src/app/api/productos/route.ts:97 |
| LOGIC-03 | ✅ resuelto | 🟡 | comparePrice no validado contra price: puede mostrar "descuento" cuando en realidad es aumento | src/app/api/productos/route.ts:66 |

| LOGIC-04 | ✅ resuelto | 🟡 | Sin límite máximo de quantity en checkout: se pueden pedir cantidades absurdas | src/app/api/checkout/route.ts:78 |
| LOGIC-05 | ✅ resuelto | 🟢 | Cupón porcentaje sin cap de valor máximo absoluto | src/app/api/checkout/route.ts:119 |

---

## BLOQUE 4 — PÉRDIDA DE DATOS

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| DATA-01 | ✅ resuelto | 🔴 | Editor de bloques sin beforeunload guard: cierre de tab/crash = pérdida total de cambios no guardados | src/app/dashboard/configuracion/page.tsx |
| DATA-02 | ✅ resuelto | 🟠 | PATCH producto borra y recrea todas las variantes: rompe referencias en OrderItem.variantId existentes | src/app/api/productos/[id]/route.ts:99 |
| DATA-03 | ✅ resuelto | 🟡 | Registro: si prisma.create falla Y el cleanup de Supabase falla silenciosamente → usuario huérfano en auth | src/app/api/auth/registro/route.ts:46 |

---

## BLOQUE 5 — RENDIMIENTO

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| PERF-01 | ✅ resuelto | 🟠 | Sin paginación en productos/cupones/afiliados: carga todo en memoria, fallará con >500 registros | src/app/api/productos/route.ts + cupones/route.ts + vendedoras/route.ts |
| PERF-02 | ✅ resuelto | 🟡 | N+1 implícito en stats de afiliadas: carga TODAS las comisiones y TODAS las órdenes sin límite | src/app/api/vendedoras/route.ts:16 |
| PERF-03 | ✅ resuelto | 🟡 | Double fetch en AuthProvider: cada cambio de estado auth hace 2 requests en cascada (Supabase + /api/auth/me) | src/components/AuthProvider.tsx:28 |
| PERF-04 | ✅ resuelto | 🟢 | revalidatePath solo invalida página raíz de tienda, no subpáginas con cache | src/app/api/configuracion/route.ts:88 |

---

## BLOQUE 6 — UX / MOBILE

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| UX-01 | ✅ resuelto | 🟡 | Botones de acción de pedidos sin protección contra doble-click (loading state) | src/components/orders/OrderActions.tsx |
| UX-02 | ✅ resuelto | 🟡 | Sin feedback de error de red al guardar configuración de tienda | src/app/dashboard/configuracion/page.tsx |
| UX-03 | ✅ resuelto | 🟢 | Sin contadores de límite visibles (5 imágenes, 3 reels) en formulario de producto | src/app/dashboard/productos/nuevo/page.tsx |
| UX-04 | ✅ resuelto | 🟢 | Campos de redes sociales sin validación de formato URL antes de guardar | src/app/dashboard/configuracion/page.tsx |
| UX-05 | ✅ resuelto | 🟢 | whatsappNumber sin formato internacional — botón de WhatsApp puede no funcionar | src/app/api/configuracion/route.ts:73 |
| MOB-01 | ✅ resuelto | 🟡 | Rate limiter de uploads tampoco funciona en mobile multi-tab por misma razón serverless | src/app/api/upload/route.ts |

---

## BLOQUE 7 — CÓDIGO DUPLICADO / DEUDA TÉCNICA

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| DUP-01 | ✅ resuelto | 🟢 | normalizeVariants() duplicada idéntica en route.ts y [id]/route.ts → mover a src/lib/products.ts | src/app/api/productos/ |
| DUP-02 | ✅ resuelto | 🟢 | Validaciones de precio/variantes/reels duplicadas en POST y PATCH → extraer a validateProductBody() | src/app/api/productos/ |
| DUP-03 | ✅ resuelto | 🟢 | Patrón getCurrentUser+findStore repetido inline en route.ts, getOwnerStoreId() solo existe en [id]/route.ts | src/app/api/productos/ |

---

## ORDEN DE EJECUCIÓN RECOMENDADO

### Sprint 1 — Críticos que afectan dinero y datos (hacer YA)
1. BUG-02 — Reserva de stock en checkout
2. BUG-01 — Auth + no-upsert en checkout
3. SEC-01 — Rate limit en validación de cupones
4. BUG-05 — upsert en getCurrentUser
5. BUG-06 — upsert en wallet al confirmar pedido

### Sprint 2 — Seguridad explotable
6. SEC-02 — Sanitizar pageBlocks
7. SEC-03 — Validar magic bytes en upload
8. SEC-04 — Validar URLs logo/banner
9. BUG-07 — State machine en pedidos
10. DATA-01 — beforeunload en editor de tienda

### Sprint 3 — Lógica de negocio
11. LOGIC-01 — Base de comisión sin envío
12. BUG-03 — Slug único atómico en registro
13. BUG-04 — Rate limiter con Redis/KV
14. DATA-02 — Upsert variantes en PATCH
15. LOGIC-02 + LOGIC-03 — Validar precios cruzados

### Sprint 4 — Rendimiento y UX
16. PERF-01 — Paginación en todos los listados
17. UX-01 — Loading state en acciones de pedido
18. DATA-03 — Cleanup robusto en registro
19. SEC-06 — Rol SELLER post-aprobación
20. PERF-02 + PERF-03 — Queries y double fetch

### Sprint 5 — Hardening y deuda técnica
21. SEC-05 — CSRF protection
22. SEC-07 — Rate limit en registro
23. SEC-08 — CSP headers
24. DUP-01 + DUP-02 + DUP-03 — Eliminar duplicados
25. Resto de BAJO/VERDE

---

## CONTADOR TOTAL
- 🔴 Críticos: 5 / 5 ✅
- 🟠 Altos: 12 / 12 ✅
- 🟡 Medios: 12 / 12 ✅
- 🟢 Bajos: 9 / 9 ✅
- **Total: 38 / 38 ✅ — TODOS RESUELTOS**
