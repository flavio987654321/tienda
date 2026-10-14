"use client";
/**
 * Cómo FUNCIONA la cartelera de los templates de autos (15/10/26). Cómo se VE
 * la escribe cada template (CarteleraRuta, CarteleraMotor, CarteleraDrive,
 * CarteleraVolt): se comparte la lógica, no el diseño.
 *
 * - Tres ranuras de foto, `promoBanner1/2/3` (con `esCarrusel` el panel de la
 *   foto ofrece cada cuántos segundos pasa: `bannerInterval`).
 * - En la tienda se muestran los carteles con foto propia. Sin ninguna:
 *   Ruta (template nuevo) muestra los tres de ejemplo, como su foto de portada;
 *   Motor, Drive y Volt NO (`ejemplosEnTienda` falso), porque ya hay tiendas
 *   publicadas con ellos y les aparecería de golpe un bloque con fotos y textos
 *   que nunca cargaron. En el editor y en la previa, siempre los tres.
 * - Pasa solo; se frena con el mouse encima o el foco adentro; con "reducir
 *   movimiento" no pasa solo. Flechas del teclado y deslizar con el dedo.
 */
import { useEffect, useRef, useState } from "react";
import type { ImageOverride } from "@/types/store-config";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { fotoLiviana } from "@/lib/foto-liviana";

/** Una foto de ejemplo de Pexels: 800 px para el celular, 1200 para la compu. */
const PX = (id: number, w: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/** Los atributos del <img> de un cartel: la foto propia achicada, o la de ejemplo con su srcSet. */
export function fotoDelCartel(ov: ImageOverride | undefined, ejemplo: number) {
  return ov?.url
    ? { src: fotoLiviana(ov.url, 1600), style: { objectPosition: `${ov.posX ?? 50}% ${ov.posY ?? 50}%` } }
    : { src: PX(ejemplo, 1200), srcSet: `${PX(ejemplo, 800)} 800w, ${PX(ejemplo, 1200)} 1200w`, sizes: "(max-width: 640px) 100vw, 1240px", style: {} };
}

export function useCartelera({ fotos, intervalMs, editMode, ejemplosEnTienda = true }: {
  fotos: (ImageOverride | undefined)[];
  intervalMs: number;
  editMode: boolean;
  /** Sin fotos propias, ¿se muestran los de ejemplo? (verdadero en el editor y la previa). */
  ejemplosEnTienda?: boolean;
}) {
  const propios = [0, 1, 2].filter((i) => !!fotos[i]?.url);
  const visibles = editMode || propios.length === 0 ? [0, 1, 2] : propios;
  /** Sin nada que mostrar: el template no dibuja el bloque. */
  const vacio = !editMode && propios.length === 0 && !ejemplosEnTienda;
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [quieto, setQuieto] = useState(false);
  const n = visibles.length;
  const pos = Math.min(actual, n - 1);
  const ir = (k: number) => setActual(((k % n) + n) % n);
  const swipe = useTouchSwipe(() => ir(pos + 1), () => ir(pos - 1));
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ver = () => setQuieto(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);

  /** Si está corriendo el tiempo del cartel actual (para dibujar el progreso). */
  const corre = !editMode && !pausa && !quieto && n > 1;
  useEffect(() => {
    if (!corre) return;
    const id = window.setTimeout(() => setActual((a) => (Math.min(a, n - 1) + 1) % n), intervalMs);
    return () => window.clearTimeout(id);
  }, [corre, pos, n, intervalMs]);

  /** Lo que va en el contenedor del carrusel. */
  const contenedor = {
    ref: raiz,
    role: "region" as const,
    "aria-roledescription": "carrusel",
    onMouseEnter: () => setPausa(true),
    onMouseLeave: () => setPausa(false),
    onFocus: () => setPausa(true),
    onBlur: (e: React.FocusEvent) => { if (!raiz.current?.contains(e.relatedTarget as Node)) setPausa(false); },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "ArrowRight") ir(pos + 1); if (e.key === "ArrowLeft") ir(pos - 1); },
    ...swipe,
  };

  return { visibles, n, pos, ir, corre, contenedor, vacio };
}

/** Los textos de fábrica de los carteles de autos (Motor, Drive y Volt): los
    mismos campos en los tres, así lo que la agencia escribió sigue si cambia
    de diseño. Ruta tiene los suyos, de unidades de trabajo. */
export const CARTELES_AUTOS = [
  { titulo: "Recién ingresados", texto: "Unidades seleccionadas y revisadas, listas para entregar.", boton: "Ver el stock" },
  { titulo: "Tomamos tu usado", texto: "Entregá tu auto en parte de pago y llevate el próximo.", boton: "Ver el stock" },
  { titulo: "Financiación", texto: "Cuotas a tu medida. Consultanos por las opciones vigentes.", boton: "Ver el stock" },
];

/** Si la agencia subió al menos una foto de cartel: sin ninguna, Motor, Drive y
    Volt no dibujan la sección en la tienda (ni siquiera el espacio). */
export const hayFotosDeCartelera = (iovr: Record<string, ImageOverride | undefined>) =>
  [1, 2, 3].some((i) => !!iovr[`promoBanner${i}`]?.url);
