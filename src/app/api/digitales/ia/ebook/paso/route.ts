import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { anthropic } from "@/lib/anthropic";
import { contarConTope } from "@/lib/rate-limit";
import {
  permitirGeneracion, MARGEN_DE_INTENTOS, VENTANA_DEL_EBOOK_MS,
} from "@/lib/ia-digitales";
import {
  INSTRUCCIONES_CAPITULO, ESQUEMA_DEL_CAPITULO, normalizarCapitulo,
  INSTRUCCIONES_RECETAS, esquemaDeRecetas, normalizarRecetas, pedidoDeRecetas,
  INSTRUCCIONES_LAMINAS, esquemaDeLaminas, normalizarLaminas, pedidoDeLaminas,
  leerIndice, leerCapitulos, leerGruposDeRecetas, leerGruposDeLaminas,
  recetasDeLaSeccion, laminasDeLaSeccion, pedidoDelCapitulo,
} from "@/lib/ebook-ia";
import { leerOpciones } from "@/lib/ebook-opciones";
import { seguirLaCadena } from "@/lib/ebook-cadena";
import { estadoDelBorrador, tomarElCandado, guardarCapitulo, soltarElCandado } from "@/lib/ebook-borrador";
import { getSubscriptionStatus, getUserSubscription } from "@/lib/subscription";
import { getArgentinaDayKey } from "@/lib/fechas-comerciales";
import type { TierDigital } from "@/lib/planes-digitales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Escribir el capítulo que sigue.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTA RUTA NO COBRA — Y ES LA QUE MÁS PLATA GASTA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El cupo se gastó al armar el temario. Acá se escribe lo que ya está pagado,
 * un capítulo por pedido, porque diez capítulos no entran en los 60 segundos
 * que dura una función en este plan.
 *
 * O sea que **el freno de acá no es el cupo, son otros dos**:
 *
 * 1. **El candado.** Dos pedidos a la vez escribirían dos veces el mismo
 *    capítulo. Vence solo, así que un pedido muerto no traba el ebook.
 * 2. **El presupuesto de llamadas de ESE ebook.** Es el único agujero sin
 *    fondo que tiene esta función: una pantalla con un bucle mal escrito —o
 *    alguien apretando F5— puede pedir "escribime el que falta" para siempre.
 *    Cada intento fallido no le gasta cupo a la persona, pero nos cuesta plata
 *    igual.
 *
 * ── Lo que devuelve ────────────────────────────────────────────────────────
 *
 * El estado entero del borrador, para que la pantalla dibuje la barra y sepa si
 * tiene que volver a llamar. **Sin el texto de los capítulos**: son decenas de
 * miles de caracteres que viajarían en cada vuelta para nada.
 */

/* 50 segundos: por debajo de los 60 que dura la función, así el error lo damos
   nosotros con un mensaje y no la plataforma con una pantalla en blanco. */
const ESPERA_MS = 50_000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ia-ebook-paso] falta ANTHROPIC_API_KEY");
    return NextResponse.json({ error: "La IA no está disponible en este momento." }, { status: 503 });
  }

  const sub = await getUserSubscription(user.id);
  if (!sub || sub.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }
  const tier = (sub.tier ?? "FREE") as TierDigital;

  /* La ráfaga de los capítulos es más alta que la del botón de una sola
     llamada, y no toca los globales: el ebook los tocó al empezar. Ver
     `ia-digitales`. */
  try {
    const veredicto = await permitirGeneracion({
      userId: user.id,
      sinAbono: getSubscriptionStatus(sub) === "TRIAL" || tier === "FREE",
      day: getArgentinaDayKey(),
      que: "capitulo",
    });
    if (!veredicto.permitido) {
      return NextResponse.json({ error: veredicto.mensaje }, { status: 429 });
    }
  } catch (e) {
    console.error("[ia-ebook-paso] no se pudieron contar los topes, se rechaza", e);
    return NextResponse.json(
      { error: "No pudimos verificar tu límite. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productoId = typeof body?.productoId === "string" ? body.productoId : "";
  if (!productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el ebook." }, { status: 400 });
  }

  /* El dueño va adentro del `where`, igual que en la ruta de empezar. */
  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: {
      id: true,
      ebookIA: {
        select: {
          id: true, estado: true, titulo: true, tema: true, publico: true,
          indice: true, capitulos: true, trabajandoDesde: true, error: true, reintentos: true,
        },
      },
    },
  });
  if (!producto?.ebookIA) {
    return NextResponse.json({ error: "Este producto todavía no tiene un ebook empezado." }, { status: 404 });
  }

  const ebook = producto.ebookIA;
  const indice = leerIndice(ebook.indice);
  const opciones = leerOpciones(ebook.indice);
  const esRecetario = opciones.formato === "recetario";
  const esInfografia = opciones.formato === "infografia";

  /* ⚠️ Los tres formatos guardan en la MISMA columna y con la misma forma de
     afuera: una lista donde cada elemento es una llamada ya cobrada. Por eso
     de acá para abajo el bucle es idéntico —"¿cuál sigue?" es el largo de lo
     escrito— y lo único que cambia es qué se le pide al modelo. */
  const previos: unknown[] = esRecetario
    ? leerGruposDeRecetas(ebook.capitulos)
    : esInfografia
      ? leerGruposDeLaminas(ebook.capitulos)
      : leerCapitulos(ebook.capitulos);
  const yaVan = previos.length;

  const sigue = yaVan >= indice.length
    ? null
    : { numero: yaVan + 1, capitulo: indice[yaVan] };

  /* Ya está completo: se contesta que sí sin llamar al modelo. Que la pantalla
     pida uno de más no puede costar plata. */
  if (!sigue) {
    /* ⚠️ Pero si el PDF todavía no está, la cadena NO se puede cortar acá.
       Es el ebook que quedó a un paso del final: están los diez capítulos,
       falta el archivo. Sin esta línea, un eslabón que llega con todo escrito
       contesta "listo" y se va, y queda un ebook pago sin nada que entregar.

       Con LISTO no se hace nada: el archivo ya existe y volver a armarlo sería
       trabajo y storage por gusto. */
    if (ebook.estado === "COMPLETO") {
      seguirLaCadena(req, "/api/digitales/ia/ebook/armar", { productoId });
    }
    return NextResponse.json({ ok: true, listo: true, ebook: estadoDelBorrador(ebook) });
  }

  /* ⚠️ EL PRESUPUESTO DE ESTE EBOOK. Es el número de capítulos más un margen:
     alcanza para que cada capítulo falle una vez y se reintente, y no para
     mucho más. Va contra el id del ebook y no contra la cuenta, así que un
     ebook que se descontrola no le come el presupuesto a otro.

     Con ventana de dos horas: que se olvide es correcto — quien retoma su
     ebook al día siguiente arranca con el margen entero, que es justo el caso
     para el que se guardó el borrador. */
  try {
    const presupuesto = await contarConTope(
      `ia-ebook-llamadas:${ebook.id}`,
      indice.length + MARGEN_DE_INTENTOS,
      VENTANA_DEL_EBOOK_MS,
    );
    if (!presupuesto.permitido) {
      console.error("[ia-ebook-paso] un ebook se pasó de su presupuesto de llamadas", {
        ebookId: ebook.id, userId: user.id, cuenta: presupuesto.cuenta,
      });
      return NextResponse.json({
        error: "Este ebook tuvo demasiados intentos seguidos. Esperá un rato y seguí, o volvé a empezarlo.",
      }, { status: 429 });
    }
  } catch (e) {
    console.error("[ia-ebook-paso] no se pudo contar el presupuesto, se rechaza", e);
    return NextResponse.json(
      { error: "No pudimos verificar tu límite. Probá de nuevo en un momento." },
      { status: 503 },
    );
  }

  /* ⚠️ El candado. Si otro pedido está escribiendo, este se va sin gastar. */
  const marca = await tomarElCandado(ebook.id);
  if (!marca) {
    return NextResponse.json({
      ok: true,
      esperando: true,
      ebook: estadoDelBorrador(ebook),
    });
  }

  /* Cuántas recetas —o láminas— escribe ESTA sección. Todas llevan lo mismo
     menos la última, que se queda con el resto: con 10 recetas son 3, 3, 3 y 1. */
  /* ⚠️ Nunca menos de una. `recetasDeLaSeccion` devuelve 0 para una sección que
     no existe, y con eso el esquema pediría `minItems: 0` —una lista vacía
     válida— y se pagaría una llamada que no puede devolver nada. Hoy no puede
     pasar (el número sale del largo del temario), pero es el borde que se paga. */
  const cuantasRecetas = esRecetario
    ? Math.max(1, recetasDeLaSeccion(opciones.recetas, sigue.numero))
    : 0;
  const cuantasLaminas = esInfografia
    ? Math.max(1, laminasDeLaSeccion(opciones.laminas, sigue.numero))
    : 0;

  /* Lo que cambia entre los tres formatos, decidido una vez: qué se le pide,
     con qué forma, y cómo se lee lo que vuelve. El bucle de abajo no lo mira. */
  const { titulo, tema, publico } = ebook;
  const plan = esRecetario
    ? {
      /* ⚠️ 4.000 para las recetas y no los 3.000 del capítulo. Medido: tres
         recetas son 2.866 tokens de salida. Cortarse en `max_tokens` no
         devuelve las que ya escribió, devuelve NADA, y se paga igual — pasó
         con cinco recetas y 4.000. Ver `RECETAS_POR_LLAMADA`. */
      maxTokens: 4000,
      system: INSTRUCCIONES_RECETAS,
      herramienta: {
        name: "escribir_recetas",
        description: "Devuelve las recetas de una sección, cada una con sus campos.",
        input_schema: esquemaDeRecetas(cuantasRecetas),
      },
      pedido: pedidoDeRecetas(titulo, tema, publico, indice, sigue.numero, cuantasRecetas),
      leer: (entrada: unknown): unknown | null => {
        const recetas = normalizarRecetas(entrada, cuantasRecetas);
        return recetas.length > 0 ? recetas : null;
      },
      incompleto: `Las recetas de "${sigue.capitulo.titulo}" salieron incompletas. Probá de nuevo: lo anterior no se pierde.`,
    }
    : esInfografia
      ? {
        /* Cinco láminas son menos de 1.000 tokens de salida: entra holgado en
           3.000. Se mide con la primera generación real. */
        maxTokens: 3000,
        system: INSTRUCCIONES_LAMINAS,
        herramienta: {
          name: "escribir_laminas",
          description: "Devuelve las láminas de una sección, cada una con su título, su texto y sus datos.",
          input_schema: esquemaDeLaminas(cuantasLaminas),
        },
        pedido: pedidoDeLaminas(titulo, tema, publico, indice, sigue.numero, cuantasLaminas),
        leer: (entrada: unknown): unknown | null => {
          const laminas = normalizarLaminas(entrada, cuantasLaminas);
          return laminas.length > 0 ? laminas : null;
        },
        incompleto: `Las láminas de "${sigue.capitulo.titulo}" salieron incompletas. Probá de nuevo: lo anterior no se pierde.`,
      }
      : {
        maxTokens: 3000,
        system: INSTRUCCIONES_CAPITULO,
        herramienta: {
          name: "escribir_capitulo",
          description: "Devuelve el capítulo en pedazos: párrafos, subtítulos y viñetas.",
          input_schema: ESQUEMA_DEL_CAPITULO,
        },
        pedido: pedidoDelCapitulo(titulo, tema, publico, indice, sigue.numero),
        leer: (entrada: unknown): unknown | null => normalizarCapitulo(entrada, sigue.capitulo.titulo),
        incompleto: `El capítulo ${sigue.numero} salió incompleto. Probá de nuevo: lo anterior no se pierde.`,
      };

  let respuesta;
  try {
    respuesta = await anthropic.messages.create(
      {
        model: "claude-sonnet-5",
        max_tokens: plan.maxTokens,
        system: plan.system,
        tools: [plan.herramienta],
        tool_choice: { type: "tool", name: plan.herramienta.name },
        messages: [{ role: "user", content: plan.pedido }],
      },
      { timeout: ESPERA_MS },
    );
  } catch (e) {
    console.error("[ia-ebook-paso] falló la llamada a Anthropic", e);
    /* Se suelta el candado ya: sin esto habría que esperar los 90 segundos del
       vencimiento para reintentar, y quien mira la barra no entiende por qué el
       botón no hace nada. */
    await soltarElCandado(ebook.id, marca);
    return NextResponse.json({
      error: `No pudimos escribir el capítulo ${sigue.numero}. Probá de nuevo: lo que ya está escrito no se pierde.`,
    }, { status: 502 });
  }

  console.log("[ia-ebook-paso] usage", {
    userId: user.id, ebookId: ebook.id, capitulo: sigue.numero,
    input: respuesta.usage.input_tokens,
    output: respuesta.usage.output_tokens,
  });

  const bloque = respuesta.content.find((b) => b.type === "tool_use");
  const escrito = bloque ? plan.leer(bloque.input) : null;

  if (!escrito) {
    console.error("[ia-ebook-paso] lo escrito no tenía la forma esperada", {
      ebookId: ebook.id, parte: sigue.numero, formato: opciones.formato, stop: respuesta.stop_reason,
    });
    await soltarElCandado(ebook.id, marca);
    return NextResponse.json({ error: plan.incompleto }, { status: 502 });
  }

  const nuevos: unknown[] = [...previos, escrito];
  /* COMPLETO quiere decir "están todos los capítulos, falta el PDF". No es lo
     mismo que LISTO, que es cuando el archivo ya está colgado del producto. */
  const nuevoEstado = nuevos.length >= indice.length ? "COMPLETO" : "ESCRIBIENDO";

  const guardado = await guardarCapitulo(ebook.id, marca, JSON.stringify(nuevos), nuevoEstado);
  if (!guardado) {
    /* Perdimos el candado mientras escribíamos: otro pedido escribió este
       capítulo. Se tira lo nuestro — costó plata, pero está peor pisar lo del
       otro. Se relee para contestar con lo que de verdad hay. */
    console.warn("[ia-ebook-paso] se perdió el candado, se descarta el capítulo escrito", {
      ebookId: ebook.id, capitulo: sigue.numero,
    });
    const fresco = await prisma.ebookIA.findUnique({
      where: { id: ebook.id },
      select: {
        estado: true, titulo: true, indice: true, capitulos: true,
        trabajandoDesde: true, error: true, reintentos: true,
      },
    });
    return NextResponse.json({
      ok: true,
      ebook: fresco ? estadoDelBorrador(fresco) : estadoDelBorrador(ebook),
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     EL ESLABÓN SIGUIENTE. Acá es donde el ebook deja de depender de la pestaña.
     ══════════════════════════════════════════════════════════════════════════

     Falta un capítulo → se llama otra vez a esta misma ruta.
     Están todos      → se llama a `armar`, que es la que hace el PDF y lo
                        cuelga del producto.

     ⚠️ La segunda mitad no es un detalle. La pantalla armaba el PDF al salir
     del bucle, así que sin esta línea la cadena escribiría los diez capítulos
     con la pestaña cerrada y el archivo no existiría igual: quedaría un ebook
     COMPLETO y un producto sin nada que entregar. Escribir todo y no entregar
     nada es peor que no haber empezado.

     Va DESPUÉS de contestar (`despues`), así que la persona ve el capítulo
     dibujarse sin esperar a que arranque el que sigue. Ver `ebook-cadena`. */
  seguirLaCadena(
    req,
    nuevoEstado === "COMPLETO"
      ? "/api/digitales/ia/ebook/armar"
      : "/api/digitales/ia/ebook/paso",
    { productoId },
  );

  return NextResponse.json({
    ok: true,
    listo: nuevoEstado === "COMPLETO",
    ebook: estadoDelBorrador({
      ...ebook,
      estado: nuevoEstado,
      capitulos: JSON.stringify(nuevos),
      trabajandoDesde: null,
      error: null,
    }),
  });
}
