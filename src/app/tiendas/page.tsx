import { listarTiendas, LIMITE_MAXIMO } from "@/lib/tiendasDirectorio";
import TiendasClient from "./TiendasClient";

/**
 * El directorio se arma en el SERVIDOR.
 *
 * Antes esta página era `"use client"` y pedía las tiendas por fetch al montar.
 * Funcionaba perfecto para una persona —el navegador ejecuta el JavaScript y en
 * un parpadeo aparecen las tarjetas—, pero el HTML que salía del servidor no
 * tenía ni un `href` a ninguna tienda. Google entraba acá, no encontraba salida
 * hacia `/tienda/girly-store` ni `/tienda/amaranta`, y esas páginas le quedaban
 * conocidas sólo por el sitemap: es lo que Search Console reporta como
 * "Descubierta: actualmente sin indexar", y por qué en Google aparecían los
 * productos sueltos pero nunca la tienda.
 *
 * Se revalida cada 5 minutos en vez de armarse en cada visita: el listado
 * cambia cuando alguien abre una tienda nueva, no de segundo en segundo, y así
 * Googlebot recibe HTML ya hecho en vez de esperar una consulta a la base.
 */
export const revalidate = 300;

export default async function TiendasPage() {
  // Si la base no responde, la página igual se dibuja: el cliente reintenta por
  // la API. Sin esto un problema momentáneo de la base voltea el build entero.
  let tiendas: Awaited<ReturnType<typeof listarTiendas>>["stores"] = [];
  try {
    ({ stores: tiendas } = await listarTiendas({ limit: LIMITE_MAXIMO }));
  } catch {}

  return <TiendasClient tiendasIniciales={tiendas} />;
}
