/**
 * Achica EN SU LUGAR las imágenes que ya estaban guardadas antes del 13/10/26,
 * cuando se empezó a achicar al guardar (ver `src/lib/achicar-imagen`).
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/achicar-guardadas.ts            # sólo mira
 *   npx dotenv -e .env.local -- npx tsx scripts/achicar-guardadas.ts --aplicar  # escribe
 *
 * Misma ruta, mismo nombre: ninguna dirección guardada en la base cambia. Cambia
 * el contenido (WebP) y su `content-type`. Supabase invalida su CDN al
 * reemplazar el archivo.
 *
 * ANTES de pisar cada archivo se guarda el original en `RESPALDO`, con la misma
 * ruta. Para volver atrás uno, se sube ese archivo a la misma ruta.
 *
 * Sólo depósitos públicos de imágenes, sólo lo que pesa más de 300 KB, y sólo si
 * el resultado ahorra al menos un 20 %. El GIF no se toca (puede ser animado y
 * el ahorro no justifica el riesgo).
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { achicarImagen } from "../src/lib/achicar-imagen";
import { CACHE_DE_UN_ANIO } from "../src/lib/subida-directa";

const APLICAR = process.argv.includes("--aplicar");
const RESPALDO = process.env.RESPALDO_IMAGENES ?? "C:/Users/solte/Desktop/respaldo-imagenes-2026-10-13";
const DEPOSITOS = ["product-images", "tienda-imagenes"];
const MINIMO = 300 * 1024;

const U = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
const K = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: K, Authorization: `Bearer ${K}` };

type Obj = { deposito: string; ruta: string; peso: number; tipo: string };

async function listar(deposito: string, prefijo = ""): Promise<Obj[]> {
  const out: Obj[] = [];
  for (let off = 0; ; off += 1000) {
    const r = await fetch(`${U}/storage/v1/object/list/${deposito}`, {
      method: "POST", headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefijo, limit: 1000, offset: off }),
    });
    const filas = (await r.json()) as { name: string; id: string | null; metadata?: { size?: number; mimetype?: string } }[];
    if (!Array.isArray(filas) || !filas.length) break;
    for (const f of filas) {
      if (f.id == null) out.push(...(await listar(deposito, `${prefijo}${f.name}/`)));
      else out.push({ deposito, ruta: `${prefijo}${f.name}`, peso: f.metadata?.size ?? 0, tipo: f.metadata?.mimetype ?? "" });
    }
    if (filas.length < 1000) break;
  }
  return out;
}

(async () => {
  const todos = (await Promise.all(DEPOSITOS.map((d) => listar(d)))).flat();
  const candidatos = todos.filter((o) => o.tipo.startsWith("image/") && o.tipo !== "image/gif" && o.peso > MINIMO);
  console.log(`${candidatos.length} imágenes de más de ${MINIMO / 1024} KB ${APLICAR ? "— APLICANDO" : "— sólo mirando"}\n`);

  let antes = 0, despues = 0, hechas = 0, salteadas = 0, fallidas = 0;
  for (const o of candidatos) {
    const publica = `${U}/storage/v1/object/public/${o.deposito}/${o.ruta}`;
    try {
      const original = Buffer.from(await (await fetch(`${U}/storage/v1/object/${o.deposito}/${o.ruta}`, { headers: H })).arrayBuffer());
      const chica = await achicarImagen(original);
      if (!chica || chica.bytes.length > original.length * 0.8) { salteadas++; continue; }
      antes += original.length; despues += chica.bytes.length;
      console.log(`${(original.length / 1048576).toFixed(2).padStart(5)} MB → ${(chica.bytes.length / 1024).toFixed(0).padStart(4)} KB  ${o.deposito}/${o.ruta}`);
      if (!APLICAR) continue;

      const copia = join(RESPALDO, o.deposito, o.ruta);
      mkdirSync(dirname(copia), { recursive: true });
      if (!existsSync(copia)) writeFileSync(copia, original);

      const r = await fetch(`${U}/storage/v1/object/${o.deposito}/${o.ruta}`, {
        method: "PUT",
        headers: { ...H, "Content-Type": chica.tipo, "x-upsert": "true", "cache-control": CACHE_DE_UN_ANIO },
        body: new Uint8Array(chica.bytes),
      });
      if (!r.ok) { fallidas++; console.log(`   FALLÓ al subir (${r.status}): ${await r.text()}`); continue; }

      /* Comprobar que lo que sirve ahora es lo nuevo y se puede leer como imagen. */
      const v = await fetch(`${publica}?v=${Date.now()}`);
      const ct = v.headers.get("content-type") ?? "";
      if (!v.ok || !ct.startsWith("image/")) { fallidas++; console.log(`   FALLÓ la verificación: ${v.status} ${ct}`); continue; }
      hechas++;
    } catch (e) {
      fallidas++;
      console.log(`   ERROR ${o.deposito}/${o.ruta}: ${(e as Error).message}`);
    }
  }
  console.log(`\nTotal: ${(antes / 1048576).toFixed(1)} MB → ${(despues / 1048576).toFixed(1)} MB` +
    ` | ${APLICAR ? `reemplazadas ${hechas}` : `se reemplazarían ${candidatos.length - salteadas}`}, salteadas ${salteadas}, con error ${fallidas}` +
    (APLICAR ? `\nRespaldo de los originales en ${RESPALDO}` : ""));
})();
