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
- [ ] **1.2 Datos bancarios públicos (CBU, alias, CUIL).** `paymentInfo` vive en
  `storeConfig`, que sale entero por `/api/public/<slug>` y en la página de la
  tienda, aun con la transferencia apagada o la tienda en "Próximamente".
- [ ] **1.3 Teléfono, nombre y ciudad de la dueña en el HTML aunque estén ocultos.**
  `verifiedInfo` se arma siempre con los datos; las banderas sólo deciden si se
  dibuja. `tienda/[slug]/page.tsx`, `tienda/[slug]/producto/[id]/page.tsx`.
- [ ] **1.4 Comisión de consulta con precio que manda el navegador.** `api/leads`
  (POST `productPrice`) y `api/leads/[id]` lo usan para acreditar al afiliado. Sin
  chequeo de que el producto sea de la tienda, sin topes, sin captcha.
- [ ] **1.5 Envío gratis sin querer / con un id inventado.** El carrito arranca en
  `"retiro"` aunque esté apagado; la pantalla suma el primer envío pero manda
  `"retiro"`, y el servidor cae a un retiro sin mirar `enabled`.

## 2. Importante — stock, cobros, pagos

- [ ] **2.1 Pedidos PENDING de tiendas no vencen nunca** y retienen stock y usos de
  cupón. Además "Intentá de nuevo" crea otro pedido, el carrito se vacía antes de
  ir a MP, y al volver con `?pago=error|pendiente` no hay mensaje.
- [ ] **2.2 Compra sin variante saltea el stock.** Sin `variantId` no se valida ni
  descuenta nada aunque el producto tenga variantes.
- [ ] **2.3 Variante con precio 0 (o negativo) se cobra así.** El servidor usa
  `variant.price ?? product.price`; el carrito ignora ≤ 0. Al guardar no se valida.
- [x] ~~**2.4 Cupón devuelto dos veces** al rechazarse un pago (`runOrderAction` y el
  webhook).~~ → Hecho (05/10): se fue con el 1.1, el webhook ya no cancela.
- [ ] **2.5 Medios de pago no respetan la configuración** (transferencia/efectivo
  siempre ofrecidos; "retirar" se guarda como `transfer`; MP sin conectar acepta el
  pedido y lo deja huérfano).
- [x] ~~**2.6 Webhook contesta 200 antes de procesar y traga errores**: si falla, MP
  no reintenta y el pedido queda PENDING con la plata cobrada.~~ → Hecho (05/10):
  procesa antes de contestar; error inesperado → 500 y MP reintenta; un pago que
  MP no conoce (404/401/403) no pide reintento.
- [ ] **2.7 "Ocultar precios", modo consulta y sólo-mayorista no se respetan** en
  el checkout del servidor.
- [ ] **2.8 Carrito guardado con precios viejos**, y la misma clave de
  `localStorage` para todas las tiendas en `/tienda/<slug>`.
- [ ] **2.9 Cupón de premio**: se puede usar dos veces en simultáneo y no tiene el
  tope del 90 %.
- [x] ~~**2.10 Dos `approved` simultáneos** confirman dos veces (log, mails) o
  confirman un pedido recién cancelado.~~ → Hecho (05/10): candado en
  `runOrderAction`, que también cubre el doble clic del panel.
- [ ] **2.11 Chequeo de salud de MP** busca `provider: "mercadopago"` y las tiendas
  guardan `"mp"`.
- [x] ~~**2.12 (probable) El webhook no compara `collector_id`** con la cuenta MP de
  la tienda del pedido.~~ → Hecho (05/10): se compara con `mpSellerId`; sin
  `mpSellerId` (conexiones viejas) se deja pasar y se anota.
- [ ] **2.13 (probable) Dos preferencias para el mismo pedido** → se puede pagar
  dos veces.
- [ ] **2.14 (probable) El servidor no exige dirección/ciudad/CP** para envíos.

## 3. Seguridad menor

- [ ] **3.1 Sello "compra verificada" con cualquier mail**, y la respuesta delata
  si ese mail compró.
- [ ] **3.2 `?withSales=1` público** muestra unidades vendidas por producto.
- [ ] **3.3 Seguimiento devuelve dirección completa** con sólo el código.
- [ ] **3.4 `instagramUrl`/`facebookUrl`/`tiktokUrl` sin validar** (hoy no se
  usan en un `href`).
- [ ] **3.5 Carritos abandonados aceptan texto libre sin tope.**

## 4. Pantallas — errores visibles (probados en vivo)

- [ ] **4.1 Boho 768: "Agregar al carrito" de la ficha queda fuera de la vista.**
- [ ] **4.2 Aire 768: links del encabezado pisan la marca y los íconos** (portada,
  ficha y `AireNav`).
- [ ] **4.3 Boho 360: galería de la ficha más ancha que el modal** (flecha
  intocable).
- [ ] **4.4 Chic 360: hamburguesa medio afuera; marca debajo del tilde.**
- [ ] **4.5 Catálogo genérico 360: cartel de promo tapa el chip de categoría.**
- [ ] **4.6 Barras de anuncio con texto pisado** (Aire ficha, Aurora 360, Boho 360).
- [ ] **4.7 Aurora 360: precio tachado debajo de la ✕ de la ficha.**
- [ ] **4.8 Escape no cierra** el checkout, el zoom de Aire ni el menú de Aire,
  Boho y Aurora.
- [ ] **4.9 "¡Últimas 1 unidades!".**
- [ ] **4.10 Aire 1280: botón de volver sobre la barra de anuncios y el logo.**

## 5. Usabilidad — para vender más

- [ ] **5.1 Talle preseleccionado**: pedir "Elegí tu talle".
- [ ] **5.2 Carrito sin lugar en el encabezado** en Boho, Urban, Chic y Aurora.
- [ ] **5.3 Objetivos táctiles chicos a 360** (× de anuncios, quitar del carrito,
  cerrar, ±, lupa de Boho, filtros del catálogo, agregar de Aire).
- [ ] **5.4 Provincias del checkout en orden ISO** (Salta primero).
- [ ] **5.5 Carrito de Boho: "SUBTOTAL 1 pieza"** en vez del monto.
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
