/**
 * La página "La agencia" de los templates de autos y motos (13/10/26).
 *
 * Lo que un comprador de vehículos necesita antes de ir en persona: dónde está,
 * cuándo atienden, cómo se paga, con quién habla, qué garantía hay y cómo es el
 * salón. Es lo que decide si alguien se acerca o no.
 *
 * Los datos van en dos lugares a propósito:
 *   - `ubicacion` (dirección y horarios) se carga en Configuración → Contacto,
 *     porque es del NEGOCIO: sobrevive a un cambio de template y la pueden
 *     usar otras partes (el pie, el catálogo de Meta). Se guarda con el PATCH
 *     de preferencias, nunca con el POST del diseño.
 *   - `agencia` (pagos, equipo, garantía, fotos del salón) se edita en Diseño,
 *     sobre la misma página, porque es contenido que se mira mientras se arma.
 *
 * Lo de acá es la lógica compartida; el aspecto de la página es de cada
 * template (ver TEMPLATES_CON_AGENCIA y agencia.check.ts).
 */

export const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
export type Dia = (typeof DIAS)[number];
export const NOMBRE_DIA: Record<Dia, string> = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado", dom: "Domingo" };
export const DIA_CORTO: Record<Dia, string> = { lun: "Lun", mar: "Mar", mie: "Mié", jue: "Jue", vie: "Vie", sab: "Sáb", dom: "Dom" };

/** Una franja de atención, en hora de Argentina: "09:00" a "13:00". */
export type Franja = { abre: string; cierra: string };
/** Hasta dos franjas por día (horario cortado). Un día sin franjas está cerrado. */
export type Horarios = Partial<Record<Dia, Franja[]>>;

export type Ubicacion = {
  calle?: string;
  localidad?: string;
  provincia?: string;
  horarios?: Horarios;
};

export const PAGOS = ["contado", "transferencia", "tarjeta", "financiacion", "permuta", "dolares"] as const;
export type Pago = (typeof PAGOS)[number];
export const NOMBRE_PAGO: Record<Pago, string> = {
  contado: "Contado", transferencia: "Transferencia", tarjeta: "Tarjeta",
  financiacion: "Financiación", permuta: "Tomamos tu usado", dolares: "Aceptamos dólares",
};

export type Miembro = { nombre: string; rol?: string; foto?: string; whatsapp?: string };

export type Agencia = {
  pagos?: Pago[];
  /** Lo que no entra en un botón: "hasta 48 cuotas con DNI y recibo de sueldo". */
  pagosNota?: string;
  equipo?: Miembro[];
  garantia?: string;
  /** Fotos del salón. */
  salon?: string[];
};

export const TOPE = { equipo: 8, salon: 8, nota: 300, garantia: 600, texto: 80 } as const;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
export const esHora = (h: string) => HORA.test(h);
const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** Lo que está mal en los horarios, para decirlo antes de guardar. "" si nada. */
export function problemaDeHorarios(h: Horarios | undefined): string {
  for (const d of DIAS) {
    const fr = h?.[d] ?? [];
    if (fr.length > 2) return `${NOMBRE_DIA[d]}: como mucho dos franjas.`;
    for (const f of fr) {
      if (!esHora(f.abre) || !esHora(f.cierra)) return `${NOMBRE_DIA[d]}: completá las dos horas.`;
      if (minutos(f.cierra) <= minutos(f.abre)) return `${NOMBRE_DIA[d]}: la hora de cierre tiene que ser después de la de apertura.`;
    }
    if (fr.length === 2 && minutos(fr[1].abre) < minutos(fr[0].cierra)) return `${NOMBRE_DIA[d]}: la segunda franja empieza antes de que termine la primera.`;
  }
  return "";
}

export function hayHorarios(h: Horarios | undefined): boolean {
  return DIAS.some((d) => (h?.[d]?.length ?? 0) > 0);
}

const textoFranjas = (fr: Franja[]) => fr.map((f) => `${f.abre} a ${f.cierra}`).join(" y ");

/**
 * Los horarios agrupados como se escriben en una vidriera: los días seguidos
 * con el mismo horario van juntos. "Lun a Vie" / "9:00 a 19:00".
 */
export function horariosResumidos(h: Horarios | undefined): { dias: string; horas: string; incluye: Dia[] }[] {
  const filas: { desde: Dia; hasta: Dia; horas: string }[] = [];
  for (const d of DIAS) {
    const fr = h?.[d] ?? [];
    const horas = fr.length ? textoFranjas(fr) : "Cerrado";
    const ultima = filas[filas.length - 1];
    if (ultima && ultima.horas === horas) ultima.hasta = d;
    else filas.push({ desde: d, hasta: d, horas });
  }
  // Si todo está cerrado no hay nada que mostrar; si sólo el final de semana
  // está cerrado, se dice igual: "Dom · Cerrado" también informa.
  if (filas.every((f) => f.horas === "Cerrado")) return [];
  return filas.map((f) => ({
    dias: f.desde === f.hasta ? DIA_CORTO[f.desde] : `${DIA_CORTO[f.desde]} a ${DIA_CORTO[f.hasta]}`,
    horas: f.horas,
    /** Los días que abarca la fila, para resaltar la de hoy. */
    incluye: DIAS.slice(DIAS.indexOf(f.desde), DIAS.indexOf(f.hasta) + 1),
  }));
}

/**
 * La hora de Argentina, sin depender de la zona del navegador: un comprador
 * de afuera (o una compu mal configurada) vería "cerrado" a cualquier hora.
 * Argentina no tiene horario de verano: UTC−3 todo el año.
 */
export function ahoraEnArgentina(fecha: Date = new Date()): { dia: Dia; min: number } {
  const ar = new Date(fecha.getTime() - 3 * 60 * 60 * 1000);
  // getUTCDay: 0 = domingo.
  const dia = DIAS[(ar.getUTCDay() + 6) % 7];
  return { dia, min: ar.getUTCHours() * 60 + ar.getUTCMinutes() };
}

/**
 * "Abierto · cierra 19:00" / "Cerrado · abre mañana 9:00". `null` si no hay
 * horarios cargados (no se inventa nada). Se calcula del lado del navegador
 * DESPUÉS de montar: el servidor no sabe a qué hora lo van a mirar.
 */
export function estadoAhora(h: Horarios | undefined, fecha: Date = new Date()): { abierto: boolean; texto: string } | null {
  if (!hayHorarios(h)) return null;
  const { dia, min } = ahoraEnArgentina(fecha);
  const hoy = h?.[dia] ?? [];
  const actual = hoy.find((f) => min >= minutos(f.abre) && min < minutos(f.cierra));
  if (actual) return { abierto: true, texto: `Abierto · cierra ${actual.cierra}` };
  const masTardeHoy = hoy.find((f) => minutos(f.abre) > min);
  if (masTardeHoy) return { abierto: false, texto: `Cerrado · abre hoy ${masTardeHoy.abre}` };
  const i = DIAS.indexOf(dia);
  for (let k = 1; k <= 7; k++) {
    const d = DIAS[(i + k) % 7];
    const fr = h?.[d] ?? [];
    if (fr.length) return { abierto: false, texto: `Cerrado · abre ${k === 1 ? "mañana" : NOMBRE_DIA[d].toLowerCase()} ${fr[0].abre}` };
  }
  return null;
}

export function direccionCompleta(u: Ubicacion | undefined): string {
  return [u?.calle, u?.localidad, u?.provincia].map((x) => x?.trim()).filter(Boolean).join(", ");
}

/** Sólo con la calle y la localidad el mapa cae en el lugar; con menos, cae en cualquier lado. */
export function hayDireccion(u: Ubicacion | undefined): boolean {
  return !!u?.calle?.trim() && !!u?.localidad?.trim();
}

const consulta = (u: Ubicacion) => encodeURIComponent(`${direccionCompleta(u)}, Argentina`);
/** El mapa para un `<iframe>`. No pide clave de Google. */
export const urlMapaEmbebido = (u: Ubicacion) => `https://www.google.com/maps?q=${consulta(u)}&output=embed`;
/** "Cómo llegar": abre Google Maps (la app en el celular) con el destino puesto. */
export const urlComoLlegar = (u: Ubicacion) => `https://www.google.com/maps/dir/?api=1&destination=${consulta(u)}`;

/** Lo que el template muestra: sin miembros vacíos ni fotos repetidas. */
export function agenciaLimpia(a: Agencia | undefined): Required<Pick<Agencia, "pagos" | "equipo" | "salon">> & Pick<Agencia, "pagosNota" | "garantia"> {
  return {
    pagos: (a?.pagos ?? []).filter((p): p is Pago => (PAGOS as readonly string[]).includes(p)),
    pagosNota: a?.pagosNota?.trim() || undefined,
    equipo: (a?.equipo ?? []).filter((m) => m.nombre?.trim()).slice(0, TOPE.equipo),
    garantia: a?.garantia?.trim() || undefined,
    salon: [...new Set(a?.salon ?? [])].filter(Boolean).slice(0, TOPE.salon),
  };
}
