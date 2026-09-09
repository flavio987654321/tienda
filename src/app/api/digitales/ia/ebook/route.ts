import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { anthropic } from "@/lib/anthropic";
import { permitirGeneracion } from "@/lib/ia-digitales";
import { consumirDelCupo, devolverAlCupo, estadoDelCupo, CUPO_EBOOK, type Bolsa } from "@/lib/cupo-ia";
import {
  INSTRUCCIONES_INDICE, ESQUEMA_DEL_INDICE, normalizarIndice,
  INSTRUCCIONES_INDICE_RECETARIO, esquemaDelIndiceRecetario, seccionesParaRecetas,
  CAPITULOS_MIN, LARGO_TEMA, MINIMO_TEMA, LARGO_PUBLICO, contextoDelPadre,
  leerFotoDeTapa,
} from "@/lib/ebook-ia";
import { normalizarOpciones } from "@/lib/ebook-opciones";
import { sePuedeEditarElTemario } from "@/lib/ebook-temario";
import { estadoDelBorrador, CANDADO_MS } from "@/lib/ebook-borrador";
import { getSubscriptionStatus, getUserSubscription } from "@/lib/subscription";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import type { TierDigital } from "@/lib/planes-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Empezar un ebook: armar el temario.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA PRIMERA DE TRES, Y LA ÚNICA QUE COBRA
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   1. ESTA        — arma el temario y gasta el cupo.
 *   2. `/paso`     — escribe un capítulo. Se llama una vez por capítulo.
 *   3. `/armar`    — hace el PDF y lo cuelga del producto.
 *
 * Está partido en tres porque una función de este plan de Vercel tiene 60
 * segundos y se corta. Ver `ebook-ia`.
 *
 * ── Los tres caminos que entran por acá ────────────────────────────────────
 *
 * | Situación | Qué hace | ¿Cobra? |
 * |---|---|---|
 * | No hay ebook | Arma el temario | Sí, una del cupo |
 * | Hay uno a medio escribir | Lo devuelve tal cual | **No** |
 * | Hay uno y piden rehacerlo | Arma otro temario | El primero es gratis |
 *
 * El del medio es el que hace que cerrar la pestaña no cueste plata: al volver,
 * la pantalla pide lo mismo y recibe el borrador donde estaba.
 */

/* Corto a propósito, como en el embudo: si Anthropic no contesta, es mejor
   decir "probá de nuevo" que dejar a alguien mirando un botón girando. */
const ESPERA_MS = 45_000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  /* Rol DIGITAL, no OWNER: cada ecosistema tiene su puerta. */
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ia-ebook] falta ANTHROPIC_API_KEY");
    return NextResponse.json({ error: "La IA no está disponible en este momento." }, { status: 503 });
  }

  const sub = await getUserSubscription(user.id);
  if (!sub || sub.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }
  const tier = (sub.tier ?? "FREE") as TierDigital;
  const estado = getSubscriptionStatus(sub);
  /* ⚠️ La cuenta todavía no pagó nunca: los días de prueba son sin tarjeta. El
     regalo de bienvenida no se entrega hasta el primer cobro. Ver
     `CUPO_DE_PRUEBA` en `cupo-ia`. */
  const enPrueba = estado === "TRIAL";

  /* ⚠️ El plan sin ebooks se corta acá, con el motivo escrito. Antes de los
     topes y antes de leer el cuerpo: un pedido que no se va a atender no tiene
     que costar ni una consulta.

     Y el texto dice qué SÍ se puede hacer. "No disponible en tu plan" deja a
     alguien pensando que no puede vender, cuando lo único que no puede es
     pedirnos que se lo escribamos nosotros. */
  if (CUPO_EBOOK[tier].bienvenida <= 0 && CUPO_EBOOK[tier].mes <= 0) {
    return NextResponse.json({
      error: "Escribir el ebook con IA viene desde el plan Starter. Con el plan gratis podés subir tu propio PDF y venderlo igual.",
      sinCupo: true,
    }, { status: 403 });
  }

  /* ⚠️ Los topes van ANTES de leer el cuerpo y antes de tocar la base. Y si
     Redis no contesta, se FRENA: del otro lado hay algo que se paga, así que
     "no pude contar" tiene que cortar, nunca dejar pasar. */
  try {
    const veredicto = await permitirGeneracion({
      userId: user.id,
      sinAbono: estado === "TRIAL" || tier === "FREE",
      day: getArgentinaDayKey(),
      que: "ebook",
    });
    if (!veredicto.permitido) {
      return NextResponse.json({ error: veredicto.mensaje }, { status: 429 });
    }
  } catch (e) {
    console.error("[ia-ebook] no se pudieron contar los topes, se rechaza", e);
    return NextResponse.json(
      { error: "No pudimos verificar tu límite de generaciones. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productoId = typeof body?.productoId === "string" ? body.productoId : "";
  const tema = typeof body?.tema === "string" ? body.tema.trim().slice(0, LARGO_TEMA) : "";
  /* Formato, tema y color. Cualquier cosa rara cae a lo de fábrica: no se
     corta una generación por una preferencia mal escrita. */
  const opciones = normalizarOpciones(body?.opciones);

  const publico = typeof body?.publico === "string"
    ? (body.publico.trim().slice(0, LARGO_PUBLICO) || null)
    : null;
  const rehacer = body?.rehacer === true;

  if (!productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el ebook." }, { status: 400 });
  }

  /* ⚠️ QUE EL PRODUCTO SEA DE ESTA CUENTA, con el dueño adentro del `where` y
     no en un `if` después de leer. Es la misma regla que en el resto del
     ecosistema: sin esto, mandando el id de otro se le escribe —y se le
     reemplaza— el archivo a un producto ajeno. */
  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: {
      id: true, name: true, rolDigital: true, padreId: true,
      ebookIA: {
        select: {
          id: true, estado: true, titulo: true, indice: true, capitulos: true,
          trabajandoDesde: true, error: true, reintentos: true,
        },
      },
    },
  });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no existe." }, { status: 404 });
  }

  const yaHay = producto.ebookIA;

  /* ── Camino 2: hay uno a medio escribir y no pidieron rehacerlo ───────────
     Se devuelve tal cual, sin gastar nada. Es lo que hace que cerrar la
     pestaña no cueste plata. */
  if (yaHay && !rehacer) {
    return NextResponse.json({
      ok: true,
      retomado: true,
      ebook: estadoDelBorrador(yaHay),
      cupo: await estadoDelCupo(user.id, tier, "EBOOK", enPrueba),
    });
  }

  if (tema.length < MINIMO_TEMA) {
    return NextResponse.json(
      { error: "Contanos un poco más de qué se trata: con dos palabras no alcanza para armar un ebook." },
      { status: 400 },
    );
  }

  /* ── Rehacer: el primero es gratis ───────────────────────────────────────
     Uno incluido por ebook, y a partir del segundo se paga. Si no, el costo no
     tiene fondo: rehacerlo es lo primero que hace todo el mundo. */
  const esGratis = !!yaHay && yaHay.reintentos < 1;

  /* Y no se puede rehacer mientras se está escribiendo un capítulo: quedaría
     un capítulo pagado escribiéndose contra un temario que ya no existe. */
  if (yaHay && rehacer) {
    const trabajando =
      yaHay.trabajandoDesde != null &&
      Date.now() - yaHay.trabajandoDesde.getTime() < CANDADO_MS;
    if (trabajando) {
      return NextResponse.json(
        { error: "Se está escribiendo un capítulo justo ahora. Esperá a que termine." },
        { status: 409 },
      );
    }
  }

  /* ── De qué producto es bono o upsell ────────────────────────────────────
     Un hijo no se escribe en el aire: ver `contextoDelPadre`. Se busca ACÁ
     —después de los dos caminos que salen sin generar, antes de gastar el
     cupo— para no pagar una consulta cuando no se va a escribir nada, y para
     que si esta falla no quede una generación consumida por un ebook que nunca
     se pidió.

     ⚠️ Con el dueño adentro del `where`, igual que el producto. El `padreId`
     sale de una fila que ya es de esta cuenta, pero es una columna que apunta a
     otra fila: leerla sin el dueño sería confiar en un dato para saltear el
     control que ese mismo dato tendría que pasar. */
  const rolHijo =
    producto.rolDigital === "BONO" || producto.rolDigital === "UPSELL"
      ? producto.rolDigital
      : null;
  const padre = rolHijo && producto.padreId
    ? await prisma.product.findFirst({
        where: { id: producto.padreId, deletedAt: null, store: { ownerId: user.id } },
        select: { name: true, description: true },
      })
    : null;

  /* ⚠️ EL CUPO SE GASTA ANTES DE LLAMAR AL MODELO. Después sería tarde: ocho
     pedidos en paralelo pasarían todos el control —porque ninguno gastó
     todavía— y generarían los ocho. Si la llamada falla, se devuelve. */
  let bolsa: Bolsa | null = null;
  if (!esGratis) {
    bolsa = await consumirDelCupo(user.id, tier, "EBOOK", enPrueba);
    if (!bolsa) {
      const cupo = await estadoDelCupo(user.id, tier, "EBOOK", enPrueba);
      return NextResponse.json({
        error: cupo.topeDelMes > 0
          ? `Usaste todos tus ebooks con IA. El ${cupo.proximoMes ? "1° del mes que viene" : "mes que viene"} tenés ${cupo.topeDelMes} nuevos.`
          : "Usaste todos los ebooks con IA de tu plan.",
        sinCupo: true,
        cupo,
      }, { status: 429 });
    }
  }

  const devolver = async () => { if (bolsa) await devolverAlCupo(user.id, bolsa, "EBOOK"); };

  /* ── Un recetario se planea distinto ─────────────────────────────────────
     La lista que devuelve el modelo es la misma —título, promesa y entradas—
     pero cada entrada es una SECCIÓN de recetas y no un capítulo. Y cuántas
     hay no lo decide el modelo: sale de cuántas recetas eligió la persona,
     porque ese número va en la tapa y es lo que justifica el precio.
     Ver `seccionesParaRecetas`. */
  const esRecetario = opciones.formato === "recetario";
  const secciones = esRecetario ? seccionesParaRecetas(opciones.recetas) : 0;

  let respuesta;
  try {
    respuesta = await anthropic.messages.create(
      {
        model: "claude-sonnet-5",
        max_tokens: 2000,
        system: esRecetario ? INSTRUCCIONES_INDICE_RECETARIO : INSTRUCCIONES_INDICE,
        /* La forma la garantiza la herramienta, no una frase pidiendo JSON:
           "contestame en JSON" funciona casi siempre, y el "casi" acá es una
           pantalla rota a mitad de un ebook pago. */
        tools: [{
          name: "armar_temario",
          description: esRecetario
            ? "Devuelve el título, la promesa y las secciones del recetario."
            : "Devuelve el título, la promesa y los capítulos del ebook.",
          input_schema: esRecetario ? esquemaDelIndiceRecetario(secciones) : ESQUEMA_DEL_INDICE,
        }],
        tool_choice: { type: "tool", name: "armar_temario" },
        messages: [{
          role: "user",
          /* El texto de la persona va marcado y al final. Lo que frena un "ignorá
             lo anterior" no es una frase mágica: es la forma de la salida —sólo
             puede llenar un temario— y el limado de `normalizarIndice`. */
          content: [
            esRecetario
              ? `El recetario se llama "${producto.name}".`
              : `El ebook se llama "${producto.name}".`,
            publico ? `Está escrito para: ${publico}` : null,
            /* Antes del tema a propósito: primero de qué producto cuelga esto,
               después qué hay que escribir. Al revés, el contexto del principal
               queda leyéndose como parte del pedido. */
            ...(rolHijo && padre
              ? ["", ...contextoDelPadre(rolHijo, { nombre: padre.name, descripcion: padre.description })]
              : []),
            "",
            "De qué se trata, en palabras de quien lo vende:",
            `<tema>\n${tema}\n</tema>`,
            ...(esRecetario ? [
              "",
              `Armá exactamente ${secciones} secciones. Adentro van a ir ${opciones.recetas} recetas en total.`,
            ] : []),
          ].filter((l) => l !== null).join("\n"),
        }],
      },
      { timeout: ESPERA_MS },
    );
  } catch (e) {
    console.error("[ia-ebook] falló la llamada a Anthropic", e);
    await devolver();
    return NextResponse.json(
      { error: "No pudimos armar el temario en este momento. Probá de nuevo en un minuto." },
      { status: 502 },
    );
  }

  console.log("[ia-ebook] usage temario", {
    userId: user.id, tier,
    input: respuesta.usage.input_tokens,
    output: respuesta.usage.output_tokens,
  });

  const bloque = respuesta.content.find((b) => b.type === "tool_use");
  /* El título del producto gana sobre el que proponga la IA: la persona ya le
     puso nombre a lo que vende. Ver `normalizarIndice`. */
  /* ⚠️ El mínimo de un recetario son TODAS las secciones que se pidieron, no
     `CAPITULOS_MIN`. Si el modelo devuelve siete de diez, el recetario saldría
     con 21 recetas y se cobró uno de 30. Mejor "probá de nuevo" con el cupo
     devuelto que entregar menos de lo que dice la tapa. */
  const indice = bloque
    ? normalizarIndice(bloque.input, producto.name, esRecetario ? secciones : CAPITULOS_MIN)
    : null;

  if (!indice) {
    console.error("[ia-ebook] el temario no tenía la forma esperada", {
      userId: user.id, stop: respuesta.stop_reason,
    });
    /* No se le cobra: los tokens ya se gastaron pero la persona no se lleva
       nada, y cobrarle por un error nuestro es lo que termina en un reclamo. */
    await devolver();
    return NextResponse.json(
      { error: "Nos salió algo raro armando el temario. Probá de nuevo, o contá el tema con otras palabras." },
      { status: 502 },
    );
  }

  const datos = {
    userId: user.id,
    estado: "ESCRIBIENDO",
    tema,
    publico,
    titulo: indice.titulo,
    /* ⚠️ La PROMESA va acá adentro desde el 07/09/26. Antes se guardaba
       `indice.capitulos` a secas y la promesa —que el modelo escribe y es lo
       único pensado para la tapa— se tiraba. Ver `leerPromesa`. */
    /* ⚠️ Y las OPCIONES —formato, tema y color— también van acá adentro, no
       en columnas propias: agregar columnas es una migración y esta base es la
       de producción. Ver `ebook-opciones.ts`. */
    /* ⚠️ LA TAPA SOBREVIVE AL REHACER, y es lo único que sobrevive.
       El texto y las fotos de los capítulos no pueden: el temario nuevo no
       tiene nada que ver con el viejo, un capítulo 3 no es el mismo capítulo 3.
       La tapa sí es la misma tapa —el ebook sigue siendo de esta persona y de
       este producto— y si la subió ella, no está en ningún otro lado: tirarla
       sería perderle un archivo suyo por apretar un botón que habla del texto.
       La pantalla de confirmar lo dice con estas palabras. Ver `leerFotoDeTapa`. */
    indice: JSON.stringify({
      promesa: indice.promesa,
      capitulos: indice.capitulos,
      opciones,
      tapa: yaHay ? leerFotoDeTapa(yaHay.indice) : undefined,
    }),
    /* Se arranca de cero: el temario nuevo no tiene nada que ver con los
       capítulos del anterior. */
    capitulos: "[]",
    bolsa,
    trabajandoDesde: null,
    error: null,
  };

  try {
    if (yaHay) {
      await prisma.ebookIA.update({
        where: { id: yaHay.id },
        data: { ...datos, reintentos: { increment: 1 } },
      });
    } else {
      await prisma.ebookIA.create({ data: { ...datos, productId: producto.id } });
    }
  } catch (e) {
    /* Dos pedidos a la vez: el índice único de `productId` deja pasar uno solo.
       Al que perdió se le devuelve el cupo — no creó nada. */
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      await devolver();
      return NextResponse.json(
        { error: "Ya se está armando un ebook para este producto." },
        { status: 409 },
      );
    }
    console.error("[ia-ebook] no se pudo guardar el temario", e);
    await devolver();
    return NextResponse.json({ error: "No pudimos guardar el temario. Probá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ebook: {
      estado: "ESCRIBIENDO",
      titulo: indice.titulo,
      opciones,
      capitulos: indice.capitulos.map((c) => ({ titulo: c.titulo, listo: false })),
      escritos: 0,
      /* ⚠️ En la unidad que eligió la persona, igual que `estadoDelBorrador`:
         para un recetario son RECETAS y no las secciones en que se parten. Si
         acá dijera secciones, la barra arrancaría diciendo "0 de 4" a alguien
         que eligió 10 y recién en la segunda vuelta se acomodaría. */
      total: esRecetario ? opciones.recetas : indice.capitulos.length,
      trabajando: false,
      error: null,
      reintentos: yaHay ? yaHay.reintentos + 1 : 0,
    },
    /* ⚠️ EL TEMARIO ENTERO, para que la pantalla pueda mostrarlo y dejarlo
       corregir sin ir a buscarlo de nuevo. Acá ya está en la mano; pedirlo otra
       vez sería un viaje más que puede fallar justo después de una generación
       que se cobró, y dejar a alguien mirando una pantalla vacía.

       Misma forma que devuelve `/ebook/indice`, así la pantalla tiene un solo
       lugar donde guardarlo. Ver `loQueSeEdita`. */
    temario: {
      titulo: indice.titulo,
      promesa: indice.promesa,
      capitulos: indice.capitulos,
      escritos: 0,
      formato: opciones.formato,
      /* Del mismo estado con el que se acaba de guardar, no de un literal
         repetido: si mañana se guarda en otro estado, esto lo acompaña. */
      editable: sePuedeEditarElTemario(datos.estado),
    },
    /* `salioDe` es lo que deja avisar fuerte cuando se acabaron las del mes y se
       están empezando a comer las de bienvenida, que no vuelven. */
    salioDe: bolsa,
    gratis: esGratis,
    cupo: await estadoDelCupo(user.id, tier, "EBOOK", enPrueba),
  });
}
