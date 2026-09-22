import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { normalizarContenido, variablesDePagina, buscarEstilo, diasDeGarantia } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { loQueFalta } from "@/lib/productos-digitales";
import { totalDeLaCompra, type ItemDeCompra } from "@/lib/compra-digital";
import { DIAS_DEL_PERMISO, MAX_DESCARGAS } from "@/lib/entrega-digital";
import CheckoutClient from "./CheckoutClient";
import VisitaDigital from "../VisitaDigital";
import { StoreTrackingScripts } from "@/components/store/StoreTrackingScripts";
import { medicionDelProducto, MONEDA_DIGITAL } from "@/lib/medicion-digital";
import { leerOfertaSalida, codigoDeLaOferta } from "@/lib/oferta-salida";
import { firmarOferta, leerTokenDeOferta, hayClaveDeFirma } from "@/lib/oferta-salida-firma";
import { isSubscriptionActive, SUB_STATUS_SELECT } from "@/lib/subscription";
import { dominioDeLaPlataforma } from "@/lib/configuracion-digital";
import { direccionBase } from "@/lib/enlaces-compartir";
import type { OfertaEnElCheckout, BienvenidaEnElCheckout } from "./CheckoutClient";
import { bienvenidaDeLaVisita, tokenDeBienvenidaDeLaCookie } from "@/lib/bienvenida-servidor";
import { ofertaUpsellDeLaVisita, tokenDeUpsellDeLaCookie } from "@/lib/oferta-upsell-servidor";
import { entraEnLaOferta } from "@/lib/oferta-upsell";
import type { OfertaDeUpsellEnElCheckout } from "./CheckoutClient";

/**
 * La pantalla de pago de un producto digital.
 *
 * ── Por qué no se puede configurar ──────────────────────────────────────────
 *
 * Los colores, la letra y la forma salen de `variablesDePagina`, la MISMA
 * función que dibuja la página de venta. No hay editor de checkout y no lo va a
 * haber: cada cosa configurable en la pantalla donde entra la plata es una forma
 * de romperla, y un checkout que se puede configurar aparte de su propia página
 * es un checkout que en algún momento va a contradecirla.
 *
 * ── Por qué los números se calculan acá y no en el navegador ────────────────
 *
 * Porque son los MISMOS que va a cobrar la ruta de compra: sale de
 * `totalDeLaCompra`, en `lib/compra-digital`. Con la cuenta escrita en la
 * pantalla, alcanza con tocar una para que diga un número y se cobre otro — y de
 * ese error se entera el comprador, con el resumen de la tarjeta en la mano.
 */

export const metadata: Metadata = {
  title: "Finalizar compra",
  /* Una pantalla de pago no se indexa: no aporta nada en un buscador y aparecer
     ahí sólo consigue que alguien entre por el medio del embudo, sin haber leído
     lo que está por comprar. */
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ oferta?: string; bienvenida?: string }> };

export default async function PantallaDePago({ params, searchParams }: Props) {
  const { id } = await params;
  const { oferta: tokenPedido, bienvenida: tokenDeBienvenidaPedido } = await searchParams;

  const fila = await prisma.product.findFirst({
    /* ⚠️ Sin `isActive` en el `where`, a propósito: se busca igual y se decide
       más abajo quién puede verlo. Ver `quiénPuedeVerla`. */
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL" },
    select: {
      id: true, name: true, price: true, comparePrice: true, archivoPath: true,
      rolDigital: true, paginaVenta: true, images: true, isActive: true, medicion: true, ofertaSalida: true, bienvenida: true, ofertaUpsell: true,
      store: {
        select: {
          id: true, isPublished: true, mpAccessToken: true, ownerId: true, storeConfig: true,
          owner: { select: { role: true, name: true, subscription: { select: SUB_STATUS_SELECT } } },
        },
      },
      hijos: {
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, name: true, description: true, price: true, comparePrice: true,
          rolDigital: true, padreId: true, images: true,
        },
      },
    },
  });

  /* La tienda de una cuenta digital nace y se queda despublicada: es el motor,
     nadie la ve. Una publicada es la tienda de alguien de verdad, y sus
     productos se venden por su propia puerta. Ver `espacioDigital`. */
  if (!fila || fila.store.isPublished || fila.store.owner.role !== "DIGITAL") notFound();

  /* ══════════════════════════════════════════════════════════════════════════
     QUIÉN PUEDE VERLA
     ══════════════════════════════════════════════════════════════════════════

     Antes esto era un `notFound()` seco: sin publicar o sin archivo, 404 para
     todo el mundo — incluida la dueña del producto, que sólo quería mirar cómo
     le quedó su propio checkout. Se topaba con un 404 pelado que no explica
     nada. Encontrado a mano el 03/09/26, y era una función a medias: la página
     de venta SÍ se le muestra a su dueña sin publicar, y el checkout no.

     Ahora sigue el mismo criterio que `/p/[id]`: si todavía no se puede vender,
     la ve la dueña y nadie más, marcada como previa y con el botón apagado.
     Ver el checkout no puede depender de publicar el producto. */
  /* ⚠️ Mercado Pago va ADENTRO de `loQueFalta` desde el 08/09/26, y por eso acá
     ya no se mira aparte: era la misma regla escrita en dos lados, con dos
     textos distintos. El orden no cambió —el cobro es la última de las cuatro—
     así que a la dueña se le sigue nombrando primero lo más grave. */
  const falta = loQueFalta({
    rolDigital: fila.rolDigital, archivoPath: fila.archivoPath,
    price: fila.price, name: fila.name,
    cobroConectado: !!fila.store.mpAccessToken,
  });
  const seLePuedeVender = fila.isActive && !falta;

  let avisoDePrevia: string | null = null;
  if (!seLePuedeVender) {
    const user = await getCurrentUser();
    /* Quien no es la dueña ve exactamente lo mismo que antes. */
    if (!user || user.id !== fila.store.ownerId) notFound();

    /* Y a ella se le dice QUÉ falta, en orden de qué tiene que resolver primero.
       Un 404 la dejaba adivinando entre tres cosas distintas. */
    avisoDePrevia =
      falta ?? "Este producto todavía no está publicado, así que sólo lo ves vos.";
  }

  const pagina = normalizarContenido(fila.paginaVenta);
  const estilo = buscarEstilo(pagina.estilo);

  const principal: ItemDeCompra = {
    id: fila.id, name: fila.name, price: fila.price, rolDigital: fila.rolDigital,
  };
  const bonos = fila.hijos.filter((h) => h.rolDigital === "BONO");
  const upsells = fila.hijos.filter((h) => h.rolDigital === "UPSELL" && h.price > 0);

  /* Los días de garantía que promete SU página, no un número escrito acá: la
     pantalla de pago no puede prometer algo distinto de la que trajo a la
     persona. Si esa sección está apagada, no se muestra el sello.

     ⚠️ Sale de la función compartida y no de una cuenta hecha acá: el mismo
     número lo lee el texto que se acepta antes de pagar y la ruta que lo guarda
     como prueba. Copiado en tres lados, el sello promete 30 días y la prueba
     guardada dice que no hay devolución. Ver `consentimiento-digital`. */
  const dias = diasDeGarantia(pagina);

  /* ── La oferta de salida ──────────────────────────────────────────────────
     Sólo si se puede vender, si está prendida y si el plan la incluye (Starter
     y Pro, al día). El plazo se firma ACÁ: si el link ya traía un token
     válido —el del mail de carrito— se respeta ése, así la cuenta corre desde
     que se lo mandaron y no desde que abrió. Ver `lib/oferta-salida`. */
  /* ── El precio de bienvenida ──────────────────────────────────────────────
     La MISMA función que la página de venta, con la cookie y el token que
     pueda venir en el link. Viva: el cupón se aplica solo en la pantalla.
     Y mientras corre, la oferta de salida no sale: sería un descuento
     arriba de otro. Vencida o nada: el checkout de siempre. */
  const tokenDeUpsellCookie = seLePuedeVender ? await tokenDeUpsellDeLaCookie(fila.id) : undefined;
  const b = seLePuedeVender ? await bienvenidaDeLaVisita(fila, [await tokenDeBienvenidaDeLaCookie(fila.id), tokenDeBienvenidaPedido]) : null;
  const bienvenida: BienvenidaEnElCheckout | null = b?.estado === "viva"
    ? { productId: fila.id, codigo: b.codigo, porcentaje: b.porcentaje, token: b.token, texto: b.texto }
    : null;
  const oferta = bienvenida ? null : await armarOferta(fila, seLePuedeVender, tokenPedido);

  /* ── La oferta del upsell ─────────────────────────────────────────────────
     El reloj de la caja "Sumá a tu compra". Manda sobre los upsells y sobre
     nada más: el principal vale lo mismo antes, durante y después.

     ⚠️ Convive con el precio de bienvenida sin pisarlo —no es un descuento
     arriba de otro, son dos productos distintos—, pero sólo uno de los dos
     relojes se dibuja: el de bienvenida está arriba, en el resumen, y éste
     adentro de la caja del upsell. Ver `lib/oferta-upsell`.

     El plazo se firma ACÁ y viaja a la pantalla, que lo guarda: recargar o
     volver desde Mercado Pago no lo reinicia. */
  const ofertaUpsell = ((): OfertaDeUpsellEnElCheckout | null => {
    if (!seLePuedeVender) return null;
    const hayAlguno = upsells.some((u) => entraEnLaOferta({ price: u.price, comparePrice: u.comparePrice }));
    const o = ofertaUpsellDeLaVisita(fila, [tokenDeUpsellCookie], hayAlguno);
    if (!o) return null;
    /* ⚠️ "Vencida" viaja, no se convierte en `null`. Son cosas distintas:
       sin oferta el upsell se muestra como siempre —su precio, y al lado el
       de lista tachado—, y vencida se muestra al precio de lista, que es el
       que se va a cobrar. Devolver `null` en los dos casos le mostraría el
       precio de oferta a quien ya lo perdió. */
    return o.estado === "viva"
      ? { estado: "viva", productoId: fila.id, token: o.token, texto: o.texto }
      : { estado: "vencida" };
  })();

  return (
    <div className={CLASES_FUENTES}>
      <div
        style={variablesDePagina(pagina) as React.CSSProperties}
        className="min-h-screen overflow-x-clip [overflow-wrap:anywhere] bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased"
      >
        {/* El segundo escalón del embudo: abrió el checkout. Con la previa de la
            dueña apagado; el servidor la descartaría igual. */}
        <VisitaDigital paso="pagar" productoId={fila.id} apagado={!seLePuedeVender} />
        {/* PageView + InitiateCheckout, con el precio del principal. Sólo cuando
            de verdad se puede comprar: la previa de la dueña no es un checkout. */}
        {seLePuedeVender && (() => {
          const m = medicionDelProducto(fila.medicion, fila.store.storeConfig);
          return (
            <StoreTrackingScripts
              facebookPixelId={m.pixelId}
              googleAnalyticsId={m.gaId}
              clarityProjectId={m.clarityId}
              initiateCheckout={{ contentId: fila.id, value: fila.price, currency: MONEDA_DIGITAL }}
            />
          );
        })()}
        <CheckoutClient
          productoId={fila.id}
          nombre={fila.name}
          imagen={primeraImagen(fila.images)}
          precio={fila.price}
          regular={fila.comparePrice && fila.comparePrice > fila.price ? fila.comparePrice : fila.price}
          bonos={bonos.map((b) => ({
            id: b.id, nombre: b.name,
            vale: b.comparePrice && b.comparePrice > 0 ? b.comparePrice : 0,
          }))}
          upsells={upsells.map((u) => ({
            id: u.id, nombre: u.name,
            descripcion: u.description,
            precio: u.price,
            regular: u.comparePrice && u.comparePrice > u.price ? u.comparePrice : null,
            imagen: primeraImagen(u.images),
            /* Si ESTE upsell entra en la oferta del reloj. El que no tiene
               precio de lista no entra: se muestra como siempre, aunque la
               oferta esté prendida para sus hermanos. Ver `entraEnLaOferta`. */
            conReloj: entraEnLaOferta({ price: u.price, comparePrice: u.comparePrice }),
          }))}
          /* El total de arranque, calculado por la misma función que cobra. */
          totalBase={totalDeLaCompra(principal, [])}
          diasDeGarantia={dias}
          diasDelEnlace={DIAS_DEL_PERMISO}
          maxDescargas={MAX_DESCARGAS}
          vendedor={fila.store.owner.name}
          /* Sin Mercado Pago conectado la pantalla no ofrece pagar: es preferible
             decirlo antes que dejar escribir el mail para fallar al final. */
          puedeCobrar={seLePuedeVender}
          avisoDePrevia={avisoDePrevia}
          botonRedondo={estilo.boton}
          tarjeta={estilo.tarjeta}
          oferta={oferta}
          bienvenida={bienvenida}
          ofertaUpsell={ofertaUpsell}
        />
      </div>
    </div>
  );
}

type FilaDelPago = {
  id: string; name: string; price: number; images: string; ofertaSalida: string | null; bienvenida: string | null;
  store: { id: string; owner: { subscription: { tier: string; status: string; trialEndsAt: Date; currentPeriodEnd: Date | null; gracePeriodEndsAt: Date | null } | null } };
};

async function armarOferta(fila: FilaDelPago, seLePuedeVender: boolean, tokenPedido: string | undefined): Promise<OfertaEnElCheckout | null> {
  const guardada = leerOfertaSalida(fila.ofertaSalida);
  if (!seLePuedeVender || !guardada.activa) return null;
  /* Sin clave no hay plazo que firmar: el checkout sale sin oferta, con el
     error en el log, en vez de un 500 en la pantalla de pago. */
  if (!hayClaveDeFirma("la oferta de salida")) return null;
  const sub = fila.store.owner.subscription;
  if (!sub || sub.tier === "FREE" || !isSubscriptionActive(sub)) return null;

  /* El plazo lo firma el servidor, desde ahora. Si el link ya traía uno
     vivo (el del mail), se respeta ése: es lo que se le prometió. */
  const token = leerTokenDeOferta(tokenPedido, fila.id) ? (tokenPedido as string) : firmarOferta(fila.id, Date.now() + guardada.horas * 3_600_000);
  const comun = { titulo: guardada.titulo, texto: guardada.texto, boton: guardada.boton, token };

  if (guardada.tipo === "DESCUENTO") {
    /* El cupón tiene que existir y estar prendido: si la dueña lo borró de
       Cupones, la oferta no se muestra en vez de prometer algo que al pagar
       no aplica. */
    const cupon = await prisma.cuponDigital.findUnique({
      where: { storeId_codigo: { storeId: fila.store.id, codigo: codigoDeLaOferta(fila.id) } },
      select: { activo: true, valor: true, tipo: true },
    });
    if (!cupon || !cupon.activo || cupon.tipo !== "PORCENTAJE") return null;
    return { ...comun, tipo: "DESCUENTO", codigo: codigoDeLaOferta(fila.id), porcentaje: cupon.valor, nombre: fila.name, imagen: primeraImagen(fila.images) };
  }

  if (!guardada.productoId) return null;
  const otro = await prisma.product.findFirst({
    where: { id: guardada.productoId, storeId: fila.store.id, rolDigital: "PRINCIPAL", deletedAt: null, isActive: true },
    select: { id: true, name: true, price: true, description: true, images: true, slugDigital: true, dominioPropio: true },
  });
  if (!otro || !(otro.price > 0)) return null;
  const base = direccionBase(otro, dominioDeLaPlataforma(), process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tiendaapps.com");
  return {
    ...comun, tipo: "PRODUCTO",
    producto: { nombre: otro.name, precio: otro.price, descripcion: recortar(otro.description), imagen: primeraImagen(otro.images), href: `${base.replace(/\/$/, "")}/pagar` },
  };
}

/** La descripción del otro producto, a un párrafo: el cartel no es su página. */
function recortar(texto: string | null): string | null {
  const t = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > 220 ? `${t.slice(0, 217).trimEnd()}…` : t;
}

/** La portada. Un JSON roto no puede tumbar la pantalla de pago. */
function primeraImagen(images: string): string | null {
  try {
    const lista = JSON.parse(images);
    return Array.isArray(lista) && typeof lista[0] === "string" ? lista[0] : null;
  } catch {
    return null;
  }
}
