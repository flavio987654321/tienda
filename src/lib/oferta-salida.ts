/* ══════════════════════════════════════════════════════════════════════════
   LA OFERTA DE SALIDA (el "downsell" de la competencia)
   ══════════════════════════════════════════════════════════════════════════

   La persona está en el checkout y se va sin pagar. Antes de que cierre se
   le muestra un cartel con una de dos cosas: un descuento sobre el mismo
   producto, o un producto más barato de la misma cuenta. El mismo cartel
   viaja en el mail de carrito abandonado.

   ── Lo que NO se copió, y por qué ──────────────────────────────────────────

   La competencia pone "cupos reservados 73 %" y un reloj de quince minutos
   que se reinicia al recargar y que nadie hace cumplir. Son mentira, y el
   que queda mal es el negocio de quien vende, con su nombre. Acá:

   - No hay cupos: un PDF no se agota.
   - El plazo es de verdad. La oferta vale un tiempo desde que la persona la
     VIO (de 15 minutos a 48 horas), y lo hace cumplir el servidor: el token
     lleva firmada la hora en que VENCE (`firmarOferta`), y la ruta que
     cobra la mira. Pasado el plazo el cupón no aplica, aunque se recargue,
     se cambie de pestaña o se vuelva mañana. Por eso el cartel puede tener
     un reloj que cuenta hacia atrás (con los plazos cortos) o decir "vale
     hasta mañana a las 18:23" (con los largos): las dos cosas son ciertas.
   - El descuento es un cupón real de la cuenta (`CuponDigital`, código
     `SALIDA-…`, marcado en la lista): lo cobra la misma ruta que cualquier
     cupón, con las mismas reglas. Sin plata decidida en el navegador.

   Y tampoco hay editor de bloques: son seis campos y una vista previa que
   es EL MISMO cartel. Una página que se ve tres segundos no necesita
   carrusel.

   Este archivo es puro y lo importa el navegador: las reglas, la forma
   guardada y el texto del plazo. La firma del token, que necesita
   `crypto`, vive en `oferta-salida-firma`. Probado en
   `oferta-salida.check.ts`. */

/** Cuánto vale la oferta, en horas. Los dos primeros son minutos: 15 y 60. */
export const HORAS_DE_OFERTA = [0.25, 1, 6, 24, 48] as const;
export type HorasDeOferta = (typeof HORAS_DE_OFERTA)[number];
export const HORAS_MAXIMAS = 48;
/** En el mail de carrito abandonado el plazo es de al menos un día: nadie lee un mail a los quince minutos. */
export const HORAS_MINIMAS_DEL_MAIL = 24;

/** "15 minutos", "1 hora", "24 horas". */
export function textoDeHoras(h: HorasDeOferta): string {
  if (h < 1) return `${Math.round(h * 60)} minutos`;
  return h === 1 ? "1 hora" : `${h} horas`;
}

/** Con una hora o menos el cartel muestra la cuenta regresiva en vez de "hasta las 18:23". */
export function esPlazoCorto(horas: number): boolean {
  return horas <= 1;
}
export const PORCENTAJE_MINIMO = 5;
export const PORCENTAJE_MAXIMO_SALIDA = 50;
export const TITULO_MAX = 60;
export const TEXTO_MAX = 240;
export const BOTON_MAX = 30;

export type TipoDeOferta = "DESCUENTO" | "PRODUCTO";

/** Lo que se guarda en `Product.ofertaSalida`, como JSON. */
export type OfertaSalida = {
  activa: boolean;
  tipo: TipoDeOferta;
  /** Sólo con DESCUENTO. */
  porcentaje: number;
  /** Sólo con PRODUCTO: otro principal de la misma cuenta. */
  productoId: string | null;
  horas: HorasDeOferta;
  titulo: string;
  texto: string;
  boton: string;
};

export const OFERTA_DE_FABRICA: OfertaSalida = {
  activa: false,
  tipo: "DESCUENTO",
  porcentaje: 20,
  productoId: null,
  horas: 24,
  titulo: "Antes de que te vayas…",
  texto: "Sé que el precio puede ser una traba. Te dejo un descuento que es sólo para vos y vale por un tiempo: si lo querés, es ahora.",
  boton: "Sí, lo quiero",
};

const ID_RE = /^c[a-z0-9]{20,30}$/;

/** Lo guardado, o la de fábrica (apagada) si no hay nada o está roto. */
export function leerOfertaSalida(raw: string | null | undefined): OfertaSalida {
  if (!raw) return OFERTA_DE_FABRICA;
  try {
    const r = validarOfertaSalida(JSON.parse(raw));
    return r.ok ? r.datos : OFERTA_DE_FABRICA;
  } catch {
    return OFERTA_DE_FABRICA;
  }
}

/**
 * Lo que manda la pantalla, revisado. La misma función corre en la pantalla
 * (para avisar antes) y en la ruta (para decidir).
 */
export function validarOfertaSalida(body: unknown): { ok: true; datos: OfertaSalida } | { ok: false; problema: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const tipo: TipoDeOferta = b.tipo === "PRODUCTO" ? "PRODUCTO" : "DESCUENTO";
  const porcentaje = typeof b.porcentaje === "number" ? b.porcentaje : Number.parseInt(String(b.porcentaje ?? ""), 10);
  const horasCrudo = typeof b.horas === "number" ? b.horas : Number(String(b.horas ?? ""));
  const horas = HORAS_DE_OFERTA.find((h) => h === horasCrudo);
  const titulo = typeof b.titulo === "string" ? b.titulo.replace(/\s+/g, " ").trim() : "";
  const texto = typeof b.texto === "string" ? b.texto.replace(/\r\n/g, "\n").trim() : "";
  const boton = typeof b.boton === "string" ? b.boton.replace(/\s+/g, " ").trim() : "";
  const productoId = typeof b.productoId === "string" && ID_RE.test(b.productoId) ? b.productoId : null;

  if (tipo === "DESCUENTO" && (!Number.isInteger(porcentaje) || porcentaje < PORCENTAJE_MINIMO || porcentaje > PORCENTAJE_MAXIMO_SALIDA)) {
    return { ok: false, problema: `El descuento va de ${PORCENTAJE_MINIMO} a ${PORCENTAJE_MAXIMO_SALIDA} %. Más que eso no es una oferta, es otro precio.` };
  }
  if (tipo === "PRODUCTO" && !productoId) return { ok: false, problema: "Elegí qué producto más barato ofrecer." };
  if (!horas) return { ok: false, problema: "Elegí cuánto tiempo vale la oferta." };
  if (titulo.length < 3) return { ok: false, problema: "Escribí un título." };
  if (titulo.length > TITULO_MAX) return { ok: false, problema: `El título va hasta ${TITULO_MAX} letras.` };
  if (texto.length < 10) return { ok: false, problema: "Escribí el texto del cartel: una o dos frases." };
  if (texto.length > TEXTO_MAX) return { ok: false, problema: `El texto va hasta ${TEXTO_MAX} letras: es un cartel, no una página.` };
  if (boton.length < 2) return { ok: false, problema: "Escribí qué dice el botón." };
  if (boton.length > BOTON_MAX) return { ok: false, problema: `El botón va hasta ${BOTON_MAX} letras.` };

  return {
    ok: true,
    datos: {
      activa: b.activa === true,
      tipo,
      porcentaje: tipo === "DESCUENTO" ? porcentaje : OFERTA_DE_FABRICA.porcentaje,
      productoId: tipo === "PRODUCTO" ? productoId : null,
      horas, titulo, texto, boton,
    },
  };
}

/* ── El cupón de la oferta ───────────────────────────────────────────────── */

/**
 * El código del cupón que la oferta crea sola: `SALIDA-` y la cola del id
 * del producto. Fijo por producto, así guardar dos veces actualiza el mismo
 * cupón en vez de crear otro. En la lista de Cupones se reconoce por el
 * prefijo.
 */
export function codigoDeLaOferta(productId: string): string {
  return `SALIDA-${productId.slice(-8).toUpperCase()}`;
}

export function esCodigoDeOferta(codigo: string): boolean {
  return codigo.startsWith("SALIDA-");
}

/* ── El plazo ───────────────────────────────────────────────────────────── */

/** Sólo la hora en que vence, sin verificar la firma: para que el navegador sepa si el token que guardó sigue vivo y qué mostrar. */
export function venceEnDelToken(token: string): number | null {
  const ts = Number(token.split(".")[0]);
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

/**
 * La cuenta regresiva: "14:59", "1:00:00". Null cuando ya pasó. Se muestra
 * con los plazos cortos, y con los largos cuando les queda menos de una hora.
 */
export function cuentaRegresiva(venceEn: number, ahora = Date.now()): string | null {
  const resto = Math.floor((venceEn - ahora) / 1000);
  if (resto <= 0) return null;
  const h = Math.floor(resto / 3600), m = Math.floor((resto % 3600) / 60), s = resto % 60;
  const dos = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${m}:${dos(s)}`;
}

/** Con menos de una hora por delante, el cartel pasa del "hasta las 18:23" al reloj. */
export function mostrarReloj(venceEn: number, ahora = Date.now()): boolean {
  return venceEn - ahora <= 3_600_000;
}

/** "hasta mañana a las 18:23" / "hasta hoy a las 22:10" / "hasta el 18/09 a las 09:00", en hora argentina. */
export function venceEnTexto(venceEn: Date, ahora = new Date()): string {
  const AR = "America/Argentina/Buenos_Aires";
  const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: AR, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const hora = new Intl.DateTimeFormat("es-AR", { timeZone: AR, hour: "2-digit", minute: "2-digit", hour12: false }).format(venceEn);
  const hoy = dia(ahora);
  const manana = dia(new Date(ahora.getTime() + 24 * 60 * 60_000));
  const el = dia(venceEn);
  if (el === hoy) return `hasta hoy a las ${hora}`;
  if (el === manana) return `hasta mañana a las ${hora}`;
  const [, m, d] = el.split("-");
  return `hasta el ${d}/${m} a las ${hora}`;
}
