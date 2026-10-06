import { celularArgentino } from "@/lib/ventas-digitales";
import { esWhatsappDeEjemplo } from "@/lib/configPublica";

/* ══════════════════════════════════════════════════════════════════════════
   EL NÚMERO DE WHATSAPP DE UNA TIENDA, COMO LO QUIERE wa.me (06/10/26)
   ══════════════════════════════════════════════════════════════════════════

   Los botones hacían `numero.replace(/\D/g, "")` y listo. Con eso, un
   "011 15 5555-1234" armaba `wa.me/01115…`, que no abre ninguna conversación:
   wa.me quiere el país adelante y sin el 0 ni el 15.

   La regla, conservadora a propósito:
   - Con código de país (`+…` o `00…`), se respeta tal cual lo escribió. Un
     "+54 2254 …" sin el 9 puede ser un fijo con WhatsApp Business, y ponerle
     un 9 lo rompería.
   - Sin código de país, se lo lee como un celular argentino (`celularArgentino`:
     saca el 0 y el 15) y se le pone el 549.
   - El número de muestra, o uno que no se puede leer, da `null`: mejor ningún
     botón que uno que abre un chat con un desconocido. */
export function numeroWhatsApp(crudo: string | null | undefined): string | null {
  if (!crudo || esWhatsappDeEjemplo(crudo)) return null;
  const t = crudo.trim();
  let d = t.replace(/\D/g, "");
  if (t.startsWith("+") || d.startsWith("00")) {
    if (d.startsWith("00")) d = d.slice(2);
    return d.length >= 8 && d.length <= 15 ? d : null;
  }
  const cel = celularArgentino(t);
  if (cel) return `549${cel}`;
  // Ya venía con 54 adelante (sin el +): se respeta.
  return d.startsWith("54") && d.length >= 11 && d.length <= 13 ? d : null;
}

/** El link completo, o `null` si no hay número que sirva. */
export function linkWhatsApp(crudo: string | null | undefined, texto?: string | null): string | null {
  const n = numeroWhatsApp(crudo);
  if (!n) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
