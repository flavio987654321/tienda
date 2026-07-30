"use client";
import { useState } from "react";
import Image, { type ImageProps } from "next/image";

// Mismo motivo que los demás componentes de esta carpeta: una sola versión de
// "imagen con fade-in" para todos los templates, en vez de repetir el mismo
// useState/onLoad en cada <Image> de cada archivo.
// Mientras la foto descarga se ve el fondo de color del contenedor (ya lo
// tienen todas las secciones); apenas termina, aparece con un fundido suave
// en vez de aparecer de golpe.
/* ── Fotos de relleno: no se optimizan ────────────────────────────────────────
   `picsum.photos`, `pravatar.cc` y `unsplash.com` son las fotos de mentira que
   usan los templates cuando el dueño todavía no subió las suyas, y las que traen
   los productos demo del editor. Pasarlas por el optimizador de Vercel cuesta
   exactamente lo mismo que optimizar una foto real —cada ancho es una
   transformación— y se está pagando por una imagen que nadie va a ver en una
   tienda publicada.
   `unoptimized` las sirve tal cual vienen del origen: no tocan la cuota.
   Que sean un poco más pesadas da igual, son de relleno.
   Va acá adentro y no en cada template porque los diez dibujan sus fotos con este
   componente: un solo lugar para acertar, y ninguno se puede olvidar. */
const HOSTS_DE_RELLENO = ["picsum.photos", "pravatar.cc", "images.unsplash.com"];

function esFotoDeRelleno(src: ImageProps["src"]): boolean {
  if (typeof src !== "string") return false;
  return HOSTS_DE_RELLENO.some(h => src.includes(h));
}

export function FadeImage({ alt, style, onLoad, onError, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      // El `|| props.unoptimized` deja pasar la decisión de quien la usa: si alguien
      // ya lo había pedido a mano, se respeta. Esto sólo AGREGA el caso del relleno.
      unoptimized={esFotoDeRelleno(props.src) || props.unoptimized}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      // Si la imagen no carga (URL rota, 404), igual la mostramos — mejor el
      // ícono de imagen rota del navegador que dejarla invisible para siempre.
      onError={(e) => { setLoaded(true); onError?.(e); }}
      style={{ ...style, opacity: loaded ? (style?.opacity ?? 1) : 0, transition: style?.transition ? `${style.transition}, opacity 0.45s ease` : "opacity 0.45s ease" }}
    />
  );
}
