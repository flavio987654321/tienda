"use client";
import { useMemo, useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { resolveProductPromo } from "@/lib/promoDisplay";
import { useEditContext } from "@/contexts/EditContext";
import { getDemoPool } from "@/hooks/useStorefront";
import { leerPuntos, escribirPuntos, MAX_LOOKS, MAX_PUNTOS, LOOK_EJEMPLO, type PuntoLook } from "@/lib/lookbook";

/* ══════════════════════════════════════════════════════════════════════════
   LOOKBOOK: lo que hace, sin cómo se ve
   ══════════════════════════════════════════════════════════════════════════

   Nació en Aurora y ahora lo usan los templates de moda, cada uno con su
   dibujo (Flavio, 04/10/26: "obvio que cada uno con su estilo"). Acá vive todo
   lo que es igual en todos:

   - cuáles looks existen (los que tienen foto, `lookbook1`…`lookbook3`) y cuál
     se está mirando;
   - el hueco para sumar otro en el editor (recién cuando ya hay uno: sin
     ninguno, el "+" repetía el botón grande y confundía);
   - los puntos del look: en la tienda sólo los que apuntan a un producto que
     existe todavía; en el editor todos, para poder arreglarlos;
   - "📍 Marcar productos": tocar la foto agrega un punto donde se tocó;
   - qué punto está abierto, y el precio a mostrar (con la promo si baja);
   - con `ejemplo` (las vistas previas de los diseños), si no hay ninguna
     foto, el look de ejemplo de `lib/lookbook` con sus productos de ejemplo:
     si no, el bloque no se veía en ninguna vista previa y nadie sabía que
     existía. En el editor no: ahí se explica cómo armar el propio. */

export function useLookbook({ products, promotions, imagenes, fmt, ocultarPrecios, ejemplo = false }: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  /** Las fotos de cada look, en orden; `undefined` donde no hay. */
  imagenes: (string | undefined)[];
  fmt: (n: number) => string;
  ocultarPrecios: boolean;
  /** Vista previa de un diseño: sin fotos, mostrar el look de ejemplo. */
  ejemplo?: boolean;
}) {
  const { editMode, overrides, setOverride } = useEditContext();
  const [elegido, setElegido] = useState(0);
  const [puntoAbierto, setPuntoAbierto] = useState<number | null>(null);
  const [marcando, setMarcando] = useState(false);

  const reales = imagenes.map((url, i) => ({ n: i + 1, url: url ?? "" })).filter(l => !!l.url);
  const conEjemplo = ejemplo && !editMode && reales.length === 0;
  // En el ejemplo se suman los productos de ejemplo, por si la vista previa ya
  // tiene suficientes productos reales y no los trajo.
  const porId = useMemo(() => new Map([...(conEjemplo ? getDemoPool() : []), ...products].map(p => [p.id, p])), [products, conEjemplo]);
  const looks = conEjemplo ? [{ n: 1, url: LOOK_EJEMPLO.foto }] : reales;
  const huecoLibre = editMode && looks.length > 0 && looks.length < MAX_LOOKS ? imagenes.findIndex(u => !u) + 1 : 0;

  const indice = Math.min(elegido, Math.max(0, looks.length - 1));
  const look = looks[indice] ?? null;
  const campoPuntos = look ? `lookbookPuntos${look.n}` : "";
  const puntos = conEjemplo ? LOOK_EJEMPLO.puntos : look ? leerPuntos(overrides[campoPuntos]?.text) : [];
  const puntosVisibles = editMode ? puntos : puntos.filter(p => porId.has(p.id));
  const enEsteLook = [...new Set(puntosVisibles.map(p => p.id))].map(id => porId.get(id)).filter((p): p is StorefrontProduct => !!p);
  const sinProducto = puntos.filter(pt => !porId.has(pt.id)).length;

  const guardar = (lista: PuntoLook[]) => setOverride(campoPuntos, { text: escribirPuntos(lista) });
  /** El clic sobre la foto: con "Marcar" prendido, agrega un punto ahí. */
  const marcar = (e: React.MouseEvent<HTMLElement>) => {
    if (!marcando || puntos.length >= MAX_PUNTOS) return;
    const r = e.currentTarget.getBoundingClientRect();
    guardar([...puntos, { id: "", x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }]);
  };
  const elegirProducto = (i: number, id: string) => guardar(puntos.map((q, j) => j === i ? { ...q, id } : q));
  const borrarPunto = (i: number) => guardar(puntos.filter((_, j) => j !== i));
  const alternarMarcar = () => { setMarcando(m => !m); setPuntoAbierto(null); };
  const cambiarLook = (i: number) => { setElegido(i); setPuntoAbierto(null); };

  const precio = (p: StorefrontProduct) => {
    if (ocultarPrecios) return "Consultá precio";
    const pr = resolveProductPromo(p, promotions);
    return fmt(pr.hasPriceDrop ? pr.effectivePrice : p.price);
  };
  const prodAbierto = puntoAbierto !== null && !marcando ? porId.get(puntosVisibles[puntoAbierto]?.id ?? "") : undefined;
  /** Los productos que se pueden elegir para un punto: los que tienen foto. */
  const elegibles = products.filter(p => p.images[0]);

  return {
    editMode, existe: looks.length > 0 || editMode,
    looks, indice, look, huecoLibre, cambiarLook,
    puntos, puntosVisibles, enEsteLook, sinProducto, porId, elegibles,
    marcando, alternarMarcar, marcar, elegirProducto, borrarPunto,
    puntoAbierto, setPuntoAbierto, prodAbierto, precio,
  };
}

export { MAX_LOOKS, MAX_PUNTOS };
