# ROADMAP — MEJORAS ESTRUCTURALES DE LA PLATAFORMA

> Creado: 2026-05-29 | Este archivo agrupa FEATURES y REDISEÑOS (no bugs).
> Workflow: 🔲 pendiente | 🔄 en progreso | ✅ hecho | ❌ descartado con justificación
> Última actualización: 2026-05-29

---

## LEYENDA DE IMPACTO
- 🔴 BLOQUEANTE — sin esto la plataforma no es usable comercialmente
- 🟠 ALTO — afecta conversión o experiencia central del cliente final
- 🟡 MEDIO — mejora importante pero workaround existe
- 🟢 BAJO — pulido y nice-to-have

---

## BLOQUE A — TIPOS DE TIENDA (base arquitectónica)

> El tipo de tienda elegido al registrarse (`ropa`, `autos`, `mayorista`, `servicios`, etc.)
> debe condicionar TODO: formulario de producto, carrito, templates, categorías por defecto.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| A-01 | 🔄 | 🔴 | Guardar `storeType` en DB al elegir tipo de tienda en onboarding. **DB ya tiene `tipoTienda` y `tieneVentaMayorista` en el modelo Store** — falta leerlo y usarlo en el formulario, carrito y templates |
| A-02 | 🔲 | 🔴 | Que el formulario de producto cambie según `storeType`: ropa→talles/colores, autos→año/km/combustible, servicios→duración/modalidad |
| A-03 | 🔲 | 🔴 | Que el carrito cambie según `storeType`: ropa→dirección+envío, autos→formulario de contacto/consulta, mayorista→lista de precios+cantidad mínima |
| A-04 | 🔲 | 🟠 | Templates de mayorista: sin precios visibles al público, mostrar "Consultá precio", formulario de pedido por volumen |
| A-05 | 🔲 | 🟠 | Categorías por defecto según `storeType`: ropa→Mujer/Hombre/Niños/Accesorios, autos→Sedán/SUV/Pickup, mayorista→Línea A/B/C |

---

## BLOQUE B — CARRITO (funcionalidad crítica incompleta)

> Hoy el carrito solo muestra productos y precio. Le faltan los campos operativos básicos.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| B-01 | ✅ | 🔴 | Campo de **dirección de envío** (calle, ciudad, provincia, CP) — ya implementado en el panel de checkout (se abre al presionar "Finalizar Compra") |
| B-02 | ✅ | 🔴 | Selector de **método de envío** — ya implementado con `ENVIO_OPTIONS` en el checkout (retiro, envío estándar, express) |
| B-03 | ✅ | 🔴 | Campo de **código de cupón** — ya implementado con validación y descuento en el checkout |
| B-04 | ✅ | 🟠 | Mostrar **datos de contacto del vendedor** en el panel del carrito (WhatsApp, email) para consultas antes de hacer checkout — link directo a WhatsApp en todos los templates si `whatsapp.enabled` |
| B-05 | ✅ | 🟠 | **Resumen de compra** con desglose subtotal + envío + cupón + total — ya implementado en el checkout |
| B-06 | 🔲 | 🟠 | Para mayorista: campo de **cantidad mínima por ítem** con warning si no se alcanza |
| B-07 | ✅ | 🟡 | **Carrito persistido en localStorage** — sobrevive refresh de página. Favoritos y datos del comprador también persisten si "Recordar mis datos" está activo |

---

## BLOQUE C — FORMULARIO DE PRODUCTO (rediseño)

> El formulario actual es básico y la UX de asignar imagen a color es confusa.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| C-01 | ✅ | 🔴 | UX imagen+color mejorada: thumbnails más grandes, select color con color de fondo cuando está asignado, banner de ayuda contextual, badge "PORTADA" en la primera imagen |
| C-02 | ✅ | 🟠 | Campo **Subcategoría** — ya implementado en el formulario y en la DB. El storefront y la página /productos también lo leen y filtran |
| C-03 | ✅ | 🟠 | **Reels/Videos** editables directamente desde el formulario de producto (URLs de Instagram, TikTok, YouTube Shorts) — el campo ya existía en DB (`reelUrls`) pero solo se podía editar desde un modal separado |
| C-04 | ✅ | 🟠 | El campo **Categoría principal** usa la lista de categorías reales de la tienda (dinámico) — cargadas desde `/api/productos` en el `useEffect` inicial |
| C-05 | 🔲 | 🟡 | Drag & drop para reordenar las imágenes del producto |
| C-06 | 🔲 | 🟡 | Preview en vivo del producto mientras se completa el formulario (panel lateral) |

---

## BLOQUE D — MODAL DE PRODUCTO en el storefront (rediseño)

> El modal que ve el cliente al hacer click en un producto necesita ser completo.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| D-01 | ✅ | 🔴 | **Carrusel de imágenes** con flechas prev/next, contador "1/3" y miniaturas clickeables — implementado en el modal de FashionNoir |
| D-02 | ✅ | 🟠 | **Reels/videos** del producto en el modal — cards con plataforma detectada (Instagram, TikTok, YouTube) y link que abre en nueva pestaña |
| D-03 | ✅ | 🟠 | **Subcategoría** como breadcrumb en el modal: "Mujer › Vestidos" |
| D-04 | 🔲 | 🟡 | Sección de **reseñas** al pie del modal (estrellas + comentarios) |
| D-05 | 🔲 | 🟡 | Botón de compartir el producto (link directo + WhatsApp) |
| D-06 | ✅ | 🟡 | **Stock por variante** en el modal — "¡Últimas N unidades!" cuando ≤5, "Sin stock" deshabilita el botón de compra |

---

## BLOQUE E — TEMPLATES (categorías dinámicas + escalabilidad)

> Hoy las secciones de los templates (Hombres/Mujeres/Accesorios) están hardcodeadas.
> Con 100+ productos el template collapsa porque no tiene paginación ni filtros.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| E-01 | ✅ | 🔴 | **Categorías dinámicas** — FashionNoir ya deriva las categorías desde los productos con `useMemo`, sin hardcoding. El navbar y los filtros de la sección productos son 100% dinámicos |
| E-02 | ✅ | 🔴 | **Página completa `/tienda/[slug]/productos`** creada con paginación de 24 por página. El template muestra 8 + botón "Ver toda la colección →" que lleva a esa página |
| E-03 | ✅ | 🔴 | **Buscador** — existe en FashionNoir (overlay con resultados en grilla). La página `/productos` tiene búsqueda inline con filtro en tiempo real |
| E-04 | ✅ | 🟠 | **Dropdown de subcategorías** implementado en FashionNoir y en la página `/productos`. Aparece al hover sobre cada categoría si tiene subcategorías cargadas |
| E-05 | 🔲 | 🟠 | El editor debe permitir activar/desactivar qué categorías mostrar como sección destacada |
| E-06 | 🔲 | 🟠 | Templates adaptativos para mayorista: ocultar precios al público, mostrar "Solicitá tu lista de precios" |
| E-07 | ✅ | 🟡 | **Ordenamiento** en la página /productos: más recientes, precio ↑↓, nombre A→Z, mayor descuento |

---

## BLOQUE F — PANEL DEL DUEÑO / DASHBOARD (mejoras)

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| F-01 | ✅ | 🟠 | Búsqueda + filtros por categoría, estado y stock en la tabla del dashboard |
| F-02 | ✅ | 🟠 | **Paginación** de 20 por página con navegación numerada en la tabla del dashboard |
| F-03 | ✅ | 🟡 | **Vista grilla/tarjetas** — toggle tabla↔grilla en el panel de productos |
| F-04 | 🔲 | 🟡 | **Importar productos** en bloque via CSV |
| F-05 | ✅ | 🟡 | **Duplicar producto** con un click — crea copia en estado Oculto con nombre "Copia de..." |

---

## ORDEN DE EJECUCIÓN SUGERIDO

```
FASE 1 — Base (desbloquea todo lo demás)
  A-01 → guardar storeType en DB
  A-02 → formulario de producto adaptativo por storeType
  C-01 → rediseñar UX imagen+color
  C-02 → agregar subcategoría

FASE 2 — Carrito funcional
  B-01 → dirección de envío
  B-02 → método de envío
  B-03 → código de cupón
  B-05 → resumen de compra

FASE 3 — Storefront completo
  D-01 → carrusel de imágenes en modal
  E-01 → categorías dinámicas en templates
  E-02 → paginación en templates
  E-03 → buscador en storefront

FASE 4 — Mayorista y avanzado
  A-04, A-05, B-06, E-06 → todo lo de mayorista
  D-02, D-03 → video y subcategoría en modal
  E-04, E-07 → filtros y ordenamiento
```

---

> Última actualización: 2026-05-29
