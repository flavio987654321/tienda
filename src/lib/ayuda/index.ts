import { getStoreType, type StoreType } from "@/lib/storeTypes";
import { ARTICULOS } from "./articulos";
import { INDICE } from "./indice";
import { PANTALLAS } from "./pantallas";
import { GRUPOS, type Articulo, type Grupo, type Rol } from "./tipos";

export { ARTICULOS, GRUPOS };
export type { Articulo, Grupo, Rol };
export type { Bloque, Clase } from "./tipos";

export function buscarArticulo(slug: string): Articulo | undefined {
  return ARTICULOS.find((a) => a.slug === slug);
}

/* Quién está leyendo. Los dos filtros van juntos y no en dos funciones,
 * porque se aplican al mismo listado y en cadena. */
export type Lector = { rol?: Rol; rubro?: StoreType };

/* Los artículos que le sirven a quien está leyendo. Dos filtros:
 *
 * ROL — dueño de tienda o afiliado. Son dos paneles distintos: al afiliado,
 * "cargá tu primer producto" le habla de una pantalla que no tiene, y al dueño
 * "pedí un retiro" lo mismo. Sin rol declarado no se filtra: la ayuda pública
 * la lee gente sin cuenta —y el robot de Google, que nunca la tiene—, y ahí
 * esconder la mitad sería peor que mostrar de más.
 *
 * RUBRO — con carrito o por consulta. El modo sale de la config del rubro, no
 * de una lista escrita acá.
 *
 * El orden no importa para el resultado, pero sí que sean dos preguntas
 * separadas: un artículo de afiliado no tiene rubro, y uno de dueño no deja de
 * serlo por el modo de venta. */
export function articulosDe(lector: Lector = {}): Articulo[] {
  const { rol, rubro } = lector;
  let lista = ARTICULOS;

  if (rol) {
    lista = lista.filter((a) => a.rol === rol || a.rol === "ambos");
  }
  if (rubro) {
    const modo = getStoreType(rubro).checkoutMode;
    lista = lista.filter((a) => !a.checkout || a.checkout === modo);
  }
  return lista;
}

/* El índice agrupado. Se saltean los grupos vacíos: un título con nada abajo
 * hace pensar que la página se rompió. */
export function porGrupo(lector: Lector = {}) {
  const disponibles = articulosDe(lector);
  return GRUPOS.map((g) => ({
    key: g.key,
    titulo: g.titulo,
    // La bajada del dueño nombra pantallas que el afiliado no tiene.
    bajada: lector.rol === "afiliado" ? (g.bajadaAfiliado ?? g.bajada) : g.bajada,
    articulos: disponibles.filter((a) => a.grupo === g.key),
  })).filter((g) => g.articulos.length > 0);
}

/* Que las dos tablas livianas no se separen de los artículos.
 *
 * `indice.ts` y `pantallas.ts` existen para que el navegador no se baje los
 * los artículos enteros con tal de mostrar un título. El precio es el
 * slug y el título escritos dos veces. Repetido no es problema; repetido y
 * desactualizado en silencio, sí — una ayuda que promete un artículo y abre
 * otro es peor que no ofrecer nada.
 *
 * Corre solo fuera de producción, cuando se renderiza el centro de ayuda.
 * No tira: avisa por consola, que es lo que se ve mientras se trabaja. */
function verificarPantallas() {
  if (process.env.NODE_ENV === "production") return;

  /* El índice liviano contra los artículos de verdad, en los dos sentidos.
     Que le falte uno no rompe nada visible, y por eso hay que avisarlo: ese
     artículo simplemente no se lo puede ofrecer Sasha, para siempre. */
  for (const entrada of INDICE) {
    const articulo = buscarArticulo(entrada.slug);
    if (!articulo) {
      console.warn(`[ayuda] indice.ts nombra "${entrada.slug}", que no existe.`);
    } else if (articulo.titulo !== entrada.titulo) {
      console.warn(`[ayuda] el título de "${entrada.slug}" cambió — actualizá indice.ts.`);
    }
  }
  for (const a of ARTICULOS) {
    if (!INDICE.some((e) => e.slug === a.slug)) {
      console.warn(`[ayuda] "${a.slug}" no está en indice.ts — Sasha no lo va a poder linkear.`);
    }
  }

  /* Y las pantallas contra lo que cada artículo dice cubrir. El slug que no
     existe ya lo avisa `pantallas.ts`, que es donde se cae la fila. */
  for (const p of PANTALLAS) {
    const articulo = buscarArticulo(p.slug);
    if (articulo && articulo.pantalla?.href !== p.href) {
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
   los artículos al navegador. */

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

export function buscar(consulta: string, lector: Lector = {}): Articulo[] {
  const q = normalizar(consulta.trim());
  if (q.length < 2) return [];

  /* Todas las palabras tienen que aparecer, no cualquiera. Con "cupon vencido"
     el que busca quiere el artículo que habla de las dos cosas, no los nueve
     que mencionan alguna. No hace falta que estén juntas ni en orden. */
  const palabras = q.split(/\s+/);

  return articulosDe(lector)
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
