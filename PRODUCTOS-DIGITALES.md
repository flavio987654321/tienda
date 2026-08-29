# PLAN — RUBRO DE PRODUCTOS DIGITALES

> Creado: 2026-08-27 | Workflow: 🔲 pendiente | 🔄 en progreso | ✅ hecho | ❌ descartado con justificación
> Objetivo: que una tienda pueda vender archivos que se descargan (plantillas, ebooks, licencias)
> sin envío, sin stock y sin talles, entregándolos solos cuando entra el pago.

## 📍 ESTADO ACTUAL (se actualiza a medida que avanzamos)

**Todo commiteado en `main`, NADA deployado.** Migraciones ya aplicadas a la base.

- ✅ **Fase 1 — El rubro existe y se puede elegir.** Verificado en el navegador:
  el rubro aparece en el selector y en el directorio, el formulario trae sus
  categorías, sus campos y sus textos de ejemplo.
- ✅ **Fase 2 — El formulario.** Bloque "Archivo del producto", columnas nuevas,
  subida **directa a Supabase** (ver más abajo por qué cambió), freno para no
  publicar sin archivo, y los textos revisados rubro por rubro.
- 🔄 **Fase 3 — La entrega. ESCRITA Y SIN PROBAR.** Modelo, ruta de descarga,
  emisión idempotente, mail, disparador en el webhook de MP, checkout sin envío y
  limpieza en el cron. Compila y la ruta contesta bien a un token inválido, pero
  **el camino feliz no corrió nunca**.
- 🔲 Fases 4 y 5: sin empezar.

### Lo único que bloquea probar de punta a punta

🔲 **Un archivo de menos de 50 MB.** El PDF real de la tienda pesa 117 MB y
Supabase no lo acepta (ver abajo). Con un PDF chico se puede verificar la cadena
entera: subida → guardado → compra → mail → descarga.

---

## DECISIONES YA CERRADAS (no volver a discutirlas)

**Va un RUBRO propio, no una casilla por producto.** La tienda que lo pidió vende
solo digital. La casilla por producto (`esDigital`) resolvería el caso mixto
—vender remeras y además un PDF— y ese caso hoy no existe. Si algún día aparece,
la casilla se agrega encima sin tirar nada de esto.

**Videos y cursos quedan AFUERA.** Dos motivos, ninguno de programar mejor:

1. La subida pasa entera por nuestro servidor (`req.formData()` + `file.arrayBuffer()`
   en `/api/upload`), y Vercel no deja pasar archivos grandes por ese camino. El
   código dice 50 MB para video pero **hay que probar cuánto aguanta de verdad en
   producción** — se sospecha que falla bastante antes.
2. Un curso no se descarga: se mira online, clase por clase, con reproductor,
   progreso y protección. Eso es una plataforma de cursos, no vender un archivo.

Y hay un costo real: el video gasta plata cada vez que alguien lo mira, y esa
cuenta la paga la plataforma, no la dueña.

**Salida si el tema vuelve:** que la dueña suba los videos a YouTube "no listado"
o Vimeo y nosotros entreguemos el link junto con el archivo. Cuesta cero.

**Un solo rubro, con categorías adentro.** No un rubro por tipo de archivo. La
lista de rubros ya se limpió una vez por exceso de ruido (ver el comentario arriba
de `src/lib/storeTypes.ts`) — no repetir el error.

---

## LO QUE NO HAY QUE CONSTRUIR (revisado 27/08)

Tres dudas que aparecieron antes de arrancar, y las tres ya tienen respuesta en
el código. Anotadas para no volver a averiguarlo.

**El panel es el MISMO para todos los rubros.** No se construye un dashboard
nuevo. Lo único que cambia es qué se ve: los ítems del menú (`onlyFor` /
`hiddenFor` en `DashboardLayout`), qué campos trae el formulario del producto, y
algún texto (`labelFor` — "Productos" dice "Vehículos" en AUTOS). Y la dueña **no
tiene que usar todo**: cupones, promociones, afiliados y newsletter quedan
disponibles y cada una usa lo que quiere.

**El tour guiado YA EXISTE — solo hay que escribirle los textos.**
`src/components/TourGuide.tsx` (el motor) + `src/components/tours.ts` (los
guiones). Funciona leyendo los `data-tour` del DOM, guarda en localStorage que ya
se vio, y **ya sabe hablar distinto por rubro**: el campo `porTipo` de cada paso.
Hoy AUTOS tiene sus textos propios; el rubro digital necesita los suyos y nada
más. Al cambiar de rubro el tour se resetea solo (`StoreTypeModal` borra
`TOUR_PANEL_KEY`), así que vuelve a salir con los textos nuevos.

- 🔲 Escribir los textos `porTipo` del rubro digital en `GUION_PANEL`: subir el
  primer archivo, conectar Mercado Pago para que la entrega salga sola, dónde se
  ve quién descargó.

### ⚠️ Los diseños están atados al rubro

`TEMPLATE_TIPO_TIENDA` en `src/types/store-config.ts:418` dice qué diseño aparece
en qué rubro. **Si se crea el rubro y no se lo suma a ningún diseño, la dueña
entra y no tiene ninguno para elegir: la tienda queda sin cara.**

Decidido: **reusar los diseños neutros**, no hacer uno propio todavía. Un archivo
descargable se muestra igual que una remera —foto, nombre, precio, botón— y hay
precedente explícito: el comentario de Aurora dice *"no está atada a un rubro: es
una estética, no una categoría"*. El diseño propio se evalúa después, cuando se
sepa si el rubro se usa.

- ✅ Sumar `"DIGITAL"` a los diseños neutros en `TEMPLATE_TIPO_TIENDA`
  (candidatos: `aire`, `aurora`, `boho-terra`) y verificar que el selector de
  diseño muestre al menos uno. **Terminado el 29/08 con los NUEVE**, no tres: ver
  "Los nueve diseños" abajo.

---

## FASE 1 — El rubro existe y se puede elegir

Lo primero que se ve y lo más fácil de corregir. Al terminar esta fase, el rubro
aparece en el selector y se puede crear una tienda con él, aunque todavía no
entregue nada.

- ✅ **`src/lib/storeTypes.ts`** — `"DIGITAL"` en el type `StoreType` y su entrada
  en `STORE_TYPES`, antes de GENERAL ("Otros" queda último). 📥 "Productos digitales".
  - `supportsWholesale: false` · `supportsCondicion: false` · `hideShipping: true`
  - `hideVariants: true` (un PDF no tiene talle ni color) · `hideGender: true`
  - `checkoutMode: "cart"` (se paga online, NO es por consulta como AUTOS)
  - `supportsAffiliates: true` · `hideTags: false`
  - categorías: plantillas (canva/excel/word/notion/imprimibles) · ebooks
    (guías/recetarios/libros) · licencias (software/códigos/accesos)
  - `extraFields`: Formato · Programa necesario · Páginas
- ✅ **Los lugares con la lista escrita a mano** — declarado en cada uno:
  - ✅ `src/lib/designBrief.ts` — rubro del brief de diseño (entre Gastronomía y Hotelería)
  - ✅ `src/app/tiendas/TiendasClient.tsx` — ícono `Download` en el directorio
  - ✅ `src/lib/opcionSugerida.ts` — caso explícito ("Formato"), para que no caiga
    en el `default` y le ofrezca talles de ropa a un PDF
  - ❌ `src/lib/ayuda/index.ts` — **NO hacía falta**: filtra por `checkoutMode`
    derivado del rubro, no por una lista escrita a mano. Al ser carrito hereda
    los artículos correctos solo.
- ✅ **`TEMPLATE_TIPO_TIENDA`** (`src/types/store-config.ts`) — `"DIGITAL"` sumado
  a los tres neutros: `aire`, `boho-terra`, `aurora`. Sin esto el rubro se quedaba
  sin ningún diseño para elegir. **Ampliado a nueve el 29/08** — ver abajo.
- 🔲 **Probar a mano**: crear una tienda de prueba con el rubro nuevo y mirar que
  el selector, el directorio y el panel no se rompan. Ver en los tres anchos
  (360 / 768 / 1280).

**Chequeos (27/08):** ✅ `npx tsc --noEmit` limpio · ✅ `npm run check` 53/53
(incluidas `tour-rubro`, `templates-que-se-dibujan`, `plantillas-variantes`) ·
✅ eslint limpio en los 5 archivos. **Sin build de producción y sin deploy.**

---

## FASE 2 — El formulario del producto se acomoda

- ✅ **`requiereArchivo` en `StoreTypeConfig`** — flag nuevo, en DIGITAL va `true`.
  Nada compara contra `"DIGITAL"` a mano: misma regla que `supportsAffiliates`, así
  el día que otro rubro venda archivos se destraba con un booleano.
- ✅ **`src/app/dashboard/productos/nuevo/page.tsx`**:
  - envío, stock, variantes y género se esconden solos con los flags de la Fase 1
  - bloque **"Archivo del producto"** nuevo, debajo de las fotos (las imágenes son
    la portada; el archivo es la mercadería). Subir · nombre · peso legible · quitar.
  - un archivo por producto: subir otro reemplaza al anterior
- ✅ **`prisma/schema.prisma`** — `archivoPath` · `archivoNombre` · `archivoPeso`,
  los tres nullable. Migración escrita en
  `prisma/migrations/20260828120000_add_producto_digital/`.
  - ⚠️ **NO APLICADA a la base.** Es la Supabase de producción: la aplica Flavio
    cuando decida. Hasta entonces el formulario guarda contra columnas que en la
    base todavía no existen.
- ✅ **`src/app/api/upload/route.ts`** — `purpose: "producto-digital"` → bucket
  **privado propio** (`SUPABASE_DIGITAL_BUCKET`, default `producto-digital`).
  Aparte del de afiliados a propósito: un DNI lo mira el admin, un producto lo baja
  el comprador, y mezclarlos complica el día que haya que dar uno sin el otro.
  Devuelve `supabase://…`, no una URL. Acepta PDF/Word/Excel/PPT/ZIP/EPUB/TXT/imágenes.
- ✅ **Validación en el server** (`src/lib/products.ts`) — `archivoPath` tiene que
  empezar con `supabase://`. Sin esto alcanzaba con postear una URL cualquiera para
  que el producto "digital" apuntara a un archivo servido en abierto.
- ✅ **Tope de peso: 15 MB**, igual que un documento. Coherente con el rubro (los
  videos quedaron afuera). El mensaje de error sugiere YouTube/Vimeo para algo más
  pesado, que es la salida acordada.

**Chequeos (28/08):** ✅ tsc · ✅ 53/53 · ✅ eslint · ✅ `/dashboard/productos/nuevo`
compila y responde 200 en dev. **Sin build de producción y sin deploy.**

### Revisión antes de commitear (28/08) — 5 agujeros encontrados y cerrados

Repaso del diff propio buscando roturas de lo que ya andaba, huecos y código
muerto. Lo que salió:

1. ✅ **Un producto digital se vendía UNA SOLA VEZ.** `hideVariants` hace que el
   formulario guarde una variante sintética con **stock 1**, y el checkout
   descuenta stock atómicamente: el primer comprador lo dejaba en cero y el
   segundo se comía "Sin stock suficiente". Corregido con el flag
   `stockIlimitado`, que saltea el bloque de descuento entero (sin descuento no
   hay agotado que avisar ni movimiento que registrar).
2. ✅ **Duplicar un producto perdía el archivo.** `duplicate/route.ts` copia campo
   por campo y los tres nuevos no estaban: la copia nacía sin nada que entregar.
3. ✅ **Se podía publicar sin archivo.** Freno en el alta Y en la edición, del
   lado del server (a las rutas se les puede pegar directo), más el aviso en el
   formulario para no hacerla llenar todo y enterarse al final.
4. ✅ **La importación por CSV se salteaba la validación entera.** Crea productos
   con `prisma.product.create` sin pasar por `validateProductBody`: una tienda
   digital podía dar de alta 500 productos sin archivo y publicados. Bloqueada
   para rubros con `requiereArchivo`, y el botón se esconde.
5. ✅ **El respaldo local de `/api/upload`** escribía en `public/uploads`, que se
   sirve en abierto. Cortado para el archivo digital en TODOS los entornos, no
   sólo producción.

**Verificado que NO se rompió nada de lo que ya andaba:**

- Las 4 salidas públicas de productos (`/api/public/[slug]`, `/api/store/feed`,
  la ficha de `/tienda/[slug]/producto/[id]`, `/api/vendedoras/kit`) usan `select`
  de lista blanca: `archivoPath` no se filtra por ninguna. Tampoco por `export-csv`.
- Los dos `PATCH` que existen pegan a `/variantes/[id]/stock` y a
  `/[id]/vehicle-status`, no a la ruta que toqué.
- La cadena de validación de `/api/upload` conserva el orden para imágenes,
  videos y documentos: el caso nuevo entra ANTES y los `else if` siguen intactos.
- Ningún rubro existente cambia de comportamiento: los flags nuevos
  (`requiereArchivo`, `stockIlimitado`) sólo están puestos en DIGITAL, y se leen
  con `=== true` para que el `undefined` de los demás sea `false`.
- Sin código muerto: las constantes, el helper de peso y los dos íconos nuevos
  están todos en uso.

### Probado en el navegador (29/08) — dos cosas que sólo se ven usándolo

**El archivo NO puede pasar por nuestro servidor.** Al subir de verdad, `500` sin
explicación. En el log: *"Request body exceeded 10MB for /api/upload"*. Hay dos
techos que no ponemos nosotros —Next corta el cuerpo del pedido en 10 MB, y
producción antes— y el archivo llegaba cortado.

Resuelto: el navegador pide un permiso firmado a `/api/upload/firma-digital` y
sube **directo a Supabase**. El servidor no toca los bytes.

- Como ya no se le pueden mirar los bytes, la validación se mudó al **bucket**
  (`file_size_limit` + `allowed_mime_types`): lo aplica Supabase sobre el archivo
  real, no un `if` nuestro. Es más difícil de saltear que antes.
- La **ruta la elige el servidor**, nunca el cliente — si el navegador la eligiera
  podría pisar el archivo de otra tienda.
- La ruta se guarda **recién con la subida confirmada**: un corte a mitad de
  camino no deja el producto apuntando a la nada.

**⚠️ El tope real son 50 MB, y lo pone Supabase, no nosotros.** Es el límite
global de subida del proyecto (plan gratuito). Crear el bucket pidiendo 150 MB
devuelve `413 "The object exceeded the maximum allowed size"` y **el bucket no se
crea**, así que la subida falla con un 502 mudo. Medido: 50 entra, 100 no.
Levantarlo depende del plan de Supabase.

- El caso real que lo destapó: la guía de 46 páginas que quiere vender pesa
  **117 MB** — exportada a calidad de imprenta. **No se puede subir.** Y aunque se
  pudiera, no conviene: su compradora tendría que bajar 117 MB (a Flavio le costó
  hasta por WhatsApp) con sólo 5 intentos de descarga, y el tráfico lo paga la
  plataforma. **Hay que pedirle el PDF exportado en calidad para pantalla.**
- Por eso el formulario avisa (sin bloquear) arriba de 25 MB.

### Los textos del formulario, revisados rubro por rubro (29/08)

Cinco textos hablaban de productos físicos. Corregidos: consejos de fotos, reels,
ayuda de Tags, ayuda de Ficha técnica y el bloque de Promociones. El último no era
sólo redacción: nombraba **3×2** y **envío gratis**, y ninguna de las dos puede
aplicarse acá —se vende de a una unidad y no hay envío—, así que invitaba a crear
una promoción que nunca iba a andar.

### Lo que falta de la Fase 2

- ✅ **Migraciones aplicadas** a la base (29/08, `prisma migrate deploy`). Se nota:
  `/api/descargas/[token]` ya contesta 404 con su mensaje en vez del 500 de
  "la tabla no existe".
- 🔲 **No dejar publicar sin archivo.** Hoy el bloque dice "Archivo del producto *"
  pero nada frena el guardado si está vacío: se puede publicar un producto digital
  que no se puede entregar. El aviso rojo de la Fase 4 lo detecta después; falta el
  freno en el momento.
- 🔲 **Probar la subida de punta a punta** — necesita el bucket creado y sesión
  iniciada. Bloqueado por el captcha del login en local.
- 🔲 **El respaldo local de `/api/upload`** (cuando no hay Supabase configurado)
  escribe en `public/uploads`, que se sirve en abierto. Sólo corre en dev —en
  producción corta con 500— pero un archivo digital no debería pasar nunca por ahí.

---

## FASE 3 — La entrega (el corazón del asunto)

**Decidido (29/08): el link vive 30 días y se puede usar 5 veces.** Constantes en
`src/lib/descargas.ts`, en un solo lugar.

- ✅ **Modelo `DigitalDownload`** + migración `20260829120000_add_digital_download`.
  Una fila **por línea comprada**, no por producto: dos personas que compran el
  mismo PDF tienen cada una su token, su vencimiento y su cuenta — si colgara del
  producto, agotar el tope de uno se lo agotaría al otro.
- ✅ **`/api/descargas/[token]`** — calcada de `/api/vendedoras/cv/[id]`. Tres
  decisiones que vale la pena recordar:
  - **Todo lo que sale mal devuelve el MISMO 404.** No se distingue "no existe"
    de "vencido" de "sin descargas": contestar distinto convertiría la ruta en un
    oráculo para averiguar qué tokens existen.
  - **No pide sesión, a propósito.** El comprador no tiene por qué tener cuenta, y
    obligarlo a registrarse para bajar lo que ya pagó es peor que el riesgo. Lo
    que protege es el token (aleatorio, con vencimiento y con tope), no un login.
  - **El contador sube ANTES de firmar, con un UPDATE condicional** (`descargas <
    max` en el mismo WHERE). Dos pedidos simultáneos —doble clic, link
    reenviado— y sólo uno pasa: el tope no se puede desbordar. Contar antes hace
    que una firma fallida gaste una descarga, y ese es el lado correcto para
    equivocarse: al revés se regalarían descargas sin límite.
- ✅ **`src/lib/descargas.ts`** — emite los permisos. **Idempotente**: si el ítem
  ya tiene permiso se reusa. Mercado Pago reintenta los webhooks, y sin esto una
  compra terminaba con dos tokens vivos y el tope de 5 pasaba a ser de 10.
  Token = dos `randomUUID` pegados, nunca `Math.random()`.
- ✅ **Disparador en `/api/mp/webhook`** — el gatillo es el **pago acreditado**, no
  el pedido creado: entregar antes sería regalarle el archivo a quien abandonó el
  pago. Emitir los permisos NO va en segundo plano (es escribir en la base y tiene
  que pasar); el mail sí. Si la entrega falla no se re-lanza el error: el pago ya
  está confirmado y no se puede desarmar por eso.
- ✅ **`sendDigitalDownloadEmail`** — el mail lleva **tokens, no direcciones de
  archivo**: un mail se reenvía sin pensarlo y una dirección al bucket serviría
  para siempre. Avisa cuándo vence y cuántas descargas hay, y le dice que lo
  guarde apenas lo baje.
- ✅ **`/api/checkout`** — sin envío ni código postal para el rubro digital. Se
  decide por RUBRO y no por los productos del carrito, porque una tienda tiene un
  solo rubro. Va **antes** de `findShippingMethod`: si no, una tienda digital sin
  métodos configurados caía en `DEFAULT_SHIPPING_METHODS` y le cobraba al
  comprador el envío de un paquete que no existe.
- ✅ **Limpieza en el cron diario** — los permisos se borran **30 días después de
  vencer**, no al vencer: mientras la fila existe, la dueña ve en el panel que ese
  comprador tuvo su link y cuántas veces lo bajó.

**Chequeos (29/08):** ✅ tsc · ✅ 53/53 · ✅ eslint · la ruta de descarga devuelve
404 con un token con forma inválida. **Sin build de producción y sin deploy.**

### ⚠️ Nada de esto está probado de verdad

Verificado que compila y que el 404 sale bien. **El camino feliz no se pudo probar
ni una vez**, y hacen falta tres cosas que no dependen del código:

1. 🔲 **Las dos migraciones aplicadas.** Hoy `/api/descargas/[token]` tira 500 con
   *"The table public.DigitalDownload does not exist"* — que es exactamente lo
   esperado y confirma que la ruta llega bien hasta la consulta.
2. 🔲 **El bucket privado creado** en Supabase.
3. 🔲 **Poder entrar al panel** (el login local sigue trabado por el captcha).

### ⚠️ El agujero de la transferencia

Hay tres medios de pago (`checkout/route.ts:128`): `mercadopago`, `transferencia`
y `efectivo`. **La entrega automática solo funciona con Mercado Pago**, que es el
único que avisa solo que el pago entró. Con transferencia la dueña confirma a mano
y recién ahí sale el mail.

Eso **hay que decirlo en la tienda antes de comprar**, no dejar que el comprador
lo descubra esperando un mail que no llega.

- 🔲 Definir el texto y dónde va.

---

## Los nueve diseños y su propia categoría (29/08)

Los tres del arranque alcanzaban para que la tienda tuviera cara, no para que la
dueña pudiera elegir. Ahora están habilitados **los nueve diseños de tienda**:
los cuatro de Moda (`aire`, `boho-terra`, `urban-pulse`, `chic-paris`), los
cuatro de Hogar & Tecnología (`electro-prime`, `tech-nova`, `home-studio`,
`casa-clara`) y `aurora`. Los dos de Autos no: ese rubro no vende con carrito.

### Habilitar no era sumar una palabra

Cada diseño trae sus textos "de fábrica" escritos adentro, y **todos abrían
prometiendo algo que esta tienda no hace**: "Envío gratis en compras mayores a
$30.000", "Cambios sin cargo hasta 30 días", "Retiro en local", "Envío a todo el
país", "Stock real". No rompen nada — la tienda carga, se ve linda y vende.
Solamente mienten, que es peor, porque nadie lo va a reportar como error.

- ✅ **`src/lib/beneficios-rubro.ts`** — sumó `garantiasDeRubro()` para los que
  muestran CUATRO fichas y no tres, y exporta `entregaPorDescarga()` para los
  textos que no tienen forma de ficha (los cuatro "beneficios" de Tech Nova, la
  línea de confianza de Casa Clara). Esos se escriben en su template, con la voz
  de ese diseño; lo único compartido es la pregunta de cuándo usarlos.
- ✅ **Los seis templates nuevos** — `UrbanPulse`, `ChicParis`, `ElectroPrime`,
  `TechNova`, `HomeStudio`, `CasaClara`: barra de anuncios, fichas de garantía,
  ticker y líneas de confianza, todo por rubro.
- ✅ **Los íconos también** — un CAMIÓN arriba de "Descarga inmediata" desmiente
  el texto. Cada template define con qué ícono abre cada casillero según el
  rubro. Los íconos nuevos (sobre, chat) se agregaron **al final** de cada lista:
  el override guarda el NÚMERO, así que meterlos en el medio le cambiaría el
  dibujo a toda tienda que ya lo hubiera elegido.
- ✅ **Nada de lo que la dueña ya editó se movió** — los nombres de los campos
  (`garantia1Title`, `trust2Desc`…) son los de siempre. Lo único que cambia es
  qué dicen cuando todavía no los tocó.

### La galería tiene una sección propia

`categoriasParaRubro()` en `src/lib/templateRegistry.ts`. Las tres categorías
del selector están agrupadas por el rubro para el que se diseñó cada plantilla, y
la galería las muestra todas apagando las que no se pueden usar: una tienda
digital entraba y veía once diseños repartidos en tres títulos que hablan de otra
cosa, dos de ellos enteros en gris. Ahora ve **una sola sección, "Productos
digitales"**, con los nueve que puede usar.

Se arma sola desde `TEMPLATE_TIPO_TIENDA` —la misma tabla que decide si la
tarjeta se puede clickear— y el título sale del nombre del rubro. Con una segunda
lista a mano, habilitar un diseño y olvidarse de agregarlo acá daría una tarjeta
que existe y que nadie encuentra.

**Chequeo:** `beneficios-rubro.check.ts` cruza `TEMPLATE_TIPO_TIENDA` con el
código de cada template: si un diseño figura habilitado para un rubro sin envío y
no está leyendo los textos del rubro, falla y dice cuál es. Más las dos mitades de
la galería, que se rompen por separado y en silencio.

**Chequeos (29/08):** ✅ `npx tsc --noEmit` limpio · ✅ `npm run check` 55/55 ·
✅ eslint sin errores en los 11 archivos. **Sin build de producción y sin deploy.**

### Lo que NO se tocó, a propósito

El texto que **describe los productos** de cada diseño: el subtítulo del hero de
Electro Prime ("Electrodomésticos, celulares, informática y muebles…"), los
párrafos de "Nosotros". Eso es relleno de ejemplo que toda dueña reescribe con lo
suyo, sea cual sea el rubro. Lo que se arregló es distinto: una **promesa que la
tienda no puede cumplir**.

---

## FASE 4 — La sección "Descargas" en el panel

- 🔲 **Item en el menú** (`src/components/DashboardLayout.tsx`, primer grupo, abajo
  de Productos): `{ href: "/dashboard/descargas", label: "Descargas", icon: Download,
  tourId: "descargas", onlyFor: ["DIGITAL"] }`. Con `onlyFor` no le aparece a nadie
  más — es el mismo mecanismo que usa "Consultas" para AUTOS.
- 🔲 **Escondida hasta que esté lista**: envolverla en
  `process.env.NEXT_PUBLIC_DIGITALES_ENABLED === "1"`, igual que Aplicaciones
  (`DashboardLayout.tsx:87-91`). Así se puede mergear sin que ninguna dueña la vea.
- 🔲 **La página** (`/dashboard/descargas`): copiar la forma de
  `dashboard/productos/page.tsx` — server component, `force-dynamic`,
  `getCurrentUser()`, `if (!user) return null`, su `PAGE_SIZE`, tabla en un client
  component al lado, `AvisosDeSeccion` arriba. Muestra: qué archivos hay subidos,
  quién compró, quién descargó y cuántas veces, y **botón de reenviar link**
  (el caso de soporte más común).
- 🔲 **Avisos propios** en `src/lib/avisos-tienda.ts` con
  `seccion: "/dashboard/descargas"`:
  - rojo: *"tenés un producto digital sin archivo subido"* (se está vendiendo algo
    que no se puede entregar)
  - amarillo: *"hay N compradores que nunca descargaron"*

---

## FASE 5 — Legales

- 🔲 **Botón de arrepentimiento**: en venta a distancia de contenido digital el
  derecho de retracto tiene tratamiento distinto una vez descargado el archivo.
  Revisar `LEGALES.md` y los términos que genera cada tienda.

---

## LO QUE FALTA DECIDIR

- 🔲 **Tope de peso del archivo** — ¿alcanza con los 15 MB de hoy?
- 🔲 **Vencimiento del link** — ¿30 días? ¿para siempre? ¿cuántas descargas?
  Define si hace falta limpieza en el cron diario (`/api/cron/daily`).
- ✅ **Nombre de la categoría "plantillas"** — SE DEJA "plantillas". Es la palabra
  que usa el comprador para buscar, y el choque con `/afiliados/plantillas`
  (textos para copiar y pegar) es solo de nombre: viven en pantallas distintas y
  nunca se muestran juntas. Queda aclarado en un comentario en `storeTypes.ts`.
- ✅ **Emoji e ícono del rubro** — 📥 en el selector, `Download` en el directorio
  de tiendas. Se puede cambiar en un renglón si no te gusta.
