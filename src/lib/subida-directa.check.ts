/**
 * Chequeos de la subida directa de videos. Se corre a mano:
 *
 *   npx tsx src/lib/subida-directa.check.ts
 *
 * ── El bug que este chequeo existe para que no vuelva ────────────────────────
 *
 * El formulario decía "videos de hasta 50 MB". El servidor lo repetía en su
 * propia validación. Y los dos estaban de acuerdo en un número que **ninguno de
 * los dos podía cumplir**: el archivo llegaba como cuerpo de un pedido, y el
 * cuerpo de un pedido se corta en 4,5 MB en producción. El video ni siquiera
 * llegaba a la validación de tamaño.
 *
 * Nadie lo iba a notar leyendo el código: los dos números coincidían entre sí
 * —había hasta un comentario pidiendo que coincidieran— y el límite verdadero no
 * está escrito en ningún archivo de este proyecto. Se notaba subiendo un video.
 *
 * ── Lo que se vigila ─────────────────────────────────────────────────────────
 *
 * 1. Que el formulario NO vuelva a mandar el video por `/api/upload`.
 * 2. Que la ruta que pasa por el servidor no vuelva a prometer más de lo que la
 *    plataforma la deja recibir.
 * 3. Que la firma le ponga al bucket los DOS límites. Sin ellos, la subida
 *    directa es un permiso para escribir cualquier cosa de cualquier tamaño en
 *    un bucket público — el servidor ya no ve los bytes, así que lo único que
 *    queda del lado nuestro es lo que aplique Supabase.
 * 4. Que la ruta del archivo la arme el SERVIDOR y no el navegador.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BUCKET_VIDEOS, MAX_VIDEO_MB, MAX_VIDEO_BYTES, VIDEO_PESADO_MB,
  TIPOS_VIDEO, EXTENSION_DE_VIDEO,
} from "./subida-directa";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const formulario = leer("src/app/dashboard/productos/nuevo/page.tsx");
const firma      = leer("src/app/api/upload/firma/route.ts");
const porServidor = leer("src/app/api/upload/route.ts");

/* El techo real del cuerpo de un pedido en producción (Vercel, serverless). No
   está escrito en ningún lado del proyecto porque no es nuestro — por eso vive
   acá, en el chequeo que lo hace cumplir. */
const TECHO_DEL_CUERPO_MB = 4.5;

console.log("\n1) El video NO vuelve a pasar por el servidor");

const subidaDeVideo =
  formulario.match(/async function handleVideoFileUpload[\s\S]*?\n  \}/)?.[0] ?? "";
chequear("se encontró la función que sube el video", subidaDeVideo.length > 0);
chequear(
  "no manda el archivo a /api/upload",
  subidaDeVideo.length > 0 && !/fetch\("\/api\/upload"/.test(subidaDeVideo),
  "ahí se estrella contra el techo del cuerpo del pedido"
);
chequear(
  "pide el permiso a /api/upload/firma",
  /fetch\("\/api\/upload\/firma"/.test(subidaDeVideo)
);
chequear(
  "y manda los bytes con PUT a la url firmada",
  /permiso\.urlDeSubida[\s\S]{0,120}method: "PUT"/.test(subidaDeVideo)
);
/* El orden es lo único que separa un producto sano de uno que apunta a un video
   que no existe: si la dirección se guardara antes de que los bytes lleguen,
   una subida cortada dejaría la ficha rota y nadie se enteraría hasta que un
   comprador le toque play. */
chequear(
  "la dirección se guarda DESPUÉS de que los bytes llegaron",
  subidaDeVideo.indexOf("!subida.ok") > 0 &&
    subidaDeVideo.indexOf("!subida.ok") < subidaDeVideo.indexOf("permiso.urlFinal"),
  "guardar la url antes de subir deja productos apuntando a un video inexistente"
);

console.log("\n2) Ninguna ruta promete más de lo que puede recibir");

for (const [nombre, patron] of [
  ["imágenes",  /const MAX_FILE_SIZE_MB = (\d+)/],
  ["documentos", /const MAX_DOCUMENT_SIZE_MB = (\d+)/],
  ["videos",    /const MAX_VIDEO_SIZE_MB = (\d+)/],
] as const) {
  const declarado = Number(porServidor.match(patron)?.[1] ?? NaN);
  chequear(
    `/api/upload: el tope de ${nombre} (${declarado} MB) entra en el cuerpo de un pedido`,
    declarado > 0 && declarado <= TECHO_DEL_CUERPO_MB,
    `en producción el cuerpo se corta en ${TECHO_DEL_CUERPO_MB} MB`
  );
}
chequear(
  "y el formulario toma su tope de lib/subida-directa, no de un número suelto",
  /const MAX_VIDEO_SIZE_MB = MAX_VIDEO_MB;/.test(formulario),
  "dos copias del mismo número es como empezó este bug"
);
chequear(
  `el tope de la subida directa (${MAX_VIDEO_MB} MB) SÍ puede ser grande`,
  MAX_VIDEO_MB > TECHO_DEL_CUERPO_MB && MAX_VIDEO_BYTES === MAX_VIDEO_MB * 1024 * 1024
);
chequear(
  "el aviso de video pesado avisa antes del tope, no encima",
  VIDEO_PESADO_MB > 0 && VIDEO_PESADO_MB < MAX_VIDEO_MB
);

console.log("\n3) El bucket lleva los dos límites puestos");

chequear(
  "se le declara el tope de tamaño",
  /file_size_limit: MAX_VIDEO_BYTES/.test(firma),
  "sin esto el permiso firmado sirve para subir un archivo de cualquier tamaño"
);
chequear(
  "y qué tipos acepta",
  /allowed_mime_types: \[\.\.\.TIPOS_VIDEO\]/.test(firma),
  "sin esto, un permiso firmado 'para un video' sirve para subir un HTML a un bucket PÚBLICO"
);
chequear(
  "es un bucket propio y no el de las fotos",
  BUCKET_VIDEOS !== "product-images" && /id: BUCKET_VIDEOS/.test(firma),
  "tocarle la config al bucket del que dependen todas las fotos, para arreglar los videos, es cambiarle el motor a un auto andando"
);
chequear(
  "si Supabase rechaza la configuración, se registra QUÉ contestó",
  /Supabase rechazó la configuración del bucket/.test(firma),
  "este mismo paso ya falló con un 413 y el error que llegaba arriba no decía nada"
);

console.log("\n4) La ruta la arma el servidor");

chequear(
  "la ruta se construye en el servidor, con su propio uuid",
  /const ruta = `store-videos\/\$\{user\.id\}\/\$\{Date\.now\(\)\}-\$\{randomUUID\(\)\}\.\$\{extension\}`/.test(firma),
  "si la eligiera el navegador podría pisar el video de otra tienda"
);
chequear(
  "la extensión sale del tipo declarado y NO del nombre del archivo",
  /const extension = EXTENSION_DE_VIDEO\[tipoContenido\]/.test(firma) &&
    !/file\.name/.test(firma),
  "un nombre de archivo puede traer `../` adentro"
);
chequear(
  "hay un tipo declarado para cada formato aceptado",
  [...TIPOS_VIDEO].every((t) => !!EXTENSION_DE_VIDEO[t]),
  [...TIPOS_VIDEO].filter((t) => !EXTENSION_DE_VIDEO[t])
);
chequear(
  "sin sesión no se firma nada",
  /const user = await getCurrentUser\(\);\s*\n\s*if \(!user\) return NextResponse\.json\(\{ error: "No autorizado" \}, \{ status: 401 \}\);/.test(firma)
);
chequear(
  "y hay tope de permisos por persona",
  /checkRateLimit\(`firma-video:\$\{user\.id\}`/.test(firma),
  "cada permiso es una escritura habilitada en el storage"
);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
