# Auditoría de moda — octubre 2026

Tres revisiones en paralelo el 05/10/26: el flujo de compra (carrito → checkout →
Mercado Pago → pedido), la seguridad de las tiendas, y los cinco templates de moda
probados en vivo (Aire, Boho Terra, Urban Pulse, Chic Paris, Aurora) a 360, 768 y
1280. Lo que sigue es la lista de trabajo, en el orden en que se ataca. Cada ítem
se tacha acá apenas se termina y se commitea.

Lo que se revisó y está bien (para no volver a buscarlo): no hay acceso cruzado
entre tiendas; `/api/admin/**` exige rol en el servidor; crons con `CRON_SECRET`;
webhooks de MP con firma HMAC; Turnstile verificado en el servidor; subidas con
magic bytes y sin pisar archivos; el checkout recalcula precios desde la base; el
stock se descuenta de forma atómica.

## 1. Urgente — plata y datos personales

- [x] ~~**1.1 Pago aprobado después de uno rechazado queda ignorado.** Un `rejected`
  cancela el pedido (devuelve stock, mail de "cancelado"); si el comprador reintenta
  en la misma preferencia y paga, el `approved` encuentra el pedido no-PENDING y no
  hace nada. Lo mismo si la dueña cancela y después pagan con el link viejo.
  `api/mp/webhook/route.ts`.~~
  → **Hecho (05/10).** Un rechazo ya no cancela (el pedido vence solo, ver 2.1). Un
  aprobado sobre un cancelado lo reactiva si hay stock (`reactivarPorPagoTardio`)
  o le avisa fuerte a la dueña si no. Confirmar pasa por `runOrderAction`. Probado
  en una base local descartable con 9 casos (rechazo + reintento, 3 avisos
  simultáneos, pago tardío con y sin stock, otra cuenta, monto menor, efectivo en
  curso, devolución, base caída a mitad).
- [x] ~~**1.2 Datos bancarios públicos (CBU, alias, CUIL).** `paymentInfo` vive en
  `storeConfig`, que sale entero por `/api/public/<slug>` y en la página de la
  tienda, aun con la transferencia apagada o la tienda en "Próximamente".~~
  → **Hecho (05/10).** `lib/configPublica` deja sólo `enabled` de cada medio; lo
  usan la API pública y la página. El mail del pedido sigue leyendo la base.
  Verificado en vivo (girly-store, amaranta, tiendaapps) y con
  `configPublica.check.ts`.
- [x] ~~**1.3 Teléfono, nombre y ciudad de la dueña en el HTML aunque estén ocultos.**
  `verifiedInfo` se arma siempre con los datos; las banderas sólo deciden si se
  dibuja. `tienda/[slug]/page.tsx`, `tienda/[slug]/producto/[id]/page.tsx`.~~
  → **Hecho (05/10).** `lib/infoVerificada`: el dato sale sólo si la tienda está
  verificada y la dueña lo eligió. Verificado en vivo: el teléfono de la dueña de
  girly-store aparecía 1 vez en el HTML antes, 0 después (portada y ficha).
- [x] ~~**1.4 Comisión de consulta con precio que manda el navegador.** `api/leads`
  (POST `productPrice`) y `api/leads/[id]` lo usan para acreditar al afiliado. Sin
  chequeo de que el producto sea de la tienda, sin topes, sin captcha.~~
  → **Hecho (05/10).** Nombre y precio salen del producto real de esa tienda (si
  no es de la tienda, 404); textos con tope y sin caracteres de control. Captcha
  no: el único que llama es el botón de WhatsApp de autos, ya tiene tope por IP,
  y sin precio inventable una consulta falsa no da plata. Probado en base local.
  De paso: confirmar una consulta no tenía candado — dos clics acreditaban la
  comisión DOS veces; y un rechazo podía pisar una confirmación. Ahora las dos
  ramas son `updateMany` condicionado a PENDING.
- [x] ~~**1.5 Envío gratis sin querer / con un id inventado.** El carrito arranca en
  `"retiro"` aunque esté apagado; la pantalla suma el primer envío pero manda
  `"retiro"`, y el servidor cae a un retiro sin mirar `enabled`.~~
  → **Hecho (05/10).** El servidor rechaza (400) un envío inexistente o apagado;
  el carrito marca y manda la opción que se ve. Probado con el checkout real en
  base local: retiro apagado, id inventado, envío válido (cobra), tienda sin
  configurar e id viejo "pickup".

## 2. Importante — stock, cobros, pagos

- [x] ~~**2.1 Pedidos PENDING de tiendas no vencen nunca** y retienen stock y usos de
  cupón. Además "Intentá de nuevo" crea otro pedido, el carrito se vacía antes de
  ir a MP, y al volver con `?pago=error|pendiente` no hay mensaje.~~
  → **Hecho (05/10).** `lib/pedidosImpagos` (cron diario): MP sin pago se cancela a
  las 48 h (7 días si hay un pago en efectivo en curso) con mail de "venció sin
  pago" y botón para volver; transferencia/efectivo NO se cancelan solos, se le
  recuerda a la dueña a los 3 días, una vez. "Intentá de nuevo" reusa el pedido
  si no cambió nada. La vuelta de MP con error ofrece "Reintentar el pago" del
  mismo pedido; con pendiente explica el efectivo. Probado: 19 casos en base
  local + navegador a 360/768/1280.
- [x] ~~**2.2 Compra sin variante saltea el stock.** Sin `variantId` no se valida ni
  descuenta nada aunque el producto tenga variantes.~~ → Hecho (05/10): el
  checkout exige la variante si el producto tiene ("Elegí el talle…"). El carrito
  ya la mandaba siempre, así que no cambia nada para quien compra normal.
- [x] ~~**2.3 Variante con precio 0 (o negativo) se cobra así.** El servidor usa
  `variant.price ?? product.price`; el carrito ignora ≤ 0. Al guardar no se valida.~~
  → Hecho (05/10): el checkout usa la regla del carrito (> 0); al guardar, 0 o
  vacío = "usa el del producto" (`precioDeVariante`) y un negativo se rechaza.
  Probado con el checkout real (0, negativo, propio) en base local.
- [x] ~~**2.4 Cupón devuelto dos veces** al rechazarse un pago (`runOrderAction` y el
  webhook).~~ → Hecho (05/10): se fue con el 1.1, el webhook ya no cancela.
- [x] ~~**2.5 Medios de pago no respetan la configuración** (transferencia/efectivo
  siempre ofrecidos; "retirar" se guarda como `transfer`; MP sin conectar acepta el
  pedido y lo deja huérfano).~~ → **Hecho (05/10).** `lib/mediosDePago`: una regla
  para el carrito y el servidor (tienda sin configurar sigue ofreciendo los dos
  manuales). "retirar" se guarda como `efectivo`; un medio desconocido o apagado
  → 400. El mail muestra sólo las instrucciones del medio elegido. Probado con
  el checkout real en base local y en el navegador (girly-store: ya no ofrece
  efectivo; amaranta: los tres).
- [x] ~~**2.6 Webhook contesta 200 antes de procesar y traga errores**: si falla, MP
  no reintenta y el pedido queda PENDING con la plata cobrada.~~ → Hecho (05/10):
  procesa antes de contestar; error inesperado → 500 y MP reintenta; un pago que
  MP no conoce (404/401/403) no pide reintento.
- [x] ~~**2.7 "Ocultar precios", modo consulta y sólo-mayorista no se respetan** en
  el checkout del servidor.~~ → Hecho (05/10): precios ocultos o rubro por
  consulta → 409; producto sólo mayorista en tienda sin mayorista → rechazado.
- [x] ~~**2.8 Carrito guardado con precios viejos**, y la misma clave de
  `localStorage` para todas las tiendas en `/tienda/<slug>`.~~ → Hecho (05/10):
  clave por tienda (`storefront_cart:<slug>`, migra la vieja una vez) y, al cargar
  el catálogo, cada línea toma el producto actual y lo que ya no existe se saca
  avisando cuál. Probado en el navegador con un carrito viejo (precio $1 →
  $37.000; "Producto Borrado" sacado con aviso; otra tienda arranca vacía). En la
  prueba apareció que la página carga DOS copias del módulo del carrito: la
  migración escribe la clave nueva en el acto para que la segunda la encuentre.
- [x] ~~**2.9 Cupón de premio**: se puede usar dos veces en simultáneo y no tiene el
  tope del 90 %.~~ → Hecho (05/10): se reserva con `updateMany` condicionado a
  AVAILABLE al aplicarlo, y el descuento usa `couponDiscountFor` (mismo tope). El
  endpoint `validar-premio` hace la misma cuenta. Probado: 2 compras simultáneas
  (descuenta una sola) y premio del 100% (ya no da $0).
- [x] ~~**2.10 Dos `approved` simultáneos** confirman dos veces (log, mails) o
  confirman un pedido recién cancelado.~~ → Hecho (05/10): candado en
  `runOrderAction`, que también cubre el doble clic del panel.
- [x] ~~**2.11 Chequeo de salud de MP** busca `provider: "mercadopago"` y las tiendas
  guardan `"mp"`.~~ → Hecho (05/10): `lib/proveedoresPago` con las listas de
  nombres. Y la señal cambió: "5+ intentos de pago MP en 3 días y ninguno
  aprobado" en vez de "sin pagos en 24 h" (que con pocas ventas avisaba falso).
- [x] ~~**2.12 (probable) El webhook no compara `collector_id`** con la cuenta MP de
  la tienda del pedido.~~ → Hecho (05/10): se compara con `mpSellerId`; sin
  `mpSellerId` (conexiones viejas) se deja pasar y se anota.
- [x] ~~**2.13 (probable) Dos preferencias para el mismo pedido** → se puede pagar
  dos veces.~~ → Hecho (05/10): un segundo pago aprobado distinto sobre un pedido
  ya cobrado avisa a la dueña (una vez) para que lo devuelva.
- [x] ~~**2.14 (probable) El servidor no exige dirección/ciudad/CP** para envíos.~~
  → Hecho (05/10): se exigen para todo envío que no sea retiro. De paso, los
  datos del comprador entran limpios (`limpiarComprador`: sólo texto, sin
  caracteres de control, con tope de largo; las notas conservan sus saltos):
  antes unas notas de megas viajaban a los mails y al panel.

## 3. Seguridad menor

- [x] ~~**3.1 Sello "compra verificada" con cualquier mail**, y la respuesta delata
  si ese mail compró.~~ → Hecho (05/10): el sello sale de una FIRMA (`lib/firmaResena`,
  HMAC del pedido + mail) que viaja en el link del mail de "tu pedido fue
  entregado"; la tienda la guarda (`firmaResenaCliente`) y los 7 formularios la
  mandan. Tipear un mail ya no da sello ni delata nada. Como el campo de email de
  las reseñas quedó sin uso, se sacó de todos los formularios (regla: ningún input
  por estar). Probado: 5 casos en base local + 3 tiendas en el navegador.
- [x] ~~**3.2 `?withSales=1` público** muestra unidades vendidas por producto.~~ → Hecho (05/10): sólo la dueña o un afiliado aprobado de esa tienda; a los demás, la respuesta normal (verificado sin sesión).
- [x] ~~**3.3 Seguimiento devuelve dirección completa** con sólo el código.~~ → Hecho (05/10): sólo nombre de pila, ciudad y provincia (lo que la página muestra). Probado en base local.
- [x] ~~**3.4 `instagramUrl`/`facebookUrl`/`tiktokUrl` sin validar** (hoy no se
  usan en un `href`).~~ → Hecho (05/10): `urlSegura` (http/https) para las redes,
  logo y banner, y `texto` (tope + sin caracteres de control) para nombre,
  bajada, descripción, barra, pie y SEO; el WhatsApp sólo dígitos y "+". Se
  revisaron las 12 tiendas reales: ningún valor actual se recorta ni se pierde.
- [x] ~~**3.5 Carritos abandonados aceptan texto libre sin tope.**~~ → Hecho (05/10):
  `itemsDeVerdad` arma cada línea con la base (producto de esa tienda, variante
  válida, nombre, foto https y precio reales; cantidad ≤ 99; talle/color ≤ 40).
  Nombre/teléfono no-texto ya no tiran 500. Probado en base local.

## 4. Pantallas — errores visibles (probados en vivo)

- [x] ~~**4.1 Boho 768: "Agregar al carrito" de la ficha queda fuera de la vista.**~~ → Hecho (05/10): el bloque de compra queda pegado al fondo de la columna (sticky). Verificado en vivo (amaranta, Buzo Hoody) a 768, 1024 y 1280.
- [x] ~~**4.2 Aire 768: links del encabezado pisan la marca y los íconos** (portada,
  ficha y `AireNav`).~~ → Hecho (05/10): el encabezado pasa a hamburguesa por
  debajo de 1024 (`navCompacta`), sin cambiar el resto del diseño. Medido en
  portada y ficha a 768/900/1024/1280: ningún elemento superpuesto, sin scroll
  horizontal; el menú abierto en tablet se ve bien.
- [x] ~~**4.3 Boho 360: galería de la ficha más ancha que el modal** (flecha
  intocable).~~ → Hecho (05/10): `minmax(0,1fr)` en la grilla del modal (y en dos
  secciones de Boho con el mismo patrón). Verificado a 360: la foto entra y la
  flecha queda adentro.
- [x] ~~**4.4 Chic 360: hamburguesa medio afuera; marca debajo del tilde.**~~ → Hecho (05/10): en celular Favoritos pasa de la barra al menú (con su contador). Medido en /preview/chic-paris: a 360 y 390 la hamburguesa y la ✕ quedan adentro; a 768 nada cambia.
- [x] ~~**4.5 Catálogo genérico 360: cartel de promo tapa el chip de categoría.**~~ → Hecho (05/10): con promo u oferta, el chip de categoría no se dibuja (un solo cartel arriba, como ya hacía el estilo "vidrio").
- [x] ~~**4.6 Barras de anuncio con texto pisado** (Aire ficha, Aurora 360, Boho 360).~~ → Hecho (05/10): el texto lleva margen para la ✕, una línea y puntos suspensivos (Aire, Aurora, Boho); la ficha de Aire usa las rayitas de 28×12 abajo como la portada; Aurora y Boho también (eran de 6×4) y la ✕ pasa a 36×36 con nombre. Verificado a 360 en las 4 barras.
- [x] ~~**4.7 Aurora 360: precio tachado debajo de la ✕ de la ficha.**~~ → Hecho (05/10): la ✕ pasa a fondo casi opaco con desenfoque; el contenido pasa por debajo sin mezclarse.
- [x] ~~**4.8 Escape no cierra** el checkout, el zoom de Aire ni el menú de Aire,
  Boho y Aurora.~~ → Hecho (05/10): el checkout es lo primero que cierra Escape
  (salvo mientras se envía); el zoom de la ficha escucha Escape; los menús de
  Aire, Boho y Aurora también, en captura como Chic. **En el camino:** en la
  ficha suelta, un Escape cualquiera vaciaba el producto del carrito y "Agregar
  al carrito" dejaba de andar → `fichaFija`. Probado en el navegador (ficha,
  checkout, zoom y los 3 menús).
- [x] ~~**4.9 "¡Últimas 1 unidades!".**~~ → Hecho (05/10): `avisoUltimas` en las 5 pantallas ("¡Última unidad!" con stock 1). Aurora ya lo decía bien.
- [x] ~~**4.10 Aire 1280: botón de volver sobre la barra de anuncios y el logo.**~~ → Hecho (05/10): el botón (y el gesto del celular) sólo aparece si el visitante llegó desde el listado de tiendas —antes lo veía también quien entraba desde el Instagram de la tienda, y lo mandaba a la competencia—, y va al borde izquierdo a media altura, lejos de los encabezados de los 10 templates. Probado: directo no aparece; desde /tiendas sí.

## 5. Usabilidad — para vender más

- [x] ~~**5.1 Talle preseleccionado**: pedir "Elegí tu talle".~~ → Hecho (05/10): al abrir la ficha se sigue eligiendo la combinación con stock (el color mueve la foto) pero el TALLE se suelta si hay más de uno (`sinTalleElegido`); "Agregar" avisa "Elegí talle". Probado en Boho (modal) y en la ficha de Aire.
- [x] ~~**5.2 Carrito sin lugar en el encabezado** en Boho, Urban, Chic y Aurora.~~ → Hecho (05/10): carrito con contador en el encabezado en computadora (en celular sigue el flotante: arriba no entra). Probado: abre el cajón en los 4; sin superposiciones a 1280/1024/900/768. De paso, en Aurora las zonas táctiles de los íconos se pisaban 4 px (gap 4 con margin -4): gap 8.
- [x] ~~**5.3 Objetivos táctiles chicos a 360** (× de anuncios, quitar del carrito,
  cerrar, ±, lupa de Boho, filtros del catálogo, agregar de Aire).~~ → Hecho
  (05/10): medido a 360 — ± del carrito y del checkout 36×36 (y con nombre),
  quitar 36×36, cerrar carrito/checkout 40×40, ✕ de anuncios 36×36 en Chic,
  Aurora y Boho, rayitas 28×12 en Chic, lupa de Boho 38×38, "+" de Aire 38×38
  en celular, filtros del catálogo con 10 px más arriba y abajo. El dibujo no
  cambia (margen negativo) salvo el "+" de Aire, que es un recuadro.
- [x] ~~**5.4 Provincias del checkout en orden ISO** (Salta primero).~~ → Hecho (05/10): Buenos Aires y CABA primero y después por nombre, en `lib/provincias` (vale para el checkout, el panel y los filtros). Las 24 siguen; nadie dependía del orden.
- [x] ~~**5.5 Carrito de Boho: "SUBTOTAL 1 pieza"** en vez del monto.~~ → Hecho (05/10): era el carrito compartido (los 5 templates). Ahora "Subtotal (1 pieza) $55.000 → Promoción −$11.000 → Total $44.000"; verificado en vivo.
- [ ] **5.6 Promo repetida tres veces** en las fichas de Boho y Urban.
- [ ] **5.7 Aire 768: filtros del catálogo ocupan toda la primera pantalla.**
- [ ] **5.8 Aire 360 sin nombre de tienda; Urban "AMARAN" cortado y logo sin link.**
- [ ] **5.9 Contraste**: colores de la tienda sin corrección (titular de Aire,
  "Nueva colección" de Chic).
- [ ] **5.10 Botones de sólo ícono sin `aria-label`** y tarjetas de Boho sin foco.

## Encontrado en el camino

- [x] El webhook **nunca confirmó un pedido de tienda** en producción (0 en el
  historial; sólo 3 pagos MP en total, ninguno aprobado): el camino no tenía uso
  real. Por eso se probó en una base local descartable.
- [x] Una devolución (`refunded`) sobre un pedido cobrado no revertía la comisión
  del afiliado ni avisaba: ahora sí, igual que el contracargo.
- [x] El historial del pedido en el detalle salía en inglés ("PENDING →
  CONFIRMED"); las dos pantallas usan `describirCambio`.
- [x] Los errores de `runOrderAction` llegaban al panel en jerga ("No se puede
  ejecutar 'cancel'…"): ahora en castellano.
- [x] El flyer de ofertas salía ENCIMA del aviso de vuelta de MP y tapaba sus
  botones: la vuelta de pago ahora pide turno con la prioridad más alta en
  `lib/interrupcion-tienda`; el flyer aparece después.
- [x] La dirección no se limpiaba al volver de MP (`router.replace` no la
  cambiaba): al recargar volvía a salir "¡Compra realizada!". Ahora
  `history.replaceState`.
- [x] Sin conexión al confirmar, el botón del checkout quedaba en "procesando"
  para siempre; y un doble clic rápido creaba dos pedidos.
- [x] **Error mío del 2.1, atrapado acá:** el vencimiento filtraba
  `provider: "mercadopago"`, pero el checkout guarda `"mp"` — los pedidos MP
  nuevos no habrían vencido nunca. Y el recordatorio se salteaba los guardados
  como `"transfer"`. Arreglado con `lib/proveedoresPago` y probado con los tres
  nombres (antes de subir nada).
- [x] La ficha suelta y el catálogo NO le pasaban al carrito los envíos ni los
  medios de la tienda: mostraban los de fábrica (con "Retiro gratis"). Con el
  1.5 el servidor los habría rechazado; ahora reciben los de la tienda.
- [x] Había TRES copias de "crear el pedido" (tienda, ficha suelta, catálogo) y
  las dos de afuera no mandaban la donación ni el cupón de premio: se perdían en
  silencio comprando desde esas pantallas. Ahora una sola, `crearPedido`.
- [ ] (menor, sin arreglar a propósito) Al llegar a una tienda navegando desde
  `/tiendas`, React avisa en desarrollo por el `<script>` que captura temprano el
  "instalá la app" (`tienda/[slug]/page.tsx`): en navegación interna no corre.
  No se pierde nada: el cartel escucha el evento por su cuenta. Sólo es ruido de
  desarrollo; `next/script` con `beforeInteractive` no se puede usar fuera del
  layout raíz.
- [x] El cartelito flotante (toast) de Aire y Boho anteponía "✓" a todo, también
  a los avisos que piden algo ("✓ Elegí talle"): se sacó (los otros tres no lo
  usaban) y se le sumó role="status".
