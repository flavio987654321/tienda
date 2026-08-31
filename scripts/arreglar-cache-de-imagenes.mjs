/**
 * Le pone caché largo a las imágenes que YA están en Supabase Storage.
 *
 *   node scripts/arreglar-cache-de-imagenes.mjs            → sólo mira y cuenta
 *   node scripts/arreglar-cache-de-imagenes.mjs --aplicar  → las arregla
 *
 * ── Qué problema arregla ─────────────────────────────────────────────────────
 *
 * Todo lo subido hasta ahora quedó guardado con `cacheControl: "no-cache"`, que
 * le dice al navegador: *no guardes esto, pedímelo de nuevo cada vez*. Y el
 * navegador obedece.
 *
 * Medido en la cuenta real: **0,269 GB guardados y 5,865 GB servidos** en un
 * mes. Las mismas fotos salieron unas 22 veces. No se llenó el depósito —está al
 * 27%—: se pasó el reparto. Cada visita a una tienda, cada vuelta atrás, cada
 * vista previa del editor y cada recarga en desarrollo se baja las fotos
 * enteras otra vez.
 *
 * `/api/upload` ya sube con caché de un año, así que **lo nuevo sale bien**.
 * Esto es sólo para lo viejo, y se corre UNA vez.
 *
 * ── Por qué hay que bajar y volver a subir ───────────────────────────────────
 *
 * Porque no hay forma de cambiarle sólo el dato. Probado contra la API real:
 * copiar el archivo del lado del servidor mandando la cabecera nueva deja la
 * copia con `no-cache` igual. El único camino es reescribir el archivo.
 *
 * Cuesta bajar los ~115 MB una vez. Es el 2,3% de la cuota mensual, y es lo que
 * frena una pérdida que hoy es de gigas por mes.
 *
 * ── Por qué un año es seguro ─────────────────────────────────────────────────
 *
 * El nombre de archivo lleva la fecha en milisegundos y un uuid, así que una
 * dirección NUNCA cambia de contenido: cambiar la foto de un producto sube un
 * archivo nuevo, con otro nombre. Por eso va también `immutable`, que le ahorra
 * al navegador hasta la pregunta de "¿sigue igual?".
 */

import { readFileSync } from "node:fs";

/* ── Las variables, leídas de .env.local sin depender de ningún paquete ────── */
function cargarEnv() {
  let texto = "";
  try { texto = readFileSync(".env.local", "utf8"); } catch { return {}; }
  const vars = {};
  for (const linea of texto.split("\n")) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return vars;
}

const env = { ...cargarEnv(), ...process.env };
const URL_BASE = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const LLAVE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !LLAVE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const CACHE = "public, max-age=31536000, immutable";
const APLICAR = process.argv.includes("--aplicar");

/* Sólo los buckets PÚBLICOS, que son los que se sirven a los visitantes y por lo
   tanto los que gastan. Los privados —los documentos de identidad de las
   afiliadas— se leen con un link firmado, uno por vez y por alguien con permiso:
   no son el problema y no se tocan. */
const BUCKETS = ["product-images", "tienda-imagenes", "store-videos"];

const auth = { apikey: LLAVE, Authorization: `Bearer ${LLAVE}` };
const authJson = { ...auth, "Content-Type": "application/json" };

/* Supabase lista por carpeta, no de una. Sin recorrer, lo que esté en una
   carpeta que no adivinamos queda afuera — y quedaría gastando en silencio. */
async function listar(bucket, prefijo = "", encontrados = []) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: authJson,
    body: JSON.stringify({ prefix: prefijo, limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) return encontrados;
  const items = await res.json();
  if (!Array.isArray(items)) return encontrados;

  for (const it of items) {
    const ruta = prefijo ? `${prefijo}/${it.name}` : it.name;
    // Sin `metadata` es una carpeta: se entra.
    if (!it.metadata) await listar(bucket, ruta, encontrados);
    else encontrados.push({ bucket, ruta, meta: it.metadata });
  }
  return encontrados;
}

async function arreglar(archivo) {
  const { bucket, ruta, meta } = archivo;

  const bajada = await fetch(`${URL_BASE}/storage/v1/object/public/${bucket}/${ruta}`);
  if (!bajada.ok) return { ok: false, porque: `no se pudo bajar (${bajada.status})` };
  const bytes = await bajada.arrayBuffer();

  /* Se compara contra el tamaño que dice el propio Supabase ANTES de pisar el
     archivo. Una descarga cortada por la mitad, subida con upsert, reemplazaría
     una foto sana por una rota — y no habría forma de volver atrás. */
  if (meta.size && bytes.byteLength !== meta.size) {
    return { ok: false, porque: `bajó incompleto (${bytes.byteLength} de ${meta.size})` };
  }

  const subida = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${ruta}`, {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": meta.mimetype || "application/octet-stream",
      "x-upsert": "true",
      "cache-control": CACHE,
    },
    body: bytes,
  });
  if (!subida.ok) {
    const detalle = await subida.text().catch(() => "");
    return { ok: false, porque: `no se pudo subir (${subida.status}) ${detalle.slice(0, 120)}` };
  }
  return { ok: true };
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

(async () => {
  console.log(APLICAR ? "\nARREGLANDO\n" : "\nSOLO MIRANDO (agregá --aplicar para que haga algo)\n");

  let totalArchivos = 0, totalBytes = 0, totalPorArreglar = 0, bytesPorArreglar = 0;
  const porArreglar = [];

  for (const bucket of BUCKETS) {
    const archivos = await listar(bucket);
    const faltan = archivos.filter((a) => a.meta.cacheControl !== CACHE);
    const bytes = archivos.reduce((s, a) => s + (a.meta.size || 0), 0);
    const bytesFaltan = faltan.reduce((s, a) => s + (a.meta.size || 0), 0);

    totalArchivos += archivos.length; totalBytes += bytes;
    totalPorArreglar += faltan.length; bytesPorArreglar += bytesFaltan;
    porArreglar.push(...faltan);

    console.log(
      `${bucket.padEnd(16)} ${String(archivos.length).padStart(5)} archivos  ${mb(bytes).padStart(7)} MB` +
      `   por arreglar: ${String(faltan.length).padStart(5)} (${mb(bytesFaltan)} MB)`
    );
  }

  console.log(`\nTOTAL: ${totalArchivos} archivos, ${mb(totalBytes)} MB`);
  console.log(`Por arreglar: ${totalPorArreglar} (${mb(bytesPorArreglar)} MB a bajar y volver a subir)\n`);

  if (!APLICAR || totalPorArreglar === 0) {
    if (totalPorArreglar === 0) console.log("Ya está todo con caché largo. No hay nada que hacer.\n");
    return;
  }

  let hechos = 0;
  const fallados = [];
  for (const archivo of porArreglar) {
    const r = await arreglar(archivo);
    if (r.ok) hechos++;
    else fallados.push(`${archivo.bucket}/${archivo.ruta}: ${r.porque}`);
    if ((hechos + fallados.length) % 25 === 0) {
      console.log(`  ${hechos + fallados.length} de ${totalPorArreglar}…`);
    }
  }

  console.log(`\nArreglados: ${hechos} de ${totalPorArreglar}`);
  if (fallados.length) {
    console.log(`\nNo se pudo con ${fallados.length} (quedaron como estaban, no se rompió ninguno):`);
    for (const f of fallados.slice(0, 20)) console.log("  " + f);
    if (fallados.length > 20) console.log(`  …y ${fallados.length - 20} más`);
    console.log("\nSe puede volver a correr: saltea los que ya están bien.");
  }
  console.log("");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
