/* Los logos de las redes que se cargan en Configuración → Redes sociales, como
   trazos de 24×24 para usar con `fill="currentColor"`. Es sólo el dibujo de cada
   logo: el botón que lo lleva (forma, borde, brillo) es de cada template.
   Copiados tal cual de los de Aire (01/10/26). */

export type RedSocial = "instagram" | "facebook" | "tiktok" | "youtube" | "pinterest";

export const REDES_SOCIALES: readonly { clave: RedSocial; nombre: string; trazo: string }[] = [
  { clave: "instagram", nombre: "Instagram", trazo: "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2a3.8 3.8 0 0 1-.9 1.4c-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Z" },
  { clave: "facebook", nombre: "Facebook", trazo: "M15.5 8.5h-2v-1c0-.6.1-1 .9-1h1.1V4.1c-.3 0-1-.1-1.8-.1-1.9 0-3.2 1.1-3.2 3.2v1.3H8.5v2.6h2v6.9h3v-6.9h2.1l.4-2.6Z" },
  { clave: "tiktok", nombre: "TikTok", trazo: "M16.5 3c.3 1.9 1.4 3.1 3.3 3.3v2.6c-1.1.1-2.1-.2-3.2-.9v4.9c0 4.5-4.9 5.9-7 2.7-1.3-2.1-.5-5.7 3.5-5.9v2.7c-.3 0-.6.1-1 .2-1 .3-1.5.9-1.4 1.9.3 1.9 3.8 2.4 3.5-1.2V3h2.3Z" },
  { clave: "youtube", nombre: "YouTube", trazo: "M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z" },
  { clave: "pinterest", nombre: "Pinterest", trazo: "M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1a4.8 4.8 0 0 0-5 4.8c0 1 .4 2 .9 2.5.1.1.1.2.1.3l-.3 1c0 .2-.1.3-.3.2-1.2-.6-2-2.3-2-3.7 0-3 2.2-5.8 6.3-5.8 3.3 0 5.9 2.4 5.9 5.5 0 3.3-2.1 5.9-5 5.9-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.8 1.9-1.2 2.5A10 10 0 1 0 12 2Z" },
];
