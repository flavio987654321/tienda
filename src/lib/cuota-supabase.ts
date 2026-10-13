/* ¿Nos estamos acercando a los topes del plan de Supabase?
 *
 * Existe por el corte del 12/10/26: el proyecto se pasó de cuota, Supabase
 * empezó a contestar 402 y nadie pudo iniciar sesión. Supabase avisa recién
 * DESPUÉS de pasarse (un mail a la cuenta de facturación), nunca antes.
 *
 * Se mide lo que se puede medir desde la base: el tamaño de la base y lo que
 * hay guardado en el depósito. El egress —que fue lo que se pasó— NO se puede:
 * no hay forma de consultarlo desde afuera, sólo en Organization → Usage. Por
 * eso el mail siempre lo recuerda, y la defensa contra un corte por egress es
 * otra: el spend cap apagado (cobra el excedente en vez de cortar).
 *
 * Sin estado guardado, a propósito: entre 70% y 90% avisa sólo los lunes (una
 * vez por semana alcanza para algo que crece despacio), y de 90% para arriba
 * todos los días. Así no hace falta una tabla para recordar si ya avisó.
 */

const GB = 1024 ** 3;

/** Los topes del plan Pro (12/10/26). Si se cambia de plan, se cambian acá. */
export const TOPES_PRO = {
  base: 8 * GB,       // disco de la base por proyecto
  deposito: 100 * GB, // archivos guardados
} as const;

export const UMBRAL_AVISO = 0.7;
export const UMBRAL_URGENTE = 0.9;

export type Medicion = { nombre: string; usado: number; tope: number; proporcion: number };

export function medir(baseBytes: number, depositoBytes: number): Medicion[] {
  return [
    { nombre: "Base de datos", usado: baseBytes, tope: TOPES_PRO.base, proporcion: baseBytes / TOPES_PRO.base },
    { nombre: "Archivos guardados", usado: depositoBytes, tope: TOPES_PRO.deposito, proporcion: depositoBytes / TOPES_PRO.deposito },
  ];
}

/** Qué hay que avisar hoy. `diaDeSemana` es el de `getUTCDay()` (1 = lunes). */
export function queAvisar(mediciones: Medicion[], diaDeSemana: number): { avisar: boolean; urgente: boolean; pasadas: Medicion[] } {
  const pasadas = mediciones.filter((m) => m.proporcion >= UMBRAL_AVISO);
  const urgente = pasadas.some((m) => m.proporcion >= UMBRAL_URGENTE);
  return { avisar: urgente || (pasadas.length > 0 && diaDeSemana === 1), urgente, pasadas };
}

export function enGB(bytes: number): string {
  return (bytes / GB).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + " GB";
}
