import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { buscarCandidatas } from "@/lib/fotos-pexels";
import { LARGO_FOTO } from "@/lib/ebook-ia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Buscar fotos para elegir a mano.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA SEXTA RUTA, Y LA TERCERA QUE NO GASTA UN PESO NUESTRO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No llama al modelo: le pregunta al banco de imágenes. Existe porque hasta hoy
 * **las fotos del ebook no se podían cambiar**. Las elegía el armado con una
 * frase, y la única palanca era reescribir esa frase y cruzar los dedos —sin
 * ver nunca qué había del otro lado—.
 *
 * Y no hay salida por afuera: un PDF armado no se edita en Canva ni en Word. Si
 * la foto no se puede cambiar acá, no se puede cambiar en ningún lado.
 *
 * ── Por qué no devuelve las imágenes ───────────────────────────────────────
 *
 * Devuelve direcciones. Bajar quince fotos por búsqueda a través de nuestro
 * servidor sería pagar el tránsito de todo lo que alguien descarta mientras
 * elige, y encima tardaría. Las baja el navegador, que es lo que hace un
 * navegador. Ver `buscarCandidatas`.
 *
 * ── ⚠️ El freno importa más que en las otras ───────────────────────────────
 *
 * Porque del otro lado hay una cuenta ajena con su propio tope mensual. Un
 * campo de búsqueda que dispara con cada tecla se come el mes de todos en una
 * tarde, así que hay tope por cuenta **y la pantalla busca al apretar, no al
 * escribir**.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "DIGITAL") {
    return NextResponse.json({ error: "Tu cuenta no es de Productos Digitales." }, { status: 403 });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ 120 POR HORA, Y EL NÚMERO TIENE UNA CUENTA ATRÁS
     ══════════════════════════════════════════════════════════════════════════

     Estaba en 60 y era poco: elegir la foto de diez capítulos y la tapa son
     once fotos, y cada una lleva dos o tres búsquedas hasta encontrar la que
     gusta — o sea unas treinta por ebook. Con 60 entraban dos ebooks por hora y
     alguien que se sentaba una tarde a acomodar sus fotos se comía el tope sin
     hacer nada raro. Con 120 entran cuatro.

     ⚠️ Y NO se saca del todo, aunque no cueste plata. La clave del banco de
     imágenes es UNA para toda la plataforma y su tope —según la documentación
     de Pexels, 200 pedidos por hora y 20.000 por mes— se reparte entre todas
     las cuentas. Sin tope por cuenta, un bucle mal escrito en una pantalla deja
     sin fotos a todos los demás durante una hora.

     Si algún día molesta de verdad, lo que lo arregla no es subir este número:
     es guardar los resultados de cada búsqueda —la misma frase devuelve lo
     mismo— o pagar un plan del banco. */
  try {
    if (!(await checkRateLimit(`ebook-fotos:${user.id}`, 120, 60 * 60_000))) {
      return NextResponse.json({
        error: "Buscaste muchas fotos seguidas. Esperá un rato y seguí — no perdiste nada de lo que elegiste.",
      }, { status: 429 });
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /api/digitales/ia/ebook/fotos");
  }

  const busca = (req.nextUrl.searchParams.get("busca") ?? "").trim().slice(0, LARGO_FOTO);
  if (!busca) {
    return NextResponse.json({ error: "Escribí qué foto buscás." }, { status: 400 });
  }

  /* La de la tapa es vertical y ocupa media hoja; las de los capítulos son
     apaisadas. Pedir la orientación que no es trae fotos que después se recortan
     mal, así que quien pregunta dice cuál necesita. */
  const alta = req.nextUrl.searchParams.get("alta") === "1";

  const fotos = await buscarCandidatas(busca, { alta });

  /* Lista vacía no es un error: puede ser que el banco no tenga nada de eso, o
     que esta instalación no tenga la clave configurada. La pantalla lo dice con
     sus palabras. */
  return NextResponse.json({ ok: true, fotos });
}
