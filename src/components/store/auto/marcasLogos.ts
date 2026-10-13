import { getContrastColor } from "@/contexts/EditContext";

/**
 * Logos, colores y siglas de las marcas de vehículos, para la fila de marcas de
 * los catálogos. Salió de /vehiculos (VehiculosGenerico) el 13/10/26 para que el
 * catálogo propio de Auto Volt use la misma tabla y no una copia.
 */

// Brand characteristic colors for the logo row
const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  toyota:          { bg: "#eb0a1e", text: "#fff" },
  ford:            { bg: "#003478", text: "#fff" },
  chevrolet:       { bg: "#c9a84c", text: "#000" },
  honda:           { bg: "#cc0000", text: "#fff" },
  volkswagen:      { bg: "#001e50", text: "#fff" },
  vw:              { bg: "#001e50", text: "#fff" },
  renault:         { bg: "#efdf00", text: "#000" },
  fiat:            { bg: "#cc0000", text: "#fff" },
  peugeot:         { bg: "#0055a4", text: "#fff" },
  citroen:         { bg: "#ef0000", text: "#fff" },
  "citroën":       { bg: "#ef0000", text: "#fff" },
  nissan:          { bg: "#c3002f", text: "#fff" },
  hyundai:         { bg: "#002c5f", text: "#fff" },
  kia:             { bg: "#05141f", text: "#fff" },
  jeep:            { bg: "#006241", text: "#fff" },
  mercedes:        { bg: "#222", text: "#fff" },
  "mercedes-benz": { bg: "#222", text: "#fff" },
  bmw:             { bg: "#1c69d4", text: "#fff" },
  audi:            { bg: "#bb0a14", text: "#fff" },
  yamaha:          { bg: "#003087", text: "#fff" },
  kawasaki:        { bg: "#4f9f1f", text: "#fff" },
  suzuki:          { bg: "#204399", text: "#fff" },
  harley:          { bg: "#ff6600", text: "#fff" },
  "harley-davidson": { bg: "#ff6600", text: "#fff" },
  ram:             { bg: "#1a1a1a", text: "#fff" },
  dodge:           { bg: "#cc0000", text: "#fff" },
  mitsubishi:      { bg: "#c00", text: "#fff" },
  subaru:          { bg: "#003087", text: "#fff" },
  mazda:           { bg: "#910a0c", text: "#fff" },
  volvo:           { bg: "#003057", text: "#fff" },
  chery:           { bg: "#c00", text: "#fff" },
  geely:           { bg: "#1a3f6e", text: "#fff" },
  byd:             { bg: "#1565c0", text: "#fff" },
  mg:              { bg: "#c00", text: "#fff" },
  lifan:           { bg: "#0055a4", text: "#fff" },
};

// Simple Icons CDN — SVGs con fondo transparente, shadow sigue el contorno real del logo
const SIMPLE_ICONS: Record<string, { slug: string; hex: string }> = {
  toyota:            { slug: "toyota",         hex: "EB0A1E" },
  ford:              { slug: "ford",           hex: "003478" },
  chevrolet:         { slug: "chevrolet",      hex: "C9A84C" },
  honda:             { slug: "honda",          hex: "CC0000" },
  volkswagen:        { slug: "volkswagen",     hex: "001E50" },
  vw:                { slug: "volkswagen",     hex: "001E50" },
  renault:           { slug: "renault",        hex: "EFDF00" },
  fiat:              { slug: "fiat",           hex: "CC0000" },
  peugeot:           { slug: "peugeot",        hex: "0055A4" },
  citroen:           { slug: "citroen",        hex: "EF0000" },
  "citroën":         { slug: "citroen",        hex: "EF0000" },
  nissan:            { slug: "nissan",         hex: "C3002F" },
  hyundai:           { slug: "hyundai",        hex: "002C5F" },
  kia:               { slug: "kia",            hex: "05141F" },
  jeep:              { slug: "jeep",           hex: "006241" },
  "mercedes-benz":   { slug: "mercedesbenz",   hex: "222222" },
  mercedes:          { slug: "mercedesbenz",   hex: "222222" },
  bmw:               { slug: "bmw",            hex: "1C69D4" },
  audi:              { slug: "audi",           hex: "BB0A14" },
  yamaha:            { slug: "yamaha",         hex: "003087" },
  kawasaki:          { slug: "kawasaki",       hex: "4F9F1F" },
  suzuki:            { slug: "suzuki",         hex: "204399" },
  "harley-davidson": { slug: "harleydavidson", hex: "FF6600" },
  harley:            { slug: "harleydavidson", hex: "FF6600" },
  mitsubishi:        { slug: "mitsubishi",     hex: "CC0000" },
  subaru:            { slug: "subaru",         hex: "003087" },
  mazda:             { slug: "mazda",          hex: "910A0C" },
  volvo:             { slug: "volvo",          hex: "003057" },
  byd:               { slug: "byd",            hex: "1565C0" },
  dodge:             { slug: "dodge",          hex: "CC0000" },
};

const BRAND_DOMAINS: Record<string, string> = {
  ram:    "ramtrucks.com",
  chery:  "chery.com",
  geely:  "geely.com",
  mg:     "mgmotor.com",
  lifan:  "lifan.com",
};

/** De una tabla de marcas: igual, o la marca empieza con ella ("Ford Motor" → ford).
    Antes alcanzaba con que una CONTUVIERA a la otra: "Ram" encontraba a "Ramírez
    Motos" y una marca de una letra encontraba cualquiera. */
function deTabla<T>(tabla: Record<string, T>, brand: string): T | undefined {
  const key = brand.toLowerCase().trim().replace(/\s+/g, " ");
  if (tabla[key]) return tabla[key];
  const conGuion = key.replace(/ /g, "-");
  if (tabla[conGuion]) return tabla[conGuion];
  return Object.entries(tabla).find(([k]) => k.length > 1 && (key.startsWith(k + " ") || key.startsWith(k + "-")))?.[1];
}

/** El logo, sólo de las marcas conocidas. Antes, a una desconocida se le pedía el
    ícono a Google con "<marca>.com" y volvía el globo genérico (5.5 de la
    auditoría): sin logo conocido va el círculo con la sigla. */
export function getBrandLogoUrl(brand: string): string | null {
  const si = deTabla(SIMPLE_ICONS, brand);
  if (si) return `https://cdn.simpleicons.org/${si.slug}/${si.hex}`;
  const domain = deTabla(BRAND_DOMAINS, brand);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}

export function getBrandStyle(brand: string, accent: string): { bg: string; text: string } {
  return deTabla(BRAND_COLORS, brand) ?? { bg: accent, text: getContrastColor(accent) === "dark" ? "#111" : "#fff" };
}

export function brandAbbr(name: string): string {
  if (name.length <= 3) return name.toUpperCase();
  // "Mercedes-Benz" → "MB", "Volkswagen" → "VW" style
  const specials: Record<string, string> = {
    "volkswagen": "VW", "mercedes-benz": "MB", "mercedes": "MB",
    "harley-davidson": "HD", "harley": "HD",
  };
  const key = name.toLowerCase().trim();
  if (specials[key]) return specials[key];
  // "John Deere" → "JD", "Can-Am" → "CA"; una sola palabra, las tres primeras.
  const palabras = name.trim().split(/[\s-]+/).filter(Boolean);
  if (palabras.length > 1) return palabras.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return name.trim().substring(0, 3).toUpperCase();
}
