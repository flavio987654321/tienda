/**
 * El recorrido desde que alguien entra hasta que paga, y dónde se cae.
 *
 * Hasta acá el panel tenía los dos extremos —visitas arriba, pedidos abajo— y
 * una división entre los dos llamada "conversión". Con eso se sabe que de cada
 * cien personas compran dos, y no se sabe absolutamente nada sobre las otras
 * noventa y ocho: si no encontraron nada, si el envío las espantó, o si llenaron
 * todo el formulario y se cayeron en el último paso. Son tres problemas
 * distintos y ninguno se arregla igual.
 *
 * Todo son funciones puras. Los chequeos están en `embudo.check.ts`.
 *
 * ── Lo que hay que tener en la cabeza al leerlo ──────────────────────────────
 * Los seis escalones NO se cuentan todos igual, y no hay forma de que se
 * cuenten igual sin ponerle una cookie de seguimiento a cada persona:
 *
 *   entro, carrito, checkout  → una vez por navegador por día
 *   datos                     → una vez por email (`AbandonedCart` es única por
 *                               tienda+email y se va actualizando)
 *   pedido, pago              → una fila por pedido
 *
 * O sea que los porcentajes son aproximados, y en los bordes pueden dar cosas
 * raras: alguien que entra el lunes y compra el miércoles suma al "entró" del
 * lunes y al "pedido" del miércoles. Por eso `armarEmbudo` nunca deja que un
 * escalón muestre más que el anterior, y por eso la pantalla lo dice en vez de
 * presentar los números como si fueran una cuenta exacta.
 *
 * Preferimos un embudo aproximado y dicho, a no tener embudo.
 */

/** Los dos pasos que se registran desde el navegador. Cambiarlos rompe el historial. */
export const PASOS_REGISTRADOS = ["carrito", "checkout"] as const;
export type PasoRegistrado = (typeof PASOS_REGISTRADOS)[number];

export function esPasoRegistrado(valor: unknown): valor is PasoRegistrado {
  return typeof valor === "string" && (PASOS_REGISTRADOS as readonly string[]).includes(valor);
}

export type Escalon = {
  clave: string;
  /** Cómo se llama en la pantalla. En segunda persona, que es la que se lee. */
  titulo: string;
  /** Qué quiere decir exactamente. Sin esto, "checkout" no significa nada. */
  detalle: string;
  cantidad: number;
  /** Sobre el escalón de arriba. `null` en el primero. */
  pctDelAnterior: number | null;
  /** Sobre el primer escalón. `null` en el primero. */
  pctDelTotal: number | null;
  /** Cuántos se cayeron acá respecto del anterior. */
  perdidos: number;
  /**
   * Cuánto se cae normalmente en este escalón, en cualquier tienda.
   *
   * Sin esto, "la peor caída" es siempre la primera: en todas las tiendas del
   * mundo la mayoría de la gente entra, mira y se va. Señalar eso todos los
   * meses es no señalar nada. Lo que interesa es cuánto se despega este escalón
   * de lo que es normal PARA ESE ESCALÓN.
   */
  caidaNormalPct: number;
  /**
   * Qué tanto de lo normal retiene este escalón. 100 = exactamente lo esperable,
   * 50 = retiene la mitad de lo que retendría una tienda cualquiera.
   *
   * Se compara la RETENCIÓN como proporción y no la caída como resta, y esa
   * diferencia importa: pasar de perder el 90% a perder el 99,5% son nueve
   * puntos y medio de resta —parece poco— pero es pasar de que sigan 100 de cada
   * mil a que sigan 5. Cerca del 100% la resta se comprime y esconde justamente
   * los desastres. La proporción no: ahí da 5%, que es lo que realmente pasó.
   */
  retencionVsNormalPct: number | null;
};

export type DatosEmbudo = {
  entro: number;
  carrito: number;
  checkout: number;
  datos: number;
  pedido: number;
  pago: number;
};

export type ResumenEmbudo = {
  escalones: Escalon[];
  /**
   * El escalón donde se cae más gente, y sólo si hay con qué afirmarlo. `null`
   * cuando el embudo está casi vacío: señalar "la peor caída" sobre siete
   * visitas es inventar un problema.
   */
  peorCaida: Escalon | null;
  /** Si faltan los dos pasos nuevos, el embudo tiene agujeros y hay que decirlo. */
  faltanPasosNuevos: boolean;
};

/**
 * Cuánta gente tiene que haber entrado para animarse a señalar dónde se caen.
 *
 * Con veinte visitas, una diferencia de dos personas entre dos escalones ya es
 * el 10% y sale como "acá está tu problema". No lo es: es ruido.
 */
export const MINIMO_PARA_SENALAR = 50;

/**
 * Por debajo de qué retención respecto de lo normal se nombra un escalón.
 *
 * 60 quiere decir "acá pasa menos de dos tercios de la gente que pasaría en
 * cualquier tienda". Más arriba que eso, con estos volúmenes, es ruido.
 */
export const UMBRAL_RETENCION_PCT = 60;

/**
 * Cuánta gente tiene que haberse caído para llamarlo un problema.
 *
 * Con tres que llegaron y dos que siguieron, la caída es del 33% y no es nada.
 */
export const PERDIDOS_MINIMOS = 3;

export function armarEmbudo(d: DatosEmbudo, faltanPasosNuevos: boolean): ResumenEmbudo {
  /**
   * Nadie puede haber hecho un pedido sin escribir sus datos.
   *
   * No es un ajuste para que quede lindo: es un hecho. El checkout no deja pasar
   * sin un email, así que quien compró escribió sus datos, lo haya registrado o
   * no `AbandonedCart` —que es de donde sale este escalón y que sólo se escribe
   * si el rastreador llegó a dispararse antes de que la persona apretara comprar—.
   *
   * Sin esto el recorte de abajo hacía al revés: `datos` quedaba por debajo de
   * los pedidos y le ponía techo a los dos escalones de abajo. Con datos reales
   * salía "Hicieron el pedido: 16" mientras los KPI de la MISMA pantalla decían
   * 30. Dos números que se contradicen a la vista es exactamente lo que hace
   * desconfiar de todo lo demás.
   *
   * Se vio recién al llenar la tienda de prueba: con la base vacía, los seis
   * escalones daban cero y el recorte no tenía de qué agarrarse.
   */
  const datos = Math.max(d.datos, d.pedido);

  // `caidaNormalPct` son valores de referencia de comercio electrónico, no una
  // medición de esta plataforma: sirven para no señalar como problema lo que le
  // pasa a todo el mundo. No hay que leerlos como una meta.
  const crudos: { clave: string; titulo: string; detalle: string; cantidad: number; caidaNormalPct: number }[] = [
    { clave: "entro", titulo: "Entraron a tu tienda", detalle: "Visitas del período, sin contar bots ni las tuyas.", cantidad: d.entro, caidaNormalPct: 0 },
    // La mayoría de la gente entra, mira y se va. Es lo normal en cualquier
    // tienda, y por eso el umbral acá es altísimo: si no, sería la respuesta de
    // todos los meses y el panel no diría nada.
    { clave: "carrito", titulo: "Pusieron algo en el carrito", detalle: "Agregaron por lo menos un producto.", cantidad: d.carrito, caidaNormalPct: 90 },
    { clave: "checkout", titulo: "Abrieron el checkout", detalle: "Llegaron a la pantalla de finalizar la compra.", cantidad: d.checkout, caidaNormalPct: 50 },
    { clave: "datos", titulo: "Escribieron sus datos", detalle: "Dejaron un email válido en el formulario.", cantidad: datos, caidaNormalPct: 35 },
    { clave: "pedido", titulo: "Hicieron el pedido", detalle: "El pedido quedó registrado, esperando el pago o la confirmación.", cantidad: d.pedido, caidaNormalPct: 30 },
    // Acá ya eligieron todo y apretaron comprar. Perder mucha gente en este
    // escalón casi siempre es un problema de cobro, y es el más caro de todos.
    { clave: "pago", titulo: "Pagaron", detalle: "Pedidos confirmados, enviados o entregados.", cantidad: d.pago, caidaNormalPct: 20 },
  ];

  // Un escalón nunca puede mostrar más que el de arriba. No es maquillaje: los
  // seis se cuentan distinto (ver el comentario del encabezado) y en los bordes
  // del período eso da vuelta el orden. Un embudo que se ensancha en el medio no
  // se lee como "acá el conteo es aproximado", se lee como que el panel está
  // roto — y arrastra la desconfianza a todo lo demás de la pantalla.
  //
  // Lo que se recorta es la cantidad que se MUESTRA, no el dato: en la base
  // quedan los números crudos.
  let techo = Infinity;
  const escalones: Escalon[] = [];
  const primero = crudos[0].cantidad;

  for (const c of crudos) {
    const cantidad = Math.min(c.cantidad, techo);
    const anterior = escalones.length > 0 ? escalones[escalones.length - 1].cantidad : null;
    const pctDelAnterior = anterior !== null && anterior > 0 ? Math.round((cantidad / anterior) * 100) : null;
    escalones.push({
      clave: c.clave,
      titulo: c.titulo,
      detalle: c.detalle,
      cantidad,
      pctDelAnterior,
      pctDelTotal: primero > 0 && escalones.length > 0 ? Math.round((cantidad / primero) * 100) : null,
      perdidos: anterior !== null ? anterior - cantidad : 0,
      caidaNormalPct: c.caidaNormalPct,
      retencionVsNormalPct:
        pctDelAnterior === null || c.caidaNormalPct >= 100
          ? null
          : Math.round((pctDelAnterior / (100 - c.caidaNormalPct)) * 100),
    });
    techo = cantidad;
  }

  // La peor caída se mide contra lo NORMAL de cada escalón, no contra los otros
  // escalones. En porcentaje crudo gana siempre el primero —la mayoría entra,
  // mira y se va— y señalarlo todos los meses es no señalar nada. En cabezas
  // gana también el primero, porque es el que tiene el denominador más grande.
  let peorCaida: Escalon | null = null;
  if (primero >= MINIMO_PARA_SENALAR) {
    for (const e of escalones) {
      if (e.retencionVsNormalPct === null || e.retencionVsNormalPct >= UMBRAL_RETENCION_PCT) continue;
      if (e.perdidos < PERDIDOS_MINIMOS) continue;
      if (peorCaida === null || e.retencionVsNormalPct < (peorCaida.retencionVsNormalPct ?? 100)) {
        peorCaida = e;
      }
    }
  }

  return { escalones, peorCaida, faltanPasosNuevos };
}
