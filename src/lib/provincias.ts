// Códigos de provincia ISO 3166-2:AR, usados tanto por Correo Argentino como
// por Envíopack para cotizar envíos.
const POR_CODIGO: { code: string; name: string }[] = [
  { code: "A", name: "Salta" }, { code: "B", name: "Buenos Aires" }, { code: "C", name: "CABA" },
  { code: "D", name: "San Luis" }, { code: "E", name: "Entre Ríos" }, { code: "F", name: "La Rioja" },
  { code: "G", name: "Santiago del Estero" }, { code: "H", name: "Chaco" }, { code: "J", name: "San Juan" },
  { code: "K", name: "Catamarca" }, { code: "L", name: "La Pampa" }, { code: "M", name: "Mendoza" },
  { code: "N", name: "Misiones" }, { code: "P", name: "Formosa" }, { code: "Q", name: "Neuquén" },
  { code: "R", name: "Río Negro" }, { code: "S", name: "Santa Fe" }, { code: "T", name: "Tucumán" },
  { code: "U", name: "Chubut" }, { code: "V", name: "Tierra del Fuego" }, { code: "W", name: "Corrientes" },
  { code: "X", name: "Córdoba" }, { code: "Y", name: "Jujuy" }, { code: "Z", name: "Santa Cruz" },
];

/* En el orden en que la gente las busca (05/10/26): Buenos Aires y CABA
   primero —son la mayoría de los envíos— y después por nombre. Estaban en el
   orden de los códigos, así que el desplegable del checkout arrancaba en Salta.
   Nadie depende del orden: se usa para mostrar y para validar códigos. */
const PRIMERO = ["B", "C"];
export const PROVINCIAS_ARGENTINA: { code: string; name: string }[] = [
  ...PRIMERO.map((c) => POR_CODIGO.find((p) => p.code === c)!),
  ...POR_CODIGO.filter((p) => !PRIMERO.includes(p.code)).sort((a, b) => a.name.localeCompare(b.name, "es")),
];
