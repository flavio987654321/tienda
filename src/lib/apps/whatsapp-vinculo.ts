/**
 * Marca de "ya vinculé mi catálogo a WhatsApp", declarada por la dueña.
 *
 * A diferencia del resto de las integraciones, esto NO lo podemos verificar
 * contra Meta: el último paso lo hace ella en el panel de Meta y Meta no nos deja
 * preguntarle cómo quedó (hace falta `whatsapp_business_management` con acceso
 * avanzado, que Meta reserva para quienes envían mensajes por WhatsApp — nosotros
 * no enviamos mensajes). Así que lo que se guarda acá es lo que ella dice, no lo
 * que comprobamos.
 *
 * Esa diferencia importa y por eso el nombre lo dice: es un vínculo DECLARADO. La
 * pantalla no puede tratarlo como un hecho comprobado ni prometer que del otro
 * lado quedó bien.
 *
 * Vive en `storeConfig` y no en una columna nueva a propósito: es una preferencia
 * de la tienda, no un dato de Meta, y `storeConfig` ya preserva sola toda clave
 * que no sea de diseño (ver `mergeDesignConfig` en lib/store-config) — así que
 * sobrevive a guardar el diseño y a resetearlo, sin migración.
 *
 * La columna `Store.fbWabaId` quedó sin uso el 14/08/2026, cuando el paso pasó de
 * ser una llamada a la Graph API a ser una guía. Se dejó en la base porque
 * sacarla es una migración sobre una tabla grande para no ganar nada; si alguna
 * vez Meta nos da el permiso, ese es su lugar.
 */

const CLAVE_APPS = "apps";
const CLAVE_VINCULO = "whatsappCatalogoAt";

type BloqueApps = Record<string, unknown> & { [CLAVE_VINCULO]?: unknown };

function bloqueApps(config: Record<string, unknown>): BloqueApps {
  const apps = config[CLAVE_APPS];
  return apps && typeof apps === "object" && !Array.isArray(apps)
    ? (apps as BloqueApps)
    : {};
}

/** ¿La dueña declaró que ya vinculó el catálogo? Lee el JSON crudo de la base. */
export function whatsappVinculado(storeConfigRaw: string | null | undefined): boolean {
  try {
    const config: unknown = JSON.parse(storeConfigRaw || "{}");
    if (!config || typeof config !== "object" || Array.isArray(config)) return false;
    const valor = bloqueApps(config as Record<string, unknown>)[CLAVE_VINCULO];
    return typeof valor === "string" && valor.length > 0;
  } catch {
    return false;
  }
}

/** Para `actualizarStoreConfig`: deja la marca puesta. */
export function marcarVinculado(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ...config,
    [CLAVE_APPS]: { ...bloqueApps(config), [CLAVE_VINCULO]: new Date().toISOString() },
  };
}

/** Para `actualizarStoreConfig`: saca la marca sin tocar nada más del bloque. */
export function desmarcarVinculado(config: Record<string, unknown>): Record<string, unknown> {
  const { [CLAVE_VINCULO]: _quitado, ...resto } = bloqueApps(config);
  return { ...config, [CLAVE_APPS]: resto };
}
