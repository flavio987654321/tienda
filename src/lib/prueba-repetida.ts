/**
 * ¿Este mail ya tuvo una prueba gratis, en una cuenta que después eliminó?
 *
 * ── El hueco ────────────────────────────────────────────────────────────────
 *
 * Eliminar la cuenta (`/api/cuenta` DELETE, o el admin) la anonimiza y borra el
 * usuario de Supabase, y eso libera el mail para registrarse de nuevo — a
 * propósito, para que alguien pueda volver. Pero la cuenta nueva nacía con su
 * prueba de 7 días, así que "eliminar y volver a registrarme" era una prueba
 * gratis infinita.
 *
 * Cerrar la tienda (o la cuenta digital) NO tiene este problema: no borra nada,
 * la cuenta sigue existiendo, el mail sigue ocupado y al reabrir recupera solo
 * los días que le quedaban (`reactivationCredit`).
 *
 * ── Cómo se sabe ────────────────────────────────────────────────────────────
 *
 * Con `DeletedAccountAudit`, el registro legal que ya se guarda al eliminar
 * (con el mail original y el rol de la suscripción). No hizo falta tabla nueva.
 *
 * La prueba es por producto: haber probado una tienda no quita la prueba de
 * Productos Digitales, que es otra cosa.
 *
 * Los alias del mismo correo cuentan como el mismo: `ana+2@x.com` es `ana@x.com`,
 * y en Gmail además los puntos no cuentan (`a.na@gmail.com` es `ana@gmail.com`).
 * Un mail realmente nuevo no se puede frenar — pasa en todas las plataformas.
 */

const DOMINIOS_GMAIL = new Set(["gmail.com", "googlemail.com"]);

/** El mail "de fondo": sin alias `+algo`, y en Gmail sin puntos. */
export function huellaDeMail(email: string): string {
  const e = email.trim().toLowerCase();
  const arroba = e.lastIndexOf("@");
  if (arroba < 1) return e;
  let local = e.slice(0, arroba);
  let dominio = e.slice(arroba + 1);
  const mas = local.indexOf("+");
  if (mas > 0) local = local.slice(0, mas);
  if (DOMINIOS_GMAIL.has(dominio)) {
    local = local.replace(/\./g, "");
    dominio = "gmail.com";
  }
  return `${local}@${dominio}`;
}

/** El dominio a buscar en la base (Gmail se guarda con cualquiera de los dos). */
export function dominiosParaBuscar(email: string): string[] {
  const d = email.trim().toLowerCase().split("@").pop() ?? "";
  return DOMINIOS_GMAIL.has(d) ? [...DOMINIOS_GMAIL] : [d];
}
