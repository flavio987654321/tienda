import { NOMBRE_ORIGEN } from "@/lib/origen-visita";
import type { Estadisticas } from "@/lib/estadisticas-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   EL CONSEJO DE CADA BLOQUE DE ESTADÍSTICAS
   ══════════════════════════════════════════════════════════════════════════

   Una cuenta nueva abre Estadísticas y ve ocho tarjetas en cero. Cada una
   dice "todavía no hay nada" y nada más: parece una pantalla rota, y no le
   enseña a la persona para qué sirve ese número ni qué hacer con él.

   Acá cada bloque tiene UN consejo, elegido mirando los datos:

     · Sin datos, explica para qué sirve el bloque y cómo hacer que se mueva.
     · Con datos, dice lo que los números piden: "tres compras sin bajar,
       escribiles", "la mayoría paga los martes a la noche, publicá antes".
     · Si no hay nada que pedir, un consejo general que sigue siendo cierto.

   Son textos, no reglas del negocio: se pueden cambiar sin tocar la cuenta.
   Los umbrales están arriba de cada uno y valen para lo que se sabe de
   vender un archivo por Mercado Pago en Argentina; ninguno afirma un
   porcentaje "normal" que no se pueda defender.

   Es puro: recibe la cuenta ya hecha y devuelve texto. Probado en
   `consejos-estadisticas.check.ts`. */

export type Consejo = {
  texto: string;
  /** Un enlace a donde se hace lo que el consejo pide, si hay uno. */
  accion?: { texto: string; href: string };
};

export type BloqueConConsejo =
  | "visitas" | "ventas" | "posventa" | "cuando" | "embudo" | "porProducto" | "carritos"
  | "origenes" | "campanias";

const DIAS_PLURAL = ["los domingos", "los lunes", "los martes", "los miércoles", "los jueves", "los viernes", "los sábados"];

const entero = (n: number) => new Intl.NumberFormat("es-AR").format(n);
const pocas = (n: number, una: string, varias: string) => `${entero(n)} ${n === 1 ? una : varias}`;

/** El índice del mayor, el primero si empatan. `-1` si todo es cero. */
function elMayor(valores: number[]): number {
  let mejor = -1;
  let tope = 0;
  valores.forEach((v, i) => { if (v > tope) { tope = v; mejor = i; } });
  return mejor;
}

/** Con menos ventas que esto, "cuándo se vende" es azar y se dice. */
const VENTAS_PARA_UN_PATRON = 5;
/** Con menos visitas que esto, los porcentajes del embudo no dicen nada. */
const VISITAS_PARA_LEER_EL_EMBUDO = 30;
/** Abrieron el pago menos de este % de los que entraron: la página no convence. */
const POCOS_ABREN_EL_PAGO = 5;
/** Pagaron menos de este % de los que abrieron el pago: se frenan al pagar. */
const POCOS_TERMINAN_DE_PAGAR = 40;
/** Cuántos tienen que haber abierto el pago para hablar de eso. */
const CHECKOUTS_PARA_OPINAR = 5;
/** Se devolvió al menos este % de las compras: la página promete de más. */
const MUCHAS_DEVOLUCIONES = 10;
/** Desde este % de visitas móviles se manda a revisar la página en el celular. */
const CASI_TODO_CELULAR = 70;
/** Un canal necesita estas visitas para que su conversión se compare. */
const VISITAS_PARA_COMPARAR_CANALES = 20;
/** Una campaña con estas visitas y cero ventas es la primera para apagar. */
const VISITAS_PARA_APAGAR_UNA_CAMPANIA = 50;
/** Con estos recordatorios mandados, el % de recuperados ya se puede leer. */
const RECORDATORIOS_PARA_OPINAR = 10;
const POCOS_RECUPERADOS = 10;

export function consejoPara(bloque: BloqueConConsejo, d: Estadisticas): Consejo {
  switch (bloque) {
    case "visitas": return visitas(d);
    case "ventas": return ventas(d);
    case "posventa": return posventa(d);
    case "cuando": return cuando(d);
    case "embudo": return embudo(d);
    case "porProducto": return porProducto(d);
    case "carritos": return carritos(d);
    case "origenes": return origenes(d);
    case "campanias": return campanias(d);
  }
}

function visitas(d: Estadisticas): Consejo {
  if (d.kpis.visitas === 0) {
    return { texto: "Se cuenta una visita por persona y por día, y las tuyas no cuentan mientras tenés la sesión abierta. Para que empiece a moverse, poné el link de la página en la biografía de Instagram y en el estado de WhatsApp: son los dos lugares desde donde más entra gente." };
  }
  const pctMovil = d.dispositivos.pctMovil;
  if (pctMovil !== null && pctMovil >= CASI_TODO_CELULAR) {
    const cuantos = pctMovil >= 95 ? "Casi todos" : `${Math.round(pctMovil / 10)} de cada 10`;
    return { texto: `${cuantos} entran desde el celular. Abrí tu página desde el tuyo: el título, el precio y el botón de comprar tienen que verse sin bajar.` };
  }
  return { texto: "Un día con muchas visitas y ninguna venta fue algo que trajo curiosos y no compradores: mirá qué publicaste ese día. Las visitas se guardan dos años, así que desde «Todo» se compara con el año pasado." };
}

function ventas(d: Estadisticas): Consejo {
  if (d.kpis.ventas === 0 && d.kpis.devueltas === 0) {
    return { texto: "La primera venta casi siempre es de alguien que ya te conoce. Mandale el link directo a quien ya te preguntó por el tema, antes de publicarlo para todos." };
  }
  const tasa = d.posventa.devoluciones.tasa;
  if (tasa !== null && tasa >= MUCHAS_DEVOLUCIONES) {
    return { texto: `Se devolvió el ${entero(Math.round(tasa))} % de las compras. Suele pasar cuando la página promete más de lo que el archivo trae: revisá que el título y la lista de qué se llevan digan exactamente lo que hay.` };
  }
  return { texto: "Los días en cero no son un problema si vienen de a uno; una semana entera en cero es la señal de volver a publicar. Cada venta que ves acá ya está en Tus ventas con el correo de quien compró." };
}

function posventa(d: Estadisticas): Consejo {
  const p = d.posventa;
  const aVentas = { texto: "Ir a Tus ventas", href: "/digitales/ventas" };
  if (p.descargas.conPermiso === 0) {
    return {
      texto: "Acá se ve si el que pagó llegó a bajar el archivo. Una compra sin bajar es un reclamo que todavía no llegó —el mail fue a spam, el enlace venció—, y desde Tus ventas se reenvía con un botón.",
      accion: aVentas,
    };
  }
  if (p.mails.fallados > 0) {
    return {
      texto: `${pocas(p.mails.fallados, "mail de entrega falló", "mails de entrega fallaron")}: esa gente pagó y no recibió nada. Buscá esas ventas y reenviales el mail, o escribiles vos con el enlace.`,
      accion: aVentas,
    };
  }
  if (p.descargas.sinBajar > 0) {
    return {
      texto: `${pocas(p.descargas.sinBajar, "compra cobrada sigue", "compras cobradas siguen")} sin bajar el archivo. Escribiles antes de que reclamen: en Tus ventas cada una tiene el botón de reenviar el mail.`,
      accion: aVentas,
    };
  }
  if (p.devoluciones.contracargo > 0) {
    return { texto: `${pocas(p.devoluciones.contracargo, "contracargo", "contracargos")}: el banco devolvió la plata por reclamo de quien compró. Mercado Pago pide pruebas de entrega, y el mail enviado y la descarga hecha son esas pruebas: están en el detalle de cada venta.` };
  }
  if (p.compradores.repiten > 0) {
    return { texto: `${pocas(p.compradores.repiten, "persona te compró", "personas te compraron")} más de una vez. Es la lista a la que le mandás el próximo producto primero, antes que a nadie.` };
  }
  if (p.upsell.ventas === 0) {
    return { texto: "Ninguna compra llevó un upsell. Funciona cuando cuesta menos de la mitad del principal y sigue lo que la persona acaba de comprar; si todavía no tenés uno, es la forma más barata de subir el ticket." };
  }
  return { texto: "Todos bajaron su archivo. Lo que sigue es pedirle una reseña a quien compró: es lo que convence al próximo." };
}

function cuando(d: Estadisticas): Consejo {
  const total = d.cuando.porDiaSemana.reduce((s, n) => s + n, 0);
  if (total === 0) {
    return { texto: "Con las primeras ventas se ve qué día y a qué hora paga la gente. Sirve para publicar la historia o prender el anuncio un rato antes de ese momento, no después." };
  }
  if (total < VENTAS_PARA_UN_PATRON) {
    return { texto: "Todavía son pocas ventas para sacar una regla. Con veinte o treinta, el día y la hora en que paga la gente aparecen solos." };
  }
  const dia = elMayor(d.cuando.porDiaSemana);
  const hora = elMayor(d.cuando.porHora);
  return { texto: `La mayoría paga ${DIAS_PLURAL[dia]}, cerca de las ${hora} h. Publicá o prendé el anuncio un par de horas antes: la compra llega un rato después de ver el posteo.` };
}

function embudo(d: Estadisticas): Consejo {
  const e = d.embudo;
  if (e.visitas === 0) {
    return { texto: "Cuando entre gente, acá se ve dónde se cae. Si muchos entran y pocos abren el pago, el problema está en la página: el título, el precio, qué se llevan. Si abren el pago y no pagan, está en el momento de pagar: dudas, desconfianza." };
  }
  if (e.visitas < VISITAS_PARA_LEER_EL_EMBUDO) {
    return { texto: "Todavía entró poca gente para sacar conclusiones: con cien visitas los porcentajes empiezan a decir algo. Mientras tanto, cada visita que llega al pago y no paga está en Carritos con su correo." };
  }
  if (e.pctCheckout !== null && e.pctCheckout < POCOS_ABREN_EL_PAGO) {
    return { texto: `De cada 100 que entran, ${entero(Math.round(e.pctCheckout))} abren el pago. La página no está convenciendo: probá un título que diga el resultado y no el tema, y mostrá qué se llevan exactamente.` };
  }
  if (e.pctVenta !== null && e.checkouts >= CHECKOUTS_PARA_OPINAR && e.pctVenta < POCOS_TERMINAN_DE_PAGAR) {
    return { texto: `Abren el pago y no pagan: sólo ${entero(Math.round(e.pctVenta))} de cada 100 terminan. Suele ser desconfianza en el momento de pagar. Ayuda decir en la página que el archivo llega al instante al correo y que hay devolución.` };
  }
  if (e.ventas === 0) {
    return { texto: `${entero(e.checkouts)} ${e.checkouts === 1 ? "abrió" : "abrieron"} el pago y todavía nadie terminó. Con pocos casos puede ser azar; si sigue así, mirá el momento de pagar: que el precio final no sorprenda y que se vea que el archivo llega al instante.` };
  }
  return { texto: "El embudo está sano: la mayoría de los que abren el pago, pagan. Para vender más hace falta traer más gente, no tocar la página." };
}

function porProducto(d: Estadisticas): Consejo {
  const filas = d.porProducto;
  const masVende = filas[0];
  const mejorConvierte = [...filas]
    .filter((p) => p.visitas >= VISITAS_PARA_COMPARAR_CANALES && p.conversion !== null)
    .sort((a, b) => (b.conversion ?? 0) - (a.conversion ?? 0))[0];
  if (masVende && mejorConvierte && mejorConvierte.id !== masVende.id && (mejorConvierte.conversion ?? 0) > (masVende.conversion ?? 0)) {
    return { texto: `«${mejorConvierte.name}» convierte mejor que «${masVende.name}» con menos visitas: sólo necesita que le mandes más gente.` };
  }
  return { texto: "El que más vende no siempre es el que mejor convierte: uno con pocas visitas y buena conversión sólo necesita que le mandes gente. Tocá un producto para ver su embudo por separado." };
}

function carritos(d: Estadisticas): Consejo {
  const c = d.carritos;
  const aCarritos = { texto: "Ver carritos", href: "/digitales/carritos" };
  if (c.abandonados === 0) {
    return { texto: "Cuando alguien abre el pago y no paga, a la mañana siguiente le sale un mail automático con el enlace para terminar. Una sola vez, y nunca si el pago está en camino: un cupón de efectivo no es un abandono." };
  }
  if (c.pctRecuperados !== null && c.recordados >= RECORDATORIOS_PARA_OPINAR && c.pctRecuperados < POCOS_RECUPERADOS) {
    return {
      texto: "Vuelven pocos. El mail ya salió; lo que ayuda es que la página diga por qué comprar hoy: una fecha, un cupo, un precio que sube. Y a los que quedaron, un mensaje tuyo recupera más que el automático.",
      accion: aCarritos,
    };
  }
  return {
    texto: "Los que quedaron en la puerta ya dejaron el correo: en Carritos podés escribirles vos. Un mensaje personal recupera más que el automático.",
    accion: aCarritos,
  };
}

function origenes(d: Estadisticas): Consejo {
  const filas = d.origenes.filas;
  if (filas.length === 0) {
    return { texto: "Un link abierto desde WhatsApp o desde la app de Instagram muchas veces llega sin decir de dónde vino, y se cuenta como directo. Por eso la etiqueta: con ?utm_source=whatsapp al final del link, ese canal queda anotado aunque el celular no lo diga." };
  }
  /* La lista viene con Directo y Otro al final aunque traigan más: para el
     consejo se busca el de más visitas de verdad. */
  const masTrae = [...filas].sort((a, b) => b.visitas - a.visitas)[0];
  const esBolsa = masTrae.origen === "directo" || masTrae.origen === "otro";
  if (esBolsa && masTrae.pct >= 50) {
    return { texto: "La mayoría llega sin decir de dónde vino y cae en Directo. Casi siempre es un link pegado en WhatsApp o abierto desde la app de Instagram: agregales ?utm_source=whatsapp (o instagram) y van a aparecer con su canal." };
  }
  const conNombre = filas.filter((f) => f.origen !== "directo" && f.origen !== "otro");
  const mejorPaga = [...conNombre]
    .filter((f) => f.visitas >= VISITAS_PARA_COMPARAR_CANALES && f.conversion !== null)
    .sort((a, b) => (b.conversion ?? 0) - (a.conversion ?? 0))[0];
  if (!esBolsa && mejorPaga && mejorPaga.origen !== masTrae.origen && (mejorPaga.conversion ?? 0) > (masTrae.conversion ?? 0)) {
    return { texto: `${NOMBRE_ORIGEN[masTrae.origen]} trae más gente, pero en ${NOMBRE_ORIGEN[mejorPaga.origen]} es donde más pagan. Vale más un mensaje ahí que un posteo allá.` };
  }
  if (d.origenes.ventasSinOrigen > 0) {
    return { texto: `${pocas(d.origenes.ventasSinOrigen, "venta no tiene", "ventas no tienen")} canal anotado: llegaron sin etiqueta y sin que el navegador dijera de dónde. Cuanto más links lleven ?utm_source=..., menos ventas quedan sin saber de dónde salieron.` };
  }
  if (esBolsa || conNombre.length === 0) {
    return { texto: "Todavía no se sabe qué canal rinde: etiquetá cada link que compartas con ?utm_source=... y en unos días esta lista te dice dónde vale la pena estar." };
  }
  return { texto: `${NOMBRE_ORIGEN[masTrae.origen]} es tu canal: trae las visitas y las ventas. Antes de abrir otro, exprimí ese.` };
}

function campanias(d: Estadisticas): Consejo {
  const filas = d.campanias.filas;
  if (filas.length === 0) {
    return { texto: "Nombrá cada campaña por lo que estás probando —«video corto», «precio tachado», «testimonio»— y no por la fecha. En dos semanas la tabla te dice cuál apagar y cuál repetir." };
  }
  const paraApagar = filas.find((f) => f.visitas >= VISITAS_PARA_APAGAR_UNA_CAMPANIA && f.ventas === 0);
  if (paraApagar) {
    /* En "Todos" con varios productos, la campaña se nombra con su producto:
       la misma etiqueta puede estar rindiendo bien en la otra página. */
    const cual = `«${paraApagar.campania}»${paraApagar.producto ? ` de ${paraApagar.producto}` : ""}`;
    return { texto: `${cual} trajo ${entero(paraApagar.visitas)} visitas y ninguna venta: es la primera para apagar, o para cambiarle el anuncio y ver si era eso.` };
  }
  return { texto: "La campaña que convierte mejor es la que merece más presupuesto, aunque no sea la que más visitas trae. Y la que trae visitas y no vende, se apaga antes de gastar más." };
}
