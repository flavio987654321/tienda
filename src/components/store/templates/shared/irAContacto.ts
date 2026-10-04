/* ══════════════════════════════════════════════════════════════════════════
   "ESCRIBINOS" DE LAS PREGUNTAS FRECUENTES (Boho, Urban, Chic)
   ══════════════════════════════════════════════════════════════════════════

   En esos templates el contacto es un BLOQUE de la portada (#contacto), no una
   pantalla aparte como en Aire o Aurora. Si la dueña lo ocultó —en todos lados
   o sólo en el celular—, bajar hasta él no hacía nada y el botón parecía roto
   (auditoría del 04/10/26).

   Ahora: si el bloque se ve, baja hasta él; si no, abre el WhatsApp de la
   tienda; y si tampoco hay WhatsApp, baja al pie, donde están sus datos. */

type WhatsApp = { enabled?: boolean; number?: string; message?: string } | undefined;

export function irAContactoOWhatsApp(irASeccion: (id: string) => void, whatsapp: WhatsApp) {
  const bloque = document.getElementById("contacto");
  // `offsetParent` es null cuando el bloque (o algo que lo contiene) tiene display:none.
  if (bloque && bloque.offsetParent !== null) { irASeccion("contacto"); return; }
  const numero = whatsapp?.enabled ? (whatsapp.number ?? "").replace(/\D/g, "") : "";
  if (numero) {
    window.open(`https://wa.me/${numero}${whatsapp?.message ? "?text=" + encodeURIComponent(whatsapp.message) : ""}`, "_blank", "noopener");
    return;
  }
  document.querySelector("footer")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
