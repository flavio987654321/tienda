/**
 * Las instrucciones que la vendedora le pega a Claude para que la landing
 * baje lista para enchufar. Van con los datos del producto ya puestos: así
 * Claude escribe con el nombre, el precio y lo que incluye de verdad, en vez
 * de inventar.
 *
 * ── Por qué se le pide a Claude y no se lee cualquier HTML ─────────────────
 *
 * Leer un HTML arbitrario es adivinar: cuál de los cinco botones cobra,
 * cuál de las trece imágenes es la portada. Con las reglas de acá, Claude
 * marca cada cosa con `data-tienda="…"` y no hay que adivinar nada. Un HTML
 * hecho sin las reglas entra igual (`limpiarLanding` lo tolera), pero el
 * panel va a tener que preguntar más.
 *
 * Es texto puro, sin HTML: se copia con un botón y se pega en el chat. Lo
 * que la vendedora escribe sobre el DISEÑO (colores, tipografía, tono) va
 * adentro del mismo texto, al final: así copia y pega una sola vez, y la
 * novena versión no la obliga a volver a escribir lo mismo.
 * Probado en `landing-propia.check.ts`.
 */

export type ProductoParaInstrucciones = {
  nombre: string;
  descripcion: string | null;
  precio: number;
  precioAnterior: number | null;
  /** "Ebook", "Curso", "Plantillas"… lo que la dueña haya elegido. */
  tipo: string | null;
  /** Nombre del negocio o de la persona: para el pie y el "sobre mí". */
  vendedor: string | null;
};

const plata = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/** Los huecos, para la lista del panel y para el check. */
export const HUECOS_EXPLICADOS: readonly { hueco: string; que: string }[] = [
  { hueco: `data-tienda="nombre"`, que: "el nombre del producto" },
  { hueco: `data-tienda="precio"`, que: "el precio, con el signo $ incluido (no escribas el $ afuera)" },
  { hueco: `data-tienda="precio-anterior"`, que: "el precio tachado; si no hay, el elemento desaparece solo" },
  { hueco: `data-tienda="comprar"`, que: "cada botón o link de comprar (un <a>); el destino lo ponemos nosotros" },
  { hueco: `data-tienda="foto:portada"`, que: "una foto; después de los dos puntos va un nombre corto y único (foto:portada, foto:medialunas, foto:pagina-1)" },
  { hueco: `data-tienda="reloj"`, que: "un contenedor vacío donde va la barra del precio de bienvenida: un texto corto y el reloj contando (\"Precio de bienvenida reservado por 14:59\"). Es opcional; si no lo dejás y el precio de bienvenida está prendido, va en una barra nuestra arriba de todo. Mientras corre, el hueco precio muestra el precio de bienvenida y precio-anterior el normal tachado" },
  { hueco: `data-tienda="opiniones"`, que: "un contenedor vacío donde van las opiniones verificadas de compradores (opcional)" },
  { hueco: `data-tienda="aviso-ventas"`, que: "un contenedor vacío donde va el aviso de compras reales recientes (opcional)" },
];

/** Hasta acá llega lo que escribe sobre el diseño: es un pedido, no un brief. */
export const INDICACIONES_MAX = 1200;

const indicacionesLimpias = (indicaciones: string) => indicaciones.replace(/\r\n/g, "\n").trim().slice(0, INDICACIONES_MAX);

function datosDelProducto(p: ProductoParaInstrucciones): string {
  return [
    `- Nombre: ${p.nombre}`,
    p.tipo ? `- Qué es: ${p.tipo}` : null,
    `- Precio: ${plata(p.precio)}${p.precioAnterior && p.precioAnterior > p.precio ? ` (antes ${plata(p.precioAnterior)})` : ""}`,
    p.vendedor ? `- Lo vende: ${p.vendedor}` : null,
    p.descripcion?.trim() ? `- Descripción:\n${p.descripcion.trim().split("\n").map((l) => `  ${l}`).join("\n")}` : null,
  ].filter(Boolean).join("\n");
}

export function instruccionesParaClaude(p: ProductoParaInstrucciones, indicaciones = ""): string {
  const suyas = indicacionesLimpias(indicaciones);

  return `Quiero que diseñes la landing de venta de mi producto digital. El diseño es libre: elegí vos los colores, la tipografía, el orden y el estilo que mejor le queden (te doy indicaciones abajo si tengo alguna). Pero la landing se va a publicar en TiendaApps, que le pone el precio, las fotos y el botón de pago automáticamente, así que tiene que cumplir estas reglas técnicas AL PIE DE LA LETRA.

MI PRODUCTO
${datosDelProducto(p)}

${REGLAS_TECNICAS}
10. Escribí en el castellano de Argentina (vos, tenés, querés), como lo escribiría una persona, sin mayúsculas gritadas ni signos de exclamación en cadena. Podés escribir todo el texto de venta: titular, para quién es, qué incluye, beneficios, cómo funciona, garantía, preguntas frecuentes, cierre. Con los datos de mi producto de arriba; lo que no sepas, dejalo en genérico y marcalo con un comentario <!-- EDITAR --> para que lo cambie yo.

Cuando termines, decime en dos líneas qué fotos tengo que subir (los nombres de los huecos foto:…).

MIS INDICACIONES DE DISEÑO
${suyas || "(escribí acá cómo la querés: colores, estilo, referencias, tono)"}
`;
}

/**
 * "Ya tengo una página": la hizo con otra IA, o con Claude sin nuestro
 * pedido, y quiere usar ÉSA. No se le pide que la rehaga: se le pide a
 * Claude que la deje igual y la adapte a las mismas reglas. Lo que traía con
 * JavaScript (tildar y ver un mensaje, pestañas, carruseles) se rehace sin
 * código; el archivo se adjunta en el chat, no se pega acá.
 *
 * Es la respuesta barata a "subí mi landing y no anda": pasarla por Claude
 * dos minutos en vez de dejar correr código ajeno en la página. Las reglas
 * son las MISMAS (`REGLAS_TECNICAS`), a propósito: dos copias se separan.
 */
export function pedidoDeConversion(p: ProductoParaInstrucciones, indicaciones = ""): string {
  const suyas = indicacionesLimpias(indicaciones);

  return `Ya tengo la landing de venta de mi producto digital hecha (te la adjunto como archivo .html). Quiero que la dejes IGUAL: mismo diseño, mismos colores, misma tipografía, mismo orden y mismos textos. Lo único que cambia es que se va a publicar en TiendaApps, que le pone el precio, las fotos y el botón de pago automáticamente, así que tiene que cumplir estas reglas técnicas AL PIE DE LA LETRA. Adaptala a las reglas sin rediseñarla.

MI PRODUCTO
${datosDelProducto(p)}

${REGLAS_TECNICAS}
10. Todo lo que mi página hace hoy con JavaScript (listas de tildar que muestran un mensaje, pestañas, carruseles, acordeones, textos que cambian, contadores) rehacelo sin código con lo del punto 1; lo que no se pueda sin código, mostralo todo junto, sin esconder nada. Las fotos que hoy tiene reemplazalas por huecos foto:… con un nombre que diga cuál era cada una. Si algún texto dice cantidades de ventas, opiniones o urgencia inventadas, sacalo (punto 2 y punto 6). No cambies el resto del texto.

Cuando termines, decime en dos líneas qué cambiaste y qué fotos tengo que subir (los nombres de los huecos foto:…).

MIS INDICACIONES
${suyas || "(si querés cambiar algo de paso, escribilo acá; si no, dejalo vacío)"}
`;
}

/** Las reglas, una sola vez: las comparten el pedido de cero y el de conversión. */
const REGLAS_TECNICAS = `REGLAS TÉCNICAS (obligatorias)

1. Devolveme UN SOLO archivo .html con HTML y CSS. Nada de JavaScript: sin <script>, sin onclick ni ningún on…=. Lo que necesite interacción hacelo sin código: el acordeón de preguntas con <details> y <summary>; una lista de "marcá lo que te pasa" con <input type="checkbox"> y CSS.
2. NO pongas contadores, relojes, "quedan X cupos", "reservado por 15:00" ni ningún indicador de escasez o urgencia. TiendaApps tiene un reloj de verdad que se hace cumplir; si querés uno, dejá el hueco del punto 6.
3. NO escribas el precio, el nombre del producto ni el destino del botón a mano. Usá estos huecos, que TiendaApps llena solo:
${HUECOS_EXPLICADOS.slice(0, 4).map((h) => `   - ${h.hueco}: ${h.que}`).join("\n")}
   Ejemplo: <span data-tienda="precio"></span>  ·  <a data-tienda="comprar" class="btn">Quiero el ebook</a>
   Poné el precio y un botón de comprar al menos dos veces: cerca del principio y al final.
4. Fotos: no incrustes imágenes ni uses URLs de fotos. Para cada foto poné un contenedor vacío con ${HUECOS_EXPLICADOS[4].hueco.replace("portada", "NOMBRE")}, donde NOMBRE es un nombre corto y único que diga qué va ahí (foto:portada, foto:medialunas, foto:pagina-1). Dale al contenedor el tamaño y la forma con CSS (por ejemplo aspect-ratio). Yo las subo después desde mi panel, por nombre. Usá entre 3 y 10 fotos, con nombres que digan qué va ahí.
   Podés usar íconos en SVG en línea (<svg> con <path>), eso sí está permitido.
5. Sin formularios, sin <iframe>, sin videos incrustados, sin <form> ni <input> que no sea un checkbox de CSS.
6. Bloques vivos (opcionales, pero recomendados): dejá un contenedor VACÍO donde quieras que aparezcan, y TiendaApps pone adentro lo real:
${HUECOS_EXPLICADOS.slice(5).map((h) => `   - ${h.hueco}: ${h.que}`).join("\n")}
   No escribas opiniones, testimonios, nombres de clientes ni cantidades de ventas inventadas. Ninguna. Si querés una sección de opiniones, es el hueco vacío.
7. Links del pie (términos, privacidad, reembolsos, Instagram, contacto): dejalos con href="#" y el texto claro; yo los completo desde el panel. Los links internos a otra sección (href="#seccion") SÍ funcionan y bajan suave, así que podés usarlos; sólo acordate de que el botón que cobra es data-tienda="comprar", no un link a la sección de la oferta.
8. Fuentes: podés usar Google Fonts con un <link rel="stylesheet" href="https://fonts.googleapis.com/…">. No cargues ninguna otra hoja de estilos externa ni uses @import.
9. Todo el CSS va en un <style> dentro del mismo archivo, con los selectores dentro de una clase raíz (por ejemplo .landing …) para que no choque con nada. Que se vea bien en un celular de 360 px de ancho y en una computadora. No uses position: fixed (una barra pegada tapa el botón de comprar en celulares chicos).
9.b Animaciones: las que son sólo CSS (transition, animation, :hover) andan todas. Para las que aparecen al bajar, TiendaApps te da esto: poné data-tienda-aparece en el elemento y escribí el estado escondido en [data-tienda-aparece] y el visible en [data-tienda-visto], que lo ponemos nosotros cuando entra en pantalla. Ejemplo:
   [data-tienda-aparece]{opacity:0;transform:translateY(16px);transition:opacity .6s ease,transform .6s ease}
   [data-tienda-visto]{opacity:1;transform:none}
   No uses ninguna otra forma de animar al hacer scroll: sin JavaScript no corre, y lo que se esconda sin esto se queda escondido para siempre.`;

/* ── El pedido de cambios ───────────────────────────────────────────────── */

/**
 * El segundo mensaje: lo que la vendedora le pega a Claude cuando el panel
 * le marcó cosas.
 *
 * Es la respuesta a "¿y si Claude escribe algo que no va?". No lo arreglamos
 * nosotros —reescribirle el texto sería meternos en lo que dice su negocio, y
 * hacerlo con una IA nuestra costaría plata en cada subida y daría un
 * resultado distinto cada vez—. Lo arregla quien lo escribió: le devolvemos
 * el problema a Claude, en su idioma, con el hueco exacto que tiene que usar.
 *
 * Sólo entra lo que tiene arreglo pedible: una garantía de 5 días, por
 * ejemplo, es decisión de ella y no aparece acá.
 */
export function pedidoDeCambios(inv: InventarioParaPedido): string {
  const puntos: string[] = [];
  for (const h of inv.hallazgos) if (h.pedido && !puntos.includes(h.pedido)) puntos.push(h.pedido);
  if (inv.avisos.some((a) => a.includes("sin llenar"))) {
    puntos.push("Sacá los textos entre corchetes que quedaron sin llenar (tipo [PRECIO], [NOMBRE]) y usá los huecos data-tienda en su lugar.");
  }
  if (inv.fotos.length === 0) {
    puntos.push('No dejaste ningún lugar para mis fotos: poné entre 3 y 10 contenedores vacíos con data-tienda="foto:nombre" (foto:portada, foto:pagina-1…), con su tamaño dado por CSS.');
  }
  /* Traía código: lo que hacía con él quedó quieto (tildar y ver un mensaje,
     pestañas, carruseles). Es UN punto, no uno por script, y tapa al de los
     botones sueltos: si hay programas, el pedido es rehacer todo sin código. */
  const conCodigo = (inv.quitado?.scripts ?? 0) + (inv.quitado?.eventos ?? 0) > 0;
  if (conCodigo) {
    puntos.push('La página traía JavaScript y en TiendaApps no corre ningún programa: sacá todos los <script> y los on…=. Todo lo que hacía con código —listas de tildar que muestran un mensaje, pestañas, carruseles, acordeones, textos que cambian— rehacelo sin código: el acordeón con <details> y <summary>, la lista de tildar con <input type="checkbox"> y CSS (:checked o :has), y lo que no se pueda, mostralo todo junto sin esconder nada.');
  } else {
    for (const x of inv.sueltos) {
      if (x.includes("necesitaban un programa") || x.includes("necesitaba un programa")) {
        puntos.push("Sacá los botones que necesitan JavaScript para hacer algo (flechas de carrusel, pestañas, menús): acá no corre ningún programa. Si el contenido importa, mostralo todo junto o usá <details> y <summary>.");
      }
    }
  }
  if (!puntos.length) return "";

  return `Subí la página a TiendaApps y me marcó estas cosas. Cambiámelas SIN cambiar el diseño, los colores ni la tipografía:

${puntos.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Devolveme el archivo .html completo de nuevo, con todo lo demás igual.`;
}

/** Lo que el pedido de cambios necesita del inventario de la versión subida. */
export type InventarioParaPedido = {
  hallazgos: readonly { pedido: string }[];
  avisos: readonly string[];
  sueltos: readonly string[];
  fotos: readonly string[];
  /** Lo que `limpiarLanding` le sacó al archivo; sin esto, no se pide nada por el código. */
  quitado?: { scripts: number; eventos: number };
};
