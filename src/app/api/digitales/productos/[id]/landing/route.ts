import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";
import { limpiarLanding } from "@/lib/landing-propia";
import { tieneTraba } from "@/lib/landing-revision";
import {
  leerEstadoDeLanding, leerInventario, LANDING_MAX_BYTES, LANDING_VERSIONES,
  MAX_FOTOS_DE_LANDING, MAX_ENLACES_DE_LANDING, acomodarEnlace, type EstadoDeLanding,
} from "@/lib/landing-estado";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * La landing propia de un producto: subir una versión (POST) y cambiar lo
 * que no es el HTML (PATCH): prenderla, elegir versión, las fotos de cada
 * hueco y los links del pie.
 *
 * ── Lo que se guarda es lo LIMPIO ──────────────────────────────────────────
 *
 * El archivo crudo no se guarda nunca: entra, pasa por `limpiarLanding` y lo
 * que se escribe en la base ya está sin scripts. Así una landing vieja no
 * puede volverse peligrosa si mañana alguien se olvida de limpiar al
 * mostrarla, y el HTML guardado es exactamente el que se dibuja.
 *
 * ── Las fotos sobreviven a las versiones ───────────────────────────────────
 *
 * Las fotos y los links viven en `Product.landingPropia`, no en la versión:
 * la vendedora sube la versión 9 de su diseño y las trece fotos que ya
 * cargó siguen en su lugar, porque se guardan por NOMBRE de hueco. Eso es lo
 * que hace barato el ida y vuelta con Claude — en Shopify cada versión
 * nueva es volver a pegar trece URLs a mano.
 *
 * Starter y Pro al día, como la oferta de salida. El plan se mira también
 * al mostrar la página: si vence, la dirección vuelve a la página de
 * secciones y no se pierde nada.
 */

/** Más que esto no es un pedido de subida: es otra cosa. */
const CUERPO_MAX = LANDING_MAX_BYTES + 2_000;

async function elProducto(userId: string, id: string) {
  return prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: userId } },
    select: { id: true, landingPropia: true },
  });
}

/**
 * El tope de intentos, sin mirar el plan.
 *
 * Va aparte de `puertaDeEntrada` porque hay una acción que NO puede pedir plan
 * al día: borrar. Ver el comentario del DELETE.
 */
async function topeDeIntentos(userId: string, clave: string) {
  try {
    if (!(await checkRateLimit(`${clave}:${userId}`, 60, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error(`[rate-limit] Redis no disponible en /api/digitales/productos/[id]/landing`);
  }
  return null;
}

async function puertaDeEntrada(userId: string, clave: string) {
  const pasado = await topeDeIntentos(userId, clave);
  if (pasado) return pasado;
  const sub = await getUserSubscription(userId);
  if (!sub || sub.tier === "FREE" || !isSubscriptionActive(sub)) {
    return NextResponse.json({ error: "Publicar tu propio diseño es de los planes Starter y Pro." }, { status: 403 });
  }
  return null;
}

/** POST: subir el .html que bajó de Claude. Se limpia, se guarda y queda elegida. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parado = await puertaDeEntrada(user.id, "landing-subir");
  if (parado) return parado;

  const { id } = await ctx.params;
  const producto = await elProducto(user.id, id);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });

  /* El cuerpo se lee como texto y se mide antes de parsear nada: un archivo
     de 50 MB no tiene que llegar a la memoria en forma de objeto. */
  const crudo = await req.text().catch(() => "");
  if (crudo.length > CUERPO_MAX) {
    return NextResponse.json({ error: `El archivo pesa más de ${Math.round(LANDING_MAX_BYTES / 1000)} KB. Las fotos no van adentro del HTML: se suben aparte.` }, { status: 413 });
  }
  let html = "";
  try {
    const cuerpo: unknown = JSON.parse(crudo);
    html = typeof cuerpo === "object" && cuerpo !== null && typeof (cuerpo as { html?: unknown }).html === "string" ? (cuerpo as { html: string }).html : "";
  } catch {
    return NextResponse.json({ error: "No entendimos el pedido." }, { status: 400 });
  }

  const r = limpiarLanding(html);
  if (!r.ok) return NextResponse.json({ error: r.problema }, { status: 400 });
  const L = r.landing;

  const estado = leerEstadoDeLanding(producto.landingPropia);
  const version = await prisma.$transaction(async (tx) => {
    const creada = await tx.landingDigital.create({
      data: {
        productId: producto.id,
        html: L.html,
        bytes: L.bytes,
        titulo: L.titulo,
        inventario: JSON.stringify(L.inventario),
        quitado: JSON.stringify(L.quitado),
      },
      select: { id: true, createdAt: true },
    });
    /* Se guardan las últimas: "volver a la anterior" es un botón, pero el
       historial entero no le sirve a nadie y son medio mega cada una. */
    const viejas = await tx.landingDigital.findMany({
      where: { productId: producto.id },
      orderBy: { createdAt: "desc" },
      skip: LANDING_VERSIONES,
      select: { id: true },
      take: 50,
    });
    if (viejas.length) await tx.landingDigital.deleteMany({ where: { id: { in: viejas.map((v) => v.id) } } });
    /* La nueva queda elegida; prenderla es otro paso, para que pueda mirar
       la previa antes de que la vea nadie. Las fotos y los links, intactos. */
    await tx.product.update({
      where: { id: producto.id },
      data: { landingPropia: JSON.stringify({ ...estado, versionId: creada.id } satisfies EstadoDeLanding) },
    });
    return creada;
  });

  return NextResponse.json({ ok: true, versionId: version.id, bytes: L.bytes, titulo: L.titulo, inventario: L.inventario, quitado: L.quitado });
}

/**
 * PATCH: prenderla o apagarla, elegir otra versión, poner la foto de un
 * hueco o el destino de un link. Todo lo que no es el HTML.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const parado = await puertaDeEntrada(user.id, "landing-guardar");
  if (parado) return parado;

  const { id } = await ctx.params;
  const producto = await elProducto(user.id, id);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "No entendimos el pedido." }, { status: 400 });

  const estado = leerEstadoDeLanding(producto.landingPropia);
  const nuevo: EstadoDeLanding = { ...estado, fotos: { ...estado.fotos }, enlaces: { ...estado.enlaces } };

  if (typeof b.versionId === "string") {
    const existe = await prisma.landingDigital.findFirst({ where: { id: b.versionId, productId: producto.id }, select: { id: true } });
    if (!existe) return NextResponse.json({ error: "Esa versión no existe." }, { status: 404 });
    nuevo.versionId = existe.id;
  }

  /* Una foto o un link por vez: la pantalla guarda al terminar cada uno, y
     así dos pestañas abiertas no se pisan el mapa entero. */
  if (b.foto !== undefined) {
    const { clave, url } = comoClaveYUrl(b.foto);
    if (!clave) return NextResponse.json({ error: "No entendimos qué foto es." }, { status: 400 });
    if (url === null) delete nuevo.fotos[clave];
    else if (/^https:\/\//.test(url) && url.length <= 600) nuevo.fotos[clave] = url;
    else return NextResponse.json({ error: "Esa dirección de foto no vale." }, { status: 400 });
    if (Object.keys(nuevo.fotos).length > MAX_FOTOS_DE_LANDING) {
      return NextResponse.json({ error: `Hasta ${MAX_FOTOS_DE_LANDING} fotos por landing.` }, { status: 409 });
    }
  }

  /* Los links vienen TODOS JUNTOS, y no de a uno como las fotos.
   *
   * Son dos gestos distintos y por eso se guardan distinto. Subir una foto es
   * una acción con final propio —elegiste el archivo, se subió, listo—, así que
   * guardarla sola en ese momento es lo natural. Escribir cuatro links es UN
   * trabajo: se completan los que se sepan y recién ahí se aprieta Guardar. Ver
   * el botón del paso 5 en `LandingClient`.
   *
   * Antes esto recibía `enlace` en singular y la pantalla guardaba al salir de
   * cada campo. Andaba, pero no se notaba: nadie sabía si lo que escribió había
   * quedado, y la pantalla tenía que esperar turno entre campo y campo para que
   * dos guardados encimados no se pisaran el mapa entero. */
  if (b.enlaces !== undefined) {
    if (typeof b.enlaces !== "object" || b.enlaces === null || Array.isArray(b.enlaces)) {
      return NextResponse.json({ error: "No entendimos los links." }, { status: 400 });
    }
    const entradas = Object.entries(b.enlaces as Record<string, unknown>);
    if (entradas.length > MAX_ENLACES_DE_LANDING) {
      return NextResponse.json({ error: `Hasta ${MAX_ENLACES_DE_LANDING} links por landing.` }, { status: 409 });
    }
    for (const [clave, valor] of entradas) {
      if (!/^[a-z0-9-]{1,40}$/.test(clave)) return NextResponse.json({ error: "No entendimos qué link es." }, { status: 400 });
      const url = typeof valor === "string" ? valor.trim() : null;
      /* El mismo acomodo que hace la pantalla: si escribió `instagram.com/ella`
         se guarda con el `https://` puesto, y si no es una dirección vuelve el
         mismo error que ya leyó al lado del campo. */
      const r = acomodarEnlace(url ?? "");
      if (url === null || r.url === "") delete nuevo.enlaces[clave];
      else if (!r.error && r.url.length <= 600) nuevo.enlaces[clave] = r.url;
      else return NextResponse.json({ error: r.error ?? "Ese link no vale." }, { status: 400 });
    }
    if (Object.keys(nuevo.enlaces).length > MAX_ENLACES_DE_LANDING) {
      return NextResponse.json({ error: `Hasta ${MAX_ENLACES_DE_LANDING} links por landing.` }, { status: 409 });
    }
  }

  if (typeof b.activa === "boolean") {
    /* Prenderla sin nada subido dejaría la dirección en blanco. */
    if (b.activa && !nuevo.versionId) return NextResponse.json({ error: "Primero subí tu archivo." }, { status: 409 });
    /* Y lo que traba, traba también acá: la pantalla ya lo dice, pero quien
       manda el pedido a mano no pasa igual. Hoy es una sola cosa —que no
       haya botón de compra—, y publicar eso es gastar visitas. */
    if (b.activa && nuevo.versionId) {
      const elegida = await prisma.landingDigital.findFirst({ where: { id: nuevo.versionId, productId: producto.id }, select: { inventario: true } });
      if (elegida && tieneTraba(leerInventario(elegida.inventario).hallazgos)) {
        return NextResponse.json({ error: "Tu página no tiene ningún botón que lleve al pago. Arreglá eso y volvé a subirla." }, { status: 409 });
      }
    }
    nuevo.activa = b.activa;
  }

  await prisma.product.update({ where: { id: producto.id }, data: { landingPropia: JSON.stringify(nuevo) } });
  return NextResponse.json({ ok: true, estado: nuevo });
}

/**
 * DELETE: sacar la landing propia entera y volver a la página nuestra.
 *
 * ── Por qué hacía falta ─────────────────────────────────────────────────────
 *
 * Porque se podía apagar pero no deshacer. El interruptor devuelve la página de
 * secciones, sí, pero el archivo, las cinco versiones, las catorce fotos y los
 * links quedaban guardados para siempre, y la pantalla seguía mostrando todo
 * como si el diseño propio siguiera siendo el plan. Quien probó, no le gustó y
 * quiso volver atrás no tenía por dónde.
 *
 * ── Qué se borra y qué no ───────────────────────────────────────────────────
 *
 * Se borra TODO lo de la landing: las versiones del HTML y el estado entero
 * —prendida, versión elegida, fotos y links—. Después de esto el producto queda
 * exactamente como antes de subir nada.
 *
 * **La página de secciones no se toca.** Vive en otra columna (`paginaVenta`) y
 * quedó intacta todo este tiempo, justamente para que apagar la landing la
 * devuelva tal como la dejó. Borrar una no puede llevarse puesta la otra.
 *
 * ⚠️ Las FOTOS que subió siguen en el depósito. No se borran a propósito: son
 * archivos suyos, subidos por `/api/upload`, y nada garantiza que no las esté
 * usando en otro lado —la página de secciones, un bono—. Borrar un archivo
 * porque dejó de estar referenciado acá es exactamente cómo se le rompe una
 * imagen en otra pantalla.
 *
 * No hace falta apagarla primero: sin versión elegida, `laLanding` devuelve
 * null y la dirección vuelve sola a la nuestra. Ver `p/[id]/page.tsx`.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DIGITAL") return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  /* ⚠️ `topeDeIntentos` y NO `puertaDeEntrada`: esto es lo único que no pide el
     plan al día. Con el plan vencido la landing ya no se muestra —la dirección
     vuelve sola a la nuestra— y lo único que le queda por hacer es limpiar.
     Cobrarle un plan para poder borrar sus propias cosas sería tenerla de
     rehén. Subir y prender sí siguen siendo de los planes pagos. */
  const parado = await topeDeIntentos(user.id, "landing-borrar");
  if (parado) return parado;

  const { id } = await ctx.params;
  const producto = await elProducto(user.id, id);
  if (!producto) return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });

  /* Las dos escrituras en una transacción: si se borraran las versiones y
     fallara el update, el estado quedaría apuntando con `versionId` a una fila
     que ya no existe — y esa página no se dibuja ni se puede arreglar desde la
     pantalla, porque la lista de versiones estaría vacía. */
  await prisma.$transaction([
    prisma.landingDigital.deleteMany({ where: { productId: producto.id } }),
    prisma.product.update({ where: { id: producto.id }, data: { landingPropia: null } }),
  ]);

  return NextResponse.json({ ok: true });
}

/** `{ clave, url }`, o clave nula si no vino con forma. `url: null` borra. */
function comoClaveYUrl(v: unknown): { clave: string | null; url: string | null } {
  const o = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  const clave = typeof o.clave === "string" && /^[a-z0-9-]{1,40}$/.test(o.clave) ? o.clave : null;
  const url = typeof o.url === "string" ? o.url.trim() : null;
  return { clave, url };
}
