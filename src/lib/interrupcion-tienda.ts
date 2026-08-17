// Browser-only — import only from client components ("use client").

/* Una interrupción por vez en la tienda.
 *
 * ── El problema, que ya pasó tres veces ──────────────────────────────────────
 * Varias cosas de la tienda aparecen SOLAS, por temporizador, sin que el
 * visitante haya pedido nada: el flyer promocional, el cartel de "instalá la
 * app", el globo de "activá las notificaciones". Cada una decidía su momento por
 * su cuenta, sin enterarse de que existían las otras, y se pisaban:
 *
 *   · El flyer sale a los 400 ms y ocupa la pantalla entera con un velo negro.
 *     El cartel de instalar salía a los 3-4 s DEBAJO de ese velo: dibujado,
 *     invisible y sin poder tocarse. En iPhone era lo peor, porque ese cartel es
 *     lo único que explica cómo se instala.
 *   · Antes de eso, un banner de "activá las notificaciones" caía en las mismas
 *     coordenadas que el cartel de instalar y lo tapaba entero. Está contado en
 *     `StorePushBanner`, y se resolvió BORRANDO uno de los dos.
 *
 * Ese arreglo —sacar del medio al que molesta— es el que hay que dejar de hacer.
 * Subir un z-index tampoco alcanza: no evita que dos cosas peleen por la
 * atención en el mismo segundo, sólo decide cuál gana.
 *
 * ── Cómo se arregla de raíz ──────────────────────────────────────────────────
 * El que quiere interrumpir PIDE TURNO. Si hay alguien ocupando la pantalla,
 * espera; cuando el de adelante libera, pasa el que sigue por prioridad. Nunca
 * hay dos a la vez, y agregar una interrupción nueva no obliga a revisar las que
 * ya estaban: se anota en `PRIORIDAD` y el turnero la ordena.
 *
 * OJO: esto es para lo que aparece solo. Lo que abre el visitante a propósito
 * —el carrito, la ficha de un producto, el reporte— no pide turno: si lo tocó,
 * lo quiere ahora.
 *
 * Es un módulo y no un contexto de React a propósito: los que interrumpen son
 * hermanos lejanos —el flyer cuelga del renderer del template, el cartel se
 * dibuja al lado de `StoreShell`— y un provider que los abarcara obligaría a
 * mover los tres de lugar para resolver un problema de tiempos.
 */

/** Quiénes pueden interrumpir. El orden es el de prioridad: primero el de arriba. */
const PRIORIDAD = [
  /* La oferta va antes que todo: es lo que el comerciante puso para vender, y es
     lo que el visitante vino a ver. */
  "flyer",
  /* Instalar la app: importa, pero después de la oferta. */
  "instalar-app",
  /* El globo de activar notificaciones. Va último porque sólo lo ve quien YA
     siguió la tienda: es el que menos se pierde si espera. */
  "activar-push",
] as const;

export type Interrupcion = (typeof PRIORIDAD)[number];

/** Lo que hace falta para mostrar a alguien y, si hay que sacarlo, esconderlo. */
type Pedido = {
  mostrar: (liberar: () => void) => void;
  ocultar?: () => void;
};

let actual: Interrupcion | null = null;
const pedidos = new Map<Interrupcion, Pedido>();
const esperando = new Map<Interrupcion, Pedido>();

function conceder(quien: Interrupcion, pedido: Pedido): void {
  actual = quien;
  pedidos.set(quien, pedido);
  // El `liberar` se le PASA al callback en vez de que lo cierre por su cuenta.
  // No es un detalle de estilo: cuando la pantalla está libre esto corre de forma
  // sincrónica, o sea ANTES de que `const liberar = pedirTurno(...)` termine de
  // asignarse. Quien intentara leer esa variable adentro del callback se comía un
  // `ReferenceError` en el camino más común. Recibiéndola por parámetro, no hay
  // forma de escribir ese error.
  pedido.mostrar(() => liberarA(quien));
}

function siguiente(): void {
  for (const quien of PRIORIDAD) {
    const pedido = esperando.get(quien);
    if (!pedido) continue;
    esperando.delete(quien);
    conceder(quien, pedido);
    return;
  }
  actual = null;
}

function liberarA(quien: Interrupcion): void {
  if (actual === quien) {
    pedidos.delete(quien);
    siguiente();
  } else {
    esperando.delete(quien);
    pedidos.delete(quien);
  }
}

/**
 * Pide la pantalla. Si está libre, `mostrar` se llama en el acto; si no, queda
 * anotado y se lo llama cuando le toque.
 *
 * A `mostrar` se le PASA la función para liberar. Usar esa y no la que devuelve
 * `pedirTurno`: cuando la pantalla está libre el callback corre de forma
 * sincrónica, o sea antes de que el `const` de afuera termine de asignarse.
 *
 * `ocultar` es opcional y significa "a esto se lo puede sacar de pantalla si
 * llega algo más importante". Quien no lo pasa, se muestra hasta que él quiera.
 *
 * Devuelve la función para liberar, que hay que llamar al cerrarse Y al
 * desmontarse. Si se pierde esa llamada, la cola queda trabada para siempre y no
 * vuelve a aparecer ninguna de las que esperaban — por eso conviene guardarla en
 * un ref y soltarla también desde el cleanup del efecto.
 */
export function pedirTurno(
  quien: Interrupcion,
  mostrar: (liberar: () => void) => void,
  ocultar?: () => void
): () => void {
  const pedido: Pedido = { mostrar, ocultar };

  if (actual === null) {
    conceder(quien, pedido);
  } else if (actual !== quien) {
    const mando = PRIORIDAD.indexOf(quien) < PRIORIDAD.indexOf(actual);
    const suyo = pedidos.get(actual);

    if (mando && suyo?.ocultar) {
      /* Le saca la pantalla al que la tiene.
       *
       * Sin esto la prioridad sólo ordenaba la COLA, y eso no alcanzaba: el globo
       * de notificaciones pide turno al montarse, mientras que el flyer recién lo
       * pide a los 400 ms (1200 adentro de la app). O sea que el de MENOR
       * prioridad llegaba primero, se quedaba con la pantalla 7 segundos y
       * atrasaba hasta después la oferta del comerciante — que es lo que él puso
       * ahí para vender.
       *
       * Sólo se expropia a quien dejó un `ocultar`, o sea a quien avisó que se lo
       * puede sacar sin romper nada. Y no se pierde: vuelve a la cola y se muestra
       * cuando el otro termine. */
      const desalojado = actual;
      suyo.ocultar();
      pedidos.delete(desalojado);
      esperando.set(desalojado, suyo);
      conceder(quien, pedido);
    } else {
      esperando.set(quien, pedido);
    }
  }

  let liberado = false;
  return () => {
    // Idempotente: el cierre y el desmontar suelen llegar los dos, y sin esto el
    // segundo le pasaría el turno a alguien que ya lo tenía.
    if (liberado) return;
    liberado = true;
    liberarA(quien);
  };
}

/** Sólo para los chequeos: deja el turnero como recién arrancado. */
export function reiniciarTurnero(): void {
  pedidos.clear();
  actual = null;
  esperando.clear();
}
