/**
 * Lo que la persona acepta antes de pagar un archivo digital.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTO NO ES UNA LETRA CHICA: ES LA ÚNICA DEFENSA QUE HAY
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── El problema que resuelve ────────────────────────────────────────────────
 *
 * Alguien compra un ebook, lo baja, y a los dos días pide el arrepentimiento de
 * los 10 días. Ya tiene el archivo. Bloquearle la descarga no le saca nada.
 *
 * ── Lo que dice la ley ──────────────────────────────────────────────────────
 *
 * El **art. 1116 inc. b del Código Civil y Comercial** exceptúa del derecho de
 * revocación a los "ficheros informáticos, suministrados por vía electrónica,
 * susceptibles de ser descargados o reproducidos con carácter inmediato para su
 * uso permanente". O sea: exactamente esto.
 *
 * Pero el artículo arranca con **"excepto pacto en contrario"**, y los jueces de
 * consumo fallan para el lado del consumidor cuando hay dudas. Así que la
 * excepción sirve si se puede mostrar que la persona lo supo ANTES de pagar.
 *
 * ⚠️ Y el botón de arrepentimiento **sigue siendo obligatorio igual** (Resolución
 * 424/2020): tiene que estar visible y sin registro para todo el sitio. Lo que
 * cambia no es que exista, es qué se contesta cuando el pedido es por un archivo
 * que ya se descargó. La tabla `Arrepentimiento` no se toca.
 *
 * ── Por qué el texto vive acá y se GUARDA en la orden ───────────────────────
 *
 * Porque lo que hay que poder mostrar es la frase que esa persona leyó ese día.
 * Si esto se edita en seis meses, las ventas viejas tienen que seguir diciendo
 * la versión vieja — por eso `Order.digitalConsentTexto` guarda el texto entero
 * y no una versión ni un `true`. Un booleano no prueba nada.
 *
 * ── Lo que esto NO reemplaza ────────────────────────────────────────────────
 *
 * A un abogado. Es el texto que se defiende solo hoy; antes de vender en serio
 * lo tiene que leer alguien de consumo.
 */

/** Lo que se acepta al comprar el producto y sus bonos. */
export const TEXTO_CONSENTIMIENTO =
  "Entiendo que estoy comprando un archivo digital de descarga inmediata y que, "
  + "una vez descargado, no puedo pedir la devolución (art. 1116 inc. b del Código "
  + "Civil y Comercial). Si todavía no lo descargué, sí puedo arrepentirme dentro "
  + "de los 10 días.";

/**
 * Lo que se acepta en la oferta de después de pagar.
 *
 * Es su propio texto y no una bandera reutilizada, porque lo que se acepta es
 * distinto: ahí ya hay una compra hecha y ésta es una segunda, aparte. Guardar
 * el texto del checkout en un agregado sería guardar una prueba de algo que esa
 * persona no leyó.
 *
 * ⚠️ Acá no hay casilla: la frase va A LA VISTA arriba del botón y el acto de
 * apretarlo es la aceptación. Una casilla más en la pantalla de después de pagar
 * mata la oferta, y el valor legal de "lo leyó arriba del botón que apretó" es
 * el mismo mientras la frase esté visible y no escondida en un link.
 */
export const TEXTO_CONSENTIMIENTO_AGREGADO =
  "Entiendo que esto es una compra aparte, de un archivo digital de descarga "
  + "inmediata, y que una vez descargado no puedo pedir la devolución "
  + "(art. 1116 inc. b del Código Civil y Comercial).";

/**
 * ⚠️ LA GARANTÍA DEL VENDEDOR LE GANA A TODO ESTO, y hay que decirlo.
 *
 * ── El choque que casi queda escrito en la pantalla ─────────────────────────
 *
 * La página de venta puede prender una sección de garantía —"30 días o te
 * devolvemos la plata"— y el checkout la muestra como sello, abajo del botón.
 * Con la casilla recién puesta arriba, la misma pantalla iba a decir las dos
 * cosas: "30 días para pedir la devolución" y "una vez descargado no podés pedir
 * la devolución".
 *
 * Y no es sólo feo: el art. 1116 arranca con **"excepto pacto en contrario"**, y
 * prometer 30 días ES el pacto en contrario. O sea que la garantía gana, la
 * excepción se cae, y encima queda guardada como prueba una frase que la propia
 * página desmiente. Un abogado de consumo lo desarma en un renglón.
 *
 * Así que cuando hay garantía, el texto la NOMBRA. Se pierde la excepción —ya
 * estaba perdida desde que se prometió— pero se gana lo único que importaba:
 * que lo aceptado y lo prometido digan lo mismo.
 */
const frasePorLaGarantia = (dias: number) =>
  ` Esto no toca la garantía de ${dias} ${dias === 1 ? "día" : "días"} que ofrece quien vende:`
  + " si te la querés hacer valer, escribile.";

/**
 * El texto que corresponde, según sea una compra nueva o un agregado, y según lo
 * que la página prometa.
 *
 * ⚠️ Lo elige el SERVIDOR. El navegador manda "acepté", nunca qué aceptó: si el
 * texto viajara desde el cliente, una prueba legal sería un campo que cualquiera
 * puede reescribir antes de mandarlo, y probaría exactamente nada.
 *
 * `diasDeGarantia` sale de `pagina-venta.diasDeGarantia`, que es la misma cuenta
 * que dibuja el sello del checkout. Una sola función para que el sello y la
 * prueba no puedan decir cosas distintas.
 */
export function textoQueAcepto(esAgregado: boolean, diasDeGarantia: number | null): string {
  const base = esAgregado ? TEXTO_CONSENTIMIENTO_AGREGADO : TEXTO_CONSENTIMIENTO;
  const dias = typeof diasDeGarantia === "number" && Number.isFinite(diasDeGarantia) && diasDeGarantia > 0
    ? Math.floor(diasDeGarantia)
    : null;
  return dias === null ? base : base + frasePorLaGarantia(dias);
}
