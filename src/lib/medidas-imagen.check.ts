/**
 * Chequeo del lector de medidas de imagen. Se corre a mano:
 *
 *   npx tsx src/lib/medidas-imagen.check.ts
 *
 * Baja fotos REALES de las tiendas de producción y compara lo que dice el lector
 * de encabezados contra lo que dice el navegador al abrir la misma foto. Si los
 * dos coinciden en todas, el lector sirve.
 *
 * Se prueba así y no con archivos inventados a propósito: un PNG armado a mano en
 * el test sale siempre del mismo generador, y lo que hay que soportar es lo que
 * escupen los editores de fotos que use cada comerciante — Photoshop, Canva, la
 * cámara del celular, el compresor de WhatsApp.
 */

import { medirImagen, avisoDeFotoChica, ANCHO_RECOMENDADO } from "./medidas-imagen";

let fallos = 0;
function afirmar(ok: boolean, desc: string) {
  console.log(`  ${ok ? "ok   " : "FALLA"} ${desc}`);
  if (!ok) fallos++;
}

console.log("\n── El aviso ───────────────────────────────────────────────────");
afirmar(avisoDeFotoChica({ ancho: 285, alto: 400 }) !== null, "una foto de 285px genera aviso");
afirmar(avisoDeFotoChica({ ancho: 800, alto: 600 }) === null, "una de 800px no (es el umbral justo)");
afirmar(avisoDeFotoChica({ ancho: 799, alto: 600 }) !== null, "una de 799px si (un pixel abajo)");
afirmar(avisoDeFotoChica({ ancho: 1199, alto: 1600 }) === null, "una foto de celular de 1199px NO es borrosa");
afirmar(avisoDeFotoChica({ ancho: 4000, alto: 3000 }) === null, "una de 4000px tampoco");
afirmar(avisoDeFotoChica(null) === null, "si no se pudo medir, no se inventa un aviso");
afirmar((avisoDeFotoChica({ ancho: 285, alto: 400 }) ?? "").includes("285"), "el aviso dice cuánto mide de verdad");

console.log("\n── Basura que no debe romper ──────────────────────────────────");
afirmar(medirImagen(Buffer.alloc(0)) === null, "archivo vacío");
afirmar(medirImagen(Buffer.from("no soy una imagen")) === null, "texto suelto");
afirmar(medirImagen(Buffer.from([0xff, 0xd8, 0xff])) === null, "un JPEG cortado a los 3 bytes");
afirmar(medirImagen(Buffer.from([0x89, 0x50, 0x4e, 0x47])) === null, "un PNG con solo la firma");

async function contraFotosReales() {
  console.log("\n── Fotos reales de las tiendas ────────────────────────────────");
  let urls: string[] = [];
  try {
    for (const slug of ["amaranta", "girly-store", "tiendaapps"]) {
      const r = await fetch(`https://www.tiendaapps.com/api/public/${slug}`);
      if (!r.ok) continue;
      const j = await r.json();
      for (const p of j.store?.products ?? []) {
        try {
          const a = JSON.parse(p.images || "[]");
          if (Array.isArray(a)) urls.push(...a.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http")));
        } catch { /* images ilegible */ }
      }
      if (j.store?.logo) urls.push(j.store.logo);
      if (j.store?.banner) urls.push(j.store.banner);
    }
  } catch (e) {
    console.log("  (no se pudieron listar fotos: " + (e as Error).message + ")");
    return;
  }

  urls = [...new Set(urls)].slice(0, 12);
  if (urls.length === 0) { console.log("  (no hay fotos para probar)"); return; }

  let leidas = 0;
  const porFormato = new Map<string, number>();
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const m = medirImagen(buf);
      const fmt = (r.headers.get("content-type") || "?").replace("image/", "");
      porFormato.set(fmt, (porFormato.get(fmt) ?? 0) + 1);
      const nombre = u.split("/").pop()!.slice(0, 28);
      if (m) {
        leidas++;
        const aviso = avisoDeFotoChica(m);
        console.log(`  ok    ${String(m.ancho).padStart(5)}x${String(m.alto).padEnd(5)} ${fmt.padEnd(5)} ${nombre}${aviso ? "   ← BORROSA" : ""}`);
      } else {
        console.log(`  FALLA no se pudo medir  ${fmt.padEnd(5)} ${nombre}`);
        fallos++;
      }
    } catch { /* red */ }
  }
  console.log(`\n  leídas ${leidas} de ${urls.length}   formatos: ${[...porFormato].map(([f, n]) => `${f}×${n}`).join(", ")}`);
  console.log(`  (umbral: menos de ${ANCHO_RECOMENDADO}px se marca como borrosa)`);
}

contraFotosReales().finally(() => {
  console.log(fallos === 0 ? "\nTODO OK\n" : `\n${fallos} FALLA(S)\n`);
  process.exit(fallos === 0 ? 0 : 1);
});
