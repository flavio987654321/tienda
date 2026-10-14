import { prisma } from "@/lib/prisma";
import { loQueFalta, porQueNoSePublica } from "@/lib/productos-digitales";
import type { TierDigital } from "@/lib/planes-digitales";

/**
 * Un bono queda incluido en la compra al recibir su PRIMER archivo (14/10/26).
 *
 * Un bono no tiene página: lo único que le falta para entregarse es el
 * archivo. Visto en la base ese día: una cuenta subió el PDF de su bono y no
 * tocó "Publicar" —en un bono no se entiende qué se publica—, así que quien
 * compraba no lo recibía.
 *
 * Sólo la primera vez (`teniaArchivo` en false): si la dueña lo sacó de la
 * compra y después cambia el archivo, se respeta lo que eligió. Y con las mismas
 * dos puertas que el botón: lo que falta (el cobro) y el tope del plan. Llaman
 * las dos rutas que le ponen archivo a un producto: la subida y el ebook de la IA.
 *
 * Devuelve si lo incluyó. Nunca tira: es una comodidad, y que falle no puede
 * tumbar la subida que ya salió bien.
 */
export async function incluirBonoAlRecibirArchivo(productoId: string, userId: string, teniaArchivo: boolean): Promise<boolean> {
  if (teniaArchivo) return false;
  try {
    const p = await prisma.product.findUnique({
      where: { id: productoId },
      select: {
        rolDigital: true, isActive: true, deletedAt: true, padreId: true, storeId: true, name: true,
        store: { select: { mpAccessToken: true } },
      },
    });
    if (!p || p.rolDigital !== "BONO" || p.isActive || p.deletedAt) return false;
    const falta = loQueFalta({
      rolDigital: "BONO", archivoPath: "hay", price: 0, name: p.name,
      cobroConectado: !!p.store?.mpAccessToken,
    });
    if (falta) return false;
    const sub = await prisma.subscription.findUnique({ where: { userId }, select: { tier: true } });
    const hermanos = await prisma.product.count({
      where: { storeId: p.storeId, rolDigital: "BONO", padreId: p.padreId, deletedAt: null, isActive: true },
    });
    if (porQueNoSePublica("BONO", hermanos, (sub?.tier ?? "FREE") as TierDigital)) return false;
    await prisma.product.update({ where: { id: productoId }, data: { isActive: true } });
    return true;
  } catch (e) {
    console.error("[bono-incluido] no se pudo incluir:", e instanceof Error ? e.message : e);
    return false;
  }
}
