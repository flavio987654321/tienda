/**
 * La descripción de un producto, en texto y no en HTML.
 *
 * ── Por qué hace falta ───────────────────────────────────────────────────────
 * `product.description` se escribe con un editor de texto enriquecido, así que
 * lo que queda guardado es HTML: `<p>Eleva tu estilo…</p><ul><li><strong>Diseño
 * y Corte:</strong>…`. Eso está bien para la ficha del producto, que lo dibuja
 * como HTML.
 *
 * El problema es todo lo demás. En el panel de afiliados esa misma cadena se
 * usaba cruda en cuatro lugares que NO dibujan HTML:
 *
 *   - la tarjeta del producto, que la mete en un `<p>` de React — o sea escapada,
 *     o sea que las etiquetas se leen como texto;
 *   - el mensaje de WhatsApp;
 *   - el texto de compartir;
 *   - y las seis placas, que la escriben con `fillText` sobre un canvas.
 *
 * El último es el que duele: la placa es la imagen que el afiliado sube a
 * Instagram. Le salía `<p>Eleva tu estilo con este encantador` impreso encima de
 * la foto, con la marca de la tienda al lado.
 *
 * ── Por qué no alcanza con `replace(/<[^>]*>/g, "")` ─────────────────────────
 * Es lo que hacían las tres copias sueltas que ya había en el repo, y deja dos
 * cosas rotas:
 *
 *   1. Pega las palabras. `<p>Escote recto</p><p>Falda por debajo</p>` queda
 *      "Escote rectoFalda por debajo". Las etiquetas de bloque separan, así que
 *      hay que reemplazarlas por un espacio ANTES de borrar el resto, no
 *      borrarlas junto con todo.
 *
 *   2. Deja las entidades. `&nbsp;`, `&amp;`, `&aacute;` no son etiquetas, así
 *      que sobreviven al filtro y terminan impresas igual que las etiquetas.
 *      Un `&amp;` en la placa se ve peor que un `<p>`, porque parece un error de
 *      la tienda y no del sistema.
 *
 * Es una función de cadenas a propósito: nada de `DOMParser` ni de
 * `document.createElement`. Esto lo usa el canvas en el navegador, pero también
 * lo puede usar el servidor para armar un mensaje, y una función que necesita un
 * DOM no sirve en los dos lados.
 *
 * ── ESTO NO ES UN SANITIZADOR ────────────────────────────────────────────────
 * Saca etiquetas, pero NO sirve para limpiar HTML que después se vaya a dibujar
 * como HTML. Está pensada para lugares donde el resultado se trata como TEXTO:
 * `fillText` en un canvas, un hijo de texto en JSX (que React escapa solo), el
 * cuerpo de un mensaje de WhatsApp.
 *
 * Si alguna vez hace falta mostrar la descripción CON su formato, esto no es lo
 * que hay que usar: un `dangerouslySetInnerHTML` alimentado con la salida de
 * acá seguiría siendo un agujero, porque una limpieza a base de expresiones
 * regulares nunca cubre todo lo que un navegador acepta como marcado. Para ese
 * caso va una biblioteca de sanitizado de verdad, con lista blanca.
 */

/* Las etiquetas que separan párrafos. Se cambian por un espacio antes de borrar
   el resto — si se borraran junto con todas las demás, el final de un párrafo
   quedaría pegado al principio del siguiente. */
const SEPARADORAS = /<\s*(br|\/p|\/li|\/div|\/h[1-6]|\/tr|\/td|\/blockquote)\s*\/?\s*>/gi;

/* `<script>` y `<style>` se sacan CON su contenido. Borrar sólo las etiquetas
   dejaría el código adentro convertido en texto: una descripción con un bloque
   de estilos terminaría escribiendo `color:#fff;font-size:12px` sobre la foto.
   No es un agujero de seguridad —acá no se dibuja HTML en ningún momento— pero
   sí es basura visible. */
const CON_CONTENIDO = /<(script|style)[\s\S]*?<\/\1\s*>/gi;

const ETIQUETAS = /<[^>]*>/g;

/* Las entidades con nombre que aparecen de verdad en un texto escrito en
   castellano con un editor. No es la tabla completa de HTML —son cientos— y no
   hace falta que lo sea: las que no estén acá caen en el barrido final. */
/* Ojo: sólo NOMBRES. Nada de `"#39"` acá adentro — el barrido de abajo exige
   que la entidad empiece con `[a-zA-Z]`, así que una clave con `#` no la puede
   alcanzar nunca; los `&#39;` los resuelve el paso numérico, que corre antes. */
const NOMBRADAS: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", bull: "•", middot: "·",
  deg: "°", euro: "€", pound: "£", yen: "¥", cent: "¢", copy: "©", reg: "®",
  trade: "™", times: "×", divide: "÷", frac12: "½", frac14: "¼", frac34: "¾",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü",
  iquest: "¿", iexcl: "¡", ordm: "º", ordf: "ª",
};

/* Un código que se puede convertir en carácter sin romper la cadena.
   Fuera del rango, y el `&#0;` que metería un nulo en el medio, ya estaban
   contemplados. Lo que faltaba era el rango de SUSTITUTOS (D800–DFFF):
   `String.fromCodePoint` los acepta sin chistar y devuelve medio par —una
   cadena que no es UTF-16 válido—. Eso viaja igual hasta que alguien la
   codifica: `encodeURIComponent` tira `URIError: URI malformed`, y el botón de
   compartir por WhatsApp se queda sin hacer nada, sin mensaje ni error visible.
   Una descripción con `&#55296;` alcanza. Se deja el texto original, que es lo
   mismo que se hace con cualquier otro código que no se puede traducir. */
const traducible = (codigo: number) =>
  codigo > 0 && codigo <= 0x10ffff && !(codigo >= 0xd800 && codigo <= 0xdfff);

function decodificarEntidades(texto: string): string {
  return (
    texto
      // Numéricas: `&#233;` y `&#xE9;`. Se descartan las que no son un carácter
      // válido —un `&#0;` metería un nulo en el medio de la cadena— dejando el
      // texto original en su lugar, que es más honesto que un signo de pregunta.
      .replace(/&#(\d+);/g, (crudo, n) => {
        const codigo = Number(n);
        return traducible(codigo) ? String.fromCodePoint(codigo) : crudo;
      })
      .replace(/&#[xX]([0-9a-fA-F]+);/g, (crudo, hex) => {
        const codigo = parseInt(hex, 16);
        return traducible(codigo) ? String.fromCodePoint(codigo) : crudo;
      })
      // Con nombre, las de la tabla de arriba.
      .replace(/&([a-zA-Z][a-zA-Z0-9]{1,10});/g, (crudo, nombre) =>
        Object.prototype.hasOwnProperty.call(NOMBRADAS, nombre) ? NOMBRADAS[nombre] : crudo
      )
      // El barrido final: cualquier `&loquesea;` que haya quedado sin traducir se
      // borra. Preferible a dejarlo escrito — nadie quiere ver `&oslash;` en una
      // placa, y el texto se entiende igual sin ese carácter.
      .replace(/&[a-zA-Z][a-zA-Z0-9]{1,10};/g, "")
  );
}

/**
 * Devuelve la descripción como una sola línea de texto corrido, sin etiquetas,
 * sin entidades y sin espacios de más.
 *
 * `null` y `undefined` entran y sale `""`, para poder llamarla directo sobre
 * `product.description` sin preguntar antes.
 */
export function textoPlano(html: string | null | undefined): string {
  if (!html) return "";

  return decodificarEntidades(
    html.replace(CON_CONTENIDO, " ").replace(SEPARADORAS, " ").replace(ETIQUETAS, " ")
  )
    /* Todo lo que sea espacio en blanco —incluidos los saltos de línea del HTML
       y el espacio duro que dejó `&nbsp;`— se junta en un espacio solo. Sin esto
       una descripción con formato queda con huecos de diez espacios en el medio,
       que en el canvas se ven como un renglón cortado a la mitad. */
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lo mismo, pero cortado a un largo máximo y con puntos suspensivos si sobró.
 *
 * Corta en el último espacio antes del límite en vez de a la mitad de una
 * palabra: `slice(0, 100)` dejaba cosas como "…con tirantes fi…", que se lee
 * como si el texto estuviera roto.
 *
 * El `…` es un solo carácter, no tres puntos: ocupa menos en el canvas y no se
 * puede partir en un salto de renglón.
 */
export function textoPlanoCorto(html: string | null | undefined, maximo: number): string {
  const plano = textoPlano(html);
  if (plano.length <= maximo) return plano;

  const cortado = plano.slice(0, maximo);
  const ultimoEspacio = cortado.lastIndexOf(" ");
  /* Si no hay ningún espacio en todo el tramo es una sola palabra larguísima
     (una URL, un código); ahí se corta a lo bruto porque no hay dónde más. */
  return (ultimoEspacio > maximo * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd() + "…";
}
