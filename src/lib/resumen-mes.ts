/**
 * El resumen en texto del período de Métricas.
 *
 * Reglas puras, sin IA y sin acceso a la base: entra un objeto con los números
 * ya calculados y sale el texto. Dos motivos.
 *
 * El primero es que el resumen no puede tener números propios. Si acá se
 * recalculara algo —aunque sea el ticket promedio— alcanzaría con que mañana
 * alguien ajuste una regla en la pantalla para que el texto diga una cosa y las
 * tarjetas de arriba digan otra, sin ninguna forma de saber cuál miente.
 *
 * El segundo es que un resumen que afirma cosas tiene que ser testeable. Está
 * `resumen-mes.check.ts` al lado, con los casos que se equivocan en silencio:
 * el mes que sube en plata pero baja en clientes, el período anterior en cero,
 * la tienda que todavía no vendió nada.
 */

/* ── Tipos ────────────────────────────────────────────────────────────────── */

export type Tono = "bien" | "mal" | "atencion" | "neutro";

export type PeriodoResumen = {
  ingresos: number;
  /** Sólo los confirmados: son los mismos que generan `ingresos`. */
  pedidosConfirmados: number;
  visitas: number;
};

/**
 * Las cosas que quedaron pendientes o mal cargadas. Cada una viene con la plata
 * que hay en juego porque la lista se ordena por eso: primero lo que más cuesta,
 * no lo que es más fácil de calcular.
 */
export type Senales = {
  carritosSinContactar?: { cantidad: number; monto: number };
  pedidosPendientes?: { cantidad: number; monto: number };
  confirmadosSinDespachar?: { cantidad: number; dias: number; monto: number };
  cuponesVencidos?: number;
  productosSinCosto?: number;
  /** Envíos regalados en el período. Es plata que salió igual. */
  enviosBonificados?: number;
};

export type DatosResumen = {
  dias: number;
  actual: PeriodoResumen;
  previo: PeriodoResumen;
  senales?: Senales;
  /**
   * Cuánto puede estar corrido el porcentaje de visitas, en puntos, por cómo
   * están guardadas.
   *
   * Los pedidos tienen hora exacta, así que el período anterior se puede cortar
   * en el mismo momento del día y la comparación es exacta. Las visitas se
   * guardan por día entero (`StoreView`: fecha + cantidad), así que el día de hoy
   * entra a medias contra un día completo del período anterior. Este número es
   * cuánto puede valer ese pedazo de día que falta.
   *
   * Abajo de eso, un movimiento en las visitas no se distingue del artefacto y
   * el resumen no lo menciona. Preferimos callar antes que afirmar algo que la
   * forma de guardar el dato no aguanta.
   */
  incertidumbreVisitasPct?: number;
};

export type Pendiente = {
  texto: string;
  /** Plata en juego, en pesos. Sólo ordena la lista; no se muestra sola. */
  plata: number;
  href?: string;
};

export type ResumenMes = {
  titular: string;
  tono: Tono;
  /** El "por qué": qué de los tres factores movió la aguja. Vacío si no alcanza. */
  parrafos: string[];
  pendientes: Pendiente[];
};

/* ── Formato ──────────────────────────────────────────────────────────────── */

const plata = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

const pct = (n: number) => `${Math.round(Math.abs(n))}%`;

/** "1 pedido" / "3 pedidos" — sin el "(s)" que queda de sistema viejo. */
const plural = (n: number, uno: string, varios: string) =>
  `${n.toLocaleString("es-AR")} ${n === 1 ? uno : varios}`;

/* ── Umbrales ─────────────────────────────────────────────────────────────── */

/**
 * Un movimiento de menos del 5% no es una noticia, es ruido: con pocos pedidos
 * un solo cliente mueve más que eso. Abajo de este umbral el período se declara
 * parejo en vez de inventarle una tendencia.
 */
export const RUIDO_PCT = 5;

/**
 * Debajo de esta cantidad de ventas no se explica el "por qué". Con dos o tres
 * pedidos, atribuir el mes a la conversión o al ticket es adivinar: un solo
 * cliente que compró de más mueve todos los porcentajes.
 */
const MINIMO_PARA_EXPLICAR = 5;

/* ── El titular ───────────────────────────────────────────────────────────── */

function armarTitular(dias: number, actual: PeriodoResumen, previo: PeriodoResumen): { titular: string; tono: Tono } {
  const periodo = dias === 7 ? "La semana" : dias === 30 ? "El mes" : `Los ${dias} días`;

  // Todavía sin ventas: no hay nada que comparar y no hay que disfrazarlo de
  // mala noticia. Que no haya vendido en 7 días recién arrancando es normal.
  if (actual.ingresos === 0 && previo.ingresos === 0) {
    return actual.visitas > 0
      ? {
          titular: `${periodo} cerró sin ventas, con ${plural(actual.visitas, "visita", "visitas")}.`,
          tono: "neutro",
        }
      : { titular: `${periodo} cerró sin ventas ni visitas.`, tono: "neutro" };
  }

  // Sin período anterior no hay porcentaje posible: dividir por cero da infinito
  // y "subiste ∞%" no es información. Se informa el número solo.
  if (previo.ingresos === 0) {
    return {
      titular: `${periodo} cerró con ${plata(actual.ingresos)} en ${plural(actual.pedidosConfirmados, "venta", "ventas")} — es la primera vez que hay con qué comparar.`,
      tono: "bien",
    };
  }

  if (actual.ingresos === 0) {
    return {
      titular: `${periodo} cerró sin ventas. En el período anterior habías facturado ${plata(previo.ingresos)}.`,
      tono: "mal",
    };
  }

  const cambio = ((actual.ingresos - previo.ingresos) / previo.ingresos) * 100;

  if (Math.abs(cambio) < RUIDO_PCT) {
    return {
      titular: `${periodo} cerró parejo: ${plata(actual.ingresos)} contra ${plata(previo.ingresos)} del período anterior.`,
      tono: "neutro",
    };
  }

  const direccion = cambio > 0 ? "arriba" : "abajo";
  return {
    titular: `${periodo} cerró ${pct(cambio)} ${direccion} — ${plata(actual.ingresos)} contra ${plata(previo.ingresos)}.`,
    tono: cambio > 0 ? "bien" : "mal",
  };
}

/* ── El porqué ────────────────────────────────────────────────────────────── */

/**
 * Los ingresos son siempre, exactamente:
 *
 *     ingresos = visitas × conversión × ticket promedio
 *
 * (conversión = ventas confirmadas ÷ visitas, ticket = ingresos ÷ ventas
 * confirmadas: los factores se cancelan y la igualdad es exacta, no aproximada).
 *
 * Eso permite decir cuál de los tres movió la aguja, que es la única parte del
 * resumen que le sirve a alguien para decidir qué hacer:
 *
 *   - visitas    → funcionó (o faltó) difusión
 *   - conversión → funcionó (o falla) la tienda
 *   - ticket     → vendiste más caro, o más cosas por pedido
 *
 * "Vendiste 18% más" no le dice a nadie qué hacer. "Le vendiste a la misma
 * gente pero más caro" sí.
 *
 * El factor que más pesó se elige por el logaritmo de la razón y no por la
 * diferencia de porcentajes: los tres se multiplican entre sí, y en una
 * multiplicación caer a la mitad (−50%) pesa lo mismo que duplicar (+100%).
 * Comparando porcentajes crudos, el que sube siempre parecería el más grande.
 */
function armarExplicacion(
  actual: PeriodoResumen,
  previo: PeriodoResumen,
  incertidumbreVisitasPct: number
): string[] {
  // Cualquier factor en cero rompe la descomposición (log de cero, división por
  // cero). Sin los tres de los dos períodos no se explica nada y se calla.
  const completo =
    actual.visitas > 0 && previo.visitas > 0 &&
    actual.pedidosConfirmados > 0 && previo.pedidosConfirmados > 0 &&
    actual.ingresos > 0 && previo.ingresos > 0;
  if (!completo) return [];
  if (actual.pedidosConfirmados < MINIMO_PARA_EXPLICAR) return [];

  const convActual = actual.pedidosConfirmados / actual.visitas;
  const convPrevio = previo.pedidosConfirmados / previo.visitas;
  const ticketActual = actual.ingresos / actual.pedidosConfirmados;
  const ticketPrevio = previo.ingresos / previo.pedidosConfirmados;

  const factores = [
    { nombre: "visitas", razon: actual.visitas / previo.visitas },
    { nombre: "conversion", razon: convActual / convPrevio },
    { nombre: "ticket", razon: ticketActual / ticketPrevio },
  ];
  const dominante = factores.reduce((a, b) => (Math.abs(Math.log(b.razon)) > Math.abs(Math.log(a.razon)) ? b : a));

  // Las visitas y la conversión salen del mismo dato guardado por día entero, así
  // que si el movimiento de visitas cabe adentro del margen, no se puede afirmar
  // que la causa fue una u otra: se calla en vez de elegir a la suerte.
  const visitasDudosas =
    Math.abs((actual.visitas / previo.visitas - 1) * 100) < incertidumbreVisitasPct;
  if (visitasDudosas && (dominante.nombre === "visitas" || dominante.nombre === "conversion")) {
    return [];
  }

  // Si el que más pesó igual se movió poco, los tres quedaron quietos: el mes se
  // parece al anterior y no hay ninguna causa que señalar.
  const cambioDominante = (dominante.razon - 1) * 100;
  if (Math.abs(cambioDominante) < RUIDO_PCT) return [];

  const subio = cambioDominante > 0;
  const visitasPct = (actual.visitas / previo.visitas - 1) * 100;
  const convPct = (convActual / convPrevio - 1) * 100;
  const ticketPct = (ticketActual / ticketPrevio - 1) * 100;

  const parrafos: string[] = [];

  if (dominante.nombre === "visitas") {
    parrafos.push(
      subio
        ? `Lo que más pesó fue la cantidad de gente: las visitas subieron ${pct(visitasPct)}. La tienda convierte parecido que antes, entró más gente.`
        : `Lo que más pesó fue la cantidad de gente: las visitas cayeron ${pct(visitasPct)}. La tienda no empeoró — entró menos gente a verla.`
    );
  } else if (dominante.nombre === "conversion") {
    // "terminan en venta confirmada", no "conversión" a secas. La tarjeta de
    // Conversión de arriba cuenta TODOS los pedidos —un pendiente ya es una
    // conversión— y ésta cuenta sólo los confirmados, porque son los que generan
    // la plata que se está descomponiendo. Son dos números distintos y legítimos;
    // lo que no puede pasar es que se llamen igual y no coincidan.
    const de100 = (n: number) => (n * 100).toFixed(1);
    parrafos.push(
      subio
        ? `Lo que más pesó fue la tienda misma: de cada 100 visitas ahora ${de100(convActual)} terminan en venta confirmada, contra ${de100(convPrevio)} antes. Con la misma gente estás vendiendo más.`
        : `Lo que más pesó fue la tienda misma: de cada 100 visitas ahora ${de100(convActual)} terminan en venta confirmada, contra ${de100(convPrevio)} antes. Entra gente parecida, pero se va sin comprar.`
    );
  } else {
    parrafos.push(
      subio
        ? `Lo que más pesó fue cuánto gasta cada uno: el ticket promedio pasó de ${plata(ticketPrevio)} a ${plata(ticketActual)}. No le vendiste a más gente, le vendiste más caro.`
        : `Lo que más pesó fue cuánto gasta cada uno: el ticket promedio bajó de ${plata(ticketPrevio)} a ${plata(ticketActual)}. Viene la misma gente, pero se lleva menos por compra.`
    );
  }

  // El caso que se lee mal si no se aclara: un factor tapando a otro. Sube la
  // plata pero baja la gente, o al revés. Sin esta línea el resumen felicita por
  // un mes que en realidad perdió clientes.
  const movimientos: { nombre: string; pct: number }[] = [
    { nombre: "visitas", pct: visitasPct },
    { nombre: "conversion", pct: convPct },
    { nombre: "ticket", pct: ticketPct },
  ];
  const enContra = movimientos.filter(
    (s) =>
      s.nombre !== dominante.nombre &&
      Math.abs(s.pct) >= RUIDO_PCT &&
      (s.pct > 0) !== subio &&
      // Mismo motivo que arriba: visitas y conversión comparten el dato guardado
      // por día entero. Si el movimiento cabe en el margen, no se nombra.
      !(visitasDudosas && (s.nombre === "visitas" || s.nombre === "conversion"))
  );
  if (enContra.length > 0) {
    // El verbo va con el sujeto: "las visitas bajaron", "la conversión bajó".
    // Con un `subió/bajó` fijo salía "las visitas bajó", que es lo primero que se
    // le nota a un texto automático.
    const sujetos: Record<string, { nombre: string; subio: string; bajo: string }> = {
      visitas: { nombre: "las visitas", subio: "subieron", bajo: "bajaron" },
      conversion: { nombre: "la conversión", subio: "subió", bajo: "bajó" },
      ticket: { nombre: "el ticket promedio", subio: "subió", bajo: "bajó" },
    };
    const lista = enContra.map((s) => {
      const sujeto = sujetos[s.nombre];
      return `${sujeto.nombre} ${s.pct > 0 ? sujeto.subio : sujeto.bajo} ${pct(s.pct)}`;
    });
    const texto = lista.length === 1 ? lista[0] : `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
    parrafos.push(
      subio
        ? `Ojo con festejarlo entero: en el mismo período ${texto}. El total subió igual, pero eso no se sostiene solo.`
        : `No fue todo malo: en el mismo período ${texto}.`
    );
  }

  return parrafos;
}

/* ── Lo que quedó pendiente ───────────────────────────────────────────────── */

function armarPendientes(senales: Senales): Pendiente[] {
  const lista: Pendiente[] = [];

  const carritos = senales.carritosSinContactar;
  if (carritos && carritos.cantidad > 0) {
    lista.push({
      texto: `${plural(carritos.cantidad, "carrito quedó", "carritos quedaron")} sin que nadie escriba, por ${plata(carritos.monto)}.`,
      plata: carritos.monto,
      href: "/dashboard/carritos",
    });
  }

  const pendientes = senales.pedidosPendientes;
  if (pendientes && pendientes.cantidad > 0) {
    lista.push({
      texto: `${plural(pendientes.cantidad, "pedido está", "pedidos están")} esperando que los confirmes, por ${plata(pendientes.monto)}.`,
      plata: pendientes.monto,
      href: "/dashboard/pedidos",
    });
  }

  const sinDespachar = senales.confirmadosSinDespachar;
  if (sinDespachar && sinDespachar.cantidad > 0) {
    lista.push({
      texto: `${plural(sinDespachar.cantidad, "pedido confirmado lleva", "pedidos confirmados llevan")} más de ${plural(sinDespachar.dias, "día", "días")} sin marcarse como enviado.`,
      plata: sinDespachar.monto,
      href: "/dashboard/pedidos",
    });
  }

  const envios = senales.enviosBonificados ?? 0;
  if (envios > 0) {
    lista.push({
      texto: `Regalaste ${plata(envios)} en envíos. Es plata que saliste a pagar igual: entra en la cuenta del período.`,
      plata: envios,
    });
  }

  // Las dos de abajo no tienen plata asociada, pero sí la ensucian: sin costos
  // cargados la rentabilidad miente por defecto. Van al final con plata 0 para
  // que nunca le ganen a algo que sí es dinero concreto.
  const sinCosto = senales.productosSinCosto ?? 0;
  if (sinCosto > 0) {
    lista.push({
      texto: `${plural(sinCosto, "producto vendido no tiene", "productos vendidos no tienen")} el costo cargado — hasta que lo cargues, la ganancia que ves es menor que la real.`,
      plata: 0,
      href: "/dashboard/productos",
    });
  }

  const vencidos = senales.cuponesVencidos ?? 0;
  if (vencidos > 0) {
    lista.push({
      texto: vencidos === 1
        ? `1 cupón usado en este período está vencido. Si no lo vas a renovar, conviene borrarlo.`
        : `${vencidos} cupones usados en este período están vencidos. Si no los vas a renovar, conviene borrarlos.`,
      plata: 0,
      href: "/dashboard/cupones",
    });
  }

  return lista.sort((a, b) => b.plata - a.plata);
}

/* ── La entrada ───────────────────────────────────────────────────────────── */

export function armarResumen(datos: DatosResumen): ResumenMes {
  const { titular, tono } = armarTitular(datos.dias, datos.actual, datos.previo);
  return {
    titular,
    tono,
    parrafos: armarExplicacion(datos.actual, datos.previo, datos.incertidumbreVisitasPct ?? 0),
    pendientes: armarPendientes(datos.senales ?? {}),
  };
}
