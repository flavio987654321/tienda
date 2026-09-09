import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { leerCapitulos } from "@/lib/ebook-ia";
import { leerOpciones } from "@/lib/ebook-opciones";
import { revisarTexto, sePuedeEditarElTexto } from "@/lib/ebook-texto";
import { estadoDelBorrador, tomarElCandado, soltarElCandado } from "@/lib/ebook-borrador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guardar el texto corregido.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA QUINTA RUTA, Y LA SEGUNDA QUE NO GASTA UN PESO
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   1. `/ebook`  — arma el temario y gasta el cupo.
 *   2. `/indice` — lo muestra y lo deja corregir ANTES de escribir. Gratis.
 *   3. `/paso`   — escribe un capítulo.
 *   4. `/armar`  — hace el PDF.
 *   5. **ESTA**  — guarda lo corregido DESPUÉS. Gratis, y no llama al modelo.
 *
 * ── Sólo guarda: no hay `GET` ──────────────────────────────────────────────
 *
 * Lo hubo un rato y se sacó. El editor es una pantalla —`productos/[id]/ebook`—
 * y una pantalla lee sus datos del lado del SERVIDOR, en el mismo viaje en que
 * se arma. Pedir el texto desde el navegador al abrir era una pantalla en
 * blanco con un reloj girando mientras viajaban decenas de miles de caracteres
 * que ya estaban a mano.
 *
 * Existe porque la ventana termina diciendo *"leelo antes de publicarlo, quien
 * vende es quien responde"* — y hasta hoy quien lo leía y encontraba una macana
 * no tenía con qué arreglarla: el único botón era "Rehacerlo", que tira el ebook
 * entero y cobra otra generación por una palabra.
 *
 * ── Por qué toma el candado, igual que las otras tres ──────────────────────
 *
 * Porque `/paso` puede estar escribiendo el capítulo que sigue en este mismo
 * momento: la cadena corre del lado del servidor y no se frena porque alguien
 * abrió el editor. Sin candado, se guarda la lista vieja encima de la nueva y el
 * capítulo recién escrito —ya pagado— desaparece.
 *
 * ⚠️ Y con el candado en la mano se vuelve a leer la fila, por lo mismo: entre
 * el primer `SELECT` y el candado pudo terminar de escribirse un capítulo. Ese
 * no viene en lo que mandó el navegador, y `revisarTexto` lo conserva.
 *
 * ── ⚠️ Por qué `LISTO` baja a `COMPLETO` al guardar ────────────────────────
 *
 * Porque el PDF que está colgado del producto **es el de antes**. El texto
 * cambió y el archivo no: el ebook volvió a ser "escrito, sin archivo", que es
 * lo que quiere decir `COMPLETO`. Así la tarjeta lo dice sola y el botón de
 * armar vuelve a aparecer.
 *
 * Y por eso NO se borra el archivo viejo: hasta que se arme el nuevo, quien
 * compre recibe el de antes. Un ebook con una falta de ortografía es mejor que
 * un producto cobrado sin nada que entregar.
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  /* No llama al modelo, así que no lleva los topes de IA. Sí un freno común:
     esto escribe en la base, y es un botón que se puede apretar seguido. */
  try {
    if (!(await checkRateLimit(`ebook-texto:${user.id}`, 120, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados cambios seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/ia/ebook/texto");
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

  /* Se contesta con lo que ya sabemos: pedir el candado para después decir que
     no se puede editar sería trabar 90 segundos un ebook por las dudas. */
  if (!sePuedeEditarElTexto(producto.ebookIA.estado)) {
    return NextResponse.json({
      error: "Todavía no hay nada escrito para corregir.",
    }, { status: 409 });
  }

  const marca = await tomarElCandado(producto.ebookIA.id);
  if (!marca) {
    return NextResponse.json({
      error: "Se está escribiendo un capítulo justo ahora. Esperá a que termine y guardá de nuevo.",
    }, { status: 409 });
  }

  /* ⚠️ CON EL CANDADO EN LA MANO SE VUELVE A LEER. Entre el `SELECT` de arriba
     y el candado pudo terminar de escribirse un capítulo. Ese capítulo no viene
     en lo que mandó el navegador, y guardar sin él lo borraría. */
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

  /* Un recetario guarda grupos de recetas donde esto espera capítulos: una
     receta son campos —cantidad, tiempo, pasos numerados—, no párrafos, y este
     editor no los sabe dibujar. Sin este corte, `leerCapitulos` devolvería una
     lista vacía y el mensaje sería "no llegó ningún capítulo", que no explica
     nada. Ver `ebook-texto`. */
  if (leerOpciones(fresco.indice).formato === "recetario") {
    await soltarElCandado(fresco.id, marca);
    return NextResponse.json({
      error: "Un recetario todavía no se corrige a mano: sus recetas son campos, no párrafos.",
    }, { status: 409 });
  }

  const hay = { capitulos: leerCapitulos(fresco.capitulos) };
  if (hay.capitulos.length === 0) {
    await soltarElCandado(fresco.id, marca);
    return NextResponse.json({ error: "Todavía no hay nada escrito para corregir." }, { status: 409 });
  }

  const revision = revisarTexto(body, hay);
  if (!revision.ok) {
    await soltarElCandado(fresco.id, marca);
    return NextResponse.json({ error: revision.error }, { status: 400 });
  }

  const capitulos = JSON.stringify(revision.capitulos);

  /* Ver arriba: el archivo que está colgado es el de antes, así que el ebook
     deja de estar `LISTO`. Los otros estados no se tocan — corregir el capítulo
     3 mientras se escribe el 7 no cambia que se está escribiendo. */
  const estado = fresco.estado === "LISTO" ? "COMPLETO" : fresco.estado;

  const guardado = await prisma.ebookIA.updateMany({
    where: { id: fresco.id, trabajandoDesde: marca },
    data: { capitulos, estado, trabajandoDesde: null, error: null },
  });
  if (guardado.count !== 1) {
    /* Perdimos el candado mientras validábamos. No se pisa nada: se avisa. */
    console.warn("[ia-ebook-texto] se perdió el candado, no se guardó el texto", { id: fresco.id });
    return NextResponse.json({
      error: "Se escribió un capítulo mientras corregías. Volvé a abrir el texto para no pisar nada.",
    }, { status: 409 });
  }

  const fila = { ...fresco, capitulos, estado, trabajandoDesde: null, error: null };

  /* ⚠️ NO vuelve el texto guardado, y es a propósito: son decenas de miles de
     caracteres que la pantalla ya tiene en la mano —los acaba de mandar— y que
     viajarían en cada guardado. Lo que necesita saber de vuelta es una sola
     cosa: si hay que rehacer el PDF. El resto lo vuelve a leer del servidor la
     propia pantalla, que es una dirección y se refresca sola. */
  return NextResponse.json({
    ok: true,
    hayQueArmar: estado === "COMPLETO",
    ebook: estadoDelBorrador(fila),
  });
}
