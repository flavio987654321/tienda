import { prisma } from "@/lib/prisma";
import { sendEntregaDigitalEmail } from "@/lib/resend";
import { DIAS_DEL_PERMISO, MAX_DESCARGAS } from "@/lib/entrega-digital";

/**
 * Mandar el mail de entrega, y dejar anotado que salió — o que no salió.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * EL AGUJERO: NADIE PODÍA CONTESTAR "¿SALIÓ EL MAIL?"
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El mail de entrega se manda con `despues`, fuera de la respuesta al aviso de
 * Mercado Pago. Y si algo falla, `despues` se traga el error en un
 * `console.error` que nadie lee. Resultado: la venta figura **Cobrada**, quien
 * compró no recibió nada, y no queda un solo rastro en la base.
 *
 * Quien vende se entera cuando le reclaman. O no se entera nunca, y pierde al
 * cliente sin saber por qué.
 *
 * ── Por qué esto vive en su propio archivo ──────────────────────────────────
 *
 * Porque `entrega-digital` es un módulo de formas y constantes que importan
 * hasta las pantallas públicas —los términos, entre otras— y meterle `prisma` y
 * `resend` adentro le colgaría media base de datos a un archivo que hoy sólo
 * importa `crypto`.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No reintenta. Un reintento automático de un mail que Resend rechazó por
 * dirección inválida son dos rechazos en vez de uno; y si la cuota se agotó, el
 * segundo tampoco entra. El camino de vuelta es el botón de reenviar, que lo
 * aprieta una persona cuando ya sabe qué pasó.
 */

/** Por dónde salió el mail: solo, o porque alguien apretó el botón. */
export type MotivoDeEnvio = "ENTREGA" | "REENVIO";

export type Entrega = {
  ordenId: string;
  motivo: MotivoDeEnvio;
  to: string;
  nombre: string | null;
  producto: string;
  archivos: { nombre: string; esBono: boolean }[];
  /** La pantalla de gracias. NUNCA la ruta de descarga. */
  enlace: string;
  vendedor: string | null;
};

/** Lo que se guarda del error: suficiente para saber qué pasó, sin novelas. */
const TOPE_DEL_ERROR = 300;

export async function mandarLaEntrega(e: Entrega): Promise<{ ok: boolean; error: string | null }> {
  let error: string | null = null;

  try {
    /* ⚠️ Se mira el `error` que DEVUELVE, no sólo el que tira. El SDK de Resend
       resuelve la promesa igual cuando la API rechaza el mail —dirección
       inválida, dominio sin verificar, cuota agotada—, así que un `try/catch`
       solo daría "ENVIADO" a un mail que nunca salió. Ver `ResultadoDeEnvio`. */
    const r = await sendEntregaDigitalEmail({
      to: e.to,
      nombre: e.nombre,
      producto: e.producto,
      archivos: e.archivos,
      enlace: e.enlace,
      vendedor: e.vendedor,
      dias: DIAS_DEL_PERMISO,
      maxDescargas: MAX_DESCARGAS,
    });
    if (r.error) error = r.error.message;
  } catch (err) {
    /* Y el `catch` sigue haciendo falta igual: lo que no resuelve —una caída de
       red, un DNS que no contesta— sí se tira. */
    error = err instanceof Error ? err.message : String(err);
  }

  await anotar(e, error);
  return { ok: error === null, error };
}

/**
 * La fila en `DigitalEnvioLog`.
 *
 * ⚠️ Nunca tira. Este registro existe para poder defender una venta; si la fila
 * no se puede escribir, lo que NO puede pasar es que se caiga la entrega de un
 * archivo que ya se pagó. Es la misma regla que el registro de descargas: un
 * apunte que falla no puede negar algo cobrado.
 */
async function anotar(e: Entrega, error: string | null): Promise<void> {
  try {
    await prisma.digitalEnvioLog.create({
      data: {
        orderId: e.ordenId,
        motivo: e.motivo,
        estado: error === null ? "ENVIADO" : "FALLO",
        /* La dirección se congela acá: si mañana esa persona cambia su correo,
           este envío tiene que seguir diciendo a dónde fue de verdad. */
        para: e.to.slice(0, 200),
        error: error === null ? null : error.slice(0, TOPE_DEL_ERROR),
      },
    });
  } catch (err) {
    console.error("[digital-envio] no se pudo anotar el envío:", err);
  }
}
