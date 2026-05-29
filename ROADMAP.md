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
| A-01 | ✅ | 🔴 | `tipoTienda` y `tieneVentaMayorista` leídos desde DB en la página del storefront e inyectados en `StoreConfig`. Expuestos como `checkoutMode` e `isWholesale` en `useStorefront` y disponibles en los 4 templates |
| A-02 | ✅ | 🔴 | Formulario de producto adaptativo por `storeType`: los `extraFields` de cada tipo (Marca/Año/Km para AUTOS, Autor/Editorial para LIBROS, etc.) renderizan como campos propios con tipo correcto (`number`/`text`), placeholder contextual y sin edición de clave. Sección se llama "Ficha técnica" (AUTOS), "Especificaciones" (con extraFields) o "Atributos" (GENERAL). Atributos libres del usuario siguen funcionando abajo del grid |
| A-03 | ✅ | 🔴 | Carrito adaptado por tipo: `inquiry` (AUTOS) → botón "Consultar disponibilidad" en modal que pre-rellena y hace scroll al formulario de contacto. `cart` → flujo normal. Los 4 templates implementados |
| A-04 | ✅ | 🟠 | Templates mayorista: toggle `ocultarPreciosPublico` en el panel de configuración (solo visible cuando `tieneVentaMayorista`). Cuando activo: precios reemplazados por "Consultá precio" en tarjetas, modales y favoritos de los 4 templates; botón cambia a "Consultar disponibilidad" (flujo inquiry). Las vendedoras afiliadas siguen acreditadas. |
| A-05 | ✅ | 🟠 | Categorías por defecto según `storeType`: cuando una tienda no tiene productos cargados, los 4 templates muestran las categorías predeterminadas del tipo (ROPA→remeras/pantalones/vestidos..., AUTOS→autos/motos/camionetas..., etc.) usando `defaultCategories` del hook. |

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
| B-06 | ✅ | 🟠 | Para mayorista: warning en el carrito cuando la cantidad es menor a `cantMinMayorista`. Si alcanza el mínimo, precio cambia automáticamente a `precioMayorista`. Los 4 templates implementados |
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
| C-05 | ✅ | 🟡 | Drag & drop para reordenar las imágenes del producto — ya implementado en el formulario (thumbnails arrastrables con `draggable` + `onDrop`) |
| C-06 | ✅ | 🟡 | Preview en vivo del producto — ya implementado (panel lateral derecho en el formulario se actualiza en tiempo real mientras se completa) |

---

## BLOQUE D — MODAL DE PRODUCTO en el storefront (rediseño)

> El modal que ve el cliente al hacer click en un producto necesita ser completo.

| # | Estado | Impacto | Descripción |
|---|--------|---------|-------------|
| D-01 | ✅ | 🔴 | **Carrusel de imágenes** con flechas prev/next, contador "1/3" y miniaturas clickeables — implementado en el modal de FashionNoir |
| D-02 | ✅ | 🟠 | **Reels/videos** del producto en el modal — cards con plataforma detectada (Instagram, TikTok, YouTube) y link que abre en nueva pestaña |
| D-03 | ✅ | 🟠 | **Subcategoría** como breadcrumb en el modal: "Mujer › Vestidos" |
| D-04 | ✅ | 🟡 | Sección de **reseñas** en el modal — modelo `PublicReview` en schema, API pública `/api/public/[slug]/reviews` (GET + POST), formulario con nombre + estrellas + comentario, listado de reseñas existentes. Los 4 templates. Tabla requiere SQL en Supabase (ver notas). |
| D-05 | ✅ | 🟡 | Botón de compartir el producto — "Copiar link" (copia URL con `?p=productId` al clipboard + toast) + WhatsApp (abre wa.me con nombre + link). Auto-open desde URL: si la página carga con `?p=ID`, abre el modal de ese producto. Los 4 templates. |
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
| E-05 | ✅ | 🟠 | El editor permite activar/desactivar qué categorías mostrar como sección destacada: sección "Categorías destacadas" en el ConfigModal con checkboxes por categoría (cargadas desde la tienda real). Si no se selecciona ninguna, se muestran todas. Los 4 templates filtran `categoryList` por `featuredCategories`. |
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
