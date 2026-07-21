const AR_TZ = "America/Argentina/Buenos_Aires";

export type FechaComercial = {
  nombre: string;
  /** Día del evento, o primer día si es un período. */
  fecha: Date;
  /** Último día. null en las fechas de un solo día. */
  hasta: Date | null;
  /** Días hasta que arranque. 0 si ya arrancó (ver `enCurso`). */
  diasFaltan: number;
  /** Días hasta que termine. null en las fechas de un solo día. */
  diasRestantes: number | null;
  /** Ya arrancó y todavía no terminó: se habla en presente, no "falta para". */
  enCurso: boolean;
  /** La fecha exacta la fija un tercero (CACE) o varía por provincia. */
  aproximada: boolean;
  sugerencia: string;
};

/** Cómo se declara una fecha en el calendario de abajo. */
type EntradaCalendario = {
  nombre: string;
  fecha: Date;
  hasta?: Date;
  aproximada?: boolean;
  sugerencia: string;
};

/**
 * "Hoy" según el calendario de Argentina, representado como un Date UTC a las 00:00
 * (no usar new Date().getDate()/getMonth() directo: el servidor corre en UTC y cerca
 * de medianoche Argentina eso da el día siguiente).
 */
function getArgentinaToday(): Date {
  return new Date(`${getArgentinaDayKey()}T00:00:00Z`);
}

/**
 * Clave de "día" en formato YYYY-MM-DD según el calendario de Argentina, sin depender
 * de la hora del servidor (UTC) ni del navegador del usuario. Se usa para resetear
 * por día cosas como el historial de chat con Sasha.
 */
export function getArgentinaDayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nthWeekday(year: number, monthIndex: number, weekday: number, nth: number): Date {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const day = 1 + ((weekday - first.getUTCDay() + 7) % 7) + (nth - 1) * 7;
  return new Date(Date.UTC(year, monthIndex, day));
}

function lastWeekday(year: number, monthIndex: number, weekday: number): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0));
  const diff = (lastDayOfMonth.getUTCDay() - weekday + 7) % 7;
  return new Date(Date.UTC(year, monthIndex, lastDayOfMonth.getUTCDate() - diff));
}

function masDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

function buildCalendar(year: number): EntradaCalendario[] {
  const blackFriday = lastWeekday(year, 10, 5);
  const cyberMonday = masDias(blackFriday, 3);

  // Hot Sale lo organiza la CACE y anuncia la fecha cada año; suele caer el
  // segundo lunes de mayo y durar 3 días. Se marca `aproximada` para que Sasha
  // avise que hay que confirmarla, en vez de afirmar un día que puede no ser.
  const hotSale = nthWeekday(year, 4, 1, 2);

  // Las vacaciones de invierno las fija cada provincia, así que no hay una fecha
  // nacional. Dos semanas desde el segundo lunes de julio cubre la mayoría.
  const vacacionesInvierno = nthWeekday(year, 6, 1, 2);

  return [
    {
      nombre: "Vacaciones de verano",
      fecha: new Date(Date.UTC(year, 0, 1)),
      hasta: new Date(Date.UTC(year, 0, 31)),
      aproximada: true,
      sugerencia: "Mucha gente compra desde el celular y de viaje — conviene revisar que la tienda se vea bien en pantalla chica y avisar los plazos de envío si vas a despachar más lento.",
    },
    {
      nombre: "Reyes",
      fecha: new Date(Date.UTC(year, 0, 6)),
      sugerencia: "Es un buen momento para vaciar stock de juguetes o regalos chicos con alguna promo.",
    },
    {
      nombre: "San Valentín / Día de los Enamorados",
      fecha: new Date(Date.UTC(year, 1, 14)),
      sugerencia: "Podés armar combos para regalar en pareja o destacar productos pensados para regalo.",
    },
    {
      nombre: "Día del Trabajador",
      fecha: new Date(Date.UTC(year, 4, 1)),
      sugerencia: "Es feriado nacional: los correos no despachan, así que conviene avisar en la tienda que los envíos salen el día siguiente.",
    },
    {
      nombre: "Hot Sale",
      fecha: hotSale,
      hasta: masDias(hotSale, 2),
      aproximada: true,
      sugerencia: "Es de las fechas más fuertes del año en venta online. La fecha exacta la confirma la CACE, conviene chequearla y preparar los descuentos con tiempo.",
    },
    {
      nombre: "Día del Padre",
      fecha: nthWeekday(year, 5, 0, 3),
      sugerencia: "Buen momento para destacar productos que suelen regalarse a papás.",
    },
    {
      nombre: "Día de la Bandera",
      fecha: new Date(Date.UTC(year, 5, 20)),
      sugerencia: "Es feriado nacional: los correos no despachan ese día, conviene tenerlo en cuenta si prometés fechas de entrega.",
    },
    {
      nombre: "Día de la Independencia",
      fecha: new Date(Date.UTC(year, 6, 9)),
      sugerencia: "Es feriado nacional: los correos no despachan ese día, conviene tenerlo en cuenta si prometés fechas de entrega.",
    },
    {
      nombre: "Vacaciones de invierno",
      fecha: vacacionesInvierno,
      hasta: masDias(vacacionesInvierno, 13),
      aproximada: true,
      sugerencia: "Cambia el ritmo de compra: hay más tiempo para navegar y más gasto en chicos y en salidas. Las fechas exactas las fija cada provincia.",
    },
    {
      nombre: "Día del Amigo",
      fecha: new Date(Date.UTC(year, 6, 20)),
      sugerencia: "Se regala mucho entre amigos y suele decidirse a último momento — sirve tener algo listo para regalar sin pensar demasiado.",
    },
    {
      nombre: "Día del Niño",
      fecha: nthWeekday(year, 7, 0, 2),
      sugerencia: "Si tenés productos para chicos, conviene tenerlos bien visibles unas semanas antes.",
    },
    {
      nombre: "Día de la Primavera / Estudiante",
      fecha: new Date(Date.UTC(year, 8, 21)),
      sugerencia: "Fecha con mucho movimiento social — puede ser una buena excusa para una promo liviana.",
    },
    {
      nombre: "Día de la Madre",
      fecha: nthWeekday(year, 9, 0, 3),
      sugerencia: "Una de las fechas con más ventas del año — vale la pena tener algo preparado con anticipación.",
    },
    {
      nombre: "Black Friday",
      fecha: blackFriday,
      sugerencia: "Mucha gente espera descuentos fuertes esta fecha — conviene decidir con tiempo qué productos entran.",
    },
    {
      nombre: "Cyber Monday",
      fecha: cyberMonday,
      sugerencia: "Sigue al Black Friday, fuerte en compras online — si ya armaste promos, se pueden extender acá.",
    },
    {
      nombre: "Navidad",
      fecha: new Date(Date.UTC(year, 11, 25)),
      sugerencia: "Conviene tener el stock de los productos más regalados asegurado con varios días de anticipación.",
    },
    {
      nombre: "Fin de año",
      fecha: new Date(Date.UTC(year, 11, 31)),
      sugerencia: "Buen momento para una liquidación de temporada antes de arrancar el año nuevo.",
    },
  ];
}

/**
 * Fecha y hora actual en Argentina, para que Sasha pueda saludar acorde al momento del día
 * (buen día / buenas tardes / buenas noches) sin depender de la hora del servidor (UTC).
 */
export function getArgentinaAhora(): { fechaTexto: string; hora: number } {
  const now = new Date();
  const hora = parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: AR_TZ, hour: "2-digit", hour12: false }).format(now),
    10
  );
  const fechaTexto = new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  return { fechaTexto, hora };
}

/**
 * Fechas comerciales argentinas dentro de los próximos `daysAhead` días (por defecto 21),
 * calculadas siempre en zona horaria Argentina, sin depender del reloj del servidor.
 */
export function getUpcomingDates(daysAhead = 21, hoy?: Date): FechaComercial[] {
  // `hoy` inyectable como en planLimits: la lógica de períodos depende del día y
  // sin poder fijarlo los casos no se pueden verificar. En producción nadie lo pasa.
  const today = hoy ?? getArgentinaToday();
  const year = today.getUTCFullYear();
  // El año anterior también: un período puede haber arrancado en diciembre y
  // seguir corriendo hoy. Sin esto, unas vacaciones de verano a caballo del año
  // nuevo desaparecían justo el 1 de enero, en el medio.
  const candidatas = [...buildCalendar(year - 1), ...buildCalendar(year), ...buildCalendar(year + 1)];

  const maxDate = masDias(today, daysAhead);
  const dias = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86_400_000);

  return candidatas
    // Entra si todavía no terminó y arranca dentro de la ventana. Para las de un
    // solo día `hasta` es la fecha misma, así que se comporta igual que antes;
    // un período en curso pasa aunque haya arrancado hace días.
    .filter((f) => (f.hasta ?? f.fecha) >= today && f.fecha <= maxDate)
    .map((f) => {
      const enCurso = f.fecha <= today;
      return {
        nombre: f.nombre,
        fecha: f.fecha,
        hasta: f.hasta ?? null,
        diasFaltan: enCurso ? 0 : dias(f.fecha, today),
        diasRestantes: f.hasta ? dias(f.hasta, today) : null,
        enCurso,
        aproximada: f.aproximada ?? false,
        sugerencia: f.sugerencia,
      };
    })
    // Lo que ya está pasando va primero: es más accionable que algo que falta.
    .sort((a, b) => Number(b.enCurso) - Number(a.enCurso) || a.fecha.getTime() - b.fecha.getTime());
}

/**
 * Nombres de las fechas comerciales, para que el wizard de promociones ofrezca
 * los mismos que ya usa Sasha en sus sugerencias. Si la dueña arranca una promo
 * desde "falta poco para el Día de la Madre", el evento que elija acá se llama
 * igual — sin esto cada lado inventaría su propia lista.
 *
 * El año no importa: se usa solo para leer los nombres, que no cambian.
 */
export function getEventNames(): string[] {
  return buildCalendar(new Date().getUTCFullYear()).map((f) => nombreCorto(f.nombre));
}

/**
 * Versión corta para mostrar. Los nombres del calendario son descriptivos
 * ("San Valentín / Día de los Enamorados") porque Sasha los usa en frases, pero
 * en la etiqueta de un producto —arriba de la foto, en un celular— no entran:
 * se cortaban a la mitad de una palabra ("SAN VALENTÍN / DÍA DE LO").
 * Se corta en la barra, que es justo donde arranca el sinónimo.
 */
function nombreCorto(nombre: string): string {
  return nombre.split(" / ")[0].trim();
}

/**
 * Ventana sugerida para una promo de este evento, o null si el nombre es propio
 * de la tienda. Devuelve el rango completo y no solo el día para que un período
 * ("Vacaciones de invierno") proponga sus dos semanas reales: antes se tomaba el
 * día como final y se restaban 3, así que una promo de vacaciones terminaba justo
 * cuando arrancaban.
 */
export function getEventRange(nombre: string): { desde: Date; hasta: Date } | null {
  const hoy = getArgentinaToday();
  const year = hoy.getUTCFullYear();
  const candidatas = [...buildCalendar(year - 1), ...buildCalendar(year), ...buildCalendar(year + 1)];
  // Compara contra el nombre corto además del completo: el selector de promos
  // ofrece los cortos, así que buscar solo por el completo no encontraba nunca
  // "San Valentín" y no proponía la fecha.
  const match = candidatas
    .filter((f) => (f.nombre === nombre || nombreCorto(f.nombre) === nombre) && (f.hasta ?? f.fecha) >= hoy)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())[0];
  if (!match) return null;

  // Un día suelto no tiene duración, así que se le arma una ventana: arranca unos
  // días antes, como se usa. Un período ya trae la suya.
  return match.hasta
    ? { desde: match.fecha, hasta: match.hasta }
    : { desde: masDias(match.fecha, -3), hasta: match.fecha };
}
