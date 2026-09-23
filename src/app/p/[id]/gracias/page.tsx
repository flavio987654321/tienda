import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizarContenido, variablesDePagina, buscarEstilo, diasDeGarantia } from "@/lib/pagina-venta";
import { CLASES_FUENTES } from "@/lib/fuentes-venta";
import { DIAS_DEL_PERMISO, MAX_DESCARGAS } from "@/lib/entrega-digital";
import { TOPES_DIGITALES } from "@/lib/planLimits";
import GraciasClient from "./GraciasClient";
import { StoreTrackingScripts } from "@/components/store/StoreTrackingScripts";
import { medicionDelProducto } from "@/lib/medicion-digital";
import { SUB_STATUS_SELECT } from "@/lib/subscription";
import { ofertaUpsellDeLaVisita, tokenDeUpsellDeLaCookie } from "@/lib/oferta-upsell-servidor";
import { entraEnLaOferta, type OfertaDeUpsellEnPantalla } from "@/lib/oferta-upsell";

/** Lo más que puede llevar una orden de un embudo, con el doble de margen. */
const TECHO_DE_UNA_ORDEN =
  (1 + TOPES_DIGITALES.PRO.bonos + TOPES_DIGITALES.PRO.upsells) * 2;

/**
 * La pantalla de después de pagar.
 *
 * ── Por qué el archivo se baja ACÁ y además se manda por mail ───────────────
 *
 * Decidido el 03/09/26. Las dos cosas, y cada una tapa el agujero de la otra:
 * el enlace en pantalla se baja al toque, sin esperar nada; y el mail queda
 * guardado para quien cierra la pestaña antes de bajarlo, o quiere el archivo
 * dos semanas después. Un mail solo deja esperando a alguien que ya pagó cuando
 * cae en promociones; una pantalla sola pierde a todo el que cierra sin bajar.
 *
 * ── La carrera que resuelve `GraciasClient` ─────────────────────────────────
 *
 * La preferencia va con `auto_return: "approved"`, así que Mercado Pago devuelve
 * a la persona acá **apenas aprueba**, y el aviso que emite los permisos llega
 * por otro camino unos segundos después. O sea que esta página carga casi
 * siempre con la compra todavía sin confirmar. Por eso el estado se pregunta
 * desde el navegador y los botones aparecen solos.
 */

export const metadata: Metadata = {
  title: "¡Gracias por tu compra!",
  /* No se indexa: es una pantalla personal de alguien que ya pagó. */
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Gracias({ params, searchParams }: Props) {
  const { id } = await params;
  const q = await searchParams;
  const ordenId = typeof q.orden === "string" ? q.orden : null;

  const fila = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL" },
    select: {
      id: true, name: true, paginaVenta: true, medicion: true, ofertaUpsell: true,
      store: {
        select: {
          isPublished: true, storeConfig: true,
          /* La suscripción, para que la oferta del upsell se apague sola si el
             plan venció: es la misma regla que en el checkout y la decide la
             misma función. Ver `lib/oferta-upsell-servidor`. */
          owner: { select: { role: true, name: true, subscription: { select: SUB_STATUS_SELECT } } },
        },
      },
      /* Los upsells que todavía se pueden ofrecer. La oferta de después de pagar
         es el mismo producto del embudo, no una lista aparte. */
      hijos: {
        where: { deletedAt: null, isActive: true, rolDigital: "UPSELL" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, description: true, price: true, comparePrice: true, images: true },
      },
    },
  });

  if (!fila || fila.store.isPublished || fila.store.owner.role !== "DIGITAL") notFound();

  const pagina = normalizarContenido(fila.paginaVenta);
  const estilo = buscarEstilo(pagina.estilo);

  /* Qué upsells NO compró todavía. Ofrecerle de nuevo algo que acaba de pagar es
     la forma más rápida de que alguien desconfíe de una pantalla de cobro. */
  const yaComprados = ordenId
    ? (await prisma.orderItem.findMany({
        where: { orderId: ordenId },
        select: { productId: true },
        /* Una orden de un embudo no puede tener más líneas que el embudo: un
           principal, sus bonos y sus upsells. El techo sale de los topes del
           plan más alto, con margen, y no de un número escrito acá.

           Está acotada por naturaleza y el techo va igual, por lo mismo que en
           la pantalla de Productos: una consulta de lista sin límite anda con
           diez filas y se cae con diez mil, y se descubre en producción. Hay un
           chequeo que recorre todo el ecosistema exigiéndolo. */
        take: TECHO_DE_UNA_ORDEN,
      })).map((i) => i.productId)
    : [];

  /* ── La oferta del upsell, también acá ────────────────────────────────────
     El reloj que arrancó en el checkout SIGUE corriendo en esta pantalla, y
     si se terminó, acá también se terminó.

     ⚠️ Sin esto, a quien se le vencía el reloj en el checkout le volvíamos a
     ofrecer el MISMO upsell al precio de oferta dos minutos después de
     haberle dicho "se terminó, queda el precio de siempre". Nadie pagaba de
     más —el de oferta es el más barato—, pero quien lo notara aprendía que
     el reloj era de mentira. Y todo esto existe para que no lo sea.

     ⚠️ `firmarSiNoHay: false`: esta pantalla NO arranca plazos. El reloj
     empieza cuando la persona abre el pago y en ningún otro lado. Sin eso,
     quien abriera el recibo en otro teléfono —sin la cookie— se llevaría
     minutos nuevos que nadie le prometió. */
  const o = ofertaUpsellDeLaVisita(
    fila,
    [await tokenDeUpsellDeLaCookie(fila.id)],
    fila.hijos.some((u) => entraEnLaOferta({ price: u.price, comparePrice: u.comparePrice })),
    { firmarSiNoHay: false },
  );
  const ofertaUpsell: OfertaDeUpsellEnPantalla | null = !o
    ? null
    /* "Vencida" viaja, no se convierte en `null`: sin oferta el extra se
       muestra como siempre, y vencida al precio de lista, que es el que se
       va a cobrar. Igual que en el checkout. */
    : o.estado === "viva"
      ? { estado: "viva", productoId: fila.id, token: o.token, texto: o.texto }
      : { estado: "vencida" };

  return (
    <div className={CLASES_FUENTES}>
      <div
        style={variablesDePagina(pagina) as React.CSSProperties}
        className="min-h-screen overflow-x-clip [overflow-wrap:anywhere] bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased"
      >
        {/* PageView acá; Purchase lo dispara GraciasClient cuando la compra se
            confirma de verdad, una vez por orden. Ver `lib/medicion-digital`. */}
        {(() => {
          const m = medicionDelProducto(fila.medicion, fila.store.storeConfig);
          return <StoreTrackingScripts facebookPixelId={m.pixelId} googleAnalyticsId={m.gaId} clarityProjectId={m.clarityId} />;
        })()}
        <GraciasClient
          productoId={fila.id}
          nombre={fila.name}
          ordenId={ordenId}
          diasDelEnlace={DIAS_DEL_PERMISO}
          maxDescargas={MAX_DESCARGAS}
          vendedor={fila.store.owner.name}
          /* Para el texto que se acepta al sumar la oferta de después de pagar:
             si la página promete garantía, el consentimiento la nombra en vez de
             contradecirla. Misma función que el sello del checkout. */
          diasDeGarantia={diasDeGarantia(pagina)}
          botonRedondo={estilo.boton}
          tarjeta={estilo.tarjeta}
          upsells={fila.hijos
            .filter((u) => u.price > 0 && !yaComprados.includes(u.id))
            .map((u) => ({
              id: u.id,
              nombre: u.name,
              descripcion: u.description,
              precio: u.price,
              regular: u.comparePrice && u.comparePrice > u.price ? u.comparePrice : null,
            }))}
          ofertaUpsell={ofertaUpsell}
        />
      </div>
    </div>
  );
}
