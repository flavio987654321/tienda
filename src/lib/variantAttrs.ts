// Las variantes de producto guardan sus atributos (talle, color, etc.) como un
// objeto JSON serializado en `variant.name` (ej: '{"talle":"M","color":"Rojo"}').
// Si `name` no es JSON válido o no es un objeto, no hay atributos estructurados.
export function parseVariantAttrs(name: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(name);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
