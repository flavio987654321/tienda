// Paleta cerrada de colores de texto para el editor de descripción de productos.
// Se comparte entre el cliente (RichTextEditor.tsx, para pintar los swatches) y
// el servidor (products.ts, para armar el allowlist de sanitize-html) — así los
// dos lados quedan siempre sincronizados y ningún color fuera de esta lista
// puede persistir en la descripción guardada.
export const DESCRIPTION_TEXT_COLORS: { label: string; value: string }[] = [
  { label: "Negro", value: "#111827" },
  { label: "Gris", value: "#6b7280" },
  { label: "Rojo", value: "#ef4444" },
  { label: "Naranja", value: "#f97316" },
  { label: "Amarillo", value: "#f59e0b" },
  { label: "Verde", value: "#22c55e" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Violeta", value: "#a855f7" },
];
