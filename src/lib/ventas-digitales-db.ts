import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserSubscription } from "@/lib/subscription";
import type { TierDigital } from "@/lib/planes-digitales";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { comisionCongelada } from "@/lib/compra-digital";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import { leerConsulta, dondeVentas, type ConsultaDeVentas } from "@/lib/ventas-digitales";
import type { VentaEnPantalla, ProductoDelFiltro } from "@/app/digitales/ventas/VentasClient";

/**
 * Lo de Tus ventas que sí toca la base y comparten la pantalla y la
 * exportación: quién mira, qué plan tiene, qué productos tiene para el
 * selector, y el `where` ya armado con la dirección verificada. La pantalla
 * después pagina y suma; la exportación trae todo hasta un techo. Las dos
 * filtran igual porque parten de acá.
 *
 * Importa Prisma: **no lo puede importar ningún componente de navegador**.
 */

export type ContextoDeVentas = {
  tier: TierDigital;
  consulta: ConsultaDeVentas;
  /** `null` si nunca guardó un producto: no hay espacio, no hay ventas. */
  store: { id: string } | null;
  productos: ProductoDelFiltro[];
  /** El producto de la dirección, sólo si es uno de los suyos. */
  elegido: string | null;
  donde: Prisma.OrderWhereInput;
};

export async function contextoDeVentas(userId: string, params: Record<string, string | string[] | undefined>): Promise<ContextoDeVentas> {
  const consulta = leerConsulta(params, getArgentinaDayKey());
  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: userId }, select: { id: true } }),
    getUserSubscription(userId),
  ]);
  const tier = (sub?.tier ?? "FREE") as TierDigital;
  if (!store) {
    return { tier, consulta, store: null, productos: [], elegido: null, donde: { storeId: "" } };
  }

  /* Los principales vivos, para el selector. El elegido tiene que ser uno de
     ellos: un id ajeno en la dirección no filtra nada y se cae a Todos. */
  const productos = await prisma.product.findMany({
    where: { storeId: store.id, rolDigital: "PRINCIPAL", deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: MAX_PRODUCTOS_DIGITALES_CREADOS,
    select: { id: true, name: true },
  });
  const elegido = consulta.p && productos.some((prod) => prod.id === consulta.p) ? consulta.p : null;

  return { tier, consulta, store, productos, elegido, donde: dondeVentas(store.id, consulta, elegido) };
}

/** Lo que se trae de cada venta, para la lista y para el archivo. */
export const SELECT_DE_VENTA = {
  id: true, status: true, total: true, createdAt: true, lockedCommissionRate: true,
  telefonoDigital: true,
  buyer: { select: { email: true, name: true, phone: true } },
  items: {
    select: {
      id: true,
      product: { select: { name: true, rolDigital: true } },
      descargas: {
        select: { descargas: true, maxDescargas: true, ultimaDescarga: true, expiresAt: true },
      },
    },
  },
} satisfies Prisma.OrderSelect;

type VentaCruda = Prisma.OrderGetPayload<{ select: typeof SELECT_DE_VENTA }>;

const AR_TZ = "America/Argentina/Buenos_Aires";
/* Se formatea ACÁ y no en el navegador. La lista es un componente de cliente,
   así que el mismo texto se dibuja dos veces: una en el servidor (que corre en
   UTC) y otra en la máquina de quien mira. Formateando allá, las dos no coinciden
   y React tira el aviso de hidratación — y peor, una venta de las 22:30 aparece
   con la fecha del día siguiente. Con la zona escrita, el texto es uno solo y es
   el correcto para quien vende. */
const reloj = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", year: "2-digit",
  hour: "2-digit", minute: "2-digit", timeZone: AR_TZ,
});
const calendario = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "2-digit", timeZone: AR_TZ,
});

/** De la fila de la base a lo que la pantalla (y el archivo) muestran. */
export function aVentaEnPantalla(o: VentaCruda, ahora: Date): VentaEnPantalla {
  const comisionDeEsta = o.status === "CONFIRMED"
    ? comisionCongelada(o.total, o.lockedCommissionRate)
    : 0;
  return {
    id: o.id,
    fecha: reloj.format(o.createdAt),
    estado: o.status === "CONFIRMED" ? "COBRADA" : o.status === "CANCELLED" ? "CANCELADA" : "ESPERANDO",
    total: o.total,
    comision: comisionDeEsta,
    neto: o.total - comisionDeEsta,
    comprador: o.buyer.email ?? "",
    nombre: o.buyer.name,
    /* ⚠️ PRIMERO EL DE LA COMPRA. El checkout digital guarda el celular en
       la ORDEN —esa cuenta es una sola para toda la plataforma y un número
       mal tipeado en una tienda le pisaría el dato a otra—, así que buscarlo
       sólo en la cuenta dejaba el botón de WhatsApp apagado para siempre,
       justo en la pantalla donde más se lo necesita: "no me llegó el
       archivo". `buyer.phone` queda de respaldo para quien además tiene
       cuenta y lo cargó ahí. Mismo criterio que Tus clientes. */
    telefono: o.telefonoDigital ?? o.buyer.phone,
    lineas: o.items.map((i) => {
      /* `descargas` viene como lista porque así lo declara el esquema, pero
         `orderItemId` es único: trae uno solo o ninguno. Ninguno significa que
         esa línea no tiene archivo (un upsell sin PDF) o que la venta todavía
         no se acreditó. */
      const permiso = i.descargas[0];
      return {
        id: i.id,
        producto: i.product.name,
        esBono: i.product.rolDigital === "BONO",
        esUpsell: i.product.rolDigital === "UPSELL",
        bajadas: permiso ? permiso.descargas : null,
        tope: permiso ? permiso.maxDescargas : null,
        ultima: permiso?.ultimaDescarga ? calendario.format(permiso.ultimaDescarga) : null,
        vencido: permiso ? permiso.expiresAt <= ahora : false,
      };
    }),
  };
}
