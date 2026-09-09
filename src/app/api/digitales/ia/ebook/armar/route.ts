import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { rutaDeArchivo, refDeArchivo, rutaDeRef, nombreDeArchivo } from "@/lib/subida-digital";
import { configDeposito, subirAlDeposito, borrarDelDeposito } from "@/lib/deposito-digital";
import {
  leerIndice, leerCapitulos, leerGruposDeRecetas, leerPromesa, leerFotoDeTapa,
  conAvisoDeFotos,
} from "@/lib/ebook-ia";
import { armarPDF } from "@/lib/ebook-pdf";
import { dibujarLaTapa } from "@/lib/tapa-imagen";
import { configDeImagenes, guardarImagen, guardarImagenEnDisco } from "@/lib/deposito-imagenes";
import { buscarFoto, buscarFotos, bajarElegida, comoFue } from "@/lib/fotos-pexels";
import { leerOpciones, conEstilo } from "@/lib/ebook-opciones";
import { normalizarContenido, buscarPaleta } from "@/lib/pagina-venta";
import { estadoDelBorrador, tomarElCandado, soltarElCandado } from "@/lib/ebook-borrador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Armar el PDF y colgarlo del producto.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA ÚNICA DE LAS TRES QUE NO LLAMA AL MODELO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Todo lo que se escribe ya está guardado. Acá se junta, se dibuja el PDF, se
 * sube al depósito y recién ahí se le pone al producto — en ese orden, que es
 * el mismo de la subida a mano y por el mismo motivo: si se guardara la
 * referencia antes de que el archivo esté arriba, el producto quedaría
 * apuntando a algo que no existe, `loQueFalta` lo daría por listo y se podría
 * publicar. **Se cobra y no hay nada que entregar.**
 *
 * ── Por qué también toma el candado ────────────────────────────────────────
 *
 * Porque dos pedidos a la vez subirían dos archivos y el producto se quedaría
 * con uno solo: el otro queda en el depósito sin que nadie lo pueda alcanzar, y
 * lo pagamos para siempre.
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  /* No llama al modelo, así que no lleva los topes de IA. Sí un freno común:
     esto sube archivos y escribe en la base. */
  try {
    if (!(await checkRateLimit(`ebook-armar:${user.id}`, 30, 60 * 60_000))) {
      return NextResponse.json({ error: "Demasiados intentos seguidos. Esperá un momento." }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/ia/ebook/armar");
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const productoId = typeof body?.productoId === "string" ? body.productoId : "";
  if (!productoId) {
    return NextResponse.json({ error: "Falta decir de qué producto es el ebook." }, { status: 400 });
  }

  const producto = await prisma.product.findFirst({
    where: { id: productoId, deletedAt: null, store: { ownerId: user.id } },
    select: {
      id: true,
      archivoPath: true,
      /* ⚠️ Para NO pisarla. Si la persona subió su portada, esa manda: la tapa
         del ebook se pone sólo donde hoy hay un cuadrado vacío. */
      images: true,
      /* Para la tapa: de acá sale la paleta que la persona ya eligió para su
         página de venta, así el PDF combina con la página que lo vendió. */
      paginaVenta: true,
      store: { select: { name: true } },
      ebookIA: {
        select: {
          id: true, estado: true, titulo: true, indice: true, capitulos: true,
          trabajandoDesde: true, error: true, reintentos: true,
        },
      },
    },
  });
  if (!producto?.ebookIA) {
    return NextResponse.json({ error: "Este producto todavía no tiene un ebook empezado." }, { status: 404 });
  }

  const ebook = producto.ebookIA;
  const indice = leerIndice(ebook.indice);

  /* Formato, estilo, tema y color, tal como los eligió la persona. */
  const opciones = leerOpciones(ebook.indice);
  const esRecetario = opciones.formato === "recetario";

  /* Un recetario guarda grupos de recetas donde un ebook de texto guarda
     capítulos, pero la cuenta de "¿está completo?" es la misma: un elemento
     por cada llamada del temario. */
  const grupos = esRecetario ? leerGruposDeRecetas(ebook.capitulos) : [];
  const capitulos = esRecetario ? [] : leerCapitulos(ebook.capitulos);
  const partes = esRecetario ? grupos.length : capitulos.length;

  /* ⚠️ No se arma un ebook al que le falta un capítulo. Sería entregar un
     archivo cortado a la mitad, y encima marcar el producto como entregable. */
  if (partes === 0 || partes < indice.length) {
    return NextResponse.json({
      error: "Todavía falta escribir algún capítulo.",
      ebook: estadoDelBorrador(ebook),
    }, { status: 409 });
  }

  const config = configDeposito();
  if (!config) {
    return NextResponse.json({ error: "Falta configurar Supabase Storage." }, { status: 500 });
  }

  const marca = await tomarElCandado(ebook.id);
  if (!marca) {
    return NextResponse.json({
      error: "Se está armando en este momento. Esperá unos segundos.",
      ebook: estadoDelBorrador(ebook),
    }, { status: 409 });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CAMBIAR EL ESTILO, QUE ES GRATIS
     ══════════════════════════════════════════════════════════════════════════

     Rehacer el PDF no llama al modelo: dibuja de nuevo lo que ya está escrito y
     pago. Por eso el estilo entra por acá y no por una ruta propia — es el mismo
     trabajo, con otro molde.

     ⚠️ **CON EL CANDADO YA TOMADO, y no antes.** Estaba arriba de todo y ahí
     tenía un agujero: si en ese momento había otro armado en curso, esto ya
     había guardado el estilo nuevo y dos renglones después el pedido se
     rechazaba con "se está armando en este momento". El estilo quedaba guardado
     **y el archivo seguía siendo el viejo**: la tarjeta marcaba `Cartel` y el
     PDF que se descargaba era el de antes, hasta que alguien volviera a
     rehacerlo. Acá adentro, o se guarda y se dibuja, o no pasa ninguna de las
     dos.

     Y se GUARDA antes de dibujar, no se le pasa directo a `armarPDF`: el dibujo
     lee lo guardado, así que el archivo y lo que la pantalla promete no se
     pueden separar.

     No se valida acá: `conEstilo` normaliza, así que un estilo inventado queda
     en el de fábrica en vez de cortar el rearmado de algo ya pagado. */
  const estiloPedido = typeof body?.estilo === "string" ? body.estilo : "";
  let estiloDelArchivo = opciones.estilo;

  if (estiloPedido) {
    const conElNuevo = conEstilo(ebook.indice, estiloPedido);
    if (conElNuevo !== ebook.indice) {
      await prisma.ebookIA.update({
        where: { id: ebook.id },
        data: { indice: conElNuevo },
      });
      ebook.indice = conElNuevo;
      estiloDelArchivo = leerOpciones(conElNuevo).estilo;
    }
  }

  /* Los colores. Se sacan acá y no adentro de `armarPDF` porque aquel no tiene
     por qué saber qué es una página de venta.

     ⚠️ Manda lo que eligió para el ebook; si no eligió nada —`paleta` vacía—
     se usa la de su página de venta, que es lo que se hacía antes de que se
     pudiera elegir. Ver `OpcionesDelEbook.paleta`. */
  const { paleta } = normalizarContenido(producto.paginaVenta);
  const p = buscarPaleta(opciones.paleta || paleta);
  const paletaDeLaTapa = {
    tinta: p.tinta, acento: p.acento, sobreAcento: p.sobreAcento, suave: p.suave,
    /* El par del modo oscuro también: está elegido a mano en `PALETAS` y es
       mejor que el que el PDF calcularía solo. */
    acentoOscuro: p.acentoOscuro, sobreAcentoOscuro: p.sobreAcentoOscuro,
  };

  /* ── Las fotos ──────────────────────────────────────────────────────────
     Se buscan DESPUÉS de tomar el candado y antes de dibujar. Todas a la vez
     —ver `buscarFotos`— porque acá adentro el techo son 60 segundos para todo.

     ⚠️ Nada de esto puede frenar el armado: `buscarFoto` devuelve `null` ante
     cualquier problema (sin clave, sin resultados, Pexels caído) y el molde
     dibuja bloques de color en su lugar. Un ebook sin fotos es el que se
     entregaba hasta ayer; un ebook que no se arma es plata cobrada sin nada
     que entregar. */
  /* ⚠️ La búsqueda sale de `indice[i].foto` —la que el modelo escribió pensando
     en una foto— y NO del título del capítulo. Buscando por título salían
     fotos de otro tema en 3 de cada 8 capítulos: "Primeros pasos para arrancar
     esta semana" trajo una guitarra. El título queda de respaldo para los
     ebooks guardados antes del 07/09/26, que no tienen el campo. */
  /* ⚠️ En un recetario la foto NO va por sección sino por receta: cada hoja es
     una receta y una foto del plato de al lado desentona más que no tener
     ninguna. Y `fotosCapitulos` se empareja POR POSICIÓN con lo que se dibuja,
     así que acá tiene que haber una por receta, en el mismo orden. */
  const recetas = esRecetario ? grupos.flat() : [];
  const consultas = esRecetario
    ? recetas.map((r) => r.foto || r.titulo)
    : capitulos.map((c, i) => indice[i]?.foto || c.titulo);

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ LO ELEGIDO A MANO GANA, Y POR ESO LAS FOTOS YA NO CAMBIAN SOLAS
     ══════════════════════════════════════════════════════════════════════════

     Hasta el 09/09/26 acá se buscaba SIEMPRE, así que rehacer el PDF para
     arreglar una falta de ortografía podía traer diez fotos distintas: quien ya
     había mirado su ebook y le gustaba cómo se veía, lo perdía sin tocar nada.

     Ahora, si el capítulo tiene una foto elegida, se baja ÉSA. La búsqueda
     queda para los que no eligieron ninguna —que son todos hasta que alguien
     entra al editor— así que el ebook de siempre sale igual que siempre.

     `bajarElegida` devuelve `null` si la foto ya no está o si tarda de más, y
     ahí se cae a la búsqueda: una foto vieja que desapareció del banco no puede
     dejar un capítulo sin nada. Ver `FotoElegida`. */
  /* ⚠️ En un recetario la foto elegida vive adentro de la RECETA y no en el
     índice, porque ahí la unidad es la receta: el índice tiene secciones. Antes
     acá había una lista vacía —un recetario no podía tener fotos elegidas— así
     que cada vez que se rehacía el PDF las treinta fotos cambiaban solas. */
  const elegidas = esRecetario
    ? recetas.map((r) => r.fotoElegida ?? null)
    : capitulos.map((_, i) => indice[i]?.fotoElegida ?? null);

  /* La tapa, igual: lo elegido gana y la búsqueda queda de respaldo. Su frase
     puede estar vacía —nadie la tocó— y ahí se busca con el título del ebook,
     que es lo que se hacía antes. Ver `leerFotoDeTapa`. */
  const tapa = leerFotoDeTapa(ebook.indice);

  /* ⚠️ Dónde queda anotado si el banco estaba al tope. No cambia NADA de lo que
     pasa acá —si no hay foto, el molde dibuja color y el ebook se arma igual—
     pero es la diferencia entre entregar un archivo sin fotos y entregarlo sin
     que nadie sepa por qué. Ver `ComoFue`. */
  const como = comoFue();

  const [fotoTapa, fotosCapitulos] = await Promise.all([
    (async () => {
      if (tapa.elegida) {
        const bajada = await bajarElegida(tapa.elegida).catch(() => null);
        if (bajada) return bajada;
      }
      return buscarFoto(tapa.frase || ebook.titulo, { alta: true, como });
    })(),
    Promise.all(
      consultas.map(async (consulta, i) => {
        const elegida = elegidas[i];
        if (elegida) {
          const bajada = await bajarElegida(elegida).catch(() => null);
          if (bajada) return bajada;
        }
        return null;
      }),
    ).then(async (bajadas) => {
      /* Las que quedaron sin foto se buscan como siempre, y JUNTAS: acá adentro
         el techo son 60 segundos para todo. Se busca sólo lo que falta, así que
         un ebook con las diez elegidas no le pide nada al banco. */
      const faltan = consultas.map((c, i) => (bajadas[i] ? "" : c));
      if (faltan.every((c) => !c)) return bajadas;
      const buscadas = await buscarFotos(faltan, como);
      return bajadas.map((b, i) => b ?? buscadas[i]);
    }),
  ]);

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ SI SALIÓ SIN FOTOS PORQUE EL BANCO ESTABA LLENO, QUEDA ANOTADO
     ══════════════════════════════════════════════════════════════════════════

     El PDF se arma igual —eso no se toca— pero el archivo que se entrega tiene
     bloques de color donde iban las fotos, y hasta hoy nadie lo decía: el
     armado suele pasar con la pestaña cerrada, así que la persona volvía, veía
     "listo", y creía que ése era el diseño.

     Se anota SÓLO cuando pasaron las dos cosas: faltó alguna foto Y el banco
     contestó que estábamos al tope. Que falte una foto porque de esa frase no
     hay ninguna no es lo mismo, y no tiene el mismo arreglo — ésa se arregla
     cambiando la frase, ésta se arregla sola en un rato.

     Y se BORRA la marca cuando salió bien: sin eso, un ebook que una vez agarró
     el tope lleno diría "salió sin fotos" para siempre. Ver `conAvisoDeFotos`. */

  const faltaronFotos = !fotoTapa || fotosCapitulos.some((f) => !f);
  const alTope = faltaronFotos && como.sinCupo;

  /* ⚠️ La promesa DE VERDAD, la que el modelo escribió para la tapa. Acá decía
     que el resumen del capítulo 1 "cumple la misma función", y no: ese resumen
     está escrito para quien ESCRIBE el capítulo —el prompt se lo pide así, "que
     diga el contenido, no que lo venda"— y terminaba de tapa de un producto en
     venta, arrancando con "Explica el punto de partida...".

     El respaldo se queda para los ebooks guardados antes del 07/09/26, que no
     tienen promesa y no se pueden reescribir. Ver `leerPromesa`.

     Sale del `armarPDF` a una constante porque ahora la usan DOS: el archivo y
     la portada. Repetida, la tapa del PDF y la imagen que se muestra en la
     página de venta se separarían con el primer cambio. */
  const promesaDeLaTapa = leerPromesa(ebook.indice) || indice[0]?.resumen || "";
  const autor = producto.store?.name ?? "";

  let pdf: Buffer;
  try {
    pdf = await armarPDF({
      titulo: ebook.titulo,
      promesa: promesaDeLaTapa,
      /* Quién lo vende. El ebook es de esa persona, no nuestro. */
      autor,
      capitulos,
      /* ⚠️ Si viene con algo, manda esto y `capitulos` se ignora: son dos
         moldes para el mismo archivo, no dos cosas que se apilan. */
      recetas: esRecetario ? recetas : undefined,
      /* ⚠️ La tapa sale con LOS COLORES DE LA PERSONA, los que ya eligió para
         su página de venta. No se le pregunta nada nuevo: elige la paleta una
         vez y el archivo que entrega combina con la página que lo vendió.

         `normalizarContenido` devuelve una página válida aunque `paginaVenta`
         sea `null` —la cuenta que todavía no la armó— y `buscarPaleta` cae a la
         primera ante una clave desconocida, así que esto no puede romper el
         armado de un ebook por culpa del diseño. */
      paleta: paletaDeLaTapa,
      modo: opciones.tema,
      /* Cómo está armada la hoja. ⚠️ Sale de lo GUARDADO y no de lo que llegue
         en el pedido: rearmar el mismo ebook dos veces tiene que devolver el
         mismo archivo. Para cambiarlo hay una puerta aparte —ver la ruta de
         `estilo`— que lo guarda primero y recién después rearma. */
      estilo: estiloDelArchivo,
      fotoTapa,
      fotosCapitulos,
    });
  } catch (e) {
    console.error("[ia-ebook-armar] falló el armado del PDF", { ebookId: ebook.id, e });
    await soltarElCandado(ebook.id, marca, "No pudimos armar el PDF.");
    return NextResponse.json({ error: "No pudimos armar el PDF. Probá de nuevo." }, { status: 500 });
  }

  /* La ruta la arma el servidor, nunca el cliente: si la eligiera el navegador
     podría escribir encima del archivo de otra cuenta con sólo mandar su ruta. */
  const ruta = rutaDeArchivo(user.id, producto.id, randomUUID());

  const subido = await subirAlDeposito(config, ruta, pdf);
  if (!subido) {
    await soltarElCandado(ebook.id, marca, "No pudimos guardar el archivo.");
    return NextResponse.json({ error: "No pudimos guardar el archivo. Probá de nuevo." }, { status: 502 });
  }

  /* Recién ahora se le pone al producto: el archivo ya está arriba. */
  const anterior = rutaDeRef(producto.archivoPath);

  /* El índice tal como está AHORA. Se lee con el candado en la mano, que es lo
     que garantiza que nadie más lo esté escribiendo. Ver el `indice:` de abajo. */
  const fresco = await prisma.ebookIA.findUnique({
    where: { id: ebook.id },
    select: { indice: true },
  });
  try {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: producto.id },
        data: {
          archivoPath: refDeArchivo(ruta),
          archivoNombre: nombreDeArchivo(`${ebook.titulo}.pdf`),
          archivoPeso: pdf.length,
        },
      }),
      prisma.ebookIA.update({
        where: { id: ebook.id },
        data: {
          estado: "LISTO", trabajandoDesde: null, error: null,
          /* ⚠️ Sobre `fresco` y no sobre `ebook.indice`: aquél se leyó ANTES de
             tomar el candado, y entre las dos cosas pudo terminar de escribirse
             un capítulo o guardarse una foto elegida. Escribir el índice viejo
             acá le borraría a alguien lo que acaba de guardar, por un cartel. */
          indice: conAvisoDeFotos(fresco?.indice ?? ebook.indice, alTope),
        },
      }),
    ]);
  } catch (e) {
    console.error("[ia-ebook-armar] no se pudo guardar la referencia", { ebookId: ebook.id, e });
    /* El archivo quedó arriba sin que nadie lo apunte. Se borra para no
       pagarlo para siempre; si el borrado falla, queda anotado. */
    if ((await borrarDelDeposito(config, ruta)) === "fallo") {
      console.error("[ia-ebook-armar] quedó huérfano:", ruta);
    }
    await soltarElCandado(ebook.id, marca, "No pudimos guardar el archivo.");
    return NextResponse.json({ error: "No pudimos guardar el archivo. Probá de nuevo." }, { status: 500 });
  }

  /* ⚠️ Borrar el de antes, si esto reemplazó a un archivo que ya estaba.
     Sin esto, cada ebook rehecho deja uno viejo en el depósito que ya no apunta
     a ningún lado. Va DESPUÉS de guardar: si se borrara antes y el guardado
     fallara, el producto quedaría apuntando a un archivo que ya no está. */
  if (anterior && anterior !== ruta) {
    if ((await borrarDelDeposito(config, anterior)) === "fallo") {
      console.error("[ia-ebook-armar] quedó huérfano el anterior:", anterior);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     LA TAPA, TAMBIÉN COMO IMAGEN
     ══════════════════════════════════════════════════════════════════════════

     Un producto digital sin portada se muestra con el ícono del rol adentro de
     un recuadro punteado. En el panel eso está bien —dice "acá falta una foto",
     y es cierto— pero es lo mismo que ve quien podría comprar en la página de
     venta y en el enlace que se comparte por WhatsApp.

     Y la tapa ya está hecha: es la primera hoja del archivo que se acaba de
     armar. Estaba adentro de un PDF que sólo se puede ver bajándolo.

     ⚠️ SÓLO si el producto no tiene portada. Si la persona subió la suya, esa
     manda: esto llena un lugar vacío, no reemplaza una decisión.

     ══════════════════════════════════════════════════════════════════════════
     ⚠️ Y VA ACÁ ABAJO, DESPUÉS DE QUE EL ARCHIVO YA QUEDÓ COLGADO.
     ══════════════════════════════════════════════════════════════════════════

     Estuvo un día arriba, entre la subida del PDF y la transacción, con el
     `images` viajando adentro de ella. La idea era que la portada y el archivo
     entraran juntos o no entrara ninguno. Estaba mal, y lo encontró la
     auditoría del panel: todo esto corre adentro de una función con techo de
     60 segundos, así que un Supabase lento dibujando o subiendo una imagen
     **se comía el tiempo que le faltaba al armado** — y la función moría con el
     PDF ya arriba y sin escribir la base. Resultado: el producto seguía
     entregando el archivo viejo y quedaba uno huérfano que pagamos.

     Una decoración no puede poner en riesgo lo que se vende. Ahora el archivo
     ya está colgado y entregándose antes de que esto arranque; si la portada
     falla, el producto queda sin foto y nada más. Las dos subidas tienen
     además tiempo máximo, que era lo que faltaba de fondo.

     ⚠️ Nada de esto puede tirar: todo va en `try`. */
  let portada: string | null = null;
  const yaTienePortada = (() => {
    try {
      const guardadas: unknown = JSON.parse(producto.images || "[]");
      return Array.isArray(guardadas)
        && typeof guardadas[0] === "string"
        && guardadas[0].length > 0;
    } catch {
      return false;
    }
  })();

  if (!yaTienePortada) {
    try {
      const imagen = await dibujarLaTapa({
        titulo: ebook.titulo,
        promesa: promesaDeLaTapa,
        autor,
        /* La misma foto que se acaba de dibujar en el PDF, ya bajada: la
           portada no le pide nada más al banco de imágenes. */
        foto: fotoTapa?.datos ?? null,
        /* Lo que dice el sello. En un recetario se cuentan recetas, que es la
           unidad que la persona eligió y la que va en la tapa del archivo. */
        cantidad: esRecetario ? recetas.length : capitulos.length,
        palabra: esRecetario ? ["RECETA", "RECETAS"] : ["CAPÍTULO", "CAPÍTULOS"],
        paleta: paletaDeLaTapa,
        modo: opciones.tema,
        /* Y el mismo molde que el archivo: esta imagen ES la tapa del PDF, no
           una ilustración parecida. Ver `dibujarLaTapa`. */
        estilo: estiloDelArchivo,
      });

      if (imagen) {
        const donde = configDeImagenes()
          ? await guardarImagen(imagen, {
            extension: "jpg", tipo: "image/jpeg", carpeta: "products",
          })
          /* Sin Supabase sólo se puede en desarrollo, contra el disco. En
             producción no hay dónde escribir y se sigue sin portada. */
          : process.env.NODE_ENV === "production"
            ? null
            : await guardarImagenEnDisco(imagen, "jpg");

        if (donde) {
          await prisma.product.update({
            where: { id: producto.id },
            data: { images: JSON.stringify([donde]) },
          });
          portada = donde;
        }
      }
    } catch (e) {
      console.error("[ia-ebook-armar] no se pudo poner la portada", { ebookId: ebook.id, e });
    }
  }

  return NextResponse.json({
    ok: true,
    listo: true,
    peso: pdf.length,
    /* Para la pantalla que está esperando: el archivo salió, pero salió sin
       fotos. Lo mismo que queda anotado, dicho en el momento. */
    sinFotos: alTope,
    /* Si de paso se le puso la tapa como portada del producto. */
    portada,
    ebook: estadoDelBorrador({
      ...ebook,
      estado: "LISTO", trabajandoDesde: null, error: null,
      /* El mismo índice que se acaba de guardar. Con `ebook.indice` a secas,
         el estado que vuelve diría que las fotos están bien mientras la base
         dice que no. */
      indice: conAvisoDeFotos(fresco?.indice ?? ebook.indice, alTope),
    }),
  });
}
