import type { StoreType } from "@/lib/storeTypes";

/* ── El formato de un artículo de ayuda ──────────────────────────────────────
   El cuerpo NO es texto suelto como el de las políticas de la tienda. Ahí el
   texto lo escribe el dueño en un textarea y lo único que puede haber son
   renglones y guiones, así que alcanzaba con partirlo en párrafos y listas.

   Acá el texto lo escribimos nosotros y necesita cosas que ese formato no puede
   expresar: subtítulos, pasos numerados, avisos, tablas y —sobre todo— links
   que lleven a la pantalla del panel de la que habla el artículo. Un artículo
   que explica dónde está algo y no te lleva ahí hace trabajar al lector de gusto.

   Por eso el cuerpo es una lista de bloques tipados y no una string: el día que
   haga falta un bloque nuevo se agrega acá y TypeScript avisa dónde falta
   contemplarlo, en vez de que un formato inventado se rompa en silencio. */

export type Bloque =
  | { t: "p"; texto: string }
  | { t: "h"; texto: string }
  | { t: "lista"; items: string[] }
  | { t: "pasos"; items: string[] }
  | { t: "aviso"; tono: "ojo" | "dato"; texto: string }
  | { t: "tabla"; cols: [string, string]; filas: [string, string][] }
  /* Manda al lugar del panel donde se hace lo que se acaba de explicar. */
  | { t: "ruta"; label: string; href: string };

/* Los cinco grupos son OBJETIVOS, no pantallas. El que necesita ayuda no sabe
   en qué pantalla está la solución —si lo supiera no necesitaría ayuda—, así
   que ordenarlos por menú lo obliga a adivinar justo lo que no sabe. */
export type Grupo = "arrancar" | "encontrar" | "vender" | "cobrar" | "cuenta";

/* Las dos mitades de la ayuda, y están separadas a propósito.

   MECÁNICA responde "cómo se hace": dónde está el botón, qué campo llena qué.
   Termina cuando el lector apretó guardar. La lee alguien trabado, con la
   pantalla abierta al lado.

   CRITERIO responde "qué conviene": no tiene botón ni pantalla, tiene
   resultado. La lee alguien planificando, sin nada abierto.

   Mezcladas no sirven para ninguno de los dos: al trabado el párrafo de
   estrategia le estorba, y al que planifica el "hacé clic en Guardar" lo
   aburre. Van enlazadas por `relacionados`, no fundidas en un mismo texto. */
export type Clase = "mecanica" | "criterio";

export interface Articulo {
  slug: string;
  titulo: string;
  /** Una sola frase. Se usa en el índice Y como description en Google, así que
   *  tiene que tener sentido leída sola, fuera de la página. */
  resumen: string;
  grupo: Grupo;
  clase: Clase;
  /** La pantalla del panel de la que habla, cuando habla de una. */
  pantalla?: { label: string; href: string };
  /** Rubros a los que aplica. Vacío = todos. Mismo criterio que el menú del
   *  panel, que ya esconde Cupones y Promociones en los rubros de leads: si el
   *  panel no muestra la pantalla, la ayuda no puede explicarla. */
  soloPara?: StoreType[];
  exceptoPara?: StoreType[];
  cuerpo: Bloque[];
  /** Slugs. Acá se cruzan las dos mitades: la mecánica linkea a su criterio. */
  relacionados?: string[];
  /** ISO. Un artículo de ayuda sin fecha no se sabe si todavía es cierto. */
  actualizado: string;
}

export const GRUPOS: { key: Grupo; titulo: string; bajada: string }[] = [
  { key: "arrancar",  titulo: "Arrancar",        bajada: "Dejar la tienda lista y entender lo que ves" },
  { key: "encontrar", titulo: "Que te encuentren", bajada: "Google, redes y el link que compartís" },
  { key: "vender",    titulo: "Vender más",      bajada: "Promociones, cupones y clientes que se fueron" },
  { key: "cobrar",    titulo: "Cobrar y entregar", bajada: "Medios de pago, envíos y lo legal" },
  { key: "cuenta",    titulo: "Tu cuenta",       bajada: "Plan, facturación y afiliados" },
];
