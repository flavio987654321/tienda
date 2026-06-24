# PLAN — TEMPLATES NUEVOS POR RUBRO

> Creado: 2026-06-23 | Workflow: 🔲 pendiente | 🔄 en progreso | ✅ hecho | ❌ descartado con justificación
> Objetivo: definir y desarrollar templates dedicados para los rubros que hoy están "próximamente"
> (TECH, HOGAR, ALIMENTOS, BELLEZA, DEPORTE, MASCOTAS, LIBROS, GENERAL), empezando por unificar
> electrodomésticos + tecnología + hogar en un solo rubro bien pensado.

---

## MARCO DE ANÁLISIS — qué hay que decidir por cada rubro nuevo

Antes de diseñar un template visual, cada rubro nuevo necesita estas decisiones (afectan
dashboard, formulario de producto y storefront, no solo el diseño):

| Eje | Opciones | Dónde impacta |
|---|---|---|
| `checkoutMode` | `cart` (pedidos reales) vs `inquiry` (consultas/leads) | Dashboard muestra "Pedidos" o "Consultas"; botón del storefront |
| `hideVariants` | sí/no | Si se muestra sistema de variantes+stock o "ficha técnica" (como AUTOS) |
| `hideTags` / `hideGender` | sí/no | Toggles menores de UI en el form de producto |
| `supportsWholesale` | sí/no | Si existe precio mayorista |
| `supportsCondicion` | sí/no + opciones | Selector de condición (0km, usado, como nuevo, etc.) |
| `extraFields` | lista de campos tipados | **Son globales para todo el rubro, no cambian por categoría** — solo tiene sentido tipar campos universales (Marca, Modelo, Garantía); lo específico de cada categoría (litros, almacenamiento, dimensiones) queda como atributo libre que carga el dueño |
| categorías/subcategorías | taxonomía del catálogo | Categorías del form, filtros del storefront |
| cantidad de templates visuales | 1, 2, 4... | Cuántos "looks" distintos para el mismo rubro (ROPA tiene 4, AUTOS tiene 2) |

---

## RUBRO 1 — "Hogar y Tecnología" 🏠 (Electro + Tecnología + Hogar unificado)

> ✅ IMPLEMENTADO (2026-06-24): migración de base de datos, formulario de producto, listado con
> filtro dinámico, página de detalle de producto, y los 4 templates (Electro Prime, Tech Nova,
> Home Studio, Casa Clara) ya están construidos, conectados al dashboard, y el build de producción
> compila sin errores. Quedan 2 detalles menores sin implementar (no bloquean el uso del rubro):
> - 🔲 Toggle on/off del filtro dinámico de specs (hoy siempre está activo, se autolimita a mostrar
>   solo atributos con más de un valor — funciona bien así, el toggle era un "nice to have")
> - 🔲 Toggle on/off de la franja de sellos de confianza (hoy siempre visible en los 4 templates)
> - 🔲 Fase 5 (envío real con Envíopack) sigue pendiente — necesita que se gestione la cuenta de
>   Envíopack antes de poder integrarla de verdad (ver sección de esa feature más abajo)
>
> Próximo paso: avanzar al Rubro 2 (ALIMENTOS) cuando el usuario lo indique, o pulir detalles de
> Rubro 1 si surgen ajustes al probarlo en vivo.

> Decisión tomada: en lugar de tratar TECH y HOGAR como rubros separados (como están hoy en
> `storeTypes.ts`, con "electrodomésticos" enterrado como subcategoría de "cocina"), se unifican
> en un solo tipo de tienda porque así operan los negocios reales (una casa de electro vende
> heladeras, TVs, y a veces celulares y muebles, todo en el mismo local/catálogo).
>
> ⚠️ IMPORTANTE: esto es **UN SOLO rubro seleccionable**, no tres. Electrodomésticos + Tecnología +
> Muebles/Hogar quedan agrupados bajo UN único `StoreType` con un único nombre. Cuando el dueño
> elige el tipo de tienda al registrarse, ve UNA sola opción llamada **"Hogar y Tecnología"** 🏠,
> no tres botones separados. Las categorías/subcategorías de los tres mundos conviven dentro de ese
> mismo rubro (ver punto #5 de la tabla de abajo).

### Decisiones de negocio

| # | Pregunta | Estado | Decisión |
|---|----------|--------|----------|
| 1 | `checkoutMode`: ¿cart o inquiry? | ✅ | `cart` — MP ya maneja cuotas con tarjeta. Además, mostrar botón secundario de WhatsApp/Consultar en el template para productos caros (no son excluyentes, referencia: Aloise.com.ar tiene "Añadir al carrito" + WhatsApp flotante a la vez) |
| 2 | `hideVariants`: ¿se muestra stock/variantes normal? | ✅ | `false` — igual que ROPA/TECH, no como AUTOS. **Corrección durante implementación**: el carrito de toda la plataforma (`CartItem`/`resolveVariantId`) solo soporta 2 dimensiones de variante, no N. Ningún rubro tiene hoy un selector para elegir qué dimensiones usar por producto — siempre son 2 fijas por tipo de tienda (ROPA=Talle+Color, AUTOS=Color+Versión). Se descartó el refactor de carrito (afecta ROPA/AUTOS en producción) y se fijaron las dimensiones de Hogar y Tecnología en **`Color` + `Tamaño`** (las más aplicables a todo el rubro). Lo específico de cada categoría (Almacenamiento, RAM, Material) queda como atributo libre, no como variante con stock propio |
| 3 | `supportsWholesale`: ¿venden por mayor? | ✅ | Sí |
| 4 | `supportsCondicion`: ¿hay productos usados/reacondicionados? | ✅ | Sí — opciones: "Nuevo", "Usado", "Reacondicionado" |
| 5 | Categorías/subcategorías unificadas | ✅ | Ver detalle abajo (inspirado en Aloise.com.ar pero recortado — sin herramientas/salud, que pisan otros rubros como DEPORTE/BELLEZA) |
| 6 | `extraFields` tipados (universales) | ✅ | `Marca`, `Modelo`, `Garantía` — solo lo que aplica a cualquier producto del rubro. Lo específico de cada categoría (litros, almacenamiento, dimensiones) queda como atributo libre que carga el dueño |
| 7 | Cantidad de templates visuales para este rubro | ✅ | 4 templates, todos de **fondo claro** (ninguno oscuro, a diferencia de Fashion Noir/Auto Motor que sí lo son): **Electro Prime** (claro, azul/naranja vivos, sellos de confianza grandes), **Tech Nova** (claro, acentos celeste/violeta, grillas de specs), **Home Studio** (cálido, tonos neutros/terracota, foto de ambiente), **Casa Clara** (blanco, minimalista, editorial) |

### Notas de la conversación
- En ROPA hay "Pedidos" en el dashboard; en AUTOS no, porque es `inquiry`.
- Stock funciona distinto: AUTOS usa fichas técnicas sin variantes; ROPA usa variantes con stock por talle/color.
- Hay que pensar paso a paso: qué se muestra en cada template, a dónde lleva cada botón, cómo se sube cada producto por el formulario, qué campos hace falta.
- Referencia real: **Aloise.com.ar** (casa de electro grande). Tiene:
  - Listado con filtro lateral por Marca + orden por precio (bajo a alto) → feature nueva a construir, no existe hoy en los templates.
  - Click en producto abre página de detalle aparte (no modal) con precio, cuotas MP/MODO, specs en lista + tabla de especificaciones, productos similares.
  - "Cotizá tu envío" por código postal en tiempo real → hoy el proyecto solo tiene métodos de envío fijos manuales (`ShippingMethod`: retiro/estándar/nacional con precio fijo o "a coordinar"). Para igualar esto hace falta o (a) integrar API real de un correo (Andreani/Correo Argentino/OCA, requiere cuenta comercial del dueño + peso/dimensiones por producto) o (b) una tabla simple por provincia configurable por el dueño sin API externa. 🔲 Pendiente decidir cuál.

### Categorías/subcategorías unificadas (confirmado)
> Inspirado en la estructura real de Aloise.com.ar (investigado vía WebFetch), recortando lo que
> pisa otros rubros de la plataforma (herramientas, salud/cuidado personal, bicicletas/fitness —
> ya cubiertos por DEPORTE/BELLEZA).

| Categoría | Subcategorías |
|---|---|
| **electrodomesticos** | climatizacion (aires, calefactores, ventiladores), refrigeracion (heladeras, freezers), agua-caliente (termotanques, calefones), cocina (cocinas, microondas, hornos, anafes), lavado-y-secado (lavarropas, lavavajillas), repuestos-y-accesorios |
| **pequenos-electrodomesticos** | desayuno (cafeteras, tostadoras, pavas), ayudantes-de-cocina (licuadoras, batidoras, procesadoras), limpieza (planchas, aspiradoras), repuestos-y-accesorios |
| **celulares-y-accesorios** | smartphones, fundas, cargadores, auriculares-celular, repuestos |
| **informatica-y-gaming** | PC, notebooks, impresoras, monitores, periféricos, consolas, videojuegos, accesorios-gaming |
| **audio-imagen-y-video** | TVs, cámaras, parlantes, auriculares, soundbars, accesorios |
| **muebles-y-colchones** | mesas, sillas, sillones, escritorios, estantes, colchones, sommiers |
| **casa-y-jardin** | cuadros, lámparas, espejos, plantas deco, muebles de jardín, herramientas de jardín |

> Nota: se sacó "Accesorios" como categoría genérica (a diferencia de la propuesta inicial) y se
> repartió dentro de cada departamento, siguiendo el patrón real de Cetrogar.com.ar
> (`tecnologia > celulares-y-accesorios > celulares`): los accesorios de celular van con celulares,
> los de electro van con electrodomésticos, etc. Por eso "Tecnología" se separó en 3 categorías
> propias (celulares-y-accesorios, informatica-y-gaming, audio-imagen-y-video) en vez de una sola.

### Referencia adicional: Sampietro.com.ar (investigado vía WebFetch)
> Mismo modelo de negocio que estamos diseñando (electro + tech + muebles + casa, multi-sucursal).
> Confirma la estructura de categorías elegida. Aporta:
> - "Colchones y Sommiers" (sumado dentro de muebles-y-colchones)
> - "Casa y Jardín" como nombre más amplio que "Decoración e iluminación" (sumado)
> - Patrones UX para los templates: banners promocionales rotativos en home, galería de categorías
>   destacadas con accesos rápidos por ícono, sellos de confianza ("Retirá gratis en sucursal",
>   "Pagá con crédito/débito", tarjeta propia, newsletter)

### Principio de diseño confirmado: pensado para tienda chica, no cadena grande
> Las referencias investigadas (Aloise, Sampietro, Cetrogar) son cadenas grandes con miles de
> productos. El vendedor real de TiendaApps es la tienda de barrio (casa de electro o de
> celulares chica, ~20-200 productos). Las categorías/variantes/mayorista definidas son
> OPCIONALES por tienda (igual que en ROPA, donde nadie usa las 12 categorías a la vez) y el
> envío con Envíopack ya está pensado para que la tienda chica no necesite contrato propio con
> un correo. Pero el DISEÑO VISUAL de los templates tiene que adaptarse al tamaño real del
> catálogo: no copiar literal la complejidad de una cadena grande (ej: sidebar de filtro de marca
> con scroll de 20 marcas, varios carruseles de banners). Ejemplo de regla concreta: mostrar el
> filtro de marca solo si hay más de una marca cargada en el catálogo, no como elemento fijo.

### Filtro lateral del listado: debe ser dinámico, no hardcodeado
> Referencia real (Cetrogar.com.ar, vía captura del usuario): en su listado de **celulares**
> aparece el filtro "Tecnología Inverter" — un campo que pertenece a heladeras, no a celulares.
> Es la prueba de que filtros fijos por rubro (no por lo que realmente cargó cada tienda) generan
> ruido sin sentido. Por eso el filtro lateral de los templates nuevos se arma **dinámicamente**:
> se muestran solo los atributos que existen de verdad en los productos de esa categoría para esa
> tienda puntual (si nadie cargó "RAM", no aparece el filtro "RAM"). Marca + Precio (orden
> ascendente/descendente) sí son fijos porque son universales y siempre tienen sentido.

### Pendiente de decidir
- (resuelto arriba) Filtro por marca + orden por precio: sí, fijos. El resto de filtros (specs) se generan dinámicamente según atributos cargados, no hardcodeados.

### Página de detalle de producto: propia, no modal
> Decisión tomada: a diferencia de ROPA (que usa un modal con `selectedSize`/`selectedColor` para
> el detalle), "Hogar y Tecnología" usa **página propia por producto** (ej:
> `/tienda/[slug]/producto/[id-slug]`). Mejor SEO (indexable, cada producto con su URL), mejor
> para usar como landing de campañas de Ads/redes — así operan Aloise, Sampietro y Cetrogar.
> Es desarrollo nuevo (hoy esa ruta no existe). 🔲 Pendiente de desarrollar.

### Estructura de HOME — bloques observados en las 3 referencias reales
> Aloise, Sampietro y Cetrogar (investigados con WebFetch + capturas del usuario) comparten este
> patrón de home, más detallado que el de ROPA/AUTOS hoy:

| Bloque | Descripción | ¿Ya existe en la plataforma? |
|---|---|---|
| Barra de promo | Línea fina arriba con contacto/ayuda/sucursales | No — nuevo |
| Header | Logo + buscador + carrito | Sí (variante simple) |
| Nav de categorías | Mega-menú en cascada al pasar el mouse (Sampietro) o panel lateral (Cetrogar) | No — nuevo |
| Hero / banner carousel | Rotador de promos (cuotas sin interés, campañas temáticas) | Parcial (hero simple sí, carousel solo en Chic Paris) |
| Sellos de confianza | Tarjetas aceptadas, retiro gratis en sucursal, contacto, tarjeta propia | No — nuevo |
| Categorías destacadas (íconos) | Grilla de accesos rápidos por categoría con imagen | Similar a `categorias` de ROPA, adaptar |
| Carruseles temáticos de productos | Bloques con título propio (ej: "Precios increíbles", promo de turno) | No — nuevo (hoy es una sola grilla de "productos") |
| Banners que llevan a categorías | 2-3 banners grandes linkeando a secciones (ej: "Descanso", "Tecnología") | No — nuevo |
| Newsletter | Suscripción por email | No — nuevo |
| Footer | Categorías, ayuda, la empresa, redes | Sí (variante simple) |

### Pendiente de decidir
- 🔲 Cuántos de estos bloques nuevos (mega-menú, carruseles temáticos, banners de categoría, newsletter) se construyen en la primera versión de los 4 templates vs. cuáles se simplifican para no sobrecargar a una tienda chica (ver principio de diseño ya confirmado arriba)

### Diseño visual de los 4 templates (confirmado)

> Ninguno de los 4 es oscuro (a diferencia de Fashion Noir/Auto Motor que sí lo son hoy). Cada
> bloque tiene un layout distinto en cada template, no solo cambia la paleta de color — mismo
> principio que ya usan los templates actuales (ej: hero de BohoTerra es split izq/der, hero de
> FashionNoir es full-bleed centrado).

| Bloque | Electro Prime | Tech Nova | Home Studio | Casa Clara |
|---|---|---|---|---|
| Hero | Carrusel de banners rotativo con oferta + cuotas superpuestas | Split: texto a la izquierda, producto destacado flotando a la derecha | Imagen grande de ambiente con texto centrado abajo | Minimalista: mucho blanco, un producto centrado |
| Departamentos | Fila de íconos circulares con scroll horizontal | Tarjetas grandes con imagen de fondo en grid 3x2, hover | Mosaico tipo collage, tamaños desiguales | Lista simple en una fila con líneas finas, editorial |
| Confianza/sellos | Franja horizontal con íconos + texto en línea | Tarjetas con ícono grande y borde, en grid | Texto simple en una línea elegante, sin íconos pesados | Minimal, texto chico al pie del hero |
| Productos | Grid con badges de cuotas/descuento bien grandes y de color | Grid con specs comparables que aparecen al hover | Grid espaciado, fotos grandes estilo revista | Grid limpio, mucho espacio en blanco, precio chico |
| Nosotros | Foto del local físico + años de trayectoria | Lista de beneficios con íconos | Imagen de ambiente + texto narrativo cálido | Texto centrado simple, sin imagen grande |
| Contacto | Formulario + mapa + WhatsApp grande | Split con redes sociales destacadas | Formulario con fondo de imagen cálida | Minimal: solo datos + botón WhatsApp |

### Configuración avanzada (panel del dueño)
> Ya es un modal compartido entre todos los templates (color de acento, WhatsApp, barra de
> promoción son genéricos). El código ya soporta secciones condicionales por template (ej: "Color
> de barra de navegación" solo aparece si `template === "auto-motor" || "auto-drive"`). Para los 4
> templates nuevos se agregan, con ese mismo patrón condicional:
> - Color del header/nav (como ya tienen los templates de AUTOS)
> - On/off del filtro dinámico de specs en el listado de productos
> - On/off de la franja de sellos de confianza (cuotas, garantía, retiro en local)

### Auditoría de huecos (agente, vía Agent tool) — TODOS RESUELTOS

**Diseño/UX**
- ✅ **Editor de bloques**: orden FIJO por template (como hoy), cada bloque nuevo (carrusel
  temático, banner de categoría, sellos de confianza, newsletter) tiene un toggle on/off + su
  contenido editable vía `EditableZone`/`EditableImageButton`, mismo patrón que ya usa
  `promoBanner.enabled` hoy. Se descartó un builder drag & drop (mucho mayor alcance, no hace
  falta para esta tanda).
- ✅ **Layouts densos con catálogo chico**: mismo principio que el filtro de marca condicional —
  si un bloque (carrusel temático, grid 3x2, mosaico) no tiene suficientes productos/imágenes para
  verse bien, se oculta automáticamente en vez de mostrarse vacío o a medias.
- ✅ **Migración de `storeTypes.ts`**: se eliminan las entradas `TECH` y `HOGAR` (ambas
  `comingSoon: true`, sin tiendas usándolas todavía) y se crea `HOGAR_TECH` con
  `comingSoon: false`, label "Hogar y Tecnología" 🏠, con las categorías/extraFields/variantes ya
  definidas en este documento.

**Funcionalidad**
- ✅ **Atributos libres sin indexar**: se acepta la limitación para esta v1 (filtrado en memoria
  anda bien con 20-200 productos por tienda). Si una tienda crece mucho más, se revisa con
  indexación real más adelante — no bloquea el desarrollo actual.
- ✅ **Stock bajo en productos usados/únicos**: no requiere desarrollo nuevo. El campo
  `lowStockThreshold` ya existe por variante (`ProductVariant.lowStockThreshold`); el dueño lo deja
  vacío/0 para no recibir alertas en una unidad única usada.

**Herramientas/integraciones**
- ✅ **Modelo `Shipment` nuevo en Prisma** (relación 1 a 1 con `Order`):
  ```
  model Shipment {
    id           String   @id @default(cuid())
    orderId      String   @unique
    order        Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
    provider     String   @default("enviopack")
    externalId   String?
    status       String   @default("PENDING") // PENDING | LABEL_GENERATED | IN_TRANSIT | DELIVERED | FAILED
    carrier      String?  // andreani | correo-argentino | oca
    trackingCode String?
    trackingUrl  String?
    labelUrl     String?
    cost         Float?
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
  }
  ```
- ✅ **Peso/Dimensiones**: 4 columnas tipadas nuevas en `Product` (opcionales, universales para
  todos los rubros): `weightKg`, `widthCm`, `heightCm`, `depthCm`.
- ✅ Verificado: el checkout de MP hoy NO restringe cuotas (`installments` no seteado en la
  Preference) — funciona automático sin desarrollo nuevo. Pero el COPY de los templates no debe
  prometer un número fijo de cuotas ("12 cuotas sin interés"), porque depende de un acuerdo del
  vendedor directamente con MP, no de algo que controlemos. Usar copy genérico ("Pagá en cuotas
  con tarjeta") en vez de un número fijo, salvo que el dueño lo confirme en su config.
- ✅ Webhook de Envíopack: al implementarse, validar firma/origen según la documentación de
  Envíopack para webhooks (confirmar formato exacto al momento de desarrollar).

**Seguridad**
- ✅ Aplicar `checkRateLimit` (patrón ya usado en `/api/vendedoras` y `/api/auth/registro`) a los
  endpoints nuevos: cotizar envío, generar etiqueta, webhook de tracking.
- ✅ La página de detalle de producto nueva debe validar `storeId` + `isActive` + `deletedAt` al
  resolver el producto — mismo patrón del bug IDOR ya corregido antes en cupones (G-02 de la
  auditoría de panel).

---

## FEATURE DE PLATAFORMA — Envío por código postal + integración con correos

> No es exclusivo de un rubro: afecta el formulario de producto de TODA la plataforma y el
> checkout/seguimiento de TODOS los pedidos, no solo Electro/Hogar/Tech. Se separa del plan de
> templates porque es un desarrollo de logística aparte.

### Decisiones tomadas
| # | Pregunta | Estado | Decisión |
|---|----------|--------|----------|
| 1 | ¿Proveedor de envío? | ✅ | **Envíopack** (agregador argentino: integra Andreani, Correo Argentino, OCA, etc. bajo una sola API/cuenta). Se descartó MiCorreo directo (sería solo Correo Argentino) y se corrigió que "Mienvío" es mexicano, no aplica en Argentina |
| 2 | ¿Peso/dimensiones por producto? | ✅ | Sí, se agrega **Peso (kg) y Dimensiones (alto x ancho x profundidad cm)** como campo universal en el formulario de producto de TODOS los rubros (no solo Electro), porque Envíopack cotiza por "peso aforado" (compara peso real vs volumen) |

### Cómo funciona Envíopack (investigado)
- API REST, JSON. Cotiza por provincia + CP + peso + dimensiones del paquete.
- Devuelve dos modos: envío a domicilio (costo + tiempo de entrega) o a punto de retiro (sucursales disponibles + precio).
- Requiere cuenta comercial con Envíopack a nivel plataforma (TiendaApps), no que cada tienda chica tenga su propio contrato con cada correo — ese es justamente el motivo de elegir un agregador.
- Fuente: [developers.enviopack.com.ar](https://developers.enviopack.com.ar/cotiza-un-envio)

### Pendiente de decidir / desarrollar
- 🔲 Cómo se gestiona la cuenta de Envíopack: ¿una cuenta única de TiendaApps que despacha por todas las tiendas, o cada dueño conecta su propia cuenta de Envíopack? (afecta quién paga/factura el envío)
- 🔲 Agregar campo Peso + Dimensiones al formulario de producto (`/dashboard/productos/nuevo`), universal para todos los `storeTypes`
- 🔲 Reemplazar/complementar `ShippingMethod` (hoy fijo manual) con cotización en vivo de Envíopack en el checkout del storefront
- 🔲 Generar el envío real (etiqueta) con Envíopack cuando se confirma un pedido
- 🔲 Sincronizar `trackingCode` y estado del pedido automáticamente desde Envíopack en vez de que el dueño lo escriba a mano (impacta `/dashboard/pedidos` y `/seguimiento/[codigo]`)
- 🔲 Definir si esto se hace antes, después o en paralelo a los templates nuevos de rubro

---

## RUBRO 2 — ALIMENTOS
🔲 Pendiente de analizar

## RUBRO 3 — BELLEZA
🔲 Pendiente de analizar

## RUBRO 4 — DEPORTE
🔲 Pendiente de analizar

## RUBRO 5 — MASCOTAS
🔲 Pendiente de analizar

## RUBRO 6 — LIBROS
🔲 Pendiente de analizar

## RUBRO 7 — GENERAL
🔲 Pendiente de analizar
