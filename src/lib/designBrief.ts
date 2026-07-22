// Opciones del formulario "Diseñá tu propia tienda" (/diseno-propio).
// Fuente única: las importan tanto la página (para pintar los pasos) como la API
// (para validar que lo que llega es uno de estos ids y no basura). Antes estaban
// duplicadas en los dos lados y se desincronizaban.

export type Option = { id: string; label: string; desc: string };

// Rubros del formulario. OJO: no son los mismos que STORE_TYPES. Acá se pregunta
// "qué querés vender" para orientar el diseño, e incluye rubros que todavía no
// existen como tipo de tienda real (inmobiliaria, hotelería). Un brief puede
// pedirlos aunque el alta de tienda todavía no los ofrezca — de hecho, sirve
// para medir cuánta demanda hay antes de construir la plantilla.
export const RUBROS: { id: string; label: string; emoji: string }[] = [
  { id: "ROPA",         label: "Moda y ropa",     emoji: "👗" },
  { id: "HOGAR_TECH",   label: "Tecno y hogar",   emoji: "🏠" },
  { id: "AUTOS",        label: "Autos y motos",   emoji: "🚗" },
  { id: "GASTRONOMIA",  label: "Gastronomía",     emoji: "🍽️" },
  { id: "HOTELERIA",    label: "Hotelería",       emoji: "🏨" },
  { id: "INMOBILIARIA", label: "Inmobiliaria",    emoji: "🏢" },
  { id: "GENERAL",      label: "Otros",           emoji: "🏪" },
];

// Estéticas: la "onda" visual del diseño. Cada una lleva dos colores para pintar
// un degradé de muestra en la tarjeta (from → to), así se elige mirando, no
// leyendo. Son cerradas a propósito: una plantilla es un componente con anatomía
// fija, y elegir entre opciones evita que alguien pida algo irrealizable.
export const ESTETICAS: (Option & { from: string; to: string })[] = [
  { id: "oscura-editorial",   label: "Oscura y editorial",    desc: "Elegante, fondo negro, aire de revista de moda.",     from: "#0a0a0a", to: "#c9a84c" },
  { id: "clara-minimalista",  label: "Clara y minimalista",   desc: "Mucho blanco, limpia, sin adornos.",                  from: "#ffffff", to: "#cbd5e1" },
  { id: "calida-natural",     label: "Cálida y natural",      desc: "Tonos tierra, artesanal, hecho a mano.",              from: "#faf7f2", to: "#b5652a" },
  { id: "energetica",         label: "Energética",            desc: "Contraste fuerte, deportiva, con movimiento.",        from: "#0f0f0f", to: "#d4ff00" },
  { id: "moderna-tech",       label: "Moderna y tecnológica", desc: "Vibrante y actual, con colores saturados.",           from: "#fafaff", to: "#7c3aed" },
  { id: "clasica-confiable",  label: "Clásica y confiable",   desc: "Seria y directa, con foco en el precio.",             from: "#f0f4f8", to: "#2563eb" },
  { id: "romantica-suave",    label: "Romántica y suave",     desc: "Delicada, con pasteles y curvas.",                    from: "#fff1f5", to: "#f472b6" },
  { id: "lujo-premium",       label: "Lujo premium",          desc: "Sobria y cara, con dorados sobre oscuro.",            from: "#1a1408", to: "#d4af37" },
  { id: "fresca-veraniega",   label: "Fresca y veraniega",    desc: "Colores vivos, playera, con onda relajada.",          from: "#ecfeff", to: "#06b6d4" },
  { id: "retro-vintage",      label: "Retro y vintage",       desc: "Aire de otra época, cálida y nostálgica.",            from: "#f5ead6", to: "#c1683c" },
  { id: "urbana-street",      label: "Urbana y street",       desc: "De la calle, con actitud y alto contraste.",          from: "#111827", to: "#f43f5e" },
  { id: "profesional-sobria", label: "Profesional y sobria",  desc: "Formal y prolija, ideal para servicios.",             from: "#f8fafc", to: "#334155" },
];

// Paletas: los tres colores base del diseño. Se elige mirando las muestras.
export const PALETAS: { id: string; label: string; colors: [string, string, string] }[] = [
  { id: "neutros",   label: "Neutros",    colors: ["#111111", "#6b7280", "#f3f4f6"] },
  { id: "tierra",    label: "Tierra",     colors: ["#2c2218", "#b5652a", "#faf7f2"] },
  { id: "vivos",     label: "Vivos",      colors: ["#e11d48", "#f97316", "#facc15"] },
  { id: "frios",     label: "Fríos",      colors: ["#0f172a", "#2563eb", "#bae6fd"] },
  { id: "pasteles",  label: "Pasteles",   colors: ["#fbcfe8", "#ddd6fe", "#bbf7d0"] },
  { id: "verdes",    label: "Verdes",     colors: ["#064e3b", "#0d9488", "#d1fae5"] },
  { id: "rosados",   label: "Rosados",    colors: ["#831843", "#ec4899", "#fce7f3"] },
  { id: "dorados",   label: "Dorados",    colors: ["#1c1917", "#d4af37", "#faf3dd"] },
  { id: "oceano",    label: "Océano",     colors: ["#0c4a6e", "#0ea5e9", "#e0f2fe"] },
  { id: "atardecer", label: "Atardecer",  colors: ["#7c2d12", "#f97316", "#fed7aa"] },
  { id: "violetas",  label: "Violetas",   colors: ["#4c1d95", "#8b5cf6", "#ede9fe"] },
  { id: "blanco-negro", label: "Blanco y negro", colors: ["#000000", "#525252", "#ffffff"] },
];

export const RUBRO_IDS = RUBROS.map((r) => r.id);
export const ESTETICA_IDS = ESTETICAS.map((e) => e.id);
export const PALETA_IDS = PALETAS.map((p) => p.id);
