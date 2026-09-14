import { prisma } from "@/lib/prisma";
import {
  leerIndice, partesEscritas, leerAvisoDeFotos,
  type CapituloPlaneado,
} from "@/lib/ebook-ia";
import { leerOpciones, unidadesElegidas, type OpcionesDelEbook } from "@/lib/ebook-opciones";

/**
 * El borrador del ebook: lo que las tres rutas necesitan compartir.
 *
 * Está aparte de `ebook-ia` a propósito: aquél no toca la base y por eso se
 * puede probar entero sin base ni claves. Acá vive lo que sí la toca.
 */

/**
 * ⚠️ CUÁNTO VALE EL CANDADO.
 *
 * Dos pedidos a la vez escribirían dos veces el mismo capítulo, y lo cobrarían
 * dos veces. El candado lo impide — pero **tiene que vencer**: un pedido que se
 * murió a mitad de camino (la función se cortó, se cayó la conexión) dejaría el
 * ebook trabado para siempre, y la persona vería "escribiendo…" hasta el fin de
 * los tiempos.
 *
 * 90 segundos: más que los 60 que puede vivir una función, así que un pedido
 * vivo nunca pierde su candado; y poco para quien está esperando.
 */
export const CANDADO_MS = 90_000;

/** Lo que la pantalla necesita saber, sin el texto de los capítulos. */
export type EstadoDelBorrador = {
  estado: string;
  titulo: string;
  /**
   * Cómo eligió que salga: formato, tema visual, color y cuántas recetas.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * ⚠️ VUELVE ENTERA, Y NO SÓLO EL FORMATO
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Dos motivos, y el segundo es un error que ya estaba:
   *
   * 1. Para **nombrar bien** lo que se está escribiendo. Sin esto la tarjeta
   *    decía "4 de 10 capítulos" para un recetario, que no tiene capítulos.
   * 2. Para que **"Rehacerlo" no se olvide de lo que la persona eligió.** Ese
   *    botón devuelve a la pantalla del formulario, y ahí los botones arrancaban
   *    en lo de fábrica: quien había hecho un recetario de 30 recetas volvía a
   *    una pantalla que decía "Ebook de texto", y si apretaba sin mirar recibía
   *    **otro producto y una generación cobrada**. Encontrado en el repaso del
   *    08/09/26, antes de commitear.
   */
  opciones: OpcionesDelEbook;
  /** Los capítulos planeados —o las secciones—, y cuáles ya están escritos. */
  capitulos: Array<{ titulo: string; listo: boolean }>;
  /**
   * Cuántas partes van y cuántas son, **EN LA UNIDAD QUE ELIGIÓ LA PERSONA**.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * ⚠️ EN UN RECETARIO SE CUENTAN RECETAS, NO SECCIONES
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Un recetario de 10 recetas se escribe en 4 secciones, así que contando
   * secciones la barra decía "2 de 4" a alguien que había elegido 10. El número
   * que ve tiene que ser el que eligió, o no sabe qué está mirando.
   *
   * El bucle de la pantalla sigue funcionando igual —los dos números están en
   * la misma unidad y `escritos` llega a `total`—, y de todos modos quien corta
   * el bucle es el `listo` que manda el servidor, que sí cuenta secciones.
   */
  escritos: number;
  total: number;
  /** `true` mientras hay un pedido escribiendo un capítulo ahora mismo. */
  trabajando: boolean;
  /**
   * `true` si el último PDF se armó con el banco de fotos al tope.
   *
   * ⚠️ El archivo está y se puede vender, pero le faltan las fotos. Es un
   * booleano y no un texto porque viaja en cada vuelta del bucle que mira cómo
   * viene la escritura. Ver `leerAvisoDeFotos`.
   */
  fotosAlTope: boolean;
  error: string | null;
  reintentos: number;
};

type FilaCruda = {
  estado: string;
  titulo: string;
  indice: string;
  capitulos: string;
  trabajandoDesde: Date | null;
  error: string | null;
  reintentos: number;
};

/**
 * De la fila de la base a lo que se dibuja.
 *
 * ⚠️ **No devuelve el texto de los capítulos.** Son decenas de miles de
 * caracteres que la pantalla no muestra —muestra una barra— y que viajarían en
 * cada vuelta del bucle, una por capítulo. El texto se lee una sola vez, al
 * armar el PDF.
 */
export function estadoDelBorrador(fila: FilaCruda): EstadoDelBorrador {
  const indice: CapituloPlaneado[] = leerIndice(fila.indice);
  const opciones = leerOpciones(fila.indice);

  /* ⚠️ Un recetario guarda grupos de recetas —y una infografía grupos de
     láminas— donde un ebook de texto guarda capítulos, y `leerCapitulos` no los
     reconoce: devolvería 0 y la barra se quedaría en cero para siempre
     mientras la persona mira cómo se escribe. `partesEscritas` sabe leer los
     tres, y devuelve las dos cuentas: las secciones hechas (una por llamada
     cobrada) y la unidad que la persona eligió. Ver `escritos` arriba. */
  const { partes, unidades: escritos } = partesEscritas(opciones.formato, fila.capitulos);
  const total = unidadesElegidas(opciones, indice.length);

  return {
    estado: fila.estado,
    titulo: fila.titulo,
    opciones,
    /* La lista tildada sigue siendo de secciones: son los nombres que el
       modelo escribió y lo que de verdad se va completando de a uno. */
    capitulos: indice.map((c, i) => ({ titulo: c.titulo, listo: i < partes })),
    escritos,
    total,
    trabajando:
      fila.trabajandoDesde != null &&
      Date.now() - fila.trabajandoDesde.getTime() < CANDADO_MS,
    fotosAlTope: leerAvisoDeFotos(fila.indice),
    error: fila.error,
    reintentos: fila.reintentos,
  };
}

/**
 * Tomar el candado para escribir. Devuelve la marca con la que se tomó, o
 * `null` si otro pedido lo tiene.
 *
 * ⚠️ La condición va ADENTRO del `where`, igual que en el cupo: leer "¿está
 * libre?" y después marcarlo es la carrera clásica, y acá el que pierde escribe
 * —y paga— un capítulo repetido.
 */
export async function tomarElCandado(id: string): Promise<Date | null> {
  const ahora = new Date();
  const vencido = new Date(ahora.getTime() - CANDADO_MS);

  const r = await prisma.ebookIA.updateMany({
    where: {
      id,
      OR: [{ trabajandoDesde: null }, { trabajandoDesde: { lt: vencido } }],
    },
    data: { trabajandoDesde: ahora },
  });

  return r.count === 1 ? ahora : null;
}

/**
 * Guardar el capítulo escrito y soltar el candado, **en el mismo movimiento**.
 *
 * ⚠️ `trabajandoDesde: marca` en el `where` no es de adorno: es lo que hace que
 * un pedido que tardó de más y ya perdió el candado **no pise** lo que escribió
 * el que lo reemplazó. Se leyó la lista de capítulos antes de llamar al modelo;
 * si en el medio otro escribió uno, guardar la lista vieja borraría su trabajo.
 *
 * Devuelve `false` si el candado ya no era nuestro. Ahí lo correcto es tirar lo
 * que escribimos: nos costó plata, pero está peor perder el capítulo del otro.
 */
export async function guardarCapitulo(
  id: string,
  marca: Date,
  capitulos: string,
  estado: string,
): Promise<boolean> {
  const r = await prisma.ebookIA.updateMany({
    where: { id, trabajandoDesde: marca },
    data: { capitulos, estado, trabajandoDesde: null, error: null },
  });
  return r.count === 1;
}

/**
 * Soltar el candado sin guardar nada, cuando la escritura falló.
 *
 * Sin esto habría que esperar los 90 segundos del vencimiento para reintentar,
 * y quien está mirando la barra no entiende por qué el botón no hace nada.
 */
export async function soltarElCandado(id: string, marca: Date, error?: string): Promise<void> {
  try {
    await prisma.ebookIA.updateMany({
      where: { id, trabajandoDesde: marca },
      data: { trabajandoDesde: null, ...(error ? { error } : {}) },
    });
  } catch (e) {
    /* Que no se pueda soltar no puede tumbar la respuesta de error que ya
       estamos por darle a la persona. Se vence solo en 90 segundos. */
    console.error("[ebook] no se pudo soltar el candado", { id, e });
  }
}
