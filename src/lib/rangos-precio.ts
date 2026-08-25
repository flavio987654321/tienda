// Los tramos de precio del filtro del catálogo, sacados de la tienda de verdad.
//
// ── Por qué no son fijos ─────────────────────────────────────────────────────
// La tentación es escribir "$0 – $100 / $101 – $200 / …" como en cualquier
// plantilla de internet. Acá eso no filtra nada: una remera en Argentina son
// $30.000, así que TODOS los productos caerían en el último tramo y la clienta
// tendría seis opciones de las cuales cinco están vacías.
//
// Los tramos salen de los precios que la tienda tiene HOY. Una tienda de
// accesorios de $2.000 a $12.000 y una de camperas de $80.000 a $400.000 tienen
// que ver cortes distintos, y ninguna de las dos tiene que configurarlos.
//
// ── Qué precio ──────────────────────────────────────────────────────────────
// El que el comprador VE. No es lo mismo: un producto de $25.000 con 30% off se
// muestra a $17.500, y si el filtro usara los $25.000, alguien que pide "hasta
// $20.000" no lo vería — mirando en la misma pantalla que dice $17.500. Quien
// llama a esto le pasa ya resuelto el precio con promo aplicada.
//
// ── Se tiran los tramos vacíos ──────────────────────────────────────────────
// Un tramo sin productos es una opción que promete algo y devuelve una pantalla
// en blanco. Con precios apelotonados (casi todo entre $20.000 y $30.000 y una
// sola campera de $300.000) los cortes parejos dejan cuatro tramos vacíos en el
// medio, y son justo los que la clienta va a tocar.

/** Un tramo. `hasta` es inclusivo — ver `entraEnRango`. */
export type RangoPrecio = {
  desde: number;
  hasta: number;
  /** "$20.000 – $40.000". Lo arma quien llama, con su formateador de moneda. */
  etiqueta: string;
};

/** Cuántos tramos se buscan. Más que esto es una lista para leer, no para elegir. */
const TRAMOS_OBJETIVO = 4;
/** Techo duro: con precios muy desparramados los cortes parejos dan decenas. */
const TRAMOS_MAX = 6;
/** Menos que esto y el catálogo se ve entero sin filtrar. */
const MINIMO_PRODUCTOS = 4;

/**
 * El "paso lindo" más chico que sea >= `crudo`: 1, 2 o 5 por una potencia de 10.
 *
 * Sin esto los cortes salen en $23.847, que es un número que nadie eligiría a
 * mano y que hace que el filtro se lea como un error.
 */
export function pasoLindo(crudo: number): number {
  if (!(crudo > 0) || !Number.isFinite(crudo)) return 1;
  const magnitud = Math.pow(10, Math.floor(Math.log10(crudo)));
  for (const m of [1, 2, 5]) {
    if (crudo <= m * magnitud) return m * magnitud;
  }
  return 10 * magnitud;
}

/**
 * Todos los pasos lindos que podrían servir para este rango.
 *
 * Existe porque redondear el paso "crudo" para arriba una sola vez sale mal
 * seguido: con 60 productos de $10.000 a $98.500, el crudo da $22.125 y el paso
 * lindo de arriba es $50.000 — o sea DOS tramos para sesenta productos, y el
 * primero arrancando en $0 aunque no haya nada abajo de $10.000. El de abajo
 * ($20.000) daba cinco tramos bien repartidos. Hay que poder comparar los dos.
 */
function pasosPosibles(rango: number): number[] {
  const salida: number[] = [];
  const arriba = pasoLindo(rango);
  for (let paso = arriba; paso >= arriba / 1000 && paso > 0; paso /= 10) {
    for (const m of [1, 2, 5]) {
      const cand = (paso / 10) * m;
      // Ni un paso más grande que el rango entero (un tramo), ni tan chico que
      // dé cientos.
      if (cand > 0 && cand <= rango && rango / cand <= 200) salida.push(cand);
    }
  }
  return [...new Set(salida)].sort((a, b) => a - b);
}

/** ¿Este precio cae en este tramo? Los dos bordes adentro: el tramo se ANUNCIA
 *  como "$20.000 – $40.000", así que un producto de $40.000 tiene que aparecer
 *  ahí. Se solapa con el borde del siguiente y está bien: entre "no aparece en
 *  ninguno" y "aparece en dos", el que sorprende mal es el primero. */
export function entraEnRango(precio: number, r: RangoPrecio): boolean {
  return precio >= r.desde && precio <= r.hasta;
}

/**
 * Los tramos para esta lista de precios.
 *
 * Devuelve `[]` cuando el filtro no serviría de nada, y ahí no hay que
 * dibujarlo: sin precios, con un solo precio distinto, o cuando después de tirar
 * los vacíos queda uno solo (que es lo mismo que no filtrar).
 *
 * @param precios Los precios YA visibles — con promo aplicada.
 * @param fmt     Cómo se escribe la plata en esta tienda.
 */
export function rangosDePrecio(precios: number[], fmt: (n: number) => string): RangoPrecio[] {
  const validos = precios.filter(p => typeof p === "number" && Number.isFinite(p) && p > 0);
  /* Con tres productos o menos el catálogo entra en una pantalla: un filtro ahí
     no ayuda a encontrar nada, es un cajón más para leer antes de llegar a lo
     que se ve igual bajando un poco. */
  if (validos.length < MINIMO_PRODUCTOS) return [];

  const min = Math.min(...validos);
  const max = Math.max(...validos);
  // Todo al mismo precio: no hay nada que cortar.
  if (min === max) return [];

  /* ── El producto suelto carísimo ───────────────────────────────────────────
     Una tienda con cinco cosas a $22.000 y UNA campera a $300.000 no se puede
     cortar en tramos parejos: cualquier ancho que llegue hasta los $300.000
     mete las cinco primeras en el mismo cajón, y el filtro queda en "las
     baratas" y "la campera".
     Entonces se corta hasta donde está el grueso del catálogo, y lo que quede
     arriba va a un tramo abierto — "Más de $X" —, que es lo que hace cualquier
     tienda. Sólo cuando el más caro se despega DE VERDAD (más del doble): si no,
     recortar el rango sería inventar un problema que no existe. */
  const ordenados = [...validos].sort((a, b) => a - b);
  /* `(largo - 1) * 0.9`, no `largo * 0.9`: con seis productos, el segundo daba
     el índice 5 — o sea el ÚLTIMO, que es justo el carísimo que se quiere dejar
     afuera. El "grueso" terminaba siendo el despegado y nunca se despegaba de sí
     mismo. */
  const grueso = ordenados[Math.floor((ordenados.length - 1) * 0.9)] ?? max;
  const hayDespegado = max > grueso * 2;
  const techo = hayDespegado ? grueso : max;

  /** Los tramos que da un paso, ya sin los vacíos. `[]` si el paso no sirve. */
  const conPaso = (paso: number): RangoPrecio[] => {
    // Se arranca en el múltiplo de `paso` de abajo del más barato, no en cero:
    // en una tienda de $80.000 a $400.000, arrancar en cero regala tramos
    // vacíos antes de llegar al primer producto.
    const arranque = Math.floor(min / paso) * paso;

    /* Si con este paso hacen falta más tramos que el techo, el paso NO SIRVE —
       y se descarta acá, en vez de cortar la lista y meter todo lo que sobra en
       el último.
       Ese cajón de sastre era el bug: con sesenta productos de $10.000 a
       $98.500 y paso de $1.000 salían cuatro tramos de mil pesos y un quinto de
       "$15.000 – $98.500". Encima ese paso GANABA la comparación, porque después
       de tirar los vacíos parecía tener la cantidad justa de tramos. Un tramo
       cincuenta veces más ancho que sus hermanos no es un filtro. */
    if (Math.ceil((techo - arranque + 1) / paso) > TRAMOS_MAX) return [];

    const tramos: RangoPrecio[] = [];
    for (let desde = arranque; desde <= techo; desde += paso) {
      /* `- 1` para que los tramos no compartan el borde superior con el arranque
         del siguiente: sin eso, "$20.000 – $40.000" y "$40.000 – $60.000" y un
         producto de $40.000 aparece en los dos. El ÚLTIMO sí llega al máximo
         real, para que el más caro de la tienda entre en algún lado. */
      const esUltimo = desde + paso > techo;
      const hasta = esUltimo && !hayDespegado ? Math.max(techo, desde + paso - 1) : desde + paso - 1;
      tramos.push({ desde, hasta, etiqueta: `${fmt(desde)} – ${fmt(hasta)}` });
    }

    /* El tramo abierto del final, con lo que quedó arriba del grueso. */
    if (hayDespegado) {
      const ultimo = tramos[tramos.length - 1];
      const desde = ultimo.hasta + 1;
      if (validos.some(pr => pr >= desde)) {
        tramos.push({ desde, hasta: max, etiqueta: `Más de ${fmt(ultimo.hasta)}` });
      }
    }
    // Los vacíos se van: son opciones que llevan a una pantalla en blanco. Los
    // que quedan siguen teniendo todos el mismo ancho, que es lo que importa.
    return tramos.filter(r => validos.some(p => entraEnRango(p, r)));
  };

  /* Se prueban TODOS los pasos lindos y gana el que deja la cantidad de tramos
     más cerca de la buscada. Redondeando el paso crudo una sola vez alcanzaba
     para que los números fueran lindos, pero no para que el filtro sirviera:
     ver el ejemplo de los sesenta productos en `pasosPosibles`.
     Empatados, gana el que tiene MÁS tramos — es el que corta más fino, y el
     techo de TRAMOS_MAX ya impide que sea una lista interminable. */
  let mejor: RangoPrecio[] = [];
  for (const paso of pasosPosibles(techo - min)) {
    const t = conPaso(paso);
    if (t.length < 2) continue;
    const distancia = Math.abs(t.length - TRAMOS_OBJETIVO);
    const distanciaMejor = mejor.length ? Math.abs(mejor.length - TRAMOS_OBJETIVO) : Infinity;
    if (distancia < distanciaMejor || (distancia === distanciaMejor && t.length > mejor.length)) mejor = t;
  }

  // Uno solo —o ninguno— es lo mismo que no filtrar.
  return mejor.length > 1 ? mejor : [];
}
