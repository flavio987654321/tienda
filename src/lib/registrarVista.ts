// ─────────────────────────────────────────────────────────────────────────────
// Registro de "vista de producto" — lo que alimenta la sección "Lo más visto".
//
// Vive acá y no dentro de `useCartLogic` porque hay DOS caminos por los que un
// comprador mira un producto, y antes solo se contaba uno:
//   1. abrir el modal de vista rápida desde la home o el listado, y
//   2. entrar a la página del producto (`/tienda/[slug]/producto/[id]`).
//
// El segundo es justamente por donde entra la gente de afuera —Google, un link
// compartido, una publicación— y no se contaba. La sección medía media tienda.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * No contar dos veces la misma persona mirando el mismo producto dentro de esta
 * ventana. Antes esto se guardaba en `sessionStorage`, que es POR PESTAÑA: abrir
 * el mismo producto en otra pestaña volvía a sumar, y una sola persona podía
 * inflar el contador sin darse cuenta. `localStorage` es por navegador.
 */
const VENTANA_MS = 24 * 60 * 60 * 1000;
const PREFIJO = "pview_";

/**
 * Suma una vista, si corresponde. Nunca cuenta al dueño ni al editor, y falla en
 * silencio: es una métrica, jamás debe romperle la navegación a nadie.
 */
export function registrarVista(
  productId: string,
  slug: string | null,
  isOwner: boolean,
  isPreview = false
): void {
  // El dueño mirando su propia tienda no es una visita. `isPreview` cubre el
  // editor, donde además se recorre la tienda entera para acomodarla.
  if (isOwner || isPreview || !slug) return;
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;

  const key = PREFIJO + productId;
  try {
    const previa = Number(localStorage.getItem(key));
    if (Number.isFinite(previa) && previa > 0 && Date.now() - previa < VENTANA_MS) return;
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // Modo incógnito con storage bloqueado: se cuenta igual. Preferimos un
    // registro de más antes que perder la vista de un comprador real.
  }

  fetch(`/api/public/${slug}/product-view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  }).catch(() => {});
}
