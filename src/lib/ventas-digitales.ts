import type { Prisma } from "@prisma/client";
import { inicioDiaArgentino, sumarDiasCalendario } from "@/lib/fechas-comerciales";

/* ══════════════════════════════════════════════════════════════════════════
   TUS VENTAS: LO QUE NO TOCA LA BASE
   ══════════════════════════════════════════════════════════════════════════

   Lo que la pantalla de ventas y su exportación tienen en común y no necesita
   Prisma: leer la dirección sin creerle, el rango de fechas, el `where` que
   sale de eso, y el mensaje para escribirle a quien compró.

   Vive acá para que la pantalla y el archivo que se baja filtren IGUAL. Con el
   filtro escrito dos veces, un día la lista dice 40 ventas y el archivo trae
   38, y la persona no sabe a cuál creerle.

   Es puro. Probado en `ventas-digitales.check.ts`. */

/* ── El rango de fechas ──────────────────────────────────────────────────── */

/**
 * Acá los rangos son los de quien hace cuentas, no los de quien mira una
 * curva: "este mes" y "el mes pasado" son los que se cotejan contra lo que
 * Mercado Pago liquidó. "Todo" es el que se ve al entrar: la lista completa.
 */
export const RANGOS_VENTAS = ["todo", "hoy", "7", "mes", "mes-anterior"] as const;
export type RangoVentasClave = (typeof RANGOS_VENTAS)[number];
export const NOMBRE_RANGO_VENTAS: Record<RangoVentasClave, string> = {
  todo: "Todo", hoy: "Hoy", "7": "7 días", mes: "Este mes", "mes-anterior": "Mes pasado",
};

/** Días argentinos "YYYY-MM-DD", ambos incluidos. `null` en los dos = sin recorte. */
export type RangoVentas = { clave: RangoVentasClave; desde: string | null; hasta: string | null };

export function resolverRangoVentas(param: string | undefined, hoy: string): RangoVentas {
  const clave: RangoVentasClave = (RANGOS_VENTAS as readonly string[]).includes(param ?? "") ? (param as RangoVentasClave) : "todo";
  const primeroDelMes = `${hoy.slice(0, 7)}-01`;
  switch (clave) {
    case "todo": return { clave, desde: null, hasta: null };
    case "hoy": return { clave, desde: hoy, hasta: hoy };
    case "7": return { clave, desde: sumarDiasCalendario(hoy, -6), hasta: hoy };
    case "mes": return { clave, desde: primeroDelMes, hasta: hoy };
    case "mes-anterior": {
      const ultimoDelAnterior = sumarDiasCalendario(primeroDelMes, -1);
      return { clave, desde: `${ultimoDelAnterior.slice(0, 7)}-01`, hasta: ultimoDelAnterior };
    }
  }
}

/** El rango como instantes para la base: desde las 00:00 del primer día hasta las 00:00 del día siguiente al último. */
export function limitesDelRango(r: RangoVentas): { gte: Date; lt: Date } | null {
  if (!r.desde || !r.hasta) return null;
  return { gte: inicioDiaArgentino(r.desde), lt: inicioDiaArgentino(sumarDiasCalendario(r.hasta, 1)) };
}

/* ── La dirección ────────────────────────────────────────────────────────── */

/** Los estados que se pueden pedir por la dirección, y a qué se traducen. */
export const FILTROS_ESTADO = {
  cobradas: "CONFIRMED",
  esperando: "PENDING",
  canceladas: "CANCELLED",
} as const;
export type ClaveDeEstado = keyof typeof FILTROS_ESTADO;
export const esClaveDeEstado = (v: string): v is ClaveDeEstado => v in FILTROS_ESTADO;

/** Tope de la búsqueda: es un `contains` y una cadena enorme es una consulta cara pedida gratis. */
export const LARGO_MAXIMO_DE_BUSQUEDA = 120;
/** Tope de página pedida: más allá no hay lista que la tenga. */
const PAGINA_MAXIMA = 10_000;

export type ConsultaDeVentas = {
  estado: ClaveDeEstado | null;
  q: string;
  /** El producto pedido, todavía sin verificar que sea de la cuenta. */
  p: string | null;
  rango: RangoVentas;
  pagina: number;
};

/**
 * Lee la dirección sin creerle nada: el estado sólo puede ser una de tres
 * palabras nuestras, la búsqueda se recorta, la página es un entero sano
 * (`parseInt` de basura da `NaN`, y un `skip` con `NaN` rompe la consulta).
 */
export function leerConsulta(params: Record<string, string | string[] | undefined>, hoy: string): ConsultaDeVentas {
  const uno = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const estado = uno("estado");
  const pedida = Number.parseInt(uno("pagina") ?? "1", 10);
  const p = uno("p");
  return {
    estado: estado && esClaveDeEstado(estado) ? estado : null,
    q: (uno("q") ?? "").trim().slice(0, LARGO_MAXIMO_DE_BUSQUEDA),
    p: p && /^[A-Za-z0-9_-]{1,64}$/.test(p) ? p : null,
    rango: resolverRangoVentas(uno("rango"), hoy),
    pagina: Number.isFinite(pedida) && pedida > 0 ? Math.min(pedida, PAGINA_MAXIMA) : 1,
  };
}

/** Arma la dirección de la pantalla con lo que cambia; lo que es el valor por defecto no se escribe. */
export function direccionDeVentas(c: { p?: string | null; estado?: string | null; q?: string; rango?: string | null; pagina?: number }): string {
  const s = new URLSearchParams();
  if (c.p) s.set("p", c.p);
  if (c.rango && c.rango !== "todo") s.set("rango", c.rango);
  if (c.estado) s.set("estado", c.estado);
  if (c.q) s.set("q", c.q);
  /* La página 1 no se escribe: es la dirección limpia, la que se comparte. */
  if (c.pagina && c.pagina > 1) s.set("pagina", String(c.pagina));
  const cola = s.toString();
  return cola ? `/digitales/ventas?${cola}` : "/digitales/ventas";
}

/**
 * El `where` de la lista Y de los números de arriba. `elegido` ya viene
 * verificado como un producto de la cuenta (o `null`): acá no se vuelve a
 * mirar. Una compra es de un producto si tiene su línea; el principal siempre
 * está, con los bonos y el upsell colgando.
 */
export function dondeVentas(storeId: string, c: ConsultaDeVentas, elegido: string | null): Prisma.OrderWhereInput {
  const limites = limitesDelRango(c.rango);
  return {
    storeId,
    ...(elegido ? { items: { some: { productId: elegido } } } : {}),
    ...(limites ? { createdAt: limites } : {}),
    ...(c.estado ? { status: FILTROS_ESTADO[c.estado] } : {}),
    /* Se busca por correo y por nombre, que es lo que alguien tiene a mano
       cuando le escriben "no me llegó". */
    ...(c.q
      ? {
          buyer: {
            OR: [
              { email: { contains: c.q, mode: "insensitive" as const } },
              { name: { contains: c.q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };
}

/* ── Escribirle a quien compró ───────────────────────────────────────────── */

/**
 * El mensaje que se abre al apretar "Escribirle". Distinto si bajó el archivo
 * o no: al que no lo bajó se le pregunta si le llegó el mail, que es el
 * reclamo que todavía no hizo; al que sí, cómo le fue. Es un borrador: se abre
 * en su correo y lo cambia antes de mandar.
 */
export function mensajeParaElComprador(v: { nombre: string | null; producto: string; sinBajar: boolean }): { asunto: string; cuerpo: string } {
  const hola = v.nombre ? `Hola ${v.nombre.trim().split(/\s+/)[0]},` : "Hola,";
  if (v.sinBajar) {
    return {
      asunto: `Tu compra de ${v.producto}`,
      cuerpo: `${hola}\n\nTe escribo por tu compra de «${v.producto}». Vi que todavía no bajaste el archivo: ¿te llegó el mail con el enlace? Si no lo encontrás, fijate en la carpeta de spam, o decime y te lo mando de nuevo.\n\n¡Gracias por comprar!`,
    };
  }
  return {
    asunto: `¿Cómo te fue con ${v.producto}?`,
    cuerpo: `${hola}\n\nGracias por comprar «${v.producto}». Quería saber cómo te fue con el material y si te quedó alguna duda: contestame este mail y te ayudo.\n\n¡Gracias!`,
  };
}

/** Un `mailto:` con asunto y cuerpo. Todo va codificado: un `&` en el nombre del producto partiría el enlace. */
export function enlaceDeMail(correo: string, m: { asunto: string; cuerpo: string }): string {
  return `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(m.asunto)}&body=${encodeURIComponent(m.cuerpo)}`;
}

/**
 * Un enlace a WhatsApp, o `null` si el teléfono no sirve. Se arma el número
 * como lo quiere wa.me —sólo dígitos, con país— a partir de lo que la gente
 * escribe acá: con 0 adelante, con 15, con +54, con espacios y guiones.
 * Si después de limpiar no parece un celular argentino, mejor ningún botón
 * que uno que abre un chat con un desconocido.
 */
export function enlaceDeWhatsApp(telefono: string | null | undefined, m: { cuerpo: string }): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  /* El 15 va después del código de área (2 a 4 dígitos); wa.me no lo quiere.
     Sólo si sobran dos dígitos: en un número de diez, un 15 en el medio es
     parte del número (11 1555-1234 existe). */
  if (d.length === 12) d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  if (d.length !== 10) return null;
  return `https://wa.me/549${d}?text=${encodeURIComponent(m.cuerpo)}`;
}
