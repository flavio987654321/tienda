import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCheckoutPreference, decryptToken } from "@/lib/mp";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { normalizarEmail } from "@/lib/newsletter";
import { limpiarTexto } from "@/lib/texto-limpio";
import { textoQueAcepto } from "@/lib/consentimiento-digital";
import { normalizarContenido, diasDeGarantia } from "@/lib/pagina-venta";
import { loQueFalta } from "@/lib/productos-digitales";
import { COMISION_DIGITAL } from "@/lib/planLimits";
import { clasificarOrigen } from "@/lib/origen-visita";
import { campaniaDe } from "@/lib/utm-digital";
import type { TierDigital } from "@/lib/planes-digitales";
import {
  totalDeLaCompra, totalDelAgregado, comisionDeLaVenta, armarItems, itemsDelAgregado, upsellsQueValen,
  MAX_UPSELLS_POR_COMPRA, type ItemDeCompra,
} from "@/lib/compra-digital";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/* Mismo formato que valida el resto de la cadena de pagos: cuid de Prisma o UUID. */
const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/* Largos de lo que se escribe en el checkout. Cortos: son para reconocer a la
   persona y para el mail de recuperación, no para escribir una carta. */
const LARGO_NOMBRE = 80;

/* Cuánto vale una orden a medio pagar antes de empezar otra. Ver `PENDIENTE`. */
const MINUTOS_DE_LA_ORDEN = 30;

/**
 * Arranca la compra de un producto digital: crea la orden y devuelve el link de
 * Mercado Pago.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA PRIMERA RUTA PÚBLICA DE DIGITALES
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Las siete anteriores exigen sesión y rol DIGITAL, así que ya venían con dueño.
 * Ésta la llama **cualquiera desde internet**, sin cuenta y sin haber pasado por
 * ningún lado. Todo lo que la protege está escrito acá adentro.
 *
 * ── Por qué el comprador no se registra ─────────────────────────────────────
 *
 * Porque cada campo entre el botón y el pago es gente que se va, y para entregar
 * un PDF alcanza con el mail. Igual queda una `User` con rol BUYER detrás —
 * `Order.buyerId` la exige, y es el mismo camino que ya usa el checkout de
 * tiendas—. Si ese correo YA tiene cuenta, se reusa **y no se toca**: alguien
 * que vende también puede comprar, y su cuenta no se pisa desde acá.
 *
 * ── De dónde salen los precios ──────────────────────────────────────────────
 *
 * De la base, nunca del pedido. Lo que manda el navegador son identificadores.
 * Si el precio viniera en el cuerpo, cualquiera compra un ebook a un peso
 * cambiando un número en la consola — y no habría forma de darse cuenta.
 */
export async function POST(req: NextRequest) {
  /* ⚠️ Límite por IP. Cada pedido que pasa de acá le pide una preferencia a
     Mercado Pago con el token del vendedor y le escribe una orden a la base.
     Sin techo, esto es una forma gratis de llenarle la base a cualquiera y de
     quemarle el rate limit de MP a un comerciante que no hizo nada.

     El número es más alto que el de `mp-checkout` (10) porque acá una compra son
     dos intentos normales —volver atrás y reintentar es común— pero sigue lejos
     de lo que hace falta para molestar. */
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`digital-comprar:${ip}`, 15, 60_000))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un minuto y probá de nuevo." },
      { status: 429 },
    );
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "No entendimos el pedido." }, { status: 400 });
  }

  const productoId = cuerpo.productoId;
  if (typeof productoId !== "string" || !ID_RE.test(productoId)) {
    return NextResponse.json({ error: "No sabemos qué producto querés comprar." }, { status: 400 });
  }

  /**
   * ── Un AGREGADO: la oferta de después de pagar ────────────────────────────
   *
   * Cuando viene el identificador de una compra ya confirmada, esto es un
   * agregado: se cobran SÓLO los upsells, sin el principal ni los bonos, porque
   * la persona ya los pagó y ya los tiene.
   *
   * ⚠️ Y el correo sale de ESA orden, nunca del pedido. Es la diferencia entre
   * "agregale esto a mi compra" y "agregale esto a la compra de cualquiera": con
   * el mail viniendo del navegador, alguien con un identificador de orden ajeno
   * podría colgarle una compra al correo de otra persona.
   */
  const ordenPrevia =
    typeof cuerpo.ordenPrevia === "string" && ID_RE.test(cuerpo.ordenPrevia)
      ? cuerpo.ordenPrevia
      : null;

  /* El mail es obligatorio en una compra nueva, y es a donde va el archivo. Se
     normaliza a minúsculas: es la identidad del comprador y del carrito
     abandonado, así que "Ana@X.com" y "ana@x.com" tienen que ser la misma
     persona o se le duplica la cuenta y se le pierde la compra. */
  const emailDelPedido = normalizarEmail(cuerpo.email);
  if (!ordenPrevia && !emailDelPedido) {
    return NextResponse.json(
      { error: "Escribí un correo válido: es a donde te mandamos el archivo." },
      { status: 400 },
    );
  }

  /* Opcional, y opcional a propósito: pedirlo obligatorio espanta antes de que el
     mail quede escrito, y ahí se pierde la venta Y la recuperación. Se usa para
     saludar en el mail de entrega. */
  const nombre = limpiarTexto(cuerpo.nombre, LARGO_NOMBRE);

  /* ══════════════════════════════════════════════════════════════════════
     EL CONSENTIMIENTO, Y POR QUÉ SE FRENA ACÁ Y NO EN LA PANTALLA
     ══════════════════════════════════════════════════════════════════════

     Es la única defensa que hay contra "compré, bajé el PDF y a los dos días
     pedí la plata de vuelta". Ver el archivo `consentimiento-digital`.

     La casilla ya está en el checkout y el botón no se prende sin ella, pero eso
     lo controla el navegador: quien pega derecho contra esta ruta no pasa por
     ninguna pantalla. Si el freno viviera sólo allá, la prueba faltaría justo en
     las compras que después se discuten.

     ⚠️ Y se compara contra `true` exacto, no por verdadero. `"false"`, `1` y
     `"no"` son todos verdaderos en JavaScript, y esto lo escribe quien llama. */
  if (cuerpo.acepto !== true) {
    return NextResponse.json(
      { error: "Marcá la casilla para poder seguir." },
      { status: 400 },
    );
  }

  /* De dónde vino la visita que termina acá, para Estadísticas. Lo anotó la
     página de venta al entrar y llega crudo; la etiqueta sale de la lista
     cerrada de `origen-visita`, nunca del texto que mande el navegador. Sin
     nada anotado queda en null —no "directo": no saber no es lo mismo que
     haber entrado derecho—. Es una métrica: si falta o viene rota, la compra
     sigue igual. */
  const origenCrudo = (cuerpo.origen ?? null) as {
    referente?: unknown; utmSource?: unknown; utmMedium?: unknown; utmCampaign?: unknown; utmContent?: unknown;
  } | null;
  const referenteCrudo = typeof origenCrudo?.referente === "string" ? origenCrudo.referente.trim() : "";
  const utmCrudo = typeof origenCrudo?.utmSource === "string" ? origenCrudo.utmSource.trim() : "";
  /* Sólo se clasifica si hay algo que clasificar: un `origen` vacío, un
     arreglo o un objeto sin nada adentro es "no sé", y clasificar la nada
     daría "directo", que es una afirmación. */
  const origenVisita =
    referenteCrudo || utmCrudo
      ? clasificarOrigen(referenteCrudo || null, utmCrudo || null, req.headers.get("host"), false)
      : null;
  /* Y la campaña, limpia y con el medio a lista cerrada, si la visita traía
     una. Sin utm_source no hay campaña, como en el ping. */
  const campania = campaniaDe(
    { medium: origenCrudo?.utmMedium, campaign: origenCrudo?.utmCampaign, content: origenCrudo?.utmContent },
    utmCrudo,
  );
  /* El texto exacto se arma más abajo, cuando ya se leyó la página: necesita
     saber si promete garantía. Acá sólo se corta el pedido que no aceptó. */

  /* ⚠️ EL TELÉFONO NO SE PIDE TODAVÍA, y es a propósito.
   *
   * Va a hacer falta para recuperar carritos por WhatsApp, pero hoy no lo lee
   * NADIE, por dos motivos que se verificaron el 03/09/26:
   *
   *   1. El cron levanta carritos con `store: { isPublished: true }`, y la tienda
   *      de una cuenta digital nace y se queda DESPUBLICADA — es sólo el motor.
   *      O sea que un carrito digital no lo tomaría nunca ninguna corrida.
   *   2. El mail de recuperación arma el link como `/tienda/<slug>`, que en una
   *      cuenta digital no lleva a ningún lado, y lo firma con el nombre de esa
   *      tienda invisible ("Mis productos digitales").
   *
   * Guardar el teléfono de cada comprador para que no lo lea nadie es juntar
   * datos personales sin uso. Vuelve —al pedido y a la pantalla— en el mismo
   * cambio que haga andar la recuperación de carritos digitales. */

  if (Array.isArray(cuerpo.upsells) && cuerpo.upsells.length > MAX_UPSELLS_POR_COMPRA) {
    return NextResponse.json({ error: "Demasiados agregados." }, { status: 400 });
  }

  /* ── El producto, con todo lo que hace falta para cobrarlo ──────────────── */

  const producto = await prisma.product.findFirst({
    where: {
      id: productoId,
      deletedAt: null,
      rolDigital: "PRINCIPAL",
      /* Publicado. Sin esto se le puede comprar a una página que su dueña bajó
         a propósito, con sólo tener el link viejo. */
      isActive: true,
    },
    select: {
      id: true, name: true, price: true, archivoPath: true, rolDigital: true,
      /* Sólo para saber si promete garantía. Ver el bloque del consentimiento. */
      paginaVenta: true,
      store: {
        select: {
          id: true, ownerId: true, mpAccessToken: true, isPublished: true,
          owner: { select: { role: true, subscription: { select: { tier: true, plan: true } } } },
        },
      },
      hijos: {
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, price: true, rolDigital: true, padreId: true, archivoPath: true },
      },
    },
  });

  if (!producto) {
    return NextResponse.json({ error: "Esta página ya no está disponible." }, { status: 404 });
  }

  /* ⚠️ La tienda de una cuenta digital NACE Y SE QUEDA despublicada — es sólo el
     motor, nadie la ve. Una publicada es la tienda de alguien de verdad, y sus
     productos no se venden por esta puerta: tienen la suya, con envíos, cupones
     y stock. Ver `espacioDigital`. */
  if (producto.store.isPublished || producto.store.owner.role !== "DIGITAL") {
    return NextResponse.json({ error: "Esta página ya no está disponible." }, { status: 404 });
  }

  /* ⚠️ Sin Mercado Pago conectado no hay cobro posible, y se dice CLARO: el que
     lee esto es un comprador, no la dueña. No es su culpa y no puede hacer nada,
     así que el mensaje no le pide que arregle nada.

     ⚠️ Y VA ANTES DE `loQueFalta`, que desde el 08/09/26 también mira el cobro.
     Si fuera después no se ejecutaría nunca: aquél cortaría primero y el
     comprador leería el "no está disponible ahora mismo" genérico en lugar de
     este mensaje, que es el único de los dos que le dice qué pasó. */
  if (!producto.store.mpAccessToken) {
    return NextResponse.json(
      { error: "Quien vende todavía no terminó de configurar los cobros. Probá más tarde." },
      { status: 409 },
    );
  }

  /* La misma puerta que no deja publicar. Se vuelve a mirar acá porque entre
     "publicar" y "comprar" pueden pasar días: el archivo se pudo haber caído, o
     se pudo haber desconectado Mercado Pago. */
  const falta = loQueFalta({
    rolDigital: producto.rolDigital,
    archivoPath: producto.archivoPath,
    price: producto.price,
    name: producto.name,
    cobroConectado: !!producto.store.mpAccessToken,
  });
  if (falta) {
    return NextResponse.json({ error: "Esta compra no está disponible ahora mismo." }, { status: 409 });
  }
  /* ⚠️ EL TEXTO QUE SE GUARDA COMO PRUEBA, armado ACÁ y no en la pantalla.
     Sale de la misma función que dibuja el sello de garantía del checkout, así
     que lo prometido y lo aceptado no pueden decir cosas distintas. Y si la
     página promete garantía, el texto la NOMBRA en vez de contradecirla:
     prometer 30 días es el "pacto en contrario" del art. 1116, y le gana a la
     excepción. Ver `consentimiento-digital`. */
  const textoAceptado = textoQueAcepto(
    !!ordenPrevia,
    diasDeGarantia(normalizarContenido(producto.paginaVenta)),
  );

  const tokenDelVendedor = decryptToken(producto.store.mpAccessToken);
  if (!tokenDelVendedor) {
    console.error("[digital-comprar] token de MP ilegible, tienda", producto.store.id);
    return NextResponse.json({ error: "No pudimos iniciar el pago. Probá más tarde." }, { status: 502 });
  }

  /* ── Qué se lleva ───────────────────────────────────────────────────────── */

  const principal: ItemDeCompra = {
    id: producto.id, name: producto.name, price: producto.price, rolDigital: producto.rolDigital,
  };

  /* Los bonos NO se eligen: van todos los que estén publicados, porque son parte
     del producto. Que el navegador pudiera elegirlos sería darle a elegir qué se
     lleva gratis, y la página ya prometió todos. */
  const bonos: ItemDeCompra[] = producto.hijos
    .filter((h) => h.rolDigital === "BONO")
    .map((h) => ({ id: h.id, name: h.name, price: h.price, rolDigital: h.rolDigital }));

  const upsells = upsellsQueValen(cuerpo.upsells, producto.hijos, producto.id);

  /* ── Si es un agregado, de quién y sobre qué ───────────────────────────── */

  let compradorPrevio: { id: string; email: string } | null = null;
  if (ordenPrevia) {
    const previa = await prisma.order.findFirst({
      where: {
        id: ordenPrevia,
        /* ⚠️ De ESTA tienda. Sin esto, el identificador de una orden de otro
           vendedor serviría para agregarle un upsell nuestro a su compra. */
        storeId: producto.store.id,
        /* Y ya pagada. Colgar un agregado de una orden pendiente permitiría
           armar compras encadenadas sin haber pagado ninguna. */
        status: "CONFIRMED",
      },
      select: { buyer: { select: { id: true, email: true } } },
    });
    if (!previa) {
      return NextResponse.json(
        { error: "No encontramos tu compra anterior. Probá desde la página del producto." },
        { status: 404 },
      );
    }
    compradorPrevio = previa.buyer;

    if (upsells.length === 0) {
      return NextResponse.json({ error: "No hay nada para agregar." }, { status: 400 });
    }
  }

  /* Un agregado cobra SÓLO los upsells: el principal y los bonos ya están
     pagados y entregados. Cobrarlos de nuevo sería el peor error posible en la
     pantalla que aparece justo después de pagar. */
  const total = ordenPrevia ? totalDelAgregado(upsells) : totalDeLaCompra(principal, upsells);
  if (!(total > 0)) {
    return NextResponse.json({ error: "Esta compra no está disponible ahora mismo." }, { status: 409 });
  }

  /* ── Qué comisión le corresponde ────────────────────────────────────────
   *
   * Se lee `tier` CRUDO de la suscripción, que es exactamente lo que lee el
   * panel del vendedor (`digitales/layout.tsx`). Y ésa es la razón: si acá
   * usáramos una regla más fina que la de su pantalla, su panel podría decirle
   * "Plan Pro, 2%" mientras le retenemos 8%. **Cobrarle distinto de lo que se le
   * muestra es peor que cualquier desfasaje.**
   *
   * El desfasaje existe y está acotado: cuando una suscripción vence, es el cron
   * diario el que escribe `tier: "FREE"` (ver `caidaAFree`). O sea que hay hasta
   * 24 horas en las que una vencida todavía paga la comisión de su plan viejo —
   * menos de lo que debería, a favor del vendedor, y se corrige solo.
   *
   * Un tier que no reconocemos cae a FREE, igual que el panel.
   */
  const tierCrudo = producto.store.owner.subscription?.tier;
  const tier: TierDigital =
    tierCrudo === "STARTER" || tierCrudo === "PRO" ? tierCrudo : "FREE";

  /* Se CONGELA acá: si mañana el vendedor cambia de plan, esta venta ya cobrada
     tiene que seguir diciendo lo que se cobró. Un mes cerrado no cambia solo. */
  const comision = comisionDeLaVenta(total, tier);

  /* ── La orden ───────────────────────────────────────────────────────────── */

  let orden: { id: string };
  try {
    orden = await prisma.$transaction(async (tx) => {
      /* ⚠️ Nunca se ACTUALIZA una cuenta que ya existe desde acá. Si el correo es
         de alguien que vende, se reusa su `User` para colgarle la orden y no se
         le toca ni el nombre ni el rol. Mismo criterio que el checkout de
         tiendas, y por el mismo motivo: una cuenta es una sola cosa. */
      /* En un agregado el comprador ya está resuelto y sale de la orden
         anterior, así que ni se busca ni se crea nada. */
      const comprador = compradorPrevio ?? (
        (await tx.user.findUnique({ where: { email: emailDelPedido! }, select: { id: true } })) ??
        (await tx.user.create({
          data: { email: emailDelPedido!, name: nombre, role: "BUYER" },
          select: { id: true },
        }))
      );

      /* ⚠️ EL FRENO DEL DOBLE CLICK, y de algo peor: volver atrás desde Mercado
         Pago y apretar Pagar otra vez. Sin esto, cada intento deja una orden
         PENDING colgada; el panel de ventas del vendedor se llena de compras que
         nunca fueron y las métricas mienten.

         Se reusa la orden pendiente de ESTA persona por ESTO mismo si es
         reciente y por el mismo importe. Distinto importe = agregó o sacó un
         upsell, y eso sí es otra compra.

         ⚠️ La condición mira los productos que ESTA orden va a tener, no el
         principal. Buscaba `productId: producto.id` —el principal— y un AGREGADO
         no lo lleva: sólo lleva el upsell. O sea que el freno no agarraba nunca
         en la oferta de después de pagar, y cada clic dejaba una orden pendiente
         nueva. Encontrado releyendo, el 03/09/26. */
      const loQueVaEnLaOrden = ordenPrevia
        ? upsells.map((u) => u.id)
        : [producto.id, ...upsells.map((u) => u.id)];
      const desde = new Date(Date.now() - MINUTOS_DE_LA_ORDEN * 60 * 1000);
      const pendiente = await tx.order.findFirst({
        where: {
          buyerId: comprador.id,
          storeId: producto.store.id,
          status: "PENDING",
          total,
          createdAt: { gte: desde },
          items: { some: { productId: { in: loQueVaEnLaOrden } } },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      if (pendiente) return pendiente;

      return tx.order.create({
        data: {
          status: "PENDING",
          total,
          subtotal: total,
          shippingCost: 0,
          buyerId: comprador.id,
          storeId: producto.store.id,
          /* ⚠️ Acá va el PORCENTAJE de la comisión de la plataforma, no la de un
             afiliado y no el monto.
             Es el mismo campo porque literalmente es eso —el porcentaje
             congelado al momento de la venta— y porque las tres rutas que mueven
             plata en tiendas (`mp/checkout`, `mp/webhook`, `orderActions`)
             preguntan `order.affiliateId &&` antes de mirarlo. Una venta digital
             nunca tiene afiliado, así que ninguna lo toca. Revisadas una por una
             el 03/09/26, y hay chequeo que lo cuida.
             Lo que sí lo lee sin preguntar por el afiliado son dos PANTALLAS del
             panel de tiendas, a donde una orden digital no llega: ese panel es
             de rol OWNER y esta tienda es de una cuenta DIGITAL. */
          lockedCommissionRate: COMISION_DIGITAL[tier],
          /* La prueba del art. 1116, congelada con la orden: cuándo, desde dónde
             y qué texto decía la pantalla. Ver `consentimiento-digital`. */
          digitalConsentAt: new Date(),
          digitalConsentIp: ip,
          digitalConsentTexto: textoAceptado,
          origenVisita,
          utmMedio: campania?.medio ?? null,
          utmCampania: campania?.campania ?? null,
          utmAnuncio: campania ? campania.anuncio || null : null,
          items: { create: ordenPrevia ? itemsDelAgregado(upsells) : armarItems(principal, bonos, upsells) },
          /* ⚠️ La fila de pago nace con la orden, igual que en el checkout de
             tiendas. El webhook la busca por `orderId` para marcarla aprobada y
             guardar el identificador de Mercado Pago: sin ella, el aviso de pago
             no tendría qué actualizar y la venta quedaría sin comprobante. */
          payment: {
            create: { provider: "mercadopago", status: "PENDING", amount: total, currency: "ARS" },
          },
        },
        select: { id: true },
      });
    });
  } catch (e) {
    console.error("[digital-comprar] no se pudo crear la orden:", e);
    return NextResponse.json({ error: "No pudimos iniciar la compra. Probá de nuevo." }, { status: 500 });
  }

  /* ── La preferencia de Mercado Pago ─────────────────────────────────────── */

  /* ⚠️ SIEMPRE UN SOLO ÍTEM con el total exacto de la orden. Reconstruirlo
     sumando líneas ya cobró un peso de más en el otro ecosistema (ver el
     comentario largo en `api/mp/checkout`): el unitario está redondeado y el
     total no es la suma de los redondeos. El desglose de lo que se lleva la
     persona vive en la orden y en el mail, no en la pantalla de MP. */
  const items = [{
    id: orden.id,
    title: ordenPrevia
      ? upsells.map((u) => u.name).join(" + ")
      : upsells.length > 0 ? `${producto.name} + ${upsells.length} más` : producto.name,
    unit_price: total,
    quantity: 1,
  }];

  const MP_TIMEOUT_MS = 10_000;
  const reloj = new Promise<never>((_, rechazar) =>
    setTimeout(() => rechazar(new Error("Mercado Pago no respondió")), MP_TIMEOUT_MS),
  );

  let pref: Awaited<ReturnType<typeof createCheckoutPreference>>;
  try {
    pref = await Promise.race([
      createCheckoutPreference({
        sellerAccessToken: tokenDelVendedor,
        items,
        marketplaceFee: comision,
        externalReference: orden.id,
        /* ⚠️ Las tres URLs se arman ACÁ con datos nuestros. Nada de lo que mandó
           el navegador entra en ellas: es la dirección a la que vuelve alguien
           que acaba de pagar, y dejar que la elija quien llama a esta ruta es
           regalarle a dónde mandar a un comprador con la plata ya puesta. */
        backUrls: {
          success: `${APP_URL}/p/${producto.id}/gracias?orden=${orden.id}`,
          failure: `${APP_URL}/p/${producto.id}?pago=error`,
          pending: `${APP_URL}/p/${producto.id}/gracias?orden=${orden.id}&pendiente=1`,
        },
        notificationUrl: `${APP_URL}/api/digitales/cobro`,
      }),
      reloj,
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    console.error("[digital-comprar] preferencia:", msg);
    return NextResponse.json(
      { error: "No pudimos abrir el pago. Probá de nuevo en un momento." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ordenId: orden.id, initPoint: pref.init_point });
}
