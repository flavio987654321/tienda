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
  { hueco: `data-tienda="reloj"`, que: "un contenedor vacío donde va el precio de bienvenida con reloj real (opcional)" },
  { hueco: `data-tienda="opiniones"`, que: "un contenedor vacío donde van las opiniones verificadas de compradores (opcional)" },
  { hueco: `data-tienda="aviso-ventas"`, que: "un contenedor vacío donde va el aviso de compras reales recientes (opcional)" },
];

/** Hasta acá llega lo que escribe sobre el diseño: es un pedido, no un brief. */
export const INDICACIONES_MAX = 1200;

export function instruccionesParaClaude(p: ProductoParaInstrucciones, indicaciones = ""): string {
  const suyas = indicaciones.replace(/\r\n/g, "\n").trim().slice(0, INDICACIONES_MAX);
  const datos = [
    `- Nombre: ${p.nombre}`,
    p.tipo ? `- Qué es: ${p.tipo}` : null,
    `- Precio: ${plata(p.precio)}${p.precioAnterior && p.precioAnterior > p.precio ? ` (antes ${plata(p.precioAnterior)})` : ""}`,
    p.vendedor ? `- Lo vende: ${p.vendedor}` : null,
    p.descripcion?.trim() ? `- Descripción:\n${p.descripcion.trim().split("\n").map((l) => `  ${l}`).join("\n")}` : null,
  ].filter(Boolean).join("\n");

  return `Quiero que diseñes la landing de venta de mi producto digital. El diseño es libre: elegí vos los colores, la tipografía, el orden y el estilo que mejor le queden (te doy indicaciones abajo si tengo alguna). Pero la landing se va a publicar en TiendaApps, que le pone el precio, las fotos y el botón de pago automáticamente, así que tiene que cumplir estas reglas técnicas AL PIE DE LA LETRA.

MI PRODUCTO
${datos}

REGLAS TÉCNICAS (obligatorias)

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
7. Links del pie (términos, privacidad, reembolsos, Instagram, contacto): dejalos con href="#" y el texto claro; yo los completo desde el panel.
8. Fuentes: podés usar Google Fonts con un <link rel="stylesheet" href="https://fonts.googleapis.com/…">. No cargues ninguna otra hoja de estilos externa ni uses @import.
9. Todo el CSS va en un <style> dentro del mismo archivo, con los selectores dentro de una clase raíz (por ejemplo .landing …) para que no choque con nada. Que se vea bien en un celular de 360 px de ancho y en una computadora. No uses position: fixed.
10. Escribí en el castellano de Argentina (vos, tenés, querés), como lo escribiría una persona, sin mayúsculas gritadas ni signos de exclamación en cadena. Podés escribir todo el texto de venta: titular, para quién es, qué incluye, beneficios, cómo funciona, garantía, preguntas frecuentes, cierre. Con los datos de mi producto de arriba; lo que no sepas, dejalo en genérico y marcalo con un comentario <!-- EDITAR --> para que lo cambie yo.

Cuando termines, decime en dos líneas qué fotos tengo que subir (los nombres de los huecos foto:…).

MIS INDICACIONES DE DISEÑO
${suyas || "(escribí acá cómo la querés: colores, estilo, referencias, tono)"}
`;
}
