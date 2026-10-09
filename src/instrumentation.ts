import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/**
 * Los errores del SERVIDOR, que hasta hoy no llegaban a ningún lado.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ `Sentry.init` NO ALCANZA DEL LADO DEL SERVIDOR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Del lado del navegador, Sentry se engancha solo a los errores que nadie
 * atrapó. Del lado del servidor no puede: Next atrapa lo que tira un componente
 * de servidor —o una ruta de la API— para poder dibujar la pantalla de error, y
 * ahí el error **ya está atrapado**. Nunca llega a nadie.
 *
 * Este enganche es la puerta que Next abre justamente para eso: le avisa a
 * Sentry de cada error que atajó, con el pedido que lo causó y en qué parte
 * pasó. Los errores del runtime Node también quedan resumidos en los eventos
 * de seguridad del admin, sin guardar el mensaje crudo ni datos del formulario.
 *
 * Encontrado en la auditoría del panel del 09/09/26.
 *
 * ⚠️ Y lo que viaja pasa por el mismo limpiador que todo lo demás
 * (`beforeSend: scrubPii` en las tres configuraciones): acá adentro hay pedidos
 * de gente que compra, con su correo y su dirección.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Next uses a runtime-conditional require here to keep Node-only code out of Edge bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { onRequestError: registrarErrores } = require("./instrumentation-node");
    await registrarErrores(error, request, context);
    return;
  }

  Sentry.captureRequestError(error, request, context);
};
