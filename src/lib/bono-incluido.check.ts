/**
 * Bonos y upsells: que se entreguen y que la pantalla diga qué pasa (14/10/26).
 * Ver lib/bono-incluido y ESTADO_ROL en digitales/productos/ProductosClient.
 *
 *   npx tsx src/lib/bono-incluido.check.ts
 */
import { readFileSync } from "fs";

let fallos = 0;
function caso(nombre: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${nombre}`);
  if (!ok) fallos++;
}

const leer = (r: string) => readFileSync(r, "utf8");
const confirmar = leer("src/app/api/digitales/archivo/confirmar/route.ts");
const armar = leer("src/app/api/digitales/ia/ebook/armar/route.ts");
const bono = leer("src/lib/bono-incluido.ts");
const pantalla = leer("src/app/digitales/productos/ProductosClient.tsx");

caso("subir el archivo incluye el bono", /incluirBonoAlRecibirArchivo\(producto\.id, user\.id, producto\.archivoPath !== null\)/.test(confirmar));
caso("el ebook de la IA incluye el bono", /incluirBonoAlRecibirArchivo\(producto\.id, user\.id, anterior !== null\)/.test(armar));
caso("sólo con el primer archivo", /if \(teniaArchivo\) return false;/.test(bono));
caso("sólo bonos, nunca un upsell ni el principal", /p\.rolDigital !== "BONO"/.test(bono));
caso("respeta lo que falta (el cobro)", /loQueFalta\(/.test(bono));
caso("respeta el tope del plan", /porQueNoSePublica\("BONO"/.test(bono));

caso("un bono no dice «Publicar»", /BONO: \{ si: "Incluido en la compra", no: "No se entrega todavía", activar: "Incluir en la compra"/.test(pantalla));
caso("un upsell no dice «Publicar»", /UPSELL: \{ si: "Se ofrece al comprar", no: "No se ofrece todavía", activar: "Ofrecer al comprar"/.test(pantalla));
caso("bonos y upsells van en renglones colgados", /<RenglonHijo key=\{h\.id\}/.test(pantalla));
caso("el aviso del clic que falta está arriba del producto", /<AvisoSinEntregar padre=\{p\} acc=\{acc\} \/>\r?\n\s*<Tarjeta p=\{p\} acc=\{acc\} \/>/.test(pantalla));

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
