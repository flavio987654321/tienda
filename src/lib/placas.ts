/**
 * Las placas que el afiliado comparte en redes.
 *
 * ── Por qué esto vive acá y no adentro del panel ─────────────────────────────
 * Eran 500 líneas de dibujo en canvas metidas en `VendedorasClient.tsx`, un
 * archivo de 2.600. Nada de esto es React: son funciones que reciben un
 * contexto y pintan. Separadas se pueden mirar de a una, y sobre todo se puede
 * ver que las seis comparten casi todo — que es lo que estaba causando el
 * problema.
 *
 * ── Qué estaba mal ───────────────────────────────────────────────────────────
 * Flavio lo dijo en una palabra: "son planas". Y tenía razón, por cuatro
 * motivos concretos que se arreglan acá:
 *
 *   1. TIPOGRAFÍA. Todo estaba escrito en `Arial`. El sitio carga Figtree con
 *      `next/font` desde el layout raíz —la tipografía de la marca, con todo el
 *      rango 300–900— y la placa la ignoraba. O sea que la única pieza que
 *      SALE a la calle con la marca era la única que no la usaba. Peor: `Arial`
 *      en el `900` de los titulares cae en Arial Black en Windows y en otra cosa
 *      en Android, así que la misma placa no se veía igual según quién la
 *      generara.
 *
 *   2. SIN PROFUNDIDAD. No había una sombra en todo el archivo. Texto blanco
 *      apoyado directo sobre una foto, botones de color liso, precios sin peso.
 *      En un feed de Instagram —donde todo lo que compite tiene relieve— eso se
 *      lee como una captura de pantalla, no como una publicación.
 *
 *   3. EL CORTE DE LA FOTO. El degradado del borde inferior tenía dos paradas,
 *      de transparente a opaco. Dos paradas en un degradado lineal dan una banda
 *      visible: se veía dónde terminaba la foto y empezaba el color. Ahora la
 *      caída es progresiva y arranca mucho antes.
 *
 *   4. EL PRECIO NO GANABA. Era texto de color, del mismo tamaño que el nombre.
 *      En una placa de venta el precio es lo único que tiene que leerse a un
 *      metro de distancia.
 *
 * ── Y por qué las seis se parecían tanto ─────────────────────────────────────
 * Porque eran seis copias de la misma función con los colores cambiados. Cada
 * una repetía el nombre de la tienda, el título, el precio tachado, el precio,
 * las cuotas, la descripción y el botón — con diferencias de dos píxeles que no
 * eran decisiones, eran restos de copiar y pegar.
 *
 * Ahora ese bloque de texto es UNO solo (`dibujarBloqueInferior`) y cada estilo
 * le pasa su paleta. Lo que queda propio de cada uno es lo que de verdad los
 * distingue: cómo se trata la foto, qué acento lleva y qué forma tiene el
 * precio. Las diferencias volvieron a ser decisiones.
 */

export type PlacaTemplateId = "clasica" | "minimal" | "oferta" | "neon" | "luxury" | "duo";
export type PlacaFormat = "portrait" | "story" | "square";

export const FORMAT_SIZES: Record<PlacaFormat, { w: number; h: number }> = {
  portrait: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

export const FORMAT_LABELS: Record<PlacaFormat, { label: string; sub: string }> = {
  portrait: { label: "4:5", sub: "Feed IG" },
  story: { label: "9:16", sub: "Stories" },
  square: { label: "1:1", sub: "Cuadrada" },
};

export const PLACA_TEMPLATES: { id: PlacaTemplateId; label: string; description: string }[] = [
  { id: "clasica", label: "Clásica", description: "Fondo oscuro, foto completa" },
  { id: "minimal", label: "Minimal", description: "Fondo blanco, estilo limpio" },
  { id: "oferta", label: "Oferta", description: "Colores cálidos, descuentos" },
  { id: "neon", label: "Neon", description: "Gradiente eléctrico, Gen-Z" },
  { id: "luxury", label: "Luxury", description: "Negro y dorado, premium" },
  { id: "duo", label: "Duo", description: "Collage de dos fotos" },
];

export type PlacaProduct = {
  name: string;
  price: number;
  comparePrice: number | null;
  /** Ya en texto plano. La limpieza es de `textoPlano`, no de acá. */
  description: string | null;
  cuotas: number;
  isNew: boolean;
  isLowStock: boolean;
  isBestSeller: boolean;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Tipografía
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * La familia tipográfica de la marca, como la entiende el canvas.
 *
 * `next/font` no expone el nombre de la familia: lo genera en el build
 * (`__Figtree_a1b2c3`) para que nadie dependa de él. Lo que sí deja fijo es la
 * variable CSS `--font-marca`, que el layout raíz cuelga del `<html>`. Así que
 * el nombre se lee de ahí en vez de escribirlo, que es lo único que no se rompe
 * en el próximo build.
 *
 * Si por lo que sea la variable no está, cae a la pila de siempre. Una placa con
 * la tipografía equivocada es mucho mejor que una placa que no sale.
 */
let familiaCache: string | null = null;

export function familiaDeMarca(): string {
  if (familiaCache) return familiaCache;
  const respaldo = "Arial, Helvetica, sans-serif";
  if (typeof window === "undefined") return respaldo;
  const valor = getComputedStyle(document.documentElement).getPropertyValue("--font-marca").trim();
  /* El respaldo NO se guarda en la cache. Si la variable todavía no está —el
     `<html>` recién montado, la hoja de `next/font` en camino—, guardarla
     dejaría a Arial fijo hasta que se recargue la página: la primera miniatura
     que se dibuje decidiría la tipografía de todas las placas de la sesión, y
     eso es exactamente lo que este archivo vino a arreglar. Sin cache se vuelve
     a leer la variable en el próximo dibujo, que es cuando ya está. */
  if (!valor) return respaldo;
  familiaCache = `${valor}, ${respaldo}`;
  return familiaCache;
}

/**
 * Espera a que la tipografía esté lista ANTES de dibujar.
 *
 * Sin esto la placa sale en la fuente de respaldo la primera vez y en Figtree la
 * segunda, según si el navegador ya la había bajado. El canvas no reintenta: lo
 * que dibujó, dibujado quedó.
 *
 * `document.fonts.ready` sola no alcanza. Figtree es una fuente VARIABLE: el
 * navegador la considera cargada, pero cada instancia de peso que se pide por
 * primera vez puede no estar instanciada todavía. Por eso además se piden
 * explícitamente los pesos que usan las plantillas.
 *
 * Nunca tira. Si la fuente no llega, se dibuja igual con lo que haya.
 */
export async function fuentesListas(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const familia = familiaDeMarca();
  try {
    await Promise.all(
      [300, 400, 600, 700, 800, 900].map((peso) =>
        document.fonts.load(`${peso} 64px ${familia}`).catch(() => null)
      )
    );
    await document.fonts.ready;
  } catch {
    /* Sin fuente se dibuja igual. */
  }
}

const fuente = (peso: number, tamano: number) => `${peso} ${tamano}px ${familiaDeMarca()}`;

/* ────────────────────────────────────────────────────────────────────────────
 * Herramientas de profundidad
 *
 * Son las que separan una placa de una captura de pantalla. Todas guardan y
 * restauran el contexto: una sombra que queda puesta se le pega al siguiente
 * `fillText` y aparece un texto borroso sin motivo tres funciones más abajo.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Ejecuta `dibujar` con una sombra puesta, y la saca al terminar. */
function conSombra(
  ctx: CanvasRenderingContext2D,
  sombra: { color: string; blur: number; dy?: number; dx?: number },
  dibujar: () => void
) {
  ctx.save();
  ctx.shadowColor = sombra.color;
  ctx.shadowBlur = sombra.blur;
  ctx.shadowOffsetX = sombra.dx ?? 0;
  ctx.shadowOffsetY = sombra.dy ?? 0;
  dibujar();
  ctx.restore();
}

/**
 * Oscurece los bordes de la foto dejando el centro intacto.
 *
 * Es el truco más viejo y más eficaz para que una foto plana tenga cuerpo: el
 * ojo lee el centro más claro como "adelante". Cuesta un degradado radial y se
 * nota en todas las plantillas.
 *
 * El radio sale de la diagonal para que el óvalo cubra las esquinas; con el lado
 * más largo, en formato Stories las esquinas de arriba quedaban sin tocar.
 */
function vineta(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fuerza = 0.42
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radio = Math.sqrt(w * w + h * h) / 2;
  const g = ctx.createRadialGradient(cx, cy, radio * 0.42, cx, cy, radio);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.65, `rgba(0,0,0,${fuerza * 0.35})`);
  g.addColorStop(1, `rgba(0,0,0,${fuerza})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * La caída de la foto hacia el fondo.
 *
 * La versión anterior tenía DOS paradas —transparente arriba, opaco abajo— sobre
 * 110 píxeles. Un degradado lineal de dos paradas interpola la opacidad en línea
 * recta, y el ojo no lee la opacidad en línea recta: se ve una banda, un borde
 * fantasma donde termina la foto.
 *
 * Con cinco paradas siguiendo una curva suave el corte desaparece, y arrancando
 * mucho más arriba (un cuarto de la altura de la foto en vez de 110 píxeles) la
 * foto se funde con el bloque de texto en vez de estar apoyada encima.
 */
function fundidoInferior(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  hasta: number,
  alto: number,
  colorRgb: string
) {
  const desde = hasta - alto;
  const g = ctx.createLinearGradient(0, desde, 0, hasta);
  g.addColorStop(0, `rgba(${colorRgb},0)`);
  g.addColorStop(0.35, `rgba(${colorRgb},0.12)`);
  g.addColorStop(0.6, `rgba(${colorRgb},0.42)`);
  g.addColorStop(0.82, `rgba(${colorRgb},0.82)`);
  g.addColorStop(1, `rgba(${colorRgb},1)`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, desde, ancho, alto);
  ctx.restore();
}

/**
 * Una flecha dibujada, no la de la tipografía.
 *
 * Los botones decían `Comprá ahora →`. Ese `→` es el carácter U+2192, y Figtree
 * no lo trae: el navegador salía a buscarlo a otra fuente del sistema, así que
 * la flecha aparecía con otro grosor y otra altura que el texto de al lado —y
 * distinta en cada aparato—. Dibujada con trazos sale siempre igual y se le
 * puede dar el grosor del texto que acompaña.
 */
function flecha(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largo: number,
  grosor: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + largo, y);
  ctx.moveTo(x + largo - grosor * 2.2, y - grosor * 2.2);
  ctx.lineTo(x + largo, y);
  ctx.lineTo(x + largo - grosor * 2.2, y + grosor * 2.2);
  ctx.stroke();
  ctx.restore();
}

/** Texto con espaciado entre letras, dejando el contexto como estaba. */
function textoEspaciado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  espaciado: number
) {
  const previo = ctx.letterSpacing;
  ctx.letterSpacing = `${espaciado}px`;
  ctx.fillText(texto, x, y);
  ctx.letterSpacing = previo || "0px";
}

/** El ancho real de un texto contando el espaciado entre letras. */
function anchoEspaciado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  espaciado: number
): number {
  const previo = ctx.letterSpacing;
  ctx.letterSpacing = `${espaciado}px`;
  const w = ctx.measureText(texto).width;
  ctx.letterSpacing = previo || "0px";
  return w;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Texto
 * ──────────────────────────────────────────────────────────────────────────── */

export function money(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  let truncated = false;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) { truncated = true; break; }
    } else {
      line = testLine;
    }
  }

  if (!truncated && line) lines.push(line);

  if (truncated && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = last + "…";
  }

  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  return lines.length;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Los distintivos (más vendido, nuevo, últimas unidades)
 * ──────────────────────────────────────────────────────────────────────────── */

function dibujarDistintivos(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  product: PlacaProduct,
  x: number,
  y: number
) {
  const badges: { text: string; bg: string }[] = [];
  if (product.isBestSeller) badges.push({ text: "🔥 Más vendido", bg: "#f97316" });
  if (product.isNew) badges.push({ text: "✨ Nuevo", bg: "#6366f1" });
  if (product.isLowStock) badges.push({ text: "⚡ Últimas unidades", bg: "#dc2626" });
  if (badges.length === 0) return;

  const tamano = px(22);
  ctx.font = fuente(700, tamano);
  let cx = x;
  for (const badge of badges.slice(0, 2)) {
    const tw = ctx.measureText(badge.text).width;
    const ph = px(13);
    const pv = px(9);
    const bw = tw + ph * 2;
    const bh = tamano + pv * 2;
    /* La sombra va sobre la pastilla, no sobre el texto: la pastilla se apoya en
       una foto de cualquier color y sin sombra se confunde con lo que tenga
       detrás. Con el texto adentro ya no hace falta. */
    conSombra(ctx, { color: "rgba(0,0,0,0.35)", blur: px(14), dy: px(4) }, () => {
      ctx.fillStyle = badge.bg;
      ctx.beginPath();
      ctx.roundRect(cx, y, bw, bh, px(20));
      ctx.fill();
    });
    ctx.fillStyle = "#fff";
    ctx.fillText(badge.text, cx + ph, y + bh - pv - px(2));
    cx += bw + px(10);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * El bloque de texto, que ahora es uno solo
 * ──────────────────────────────────────────────────────────────────────────── */

/** Un color liso o un degradado horizontal de dos puntas. */
type Tinta = string | { desde: string; hasta: string };

function aplicarTinta(
  ctx: CanvasRenderingContext2D,
  tinta: Tinta,
  x: number,
  ancho: number
): string | CanvasGradient {
  if (typeof tinta === "string") return tinta;
  const g = ctx.createLinearGradient(x, 0, x + ancho, 0);
  g.addColorStop(0, tinta.desde);
  g.addColorStop(1, tinta.hasta);
  return g;
}

type Paleta = {
  tienda: Tinta;
  titulo: string;
  /** Cuando es `true` el precio va adentro de una pastilla de color. */
  precioEnPastilla: boolean;
  precio: Tinta;
  /** El color del texto del precio cuando va en pastilla. */
  precioTexto?: string;
  precioViejo: string;
  descuento?: { fondo: string; texto: string };
  cuotas: string;
  descripcion: string;
  cta: {
    texto: string;
    relleno: Tinta | null;
    borde: string | null;
    color: string;
    /** El resplandor del botón. Sin esto el botón queda pegado al fondo. */
    resplandor?: string;
  };
  /** Espaciado entre letras del nombre de la tienda y del botón. */
  espaciado?: number;
  /** Peso del nombre del producto. Luxury usa uno más liviano a propósito. */
  pesoTitulo?: number;
  /** Sombra bajo los textos claros apoyados sobre foto. */
  sombraTexto?: string;
};

/**
 * Todo lo que va debajo de la foto, para las seis plantillas.
 *
 * Antes esto estaba escrito seis veces. Las diferencias entre copias —un salto
 * de 46 acá y de 48 allá, un peso 800 en una y 700 en otra— no eran decisiones
 * de diseño: eran el desgaste de copiar y pegar. Con una sola función, lo que
 * cambia entre estilos es la paleta, o sea algo que se puede leer de un vistazo.
 */
function dibujarBloqueInferior(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  size: { w: number; h: number },
  product: PlacaProduct,
  storeName: string,
  paleta: Paleta,
  x: number,
  yInicio: number,
  ancho: number
) {
  let y = yInicio;
  const espaciado = px(paleta.espaciado ?? 3);
  const hayDescuento = !!(product.comparePrice && product.comparePrice > product.price);
  const hayCuotas = !!(product.cuotas && product.cuotas >= 2);

  /* ── El presupuesto vertical ──────────────────────────────────────────────
   *
   * Los saltos entre elementos estaban escritos como números fijos, medidos
   * sobre el 4:5. Pero los tres formatos tienen el MISMO ancho y alturas muy
   * distintas: el cuadrado tiene 270 píxeles menos que el 4:5 y 840 menos que
   * Stories. Con saltos fijos, lo que entraba en uno se caía del otro — y lo
   * que se caía era siempre lo último, o sea el botón. En el cuadrado, Luxury
   * quedaba sin "COMPRÁ AHORA" y con un hueco negro abajo.
   *
   * Así que primero se mide cuánto aire hace falta y cuánto hay, y si no entra
   * se achican los ESPACIOS —nunca las letras—. Lo que se pierde es aire, que
   * es lo que sobra; el texto queda del mismo tamaño y el botón entra siempre.
   *
   * El piso de 0,78 es para que no llegue a apretarse: por debajo de eso el
   * bloque se ve amontonado y sería peor que perder la descripción. Con los
   * altos de foto de `altoFoto` no se llega nunca — el factor está para que un
   * nombre largo o una tienda con nombre largo no rompan nada.
   *
   * Se presupuesta con DOS líneas de título, que es el peor caso. Si el nombre
   * entra en una, sobra aire y no molesta.
   */
  const ALTO_BOTON = px(66);
  const MARGEN_INFERIOR = px(26);
  const altoLineaBase = px(76);
  const saltoDescuento = hayDescuento ? (paleta.precioEnPastilla ? px(88) : px(76)) : 0;
  const saltoPrecio = paleta.precioEnPastilla ? px(96) : px(70);
  const saltoCuotas = hayCuotas ? px(42) : 0;

  const aireNecesario =
    px(52) + altoLineaBase * 2 + px(20) + saltoDescuento + saltoPrecio + saltoCuotas;
  const aireDisponible = size.h - yInicio - ALTO_BOTON - MARGEN_INFERIOR;
  const k = Math.max(0.78, Math.min(1, aireDisponible / aireNecesario));
  /** Un salto vertical, ya ajustado al espacio que hay. */
  const e = (n: number) => Math.round(n * k);

  const altoLinea = e(altoLineaBase);

  // ── Nombre de la tienda ───────────────────────────────────────────────────
  /* En mayúsculas y con espaciado. El espaciado es lo que lo convierte de "una
     palabra chica arriba del título" en un encabezado: sin él competía con el
     nombre del producto en vez de presentarlo. */
  ctx.font = fuente(800, px(27));
  ctx.fillStyle = aplicarTinta(ctx, paleta.tienda, x, px(420));
  textoEspaciado(ctx, storeName.toUpperCase(), x, y, espaciado);
  y += e(px(52));

  // ── Nombre del producto ───────────────────────────────────────────────────
  ctx.font = fuente(paleta.pesoTitulo ?? 900, px(68));
  ctx.fillStyle = paleta.titulo;
  const lineas = paleta.sombraTexto
    ? (() => {
        let n = 0;
        conSombra(ctx, { color: paleta.sombraTexto, blur: px(18), dy: px(3) }, () => {
          n = wrapCanvasText(ctx, product.name, x, y, ancho, altoLinea, 2);
        });
        return n;
      })()
    : wrapCanvasText(ctx, product.name, x, y, ancho, altoLinea, 2);
  y += altoLinea * lineas + e(px(20));

  // ── Precio ────────────────────────────────────────────────────────────────
  const textoPrecio = money(product.price);

  /* El precio viejo y el porcentaje van en la MISMA línea, arriba del precio.
     Antes el tachado se comía un renglón entero para decir un número que ya no
     vale. Al lado del `-30%` se entiende de una: esto costaba tanto, ahorrás
     tanto por ciento. */
  if (hayDescuento) {
    const viejo = money(product.comparePrice!);
    ctx.font = fuente(500, px(31));
    ctx.fillStyle = paleta.precioViejo;
    ctx.fillText(viejo, x, y);
    const ow = ctx.measureText(viejo).width;
    ctx.strokeStyle = paleta.precioViejo;
    ctx.lineWidth = px(2.5);
    ctx.beginPath();
    ctx.moveTo(x, y - px(10));
    ctx.lineTo(x + ow, y - px(10));
    ctx.stroke();

    if (paleta.descuento) {
      const pct = Math.round((1 - product.price / product.comparePrice!) * 100);
      const etiqueta = `-${pct}%`;
      ctx.font = fuente(900, px(24));
      const tw = ctx.measureText(etiqueta).width;
      const ex = x + ow + px(18);
      const eh = px(38);
      ctx.fillStyle = paleta.descuento.fondo;
      ctx.beginPath();
      ctx.roundRect(ex, y - eh + px(9), tw + px(20), eh, px(9));
      ctx.fill();
      ctx.fillStyle = paleta.descuento.texto;
      ctx.fillText(etiqueta, ex + px(10), y - px(2));
    }
    /* Cuánto bajar depende de la forma del precio, y no es un número elegido a
       ojo: la pastilla se dibuja HACIA ARRIBA de su línea de base —su techo
       queda 60 por encima—, así que con el salto de 50 que había antes el techo
       de la pastilla caía por encima de la línea del precio tachado y lo tapaba
       a la mitad. Se veía en las cuatro plantillas con pastilla. */
    y += e(saltoDescuento);
  }

  if (paleta.precioEnPastilla) {
    /* El precio adentro de una pastilla con sombra.
       Es el cambio que más se nota en un feed: como texto suelto el precio
       tenía el mismo peso visual que el nombre del producto, y en una placa de
       venta el precio es lo único que se tiene que leer de lejos. */
    ctx.font = fuente(900, px(64));
    const tw = ctx.measureText(textoPrecio).width;
    const ph = px(30);
    const pv = px(20);
    const bw = tw + ph * 2;
    const bh = px(64) + pv * 2;
    conSombra(ctx, { color: "rgba(0,0,0,0.42)", blur: px(28), dy: px(10) }, () => {
      ctx.fillStyle = aplicarTinta(ctx, paleta.precio, x, bw);
      ctx.beginPath();
      ctx.roundRect(x, y - px(64) + px(4), bw, bh, px(20));
      ctx.fill();
    });
    ctx.fillStyle = paleta.precioTexto ?? "#ffffff";
    ctx.fillText(textoPrecio, x + ph, y + px(14));
    /* El piso de la pastilla queda 44 por debajo de su línea de base, así que
       hay que pasar de largo eso ANTES de dejar aire. Con el salto anterior las
       cuotas arrancaban a catorce píxeles del borde de la pastilla y parecían
       pegadas. */
    y += e(saltoPrecio);
  } else {
    ctx.font = fuente(900, px(72));
    ctx.fillStyle = aplicarTinta(ctx, paleta.precio, x, px(560));
    ctx.fillText(textoPrecio, x, y);
    y += e(saltoPrecio);
  }

  // ── Cuotas ────────────────────────────────────────────────────────────────
  if (hayCuotas) {
    const monto = Math.round(product.price / product.cuotas).toLocaleString("es-AR");
    ctx.font = fuente(600, px(27));
    ctx.fillStyle = paleta.cuotas;
    ctx.fillText(`${product.cuotas} cuotas sin interés de $${monto}`, x, y);
    y += e(saltoCuotas);
  }

  // ── Descripción ───────────────────────────────────────────────────────────
  /* Llega ya en texto plano. Antes entraba el HTML crudo del editor y se
     imprimía `<p>Eleva tu estilo con este encantador` sobre la foto. La limpieza
     es de `textoPlano`; acá sólo se dibuja.
     El espacio que necesita el botón está en `ALTO_BOTON`, y la descripción sólo
     entra si DESPUÉS de ella el botón sigue entrando. Antes las dos condiciones
     eran dos números sueltos que no se hablaban, y el resultado fue que en
     Luxury el botón desapareció por dos píxeles: el que se quedaba afuera era el
     único elemento de la placa que pide la venta. */
  const altoDescripcion = px(40) * 2 + px(18);

  if (product.description && y + altoDescripcion + ALTO_BOTON + MARGEN_INFERIOR <= size.h) {
    ctx.font = fuente(400, px(28));
    ctx.fillStyle = paleta.descripcion;
    const n = wrapCanvasText(ctx, product.description, x, y, ancho, px(40), 2);
    y += px(40) * n + px(18);
  }

  // ── Botón ─────────────────────────────────────────────────────────────────
  if (y + ALTO_BOTON + MARGEN_INFERIOR <= size.h) {
    ctx.font = fuente(800, px(26));
    const espCta = px(paleta.espaciado ? paleta.espaciado * 0.6 : 1);
    const tw = anchoEspaciado(ctx, paleta.cta.texto, espCta);
    const bw = tw + px(112);
    const bh = px(66);

    if (paleta.cta.relleno) {
      const pintar = () => {
        ctx.fillStyle = aplicarTinta(ctx, paleta.cta.relleno!, x, bw);
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, px(33));
        ctx.fill();
      };
      if (paleta.cta.resplandor) {
        conSombra(ctx, { color: paleta.cta.resplandor, blur: px(30), dy: px(8) }, pintar);
      } else {
        pintar();
      }
    }
    if (paleta.cta.borde) {
      ctx.strokeStyle = paleta.cta.borde;
      ctx.lineWidth = px(2.5);
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, px(33));
      ctx.stroke();
    }

    ctx.fillStyle = paleta.cta.color;
    textoEspaciado(ctx, paleta.cta.texto, x + px(34), y + bh / 2 + px(9), espCta);
    flecha(ctx, x + px(34) + tw + px(16), y + bh / 2, px(26), px(3), paleta.cta.color);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * La foto
 * ──────────────────────────────────────────────────────────────────────────── */

/** Dibuja la imagen tapando el rectángulo, recortando lo que sobra. */
function fotoQueCubre(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  /* Una imagen sin medidas haría `w / 0` = Infinity, y con eso las coordenadas
     que salen de la cuenta de abajo dejan de ser números finitos. `drawImage`
     con valores así no dibuja nada en el mejor caso y tira en el peor — y si
     tira, se cae la placa entera y el afiliado se queda sin poder compartir por
     una foto rota. Se saltea la imagen y queda el fondo, que es feo pero sale. */
  if (!image.width || !image.height) return;

  const s = Math.max(w / image.width, h / image.height);
  ctx.drawImage(
    image,
    x + (w - image.width * s) / 2,
    y + (h - image.height * s) / 2,
    image.width * s,
    image.height * s
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Las seis plantillas
 *
 * De cada una queda sólo lo que la hace distinta: el tratamiento de la foto, el
 * acento y la paleta. Todo lo demás lo pone `dibujarBloqueInferior`.
 * ──────────────────────────────────────────────────────────────────────────── */

const MARGEN = 72;

/* La foto ocupa distinto según el formato, y el 4:5 es el que aprieta.
   En Stories (1920 de alto) sobra lugar; en el cuadrado la foto es chica por
   definición. El 4:5 es el que tiene foto grande Y poco alto, así que es donde
   el bloque de texto se queda sin espacio — ahí se le recortaron unos 60 píxeles
   a cada plantilla para que el botón entre siempre.

   ── Por qué se mide la PROPORCIÓN y no la altura ──────────────────────────
   Porque `size` viene en píxeles del canvas que se está dibujando, y ese canvas
   no siempre mide 1080 de ancho. Las miniaturas del selector se dibujan a 150
   (`PREVIEW_W`), así que ahí Stories mide 267 de alto y el 4:5 mide 188. Con el
   corte escrito en alturas absolutas —`>= 1800` y `<= 1100`— las TRES caían del
   mismo lado y las seis miniaturas se dibujaban siempre con la foto del formato
   cuadrado: en la vista previa de Stories la foto ocupaba menos de la mitad de
   lo que iba a ocupar en la placa descargada.

   Justo lo que el selector no puede hacer es mentir sobre lo que se va a
   generar — es para lo único que está. La proporción no depende de la escala,
   así que el mismo corte vale para la miniatura y para los 1080 de verdad.

   Los cortes son los mismos de antes, traducidos: 1800/1080 = 1,667 y
   1100/1080 = 1,019. */
function altoFoto(size: { w: number; h: number }, story: number, cuadrada: number, feed: number) {
  const proporcion = size.h / size.w;
  return proporcion >= 1.667 ? story : proporcion <= 1.02 ? cuadrada : feed;
}

// ── CLÁSICA — oscura, foto a sangre ──────────────────────────────────────────
function dibujarClasica(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  size: { w: number; h: number },
  image: HTMLImageElement | null,
  product: PlacaProduct,
  storeName: string
) {
  const imgH = px(altoFoto(size, 1100, 500, 738));
  ctx.fillStyle = "#070b18";
  ctx.fillRect(0, 0, size.w, size.h);

  if (image) fotoQueCubre(ctx, image, 0, 0, size.w, imgH);
  else { ctx.fillStyle = "#111827"; ctx.fillRect(0, 0, size.w, imgH); }

  vineta(ctx, 0, 0, size.w, imgH, 0.4);
  fundidoInferior(ctx, size.w, imgH, imgH * 0.32, "7,11,24");

  dibujarDistintivos(ctx, px, product, px(MARGEN), px(58));

  dibujarBloqueInferior(ctx, px, size, product, storeName, {
    tienda: "#a5b4fc",
    titulo: "#ffffff",
    precioEnPastilla: true,
    precio: { desde: "#10b981", hasta: "#059669" },
    precioTexto: "#ffffff",
    precioViejo: "#64748b",
    descuento: { fondo: "#1e293b", texto: "#34d399" },
    cuotas: "#94a3b8",
    descripcion: "#cbd5e1",
    cta: { texto: "Comprá ahora", relleno: "#4f46e5", borde: null, color: "#ffffff", resplandor: "rgba(79,70,229,0.5)" },
    sombraTexto: "rgba(0,0,0,0.5)",
  }, px(MARGEN), imgH + px(50), size.w - px(MARGEN) * 2);
}

// ── MINIMAL — blanca, foto en tarjeta ────────────────────────────────────────
function dibujarMinimal(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  size: { w: number; h: number },
  image: HTMLImageElement | null,
  product: PlacaProduct,
  storeName: string
) {
  const margen = px(56);
  const imgH = px(altoFoto(size, 1050, 455, 688));
  const imgW = size.w - margen * 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size.w, size.h);

  /* La sombra bajo la tarjeta de la foto es TODA la profundidad de este estilo.
     Minimal no puede llevar pastillas de color ni resplandores sin dejar de ser
     minimal, así que el relieve tiene que venir de la única pieza grande que
     hay. Sin ella la foto era un rectángulo pegado sobre blanco. */
  conSombra(ctx, { color: "rgba(15,23,42,0.18)", blur: px(48), dy: px(18) }, () => {
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.roundRect(margen, margen, imgW, imgH, px(28));
    ctx.fill();
  });

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margen, margen, imgW, imgH, px(28));
  ctx.clip();
  if (image) fotoQueCubre(ctx, image, margen, margen, imgW, imgH);
  vineta(ctx, margen, margen, imgW, imgH, 0.2);
  ctx.restore();

  dibujarDistintivos(ctx, px, product, margen + px(18), margen + px(18));

  dibujarBloqueInferior(ctx, px, size, product, storeName, {
    tienda: "#6366f1",
    titulo: "#0f172a",
    precioEnPastilla: false,
    precio: "#0f172a",
    precioViejo: "#94a3b8",
    descuento: { fondo: "#0f172a", texto: "#ffffff" },
    cuotas: "#475569",
    descripcion: "#64748b",
    cta: { texto: "Comprá ahora", relleno: null, borde: "#0f172a", color: "#0f172a" },
  }, margen, margen + imgH + px(66), imgW);
}

// ── OFERTA — cálida, el descuento manda ──────────────────────────────────────
function dibujarOferta(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  size: { w: number; h: number },
  image: HTMLImageElement | null,
  product: PlacaProduct,
  storeName: string
) {
  const imgH = px(altoFoto(size, 1100, 500, 742));
  ctx.fillStyle = "#1a0a05";
  ctx.fillRect(0, 0, size.w, size.h);

  if (image) fotoQueCubre(ctx, image, 0, 0, size.w, imgH);
  else { ctx.fillStyle = "#3f1d0a"; ctx.fillRect(0, 0, size.w, imgH); }

  vineta(ctx, 0, 0, size.w, imgH, 0.44);
  fundidoInferior(ctx, size.w, imgH, imgH * 0.32, "26,10,5");

  const hayDescuento = !!(product.comparePrice && product.comparePrice > product.price);

  /* El sello del descuento, torcido y con sombra.
     Es lo único inclinado de las seis plantillas, y es a propósito: en un feed
     todo está a noventa grados, así que un elemento apenas girado engancha el
     ojo. Va arriba a la izquierda, que es donde se empieza a leer. */
  if (hayDescuento) {
    const pct = Math.round((1 - product.price / product.comparePrice!) * 100);
    const etiqueta = `-${pct}%`;
    ctx.save();
    ctx.translate(px(MARGEN) + px(78), px(96));
    ctx.rotate((-7 * Math.PI) / 180);
    ctx.font = fuente(900, px(46));
    const tw = ctx.measureText(etiqueta).width;
    const bw = tw + px(46);
    const bh = px(84);
    conSombra(ctx, { color: "rgba(0,0,0,0.45)", blur: px(26), dy: px(9) }, () => {
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, px(16));
      ctx.fill();
    });
    ctx.fillStyle = "#ffffff";
    ctx.fillText(etiqueta, -tw / 2, px(16));
    ctx.restore();
  }

  dibujarDistintivos(ctx, px, product, hayDescuento ? px(MARGEN) + px(180) : px(MARGEN), px(58));

  dibujarBloqueInferior(ctx, px, size, product, storeName, {
    tienda: "#fdba74",
    titulo: "#ffffff",
    precioEnPastilla: true,
    precio: { desde: "#fb923c", hasta: "#ea580c" },
    precioTexto: "#1a0a05",
    precioViejo: "#a1704f",
    cuotas: "#fdba74",
    descripcion: "#d9a68f",
    cta: { texto: "¡Aprovechá!", relleno: "#f97316", borde: null, color: "#1a0a05", resplandor: "rgba(249,115,22,0.5)" },
    sombraTexto: "rgba(0,0,0,0.5)",
  }, px(MARGEN), imgH + px(50), size.w - px(MARGEN) * 2);
}

// ── NEON — negra con resplandor ──────────────────────────────────────────────
function dibujarNeon(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  size: { w: number; h: number },
  image: HTMLImageElement | null,
  product: PlacaProduct,
  storeName: string
) {
  const imgH = px(altoFoto(size, 1100, 500, 738));
  ctx.fillStyle = "#07040f";
  ctx.fillRect(0, 0, size.w, size.h);

  if (image) fotoQueCubre(ctx, image, 0, 0, size.w, imgH);
  else { ctx.fillStyle = "#1a0829"; ctx.fillRect(0, 0, size.w, imgH); }

  vineta(ctx, 0, 0, size.w, imgH, 0.52);
  fundidoInferior(ctx, size.w, imgH, imgH * 0.34, "7,4,15");

  /* La línea de neón, ahora con resplandor de verdad.
     Antes era un trazo de tres píxeles con un degradado: una raya de color. El
     neón no es el tubo, es el halo. Se dibuja dos veces —una gruesa y difusa
     abajo, una fina y nítida encima— que es como se hace un resplandor cuando no
     hay filtros. */
  const linea = ctx.createLinearGradient(0, 0, size.w, 0);
  linea.addColorStop(0, "rgba(176,38,255,0)");
  linea.addColorStop(0.3, "#b026ff");
  linea.addColorStop(0.6, "#ff0099");
  linea.addColorStop(1, "rgba(255,0,153,0)");
  conSombra(ctx, { color: "rgba(224,64,255,0.85)", blur: px(26) }, () => {
    ctx.strokeStyle = linea;
    ctx.lineWidth = px(6);
    ctx.beginPath();
    ctx.moveTo(0, imgH + px(4));
    ctx.lineTo(size.w, imgH + px(4));
    ctx.stroke();
  });
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = px(1.5);
  ctx.beginPath();
  ctx.moveTo(px(120), imgH + px(4));
  ctx.lineTo(size.w - px(120), imgH + px(4));
  ctx.stroke();

  dibujarDistintivos(ctx, px, product, px(MARGEN), px(58));

  dibujarBloqueInferior(ctx, px, size, product, storeName, {
    tienda: { desde: "#b026ff", hasta: "#ff0099" },
    titulo: "#ffffff",
    precioEnPastilla: true,
    precio: { desde: "#b026ff", hasta: "#ff0099" },
    precioTexto: "#ffffff",
    precioViejo: "#7c3aed",
    descuento: { fondo: "#2e1065", texto: "#e879f9" },
    cuotas: "#a855f7",
    descripcion: "#c4b5fd",
    cta: { texto: "Comprá ahora", relleno: { desde: "#b026ff", hasta: "#ff0099" }, borde: null, color: "#ffffff", resplandor: "rgba(224,64,255,0.65)" },
    sombraTexto: "rgba(88,28,135,0.85)",
  }, px(MARGEN), imgH + px(54), size.w - px(MARGEN) * 2);
}

// ── LUXURY — negra y dorada ──────────────────────────────────────────────────
function dibujarLuxury(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  size: { w: number; h: number },
  image: HTMLImageElement | null,
  product: PlacaProduct,
  storeName: string
) {
  const margen = px(56);
  const imgH = px(altoFoto(size, 1040, 440, 652));
  const imgW = size.w - margen * 2;
  const ORO = "#C9A84C";

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size.w, size.h);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margen, margen, imgW, imgH, px(20));
  ctx.clip();
  ctx.fillStyle = "#111";
  ctx.fillRect(margen, margen, imgW, imgH);
  if (image) fotoQueCubre(ctx, image, margen, margen, imgW, imgH);
  vineta(ctx, margen, margen, imgW, imgH, 0.4);
  ctx.restore();

  /* El marco dorado, con un halo tenue por fuera. Sobre negro, una línea de oro
     sin halo se ve como un borde de tabla; con el halo se ve como metal. */
  conSombra(ctx, { color: "rgba(201,168,76,0.4)", blur: px(24) }, () => {
    ctx.strokeStyle = ORO;
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.roundRect(margen, margen, imgW, imgH, px(20));
    ctx.stroke();
  });

  dibujarDistintivos(ctx, px, product, margen + px(18), margen + px(18));

  const sepY = margen + imgH + px(42);
  const sep = ctx.createLinearGradient(margen, 0, size.w - margen, 0);
  sep.addColorStop(0, "rgba(201,168,76,0)");
  sep.addColorStop(0.5, ORO);
  sep.addColorStop(1, "rgba(201,168,76,0)");
  ctx.strokeStyle = sep;
  ctx.lineWidth = px(1.5);
  ctx.beginPath();
  ctx.moveTo(margen, sepY);
  ctx.lineTo(size.w - margen, sepY);
  ctx.stroke();

  dibujarBloqueInferior(ctx, px, size, product, storeName, {
    tienda: ORO,
    titulo: "#f5f0e8",
    /* Sin pastilla y con peso liviano: acá el precio manda por tamaño y por
       espacio alrededor, no por color de fondo. Una pastilla naranja en Luxury
       la convertiría en Oferta. */
    precioEnPastilla: false,
    precio: ORO,
    precioViejo: "#6b5c34",
    cuotas: "#8a7540",
    descripcion: "#8a8070",
    cta: { texto: "COMPRÁ AHORA", relleno: null, borde: ORO, color: ORO },
    espaciado: 6,
    pesoTitulo: 700,
  }, margen, sepY + px(58), imgW);
}

// ── DUO — dos fotos ──────────────────────────────────────────────────────────
function dibujarDuo(
  ctx: CanvasRenderingContext2D,
  px: (n: number) => number,
  size: { w: number; h: number },
  images: (HTMLImageElement | null)[],
  product: PlacaProduct,
  storeName: string
) {
  const collageH = px(altoFoto(size, 1050, 460, 678));
  const gap = px(8);
  const mitad = (size.w - gap) / 2;

  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, size.w, size.h);

  for (let i = 0; i < 2; i++) {
    const ox = i === 0 ? 0 : mitad + gap;
    const img = images[i] ?? images[0];
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, 0, mitad, collageH);
    ctx.clip();
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(ox, 0, mitad, collageH);
    if (img) fotoQueCubre(ctx, img, ox, 0, mitad, collageH);
    /* Viñeta por foto y no sobre el conjunto: si fuera una sola, el corte del
       medio quedaría en la parte más clara y las dos fotos se leerían como una
       sola imagen partida por una raya. Por separado, cada una tiene su propio
       centro y el collage se lee como dos piezas. */
    vineta(ctx, ox, 0, mitad, collageH, 0.4);
    ctx.restore();
  }

  fundidoInferior(ctx, size.w, collageH, collageH * 0.28, "11,17,32");

  dibujarDistintivos(ctx, px, product, px(MARGEN), px(58));

  dibujarBloqueInferior(ctx, px, size, product, storeName, {
    tienda: "#818cf8",
    titulo: "#ffffff",
    precioEnPastilla: true,
    precio: { desde: "#10b981", hasta: "#059669" },
    precioTexto: "#ffffff",
    precioViejo: "#64748b",
    descuento: { fondo: "#1e293b", texto: "#34d399" },
    cuotas: "#94a3b8",
    descripcion: "#9ca3af",
    cta: { texto: "Comprá ahora", relleno: "#4f46e5", borde: null, color: "#ffffff", resplandor: "rgba(79,70,229,0.5)" },
    sombraTexto: "rgba(0,0,0,0.5)",
  }, px(MARGEN), collageH + px(50), size.w - px(MARGEN) * 2);
}

/* ────────────────────────────────────────────────────────────────────────────
 * La entrada
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Dibuja la placa elegida sobre un contexto ya dimensionado.
 *
 * Una sola puerta para las seis: antes cada lugar que generaba una placa —el
 * botón de la tarjeta y la vista previa del selector— tenía su propio `switch`
 * con las seis ramas. Dos `switch` sobre la misma lista es una plantilla nueva
 * que aparece en un lado y en el otro no.
 *
 * Ojo: quien llama tiene que haber esperado a `fuentesListas()`. No se hace acá
 * porque esto es sincrónico a propósito — así se puede llamar adentro de un
 * `requestAnimationFrame` sin que la placa salga a medio dibujar.
 */
export function dibujarPlaca(
  ctx: CanvasRenderingContext2D,
  opciones: {
    template: PlacaTemplateId;
    size: { w: number; h: number };
    /** La escala respecto de los 1080 de referencia. */
    px: (n: number) => number;
    images: (HTMLImageElement | null)[];
    product: PlacaProduct;
    storeName: string;
  }
) {
  const { template, size, px, images, product, storeName } = opciones;
  const principal = images[0] ?? null;

  switch (template) {
    case "clasica": return dibujarClasica(ctx, px, size, principal, product, storeName);
    case "minimal": return dibujarMinimal(ctx, px, size, principal, product, storeName);
    case "oferta": return dibujarOferta(ctx, px, size, principal, product, storeName);
    case "neon": return dibujarNeon(ctx, px, size, principal, product, storeName);
    case "luxury": return dibujarLuxury(ctx, px, size, principal, product, storeName);
    case "duo": return dibujarDuo(ctx, px, size, images, product, storeName);
  }
}
