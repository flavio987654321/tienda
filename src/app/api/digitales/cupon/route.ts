import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { normalizarCodigo, porQueNoAplica, descuentoDe, textoDelDescuento, type CuponDigitalPuro } from "@/lib/cupones-digitales";
import { esCodigoDeOferta, leerOfertaSalida } from "@/lib/oferta-salida";
import { leerTokenDeOferta } from "@/lib/oferta-salida-firma";

export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** Intentos por IP y hora. Un cupón se prueba una o dos veces; cientos es alguien adivinando códigos. */
const INTENTOS_POR_HORA = 30;

/**
 * POST /api/digitales/cupon  { productoId, codigo }
 *
 * El checkout pregunta si un cupón vale para este producto, para mostrar el
 * precio nuevo antes de pagar. Es pública —el comprador no tiene sesión— y
 * por eso contesta lo mínimo: si aplica, cuánto descuenta y cómo se muestra.
 * Ni cuántos usos le quedan ni cuándo vence: eso es de la dueña.
 *
 * ⚠️ Lo que diga acá NO es lo que se cobra. La ruta de compra vuelve a leer
 * el cupón y a decidir; esto es sólo para que la pantalla no mienta.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    if (!(await checkRateLimit(`digital-cupon:${ip}`, INTENTOS_POR_HORA, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos. Esperá un rato." }, { status: 429 });
    }
  } catch {
    /* Sin Redis se contesta igual: es una lectura. */
  }

  const cuerpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productoId = typeof cuerpo?.productoId === "string" && ID_RE.test(cuerpo.productoId) ? cuerpo.productoId : null;
  const codigo = normalizarCodigo(cuerpo?.codigo);
  if (!productoId || !codigo) return NextResponse.json({ error: "Escribí el código del cupón." }, { status: 400 });

  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, rolDigital: "PRINCIPAL", isActive: true, store: { owner: { role: "DIGITAL" } } },
    select: { id: true, price: true, storeId: true, ofertaSalida: true },
  });
  if (!producto) return NextResponse.json({ error: "Ese cupón no existe." }, { status: 404 });

  const fila = await prisma.cuponDigital.findUnique({
    where: { storeId_codigo: { storeId: producto.storeId, codigo } },
    select: { codigo: true, tipo: true, valor: true, productId: true, venceAt: true, topeUsos: true, usos: true, activo: true },
  });
  const cupon = fila && (fila.tipo === "PORCENTAJE" || fila.tipo === "PESOS") ? (fila as CuponDigitalPuro) : null;
  if (!cupon) return NextResponse.json({ error: "Ese cupón no existe." }, { status: 404 });

  /* ⚠️ El cupón de la oferta de salida (SALIDA-…) no vale por el código:
     vale por el plazo firmado que el checkout le mostró a ESTA persona. Sin
     token, o vencido, no existe. Es lo que hace cierto el "vale hasta las
     18:23" del cartel. Ver `lib/oferta-salida`. */
  if (esCodigoDeOferta(cupon.codigo)) {
    const oferta = leerOfertaSalida(producto.ofertaSalida);
    const plazo = oferta.activa && oferta.tipo === "DESCUENTO" ? leerTokenDeOferta(cuerpo?.oferta, producto.id, oferta.horas) : null;
    if (!plazo) return NextResponse.json({ error: "Esa oferta ya venció." }, { status: 400 });
  }

  /* Se mira contra el precio del principal solo: es el piso. Con upsells el
     total es mayor y el cupón aplica con más razón. */
  const motivo = porQueNoAplica(cupon, { productId: producto.id, total: producto.price });
  if (motivo) return NextResponse.json({ error: motivo }, { status: 400 });

  return NextResponse.json({
    ok: true,
    codigo: cupon.codigo,
    tipo: cupon.tipo,
    valor: cupon.valor,
    texto: textoDelDescuento(cupon),
    /* Sobre el precio del principal, para que la pantalla lo tenga sin calcular. */
    descuentoSobreElPrincipal: descuentoDe(cupon, producto.price),
  });
}
