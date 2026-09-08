/**
 * Los primeros pasos de una cuenta digital.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SE CALCULA DE LA REALIDAD, NUNCA DE UNA BANDERA GUARDADA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No hay ningún `onboardingCompletado` en la base, y es a propósito. Una bandera
 * guardada se desincroniza el día que alguien borra su producto o desconecta
 * Mercado Pago: la lista diría "listo" con la cuenta rota. Acá cada paso se
 * pregunta por el dato de verdad, así que **no puede mentir** — y si algo se
 * rompe, el paso vuelve a aparecer solo, que es justo lo que hay que ver.
 *
 * El costo es que no se puede "descartar" la lista. Tampoco hace falta: se va
 * sola cuando los cinco están hechos, y hasta entonces cada uno que falta es
 * algo que de verdad impide vender.
 *
 * ── Por qué estos cinco y en este orden ────────────────────────────────────
 *
 * Es el orden del trabajo, no el del menú. Y los cinco son **bloqueantes para
 * vender**: sin cualquiera de ellos no entra un peso. No hay pasos de cortesía —
 * un paso que se puede saltear entrena a saltearlos todos.
 *
 *   1. El producto — no hay nada que vender.
 *   2. El archivo — se puede cobrar y no se puede entregar. Es el peor de todos:
 *      es el único que falla DESPUÉS de que alguien pagó.
 *   3. La página — es lo que la persona lee antes de comprar. Con el texto de
 *      fábrica se vende bastante menos.
 *   4. Mercado Pago — sin esto el botón de comprar no cobra nada.
 *   5. Publicar — está todo listo y no lo ve nadie.
 *
 * ⚠️ El 4 podría ir antes, pero va acá por un motivo: conectar Mercado Pago es
 * el paso que más gente abandona —te saca de la aplicación, pide iniciar sesión—
 * y ponerlo primero es perder a quien todavía no vio nada de lo suyo armado.
 * Primero se ve el producto propio hecho, después se pide el trámite.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * BLOQUEAR LA VENTA Y BLOQUEAR LA PUERTA NO ES LO MISMO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Los cinco impiden vender. Pero para **entrar al panel** alcanza con TRES —el
 * producto, la página y el cobro—, y los otros dos quedan adentro a propósito.
 *
 * La regla es: a la puerta va lo que no se puede hacer de otra forma ni más
 * tarde. Publicar se decide mirando, y el archivo tiene dos caminos, de los
 * cuales uno vive adentro del panel. Pedirlos para entrar no protege nada —
 * `loQueFalta` ya frena publicar y comprar sin archivo— y sí deja gente
 * encerrada afuera. El porqué completo de cada uno está en `PASOS_DE_ADENTRO`.
 *
 * Los dos NO se pierden: la lista del panel (`PrimerosPasos`) los sigue
 * mostrando hasta que estén hechos, y esa lista sí mira los cinco.
 */

export type ClavePaso = "producto" | "archivo" | "pagina" | "cobro" | "publicar";

export type Paso = {
  clave: ClavePaso;
  titulo: string;
  /** Qué pasa si falta. Una línea, y siempre la consecuencia, nunca la tarea. */
  porque: string;
  href: string;
  /** El texto del botón, cuando es el paso en el que hay que estar. */
  accion: string;
  hecho: boolean;
};

/** Lo que hay que mirar de la cuenta. Sale de una consulta, no de una bandera. */
export type FotoDeLaCuenta = {
  /** El id del producto principal más viejo, o `null` si no hay ninguno. */
  principalId: string | null;
  tieneArchivo: boolean;
  /** Si la página de venta se editó alguna vez (`paginaVenta` no es null). */
  paginaArmada: boolean;
  cobroConectado: boolean;
  publicado: boolean;
};

export function primerosPasos(foto: FotoDeLaCuenta): Paso[] {
  /* Los tres pasos del medio llevan al producto, así que sin producto no tienen
     a dónde ir. Se apunta a la lista, que es donde se crea. */
  const alProducto = foto.principalId
    ? `/digitales/productos/${foto.principalId}/pagina`
    : "/digitales/productos";

  return [
    {
      clave: "producto",
      titulo: "Armá tu producto",
      porque: "Con la IA salen los tres de una: tu producto, un bono de regalo y un upsell.",
      href: "/digitales/productos",
      accion: "Armarlo con IA",
      hecho: foto.principalId !== null,
    },
    {
      clave: "archivo",
      titulo: "Subí el archivo",
      /* ⚠️ El único paso que falla DESPUÉS de que alguien pagó, y por eso el
         porqué es el más duro de los cinco. */
      porque: "Es lo que se le entrega a quien compra. Sin él se puede cobrar y no se puede entregar.",
      href: "/digitales/productos",
      accion: "Subir el archivo",
      hecho: foto.tieneArchivo,
    },
    {
      clave: "pagina",
      titulo: "Armá tu página de venta",
      porque: "Es lo que la persona lee antes de decidir. Con el texto de fábrica se vende menos.",
      href: alProducto,
      accion: "Armar la página",
      hecho: foto.paginaArmada,
    },
    {
      clave: "cobro",
      titulo: "Conectá Mercado Pago",
      porque: "La plata va derecho a tu cuenta. Sin esto, el botón de comprar no cobra nada.",
      href: "/digitales/configuracion?tab=pagos",
      accion: "Conectar Mercado Pago",
      hecho: foto.cobroConectado,
    },
    {
      clave: "publicar",
      titulo: "Publicá tu página",
      porque: "Hasta que la publiques no la ve nadie, ni con el link.",
      href: "/digitales/productos",
      accion: "Publicarla",
      hecho: foto.publicado,
    },
  ];
}

/** Cuántos hechos, para la barra. */
export const cuantosHechos = (pasos: Paso[]): number => pasos.filter((p) => p.hecho).length;

/**
 * El primero que falta: el único que muestra su botón.
 *
 * Un botón en cada paso pendiente parece más útil y es peor — cinco llamados a
 * la acción a la vez no llaman a ninguna. Y el orden importa: subir el archivo
 * antes de tener producto no se puede.
 */
export const elQueSigue = (pasos: Paso[]): Paso | null => pasos.find((p) => !p.hecho) ?? null;

/** Si ya está todo, la lista no se dibuja. */
export const terminado = (pasos: Paso[]): boolean => pasos.every((p) => p.hecho);

/**
 * Los pasos que se hacen DESPUÉS de entrar al panel, no antes.
 *
 * Están nombrados acá y en ningún otro lado: la puerta se define como "todos
 * menos éstos" y no como una lista de claves escrita aparte. Escrita aparte, el
 * día que se agregue un paso hay que acordarse de tocar dos lugares — y
 * olvidarse deja gente encerrada afuera del panel.
 *
 * ── `publicar` ────────────────────────────────────────────────────────────
 * Pedirlo para entrar obliga a poner la página a la vista antes de haberla
 * visto. Se entra en borrador, se mira, se acomoda, y se publica al final.
 *
 * ── `archivo` (07/09/26) ──────────────────────────────────────────────────
 * Éste estaba en la puerta, y salió por dos motivos.
 *
 * El primero: **el archivo tiene dos caminos y uno solo entraba acá**. Se puede
 * subir un PDF propio, o —desde Starter— pedir que la IA escriba el ebook. Lo
 * segundo vive en la pantalla de Productos, o sea del otro lado de la puerta.
 * Así que a alguien que pagó justamente para que se lo escribamos, la puerta le
 * pedía un PDF que no tiene y le escondía la pantalla que se lo haría.
 *
 * El segundo: **sacarlo no abre ningún agujero**. El miedo escrito en el paso 2
 * es "se cobra y no se puede entregar", y eso ya lo frena `loQueFalta` en dos
 * lugares más abajo: publicar sin archivo se rechaza (`productos/[id]`), y
 * comprar lo vuelve a mirar. Sin archivo no se publica, y sin publicar no se
 * vende. La red estaba puesta dos veces antes de que esto fuera un paso.
 *
 * ⚠️ Lo que NO cambió es que sigue siendo bloqueante para VENDER, y la lista
 * del panel lo sigue pidiendo hasta que esté.
 */
export const PASOS_DE_ADENTRO: ClavePaso[] = ["archivo", "publicar"];

/**
 * Los pasos que hay que terminar para que aparezca el panel.
 *
 * Los tres que no se pueden hacer de otra forma ni más tarde: sin producto no
 * hay nada, la página se arma una sola vez, y sin Mercado Pago el panel no
 * tiene nada que mostrar. Ver el comentario largo de arriba.
 */
export const pasosDeLaPuerta = (pasos: Paso[]): Paso[] =>
  pasos.filter((p) => !PASOS_DE_ADENTRO.includes(p.clave));

/**
 * El nombre corto de cada paso, para las barras de progreso.
 *
 * Vive acá y no en cada pantalla porque lo dibujan DOS —el recibimiento y la
 * pantalla de "Todo listo"—, una al lado de la otra en el mismo recorrido.
 * Escrito dos veces, se renombra uno y la barra cambia de palabra a mitad de
 * camino.
 */
export const NOMBRE_CORTO: Record<ClavePaso, string> = {
  producto: "Producto",
  archivo: "Archivo",
  pagina: "Página",
  cobro: "Cobro",
  publicar: "Publicar",
};
