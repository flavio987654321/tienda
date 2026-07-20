const AR_TZ = "America/Argentina/Buenos_Aires";

export type FechaComercial = {
  nombre: string;
  fecha: Date;
  diasFaltan: number;
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

function buildCalendar(year: number): Omit<FechaComercial, "diasFaltan">[] {
  const blackFriday = lastWeekday(year, 10, 5);
  const cyberMonday = new Date(blackFriday);
  cyberMonday.setUTCDate(cyberMonday.getUTCDate() + 3);

  return [
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
      nombre: "Día del Padre",
      fecha: nthWeekday(year, 5, 0, 3),
      sugerencia: "Buen momento para destacar productos que suelen regalarse a papás.",
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
export function getUpcomingDates(daysAhead = 21): FechaComercial[] {
  const today = getArgentinaToday();
  const year = today.getUTCFullYear();
  const candidatas = [...buildCalendar(year), ...buildCalendar(year + 1)];

  const maxDate = new Date(today);
  maxDate.setUTCDate(maxDate.getUTCDate() + daysAhead);

  return candidatas
    .filter((f) => f.fecha >= today && f.fecha <= maxDate)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map((f) => ({
      ...f,
      diasFaltan: Math.round((f.fecha.getTime() - today.getTime()) / 86_400_000),
    }));
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
  return buildCalendar(new Date().getUTCFullYear()).map((f) => f.nombre);
}

/**
 * Próxima ocurrencia de un evento del calendario, o null si el nombre es propio
 * de la tienda. Sirve para proponer fechas al crear la promo.
 */
export function getEventDate(nombre: string): Date | null {
  const hoy = getArgentinaToday();
  const year = hoy.getUTCFullYear();
  const candidatas = [...buildCalendar(year), ...buildCalendar(year + 1)];
  const match = candidatas.filter((f) => f.nombre === nombre && f.fecha >= hoy);
  return match.length ? match[0].fecha : null;
}
