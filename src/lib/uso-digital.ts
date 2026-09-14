import { topeDe } from "@/lib/productos-digitales";
import type { TierDigital } from "@/lib/planes-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   TU USO — lo que la cuenta tiene contra lo que el plan permite
   ══════════════════════════════════════════════════════════════════════════

   Es la tarjeta que la competencia pone en "Mi plan" (Tiendas 1/1,
   Almacenamiento 92 KB…) y que acá se postergó hasta que hubiera qué contar:
   una barra clavada en 0 es un número inventado esperando a mentir. Ahora hay
   productos, archivos y cupos de IA, así que se cuentan.

   Se cuenta lo CREADO y no sólo lo publicado, porque el tope del plan cierra
   las dos puertas (ver `porQueNoSePublica`): crear uno más y publicar uno más.
   La barra dice cuánto lugar queda para crear, que es lo que la persona se
   pregunta; y al lado va cuántos están publicados, que es lo que se le apagó
   si cayó de plan.

   Los bonos y los upsells son POR PRODUCTO, no por cuenta —el tope de Starter
   son 2 bonos en CADA página—, así que no entran en una barra sola: van por
   página, un renglón cada una.

   Los archivos no tienen tope por plan —el único es el de cada PDF, en
   `subida-digital`—, así que se dicen como número y sin barra. Una barra sin
   tope es una barra contra nada.

   ⚠️ Este archivo NO toca la base a propósito: lo importa la tarjeta, que es
   un componente de navegador, y un import de Prisma desde ahí arrastra el
   cliente entero al bundle. La consulta vive en `mi-cuenta/page.tsx`. */

/** Lo que se lee de cada producto vivo. Sólo lo que hace falta para contar. */
export type FilaDeUso = {
  id: string;
  name: string;
  rolDigital: string | null;
  padreId: string | null;
  isActive: boolean;
  archivoPeso: number | null;
};

export type UsoDeLaCuenta = {
  paginas: { creadas: number; publicadas: number; tope: number };
  /** Una por página de venta, en el orden en que se crearon. */
  porPagina: { id: string; name: string; publicada: boolean; bonos: number; upsells: number }[];
  topes: { bonos: number; upsells: number };
  archivos: { cantidad: number; bytes: number };
};

/**
 * Cuenta. Pura: recibe las filas y devuelve los números, para poder probarla
 * sin base.
 *
 * Los hijos huérfanos —bonos cuyo padre se borró— no cuentan en ninguna
 * página, pero sus archivos sí pesan: están en el depósito igual.
 */
export function armarUso(filas: FilaDeUso[], tier: TierDigital): UsoDeLaCuenta {
  const principales = filas.filter((f) => f.rolDigital === "PRINCIPAL");
  const porPagina = principales.map((p) => ({
    id: p.id,
    name: p.name,
    publicada: p.isActive,
    bonos: filas.filter((f) => f.padreId === p.id && f.rolDigital === "BONO").length,
    upsells: filas.filter((f) => f.padreId === p.id && f.rolDigital === "UPSELL").length,
  }));

  const conArchivo = filas.filter((f) => f.archivoPeso !== null && f.archivoPeso > 0);

  return {
    paginas: {
      creadas: principales.length,
      publicadas: principales.filter((p) => p.isActive).length,
      tope: topeDe(tier, "PRINCIPAL"),
    },
    porPagina,
    topes: { bonos: topeDe(tier, "BONO"), upsells: topeDe(tier, "UPSELL") },
    archivos: {
      cantidad: conArchivo.length,
      bytes: conArchivo.reduce((suma, f) => suma + (f.archivoPeso ?? 0), 0),
    },
  };
}

/**
 * El peso en palabras: "92 KB", "2,1 MB", "1,3 GB". Con coma, que es como se
 * escribe acá. Cero se dice "0 KB" y no "0 B": nadie mide archivos en bytes.
 */
export function pesoLegible(bytes: number): string {
  const numero = (n: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);
  if (bytes < 1024 * 1024) return `${numero(Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${numero(bytes / 1024 / 1024)} MB`;
  return `${numero(bytes / 1024 / 1024 / 1024)} GB`;
}

/** "2026-10" → "octubre". Para decir cuándo vuelven las generaciones del mes. */
export function nombreDelMes(clave: string): string {
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const mes = Number(clave.split("-")[1]);
  return MESES[mes - 1] ?? clave;
}
