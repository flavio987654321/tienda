/**
 * El teléfono en dos partes: característica y número (08/10/26).
 *
 * Antes cada formulario tenía un campo libre: la gente escribía "0341 15 555
 * 1234", "3415551234" o "15 5551234" (sin característica), y el link de
 * WhatsApp de las consultas fallaba cuando faltaba la característica. Ahora el
 * campo (`components/CampoTelefono`) pide la característica con buscador y el
 * número aparte, y lo guarda siempre igual: `+54 9 341 555-1234`. Ese formato
 * pasa `validarTelefono`, `numeroWhatsApp` y `celularArgentino`, así que los
 * servidores y los links no cambian.
 *
 * En Argentina característica + número son siempre 10 dígitos: 11 + 8,
 * 341 + 7, 2254 + 6. Con eso se sabe cuántos faltan sin conocer cada ciudad.
 */
import { celularArgentino } from "@/lib/ventas-digitales";
import { esWhatsappDeEjemplo } from "@/lib/configPublica";

export type Caracteristica = { codigo: string; lugar: string };

/** Las más buscadas. No están todas (son ~300): una que no esté se escribe a mano. */
export const CARACTERISTICAS: Caracteristica[] = [
  { codigo: "11", lugar: "Buenos Aires (CABA y GBA)" },
  { codigo: "221", lugar: "La Plata" },
  { codigo: "223", lugar: "Mar del Plata" },
  { codigo: "230", lugar: "Pilar" },
  { codigo: "237", lugar: "Moreno" },
  { codigo: "2254", lugar: "Pinamar" },
  { codigo: "2255", lugar: "Villa Gesell" },
  { codigo: "2252", lugar: "San Clemente del Tuyú" },
  { codigo: "2262", lugar: "Necochea" },
  { codigo: "2266", lugar: "Balcarce" },
  { codigo: "2281", lugar: "Azul" },
  { codigo: "2284", lugar: "Olavarría" },
  { codigo: "2293", lugar: "Tandil" },
  { codigo: "2346", lugar: "Chivilcoy" },
  { codigo: "2362", lugar: "Junín" },
  { codigo: "2392", lugar: "Trenque Lauquen" },
  { codigo: "2477", lugar: "Pergamino" },
  { codigo: "2983", lugar: "Tres Arroyos" },
  { codigo: "291", lugar: "Bahía Blanca" },
  { codigo: "2954", lugar: "Santa Rosa (La Pampa)" },
  { codigo: "2302", lugar: "General Pico" },
  { codigo: "351", lugar: "Córdoba" },
  { codigo: "3541", lugar: "Villa Carlos Paz" },
  { codigo: "353", lugar: "Villa María" },
  { codigo: "358", lugar: "Río Cuarto" },
  { codigo: "3564", lugar: "San Francisco" },
  { codigo: "341", lugar: "Rosario" },
  { codigo: "342", lugar: "Santa Fe" },
  { codigo: "3462", lugar: "Venado Tuerto" },
  { codigo: "3492", lugar: "Rafaela" },
  { codigo: "3482", lugar: "Reconquista" },
  { codigo: "343", lugar: "Paraná" },
  { codigo: "345", lugar: "Concordia" },
  { codigo: "3442", lugar: "Concepción del Uruguay" },
  { codigo: "3446", lugar: "Gualeguaychú" },
  { codigo: "379", lugar: "Corrientes" },
  { codigo: "376", lugar: "Posadas" },
  { codigo: "3757", lugar: "Puerto Iguazú" },
  { codigo: "3755", lugar: "Oberá" },
  { codigo: "362", lugar: "Resistencia" },
  { codigo: "364", lugar: "Presidencia Roque Sáenz Peña" },
  { codigo: "370", lugar: "Formosa" },
  { codigo: "381", lugar: "San Miguel de Tucumán" },
  { codigo: "385", lugar: "Santiago del Estero" },
  { codigo: "387", lugar: "Salta" },
  { codigo: "388", lugar: "San Salvador de Jujuy" },
  { codigo: "383", lugar: "Catamarca" },
  { codigo: "380", lugar: "La Rioja" },
  { codigo: "261", lugar: "Mendoza" },
  { codigo: "260", lugar: "San Rafael" },
  { codigo: "264", lugar: "San Juan" },
  { codigo: "266", lugar: "San Luis" },
  { codigo: "2657", lugar: "Villa Mercedes" },
  { codigo: "299", lugar: "Neuquén" },
  { codigo: "2972", lugar: "San Martín de los Andes" },
  { codigo: "2944", lugar: "San Carlos de Bariloche" },
  { codigo: "2920", lugar: "Viedma" },
  { codigo: "280", lugar: "Trelew, Rawson y Puerto Madryn" },
  { codigo: "297", lugar: "Comodoro Rivadavia" },
  { codigo: "2966", lugar: "Río Gallegos" },
  { codigo: "2902", lugar: "El Calafate" },
  { codigo: "2901", lugar: "Ushuaia" },
  { codigo: "2964", lugar: "Río Grande" },
];

export const DIGITOS_AR = 10;

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Para el buscador: por nombre (sin importar tildes) o por los números del código. */
export function buscarCaracteristica(q: string): Caracteristica[] {
  const t = sinTildes(q.trim()).replace(/^0+/, "");
  if (!t) return CARACTERISTICAS;
  const soloDigitos = /^\d+$/.test(t);
  return CARACTERISTICAS
    .filter((c) => (soloDigitos ? c.codigo.startsWith(t) : sinTildes(c.lugar).includes(t)))
    // Primero las que empiezan con lo escrito: "rosa" es Rosario antes que Santa Rosa.
    .sort((a, b) => soloDigitos
      ? a.codigo.length - b.codigo.length
      : Number(!sinTildes(a.lugar).startsWith(t)) - Number(!sinTildes(b.lugar).startsWith(t)));
}

/** Una característica que se escribió a mano: 2 a 4 dígitos, empieza con 1, 2 o 3, sin el 0. */
export function caracteristicaValida(codigo: string): boolean {
  return /^[123]\d{1,3}$/.test(codigo);
}

export function lugarDe(codigo: string): string | null {
  return CARACTERISTICAS.find((c) => c.codigo === codigo)?.lugar ?? null;
}

/** Cuántos dígitos lleva el número con esa característica (11 → 8, 341 → 7). */
export function largoDelNumero(codigo: string): number {
  return DIGITOS_AR - codigo.length;
}

/** El número sin el 15 de adelante ni lo que no sea dígito. */
export function limpiarNumero(numero: string, codigo: string): string {
  let d = numero.replace(/\D/g, "");
  if (d.startsWith("15") && d.length === largoDelNumero(codigo) + 2) d = d.slice(2);
  return d;
}

/** "5551234" → "555-1234"; "55551234" → "5555-1234". */
function conGuion(d: string): string {
  return d.length > 4 ? `${d.slice(0, d.length - 4)}-${d.slice(-4)}` : d;
}

/** Lo que se guarda: `+54 9 341 555-1234`. Vacío si no hay número. */
export function armarTelefono(codigo: string, numero: string): string {
  const d = limpiarNumero(numero, codigo);
  if (!d) return "";
  return codigo ? `+54 9 ${codigo} ${conGuion(d)}` : d;
}

export type PartesTelefono =
  | { pais: "AR"; codigo: string; numero: string }
  | { pais: "otro"; texto: string };

/**
 * Lo guardado (o lo que alguien pegó) separado en partes. Lee también los
 * números viejos escritos a mano: "0341 15 555-1234", "3415551234", "+54 9 11 …".
 * La característica se reconoce por la lista (la más larga que coincida); si no
 * está en la lista, se supone la de 3 dígitos, que es la más común.
 */
export function separarTelefono(valor: string | null | undefined): PartesTelefono {
  const v = (valor ?? "").trim();
  // El número de ejemplo de fábrica ("+54 9 11 0000-0000") es como no tener ninguno.
  if (!v || esWhatsappDeEjemplo(v)) return { pais: "AR", codigo: "", numero: "" };
  const d = v.replace(/\D/g, "");
  const esOtroPais = (v.startsWith("+") || d.startsWith("00")) && !d.replace(/^00/, "").startsWith("54");
  if (esOtroPais) return { pais: "otro", texto: v };
  const diez = celularArgentino(v);
  if (!diez) return { pais: "AR", codigo: "", numero: d.slice(0, DIGITOS_AR) };
  const codigo = diez.startsWith("11") ? "11"
    : [4, 3, 2].map((n) => diez.slice(0, n)).find((c) => lugarDe(c)) ?? diez.slice(0, 3);
  return { pais: "AR", codigo, numero: diez.slice(codigo.length) };
}

/** Qué le falta, en castellano, o null si está completo. */
export function queFalta(codigo: string, numero: string): string | null {
  const d = limpiarNumero(numero, codigo);
  if (!d) return null;
  if (!codigo) return "Elegí la característica.";
  const falta = largoDelNumero(codigo) - d.length;
  if (falta > 0) return `Falta${falta > 1 ? "n" : ""} ${falta} número${falta > 1 ? "s" : ""}.`;
  if (falta < 0) return `Sobra${falta < -1 ? "n" : ""} ${-falta} número${falta < -1 ? "s" : ""}: con la ${codigo} van ${largoDelNumero(codigo)}.`;
  return null;
}

/** Para un teléfono obligatorio: el problema en castellano, o null si está bien. */
export function errorDeTelefono(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v) return "Poné tu teléfono.";
  const p = separarTelefono(v);
  if (p.pais === "otro") {
    const d = v.replace(/\D/g, "");
    return d.length >= 8 && d.length <= 15 ? null : "Revisá el número: va con el código del país.";
  }
  if (!p.codigo) return "Elegí la característica.";
  return queFalta(p.codigo, p.numero);
}
