import { prisma } from "@/lib/prisma";
import { lasQueSobran, topeDe, type RolDigital } from "@/lib/productos-digitales";
import type { TierDigital } from "@/lib/planes-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   LO QUE SE DESPUBLICA CUANDO UNA CUENTA CAE DE PLAN
   ══════════════════════════════════════════════════════════════════════════

   Caer a Free NO borra nada —ver `caidaAFree` en `subscription`—. Pero una
   cuenta que tenía Pro y vuelve a Free se queda con cinco páginas publicadas
   en un plan que vende una, y eso no es "lado seguro": es el plan de arriba
   gratis, para siempre, para quien deje de pagar.

   Acá se apagan las de más. Se DESPUBLICAN, no se borran: los productos quedan
   como borrador, con su archivo, su texto y sus ventas, y la persona elige
   cuáles quedan publicándolos y despublicándolos desde su panel. Lo que se
   apaga primero lo decide `lasQueSobran`: sobran los que menos vendieron.

   Los bonos y los upsells van con la misma regla, por producto: son "por
   producto principal" en el tope del plan, así que cada principal mira los
   suyos. Y se revisan los hijos de TODOS los principales, publicados o no —
   si la persona después cambia cuál queda prendida, la que prende tiene que
   estar ya dentro del tope. */

/** Lo que se apagó y lo que quedó, con nombre, para el aviso y el mail. */
export type ResultadoDeLaCaida = {
  despublicadas: { id: string; name: string; rol: RolDigital }[];
  quedaron: { id: string; name: string }[];
};

/**
 * Apaga los productos publicados que pasan el tope del plan al que cayó.
 *
 * Una sola escritura, con todos los ids juntos. Y se lee ANTES de escribir,
 * sin transacción: el cron es el único que llama a esto, corre una vez por día,
 * y si la persona publica algo en ese mismo segundo, la puerta de publicar
 * (`porQueNoSePublica`) ya no se lo deja pasar.
 */
export async function despublicarLasDeMas(storeId: string, tier: TierDigital): Promise<ResultadoDeLaCaida> {
  const publicados = await prisma.product.findMany({
    where: { storeId, deletedAt: null, isActive: true, rolDigital: { not: null } },
    select: { id: true, name: true, rolDigital: true, padreId: true, createdAt: true },
  });
  if (publicados.length === 0) return { despublicadas: [], quedaron: [] };

  /* Cuántas veces se cobró cada uno. Sólo las órdenes CONFIRMED cuentan como
     venta: una PENDING es un pago que no llegó. */
  const vendidos = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { in: publicados.map((p) => p.id) }, order: { status: "CONFIRMED" } },
    _count: { _all: true },
  });
  const ventasDe = new Map(vendidos.map((v) => [v.productId, v._count._all]));

  const conVentas = publicados.map((p) => ({ ...p, ventas: ventasDe.get(p.id) ?? 0 }));
  const principales = conVentas.filter((p) => p.rolDigital === "PRINCIPAL");

  const sobran = [...lasQueSobran(principales, topeDe(tier, "PRINCIPAL"))];

  /* Los hijos se miran por CADA principal de la cuenta, esté publicado o no:
     un principal en borrador puede tener bonos publicados (se apagó él, no
     ellos), y si la persona después lo prende, sus bonos ya tienen que estar
     dentro del tope. Visto en la relectura antes del deploy. */
  const padres = new Set(conVentas.map((p) => p.padreId).filter((id): id is string => !!id));
  for (const padreId of padres) {
    for (const rol of ["BONO", "UPSELL"] as const) {
      const hijos = conVentas.filter((p) => p.padreId === padreId && p.rolDigital === rol);
      sobran.push(...lasQueSobran(hijos, topeDe(tier, rol)));
    }
  }

  if (sobran.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: sobran.map((p) => p.id) } },
      data: { isActive: false },
    });
  }

  const apagados = new Set(sobran.map((p) => p.id));
  return {
    despublicadas: sobran.map((p) => ({ id: p.id, name: p.name, rol: p.rolDigital as RolDigital })),
    quedaron: principales.filter((p) => !apagados.has(p.id)).map((p) => ({ id: p.id, name: p.name })),
  };
}
