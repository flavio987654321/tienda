import type { StorefrontProduct } from "@/hooks/useStorefront";
import { parseReel } from "@/components/store/ProductReels";

/**
 * Los videos que la agencia ya subió en sus vehículos, para el bloque "Videos"
 * de la portada (07/10/26). No hay que subir nada aparte: cada video lleva a
 * su vehículo. Primero uno por vehículo (que no sea un solo auto con diez
 * videos), después el resto, hasta `tope`.
 */
export type VideoDeVehiculo = { producto: StorefrontProduct; url: string };

export function videosDeVehiculos(productos: StorefrontProduct[], tope = 8): VideoDeVehiculo[] {
  const conVideo = productos.map((p) => ({ p, urls: (p.reelUrls ?? []).filter((u) => parseReel(u)) })).filter((x) => x.urls.length);
  const primeros = conVideo.map((x) => ({ producto: x.p, url: x.urls[0] }));
  const resto = conVideo.flatMap((x) => x.urls.slice(1).map((url) => ({ producto: x.p, url })));
  return [...primeros, ...resto].slice(0, tope);
}
