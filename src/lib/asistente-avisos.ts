/**
 * Los avisos que Sasha manda sola, una vez por día.
 *
 * Reglas puras: entra el estado de la tienda, sale una lista de mensajes ya
 * escritos. Sin IA y sin tocar la base, por los mismos dos motivos que el resumen
 * de Métricas — no puede inventar un dato porque no calcula ninguno, y un texto
 * que afirma cosas tiene que ser testeable.
 *
 * Lo que hace difícil esto no es escribir los mensajes: es decidir cuáles NO
 * mandar. Un globito con un contador se mira las primeras tres veces; si de esas
 * tres una no servía, deja de mirarse para siempre. Por eso hay tope diario, un
 * orden por urgencia, y una clave por aviso para no repetir todas las mañanas
 * algo que el dueño ya sabe.
 */

import type { StoreSnapshot } from "./asistente-insights";
import type { FechaComercial } from "./fechas-comerciales";

/* ── Tipos ────────────────────────────────────────────────────────────────── */

export type Aviso = {
  /**
   * Qué clase de aviso es. Se guarda en la base para no repetirlo: si el stock
   * sigue bajo mañana, ya lo dijo hoy.
   */
  clave: string;
  texto: string;
  /** Mayor = más urgente. Ordena, y decide quién entra en el tope diario. */
  prioridad: number;
  /** A dónde lleva. El chat lo muestra como un link al final del mensaje. */
  link?: string;
  /**
   * Cada cuántos días puede repetirse si la situación sigue igual.
   *
   * Un aviso de algo que se resuelve rápido (pedidos sin confirmar) puede volver
   * pronto. Uno de algo que lleva tiempo arreglar (ventas flojas) no: repetirlo
   * cada día no informa nada nuevo y sólo hace ruido.
   */
  repetirCadaDias: number;
};

export type DatosAvisos = {
  snapshot: StoreSnapshot;
  fechasProximas: FechaComercial[];
};

/**
 * Cuántos avisos como mucho por día.
 *
 * Tres es el techo a propósito. Con más, el contador deja de ser "algo pasó" y
 * pasa a ser una bandeja de entrada, que es justo lo que nadie quiere abrir.
 */
export const MAX_AVISOS_POR_DIA = 3;

/* ── Formato ──────────────────────────────────────────────────────────────── */

const plural = (n: number, uno: string, varios: string) =>
  `${n.toLocaleString("es-AR")} ${n === 1 ? uno : varios}`;

const plata = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/* ── Las reglas ───────────────────────────────────────────────────────────── */

export function armarAvisos({ snapshot, fechasProximas }: DatosAvisos): Aviso[] {
  const avisos: Aviso[] = [];

  // ── Se agotó justo lo que más vendías ──
  // Lo primero de todo, y es el único aviso de stock que da un dato nuevo: la
  // campanita avisa que se agotó algo, no que se agotó lo que más salía.
  if (snapshot.agotadoQueMasVendias) {
    avisos.push({
      clave: "agotado-el-que-mas-vendias",
      texto: `"${snapshot.agotadoQueMasVendias}" está agotado, y es uno de los que más vendiste este mes. Cada día que pasa son ventas que se van a otro lado.`,
      prioridad: 100,
      link: "/dashboard/productos",
      repetirCadaDias: 3,
    });
  }

  // ── Agotado y sin reponer hace días ──
  // NO es "se agotó algo": eso ya salió por campanita y por email el día que pasó.
  // Esto es que pasaron días y sigue igual, que es lo que la campanita no mira.
  // Y no se manda si ya se nombró el de arriba: sería el mismo tema dos veces.
  if (snapshot.agotadosHaceDias > 0 && !snapshot.agotadoQueMasVendias) {
    avisos.push({
      clave: "agotado-estancado",
      texto: `${plural(snapshot.agotadosHaceDias, "producto sigue agotado", "productos siguen agotados")} hace varios días. Mientras estén así no los puede comprar nadie.`,
      prioridad: 80,
      link: "/dashboard/productos",
      repetirCadaDias: 4,
    });
  }

  // ── Pedidos que se quedaron sin confirmar ──
  // La campanita ya avisó en el momento en que entró cada uno, y hasta te sonó el
  // celular. Acá se nombra sólo lo que quedó trabado: la plata ya está esperando
  // y falta que alguien apriete un botón.
  if (snapshot.pedidosEstancados > 0) {
    avisos.push({
      clave: "pedidos-estancados",
      texto: `${plural(snapshot.pedidosEstancados, "pedido lleva", "pedidos llevan")} más de un día sin que los confirmes${snapshot.montoPedidosEstancados > 0 ? `, por ${plata(snapshot.montoPedidosEstancados)}` : ""}.`,
      prioridad: 90,
      link: "/dashboard/pedidos",
      // Dos días: se resuelve apretando un botón, así que si sigue igual vale
      // volver a decirlo pronto.
      repetirCadaDias: 2,
    });
  }

  // ── Cobrado y sin despachar ──
  // Esto no lo avisa nadie hoy, y es el que más caro sale: la persona ya pagó y
  // está esperando. Es de donde salen los reclamos.
  if (snapshot.confirmadosSinDespachar > 0) {
    avisos.push({
      clave: "sin-despachar",
      texto: `${plural(snapshot.confirmadosSinDespachar, "pedido ya está pago", "pedidos ya están pagos")} y sin marcar como enviados hace más de 5 días. Esa gente está esperando.`,
      prioridad: 95,
      link: "/dashboard/pedidos",
      repetirCadaDias: 2,
    });
  }

  // ── Hace mucho que no entra una venta ──
  // Antes que "las ventas bajaron": si hace dos semanas que no vende nada, el
  // porcentaje del mes es lo de menos.
  if (snapshot.diasDesdeUltimaVenta !== null && snapshot.diasDesdeUltimaVenta >= 7) {
    avisos.push({
      clave: "sin-ventas",
      texto: `Hace ${plural(snapshot.diasDesdeUltimaVenta, "día", "días")} que no entra una venta. ¿Movemos algo?`,
      prioridad: 85,
      repetirCadaDias: 7,
    });
  }

  // ── Carritos abandonados ──
  if (snapshot.carritosAbandonadosPendientes > 0) {
    avisos.push({
      clave: "carritos-abandonados",
      texto: `${plural(snapshot.carritosAbandonadosPendientes, "persona dejó", "personas dejaron")} el carrito lleno sin comprar. Son los más fáciles de recuperar: ya eligieron.`,
      prioridad: 70,
      link: "/dashboard/carritos",
      repetirCadaDias: 4,
    });
  }

  // ── Las ventas vienen para abajo ──
  // Sólo si HAY con qué comparar: `tendenciaVentas` ya distingue "bajando" de
  // "sin_datos", que es el caso de la tienda que todavía no vendió nunca y a la
  // que no hay que darle una mala noticia inventada.
  if (snapshot.tendenciaVentas === "bajando") {
    avisos.push({
      clave: "ventas-bajando",
      texto: `Los últimos 30 días cerraron ${plata(snapshot.ventasUltimos30Dias)} contra ${plata(snapshot.ventasPrevios30Dias)} de los 30 anteriores. Abrí Métricas y fijate si fue la gente que entró o el precio promedio.`,
      prioridad: 60,
      link: "/dashboard/metricas",
      // Una semana: la tendencia de 30 días no cambia de un día para el otro, así
      // que repetirlo antes es decir exactamente lo mismo dos veces.
      repetirCadaDias: 7,
    });
  }

  // ── Stock bajo: NO va ──
  // La campanita ya avisa variante por variante cuando una cruza su umbral, en el
  // momento. Un "5 productos están por quedarse sin stock" a la mañana no agrega
  // nada: es la misma información, agrupada y más tarde. Queda escrito acá para
  // que no se agregue de nuevo por parecer una idea obvia.

  // ── Una fecha comercial que viene ──
  // Lo único de la lista que no es un problema sino una oportunidad, y por eso va
  // último: nunca tiene que tapar algo que está costando plata hoy.
  const fecha = fechasProximas[0];
  if (fecha) {
    avisos.push({
      clave: `fecha-${fecha.nombre.toLowerCase().replace(/\s+/g, "-")}`,
      texto: fecha.enCurso
        ? `${fecha.nombre} está pasando ahora${fecha.diasRestantes !== null ? ` — quedan ${plural(fecha.diasRestantes, "día", "días")}` : ""}. ${fecha.sugerencia}`
        : `${fecha.nombre} es en ${plural(fecha.diasFaltan, "día", "días")}. ${fecha.sugerencia}`,
      prioridad: 30,
      link: "/dashboard/promociones",
      // Se repite poco: la fecha no se mueve, y avisar dos veces de lo mismo en
      // la misma semana es exactamente el ruido que hace que dejen de mirarlo.
      repetirCadaDias: 5,
    });
  }

  // Ordenados por urgencia y SIN cortar en el tope. El tope lo aplica
  // `filtrarRepetidos`, después de descartar los que ya se dijeron.
  //
  // Cortar acá era un bug silencioso: si los tres más urgentes ya se habían
  // mandado ayer, quedaban los tres afuera por repetidos y el dueño no recibía
  // NADA — aunque el cuarto y el quinto nunca se hubieran mandado. El tope se
  // comía los lugares con avisos que después se descartaban.
  return avisos.sort((a, b) => b.prioridad - a.prioridad);
}

/**
 * Descarta los que ya se mandaron hace poco y devuelve, como mucho,
 * `MAX_AVISOS_POR_DIA`.
 *
 * El orden importa y es el punto de esta función: primero se descarta lo repetido
 * y DESPUÉS se corta en el tope. Al revés, un aviso ya mandado ocupaba uno de los
 * tres lugares y se lo sacaba a otro que sí valía la pena.
 *
 * `mandadosRecientes` es lo que ya está en la base: la clave y hace cuántos días
 * salió. Va aparte de `armarAvisos` para que las reglas se puedan testear sin
 * inventar un historial, y porque son dos decisiones distintas — qué vale la pena
 * decir, y qué ya se dijo.
 */
export function filtrarRepetidos(
  avisos: Aviso[],
  mandadosRecientes: { clave: string; diasAtras: number }[]
): Aviso[] {
  const ultimaVez = new Map<string, number>();
  for (const m of mandadosRecientes) {
    const previo = ultimaVez.get(m.clave);
    if (previo === undefined || m.diasAtras < previo) ultimaVez.set(m.clave, m.diasAtras);
  }

  return avisos
    .filter((aviso) => {
      const diasDesdeElUltimo = ultimaVez.get(aviso.clave);
      if (diasDesdeElUltimo === undefined) return true;
      return diasDesdeElUltimo >= aviso.repetirCadaDias;
    })
    .slice(0, MAX_AVISOS_POR_DIA);
}
