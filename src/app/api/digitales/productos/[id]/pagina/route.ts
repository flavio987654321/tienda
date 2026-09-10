import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizarContenido } from "@/lib/pagina-venta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guarda el contenido de la página de venta de un producto.
 *
 * ── Lo único que hace de verdad ─────────────────────────────────────────────
 *
 * Pasar lo que llega por `normalizarContenido` y guardar el resultado. **Nunca
 * lo que llegó.** Esa función es la que sabe qué secciones existen, cuáles no se
 * pueden apagar y cuánto mide cada campo; sin ella, esta ruta guardaría lo que
 * el navegador quiera —incluida una página sin precio— y la pantalla pública
 * dibujaría eso.
 *
 * Por eso no hay validación escrita acá. Duplicarla sería tener dos reglas para
 * lo mismo, y la que se queda vieja es la que nadie mira.
 */

/** Tope del cuerpo del pedido. Ver el porqué abajo. */
const MAX_CUERPO = 64 * 1024;

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    if (!(await checkRateLimit(`pagina-venta:${user.id}`, 120, 60 * 60_000))) {
      return NextResponse.json(
        { error: "Guardaste muchas veces seguidas. Esperá un momento." },
        { status: 429 }
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/pagina");
  }

  const { id } = await ctx.params;

  /* ⚠️ El cuerpo se lee como texto y se mide ANTES de parsearlo. Una página
     normalizada no llega a 20 KB, así que arriba de esto es basura o alguien
     probando cuánto aguantamos — y `JSON.parse` de varios megas bloquea el hilo
     mientras corre. */
  const crudo = await req.text().catch(() => null);
  if (crudo === null || crudo.length > MAX_CUERPO) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  /* Que sea de esta cuenta, y que sea un PRINCIPAL: los bonos y los upsells
     viajan adentro de la página de su padre, no tienen una propia. El dueño va
     ADENTRO del `where` y no se filtra después — una consulta que ya no puede
     devolver lo ajeno no se puede olvidar de comprobarlo. */
  const producto = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
    select: { id: true },
  });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });
  }

  const pagina = normalizarContenido(cuerpo);

  await prisma.product.update({
    where: { id: producto.id },
    data: { paginaVenta: JSON.stringify(pagina) },
  });

  /* Se devuelve lo GUARDADO, no un `ok`. La pantalla se queda con esto, así que
     si el servidor recortó un texto o descartó una sección, se ve en el acto y
     no la próxima vez que alguien entre. */
  return NextResponse.json({ ok: true, pagina });
}

/**
 * Cambia SÓLO cómo se ve la página: el estilo, la paleta y la letra.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ POR QUÉ NO ALCANZABA CON EL PUT DE ARRIBA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Porque el PUT **reemplaza**: guarda `normalizarContenido(lo que llegó)`. Si
 * alguien manda sólo `{ estilo, paleta }`, esa función no ve ninguna sección y
 * arma una página nueva entera con los textos de fábrica. O sea que cambiar el
 * color borraría lo que escribió la IA y lo que la persona editó a mano.
 *
 * Por eso acá se lee lo que hay, se le cambian esas tres claves y se guarda el
 * resultado. La pantalla del cierre —que elige el aspecto antes de que exista
 * nada más— no tiene por qué conocer la página entera para poder pintarla.
 *
 * ⚠️ Las tres claves NO se guardan como llegaron: pasan por
 * `normalizarContenido` igual que todo lo demás, así que una paleta inventada
 * cae en la de fábrica en vez de quedar escrita en la base.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  /* El mismo cubo que el PUT: es la misma página y el mismo abuso posible. */
  try {
    if (!(await checkRateLimit(`pagina-venta:${user.id}`, 120, 60 * 60_000))) {
      return NextResponse.json(
        { error: "Guardaste muchas veces seguidas. Esperá un momento." },
        { status: 429 }
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/productos/[id]/pagina");
  }

  const { id } = await ctx.params;

  /* Acá el cuerpo son tres palabras cortas, así que el tope es chico de verdad:
     nada legítimo se acerca. */
  const crudo = await req.text().catch(() => null);
  if (crudo === null || crudo.length > 1024) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  let cuerpo: Record<string, unknown>;
  try {
    const leido = JSON.parse(crudo);
    if (!leido || typeof leido !== "object" || Array.isArray(leido)) throw new Error("no es objeto");
    cuerpo = leido as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  /* El dueño va ADENTRO del `where`, como en el PUT: una consulta que ya no
     puede devolver lo ajeno no se puede olvidar de comprobarlo. */
  const producto = await prisma.product.findFirst({
    where: { id, deletedAt: null, rolDigital: "PRINCIPAL", store: { ownerId: user.id } },
    select: { id: true, paginaVenta: true },
  });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no existe" }, { status: 404 });
  }

  /* ⚠️ ACÁ ESTÁ TODA LA DIFERENCIA CON EL PUT: primero lo que hay.

     Se le pasa la columna tal cual —es `String?` y adentro hay JSON— porque
     `normalizarContenido` ya sabe leer las dos formas; es lo mismo que hace la
     pantalla del editor al abrirse. Parsearlo acá a mano agregaría un `throw`
     que hoy no existe: una página guardada a medias tiraría 500 en vez de
     volver a la de fábrica. */
  const actual = normalizarContenido(producto.paginaVenta);

  /* `typeof === "string"` y no `?? actual.x`: con el `??` a secas, un
     `{ estilo: {} }` pasa por delante del valor actual y `normalizarContenido`
     lo baja al de fábrica — o sea que un cuerpo mal armado le CAMBIA el aspecto
     a la página en vez de dejarlo como estaba. Lo que no es una palabra no toca
     nada. */
  const texto = (v: unknown, siNo: string) => (typeof v === "string" ? v : siNo);

  const pagina = normalizarContenido({
    ...actual,
    estilo: texto(cuerpo.estilo, actual.estilo),
    paleta: texto(cuerpo.paleta, actual.paleta),
    tipografia: texto(cuerpo.tipografia, actual.tipografia),
  });

  await prisma.product.update({
    where: { id: producto.id },
    data: { paginaVenta: JSON.stringify(pagina) },
  });

  return NextResponse.json({ ok: true, pagina });
}
