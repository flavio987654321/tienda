/* Las marcas de vehículos que se venden en Argentina, para sugerir mientras se
 * carga uno y para avisar de un error de tipeo.
 *
 * Existe porque la marca se escribe a mano y llega tal cual a la tienda: en
 * octubre de 2026 una Hilux cargada como "Toyta" aparecía así en "Explorá por
 * marca", en su propia tarjeta y separada de cualquier otra Toyota.
 *
 * La lista NO limita lo que se puede escribir: una marca que no está acá se
 * carga igual. Sólo sugiere y avisa. Y la tienda no corrige sola: adivinar mal
 * una marca en la vidriera es peor que mostrarla como la escribió la dueña.
 */
import { normalizar } from "./busquedas";

export const MARCAS_VEHICULOS: string[] = [
  // Autos y camionetas
  "Toyota", "Ford", "Chevrolet", "Volkswagen", "Fiat", "Renault", "Peugeot", "Citroën",
  "Nissan", "Honda", "Hyundai", "Kia", "Jeep", "RAM", "Dodge", "Mercedes-Benz", "BMW",
  "Audi", "Chery", "BYD", "Mitsubishi", "Suzuki", "Subaru", "Mazda", "Volvo", "Land Rover",
  "Alfa Romeo", "DS", "Haval", "JAC", "Great Wall", "BAIC", "Mini", "Porsche", "Lexus",
  "Isuzu", "Jetour", "Geely", "Chrysler", "Smart", "Tesla",
  // Motos
  "Yamaha", "Motomel", "Gilera", "Corven", "Zanella", "Keller", "Bajaj", "Benelli",
  "Kawasaki", "KTM", "Harley-Davidson", "Royal Enfield", "Ducati", "Triumph", "Beta",
  "Guerrero", "Mondial", "TVS", "Kymco", "Brava", "Siambretta", "Hero", "Voge", "CFMoto",
  "Husqvarna", "Aprilia", "Vespa", "Jawa", "Okinoi", "Sym",
  // Camiones y utilitarios
  "Scania", "Iveco", "Agrale", "Foton", "Shacman", "International", "DAF", "Hino", "Sinotruk",
  // Maquinaria agrícola
  "John Deere", "Case IH", "New Holland", "Massey Ferguson", "Deutz-Fahr", "Pauny", "Claas",
  "Valtra", "Zanello", "Metalfor", "Pla", "Jacto", "Agrometal", "Apache",
  // Cuatriciclos y UTV
  "Can-Am", "Polaris", "Arctic Cat", "Segway",
];

const POR_CLAVE = new Map(MARCAS_VEHICULOS.map((m) => [normalizar(m), m]));

/** "toyota" o "TOYOTA" → "Toyota"; "mercedes benz" → "Mercedes-Benz". `null` si no es una conocida. */
export function marcaConocida(escrita: string): string | null {
  return POR_CLAVE.get(normalizar(escrita)) ?? null;
}

/** Hasta `max` marcas que empiezan (o tienen una palabra que empieza) con lo escrito. */
export function sugerirMarcas(escrita: string, max = 6): string[] {
  const q = normalizar(escrita);
  if (!q || marcaConocida(escrita)) return [];
  const empiezan: string[] = [];
  const contienen: string[] = [];
  for (const [clave, marca] of POR_CLAVE) {
    if (clave.startsWith(q)) empiezan.push(marca);
    else if (clave.split(" ").some((p) => p.startsWith(q))) contienen.push(marca);
  }
  return [...empiezan, ...contienen].slice(0, max);
}

/* Distancia de edición con trasposición: "Toyta" a "Toyota" es 1 (falta una
   letra), "Fodr" a "Ford" es 1 (dos letras dadas vuelta). */
function distancia(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** La marca conocida que la persona PROBABLEMENTE quiso escribir, o `null`.
 *
 *  Sólo con palabras de 4 letras o más: con 3 ("KIA", "BMW", "DAF") una letra
 *  de diferencia ya es otra marca, y el aviso sería ruido. El tope de errores
 *  crece con el largo, como en cualquier corrector. Si es una conocida, o si
 *  empieza igual que alguna (está escribiendo), no hay nada que avisar. */
export function quisoDecir(escrita: string): string | null {
  const q = normalizar(escrita);
  if (q.length < 4 || marcaConocida(escrita) || sugerirMarcas(escrita, 1).length) return null;
  const tope = q.length >= 7 ? 2 : 1;
  let mejor: { marca: string; d: number } | null = null;
  for (const [clave, marca] of POR_CLAVE) {
    if (Math.abs(clave.length - q.length) > tope) continue;
    const d = distancia(q, clave);
    if (d <= tope && (!mejor || d < mejor.d)) mejor = { marca, d };
  }
  return mejor?.marca ?? null;
}
