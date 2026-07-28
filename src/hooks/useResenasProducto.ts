"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Las reseñas de UN producto, para la ficha que se abre al tocarlo.
 *
 * Estaba escrito cinco veces —los cuatro templates de moda y la página de
 * listado— con el mismo bug en las cinco copias, así que arreglarlo era
 * arreglarlo cinco veces. Lo que había:
 *
 *   · El servidor mandaba las 50 más nuevas y no había forma de pedir más. Con
 *     200 reseñas, el comprador llegaba a la 50 y el botón "Ver más" desaparecía
 *     sin decir que faltaban 150.
 *   · El promedio, el total y las barras se calculaban en el navegador sobre las
 *     reseñas que habían llegado: con 300, eso es *el promedio de las últimas 50*
 *     publicado como si fuera el del producto. La portada, que usa el agregado de
 *     la base, mostraba otro número para la misma tienda.
 *   · Abrir un producto y saltar enseguida a otro podía dejar las reseñas del
 *     primero pegadas en la ficha del segundo: ganaba la respuesta que llegaba
 *     última, no la que se había pedido última.
 *
 * De diseño no decide nada: devuelve datos y los templates los dibujan como
 * quieran.
 */

export type ResenaProducto = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: string;
  // Opcionales: la página de listado no dibuja el sello de compra verificada y
  // no tendría por qué arrastrar los dos campos solo para conformar al tipo.
  verified?: boolean;
  verifiedBy?: string | null;
  createdAt: string;
  product?: { id?: string; name: string; image: string | null } | null;
};

export type ResumenResenas = {
  promedio: number;
  total: number;
  distribucion: Record<number, number>;
};

const VACIA: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

export function useResenasProducto({
  slug,
  productId,
  inicial = 5,
  paso = 10,
  ejemplos,
  isPreview = false,
}: {
  slug?: string | null;
  productId?: string | null;
  /** Cuántas se dibujan al abrir la ficha. */
  inicial?: number;
  /** Cuántas suma cada "Ver más". */
  paso?: number;
  /** Reseñas de muestra para el editor, cuando el producto todavía no tiene ninguna. */
  ejemplos?: ResenaProducto[];
  isPreview?: boolean;
}) {
  const [reviews, setReviews]       = useState<ResenaProducto[]>([]);
  const [stats, setStats]           = useState<ResumenResenas | null>(null);
  const [cargando, setCargando]     = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [mostradas, setMostradas]   = useState(inicial);

  // A qué producto pertenece la lista que está cargada. Es lo que permite
  // descartar una respuesta que llega tarde, después de haber cambiado de ficha.
  const de = useRef<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia las reseñas del producto anterior al cerrar la ficha; depende de una interacción, no se puede calcular durante el render
    if (!productId || !slug) { setReviews([]); setStats(null); de.current = null; return; }
    const id = productId;
    de.current = id;
    setCargando(true); setMostradas(inicial); setStats(null);
    fetch(`/api/public/${slug}/reviews?productId=${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (de.current !== id) return;
        setReviews(d?.reviews ?? []);
        setStats(d?.stats ?? null);
      })
      .catch(() => { if (de.current === id) setReviews([]); })
      .finally(() => { if (de.current === id) setCargando(false); });
  }, [slug, productId, inicial]);

  // `cargando` importa: entre que se abre la ficha y contesta el servidor la
  // lista está vacía, y sin esto aparecerían las de ejemplo por un instante justo
  // para ser reemplazadas por las reales.
  const usandoEjemplos = isPreview && !cargando && reviews.length === 0 && !!ejemplos?.length;
  const lista = usandoEjemplos ? ejemplos! : reviews;

  const resumen: ResumenResenas = useMemo(() => {
    const contar = (rs: ResenaProducto[]): ResumenResenas => {
      const distribucion = { ...VACIA };
      let suma = 0;
      for (const r of rs) { distribucion[r.rating] = (distribucion[r.rating] ?? 0) + 1; suma += r.rating; }
      return { total: rs.length, promedio: rs.length ? suma / rs.length : 0, distribucion };
    };
    if (usandoEjemplos) return contar(ejemplos!);
    // `stats` viene de la base y cuenta TODAS, no solo las que llegaron. Si el
    // endpoint no lo mandó —una respuesta vieja en caché— se cuenta lo que hay,
    // que es lo que se hacía siempre.
    if (stats) return stats;
    return contar(reviews);
  }, [usandoEjemplos, ejemplos, stats, reviews]);

  const verMas = useCallback(async () => {
    const total = resumen.total;
    const objetivo = Math.min(mostradas + paso, total);
    // Primero destapa las que ya están cargadas; recién cuando se acaban va a
    // buscar la página siguiente.
    if (!usandoEjemplos && objetivo > reviews.length && reviews.length < total && slug && productId && !cargandoMas) {
      setCargandoMas(true);
      try {
        const r = await fetch(`/api/public/${slug}/reviews?productId=${productId}&skip=${reviews.length}`);
        const d = r.ok ? await r.json() : null;
        if (de.current === productId && d?.reviews?.length) {
          setReviews(prev => {
            // Se descartan las repetidas por id: entre una página y la siguiente
            // puede entrar una reseña nueva y correr todo un lugar, y React se
            // queja —con razón— de dos hijos con la misma key.
            const vistas = new Set(prev.map(x => x.id));
            return [...prev, ...(d.reviews as ResenaProducto[]).filter(x => !vistas.has(x.id))];
          });
        }
      } catch { /* se queda con las que ya tiene */ }
      finally { if (de.current === productId) setCargandoMas(false); }
    }
    setMostradas(objetivo);
  }, [resumen.total, mostradas, paso, usandoEjemplos, reviews.length, slug, productId, cargandoMas]);

  /** Alta local después de publicar una reseña, para no volver a pedir la página
   *  entera. Sin esto el promedio y el total —que ahora vienen de la base— se
   *  quedarían en el número viejo mientras la reseña recién escrita ya se ve. */
  const agregar = useCallback((r: ResenaProducto) => {
    setReviews(prev => [r, ...prev]);
    setStats(s => (s ? {
      total: s.total + 1,
      promedio: (s.promedio * s.total + r.rating) / (s.total + 1),
      distribucion: { ...s.distribucion, [r.rating]: (s.distribucion[r.rating] ?? 0) + 1 },
    } : s));
    setMostradas(n => n + 1);
  }, []);

  return {
    /** Lo que hay que dibujar: las reales o las de ejemplo. */
    lista,
    usandoEjemplos,
    /** Cuántas de `lista` dibujar. */
    mostradas,
    cargando,
    cargandoMas,
    hayMas: resumen.total > mostradas,
    /** Cuántas faltan por mostrar, para el texto del botón. */
    faltan: Math.max(0, resumen.total - mostradas),
    total: resumen.total,
    promedio: resumen.promedio,
    distribucion: resumen.distribucion,
    verMas,
    agregar,
  };
}
