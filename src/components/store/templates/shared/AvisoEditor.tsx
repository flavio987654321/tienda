"use client";
import { useEditContext } from "@/contexts/EditContext";

/* ══════════════════════════════════════════════════════════════════════════
   AVISO A LA DUEÑA, ADENTRO DE UN BLOQUE (sólo editando)
   ══════════════════════════════════════════════════════════════════════════

   Para decir lo que el editor no muestra: "en tu tienda este bloque no aparece
   hasta…", "estos productos son de ejemplo…". Un solo formato para todos (el
   ⚠️ en ámbar, la misma letra) así se reconoce de un vistazo en cualquier
   template, sea claro u oscuro: la caja trae su propio fondo y no depende del
   de la sección.

   Se esconde solo fuera del modo edición: ni en la vista previa del diseño,
   ni en la tienda publicada, ni en la demo pública (Flavio, 04/10/26: "cuando
   se publique o se quiera ver cómo está quedando no tiene que aparecer ningún
   texto de ayuda"). Quien lo usa no tiene que acordarse de esa condición. */
export function AvisoEditor({ children, margen = "0 0 20px", ancho = 640 }: {
  children: React.ReactNode;
  margen?: string;
  ancho?: number;
}) {
  const { editMode } = useEditContext();
  if (!editMode) return null;
  return (
    <div role="note" style={{ display: "flex", gap: 9, margin: margen, maxWidth: ancho, padding: "10px 13px", background: "#fffbeb",
      border: "1px solid #fde68a", borderRadius: 10, textAlign: "left", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <span aria-hidden style={{ flexShrink: 0, fontSize: 13, lineHeight: 1.45 }}>⚠️</span>
      <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.55, letterSpacing: 0, textTransform: "none", fontStyle: "normal", fontWeight: 400 }}>{children}</p>
    </div>
  );
}
