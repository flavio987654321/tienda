import { quisoDecir } from "@/lib/marcasVehiculos";

/**
 * La revisión de un vehículo antes de guardarlo (13/10/26).
 *
 * Lo que FALTA (marca, modelo, año) ya frena el guardado en el formulario. Esto
 * es lo que está cargado pero parece mal, y no frena: avisa y deja "guardar
 * igual". Hay casos raros que están bien —una marca que no conocemos, una moto
 * que se vende con 0 km de uso—, y bloquear ahí sería peor que el error.
 *
 * Se armó con una Hilux real: marca "Toyta", ficha de 2024 con 50.000 km y
 * automática, descripción de 2005 con 380.000 km y manual. Todo eso iba a salir
 * así en la tienda, en la ficha en PDF y en el catálogo de Meta.
 */
export type AvisoVehiculo = { campo: string; texto: string };

const plano = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const miles = (n: number) => n.toLocaleString("es-AR");

/** "28.000", "28000 km", "28 000" → 28000. Vacío o basura → null. */
export function kmDe(v: string | undefined): number | null {
  const d = String(v ?? "").replace(/[^\d]/g, "");
  return d ? Number(d) : null;
}

/** Los años que se mencionan en un texto (1950 a 2049). */
export function aniosEn(texto: string): number[] {
  return [...new Set([...texto.matchAll(/\b(19[5-9]\d|20[0-4]\d)\b/g)].map((m) => Number(m[1])))];
}

/** Los kilómetros que se mencionan: "380000 km", "85.000 kms", "120 mil km". */
export function kmsEn(texto: string): number[] {
  const out: number[] = [];
  for (const m of texto.matchAll(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*(mil\s*)?(?:km|kms|kilometros|kilómetros)\b/gi)) {
    const n = Number(m[1].replace(/[.\s]/g, "")) * (m[2] ? 1000 : 1);
    if (Number.isFinite(n)) out.push(n);
  }
  return [...new Set(out)];
}

export function revisarVehiculo({ valor, campos, categoria, condicion, descripcion }: {
  /** El valor de un campo de la ficha por su nombre ("Marca", "Año"...). */
  valor: (label: string) => string;
  /** Los nombres de los campos que ESTE tipo de vehículo muestra en el formulario. */
  campos: string[];
  categoria: string;
  condicion: string;
  /** La descripción, en el HTML del editor. */
  descripcion: string;
}): AvisoVehiculo[] {
  const avisos: AvisoVehiculo[] = [];
  const texto = plano(descripcion);
  const tieneCampo = (l: string) => campos.includes(l);

  // ── La marca ──
  const marca = valor("Marca");
  const quiso = marca ? quisoDecir(marca) : null;
  if (quiso) avisos.push({ campo: "Marca", texto: `La marca dice "${marca}". ¿No es "${quiso}"? Así como está, no aparece junto a los otros ${quiso} de la tienda.` });

  // ── Los kilómetros contra la condición ──
  const km = tieneCampo("Kilómetros") ? kmDe(valor("Kilómetros")) : null;
  const es0km = /^0\s*km$/i.test(condicion.trim());
  if (tieneCampo("Kilómetros") && valor("Kilómetros") && km === null) {
    avisos.push({ campo: "Kilómetros", texto: `Los kilómetros tienen que ser un número (por ejemplo 85000).` });
  }
  if (es0km && km !== null && km > 1000) {
    avisos.push({ campo: "Kilómetros", texto: `Está marcado como 0 km pero tiene ${miles(km)} km cargados.` });
  }
  if (!es0km && km === 0 && categoria !== "maquinaria") {
    avisos.push({ campo: "Kilómetros", texto: `Es usado y tiene 0 km. Si es nuevo, elegí "0 km" en Condición; si no, cargá los kilómetros.` });
  }

  // ── La descripción contra la ficha ──
  if (texto) {
    const anio = Number(valor("Año"));
    const anios = aniosEn(texto);
    if (anio && anios.length && !anios.includes(anio)) {
      avisos.push({ campo: "Año", texto: `La ficha dice ${anio} y la descripción menciona ${anios.join(", ")}. ¿Cuál es el año?` });
    }
    const kms = kmsEn(texto);
    if (km !== null && km > 0 && kms.length && !kms.some((k) => Math.abs(k - km) <= Math.max(1000, km * 0.1))) {
      avisos.push({ campo: "Kilómetros", texto: `La ficha dice ${miles(km)} km y la descripción ${kms.map(miles).join(" / ")} km. ¿Cuántos tiene?` });
    }
    const caja = sinAcentos(valor("Transmisión"));
    const t = sinAcentos(texto);
    const diceManual = /\b(caja|transmision)\s+manual\b|\bmanual\b/.test(t);
    const diceAuto = /\bautomatic[ao]\b|\bcvt\b/.test(t);
    if (caja && ((caja.startsWith("manual") && diceAuto && !diceManual) || ((caja.startsWith("automat") || caja === "cvt") && diceManual && !diceAuto))) {
      avisos.push({ campo: "Transmisión", texto: `La ficha dice "${valor("Transmisión")}" y la descripción dice ${diceManual ? "manual" : "automática"}.` });
    }
  }

  // ── Lo que pide el catálogo de Facebook e Instagram ──
  const paraMeta = ["Carrocería", "Color", "Provincia"].filter((l) => tieneCampo(l) && !valor(l));
  if (paraMeta.length) {
    avisos.push({ campo: paraMeta[0], texto: `Falta ${paraMeta.join(", ").replace(/, ([^,]*)$/, " y $1").toLowerCase()}: sin eso el vehículo no puede salir en el catálogo de Facebook e Instagram.` });
  }
  return avisos;
}
