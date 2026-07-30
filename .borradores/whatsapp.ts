/**
 * WhatsApp Cloud API — lo mínimo para que Sasha conteste por WhatsApp.
 *
 * Es FASE 1 de `SASHA-WHATSAPP.md`: un solo número autorizado (el del dueño de la
 * plataforma, por variable de entorno), sin vinculación por tienda y sin historial.
 * El objetivo es probar que el circuito Meta → servidor → Claude → Meta → WhatsApp
 * funciona antes de invertir en multi-tienda.
 *
 * Todo lo que puede ser puro es puro y está testeado en `whatsapp.check.ts`: la
 * firma y el parseo del payload son justamente lo que no se puede probar a mano
 * sin un número de WhatsApp real.
 */

import { createHmac, timingSafeEqual } from "crypto";

/** Límite de WhatsApp para un mensaje de texto. */
export const MAX_CHARS_WHATSAPP = 4096;

const GRAPH_VERSION = "v21.0";

/* ── Firma ────────────────────────────────────────────────────────────────── */

/**
 * Valida el `X-Hub-Signature-256` que manda Meta.
 *
 * Sin esto, cualquiera que descubra la URL del webhook puede mandarle mensajes
 * inventados y hacernos pagar tokens. Es la única defensa del endpoint: no hay
 * sesión ni cookie, el "quién sos" lo da la firma y nada más.
 *
 * El HMAC va sobre el cuerpo CRUDO, no sobre el JSON reparseado: `JSON.parse` y
 * volver a serializar cambia espacios y orden de claves, y la firma deja de dar.
 */
export function verificarFirmaWhatsApp(cuerpoCrudo: string, cabecera: string | null): boolean {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto) {
    // Mismo criterio que el webhook de Mercado Pago: en producción, sin secreto
    // se rechaza todo. Dejar pasar sería un endpoint abierto que gasta plata.
    if (process.env.NODE_ENV === "production") {
      console.error("CRÍTICO: WHATSAPP_APP_SECRET no está configurado en producción — se rechaza todo");
      return false;
    }
    return true;
  }

  if (!cabecera) return false;
  const recibida = cabecera.startsWith("sha256=") ? cabecera.slice(7) : cabecera;
  const esperada = createHmac("sha256", secreto).update(cuerpoCrudo).digest("hex");

  try {
    // timingSafeEqual tira si los largos difieren, de ahí el try.
    return timingSafeEqual(Buffer.from(esperada, "hex"), Buffer.from(recibida, "hex"));
  } catch {
    return false;
  }
}

/* ── Handshake de verificación ────────────────────────────────────────────── */

/**
 * La verificación que hace Meta UNA vez, al configurar el webhook: pega con un
 * GET y espera que le devuelvas el `challenge` tal cual, en texto plano.
 *
 * Devuelve el challenge si corresponde, o null si no.
 */
export function resolverChallenge(params: URLSearchParams): string | null {
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!esperado) return null;
  if (params.get("hub.mode") !== "subscribe") return null;
  if (params.get("hub.verify_token") !== esperado) return null;
  return params.get("hub.challenge");
}

/* ── Parseo del payload ───────────────────────────────────────────────────── */

export type MensajeEntrante = {
  /** El `wamid`. Único por mensaje: es la clave para no contestar dos veces. */
  id: string;
  /** Número de quien escribe, sin `+`. */
  de: string;
  /** El texto. null si el mensaje no era de texto (audio, foto, sticker...). */
  texto: string | null;
  /** Qué tipo mandó, para poder explicarle que sólo leemos texto. */
  tipo: string;
};

/**
 * Saca los mensajes de texto del payload de Meta.
 *
 * El payload viene anidado en `entry[].changes[].value.messages[]` y en el mismo
 * lugar llegan también los avisos de entrega (`statuses`), que NO son mensajes.
 * Tratarlos como mensajes sería contestarle a un acuse de recibo — y pagar un
 * mensaje de Claude por cada "leído" que manda WhatsApp.
 */
export function parsearMensajes(cuerpo: unknown): MensajeEntrante[] {
  if (typeof cuerpo !== "object" || cuerpo === null) return [];
  const entradas = (cuerpo as { entry?: unknown }).entry;
  if (!Array.isArray(entradas)) return [];

  const salida: MensajeEntrante[] = [];

  for (const entrada of entradas) {
    const cambios = (entrada as { changes?: unknown })?.changes;
    if (!Array.isArray(cambios)) continue;

    for (const cambio of cambios) {
      const valor = (cambio as { value?: unknown })?.value;
      if (typeof valor !== "object" || valor === null) continue;

      const mensajes = (valor as { messages?: unknown }).messages;
      if (!Array.isArray(mensajes)) continue;

      for (const m of mensajes) {
        if (typeof m !== "object" || m === null) continue;
        const { id, from, type } = m as { id?: unknown; from?: unknown; type?: unknown };
        if (typeof id !== "string" || typeof from !== "string") continue;

        const tipo = typeof type === "string" ? type : "desconocido";
        const cuerpoTexto = (m as { text?: { body?: unknown } }).text?.body;
        salida.push({
          id,
          de: from,
          texto: tipo === "text" && typeof cuerpoTexto === "string" ? cuerpoTexto : null,
          tipo,
        });
      }
    }
  }

  return salida;
}

/**
 * Si el número que escribe es el autorizado.
 *
 * FASE 1: uno solo, por variable de entorno. Se comparan sólo los dígitos porque
 * WhatsApp manda `5491122334455` y una persona escribe `+54 9 11 2233-4455`.
 *
 * Sin `WHATSAPP_OWNER_PHONE` cargada devuelve false para todos: es mejor que
 * Sasha no conteste que contestarle a cualquiera con los datos de una tienda.
 */
export function esNumeroAutorizado(numero: string): boolean {
  const autorizado = process.env.WHATSAPP_OWNER_PHONE;
  if (!autorizado) return false;
  const soloDigitos = (s: string) => s.replace(/\D/g, "");
  return soloDigitos(numero) === soloDigitos(autorizado);
}

/* ── Salida ───────────────────────────────────────────────────────────────── */

/**
 * Manda un mensaje de texto por WhatsApp.
 *
 * Ojo con la ventana de 24hs de Meta: esto sirve para RESPONDER a alguien que
 * escribió hace menos de un día. Un mensaje que arranca el negocio fuera de esa
 * ventana necesita una plantilla aprobada y se paga aparte — por eso el aviso de
 * la mañana no puede salir por acá (ver SASHA-WHATSAPP.md).
 */
export async function mandarWhatsApp(a: string, texto: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error("[whatsapp] falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID");
    return false;
  }

  const cuerpo = texto.length > MAX_CHARS_WHATSAPP ? texto.slice(0, MAX_CHARS_WHATSAPP) : texto;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: a,
        type: "text",
        text: { body: cuerpo, preview_url: false },
      }),
    });

    if (!res.ok) {
      // El detalle del error de Meta se loguea entero: es lo único que distingue
      // "token vencido" de "número no verificado", y los dos fallan igual desde acá.
      console.error("[whatsapp] Meta rechazó el envío", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp] no se pudo enviar", err);
    return false;
  }
}
