import { getStoreType, type StoreType } from "@/lib/storeTypes";
import { ARTICULOS } from "./articulos";
import { PANTALLAS } from "./pantallas";
import { GRUPOS, type Articulo, type Grupo } from "./tipos";

export { ARTICULOS, GRUPOS };
export type { Articulo, Grupo };
export type { Bloque, Clase } from "./tipos";

export function buscarArticulo(slug: string): Articulo | undefined {
  return ARTICULOS.find((a) => a.slug === slug);
}

/* Los artículos que le sirven a una tienda, según venda con carrito o por
 * consulta. El modo sale de la config del rubro, no de una lista escrita acá.
 *
 * Sin rubro —la ayuda pública, donde el lector todavía no tiene tienda—
 * devuelve todo: ahí no hay a quién filtrarle nada, y esconderle la mitad a
 * alguien que está evaluando la plataforma sería peor. */
export function articulosDe(rubro?: StoreType): Articulo[] {
  if (!rubro) return ARTICULOS;
  const modo = getStoreType(rubro).checkoutMode;
  return ARTICULOS.filter((a) => !a.checkout || a.checkout === modo);
}

/* El índice agrupado. Se saltean los grupos vacíos: un título con nada abajo
 * hace pensar que la página se rompió. */
export function porGrupo(rubro?: StoreType) {
  const disponibles = articulosDe(rubro);
  return GRUPOS.map((g) => ({
    ...g,
    articulos: disponibles.filter((a) => a.grupo === g.key),
  })).filter((g) => g.articulos.length > 0);
}

/* Que la tabla liviana de `pantallas.ts` no se separe de los artículos.
 *
 * Esa tabla existe para que el `?` del panel no se baje los diecisiete
 * artículos enteros, y el precio de tenerla es el slug y el título repetidos.
 * Repetido no es problema; repetido y desactualizado en silencio, sí — una
 * ayuda que promete un artículo y abre otro es peor que no ofrecer nada.
 *
 * Corre solo fuera de producción, cuando se renderiza el centro de ayuda.
 * No tira: avisa por consola, que es lo que se ve mientras se trabaja. */
function verificarPantallas() {
  if (process.env.NODE_ENV === "production") return;
  for (const p of PANTALLAS) {
    const articulo = buscarArticulo(p.slug);
    if (!articulo) {
      console.warn(`[ayuda] ${p.href} apunta a "${p.slug}", que no existe.`);
    } else if (articulo.titulo !== p.titulo) {
      console.warn(`[ayuda] el título de "${p.slug}" cambió — actualizá pantallas.ts.`);
    } else if (articulo.pantalla?.href !== p.href) {
      console.warn(`[ayuda] "${p.slug}" ya no declara la pantalla ${p.href}.`);
    }
  }
}
verificarPantallas();

/* ── Buscar ──────────────────────────────────────────────────────────────────
   Busca en el TEXTO COMPLETO, no solo en los títulos. Alguien que escribe
   "envío gratis" está buscando la promoción, y esas dos palabras no están en
   ningún título — están adentro de tres artículos distintos. Un buscador que
   solo mira títulos le contesta "no hay resultados" a una pregunta que la
   ayuda sí responde, y esa es la peor respuesta posible.

   Corre en el servidor: el índice ya se arma en cada pedido para leer la
   sesión, así que buscar no cuesta un viaje extra ni manda el texto de los
   veintidós artículos al navegador. */

/** Sin tildes y en minúscula. Nadie escribe "envío" con tilde en un buscador. */
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function textoDe(a: Articulo): string {
  const cuerpo = a.cuerpo.map((b) => {
    switch (b.t) {
      case "p":
      case "h":
        return b.texto;
      case "lista":
      case "pasos":
        return b.items.join(" ");
      case "aviso":
        return b.texto;
      case "tabla":
        return [...b.cols, ...b.filas.flat()].join(" ");
      case "ruta":
        return b.label;
    }
  });
  return normalizar([a.titulo, a.resumen, ...cuerpo].join(" "));
}

export function buscar(consulta: string, rubro?: StoreType): Articulo[] {
  const q = normalizar(consulta.trim());
  if (q.length < 2) return [];

  /* Todas las palabras tienen que aparecer, no cualquiera. Con "cupon vencido"
     el que busca quiere el artículo que habla de las dos cosas, no los nueve
     que mencionan alguna. No hace falta que estén juntas ni en orden. */
  const palabras = q.split(/\s+/);

  return articulosDe(rubro)
    .map((a) => {
      const texto = textoDe(a);
      if (!palabras.every((p) => texto.includes(p))) return null;
      /* Primero los que lo tienen en el título: si escribiste "cupones", el
         artículo que se llama así va arriba de los que lo nombran al pasar. */
      const enTitulo = palabras.every((p) => normalizar(a.titulo).includes(p));
      return { a, peso: enTitulo ? 0 : 1 };
    })
    .filter((r): r is { a: Articulo; peso: number } => r !== null)
    .sort((x, y) => x.peso - y.peso)
    .map((r) => r.a);
}

export function relacionadosDe(articulo: Articulo): Articulo[] {
  return (articulo.relacionados ?? [])
    .map(buscarArticulo)
    .filter((a): a is Articulo => Boolean(a));
}
