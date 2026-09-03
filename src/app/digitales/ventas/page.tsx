import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { comisionCongelada } from "@/lib/compra-digital";
import { getArgentinaDayKey, inicioDiaArgentino } from "@/lib/fechas-comerciales";
import BotonVolver from "../BotonVolver";
import VentasClient, { type VentaEnPantalla, type Resumen } from "./VentasClient";

/**
 * Tus ventas.
 *
 * ── Por qué esta pantalla no podía faltar ───────────────────────────────────
 *
 * Todo el ecosistema cobra, entrega y manda el mail solo. Hasta acá, quien vende
 * no tenía **un solo lugar** donde ver que eso pasó: ni cuánto vendió, ni a
 * quién, ni si la persona llegó a bajar el archivo. La plata entraba a su cuenta
 * de Mercado Pago y el resto era fe.
 *
 * ── Las tres cosas que contesta ─────────────────────────────────────────────
 *
 *   1. **Cuánto te quedó.** No cuánto vendiste: cuánto te quedó después de la
 *      comisión. Es el número que la gente busca y el que nadie muestra.
 *   2. **Quién compró.** El correo, para poder escribirle.
 *   3. **Si lo bajó.** Una compra cobrada que nunca se descargó es un reclamo
 *      que todavía no llegó — el mail se fue a spam, el enlace venció. Verlo
 *      antes es la diferencia entre resolverlo y enterarse por una queja.
 *
 * ── Por qué la comisión sale de la ORDEN y no del plan ──────────────────────
 *
 * Porque el plan cambia. Alguien que vendió diez veces en Free al 8% y hoy está
 * en Pro vería esas diez ventas recalculadas al 2%: números que nunca existieron.
 * Cada orden guarda su `lockedCommissionRate` al momento de cobrarse, y esta
 * pantalla lee ese número. Ver `comisionCongelada`.
 *
 * ── Por qué la lista pagina en el servidor ──────────────────────────────────
 *
 * Traer todo y filtrar en el navegador anda con veinte ventas y se cae con dos
 * mil. Y como es plata, no se puede "cargar de a poco y que se vea raro": el
 * filtro, la búsqueda y la página viajan en la dirección, así que el link se
 * comparte, el botón atrás funciona y recargar no pierde nada.
 */

export const dynamic = "force-dynamic";

const POR_PAGINA = 25;

/** Los estados que se pueden pedir por la dirección, y a qué se traducen. */
const FILTROS = {
  cobradas: "CONFIRMED",
  esperando: "PENDING",
  canceladas: "CANCELLED",
} as const;
type ClaveDeFiltro = keyof typeof FILTROS;

const esFiltro = (v: string): v is ClaveDeFiltro => v in FILTROS;

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

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  const parametros = await searchParams;

  /* ⚠️ Todo lo que llega por la dirección se limpia antes de tocar la base.
     `estado` sólo puede ser una de tres palabras nuestras —nunca el texto crudo
     como estado— así que no hay forma de pedir un estado inventado. */
  const filtro = typeof parametros.estado === "string" && esFiltro(parametros.estado)
    ? parametros.estado
    : null;

  /* La búsqueda va con tope de largo: es un `contains` contra una columna
     indexada por igualdad, y una cadena de diez mil caracteres es una consulta
     cara pedida gratis desde la barra de direcciones. */
  const q = typeof parametros.q === "string" ? parametros.q.trim().slice(0, 120) : "";

  /* Y la página, un entero sano. `parseInt` de basura da `NaN`, y un `skip` con
     `NaN` rompe la consulta entera. */
  const pedida = Number.parseInt(parametros.pagina ?? "1", 10);
  const pagina = Number.isFinite(pedida) && pedida > 0 ? Math.min(pedida, 10_000) : 1;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  /* Sin `Store` no hay ni un producto cargado, así que tampoco puede haber una
     venta. Se dibuja el vacío sin salir a preguntar nada. Ver `espacioDigital`:
     el espacio se crea recién al guardar el primer producto. */
  if (!store) {
    return <Pantalla ventas={[]} resumen={RESUMEN_VACIO} filtro={filtro} q={q} pagina={1} paginas={1} />;
  }

  const donde: Prisma.OrderWhereInput = {
    storeId: store.id,
    ...(filtro ? { status: FILTROS[filtro] } : {}),
    /* Se busca por correo y por nombre, que es lo que alguien tiene a mano
       cuando le escriben "no me llegó". */
    ...(q
      ? {
          buyer: {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const ahora = new Date();
  const primeroDelMes = inicioDiaArgentino(`${getArgentinaDayKey().slice(0, 7)}-01`);

  const [filas, cuantas, porTasa, delMes, sinBajar, esperando] = await Promise.all([
    prisma.order.findMany({
      where: donde,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true, status: true, total: true, createdAt: true, lockedCommissionRate: true,
        buyer: { select: { email: true, name: true } },
        items: {
          select: {
            id: true,
            product: { select: { name: true, rolDigital: true } },
            descargas: {
              select: { descargas: true, maxDescargas: true, ultimaDescarga: true, expiresAt: true },
            },
          },
        },
      },
    }),
    prisma.order.count({ where: donde }),
    /* El total cobrado, agrupado por porcentaje: así cada grupo se descuenta con
       la comisión que de verdad le tocó. Un `sum` solo no alcanza — mezclaría
       ventas de Free con ventas de Pro y descontaría todas igual. */
    prisma.order.groupBy({
      by: ["lockedCommissionRate"],
      where: { storeId: store.id, status: "CONFIRMED" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { storeId: store.id, status: "CONFIRMED", createdAt: { gte: primeroDelMes } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    /* Archivos pagos que nadie tocó todavía y que TODAVÍA se pueden bajar. Los
       vencidos no cuentan: ahí ya no hay nada que hacer desde esta pantalla. */
    prisma.digitalDownload.count({
      where: {
        descargas: 0,
        expiresAt: { gt: ahora },
        orderItem: { order: { storeId: store.id, status: "CONFIRMED" } },
      },
    }),
    prisma.order.count({ where: { storeId: store.id, status: "PENDING" } }),
  ]);

  let bruto = 0;
  let comision = 0;
  let ventas = 0;
  for (const grupo of porTasa) {
    const suma = grupo._sum.total ?? 0;
    bruto += suma;
    comision += comisionCongelada(suma, grupo.lockedCommissionRate);
    ventas += grupo._count._all;
  }

  const resumen: Resumen = {
    ventas,
    bruto,
    neto: bruto - comision,
    ventasDelMes: delMes._count._all,
    brutoDelMes: delMes._sum.total ?? 0,
    sinBajar,
    esperando,
  };

  const ventasEnPantalla: VentaEnPantalla[] = filas.map((o) => {
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
  });

  const paginas = Math.max(1, Math.ceil(cuantas / POR_PAGINA));

  return (
    <Pantalla
      ventas={ventasEnPantalla}
      resumen={resumen}
      filtro={filtro}
      q={q}
      pagina={pagina}
      paginas={paginas}
    />
  );
}

const RESUMEN_VACIO: Resumen = {
  ventas: 0, bruto: 0, neto: 0, ventasDelMes: 0, brutoDelMes: 0, sinBajar: 0, esperando: 0,
};

function Pantalla(props: {
  ventas: VentaEnPantalla[];
  resumen: Resumen;
  filtro: ClaveDeFiltro | null;
  q: string;
  pagina: number;
  paginas: number;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8">
      <BotonVolver />

      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 panel-oscuro:text-gray-100">Tus ventas</h1>
        <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mt-1">
          Qué se cobró, quién lo compró y si llegó a bajarlo.
        </p>
      </div>

      <VentasClient {...props} />
    </div>
  );
}
