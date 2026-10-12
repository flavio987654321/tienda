/**
 * Chequeos de `foto-liviana`. Se corre a mano:
 *
 *   npx tsx src/lib/foto-liviana.check.ts
 *
 * El primero es el que importa: si alguien toca `deviceSizes` o `imageSizes` en
 * next.config y no acá, el optimizador contesta 400 y las fotos de los
 * templates de autos y los flyers desaparecen. No da error de compilación.
 */

import { readFileSync } from "node:fs";
import { fotoLiviana } from "./foto-liviana";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const config = readFileSync("next.config.ts", "utf8");
const lista = (nombre: string) =>
  (config.match(new RegExp(`${nombre}:\\s*\\[([^\\]]*)\\]`))?.[1] ?? "").split(",").map((n) => Number(n.trim())).filter(Boolean);
const permitidos = new Set([...lista("deviceSizes"), ...lista("imageSizes")]);
const SUPA = "https://abc.supabase.co/storage/v1/object/public/product-images/products/x.png";

for (const pedido of [1, 64, 200, 300, 640, 680, 1000, 1500, 1920, 4000]) {
  const w = Number(new URL(fotoLiviana(SUPA, pedido), "https://x").searchParams.get("w"));
  chequear(`ancho ${pedido} → ${w} está en next.config`, permitidos.has(w), [...permitidos]);
}
chequear("q=75 está permitido (Next 16 sólo acepta los de `qualities`, default [75])",
  !/qualities:/.test(config) || /qualities:\s*\[[^\]]*\b75\b/.test(config));

chequear("una foto de Supabase pasa por el optimizador", fotoLiviana(SUPA, 640).startsWith("/_next/image?url="));
chequear("la url va codificada", fotoLiviana(SUPA, 640).includes(encodeURIComponent(SUPA)));
chequear("lo firmado NO (vence y rompe el caché)", fotoLiviana("https://abc.supabase.co/storage/v1/object/sign/b/x.png?token=1", 640).startsWith("https://"));
chequear("SVG NO (el optimizador lo rechaza)", fotoLiviana("https://abc.supabase.co/storage/v1/object/public/b/logo.svg", 640).endsWith(".svg"));
chequear("otro dominio pasa tal cual", fotoLiviana("https://images.unsplash.com/a.jpg", 640) === "https://images.unsplash.com/a.jpg");
chequear("blob de la vista previa pasa tal cual", fotoLiviana("blob:https://x/1", 640) === "blob:https://x/1");
chequear("ruta local pasa tal cual", fotoLiviana("/uploads/a.png", 640) === "/uploads/a.png");
chequear("vacío da vacío", fotoLiviana(undefined, 640) === "" && fotoLiviana("", 640) === "");
chequear("un dominio que sólo termina parecido NO", fotoLiviana("https://supabase.co.malo.com/storage/v1/object/public/a.png", 640).startsWith("https://"));

console.log(fallos ? `\n${fallos} con problemas` : "\nTodo bien");
if (fallos) process.exit(1);
