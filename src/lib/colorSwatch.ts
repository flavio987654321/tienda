// Los colores de producto se guardan como texto libre (ej. "Negro", "Azul
// marino"), no como código hex, porque el vendedor los tipea a mano. Para
// mostrar un swatch visual en el selector de color, mapeamos los nombres más
// comunes en español a un color CSS aproximado. Si el nombre no se reconoce
// (ej. "Floral", "Estampado X"), no hay swatch — el selector sigue mostrando
// solo el texto, como antes.
const COLOR_NAME_MAP: Record<string, string> = {
  negro: "#111111", blanco: "#ffffff", gris: "#9ca3af", plateado: "#c0c0c0",
  rojo: "#dc2626", bordo: "#7f1d1d", granate: "#7f1d1d",
  azul: "#2563eb", celeste: "#7dd3fc", turquesa: "#06b6d4",
  verde: "#16a34a", oliva: "#6b7a3a", esmeralda: "#10b981",
  amarillo: "#eab308", dorado: "#ca8a04", mostaza: "#ca8a04",
  naranja: "#f97316", rosa: "#ec4899", fucsia: "#db2777",
  violeta: "#7c3aed", morado: "#7c3aed", lila: "#c4b5fd",
  marron: "#78350f", "marrón": "#78350f", camel: "#c19a6b", beige: "#d6c9a8", crudo: "#e8ddc7",
};

export function colorToSwatch(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (COLOR_NAME_MAP[key]) return COLOR_NAME_MAP[key];
  // Nombres compuestos ("Azul marino", "Verde oliva") — probamos con la primera palabra.
  const firstWord = key.split(/\s+/)[0];
  return COLOR_NAME_MAP[firstWord] ?? null;
}
