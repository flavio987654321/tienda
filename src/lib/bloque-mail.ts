/**
 * Si una tienda tiene a la vista el bloque donde la gente deja su mail.
 *
 * Lo usan dos lugares que tienen que decir lo mismo: Notificaciones (si habla
 * de push y mail o sólo de push) y la política de privacidad (si declara que
 * se guardan mails). Si uno dijera que sí y el otro que no, la dueña vería una
 * cosa en el panel y sus clientes leerían otra.
 *
 * Los templates de moda lo traen desde siempre. Los de autos, desde el
 * 08/10/26 ("Recibí los ingresos por mail"), y ahí la dueña lo puede ocultar
 * en Diseño. El template se lee de storeConfig, no de Store.templateId (que
 * dice "default" en todas).
 */
import { TEMPLATES_CON_NEWSLETTER, type TemplateId } from "@/types/store-config";

/** El bloque de mail de cada template de autos, por su id de sección. */
export const BLOQUE_MAIL_AUTOS: Record<string, string> = { "auto-motor": "am-novedades", "auto-drive": "ad-novedades" };

export function tieneBloqueDeMail(template: string | null | undefined, hiddenSections: string[] | null | undefined): boolean {
  if (!template) return false;
  const bloqueAutos = BLOQUE_MAIL_AUTOS[template];
  if (bloqueAutos) return !(hiddenSections ?? []).includes(bloqueAutos);
  return TEMPLATES_CON_NEWSLETTER.includes(template as TemplateId);
}

/** Lo mismo, leyendo el JSON de storeConfig tal como está en la base. */
export function tieneBloqueDeMailSegunConfig(storeConfig: string | null | undefined): boolean {
  try {
    const c = JSON.parse(storeConfig || "{}") as { template?: unknown; hiddenSections?: unknown };
    return tieneBloqueDeMail(
      typeof c.template === "string" ? c.template : null,
      Array.isArray(c.hiddenSections) ? c.hiddenSections.filter((x): x is string => typeof x === "string") : [],
    );
  } catch { return false; }
}
