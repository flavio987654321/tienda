"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTurnstile } from "@/components/Turnstile";

// ─────────────────────────────────────────────────────────────────────────────
// El bloque de reseñas de la portada, en un solo lugar.
//
// Esto es la FUNCIÓN: de dónde salen las reseñas, cuáles suben a la portada, qué
// pasa cuando no hay ninguna, cómo se borra una y cómo se publica una nueva. El
// DISEÑO no está acá — cada template dibuja lo suyo con estos datos.
//
// Estaba escrito adentro de ChicParis, y a medias en BohoTerra y FashionNoir.
// Urban Pulse no lo tenía: mostraba cuatro testimonios inventados en el código,
// iguales para todas las tiendas que usaran ese template. Traerlo copiando habría
// dejado la misma lógica escrita cuatro veces.
//
// ── Las reglas de verdad viven en el servidor ───────────────────────────────
// `/api/public/[slug]/reviews` decide qué es público: a la portada suben solo las
// de 4★ y 5★ con comentario, las de tienda esperan la aprobación del dueño, y el
// promedio se calcula sobre TODAS las aprobadas y no sobre las que se muestran.
// Acá no se recalcula nada de eso: se pide y se dibuja.
// ─────────────────────────────────────────────────────────────────────────────

export type HomeReview = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: string;
  verified: boolean;
  verifiedBy: string | null;
  createdAt: string;
  /** Las reseñas de TIENDA no tienen producto: hablan de la atención y del envío. */
  product?: { id: string; name: string; image: string | null } | null;
};

/** Una reseña de ejemplo, sin los campos que se completan solos. */
export type ResenaDeEjemplo = Omit<HomeReview, "createdAt" | "product">;

export type EjemplosDeResenas = {
  /** Se les cuelga un producto REAL de la tienda para que la tarjeta se vea entera. */
  producto: ResenaDeEjemplo[];
  tienda: ResenaDeEjemplo[];
};

type ProductoMinimo = { id: string; name: string; images: string[] };

export type FormResenaTienda = { reviewer: string; rating: number; comment: string; email: string };

const FORM_VACIO: FormResenaTienda = { reviewer: "", rating: 5, comment: "", email: "" };

export function useHomeReviews({
  slug, isPreview, isOwner, productos, ejemplos,
}: {
  slug: string | undefined;
  isPreview: boolean;
  isOwner: boolean;
  productos: ProductoMinimo[];
  /** Propios de cada template: si todos muestran los mismos textos, las previews
   *  de los diez templates se ven clonadas. */
  ejemplos: EjemplosDeResenas;
}) {
  const [deProductoReal, setDeProductoReal] = useState<HomeReview[]>([]);
  const [deTiendaReal,   setDeTiendaReal]   = useState<HomeReview[]>([]);
  const [stats,          setStats]          = useState<{ promedio: number; total: number } | null>(null);
  const [tab,            setTab]            = useState<"tienda" | "producto">("producto");

  useEffect(() => {
    if (!slug) return;
    let vigente = true;
    fetch(`/api/public/${slug}/reviews`)
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => {
        if (!vigente) return;
        setDeProductoReal(d.reviews ?? []);
        setDeTiendaReal(d.storeReviews ?? []);
        if (d.stats) setStats(d.stats);
      })
      .catch(() => {});
    // Si el slug cambia mientras la anterior está en vuelo, la vieja no puede
    // pisar a la nueva.
    return () => { vigente = false; };
  }, [slug]);

  // ── Ejemplo vs. real ───────────────────────────────────────────────────────
  // Las de ejemplo son SOLO para el editor y la galería de templates, donde hace
  // falta ver cómo queda el bloque lleno. En la tienda publicada no aparecen
  // nunca: ahí o hay reseñas de verdad, o no hay nada.
  const deProductoEjemplo = useMemo(
    () => ejemplos.producto.map((r, i) => {
      const p = productos.length ? productos[i % productos.length] : undefined;
      return {
        ...r,
        createdAt: "",
        product: p ? { id: p.id, name: p.name, image: p.images[0] ?? null } : null,
      } as HomeReview;
    }),
    [ejemplos.producto, productos],
  );
  const deTiendaEjemplo = useMemo(
    () => ejemplos.tienda.map(r => ({ ...r, createdAt: "", product: null } as HomeReview)),
    [ejemplos.tienda],
  );

  const deProducto = isPreview ? deProductoEjemplo : deProductoReal;
  const deTienda   = isPreview ? deTiendaEjemplo   : deTiendaReal;
  const sinNada    = deProducto.length === 0 && deTienda.length === 0;

  // Si la pestaña abierta no tiene nada pero la otra sí, se muestra la que tiene.
  // Abrir en una vacía teniendo contenido al lado hace que la tienda parezca sin
  // reseñas cuando no lo está — y nadie va a tocar una pestaña para ver si atrás
  // hay algo.
  const tabEfectiva =
    !sinNada && ((tab === "producto" && deProducto.length === 0) ||
                 (tab === "tienda"   && deTienda.length === 0))
      ? (tab === "producto" ? "tienda" : "producto")
      : tab;
  const lista = tabEfectiva === "tienda" ? deTienda : deProducto;

  // ── El bloque SIEMPRE se dibuja, aunque no haya ni una reseña ──────────────
  // Adentro está el botón para dejar la primera. Escondido cuando está vacío, una
  // tienda nueva no tendría nunca cómo arrancar: nadie puede dejar una reseña de
  // la tienda si el único lugar desde donde se deja aparece recién cuando ya hay
  // una. Lo que sí cambia con cero reseñas es el TEXTO — el título deja de
  // afirmar que los clientes dicen algo y pasa a invitar—, y eso lo resuelve cada
  // template con `sinNada`.
  //
  // Ojo: "vacío" acá significa sin reseñas REALES. Las de ejemplo no se publican
  // nunca; en la tienda de verdad el bloque se muestra sin tarjetas.

  // ── Borrar (solo el dueño) ─────────────────────────────────────────────────
  // Pregunta antes, y saca la tarjeta de la pantalla RECIÉN con la confirmación
  // del servidor en la mano. Al revés, con el fetch fallando, el dueño la ve
  // desaparecer, se queda tranquilo, y al día siguiente sigue publicada.
  const borrar = useCallback(async (reviewId: string) => {
    if (!slug) return;
    if (!confirm("¿Eliminar esta reseña? No se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      if (!res.ok) {
        alert("No se pudo eliminar la reseña. Sigue publicada — probá de nuevo.");
        return;
      }
      setDeProductoReal(prev => prev.filter(r => r.id !== reviewId));
      setDeTiendaReal(prev => prev.filter(r => r.id !== reviewId));
    } catch {
      alert("No se pudo conectar. La reseña sigue publicada.");
    }
  }, [slug]);

  // ── El formulario de reseña de TIENDA ──────────────────────────────────────
  const [form,        setForm]        = useState<FormResenaTienda>(FORM_VACIO);
  const [enviando,    setEnviando]    = useState(false);
  const [listo,       setListo]       = useState(false);
  const [honeypot,    setHoneypot]    = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const enVuelo = useRef(false);
  // Captcha propio: el token es de un solo uso, así que compartirlo con el
  // formulario de producto haría que el segundo envío viaje con uno ya gastado.
  const captcha = useTurnstile("review");

  const email = form.email.trim();
  const emailPlausible = !email || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const valida =
    form.reviewer.trim().length >= 2 &&
    form.rating >= 1 && form.rating <= 5 &&
    emailPlausible;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview || isOwner || honeypot || enVuelo.current) return;
    // Se revalida acá y no solo en el botón: el submit también sale con Enter en
    // un campo, que no pasa por el botón deshabilitado.
    if (!slug || !valida) return;
    enVuelo.current = true;
    setEnviando(true);
    try {
      const res = await fetch(`/api/public/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Sin `productId`: eso es lo que la vuelve una reseña de la tienda.
        body: JSON.stringify({
          rating: form.rating, comment: form.comment, reviewer: form.reviewer,
          buyerEmail: form.email.trim() || undefined, turnstileToken: captcha.token,
        }),
      });
      if (res.ok) {
        // NO se agrega a la lista: nace pendiente de aprobación y todavía no es
        // pública. Meterla en pantalla haría creer que ya se publicó, y al
        // recargar habría desaparecido sin ninguna explicación.
        setForm(FORM_VACIO);
        setConfirmando(false);
        setError(null);
        setListo(true);
      } else {
        const d = await res.json().catch(() => null);
        setError(d?.error || "No se pudo enviar tu reseña. Probá de nuevo en un momento.");
        setConfirmando(false);
      }
    } catch {
      setError("No se pudo conectar. Revisá tu internet y probá de nuevo.");
      setConfirmando(false);
    } finally {
      enVuelo.current = false;
      captcha.reset();
      setEnviando(false);
    }
  }

  // Abrir en limpio y cerrar reseteando —error, confirmación y el "gracias"—
  // para que la próxima vez no arrastre lo anterior.
  function abrirModal() {
    setError(null); setConfirmando(false); setListo(false); setModalAbierto(true);
  }
  function cerrarModal() {
    setModalAbierto(false); setError(null); setConfirmando(false); setListo(false);
  }

  return {
    // Datos ya resueltos
    deProducto, deTienda, lista, tab: tabEfectiva, setTab, sinNada,
    /** Promedio y total REALES, aun en preview: el cartel del editor los usa para
     *  decirle al dueño qué va a pasar en su tienda de verdad. */
    stats,
    totalReal: stats?.total ?? 0,
    /** Cuántas suben de verdad a la portada hoy, por tipo. El cartel del editor
     *  las usa para decirle al dueño qué va a ver en su tienda publicada. */
    realProducto: deProductoReal.length,
    realTienda: deTiendaReal.length,
    enPortadaReal: deProductoReal.length + deTiendaReal.length,
    // Acciones del dueño
    borrar,
    // Formulario de reseña de tienda
    form, setForm, valida, enviando, listo, error, confirmando, setConfirmando,
    honeypot, setHoneypot, enviar, captcha,
    modalAbierto, abrirModal, cerrarModal,
  };
}
