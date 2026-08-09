// ─────────────────────────────────────────────────────────────────────────────
// Registro de los pasos del embudo — "puso algo en el carrito" y "abrió el
// checkout".
//
// Los otros cuatro escalones ya se pueden sacar de la base: las visitas de
// `StoreView`, los datos de `AbandonedCart`, y el pedido y el pago de `Order`.
// Estos dos no los sabía nadie, y son justo donde más gente se cae.
//
// Mismo molde que `registrarVista`: se deduplica por día en el navegador, no
// cuenta al dueño ni al editor, y falla en silencio. Es una métrica — jamás
// tiene que romperle la compra a nadie.
// ─────────────────────────────────────────────────────────────────────────────

import type { PasoRegistrado } from "@/lib/embudo";

/**
 * Una vez por día por navegador, igual que las visitas.
 *
 * Que los dos se cuenten con la MISMA regla no es un detalle de prolijidad: el
 * embudo divide uno por el otro. Si las visitas fueran por día y el carrito por
 * sesión, el porcentaje de "cuántos de los que entraron pusieron algo en el
 * carrito" no querría decir nada.
 *
 * El día es el argentino y no el del reloj del visitante: con la clave en hora
 * local, alguien en otro huso horario abriría un día nuevo antes y sumaría dos
 * veces a la misma jornada de la tienda.
 */
const PREFIJO = "fnl_";

function claveDelDia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function registrarPaso(
  paso: PasoRegistrado,
  slug: string | null,
  isOwner: boolean,
  isPreview = false
): void {
  if (isOwner || isPreview || !slug) return;
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  // Un navegador manejado por un script lo declara acá. El filtro del servidor
  // mira el User-Agent, que estos suelen disfrazar; esta bandera es más difícil
  // de sacar.
  if (navigator.webdriver) return;

  const hoy = claveDelDia();
  const key = `${PREFIJO}${slug}_${paso}_${hoy}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    // Las claves de días anteriores no sirven para nada y se acumularían para
    // siempre en el navegador del visitante.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${PREFIJO}${slug}_`) && !k.endsWith(`_${hoy}`)) localStorage.removeItem(k);
    }
  } catch {
    // Modo incógnito con el almacenamiento bloqueado: se cuenta igual, sin
    // dedup. Preferimos un paso de más antes que perder el de un comprador real.
  }

  fetch(`/api/store-funnel/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paso }),
  }).catch(() => {});
}
