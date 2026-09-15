import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { comisionCongelada } from "@/lib/compra-digital";
import { puedeVer } from "@/lib/estadisticas-digitales";
import { contextoDeVentas, SELECT_DE_VENTA, aVentaEnPantalla } from "@/lib/ventas-digitales-db";
import BotonVolver from "../BotonVolver";
import VentasClient, { type Resumen } from "./VentasClient";

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
 * ── Por producto y por fecha ────────────────────────────────────────────────
 *
 * Arriba hay dos selectores: el producto (sólo con más de uno) y el rango de
 * fechas (Todo, Hoy, 7 días, Este mes, Mes pasado). Filtran la lista Y los
 * cuatro números: "cuánto me dejó este producto el mes pasado" es la pregunta,
 * y un resumen que siguiera diciendo el total de la cuenta al lado de una lista
 * filtrada sería un número que no corresponde a lo que se ve. El filtro vive en
 * `lib/ventas-digitales` y lo comparte la exportación: la planilla que se baja
 * trae exactamente lo que la pantalla muestra.
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

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return null;

  /* ⚠️ Todo lo que llega por la dirección se limpia en `leerConsulta` antes de
     tocar la base, y el producto pedido se verifica contra los de la cuenta. */
  const ctx = await contextoDeVentas(user.id, await searchParams);
  const puedeExportar = puedeVer(ctx.tier, "exportar");
  const comunes = {
    filtro: ctx.consulta.estado, q: ctx.consulta.q, rango: ctx.consulta.rango.clave,
    productos: ctx.productos, elegido: ctx.elegido, puedeExportar,
  };

  /* Sin `Store` no hay ni un producto cargado, así que tampoco puede haber una
     venta. Se dibuja el vacío sin salir a preguntar nada. Ver `espacioDigital`:
     el espacio se crea recién al guardar el primer producto. */
  if (!ctx.store) {
    return <Pantalla ventas={[]} resumen={RESUMEN_VACIO} pagina={1} paginas={1} {...comunes} />;
  }

  const { donde, consulta } = ctx;
  /* Los números de arriba siguen el producto y el rango, pero NO el estado ni
     la búsqueda: "te quedó" es lo cobrado en ese período, se esté mirando la
     lista de canceladas o buscando a alguien. */
  const delPeriodo = { storeId: donde.storeId, items: donde.items, createdAt: donde.createdAt };
  const ahora = new Date();

  const [filas, cuantas, porTasa, sinBajar, esperando] = await Promise.all([
    prisma.order.findMany({
      where: donde,
      orderBy: { createdAt: "desc" },
      skip: (consulta.pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: SELECT_DE_VENTA,
    }),
    prisma.order.count({ where: donde }),
    /* El total cobrado, agrupado por porcentaje: así cada grupo se descuenta con
       la comisión que de verdad le tocó. Un `sum` solo no alcanza — mezclaría
       ventas de Free con ventas de Pro y descontaría todas igual. */
    prisma.order.groupBy({
      by: ["lockedCommissionRate"],
      where: { ...delPeriodo, status: "CONFIRMED" },
      _sum: { total: true },
      _count: { _all: true },
    }),
    /* Archivos pagos que nadie tocó todavía y que TODAVÍA se pueden bajar. Los
       vencidos no cuentan: ahí ya no hay nada que hacer desde esta pantalla. */
    prisma.digitalDownload.count({
      where: {
        descargas: 0,
        expiresAt: { gt: ahora },
        orderItem: { order: { ...delPeriodo, status: "CONFIRMED" } },
      },
    }),
    prisma.order.count({ where: { ...delPeriodo, status: "PENDING" } }),
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

  const resumen: Resumen = { ventas, bruto, neto: bruto - comision, sinBajar, esperando };
  const paginas = Math.max(1, Math.ceil(cuantas / POR_PAGINA));

  return (
    <Pantalla
      ventas={filas.map((o) => aVentaEnPantalla(o, ahora))}
      resumen={resumen}
      pagina={consulta.pagina}
      paginas={paginas}
      {...comunes}
    />
  );
}

const RESUMEN_VACIO: Resumen = { ventas: 0, bruto: 0, neto: 0, sinBajar: 0, esperando: 0 };

function Pantalla(props: React.ComponentProps<typeof VentasClient>) {
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
