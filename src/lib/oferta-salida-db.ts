import { prisma } from "@/lib/prisma";
import { leerOfertaSalida, codigoDeLaOferta, venceEnTexto, HORAS_MINIMAS_DEL_MAIL } from "@/lib/oferta-salida";
import { firmarOferta } from "@/lib/oferta-salida-firma";
import { descuentoDe } from "@/lib/cupones-digitales";
import { direccionBase } from "@/lib/enlaces-compartir";
import { dominioDeLaPlataforma } from "@/lib/configuracion-digital";

/**
 * La oferta de salida contra la base: armarla para el mail de carrito
 * abandonado. La versión del checkout vive en `p/[id]/pagar/page.tsx` y
 * sigue las mismas reglas: cupón vivo, producto publicado.
 *
 * ⚠️ El principal llega ya elegido por el cron, que sólo manda a cuentas
 * Pro al día: acá no se mira el plan.
 */

const plata = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export type OfertaEnElMail = { titulo: string; texto: string; resumen: string; vence: string; enlace: string; boton: string };

export async function ofertaParaElMail(
  principal: { id: string; name: string; price: number; storeId: string; ofertaSalida: string | null },
  enlaceDelPrincipal: string,
  ahora: Date,
): Promise<OfertaEnElMail | null> {
  const o = leerOfertaSalida(principal.ofertaSalida);
  if (!o.activa) return null;
  /* El plazo corre desde el envío, y en el mail es de al menos un día: un
     cartel de "15 minutos" tiene sentido con la persona adelante, no en una
     casilla que se abre a la noche. */
  const venceEn = ahora.getTime() + Math.max(o.horas, HORAS_MINIMAS_DEL_MAIL) * 3_600_000;
  const vence = venceEnTexto(new Date(venceEn), ahora);

  if (o.tipo === "DESCUENTO") {
    const cupon = await prisma.cuponDigital.findUnique({
      where: { storeId_codigo: { storeId: principal.storeId, codigo: codigoDeLaOferta(principal.id) } },
      select: { activo: true, valor: true, tipo: true },
    });
    if (!cupon || !cupon.activo || cupon.tipo !== "PORCENTAJE") return null;
    const despues = principal.price - descuentoDe({ tipo: "PORCENTAJE", valor: cupon.valor }, principal.price);
    /* El checkout respeta este token si viene en el link: la persona ve el
       mismo plazo que le prometió el mail. */
    const token = firmarOferta(principal.id, venceEn);
    return {
      titulo: o.titulo, texto: o.texto, boton: o.boton, vence,
      resumen: `${cupon.valor} % de descuento: ${plata(despues)} en vez de ${plata(principal.price)}`,
      enlace: `${enlaceDelPrincipal.replace(/\/$/, "")}/pagar?oferta=${encodeURIComponent(token)}`,
    };
  }

  if (!o.productoId) return null;
  const otro = await prisma.product.findFirst({
    where: { id: o.productoId, storeId: principal.storeId, rolDigital: "PRINCIPAL", deletedAt: null, isActive: true },
    select: { id: true, name: true, price: true, slugDigital: true, dominioPropio: true },
  });
  if (!otro || !(otro.price > 0)) return null;
  const base = direccionBase(otro, dominioDeLaPlataforma(), process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tiendaapps.com");
  return {
    titulo: o.titulo, texto: o.texto, boton: o.boton, vence,
    resumen: `«${otro.name}» por ${plata(otro.price)}`,
    enlace: `${base.replace(/\/$/, "")}/pagar`,
  };
}
