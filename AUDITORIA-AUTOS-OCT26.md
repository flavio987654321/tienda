# Auditoría del rubro AUTOS — octubre 2026

Arrancada el 06/10/26, después de cerrar la de moda (AUDITORIA-MODA-OCT26.md).
Fuentes: tres auditorías de solo lectura (templates, flujo de consulta y seguridad),
con cada hallazgo verificado en el código antes de anotarlo.

Datos de producción al arrancar (solo lectura):
- 1 tienda AUTOS (`qrdreamcar`), sin publicar, con el WhatsApp de ejemplo `+54 9 11 0000-0000` activo.
- 0 consultas (`Lead`) en toda la plataforma.

Se tacha cada ítem al terminarlo. Nada se deploya hasta que se pida.

**Decisiones del dueño (06/10/26):**
- **Afiliados en autos y motos:** todavía no está definido cómo van a funcionar. Mientras tanto,
  una consulta no genera comisión por ningún camino. Queda apagado desde un solo lugar, sin borrar
  el cableado, para encenderlo cuando se decida el modelo.
- **Cómo consulta el comprador:** WhatsApp como botón principal, y abajo un formulario corto
  ("Dejá tus datos y te contactamos": nombre y teléfono) que guarda la consulta completa. Sin
  WhatsApp, queda solo el formulario.
- **Reservado:** el auto sigue visible en la tienda con la etiqueta "Reservado". "Vendido" lo saca.

---

## 1. Plata y seguridad

- [x] ~~**1.1 La comisión por consulta no la respalda nada, en ningún rubro.**~~ → Hecho (06/10):
  - `consultaGeneraComision` en `lib/storeTypes`: hace falta un rubro de consulta con afiliados, y hoy no hay ninguno.
  - La usan el alta y la confirmación. La confirmación vuelve a mirar el rubro antes de acreditar.
  - Probado: con el código viejo, una consulta vieja acreditaba $2.000.000. Ahora se confirma sin plata.
  - Sumado a `afiliados-por-rubro.check.ts`.
  Detalle original: Al confirmar una
  consulta con afiliada, `api/leads/[id]` suma `precio × comisión` a su billetera, y eso pasa en
  todos los rubros con afiliados (ROPA, etc.). En un pedido, la comisión la respalda el fee de
  MercadoPago; en una consulta no pasa un peso por la plataforma. Como el precio lo pone la dueña
  (sin tope), la comisión admite hasta 100% y cada retiro llega a $10M, una dueña con una segunda
  cuenta de afiliada se puede acreditar millones y la plataforma se los paga.
  → Atribuir una consulta a una afiliada solo en rubros de consulta que soporten afiliados (hoy
  ninguno). Al confirmar, volver a chequear el rubro antes de acreditar. Sumarlo a
  `afiliados-por-rubro.check.ts`.
- [x] ~~**1.2 El rubro se cambia por `PUT /api/configuracion` sin validar.**~~ → Hecho (06/10):
  - Con el rubro ya elegido, el PUT no lo cambia; solo el reset.
  - La primera vez, solo acepta un rubro de `STORE_TYPES`.
  - El chequeo de afiliados mira el rubro con el que queda la tienda.
  - Probado con una sesión falsa contra la base de prueba; 4 de 5 casos fallaban con el código viejo.
  Detalle original: Guarda
  `tipoTienda: b.tipoTienda || "ROPA"` sin mirar `STORE_TYPES`, y el chequeo de afiliados usa el
  rubro *anterior*. Así se esquiva la pausa de afiliados de autos, y también el reset oficial
  (`/api/store/reset`, que borra consultas, billeteras y afiliados).
- [x] ~~**1.3 Consultas: producto inactivo, tienda sin publicar, spam.**~~ → Hecho (06/10):
  - Pide vehículo activo y tienda activa, publicada, sin cerrar y con dueño no baneado.
  - Tope de 200 consultas por hora por tienda.
  - El formulario completa la consulta que abrió el toque de WhatsApp (`leadId`, dentro de 30 min y solo si todavía no tiene datos) en vez de duplicarla.
  - 17 casos probados.
  Detalle original: `POST /api/leads` acepta
  vehículos inactivos (vendidos o reservados) y tiendas sin publicar. No hay tope por tienda ni
  se descartan repetidas (doble toque = dos consultas). Los campos libres solo los llena quien le
  pega a la API a mano.
- [x] ~~**1.4 `vehicle-status` guarda crudo.**~~ → Hecho (06/10):
  - `vehicle-status` valida el precio (los puntos cuentan como miles), limpia y recorta los textos y tolera un cuerpo roto.
  - `validateProductBody` exige `{key: texto, value: texto|número}`.
  - Las fotos tienen que ser `https://` o rutas propias; todas las de producción ya cumplían.
  Detalle original: `soldPrice` como texto da 500, y los textos no tienen
  tope. Los `attributes` con `key` que no es string rompen el modal y el buscador.
- [x] ~~**1.5 `GET /api/leads?page=abc` da 500** (NaN a Prisma).~~ → Hecho (06/10): `|| 1`.

## 2. Que el comprador pueda consultar

- [x] ~~**2.1 En el celular, el modal del auto se ensancha** (alta).~~ → Hecho (06/10):
  columnas con `minmax(0,…)` e hijos con `min-width:0`. Medido en 360, 768 y 1280: el modal
  ocupa exactamente su ancho, y el botón queda adentro (44–316 px a 360).
  Detalle original: la tira de miniaturas agranda
  la columna `1fr`. A 360 px con 10 fotos, el botón de WhatsApp queda fuera de la pantalla y hay
  que deslizar de costado.
- [x] ~~**2.2 La ficha `/producto/[id]` de autos muestra un carrito** (alta).~~ → Hecho (06/10):
  `redirect` a `/tienda/<slug>?producto=<id>`, probado llamando a la página contra la base de
  prueba (autos redirige, ropa no). `cart/track` devuelve 409 en rubros de consulta. No hay ficha temática
  para auto-drive ni auto-motor, así que cae en la genérica: cantidad, "Agregar al carrito",
  cuotas, "Ver carrito". Llegan ahí Google (sitemap), el catálogo de Meta y Google Shopping.
  → Redirigir a `/tienda/<slug>?producto=<id>`, que abre el modal. Además, `cart/track` no
  registra carritos en rubros de consulta.
- [x] ~~**2.3 Sin WhatsApp no hay cómo consultar, y el de ejemplo viene activo** (alta).~~ → Hecho (06/10):
  - `DEFAULT_CONFIG.whatsapp` viene apagado y sin número. Las vistas de demostración (`/preview/*`)
    lo ponen a mano.
  - `configPublica` apaga el número de muestra si una tienda lo tiene grabado. Vale para todos
    los templates, no solo autos: `importadosmalena` (ROPA) también lo tenía.
  - Sin WhatsApp, el modal muestra el formulario abierto.
  Detalle original:
  `DEFAULT_CONFIG.whatsapp` = `{enabled:true, number:"+54 9 11 0000-0000"}` queda grabado al
  guardar el diseño, y producción lo confirma. Si la dueña lo apaga, el modal se queda sin ningún
  botón.
- [x] ~~**2.4 La consulta no guarda quién consultó** (alta).~~ → Hecho (06/10): `ConsultaVehiculo`.
  - WhatsApp es el botón principal y abajo va "¿Preferís que te llamen? Dejá tus datos" (nombre,
    teléfono y mensaje opcional).
  - Valida antes de mandar, muestra el error del servidor (incluido el 429) y un mensaje de éxito.
  - Si la persona ya tocó WhatsApp, completa esa consulta en vez de crear otra.
  - El toque de WhatsApp registra una sola consulta por vehículo cada 30 minutos.
  - Las flechas del teclado ya no cambian la foto mientras se escribe.
  Detalle original: No hay formulario: la consulta se crea
  sola al tocar WhatsApp, sin nombre ni teléfono. En el panel salen filas "Sin nombre" y las
  respuestas rápidas no aparecen nunca.
- [x] ~~**2.5 El número de WhatsApp no se normaliza.**~~ → Hecho (06/10): `lib/whatsappTienda`.
  - Con código de país, se respeta tal cual: un "+54 2254…" sin el 9 puede ser un fijo con
    WhatsApp Business.
  - Sin código de país, se lee como celular argentino y se le pone el 549.
  - El número de muestra da `null`.
  - Lo usan el modal y los 7 botones de los templates. Hay 12 casos en `whatsappTienda.check.ts`.
  Detalle original: "011 15 5555-1234" arma
  `wa.me/01115…`, que no funciona. Usar `celularArgentino` / `enlaceDeWhatsApp`.
- [x] ~~**2.6 El mensaje de WhatsApp no dice precio ni link.**~~ → Hecho (06/10): "Hola! Me
  interesa el {vehículo} ({año}) de {precio}. ¿Está disponible?" y el link a la portada con
  `?producto=` (desde /vehiculos se le saca ese tramo, porque esa página no abre el modal).
- [x] ~~**2.7 La dueña no se entera de una consulta nueva.**~~ → Hecho (06/10): campanita
  (`NEW_LEAD`, 💬) y push cuando la consulta trae nombre, es decir, cuando viene del formulario.
  El toque de WhatsApp no avisa: ese mensaje ya le llega a su WhatsApp.

## 3. Datos del vehículo

- [x] ~~**3.1 Kilómetros mal mostrados.**~~ → Hecho (06/10):
  - `kmDe` y `fmtKm` leen el número sea cual sea la forma en que se escribió y la clave que use
    ("Kilómetros" o "Km").
  - En el formulario, los campos numéricos (año, km, código postal) son de texto con teclado
    numérico y solo aceptan dígitos. Con `type=number`, "50.000" daba 50 y un dato viejo con
    puntos se veía vacío.
  - La importación CSV deja solo los dígitos de km y año.
  - Probado: "28.000" → 28.000 km, "1500 km" → 1.500 km, y la clave "Km" (Fiat) → 60.000 km.
- [x] ~~**3.2 Los similares nunca muestran los km.**~~ → Hecho (06/10): resuelto con `kmDe`, que lee las dos claves.
- [x] ~~**3.3 Al abrir un similar, la foto queda en blanco** ("5 / 2").~~ → Hecho (06/10):
  dentro del modal, en un solo lugar en vez de en tres. Al cambiar de vehículo vuelve a la primera
  foto, cierra la foto ampliada y sube el scroll. Probado: estando en "5 / 10", el similar abre en
  "1 / 2" y arriba de todo.
- [x] ~~**3.4 "Reservado" saca el auto de la tienda.**~~ → Hecho (06/10):
  - El servidor ya estaba resuelto desde el grupo 1.
  - El estado del vehículo (solo el estado, no los datos de la venta) llega al navegador por la
    API pública y la ficha, y lo leen los tres lugares que arman el producto. El de
    `/vehiculos` se había quedado afuera y lo atrapó la prueba.
  - En la tarjeta, una etiqueta ámbar "Reservado" y la foto un poco atenuada.
  - En el modal, la etiqueta arriba y el aviso "Este vehículo está reservado. Podés consultar
    igual: si la reserva se cae, sos el primero en enterarte."
- [x] ~~**3.5 Alta sin validaciones.**~~ → Hecho (06/10): en autos, motos y camionetas (no en
  repuestos ni accesorios) piden marca, modelo y año, con el año de cuatro cifras entre 1900 y el
  año que viene.
- [x] ~~**3.6 La etiqueta de condición es ilegible con acentos claros.**~~ → Hecho (06/10): el
  texto usa `getContrastColor` (negro sobre amarillo) y la condición sale una sola vez. En el
  encabezado, ese lugar ahora lo ocupa "Reservado".
- [x] ~~**3.7 El zoom de escritorio tapa el precio y el botón de WhatsApp.**~~ → Hecho (06/10):
  zoom en la misma foto (`backgroundSize 250%`) en vez de reemplazar la columna de la derecha.
  Probado a 1280: con el zoom activo, el precio y el WhatsApp siguen visibles.

## 4. Panel de consultas

- [x] ~~**4.1 Confirmar o rechazar no avisa cuando falla** (409, sin red).~~ → Hecho (06/10):
  error en la misma fila. Con un 409 dice "ya se había marcado" y recarga la lista.
- [x] ~~**4.2 Trae 50 y cuenta sobre esas 50.**~~ → Hecho (06/10):
  - `lib/consultasPanel` cuenta en la base y pagina de a 20, con "Ver más consultas".
  - La pantalla y `GET /api/leads` usan la misma pieza.
  - El filtro pide al servidor y un estado inventado se ignora.
  - Probado con 55 consultas: totales 30, 20 y 5; 3 páginas; el numerito del menú da lo mismo.
- [x] ~~**4.3 Textos de otro rubro.**~~ → Hecho (06/10):
  - Los estados, en `lib/consultas`, son "Nueva", "Vendida" y "Descartada", también en el inicio,
    donde salía "REJECTED" crudo. "Sin nombre" pasó a "Consultó por WhatsApp".
  - Las respuestas rápidas son de concesionaria: saludo, visita y prueba, financiación, permuta.
  - El estado vacío ya no habla de afiliados.
  - La tarjeta de comisiones solo aparece donde una consulta genera comisión; si no, muestra
    "Últimos 7 días".
- [x] ~~**4.4 Restos de afiliados en autos.**~~ → Hecho (06/10):
  - El ítem del menú se resolvió con el pedido del cambio de rubro.
  - En el inicio, la tarjeta de afiliados pasó a ser "Consultas (7 días)".
  - Los avisos de producto nuevo, precio y stock solo van a afiliados de rubros con afiliados.
- [x] ~~**4.5 Jerarquía.**~~ → Hecho (06/10): cada fila arranca por la persona, con WhatsApp
  (número armado con `numeroWhatsApp`) y Llamar a la vista. Después va el mensaje, el vehículo
  (foto, precio, estado, "Ver") y las acciones "Se vendió" y "Descartar". "Se vendió" ofrece
  "¿Marcamos el … como vendido?" y lo marca con el nombre y el teléfono del comprador. Visto a 360,
  768 y 1280 con una ruta temporal (ya borrada) y datos inventados.
- [x] ~~**Encontrado: una concesionaria no podía publicar desde el panel.**~~ El botón de publicar
  exigía "un método de cobro (MercadoPago, transferencia o efectivo)", que en autos no existe. El
  servidor ya lo exceptuaba; el botón no.
- [x] ~~**Encontrado: la guía de configuración del inicio no pedía el WhatsApp en autos.**~~ Ahora
  que viene apagado de fábrica, en autos hay un paso "Cargá el WhatsApp de la concesionaria", y
  la carga dice "vehículos".

## 5. Templates y `/vehiculos`

- [ ] **5.1 Filtros.** Sin año, km, precio ni carrocería. Los "filtros rápidos" no filtran. La
  marca distingue mayúsculas ("Ford" ≠ "FORD "). "Menor km" pone primero los sin dato.
- [ ] **5.2 Promesas fijas no editables.** "100% Verificados", "15+ años de experiencia" y
  "Entrega a domicilio / en todo el país".
- [ ] **5.3 Links del menú a secciones ocultas** no hacen nada.
- [ ] **5.4 El corazón de favoritos saca a /login sin avisar**, también en la previa del editor.
- [ ] **5.5 `/vehiculos`.**
  - Encabezado apretado a 360.
  - Las marcas desconocidas muestran un globo genérico.
  - Un error de carga dice "Sin resultados".
  - Abre para tiendas que no son de autos.
- [ ] **5.6 Escape.** No cierra el buscador. Con la foto ampliada, cierra el modal entero.
- [ ] **5.7 Accesibilidad.**
  - Botones de ícono sin nombre.
  - Tarjetas que no se abren con teclado.
  - El modal sin `role="dialog"`.
  - Zonas táctiles chicas.
  - Botón dentro de botón en modo edición.

---

## Pedido del dueño: pasar de ropa a autos se siente forzado (06/10/26)

"Cuando entré a modo vehículo tardó o apareció mal la guía, no lo siento normal."

- [x] ~~**Al terminar el cambio, el modal volvía a la pantalla de elegir rubro.**~~ La tarjeta
  parpadeaba en verde 0,7 s y recién ahí se cerraba, con un refresco a medias que dejaba a la
  dueña en Productos con el estado anterior cargado. Ahora la pantalla de carga pasa a "Listo:
  tu tienda ahora es de Autos y motos 🚗 — Te llevamos al panel…" y se carga el panel de inicio
  entero.
- [x] ~~**La guía no arrancaba al cambiar de rubro: aparecía más tarde, en cualquier
  pantalla.**~~ El cambio borra la marca de "guía vista", pero el panel solo la arrancaba cuando
  el rubro pasaba de no elegido a elegido, y la tienda ya lo tenía elegido. Con la carga completa
  del inicio, la guía arranca ahí, a los 1,4 s.
- [x] ~~**Una tienda de autos veía el menú de ropa un instante, en cada pantalla.**~~ El panel
  arrancaba sin rubro (`null`) hasta que respondía `/api/pedidos`. Ahora el layout del servidor
  pasa el rubro y si fue elegido (`RubroDelPanel`), así que el primer dibujo ya es el correcto.
  `tour-rubro.check.ts` quedó actualizado.
- [x] ~~**La guía de autos prometía comisiones y no hablaba del WhatsApp.**~~
  - Afiliados ya no se muestra en autos: sale de `supportsAffiliates`, así que vuelve solo el
    día que se prenda. Es el punto 4.4.
  - Consultas explica el flujo real.
  - En Configuración, para autos, la guía arranca por el WhatsApp.
- **Sin probar en el navegador:** el panel pide sesión, y el cambio de rubro borra la tienda de
  verdad (el servidor local usa la base de producción). Verificado con la compilación, los
  chequeos y la lectura del código.

## Encontrado en el camino

- [x] ~~**Un guardado sin rubro pasaba la tienda a ROPA.**~~ El PUT de configuración guardaba
  `b.tipoTienda || "ROPA"` y `Boolean(b.tipoTiendaConfigurado)`, así que cualquier llamada que no
  los mandara cambiaba el rubro y volvía a mostrar el modal para elegirlo. Lo destapó la
  contraprueba del 1.2 y quedó arreglado junto con él.
- [x] ~~**El precio de venta de un auto se guardaba mal.**~~ El campo aceptaba puntos, y
  `parseFloat("12.500.000")` da 12,5. Ahora acepta solo dígitos (`VehicleStatusModal`), y el
  servidor igual interpreta los puntos como miles.
- [x] ~~**Los avisos nuevos de pagos no tenían ícono.**~~ Los que sumó la auditoría de moda
  (devolución, pago duplicado, pago sin stock, comisión revertida, recordatorio de pedido sin
  confirmar) caían en la 🔔 genérica de la campanita. Ahora tienen ícono propio.
