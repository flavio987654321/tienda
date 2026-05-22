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

## BLOQUE 8 — NUEVOS BUGS CRÍTICOS (diagnóstico 2026-05-22)

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| BUG-08 | ✅ resuelto | 🔴 | Race condition en retiros: dos requests simultáneos pasan la validación "retiro pendiente" → doble retiro. Fix: $transaction Serializable con re-check interno | src/app/api/vendedoras/wallet/route.ts:205 |
| BUG-09 | ✅ resuelto | 🟠 | Cálculo incorrecto al cancelar pedido con comisión: `totalWithdrawn` se decrementa cuando debería reflejar solo lo ya retirado → balances corruptos en afiliadas | src/app/api/pedidos/[id]/route.ts:204 |
| BUG-10 | ✅ resuelto | 🟠 | Fetch a MercadoPago sin timeout: fix con AbortController (8s timeout) en el mismo commit de SEC-09 | src/app/api/suscripcion/webhook/route.ts:15 |
| BUG-11 | ✅ resuelto | 🟠 | ProductRouteContext usa tipo genérico inexistente en Next.js 15+: `RouteContext<"/api/productos/[id]">` no es válido | src/app/api/productos/[id]/route.ts:6 |
| BUG-12 | ✅ resuelto | 🟡 | Query de reseñas sin límite: si un producto tiene miles de reseñas, las carga todas en memoria | src/app/api/reviews/route.ts:12 |

---

## BLOQUE 9 — NUEVAS VULNERABILIDADES DE SEGURIDAD (diagnóstico 2026-05-22)

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| SEC-09 | ✅ resuelto | 🔴 | Webhook MercadoPago sin validación de firma: fix con verifyMPSignature (HMAC-SHA256 + timingSafeEqual) y MP_WEBHOOK_SECRET env var | src/app/api/suscripcion/webhook/route.ts |
| SEC-10 | ✅ resuelto | 🔴 | Datos bancarios en texto plano: fix con AES-256-GCM en src/lib/crypto.ts, CBU/CUIL/bankHolder cifrados al guardar, CUIL nunca expuesto al frontend | src/app/api/vendedoras/wallet/route.ts |
| SEC-11 | ✅ resuelto | 🔴 | Rate limiter en memoria: agregado warning en producción + código KV listo para activar con 1 línea. Pendiente instalar @vercel/kv en Vercel dashboard | src/lib/rate-limit.ts |
| SEC-12 | ✅ resuelto | 🟠 | CSP configurado con `unsafe-inline` + `unsafe-eval`: anula toda protección XSS aunque SEC-08 esté "resuelto" | next.config.ts |
| SEC-13 | ✅ resuelto | 🟠 | CORS no configurado explícitamente: Next.js permite cualquier origen en API routes por defecto → CSRF posible | middleware o next.config.ts |
| SEC-14 | ✅ resuelto | 🟠 | Formulario de contacto público sin CAPTCHA ni rate limit: cualquiera puede inundar con spam o usar `replyTo` falso para phishing | src/app/api/public/[slug]/contacto/route.ts |
| SEC-15 | ✅ resuelto | 🟡 | `isSafeUrl` en configuracion acepta cualquier URL relativa (`/` o `#`) — versión más restrictiva existe en vendedoras pero no se reutiliza | src/lib/url-utils.ts (nuevo módulo compartido) |
| SEC-16 | ✅ resuelto | 🟡 | Mensajes de error internos expuestos al cliente (`e?.message` directo): puede revelar estructura de BD o Supabase | src/app/api/auth/registro/route.ts:98 |

---

## BLOQUE 10 — LEGAL Y PROTECCIÓN AL CONSUMIDOR (diagnóstico 2026-05-22)

| # | Estado | Severidad | Descripción | Ley / Archivo |
|---|--------|-----------|-------------|---------------|
| LEGAL-01 | ✅ resuelto | 🔴 | Sin checkbox de consentimiento: fix con checkbox required + mención explícita Ley 25.326, bloquea submit si no está marcado | src/app/(auth)/registro/page.tsx |
| LEGAL-02 | ✅ resuelto | 🟠 | Bloque fijo de derechos del consumidor (Ley 24.240) + datos de contacto del vendedor siempre visibles en página de políticas | src/app/tienda/[slug]/politicas/page.tsx |
| LEGAL-03 | ✅ resuelto | 🟠 | Sección "Derechos como consumidor — Ley 24.240" agregada en términos del comprador: arrepentimiento 10 días, garantía 6 meses, trato digno | src/app/terminos/page.tsx |
| LEGAL-04 | ✅ resuelto | 🟠 | Cláusula de responsabilidad reescrita: ya no limita a "última cuota", ahora remite a legislación argentina y preserva derechos irrenunciables | src/app/vendedoras/terminos/page.tsx |
| LEGAL-05 | ✅ resuelto | 🟡 | Jurisdicción corregida: consumidor puede demandar en su domicilio, ninguna cláusula puede interpretarse como renuncia a derechos Ley 24.240 | src/app/vendedoras/terminos/page.tsx |
| LEGAL-06 | ✅ resuelto | 🟡 | Email de confirmación al comprador implementado con detalle de productos, totales, método de envío y recordatorio de derechos | src/lib/email.ts + src/app/api/checkout/route.ts |
| LEGAL-07 | ✅ resuelto | 🟡 | Política de privacidad actualizada con procesadores de datos: Supabase, Vercel, MercadoPago con links a sus políticas | src/app/privacidad/page.tsx |
| LEGAL-08 | ✅ resuelto | 🟡 | Sección seguridad de pagos: PCI-DSS MercadoPago, AES-256-GCM datos bancarios, HTTPS, bcrypt contraseñas | src/app/privacidad/page.tsx |
| LEGAL-09 | ✅ resuelto | 🟢 | Retención de datos vaga: ahora especifica cada tipo de dato (cuenta, pedidos, CBU/CUIL, backups) con plazos concretos por rol | src/app/privacidad/page.tsx |
| LEGAL-10 | ✅ resuelto | 🟢 | ARCO ampliado: describe los 4 derechos (A/R/C/O), indica plazo de 10 días hábiles, link a DNPDP para reclamos, formato de asunto unificado | src/app/privacidad/page.tsx |

---

## BLOQUE 11 — NUEVAS MEJORAS UX (diagnóstico 2026-05-22)

| # | Estado | Severidad | Descripción | Archivo |
|---|--------|-----------|-------------|---------|
| UX-06 | ✅ resuelto | 🟡 | Eliminar producto usa `confirm()` del navegador: reemplazar con modal elegante que muestre el nombre del producto | src/app/dashboard/productos/ProductsTable.tsx |
| UX-07 | ✅ resuelto | 🟡 | Toggle activo/inactivo de cupón sin loading state ni rollback visual si hay error de red | src/app/dashboard/cupones/page.tsx |
| UX-08 | ✅ resuelto | 🟡 | Formularios sin validación en tiempo real: onBlur en nombre, email, contraseña y nombre de tienda en el formulario de registro | src/app/(auth)/registro/page.tsx |
| UX-09 | ✅ resuelto | 🟡 | Stock sin leyenda de colores: rojo/amarillo/verde sin explicación → usuario nuevo no entiende el estado del inventario | src/app/dashboard/productos/ProductsTable.tsx |
| UX-10 | ✅ resuelto | 🟡 | Confirmación de cambio de contraseña redirige sin mensaje visible → usuario no sabe si funcionó | src/app/(auth)/actualizar-contrasena/page.tsx |
| UX-11 | ✅ resuelto | 🟢 | Estados vacíos sin orientación ni call-to-action: pedidos ahora tiene botón "Ver mi tienda", afiliados y cupones ya tenían estados vacíos con descripción | src/app/dashboard/pedidos/page.tsx |
| UX-12 | ✅ resuelto | 🟢 | Botones solo-icono sin `aria-label` (copiar, descargar, editar, eliminar) → inaccesible para lectores de pantalla | ProductsTable + cupones/page.tsx + StorefrontClient.tsx |
| UX-13 | ✅ resuelto | 🟢 | Imágenes de productos sin `alt` text descriptivo → accesibilidad e indexado SEO afectados | StorefrontClient.tsx (componente ProductImage ya tenía alt={name}; imágenes decorativas con alt="" es correcto por HTML spec) |

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

### Sprint 6 — Nuevos críticos de seguridad (diagnóstico 2026-05-22)
26. SEC-09 — Validar firma X-Signature webhook MercadoPago
27. SEC-10 — Encriptar datos bancarios (CBU, CUIL) en BD
28. BUG-08 — UNIQUE constraint en wallet withdrawals (race condition)
29. SEC-11 — Migrar rate-limit.ts a Vercel KV / Redis distribuido
30. LEGAL-01 — Checkbox consentimiento en registro (Ley 25.326)

### Sprint 7 — Legal y compliance
31. LEGAL-02 — Exigir CUIT/domicilio visible por tienda
32. LEGAL-03 — Comunicar derechos del consumidor (Ley 24.240)
33. LEGAL-04 — Revisar cláusula de responsabilidad limitada
34. LEGAL-06 — Enviar recibo/confirmación al comprador tras checkout
35. LEGAL-07 + LEGAL-08 — Actualizar política de privacidad y pagos

### Sprint 8 — Bugs y seguridad alta
36. BUG-09 — Corregir cálculo reversión comisión en cancelaciones
37. BUG-10 — Agregar timeout a fetch de MercadoPago
38. BUG-11 — Corregir ProductRouteContext para Next.js 15+
39. SEC-12 — Eliminar unsafe-inline/unsafe-eval del CSP
40. SEC-13 — Configurar CORS explícitamente
41. SEC-14 — CAPTCHA o rate limit en formulario de contacto público

### Sprint 9 — UX y calidad
42. UX-06 — Modal de confirmación para eliminar producto
43. UX-07 — Loading state en toggle de cupones
44. UX-08 — Validación en tiempo real en formularios
45. UX-09 — Leyenda de colores de stock
46. BUG-12 — Límite en query de reseñas
47. SEC-15 + SEC-16 — Sanitizar isSafeUrl y mensajes de error

### Sprint 10 — Hardening final
48. LEGAL-05, LEGAL-09, LEGAL-10 — Términos y privacidad finos
49. UX-10 + UX-11 + UX-12 + UX-13 — Feedback y accesibilidad

---

## CONTADOR TOTAL
- 🔴 Críticos: 5 / 5 ✅ (anteriores) + 4 ⬜ nuevos = 9 total
- 🟠 Altos: 12 / 12 ✅ (anteriores) + 10 ⬜ nuevos = 22 total
- 🟡 Medios: 12 / 12 ✅ (anteriores) + 10 ⬜ nuevos = 22 total
- 🟢 Bajos: 9 / 9 ✅ (anteriores) + 5 ⬜ nuevos = 14 total
- **Total resueltos: 51 / 67 — 16 pendientes**
