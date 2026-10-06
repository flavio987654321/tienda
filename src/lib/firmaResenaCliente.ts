/* La firma de "compra verificada", del lado del navegador (ver `lib/firmaResena`).

   El link del mail de "tu pedido fue entregado" trae `?resena=<firma>`. Se
   guarda apenas carga este módulo —antes de que algún template limpie la
   dirección— en sessionStorage, y los formularios de reseña la mandan con
   `firmaDeResena()`. Sin firma, la reseña se publica igual, sin el sello.

   Una sola clave y no una por tienda: las tiendas con dominio propio no tienen
   `/tienda/<slug>` en la dirección, y la firma ya está atada a un pedido de una
   tienda puntual (el servidor lo verifica). */

const CLAVE = "resena-firma";

function capturar() {
  try {
    const firma = new URL(window.location.href).searchParams.get("resena");
    if (firma) sessionStorage.setItem(CLAVE, firma);
  } catch { /* sin storage: la reseña sale sin sello */ }
}
if (typeof window !== "undefined") capturar();

export function firmaDeResena(): string | undefined {
  if (typeof window === "undefined") return undefined;
  capturar();
  try { return sessionStorage.getItem(CLAVE) ?? undefined; } catch { return undefined; }
}
