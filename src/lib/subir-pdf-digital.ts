import { TIPO_PDF, validarSubida } from "@/lib/subida-digital";

/**
 * Subir el PDF de un producto digital, de punta a punta.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESCRITA UNA SOLA VEZ, USADA EN DOS PANTALLAS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La usan la pantalla de Productos y el recibimiento de una cuenta nueva. Estaba
 * escrita adentro de `ProductosClient`, así que el recibimiento habría tenido su
 * propia copia — y son tres llamados encadenados donde cada uno puede fallar
 * distinto. Dos copias de eso se desincronizan de a una, y la que se queda vieja
 * es la que nadie mira.
 *
 * ── Los tres pasos, y por qué son tres ─────────────────────────────────────
 *
 *   1. **El permiso.** Nuestro servidor firma una dirección de subida. Es el
 *      único momento en que se comprueba que el producto sea tuyo.
 *   2. **La subida, DERECHO a Supabase.** No pasa por nuestro servidor: nada que
 *      vaya por `/api/upload` supera los 4,5 MB, y un PDF puede pesar 50.
 *   3. **El cierre.** Recién ahí se anota la ruta en el producto. Al revés
 *      —anotar y después subir— una subida que falla deja al producto diciendo
 *      que tiene un archivo que no existe, y eso se descubre cuando alguien paga.
 *
 * ⚠️ El navegador valida ANTES de empezar, con la misma función que usa el
 * servidor. No protege nada —lo que valida el navegador no protege nunca— pero
 * evita subir 60 MB para que el servidor los rechace al final.
 */

export type ResultadoDeSubida =
  | { ok: true }
  | { ok: false; error: string };

export async function subirPdfDigital(productoId: string, file: File): Promise<ResultadoDeSubida> {
  const problema = validarSubida({ tipo: file.type, tamano: file.size });
  if (problema) return { ok: false, error: problema };

  try {
    const permisoRes = await fetch("/api/digitales/archivo/firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoId, tipo: file.type, tamano: file.size }),
    });
    const permiso = await permisoRes.json().catch(() => ({}));
    if (!permisoRes.ok || !permiso.urlDeSubida || !permiso.ruta) {
      return { ok: false, error: permiso.error ?? "No pudimos preparar la subida." };
    }

    const subida = await fetch(permiso.urlDeSubida as string, {
      method: "PUT",
      headers: { "Content-Type": TIPO_PDF },
      body: file,
    });
    if (!subida.ok) {
      /* Supabase contesta con su propio texto. Se registra el crudo y se muestra
         algo que se entienda: la vez pasada, en los videos, un error de este paso
         llegó como "no se pudo" a secas y no había forma de saber que el problema
         era el tope del bucket. */
      console.error("[archivo] Supabase rechazó la subida:", subida.status, await subida.text().catch(() => ""));
      return { ok: false, error: "El archivo no se pudo subir. Probá de nuevo." };
    }

    const cierre = await fetch("/api/digitales/archivo/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoId, ruta: permiso.ruta, nombre: file.name }),
    });
    const datos = await cierre.json().catch(() => ({}));
    if (!cierre.ok) {
      return { ok: false, error: datos.error ?? "El archivo subió pero no lo pudimos guardar." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "No pudimos subir el archivo. Revisá tu conexión." };
  }
}
