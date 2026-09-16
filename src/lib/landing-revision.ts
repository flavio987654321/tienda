/**
 * La revisión de la landing propia: qué le encontramos de malo al texto.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * La vendedora le pide la página a Claude, y Claude hace lo que le piden. Si
 * le pide "poné testimonios" o "poné que quedan pocos lugares", los escribe
 * — y el que firma esa página es ella. Limpiar el HTML resuelve lo técnico
 * (nada ejecutable entra), pero no mira lo que DICE.
 *
 * Esto lo mira. Corre sola cuando se sube el archivo, sobre el texto visible,
 * y devuelve hallazgos en castellano con qué hacer. Dos niveles:
 *
 *   traba  — no se puede prender. Hoy hay una sola: que no haya forma de
 *            comprar. Una página de venta sin botón de compra no es una
 *            página de venta, y publicarla es gastar visitas.
 *   aviso  — se puede prender, pero conviene saberlo. Casi todo cae acá: no
 *            somos el juez de lo que puede decir su negocio, y frenarla por
 *            una palabra sería tratarla como sospechosa. Se lo decimos, con
 *            el motivo, y decide ella.
 *
 * ── Lo que NO hace ─────────────────────────────────────────────────────────
 *
 * No entiende el texto: son patrones. Va a errar en los dos sentidos —dejar
 * pasar una promesa rara y marcar una frase inocente— así que cada aviso
 * dice por qué salta y se puede ignorar. Por eso ninguno traba, salvo el
 * botón.
 *
 * Es puro y lo importa el navegador y el servidor. Probado en
 * `landing-propia.check.ts`.
 */

export type NivelDeHallazgo = "traba" | "aviso";

export type Hallazgo = {
  nivel: NivelDeHallazgo;
  /** Qué encontramos, en una línea. */
  que: string;
  /** Qué hacer. Vacío cuando no hay nada que hacer más que saberlo. */
  arreglo: string;
  /**
   * Lo mismo, pero escrito PARA Claude: entra en el mensaje que la
   * vendedora copia y le pega para que regenere el archivo. Vacío cuando
   * no hay nada que pedirle (una garantía, por ejemplo, la decide ella).
   */
  pedido: string;
};

/** Lo que mira la revisión, además del texto. */
export type QueTrajo = {
  /** Cuántos botones llevan al pago (`data-tienda="comprar"`). */
  comprar: number;
  /** Si dejó el hueco del precio. */
  precio: number;
  /** Si dejó el hueco de las opiniones verificadas. */
  opiniones: boolean;
  /** El CSS, para lo que se ve mal en un celular. */
  css: string;
};

const TOPE = 12;

/**
 * El texto visible de la landing (sin etiquetas) + lo que trajo → los
 * hallazgos, los que traban primero.
 */
export function revisarLanding(texto: string, trajo: QueTrajo): Hallazgo[] {
  const t = texto.replace(/\s+/g, " ").trim();
  const h: Hallazgo[] = [];
  const hay = (re: RegExp) => re.test(t);
  const loQueDice = (re: RegExp) => {
    const m = t.match(re);
    if (!m) return "";
    const i = Math.max(0, (m.index ?? 0) - 25);
    const trozo = t.slice(i, (m.index ?? 0) + m[0].length + 25).trim();
    return `«…${trozo}…»`;
  };

  /* ── Lo único que traba ──────────────────────────────────────────────── */

  if (trajo.comprar === 0) {
    h.push({
      nivel: "traba",
      que: "No hay ningún botón que lleve al pago.",
      arreglo: 'Pedile a Claude que marque los botones de comprar con data-tienda="comprar". Sin eso, quien quiera comprarte no tiene por dónde.',
      pedido: "Marcá cada botón de comprar así: <a data-tienda=\"comprar\" class=\"tu-clase\">Tu texto</a>. El destino del link lo pone TiendaApps solo; no le pongas href.",
    });
  }

  /* ── Lo que se avisa ─────────────────────────────────────────────────── */

  /* Escasez inventada. Un archivo digital no se agota, y un contador que el
     servidor no hace cumplir es mentira. Ver `lib/oferta-salida`. */
  if (hay(/\b(quedan|solo quedan|últim[oa]s|apurate)\b[^.]{0,30}\b(cupos?|lugares?|unidades?|copias?|vacantes?)\b/i) || hay(/\bcupos?\s+(limitad|reservad|disponibles)/i) || hay(/stock limitado|pocas unidades/i)) {
    h.push({
      nivel: "aviso",
      que: `Dice que quedan pocos lugares o cupos ${loQueDice(/\b(quedan|últim[oa]s)\b[^.]{0,40}/i)}.`,
      arreglo: "Un archivo digital no se agota, así que eso no se puede sostener si alguien pregunta. Si querés apurar la compra, usá la oferta de salida: el plazo es de verdad y el servidor lo hace cumplir.",
      pedido: "Sacá las frases de escasez (\"quedan pocos cupos\", \"últimas unidades\", \"stock limitado\"): es un producto digital y no se agota.",
    });
  }
  if (hay(/\b\d{1,2}:\d{2}\b/) || hay(/termina en \d|se acaba en \d|cuenta regresiva|reservad[oa] por/i)) {
    h.push({
      nivel: "aviso",
      que: "Quedó escrito un reloj o una cuenta regresiva.",
      arreglo: 'Sin su programa no corre, así que se queda clavado. El reloj de verdad lo ponemos nosotros: pedile a Claude que deje el hueco data-tienda="reloj".',
      pedido: "Sacá el contador o reloj escrito. Si querés uno, dejá en su lugar un contenedor vacío <div data-tienda=\"reloj\"></div>: TiendaApps pone ahí un reloj de verdad.",
    });
  }

  /* Opiniones escritas a mano: son de alguien que puede no existir. */
  const comillas = (t.match(/[«"“][^«»"”]{25,300}[»"”]/g) ?? []).length;
  if ((comillas >= 2 || hay(/\btestimonios?\b|opiniones de (clientes|compradores)|lo que dicen (mis|nuestros)/i) || hay(/★{3,}|⭐{3,}|\b[45](,\d)?\s*(estrellas|de 5)\b/i)) && !trajo.opiniones) {
    h.push({
      nivel: "aviso",
      que: "Parece traer opiniones o testimonios escritos adentro de la página.",
      arreglo: 'Si te los dijeron de verdad, podés dejarlos (el que responde por ellos sos vos). Si los inventó Claude, sacalos: son publicidad engañosa. Lo mejor es el hueco data-tienda="opiniones": ahí ponemos las de gente que te compró, con el sello de compra verificada.',
      pedido: "Sacá los testimonios, nombres de clientes y estrellas que estén escritos en el archivo, y dejá en su lugar un contenedor vacío <div data-tienda=\"opiniones\"></div>.",
    });
  }

  /* Números de ventas que nadie puede comprobar. */
  if (hay(/[+]?\s?\d{2,}(\.\d{3})*\s*(personas|clientes|alumnos|compradores|ventas|descargas|familias)\b/i)) {
    h.push({
      nivel: "aviso",
      que: `Dice una cantidad de gente o de ventas ${loQueDice(/[+]?\s?\d{2,}(\.\d{3})*\s*(personas|clientes|alumnos|compradores|ventas|descargas|familias)\b/i)}.`,
      arreglo: "Si es cierto, dejalo. Si es un número de ejemplo que puso Claude, cambialo: es de las primeras cosas que alguien te va a preguntar.",
      pedido: "Sacá las cantidades de alumnos, ventas o descargas: no las puedo comprobar.",
    });
  }

  /* El precio escrito a mano: el día que lo cambie en Productos, esta página
     sigue diciendo el viejo. */
  if (hay(/\$\s?\d{1,3}(\.\d{3})+|\$\s?\d{4,}/)) {
    h.push({
      nivel: "aviso",
      que: `Hay un precio escrito adentro del texto ${loQueDice(/\$\s?\d{1,3}(\.\d{3})+|\$\s?\d{4,}/)}.`,
      arreglo: 'El día que cambies el precio en Productos, ese número va a quedar viejo. Pedile a Claude que use data-tienda="precio", que lo llenamos nosotros.',
      pedido: "Sacá los precios escritos a mano y usá <span data-tienda=\"precio\"></span> para el precio y <span data-tienda=\"precio-anterior\"></span> para el tachado. No escribas el signo $ afuera del hueco.",
    });
  } else if (trajo.precio === 0) {
    h.push({
      nivel: "aviso",
      que: "En ningún lado se ve el precio.",
      arreglo: 'Pedile a Claude que ponga data-tienda="precio" cerca del botón de comprar. Una página sin precio hace que la persona se vaya a preguntar en vez de comprar.',
      pedido: "Mostrá el precio con <span data-tienda=\"precio\"></span> cerca de cada botón de comprar, al principio y al final.",
    });
  }

  /* Otra plataforma nombrada: la de la competencia quedó escrita adentro. */
  const otra = t.match(/\b(shopify|hotmart|tiendanube|woocommerce|gumroad|kajabi|mercado ?shops|wix)\b/i);
  if (otra) {
    h.push({
      nivel: "aviso",
      que: `Nombra a ${otra[0]} ${loQueDice(/\b(shopify|hotmart|tiendanube|woocommerce|gumroad|kajabi|mercado ?shops|wix)\b/i)}.`,
      arreglo: "Suele venir de una versión anterior de la página. Cambialo: acá el pago es nuestro, con Mercado Pago.",
      pedido: "Sacá toda mención a otras plataformas de venta o de pago: el cobro lo hace TiendaApps con Mercado Pago.",
    });
  }

  /* Promesas que después tiene que cumplir ella. */
  const garantia = t.match(/garant[íi]a[^.]{0,40}\b(\d{1,3})\s*d[íi]as|devoluci[óo]n[^.]{0,40}\b(\d{1,3})\s*d[íi]as/i);
  if (garantia) {
    h.push({
      nivel: "aviso",
      que: `Promete una garantía con plazo ${loQueDice(/garant[íi]a[^.]{0,60}/i)}.`,
      arreglo: "Está bien tenerla, pero la cumplís vos: si alguien la pide, le devolvés la plata por donde pagó. Por ley, además, un digital tiene 10 días de arrepentimiento.",
      pedido: "",
    });
  }
  if (hay(/\benv[íi]o gratis|te lo enviamos por correo postal|recib[íi]lo en tu casa/i)) {
    h.push({
      nivel: "aviso",
      que: "Habla de envíos.",
      arreglo: "Lo tuyo es digital: llega por mail al instante. Sacá esa parte para no confundir.",
      pedido: "Sacá todo lo que hable de envíos, correo o recibir algo en casa: el producto es digital y llega por mail al instante.",
    });
  }

  /* Lo que se rompe en un celular. */
  if (/position\s*:\s*fixed/i.test(trajo.css)) {
    h.push({
      nivel: "aviso",
      que: "Tiene algo pegado a la pantalla (una barra fija).",
      arreglo: "Dos cosas: en celulares chicos suele tapar el botón de comprar, y si esa barra aparecía sola al bajar, eso lo hacía el programa que le sacamos — hoy no aparece nunca. Miralo en la previa en celular. Si la querés, pedile a Claude que la marque con data-tienda-aparece.",
      pedido: "Sacá el position: fixed (las barras o botones pegados a la pantalla): tapan el contenido en celulares chicos. Y si esa barra aparecía al bajar con un script, no va a aparecer nunca: dejala siempre visible o marcala con data-tienda-aparece y animala con [data-tienda-aparece] / [data-tienda-visto].",
    });
  }

  return h.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "traba" ? -1 : 1)).slice(0, TOPE);
}

/** Si algo traba, no se puede prender. La pantalla lo dice y la ruta lo cumple. */
export function tieneTraba(hallazgos: Hallazgo[]): boolean {
  return hallazgos.some((x) => x.nivel === "traba");
}
