import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { DIGITAL_BUCKET, PREFIJO_ARCHIVO_DIGITAL } from "@/lib/descargas";

export const runtime = "nodejs";

/* Ritmo por IP. El token es de 64 caracteres al azar, así que adivinarlo no es
   el riesgo — el riesgo es que alguien martille la ruta y cada intento pague una
   consulta a la base. 30 por minuto le sobra a una persona que baja lo que
   compró (y que puede reintentar), y le corta las patas a un script. */
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

/* Dos minutos, igual que el CV de un afiliado. Alcanza de sobra para que el
   navegador empiece la bajada y es poco para que el link sirva si se reenvía. */
const SIGNED_URL_TTL_SECONDS = 120;

/**
 * GET /api/descargas/[token] → redirige al archivo comprado con un link firmado.
 *
 * El archivo vive en un bucket PRIVADO: no tiene dirección pública. El mail que
 * recibe el comprador trae un token, no el archivo, y ese token se canjea acá.
 *
 * Se comprueba, en este orden: que el token exista, que no esté vencido, que le
 * queden descargas y que el producto todavía tenga archivo. Recién entonces se
 * le pide a Supabase un link de dos minutos.
 *
 * No pide sesión a propósito: el comprador no tiene por qué tener cuenta, y
 * obligarlo a registrarse para bajar lo que ya pagó es peor que el riesgo que
 * evita. Lo que protege es el token —aleatorio, con vencimiento y con tope—, no
 * un login.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!(await checkRateLimit(`descargas:${getClientIp(req)}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const { token } = await params;

  /* Un token con forma rara ni se busca en la base: se corta acá. El nuestro son
     64 caracteres hexadecimales (dos uuid sin guiones), así que cualquier cosa
     que no tenga esa pinta es basura o un intento de inyectar algo raro en la
     consulta. */
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: "Link inválido" }, { status: 404 });
  }

  const permiso = await prisma.digitalDownload.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      descargas: true,
      maxDescargas: true,
      orderItem: {
        select: {
          product: { select: { archivoPath: true, archivoNombre: true } },
        },
      },
    },
  });

  /* Todo lo que sale mal devuelve 404 con el mismo cuerpo — no se distingue
     "no existe" de "vencido" de "sin descargas". Contestar distinto convertiría
     esta ruta en un oráculo para averiguar qué tokens existen. La explicación de
     por qué no anda se la da la dueña, que sí puede verlo en el panel. */
  const noAnda = NextResponse.json(
    { error: "Este link ya no está disponible. Escribile a la tienda y te lo reenvía." },
    { status: 404 }
  );

  if (!permiso) return noAnda;
  if (permiso.expiresAt < new Date()) return noAnda;
  if (permiso.descargas >= permiso.maxDescargas) return noAnda;

  /* Se exige el prefijo COMPLETO, con el bucket de productos digitales adentro,
     y el bucket que se firma es la constante — no lo que diga la ruta guardada.

     Si acá se aceptara cualquier `supabase://` y se firmara el bucket que nombra
     la ruta, una dueña podía escribir a mano `supabase://affiliate-docs/...` en
     su propio producto, comprárselo, y hacer que este endpoint le firmara un
     link al bucket de los documentos de identidad de los afiliados. El chequeo
     está acá Y en la validación del producto: el de allá evita que se guarde, y
     éste evita que sirva aunque se haya guardado antes de existir aquel. */
  const archivoPath = permiso.orderItem.product.archivoPath;
  if (!archivoPath || !archivoPath.startsWith(PREFIJO_ARCHIVO_DIGITAL)) return noAnda;

  const filePath = archivoPath.slice(PREFIJO_ARCHIVO_DIGITAL.length);
  // Sin `..` ni barras al inicio: la ruta se pega en la URL que se firma, y un
  // salto de directorio la sacaría del prefijo que acabamos de anclar.
  if (!filePath || filePath.startsWith("/") || filePath.includes("..")) return noAnda;
  const bucket = DIGITAL_BUCKET;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Storage no configurado" }, { status: 500 });
  }

  /* El contador sube ANTES de firmar y de forma condicional: `descargas` tiene
     que seguir por debajo del tope en el mismo UPDATE. Si dos pedidos llegan
     juntos —el comprador hace doble clic, o alguien reenvía el link— sólo uno
     de los dos pasa, y el tope no se puede desbordar.

     Contar antes significa que una firma fallida gasta una descarga. Es el lado
     correcto para equivocarse: al revés, un error entre firmar y contar regala
     descargas sin límite. Y quedan cuatro más para reintentar. */
  const consumido = await prisma.digitalDownload.updateMany({
    where: { id: permiso.id, descargas: { lt: permiso.maxDescargas }, expiresAt: { gt: new Date() } },
    data: { descargas: { increment: 1 }, ultimaDescarga: new Date() },
  });
  if (consumido.count === 0) return noAnda;

  const res = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${filePath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
  }).catch(() => null);

  const data = (await res?.json().catch(() => null)) as { signedURL?: string } | null;
  if (!res?.ok || !data?.signedURL) {
    // El token NO se loguea: quedaría en los registros del servidor una llave
    // que sirve para bajar el archivo.
    console.error("[descargas] no se pudo firmar la url", { permisoId: permiso.id, bucket });
    return NextResponse.json({ error: "No se pudo preparar la descarga. Probá de nuevo en un rato." }, { status: 502 });
  }

  /* `download` va como parámetro de la URL firmada, no en el cuerpo de la firma:
     es lo que hace que el navegador lo BAJE con el nombre que le puso la dueña,
     en vez de abrir el PDF en una pestaña con el uuid del bucket por título. El
     nombre se codifica porque puede tener espacios o acentos. */
  const nombre = permiso.orderItem.product.archivoNombre;
  const firmada = `${supabaseUrl}/storage/v1${data.signedURL}`;
  const conNombre = nombre
    ? `${firmada}&download=${encodeURIComponent(nombre)}`
    : `${firmada}&download=`;

  return NextResponse.redirect(conNombre);
}
