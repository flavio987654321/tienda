/**
 * Chequeos del archivo del producto digital. Se corre con:
 *
 *   npx tsx src/lib/subida-digital.check.ts
 *
 * Lo de acá decide qué archivo entra y con qué dirección queda guardado. Un
 * error en la referencia no se ve el día que se sube: se ve el día que alguien
 * pagó y el archivo no baja.
 */

import { readFileSync } from "fs";
import {
  BUCKET_DIGITALES, MAX_PDF_MB, MAX_PDF_BYTES, PDF_PESADO_BYTES, TIPO_PDF,
  validarSubida, avisoDePeso, rutaDeArchivo, refDeArchivo, rutaDeRef, nombreDeArchivo,
} from "./subida-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── Qué archivo entra ────────────────────────────────────────────────────── */

check("VAL-A", validarSubida({ tipo: TIPO_PDF, tamano: 1024 }) === null, "un PDF chico entra");

/* ⚠️ Sólo PDF. Un ZIP puede traer cualquier cosa adentro y nadie la mira; un
   HTML servido desde nuestro dominio es peor todavía. La lista corta es la
   defensa. */
check("VAL-B", ["application/zip", "text/html", "image/png", "application/octet-stream", ""].every(
  (t) => validarSubida({ tipo: t, tamano: 1024 }) !== null),
  "cualquier otro formato NO entra");
check("VAL-C", [null, undefined, 5, {}].every((t) => validarSubida({ tipo: t, tamano: 1024 }) !== null),
  "y lo que ni siquiera es texto tampoco");

check("VAL-D", validarSubida({ tipo: TIPO_PDF, tamano: MAX_PDF_BYTES }) === null,
  "el borde exacto del tope entra");
check("VAL-E", validarSubida({ tipo: TIPO_PDF, tamano: MAX_PDF_BYTES + 1 }) !== null,
  "un byte más, no");
check("VAL-F", [0, -1, NaN, Infinity, "1000", null].every(
  (t) => validarSubida({ tipo: TIPO_PDF, tamano: t }) !== null),
  "un tamaño que no es un número tampoco pasa");

/* ⚠️ El mensaje tiene que decir QUÉ HACER. El caso real que lo destapó fue una
   guía de 46 páginas exportada en calidad de imprenta: 117 MB. "Máximo 50 MB"
   deja a esa persona sin salida; "exportalo en calidad para pantalla" la
   resuelve. */
const grande = validarSubida({ tipo: TIPO_PDF, tamano: 117 * 1024 * 1024 }) ?? "";
check("VAL-G", grande.includes("pantalla"),
  "el error de tamaño dice cómo resolverlo, no sólo que está mal");
check("VAL-H", grande.includes(String(MAX_PDF_MB)), "y también dice el número");

/* ── El aviso que no bloquea ──────────────────────────────────────────────── */

/* El bono va incluido y gratis, así que una venta arrastra el principal más
   todos sus bonos. El peso se paga en cada venta, no una vez. */
check("AVI-A", avisoDePeso(1024) === null, "un archivo liviano no avisa nada");
check("AVI-B", avisoDePeso(PDF_PESADO_BYTES) === null, "el borde exacto tampoco");
check("AVI-C", avisoDePeso(PDF_PESADO_BYTES + 1) !== null, "uno más arriba sí avisa");
check("AVI-D", validarSubida({ tipo: TIPO_PDF, tamano: PDF_PESADO_BYTES + 1 }) === null,
  "pero avisar NO es bloquear: ese archivo se sube igual");

/* ── La ruta la arma el servidor ──────────────────────────────────────────── */

const ruta = rutaDeArchivo("user123", "prod456", "uuid-abc");
check("RUT-A", ruta.startsWith("user123/prod456/"),
  "la ruta lleva la cuenta y el producto: se audita de dónde salió sin tocar la base");
check("RUT-B", ruta.endsWith(".pdf"), "y siempre termina en .pdf, salga de donde salga el nombre");

/* Dos subidas seguidas del mismo producto NO pueden pisarse: la dirección lleva
   la fecha en milisegundos y un uuid. Reemplazar el archivo sube otro, no
   sobreescribe el anterior. */
check("RUT-C", rutaDeArchivo("u", "p", "aaa") !== rutaDeArchivo("u", "p", "bbb"),
  "dos archivos del mismo producto nunca comparten dirección");

/* ── La referencia guardada ───────────────────────────────────────────────── */

/* ⚠️ EL chequeo de este archivo. En `archivoPath` NUNCA puede haber una
   dirección que funcione sola: si la hubiera, el ebook pago se bajaría sin
   comprarlo con sólo tenerla. */
const ref = refDeArchivo(ruta);
check("REF-A", ref.startsWith("supabase://"), "lo guardado es una referencia, no una URL");
check("REF-B", !/^https?:\/\//.test(ref) && !ref.includes("/object/public/"),
  "y no es servible: ni http, ni la ruta pública de Supabase");
check("REF-C", ref.includes(BUCKET_DIGITALES), "nombra el bucket, para saber de dónde sacarlo");

/* La ida y la vuelta tienen que cerrar. Escritas en dos archivos distintos, el
   día que cambie el formato una se entera y la otra no. */
check("REF-D", rutaDeRef(ref) === ruta, "de la referencia se recupera la ruta exacta");

check("REF-E", [
  "https://x.supabase.co/storage/v1/object/public/producto-digital/a.pdf",
  "supabase://otro-bucket/a.pdf",
  "a.pdf",
  "",
  null,
  undefined,
  42,
].every((v) => rutaDeRef(v) === null),
  "cualquier otra cosa devuelve null, nunca una ruta a medias");

/* Esto se lee para entregar un archivo PAGO. No debería poder pasar —la ruta la
   arma el servidor— pero acá no se confía ni en lo propio. */
check("REF-F", rutaDeRef(`supabase://${BUCKET_DIGITALES}/../../otro/a.pdf`) === null,
  "una ruta con `..` se rechaza: saldría del prefijo de la cuenta al firmar");

/* ── El nombre que se muestra ─────────────────────────────────────────────── */

/* Viene del navegador, se dibuja en el panel y viaja en el mail de entrega. */
check("NOM-A", nombreDeArchivo("guia.pdf") === "guia.pdf", "un nombre normal pasa igual");
check("NOM-B", nombreDeArchivo(`guia${String.fromCharCode(0)}.pdf`) === "guia .pdf",
  "los caracteres invisibles se limpian, igual que en todas las puertas");
check("NOM-C", nombreDeArchivo("x".repeat(500))?.length === 120, "y se recorta al tope");
check("NOM-D", [null, undefined, "", "   ", 5].every((v) => nombreDeArchivo(v) === null),
  "lo que no sirve queda en null");

/* ── El bucket es privado ─────────────────────────────────────────────────── */

/* ⚠️ Si este bucket se creara público, TODO lo de arriba no sirve para nada: la
   ruta sería adivinable y el archivo pago se bajaría sin comprarlo. Es una sola
   palabra en un `fetch` y no la ve nadie hasta que es tarde. */
const firma = readFileSync("src/app/api/digitales/archivo/firma/route.ts", "utf8");
check("BUCK-A", /public:\s*false/.test(firma), "el bucket se crea PRIVADO");
check("BUCK-B", !/public:\s*true/.test(firma), "y en ningún lado de esa ruta se pide público");
check("BUCK-C", new RegExp(`allowed_mime_types[^\\n]*${TIPO_PDF}`).test(firma) || /allowed_mime_types/.test(firma),
  "el bucket declara qué tipos acepta: es lo que aplica Supabase sobre el archivo real");
check("BUCK-D", /file_size_limit/.test(firma),
  "y el tope de tamaño, que es el que manda cuando los bytes ya no pasan por acá");

/* ── El reemplazo no puede dejar basura ───────────────────────────────────── */

/* ⚠️ Cada reemplazo dejaba el PDF anterior en el bucket, sin apuntar a ningun
   lado y sin forma de alcanzarlo: lo pagamos para siempre. Y no era solo
   desprolijo — el permiso se pide 30 veces por hora y a 50 MB cada uno son
   1,5 GB por hora por cuenta, en un plan gratis que no pide tarjeta. */
const confirmar = readFileSync("src/app/api/digitales/archivo/confirmar/route.ts", "utf8");
const deposito = readFileSync("src/lib/deposito-digital.ts", "utf8");
check("VIEJO-A", confirmar.includes("borrarDelDeposito") && /method: "DELETE"/.test(deposito),
  "al reemplazar se borra el archivo anterior");

/* Se lo saca de lo GUARDADO, no de algo que mande el navegador: si la ruta a
   borrar viniera en el pedido, alguien borraria el archivo de otra persona. */
check("VIEJO-B", /rutaDeRef\(producto\.archivoPath\)/.test(confirmar),
  "y la ruta a borrar sale de la base, nunca del pedido");

/* Borrar ANTES de guardar y que el guardado falle deja el producto apuntando a
   un archivo que ya no esta: se publica, se vende y no se entrega. */
check("VIEJO-C", confirmar.indexOf("prisma.product.update") < confirmar.indexOf("borrarDelDeposito("),
  "y se borra DESPUES de guardar, no antes");


/* ── Repaso de las dos rutas, 03/09/26 ────────────────────────────────────── */

/* Los dos salieron de leer las siete rutas de digitales una por una con la
   misma lista, antes de arrancar el checkout. */

/* ⚠️ HALLAZGO 1. Estas dos eran las ÚNICAS consultas de producto de todo
   digitales sin `deletedAt: null` — las otras cinco rutas ya lo tenían. Sin él
   se firma y se confirma sobre un producto BORRADO: el archivo entra al bucket,
   nadie lo va a poder alcanzar nunca y lo seguimos pagando. */
check("REP-A", firma.includes("deletedAt: null") && confirmar.includes("deletedAt: null"),
  "no se sube ni se confirma un archivo a un producto borrado");

/* ⚠️ HALLAZGO 2, el más serio de los dos. La ruta se comprobaba contra la
   CUENTA (`<user>/`) pero no contra el PRODUCTO, y `rutaDeArchivo` la arma como
   `<cuenta>/<producto>/…`.

   O sea que alguien podía confirmar la ruta del archivo de SU producto A sobre
   su producto B. Los dos quedaban apuntando al mismo objeto, y el día que
   reemplazara el archivo de A —que borra el viejo— B quedaba publicado
   apuntando a la nada: se cobra y no hay nada que entregar. Es exactamente el
   fallo que estas dos rutas existen para evitar. */
check("REP-B", confirmar.includes("${user.id}/${productoId}/"),
  "y la ruta que se confirma tiene que ser de esa cuenta Y de ese producto");

/* ⚠️ HALLAZGO 3. Las siete rutas de digitales atrapan el error de Redis y DEJAN
   PASAR el pedido: mejor que la gente trabaje a bloquear a todos porque se cayó
   el limitador. En seis está bien. En ésta no.

   Este límite es lo único que separa a una cuenta de pedir 30 permisos por hora
   de 50 MB cada uno —1,5 GB por hora, en un plan gratuito que no pide tarjeta— y
   la factura de Supabase la pagamos nosotros. El costo de fallar cerrado es que
   alguien espere unos minutos para subir un PDF; el de fallar abierto no tiene
   techo. */
const trasElLimite = firma.slice(firma.indexOf("archivo-digital:"));
check("REP-D", trasElLimite.includes("status: 503"),
  "si no se puede verificar el límite NO se firma: es la única que falla cerrada");

/* Lo que ya estaba bien y conviene que siga: el navegador dice que subió, y el
   servidor va a mirar. Sin esto alcanza con llamar a confirmar sin haber subido
   nada para marcar el producto como entregable. */
check("REP-C", confirmar.includes("pesoReal") && confirmar.includes('method: "HEAD"'),
  "el servidor comprueba que el archivo EXISTA, no le cree al navegador");

/* ── El barrido de los borrados, 03/09/26 ─────────────────────────────────── */

/* ⚠️ Salió de la pregunta "¿y si quiero cambiar de embudo?". Borrar un producto
   digital lo marca como borrado —tiene que ser así: `OrderItem` apunta a él— pero
   NADIE tocaba el archivo. Y borrar el principal se lleva de arrastre a sus bonos
   y upsells, que tienen PDF propio: cambiar de embudo dejaba cuatro o cinco
   archivos muertos en el bucket. A 50 MB de tope cada uno, contra el gigabyte de
   depósito del plan gratis, unas pocas pasadas lo llenan. */
const barrido = readFileSync("src/app/api/cron/cleanup/route.ts", "utf8");

check("BAR-A", barrido.includes("barrerArchivosDeBorrados"),
  "el cron diario barre los archivos de los productos borrados");

/* Los dos filtros. El primero es la cuarentena; el segundo es el que evita el
   único caso feo — un pago que se acredita DESPUÉS del borrado emite el permiso
   tarde, y ese vence después de la cuarentena. */
check("BAR-B", barrido.includes("deletedAt: { lt: corte }"),
  "sólo toca lo borrado hace más de la cuarentena, nunca lo vivo");
check("BAR-C", barrido.includes("expiresAt: { gt: now }"),
  "y nunca el archivo de alguien que todavía tiene un permiso de descarga vivo");

/* ⚠️ Sin soltar la referencia, el mismo producto vuelve a caer en la consulta
   TODAS las noches y se le pega a Supabase para siempre por un archivo que ya no
   está. */
check("BAR-D", barrido.includes("archivoPath: null"),
  "al barrer se suelta la referencia: no se reintenta para siempre");

/* Y en ese orden. Al revés —soltar la referencia y que el borrado falle— deja el
   archivo en el depósito sin nadie que lo nombre: exactamente lo que esto vino a
   arreglar, pero ahora sin forma de encontrarlo. */
check("BAR-E", barrido.indexOf("borrarDelDeposito(config") < barrido.indexOf("archivoPath: null"),
  "y se suelta DESPUÉS de borrar, no antes");

/* El cron diario entero tiene 60 segundos y esto va último. */
check("BAR-F", barrido.includes("take: TOPE_BARRIDO") && /TOPE_BARRIDO = \d+/.test(deposito),
  "hay tope por noche: un borrado masivo no se lleva puesto el resto del cron");

/* Un objeto que ya no está no puede contar como error, o nunca se suelta la
   referencia y volvemos al reintento eterno. */
check("BAR-G", deposito.includes('"noEstaba"') && deposito.includes("res?.status === 404"),
  "un archivo que ya no estaba cuenta como hecho, no como falla");

/* La llave de servicio no puede vivir en un archivo que importa una pantalla, y
   `subida-digital` lo importa `ProductosClient.tsx`. */
check("BAR-H", !readFileSync("src/lib/subida-digital.ts", "utf8").includes("SERVICE_ROLE"),
  "la llave de servicio no toca el archivo que importa el navegador");

console.log(fallos === 0
  ? "\nok — el archivo del producto entra por una sola puerta y no queda servible"
  : `\nFALLA — ${fallos} chequeo(s) del archivo del producto`);
process.exit(fallos === 0 ? 0 : 1);
