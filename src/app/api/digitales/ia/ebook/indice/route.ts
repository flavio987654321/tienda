import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  leerIndice, partesEscritas, leerPromesa, leerFotoDeTapa,
} from "@/lib/ebook-ia";
import { leerOpciones } from "@/lib/ebook-opciones";
import { revisarTemario, sePuedeEditarElTemario } from "@/lib/ebook-temario";
import { estadoDelBorrador, tomarElCandado, soltarElCandado } from "@/lib/ebook-borrador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Leer y corregir el temario.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA CUARTA RUTA, Y LA ÚNICA QUE NO GASTA UN PESO
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   1. `/ebook`  — arma el temario y gasta el cupo.
 *   2. **ESTA**  — lo muestra y lo deja corregir. No llama al modelo.
 *   3. `/paso`   — escribe un capítulo, leyendo su entrada del temario.
 *   4. `/armar`  — hace el PDF.
 *
 * Va en el medio de la 1 y la 3 a propósito: es el único momento en que
 * cambiar una línea cambia el ebook entero sin costar nada. Ver `ebook-temario`.
 *
 * ── Por qué toma el candado para guardar ───────────────────────────────────
 *
 * Porque `/paso` está leyendo de acá. Sin el candado, alguien corrige el
 * capítulo 4 en una pestaña justo mientras la otra lo está escribiendo: se
 * escribe con el título viejo y se guarda pisando la corrección, o al revés.
 * Y con el candado en la mano se vuelve a leer la fila: entre el primer
 * `SELECT` y el candado pudo haberse escrito un capítulo, y ese ya no se toca.
 */

/** Lo que el editor necesita para dibujarse. */
function loQueSeEdita(fila: {
  estado: string;
  titulo: string;
  indice: string;
  capitulos: string;
}) {
  const opciones = leerOpciones(fila.indice);
  const { partes: escritos } = partesEscritas(opciones.formato, fila.capitulos);

  return {
    titulo: fila.titulo,
    promesa: leerPromesa(fila.indice),
    capitulos: leerIndice(fila.indice),
    /* Cuántas ENTRADAS del temario ya están escritas. En un recetario son
       secciones, no recetas: acá se cuenta lo que se puede tocar y lo que no,
       y lo que no se puede tocar es una entrada entera. */
    escritos,
    formato: opciones.formato,
    /* ⚠️ Lo decide el servidor, no la pantalla. Ver `sePuedeEditarElTemario`. */
    editable: sePuedeEditarElTemario(fila.estado),
  };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  const productoId = req.nextUrl.searchParams.get("productoId") ?? "";
  if (!productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el ebook." }, { status: 400 });
  }

  /* El dueño va adentro del `where`, igual que en las otras tres: sin esto,
     mandando el id de otro se le lee el temario a un producto ajeno. */
  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: {
      ebookIA: { select: { estado: true, titulo: true, indice: true, capitulos: true } },
    },
  });
  if (!producto?.ebookIA) {
    return NextResponse.json({ error: "Este producto todavía no tiene un ebook empezado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...loQueSeEdita(producto.ebookIA) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  /* No llama al modelo, así que no lleva los topes de IA. Sí un freno común:
     esto escribe en la base, y es un botón que se puede apretar seguido. */
  try {
    if (!(await checkRateLimit(`ebook-temario:${user.id}`, 120, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados cambios seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/ia/ebook/indice");
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productoId = typeof body?.productoId === "string" ? body.productoId : "";
  if (!productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el ebook." }, { status: 400 });
  }

  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: { ebookIA: { select: { id: true, estado: true } } },
  });
  if (!producto?.ebookIA) {
    return NextResponse.json({ error: "Este producto todavía no tiene un ebook empezado." }, { status: 404 });
  }

  /* Se contesta acá con lo que ya sabemos: pedir el candado para después decir
     que no se puede editar sería trabar 90 segundos un ebook por las dudas. */
  if (!sePuedeEditarElTemario(producto.ebookIA.estado)) {
    return NextResponse.json({
      error: "El ebook ya está escrito, así que el temario no cambia nada. Si querés otro, hay que rehacerlo.",
    }, { status: 409 });
  }

  const marca = await tomarElCandado(producto.ebookIA.id);
  if (!marca) {
    return NextResponse.json({
      error: "Se está escribiendo un capítulo justo ahora. Esperá a que termine y guardá de nuevo.",
    }, { status: 409 });
  }

  /* ⚠️ CON EL CANDADO EN LA MANO SE VUELVE A LEER. Entre el `SELECT` de arriba
     y el candado pudo terminar de escribirse un capítulo, y con la lectura
     vieja ese capítulo contaría como "todavía se puede tocar". */
  const fresco = await prisma.ebookIA.findUnique({
    where: { id: producto.ebookIA.id },
    select: {
      id: true, estado: true, titulo: true, indice: true, capitulos: true,
      trabajandoDesde: true, error: true, reintentos: true,
    },
  });
  if (!fresco) {
    await soltarElCandado(producto.ebookIA.id, marca);
    return NextResponse.json({ error: "Este producto todavía no tiene un ebook empezado." }, { status: 404 });
  }

  /* ⚠️ Y SE VUELVE A MIRAR EL ESTADO, no sólo lo escrito. Arriba se miró con la
     lectura vieja, y justo en el medio pudo terminar de escribirse el último
     capítulo: ahí el ebook pasó a COMPLETO y el temario ya no dirige nada.
     Guardar igual no rompería nada —los títulos del PDF salen de cada capítulo
     escrito— pero le diría a alguien que guardó un cambio que no va a ver. */
  if (!sePuedeEditarElTemario(fresco.estado)) {
    await soltarElCandado(fresco.id, marca);
    return NextResponse.json({
      error: "Se terminó de escribir mientras corregías, así que el temario ya no cambia nada. Si querés otro, hay que rehacerlo.",
    }, { status: 409 });
  }

  const opciones = leerOpciones(fresco.indice);
  const hay = {
    capitulos: leerIndice(fresco.indice),
    escritos: partesEscritas(opciones.formato, fresco.capitulos).partes,
    /* Un recetario y una infografía tienen las secciones repartidas según
       lo que se eligió; sólo el ebook de texto deja agregar o quitar. */
    porSecciones: opciones.formato !== "texto",
  };

  const revision = revisarTemario(body, hay);
  if (!revision.ok) {
    await soltarElCandado(fresco.id, marca);
    return NextResponse.json({ error: revision.error }, { status: 400 });
  }

  /* ⚠️ LAS OPCIONES SALEN DE LO GUARDADO, NUNCA DEL NAVEGADOR. Viven adentro
     de este mismo JSON (ver `ebook-opciones`), así que reescribirlo sin ellas
     las borraría — un recetario de 30 volvería a ser un ebook de texto en el
     medio de la escritura. Y tomarlas del cuerpo sería dejar cambiar por acá
     lo que se cobró: el formato y la cantidad de recetas se eligen una vez. */
  /* ⚠️ Y LA TAPA IGUAL: también vive en la raíz de este JSON, así que sin esta
     línea corregir el temario borraría la foto que alguien eligió para la tapa.
     No se toma del cuerpo porque esta pantalla no la edita — la edita el editor
     del texto. Ver `leerFotoDeTapa`. */
  const indice = JSON.stringify({
    promesa: revision.temario.promesa,
    capitulos: revision.temario.capitulos,
    tapa: leerFotoDeTapa(fresco.indice),
    opciones,
  });

  const guardado = await prisma.ebookIA.updateMany({
    where: { id: fresco.id, trabajandoDesde: marca },
    data: { titulo: revision.temario.titulo, indice, trabajandoDesde: null, error: null },
  });
  if (guardado.count !== 1) {
    /* Perdimos el candado mientras validábamos. No se pisa nada: se avisa. */
    console.warn("[ia-ebook-indice] se perdió el candado, no se guardó el temario", { id: fresco.id });
    return NextResponse.json({
      error: "Se empezó a escribir mientras corregías. Volvé a abrir el temario para no pisar nada.",
    }, { status: 409 });
  }

  const fila = {
    ...fresco,
    titulo: revision.temario.titulo,
    indice,
    trabajandoDesde: null,
    error: null,
  };

  return NextResponse.json({
    ok: true,
    ebook: estadoDelBorrador(fila),
    ...loQueSeEdita(fila),
  });
}
