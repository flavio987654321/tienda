// Prefijos de los productos de relleno del editor (nunca existen en la base).
// Archivo sin "use client" para que también lo puedan importar Server Components.
const DEMO_ID_PREFIXES = ["demo-", "auto-", "hogar-"];

export function isDemoProductId(id: string) {
  return DEMO_ID_PREFIXES.some(prefix => id.startsWith(prefix));
}
