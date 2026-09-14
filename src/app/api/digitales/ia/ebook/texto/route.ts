import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  leerCapitulos, leerIndice, leerPromesa, leerFotoDeTapa, leerGruposDeRecetas, leerGruposDeLaminas,
} from "@/lib/ebook-ia";
import { leerOpciones } from "@/lib/ebook-opciones";
import {
  revisarTexto, sePuedeEditarElTexto, pegarLasFotos, pegarLaTapa,
} from "@/lib/ebook-texto";
import { revisarRecetas } from "@/lib/recetario-texto";
import { revisarLaminas } from "@/lib/infografia-texto";
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

  /* ══════════════════════════════════════════════════════════════════════════
     TRES FORMATOS, UNA SOLA PUERTA
     ══════════════════════════════════════════════════════════════════════════

     Acá había un CORTE: un recetario se rechazaba con "todavía no se corrige a
     mano", porque sus recetas son campos —cantidad, tiempo, pasos numerados— y
     no párrafos. Eso dejaba a quien hizo un recetario con el mismo agujero que
     tenía el ebook de texto antes de esta ruta: **arreglar una coma costaba una
     generación entera**. Y en un recetario duele más, porque lo que se corrige
     suele ser un número, y un número mal es una receta que no sale.

     Ahora los tres entran por acá —el recetario desde el 09/09/26, la
     infografía desde el 14/09/26—. Lo que cambia es qué se revisa y qué se
     guarda; todo lo de alrededor —el candado, la relectura fresca, el estado, el
     freno, la respuesta— es lo mismo, y tiene que serlo: son las partes donde
     equivocarse borra algo que se pagó.

     ⚠️ Y cada formato lima con las reglas de SU lector. Las de un recetario
     están en `revisarRecetas` y las de una infografía en `revisarLaminas`, y no
     son las mismas: ahí lo que desaparece en silencio no es un capítulo, es una
     receta o una lámina entera. */
  const opciones = leerOpciones(fresco.indice);
  const esRecetario = opciones.formato === "recetario";
  const esInfografia = opciones.formato === "infografia";

  let capitulos: string;
  let indiceNuevo: string;

  if (esRecetario || esInfografia) {
    /* Los dos formatos por hoja se revisan con su propio lector y se guardan
       igual: grupos por sección, en la misma columna. */
    const revision = (() => {
      if (esRecetario) {
        const hay = { grupos: leerGruposDeRecetas(fresco.capitulos) };
        return hay.grupos.length === 0 ? null : revisarRecetas(body, hay);
      }
      const hay = { grupos: leerGruposDeLaminas(fresco.capitulos) };
      return hay.grupos.length === 0 ? null : revisarLaminas(body, hay);
    })();
    if (!revision) {
      await soltarElCandado(fresco.id, marca);
      return NextResponse.json({ error: "Todavía no hay nada escrito para corregir." }, { status: 409 });
    }
    if (!revision.ok) {
      await soltarElCandado(fresco.id, marca);
      return NextResponse.json({ error: revision.error }, { status: 400 });
    }

    capitulos = JSON.stringify(revision.grupos);

    /* ⚠️ El índice de un recetario —o de una infografía— tiene SECCIONES, y
       esta pantalla no las edita: la foto de cada receta o lámina vive adentro
       de ella. Así que de acá lo único que puede cambiar es la tapa, y todo lo
       demás se vuelve a escribir tal cual — sin `promesa` y `opciones`, guardar
       esto convertiría un recetario de 30 en un ebook de texto. */
    indiceNuevo = JSON.stringify({
      promesa: leerPromesa(fresco.indice),
      capitulos: leerIndice(fresco.indice),
      tapa: pegarLaTapa(body, leerFotoDeTapa(fresco.indice)),
      opciones,
    });
  } else {
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

    capitulos = JSON.stringify(revision.capitulos);

    /* ══════════════════════════════════════════════════════════════════════════
       LAS FOTOS VAN EN EL MISMO GUARDADO
       ══════════════════════════════════════════════════════════════════════════

       Viven en el índice —ahí está la frase con la que se busca cada una y,
       ahora, cuál se eligió— así que esto reescribe las dos columnas de una. Es
       un solo botón para la persona y una sola escritura acá: partido en dos
       guardados, uno podría entrar y el otro no, y el capítulo quedaría con el
       texto nuevo y la foto vieja.

       ⚠️ Y se reescribe con `promesa` y `opciones` puestas de nuevo, igual que
       en `/indice`: viven adentro de este mismo JSON, así que guardarlo sin
       ellas las borraría. */
    indiceNuevo = JSON.stringify({
      promesa: leerPromesa(fresco.indice),
      capitulos: pegarLasFotos(body, leerIndice(fresco.indice)),
      tapa: pegarLaTapa(body, leerFotoDeTapa(fresco.indice)),
      opciones,
    });
  }

  /* Ver arriba: el archivo que está colgado es el de antes, así que el ebook
     deja de estar `LISTO`. Los otros estados no se tocan — corregir el capítulo
     3 mientras se escribe el 7 no cambia que se está escribiendo. */
  const estado = fresco.estado === "LISTO" ? "COMPLETO" : fresco.estado;

  const guardado = await prisma.ebookIA.updateMany({
    where: { id: fresco.id, trabajandoDesde: marca },
    data: { capitulos, indice: indiceNuevo, estado, trabajandoDesde: null, error: null },
  });
  if (guardado.count !== 1) {
    /* Perdimos el candado mientras validábamos. No se pisa nada: se avisa. */
    console.warn("[ia-ebook-texto] se perdió el candado, no se guardó el texto", { id: fresco.id });
    return NextResponse.json({
      error: "Se escribió un capítulo mientras corregías. Volvé a abrir el texto para no pisar nada.",
    }, { status: 409 });
  }

  const fila = { ...fresco, capitulos, indice: indiceNuevo, estado, trabajandoDesde: null, error: null };

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
