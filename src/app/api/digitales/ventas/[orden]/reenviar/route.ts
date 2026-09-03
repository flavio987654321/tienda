import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  armadoDelMail, vencimientoDelPermiso, DIAS_DEL_PERMISO, MAX_DESCARGAS,
} from "@/lib/entrega-digital";
import { sendEntregaDigitalEmail } from "@/lib/resend";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/* Cuántas veces se puede reenviar la MISMA venta, y en cuánto tiempo.
   Tres por día alcanza de sobra para "no me llegó" y "se me perdió", y no
   alcanza para usar el botón como una máquina de mandarle correos a alguien.
   El tope por cuenta es el otro: veinte por hora frena a quien apriete todos
   los botones de la lista. */
const REENVIOS_POR_VENTA = 3;
const VENTANA_POR_VENTA = 24 * 60 * 60 * 1000;
const REENVIOS_POR_CUENTA = 20;
const VENTANA_POR_CUENTA = 60 * 60 * 1000;

/**
 * Volver a mandar el mail de entrega de una venta.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES EL ÚNICO CAMINO QUE TIENE UN COMPRADOR QUE SE QUEDÓ SIN SU ARCHIVO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── El agujero que tapa ─────────────────────────────────────────────────────
 *
 * Alguien paga, el mail se va a spam y cierra la pantalla de gracias. No tiene
 * cuenta, así que no puede entrar a recuperar nada; le escribe a quien le
 * vendió, y hasta acá quien vendió **tampoco podía hacer nada**: veía la venta
 * en la lista y no la podía tocar. Terminaba en una devolución, o en una captura
 * de pantalla.
 *
 * ── Por qué renueva el vencimiento y NO el contador ─────────────────────────
 *
 * Son dos límites con dueños distintos.
 *
 * El **vencimiento** protege contra un enlace que queda vivo para siempre, no
 * contra la persona: si venció y quien vende decide ayudarla, renovarlo es
 * exactamente lo que hay que hacer. Va a 30 días desde hoy.
 *
 * El **contador** protege contra que el enlace se reparta a diez amigos, y eso
 * no cambia porque el mail se reenvíe. Si ya se usaron las cinco, no se manda
 * nada: un mail con un botón que no funciona es peor que no mandarlo. Se
 * contesta diciendo qué pasó, que además suele significar que la persona SÍ
 * tiene el archivo.
 *
 * ── Lo que no hace ──────────────────────────────────────────────────────────
 *
 * 🔲 No queda anotado en la base cuántas veces se reenvió: hoy eso lo lleva el
 * limitador, que se olvida cuando pasa la ventana. Para poder mostrarle a quien
 * vende "reenviado hace 5 minutos" hace falta una columna, y eso es otra
 * migración. Va cuando exista el detalle de la venta.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ orden: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
  }

  const { orden: ordenId } = await ctx.params;
  if (typeof ordenId !== "string" || !ID_RE.test(ordenId)) {
    return NextResponse.json({ error: "No sabemos qué venta es." }, { status: 400 });
  }

  /* El tope por cuenta va ANTES de tocar la base: es el que frena a quien
     aprieta todos los botones de la lista, y no hace falta leer nada para
     saberlo. */
  if (!(await checkRateLimit(`digital-reenvio-cuenta:${user.id}`, REENVIOS_POR_CUENTA, VENTANA_POR_CUENTA))) {
    return NextResponse.json(
      { error: "Reenviaste muchos mails seguidos. Esperá un rato." },
      { status: 429 },
    );
  }

  const venta = await prisma.order.findUnique({
    where: { id: ordenId },
    select: {
      id: true, status: true,
      store: { select: { ownerId: true, owner: { select: { name: true } } } },
      buyer: { select: { email: true, name: true } },
      items: {
        select: {
          id: true,
          product: {
            select: {
              id: true, name: true, archivoPath: true, archivoNombre: true,
              rolDigital: true, padreId: true,
            },
          },
          descargas: { select: { id: true, descargas: true, maxDescargas: true, expiresAt: true } },
        },
      },
    },
  });

  /* ⚠️ Que la venta sea SUYA. Sin esto, cualquier cuenta digital con sesión le
     reenvía el mail al comprador de cualquier otra con sólo cambiar el
     identificador de la dirección. Y se contesta lo mismo que si no existiera:
     "no es tuya" y "no existe" no se distinguen desde afuera, así que esto
     tampoco sirve para averiguar qué órdenes hay. */
  if (!venta || venta.store.ownerId !== user.id) {
    return NextResponse.json({ error: "No encontramos esa venta." }, { status: 404 });
  }

  if (venta.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Esta venta no está cobrada, así que no hay nada para entregar." },
      { status: 409 },
    );
  }

  if (!venta.buyer.email) {
    return NextResponse.json(
      { error: "Esta compra no tiene un correo al que mandarlo." },
      { status: 409 },
    );
  }

  const { idDeLaPagina, comoSeLlama, archivos, entregables } = armadoDelMail(venta.items);
  if (!idDeLaPagina || archivos.length === 0) {
    return NextResponse.json(
      { error: "Esta venta no tiene ningún archivo para entregar." },
      { status: 409 },
    );
  }

  /* Los permisos de las líneas que sí se entregan. `descargas` viene como lista
     porque así lo declara el esquema, pero `orderItemId` es único: uno o
     ninguno. */
  const permisos = entregables.map((l) => l.descargas[0]).filter((p) => !!p);
  if (permisos.length === 0) {
    return NextResponse.json(
      { error: "Todavía no se emitieron los permisos de esta compra." },
      { status: 409 },
    );
  }

  /* ⚠️ Si NINGUNO tiene descargas disponibles, no se manda nada. El mail
     llevaría a una pantalla con botones que devuelven error, que es la peor
     forma de contestarle a alguien que reclama. Y casi siempre significa que la
     persona sí tiene el archivo. */
  const conSaldo = permisos.filter((p) => p.descargas < p.maxDescargas);
  if (conSaldo.length === 0) {
    return NextResponse.json(
      {
        error: `Quien compró ya usó las ${MAX_DESCARGAS} descargas de todos sus archivos, `
          + "así que el enlace no le va a servir. Lo más probable es que ya lo tenga guardado.",
      },
      { status: 409 },
    );
  }

  /* El tope por venta va DESPUÉS de las comprobaciones: un pedido que iba a
     fallar igual no tiene que gastarle a nadie uno de sus tres reenvíos. */
  if (!(await checkRateLimit(`digital-reenvio:${ordenId}`, REENVIOS_POR_VENTA, VENTANA_POR_VENTA))) {
    return NextResponse.json(
      { error: `Ya reenviaste esta venta ${REENVIOS_POR_VENTA} veces hoy. Probá mañana.` },
      { status: 429 },
    );
  }

  /* Se renuevan SÓLO los vencidos, y sólo los que todavía tienen descargas. Con
     la condición adentro del `where`, un permiso que ya estaba vivo no se toca:
     reenviar no le puede regalar treinta días más a un enlace que estaba por la
     mitad. */
  const ahora = new Date();
  const vencidos = conSaldo.filter((p) => p.expiresAt <= ahora).map((p) => p.id);
  let renovados = 0;
  if (vencidos.length > 0) {
    const { count } = await prisma.digitalDownload.updateMany({
      where: { id: { in: vencidos }, expiresAt: { lte: ahora } },
      data: { expiresAt: vencimientoDelPermiso(ahora) },
    });
    renovados = count;
  }

  const dondeVerlos = `${APP_URL}/p/${idDeLaPagina}/gracias?orden=${venta.id}`;

  /* ⚠️ Se ESPERA el mail, al revés que en el aviso de pago. Allá la respuesta va
     para Mercado Pago y el mail se manda después con `despues`; acá la respuesta
     va para una persona que apretó un botón y necesita saber si salió o no.
     Decirle "listo" sin haber esperado es mentirle justo cuando está tratando de
     resolverle un problema a un cliente. */
  try {
    await sendEntregaDigitalEmail({
      to: venta.buyer.email,
      nombre: venta.buyer.name,
      producto: comoSeLlama,
      archivos,
      enlace: dondeVerlos,
      vendedor: venta.store.owner.name,
      dias: DIAS_DEL_PERMISO,
      maxDescargas: MAX_DESCARGAS,
    });
  } catch (e) {
    console.error("[digital-reenvio] no se pudo mandar el mail:", ordenId, e);
    return NextResponse.json(
      { error: "No pudimos mandar el mail. Probá de nuevo en un momento." },
      { status: 502 },
    );
  }

  console.info("[digital-reenvio] mail reenviado", { ordenId, porUsuario: user.id, renovados });

  return NextResponse.json({
    ok: true,
    /* No se devuelve el correo de quien compró: ya está en la pantalla, y una
       respuesta que lo repite es una filtración más de la que hacía falta. */
    renovados,
  });
}
