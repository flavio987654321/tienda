/**
 * La ficha técnica de un vehículo (06/10/26).
 *
 * Es lo que va más allá de los 15 datos de siempre (marca, modelo, año, km…):
 * **equipamiento**, **papeles y condiciones**, **motor y prestaciones** y
 * **medidas**, más un **folleto propio** opcional (el PDF de fábrica de un 0 km,
 * por ejemplo). Con esto se arma la ficha que se ve en el modal del vehículo y
 * el PDF que se descarga (`fichaVehiculoPdf.ts`).
 *
 * ── Dónde se guarda ─────────────────────────────────────────────────────────
 *
 * Como un atributo más del producto, con la clave `CLAVE_FICHA` y el valor en
 * JSON — igual que el historial de "Servicios". No es una columna nueva a
 * propósito: el servidor local corre contra la base de producción y una
 * columna que todavía no existe ahí rompe cualquier consulta de productos.
 *
 * ⚠️ Por eso **todo lo que liste atributos tiene que saltear esta clave** (ver
 * `esAtributoInterno`), como ya pasaba con "Servicios" y "Condición".
 *
 * Este archivo no importa nada de servidor: lo usan el formulario, el modal de
 * la tienda y el armado del PDF.
 */

import { CLAVE_MONEDA } from "./monedaVehiculo";

export const CLAVE_FICHA = "Ficha";

/** Los atributos que no son "un dato más" y no se listan tal cual. */
export function esAtributoInterno(key: string): boolean {
  return key === "Condición" || key === "Servicios" || key === CLAVE_FICHA || key === CLAVE_MONEDA;
}

export type TipoDeFicha = "auto" | "moto" | "camion" | "utilitario" | "agro" | "cuatri";

/**
 * Las categorías que son VEHÍCULOS (06/10/26): unidades que se compran, se
 * venden de a una, llevan marca, modelo y año, ficha técnica, tasación y
 * "Avisame si entra". Repuestos y accesorios no. Es la única lista: el resto
 * del código pregunta acá en vez de repetir "autos, motos, camionetas".
 */
export const CATEGORIAS_VEHICULO = ["autos", "camionetas", "motos", "camiones", "utilitarios", "maquinaria", "cuatriciclos"] as const;
export type CategoriaVehiculo = (typeof CATEGORIAS_VEHICULO)[number];

export function esVehiculo(category: string | null | undefined): boolean {
  return (CATEGORIAS_VEHICULO as readonly string[]).includes((category ?? "").toLowerCase().trim());
}

/** Cómo se nombra cada tipo, en singular y plural. */
export const NOMBRE_TIPO: Record<CategoriaVehiculo, { uno: string; varios: string }> = {
  autos: { uno: "Auto", varios: "Autos" },
  camionetas: { uno: "Camioneta", varios: "Camionetas" },
  motos: { uno: "Moto", varios: "Motos" },
  camiones: { uno: "Camión", varios: "Camiones" },
  utilitarios: { uno: "Utilitario", varios: "Utilitarios" },
  maquinaria: { uno: "Máquina agrícola", varios: "Maquinaria agrícola" },
  cuatriciclos: { uno: "Cuatriciclo / UTV", varios: "Cuatris y UTV" },
};

/** Una máquina agrícola se mide en horas de uso; el resto, en kilómetros. */
export const usaHoras = (category: string | null | undefined) => (category ?? "").toLowerCase().trim() === "maquinaria";

/** Qué ficha técnica lleva cada tipo. Repuestos y accesorios, ninguna. */
export function tipoDeFicha(category: string | null | undefined): TipoDeFicha | null {
  const c = (category ?? "").toLowerCase().trim();
  if (c === "autos" || c === "camionetas") return "auto";
  if (c === "motos") return "moto";
  if (c === "camiones") return "camion";
  if (c === "utilitarios") return "utilitario";
  if (c === "maquinaria") return "agro";
  if (c === "cuatriciclos") return "cuatri";
  return null;
}

type Item = { id: string; label: string };

export const EQUIPAMIENTO: Record<TipoDeFicha, Item[]> = {
  auto: [
    { id: "aire", label: "Aire acondicionado" },
    { id: "climatizador", label: "Climatizador automático" },
    { id: "direccion", label: "Dirección asistida" },
    { id: "vidrios", label: "Levantavidrios eléctricos" },
    { id: "cierre", label: "Cierre centralizado" },
    { id: "alarma", label: "Alarma" },
    { id: "airbags", label: "Airbags frontales" },
    { id: "airbagsLaterales", label: "Airbags laterales y de cortina" },
    { id: "abs", label: "Frenos ABS" },
    { id: "estabilidad", label: "Control de estabilidad" },
    { id: "crucero", label: "Control de crucero" },
    { id: "isofix", label: "Anclajes ISOFIX" },
    { id: "camara", label: "Cámara de retroceso" },
    { id: "sensores", label: "Sensores de estacionamiento" },
    { id: "pantalla", label: "Pantalla táctil" },
    { id: "carplay", label: "Android Auto / Apple CarPlay" },
    { id: "bluetooth", label: "Bluetooth" },
    { id: "sinLlave", label: "Arranque sin llave" },
    { id: "techo", label: "Techo solar" },
    { id: "llantas", label: "Llantas de aleación" },
    { id: "cuero", label: "Tapizado de cuero" },
    { id: "led", label: "Faros LED" },
    { id: "enganche", label: "Enganche" },
  ],
  moto: [
    { id: "abs", label: "Frenos ABS" },
    { id: "discos", label: "Frenos a disco" },
    { id: "arranque", label: "Arranque eléctrico" },
    { id: "inyeccion", label: "Inyección electrónica" },
    { id: "controlTraccion", label: "Control de tracción" },
    { id: "modos", label: "Modos de manejo" },
    { id: "tablero", label: "Tablero digital" },
    { id: "led", label: "Luces LED" },
    { id: "usb", label: "Cargador USB" },
    { id: "parabrisas", label: "Parabrisas" },
    { id: "cubrepunos", label: "Cubre puños" },
    { id: "defensas", label: "Defensas" },
    { id: "baul", label: "Baúl" },
    { id: "alforjas", label: "Alforjas" },
  ],
  camion: [
    { id: "aire", label: "Aire acondicionado" },
    { id: "direccion", label: "Dirección asistida" },
    { id: "abs", label: "Frenos ABS" },
    { id: "frenoMotor", label: "Freno motor" },
    { id: "retarder", label: "Retarder" },
    { id: "suspensionNeumatica", label: "Suspensión neumática" },
    { id: "cajaAutomatizada", label: "Caja automatizada" },
    { id: "bloqueoDiferencial", label: "Bloqueo de diferencial" },
    { id: "cabinaCama", label: "Cabina con cama" },
    { id: "rastreo", label: "Rastreo satelital" },
    { id: "tacografo", label: "Tacógrafo digital" },
    { id: "quintaRueda", label: "Quinta rueda" },
    { id: "deflector", label: "Deflector de techo" },
    { id: "camara", label: "Cámara de retroceso" },
    { id: "enganche", label: "Enganche" },
  ],
  utilitario: [
    { id: "aire", label: "Aire acondicionado" },
    { id: "direccion", label: "Dirección asistida" },
    { id: "vidrios", label: "Levantavidrios eléctricos" },
    { id: "cierre", label: "Cierre centralizado" },
    { id: "airbags", label: "Airbags frontales" },
    { id: "abs", label: "Frenos ABS" },
    { id: "puertaLateral", label: "Puerta lateral corrediza" },
    { id: "puertaLateralDoble", label: "Dos puertas laterales" },
    { id: "puertasTraseras", label: "Puertas traseras batientes" },
    { id: "techoAlto", label: "Techo alto" },
    { id: "mampara", label: "Mampara divisoria" },
    { id: "pisoCarga", label: "Piso de carga revestido" },
    { id: "sensores", label: "Sensores de estacionamiento" },
    { id: "camara", label: "Cámara de retroceso" },
    { id: "bluetooth", label: "Bluetooth" },
    { id: "enganche", label: "Enganche" },
  ],
  agro: [
    { id: "cabinaCerrada", label: "Cabina cerrada" },
    { id: "aire", label: "Aire acondicionado" },
    { id: "pilotoAutomatico", label: "Piloto automático / GPS" },
    { id: "monitorRendimiento", label: "Monitor de rendimiento" },
    { id: "tomaFuerza", label: "Toma de fuerza" },
    { id: "tresPuntos", label: "Enganche de tres puntos" },
    { id: "remotos", label: "Remotos hidráulicos" },
    { id: "rodadoDual", label: "Rodado dual" },
    { id: "doblePrecision", label: "Corte por secciones" },
    { id: "pala", label: "Pala frontal" },
    { id: "cabezal", label: "Con cabezal / plataforma" },
  ],
  cuatri: [
    { id: "traccion4x4", label: "Tracción 4x4 seleccionable" },
    { id: "direccion", label: "Dirección asistida" },
    { id: "arranque", label: "Arranque eléctrico" },
    { id: "inyeccion", label: "Inyección electrónica" },
    { id: "discos", label: "Frenos a disco" },
    { id: "malacate", label: "Malacate" },
    { id: "jaula", label: "Jaula antivuelco" },
    { id: "techo", label: "Techo" },
    { id: "parabrisas", label: "Parabrisas" },
    { id: "cinturones", label: "Cinturones de seguridad" },
    { id: "led", label: "Luces LED" },
    { id: "enganche", label: "Enganche" },
  ],
};

export const PAPELES: Item[] = [
  { id: "unicoDueno", label: "Único dueño" },
  { id: "vtv", label: "VTV / RTO al día" },
  { id: "papeles", label: "Papeles al día" },
  { id: "patentes", label: "Patentes sin deuda" },
  { id: "multas", label: "Sin multas" },
  { id: "transferible", label: "Listo para transferir" },
  { id: "serviceOficial", label: "Services en concesionario oficial" },
  { id: "llaves", label: "Duplicado de llave" },
  { id: "manuales", label: "Manuales" },
  { id: "garantia", label: "Con garantía" },
  { id: "permuta", label: "Acepta permuta" },
  { id: "financiacion", label: "Financiación disponible" },
];

/**
 * Un dato con unidad. `decimal` sólo para los que de verdad llevan coma
 * (consumo, aceleración): en el resto el punto es de miles ("4.350 mm") y se
 * guardan sólo los dígitos — la misma regla que los kilómetros.
 */
export type CampoNumerico = { id: string; label: string; unidad: string; ejemplo: string; decimal?: boolean };

export const MOTOR: Record<TipoDeFicha, CampoNumerico[]> = {
  auto: [
    { id: "potencia", label: "Potencia", unidad: "CV", ejemplo: "150" },
    { id: "torque", label: "Torque", unidad: "Nm", ejemplo: "250" },
    { id: "cilindrada", label: "Cilindrada", unidad: "cc", ejemplo: "1998" },
    { id: "consumo", label: "Consumo mixto", unidad: "l/100 km", ejemplo: "6,8", decimal: true },
    { id: "velocidad", label: "Velocidad máxima", unidad: "km/h", ejemplo: "200" },
    { id: "aceleracion", label: "0 a 100 km/h", unidad: "s", ejemplo: "9,5", decimal: true },
    { id: "tanque", label: "Tanque", unidad: "litros", ejemplo: "50" },
  ],
  moto: [
    { id: "potencia", label: "Potencia", unidad: "CV", ejemplo: "47" },
    { id: "torque", label: "Torque", unidad: "Nm", ejemplo: "43" },
    { id: "cilindrada", label: "Cilindrada", unidad: "cc", ejemplo: "471" },
    { id: "consumoMoto", label: "Consumo", unidad: "km/l", ejemplo: "25", decimal: true },
    { id: "velocidad", label: "Velocidad máxima", unidad: "km/h", ejemplo: "170" },
    { id: "tanque", label: "Tanque", unidad: "litros", ejemplo: "17" },
  ],
  camion: [
    { id: "potencia", label: "Potencia", unidad: "CV", ejemplo: "260" },
    { id: "torque", label: "Torque", unidad: "Nm", ejemplo: "1000" },
    { id: "cilindrada", label: "Cilindrada", unidad: "cc", ejemplo: "7200" },
    { id: "marchas", label: "Marchas", unidad: "", ejemplo: "12" },
    { id: "consumo", label: "Consumo mixto", unidad: "l/100 km", ejemplo: "28", decimal: true },
    { id: "tanque", label: "Tanque", unidad: "litros", ejemplo: "300" },
  ],
  utilitario: [
    { id: "potencia", label: "Potencia", unidad: "CV", ejemplo: "115" },
    { id: "torque", label: "Torque", unidad: "Nm", ejemplo: "300" },
    { id: "cilindrada", label: "Cilindrada", unidad: "cc", ejemplo: "1600" },
    { id: "consumo", label: "Consumo mixto", unidad: "l/100 km", ejemplo: "7,5", decimal: true },
    { id: "tanque", label: "Tanque", unidad: "litros", ejemplo: "60" },
  ],
  agro: [
    { id: "potencia", label: "Potencia", unidad: "CV", ejemplo: "145" },
    { id: "cilindrada", label: "Cilindrada", unidad: "cc", ejemplo: "6800" },
    { id: "levante", label: "Capacidad de levante", unidad: "kg", ejemplo: "5000" },
    { id: "tanque", label: "Tanque", unidad: "litros", ejemplo: "300" },
  ],
  cuatri: [
    { id: "potencia", label: "Potencia", unidad: "CV", ejemplo: "48" },
    { id: "cilindrada", label: "Cilindrada", unidad: "cc", ejemplo: "570" },
    { id: "velocidad", label: "Velocidad máxima", unidad: "km/h", ejemplo: "100" },
    { id: "tanque", label: "Tanque", unidad: "litros", ejemplo: "20" },
  ],
};

export const MEDIDAS: Record<TipoDeFicha, CampoNumerico[]> = {
  auto: [
    { id: "largo", label: "Largo", unidad: "mm", ejemplo: "4630" },
    { id: "ancho", label: "Ancho", unidad: "mm", ejemplo: "1780" },
    { id: "alto", label: "Alto", unidad: "mm", ejemplo: "1435" },
    { id: "entreEjes", label: "Distancia entre ejes", unidad: "mm", ejemplo: "2700" },
    { id: "baul", label: "Baúl", unidad: "litros", ejemplo: "470" },
    { id: "peso", label: "Peso", unidad: "kg", ejemplo: "1300" },
    { id: "plazas", label: "Plazas", unidad: "", ejemplo: "5" },
  ],
  moto: [
    { id: "alturaAsiento", label: "Altura del asiento", unidad: "mm", ejemplo: "785" },
    { id: "entreEjes", label: "Distancia entre ejes", unidad: "mm", ejemplo: "1410" },
    { id: "peso", label: "Peso", unidad: "kg", ejemplo: "192" },
    { id: "plazas", label: "Plazas", unidad: "", ejemplo: "2" },
  ],
  camion: [
    { id: "ejes", label: "Ejes", unidad: "", ejemplo: "3" },
    { id: "cargaUtil", label: "Carga útil", unidad: "kg", ejemplo: "15000" },
    { id: "pbt", label: "Peso bruto total", unidad: "kg", ejemplo: "26000" },
    { id: "largoCaja", label: "Largo de caja", unidad: "mm", ejemplo: "8500" },
    { id: "entreEjes", label: "Distancia entre ejes", unidad: "mm", ejemplo: "4800" },
    { id: "plazas", label: "Plazas", unidad: "", ejemplo: "2" },
  ],
  utilitario: [
    { id: "cargaUtil", label: "Carga útil", unidad: "kg", ejemplo: "800" },
    { id: "volumenCarga", label: "Volumen de carga", unidad: "m³", ejemplo: "3,3", decimal: true },
    { id: "largo", label: "Largo", unidad: "mm", ejemplo: "4280" },
    { id: "alto", label: "Alto", unidad: "mm", ejemplo: "1840" },
    { id: "plazas", label: "Plazas", unidad: "", ejemplo: "2" },
  ],
  agro: [
    { id: "peso", label: "Peso", unidad: "kg", ejemplo: "6500" },
    { id: "anchoLabor", label: "Ancho de labor", unidad: "m", ejemplo: "9,1", decimal: true },
    { id: "entreEjes", label: "Distancia entre ejes", unidad: "mm", ejemplo: "2800" },
  ],
  cuatri: [
    { id: "peso", label: "Peso", unidad: "kg", ejemplo: "320" },
    { id: "alturaAsiento", label: "Altura del asiento", unidad: "mm", ejemplo: "880" },
    { id: "plazas", label: "Plazas", unidad: "", ejemplo: "2" },
  ],
};

export type FolletoPropio = { url: string; nombre: string };

export type FichaVehiculo = {
  equipamiento: string[];
  papeles: string[];
  /** Motor y medidas juntos, por id de campo. */
  datos: Record<string, string>;
  folleto: FolletoPropio | null;
};

export const FICHA_VACIA: FichaVehiculo = { equipamiento: [], papeles: [], datos: {}, folleto: null };

/** El tope del valor guardado. Alcanza con todo tildado y todos los datos cargados. */
export const LARGO_MAXIMO_FICHA = 3000;

const IDS_EQUIPAMIENTO = new Set(Object.values(EQUIPAMIENTO).flat().map((i) => i.id));
const IDS_PAPELES = new Set(PAPELES.map((i) => i.id));
/* Un mismo id ("peso", "potencia") puede estar en varios tipos: siempre con la
   misma unidad y la misma regla de decimales (lo cuida el chequeo). */
const CAMPOS = new Map<string, CampoNumerico>(
  [...Object.values(MOTOR).flat(), ...Object.values(MEDIDAS).flat()].map((c) => [c.id, c]),
);

/**
 * Lo que se tipea en un dato numérico, como queda guardado. Enteros: sólo
 * dígitos. Decimales: dígitos y UNA coma (el punto también se toma como coma,
 * que es lo que se quiere decir al escribir "6.8 l/100 km").
 */
export function limpiarDato(id: string, valor: string): string {
  const campo = CAMPOS.get(id);
  if (!campo?.decimal) return valor.replace(/\D/g, "").slice(0, 6);
  const [entero, ...resto] = valor.replace(/\./g, ",").replace(/[^\d,]/g, "").split(",");
  return (resto.length ? `${entero},${resto.join("").slice(0, 2)}` : entero).slice(0, 7);
}

/**
 * El folleto sólo puede ser un archivo que subimos nosotros: el depósito
 * público de Supabase, o `/uploads/` en local. Es un botón de "descargar" en
 * la tienda de otra persona; un link a cualquier sitio ahí es una trampa
 * servida con nuestra cara.
 */
export function esFolletoNuestro(u: unknown): u is string {
  if (typeof u !== "string") return false;
  const t = u.trim();
  if (t.length > 600 || /\s/.test(t)) return false;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (supabase && t.startsWith(`${supabase}/storage/v1/object/public/`)) return true;
  return t.startsWith("/uploads/");
}

/**
 * La ficha a partir de los atributos, tolerante: lo que no se reconoce se
 * descarta en silencio. Un JSON roto o de otra versión no puede tirar abajo el
 * modal de un vehículo publicado.
 */
export function leerFicha(attributes: { key: string; value: unknown }[] | null | undefined): FichaVehiculo {
  const crudo = attributes?.find((a) => a?.key === CLAVE_FICHA)?.value;
  if (typeof crudo !== "string" || !crudo.trim()) return { ...FICHA_VACIA };
  let j: unknown;
  try { j = JSON.parse(crudo); } catch { return { ...FICHA_VACIA }; }
  if (!j || typeof j !== "object") return { ...FICHA_VACIA };
  const o = j as Record<string, unknown>;

  const lista = (v: unknown, validos: Set<string>) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && validos.has(x)))] : [];

  const datos: Record<string, string> = {};
  if (o.datos && typeof o.datos === "object") {
    for (const [id, v] of Object.entries(o.datos as Record<string, unknown>)) {
      if (!CAMPOS.has(id) || (typeof v !== "string" && typeof v !== "number")) continue;
      const limpio = limpiarDato(id, String(v));
      if (limpio && /\d/.test(limpio)) datos[id] = limpio;
    }
  }

  let folleto: FolletoPropio | null = null;
  const f = o.folleto as { url?: unknown; nombre?: unknown } | null | undefined;
  const url = f?.url;
  if (esFolletoNuestro(url)) {
    const nombre = typeof f?.nombre === "string" && f.nombre.trim() ? f.nombre.trim().slice(0, 80) : "Folleto";
    folleto = { url: url.trim(), nombre };
  }

  return { equipamiento: lista(o.equipamiento, IDS_EQUIPAMIENTO), papeles: lista(o.papeles, IDS_PAPELES), datos, folleto };
}

export function fichaVacia(f: FichaVehiculo): boolean {
  return f.equipamiento.length === 0 && f.papeles.length === 0 && Object.keys(f.datos).length === 0 && !f.folleto;
}

/** El atributo a guardar, o `null` si no hay nada cargado (no se guarda una ficha vacía). */
export function fichaComoAtributo(f: FichaVehiculo): { key: string; value: string } | null {
  if (fichaVacia(f)) return null;
  return { key: CLAVE_FICHA, value: JSON.stringify(f) };
}

/** "4.630 mm", "6,8 l/100 km", "5". */
export function datoConUnidad(campo: CampoNumerico, valor: string): string {
  const numero = campo.decimal ? valor : Number(valor).toLocaleString("es-AR");
  return campo.unidad ? `${numero} ${campo.unidad}` : numero;
}

export type FilaDeFicha = { label: string; valor: string };

export type BloquesDeFicha = {
  equipamiento: string[];
  papeles: string[];
  motor: FilaDeFicha[];
  medidas: FilaDeFicha[];
  folleto: FolletoPropio | null;
};

/**
 * La ficha lista para mostrar, en el orden de las listas. Lo tildado que no es
 * de este tipo (un auto que pasó a la categoría motos) no se muestra: una moto
 * con "Techo solar" es peor que una moto sin ese dato.
 */
export function bloquesDeFicha(f: FichaVehiculo, tipo: TipoDeFicha): BloquesDeFicha {
  const filas = (campos: CampoNumerico[]) =>
    campos.filter((c) => f.datos[c.id]).map((c) => ({ label: c.label, valor: datoConUnidad(c, f.datos[c.id]) }));
  return {
    equipamiento: EQUIPAMIENTO[tipo].filter((i) => f.equipamiento.includes(i.id)).map((i) => i.label),
    papeles: PAPELES.filter((i) => f.papeles.includes(i.id)).map((i) => i.label),
    motor: filas(MOTOR[tipo]),
    medidas: filas(MEDIDAS[tipo]),
    folleto: f.folleto,
  };
}

export function hayBloques(b: BloquesDeFicha): boolean {
  return b.equipamiento.length > 0 || b.papeles.length > 0 || b.motor.length > 0 || b.medidas.length > 0;
}

/** Donde se ve la ficha generada; con `descargar`, el navegador la baja como archivo en vez de abrirla. */
export function urlFichaPdf(productId: string, descargar = false): string {
  return `/api/public/ficha-vehiculo/${encodeURIComponent(productId)}${descargar ? "?descargar=1" : ""}`;
}

export type ItemDeControl = { label: string; tiene: boolean };

/** El equipamiento y los papeles como lista de control COMPLETA del tipo: lo que tiene
    y lo que no se informó. La usan la hoja de la página y el PDF, para que digan lo mismo. */
export function controlDeFicha(f: FichaVehiculo, tipo: TipoDeFicha): { equipamiento: ItemDeControl[]; papeles: ItemDeControl[] } {
  return {
    equipamiento: EQUIPAMIENTO[tipo].map((i) => ({ label: i.label, tiene: f.equipamiento.includes(i.id) })),
    papeles: PAPELES.map((i) => ({ label: i.label, tiene: f.papeles.includes(i.id) })),
  };
}
