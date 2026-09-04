import { prisma } from "@/lib/prisma";
import { leerIndice, leerCapitulos, type CapituloPlaneado } from "@/lib/ebook-ia";

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
  /** Los capítulos planeados, y cuáles ya están escritos. */
  capitulos: Array<{ titulo: string; listo: boolean }>;
  escritos: number;
  total: number;
  /** `true` mientras hay un pedido escribiendo un capítulo ahora mismo. */
  trabajando: boolean;
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
  const escritos = leerCapitulos(fila.capitulos).length;

  return {
    estado: fila.estado,
    titulo: fila.titulo,
    capitulos: indice.map((c, i) => ({ titulo: c.titulo, listo: i < escritos })),
    escritos,
    total: indice.length,
    trabajando:
      fila.trabajandoDesde != null &&
      Date.now() - fila.trabajandoDesde.getTime() < CANDADO_MS,
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
