"use client";
import { useState } from "react";
import Image, { type ImageProps } from "next/image";

// Mismo motivo que los demás componentes de esta carpeta: una sola versión de
// "imagen con fade-in" para todos los templates, en vez de repetir el mismo
// useState/onLoad en cada <Image> de cada archivo.
// Mientras la foto descarga se ve el fondo de color del contenedor (ya lo
// tienen todas las secciones); apenas termina, aparece con un fundido suave
// en vez de aparecer de golpe.
export function FadeImage({ alt, style, onLoad, onError, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      // Si la imagen no carga (URL rota, 404), igual la mostramos — mejor el
      // ícono de imagen rota del navegador que dejarla invisible para siempre.
      onError={(e) => { setLoaded(true); onError?.(e); }}
      style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 0.45s ease" }}
    />
  );
}
