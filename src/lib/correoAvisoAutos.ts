import { linkWhatsApp } from "@/lib/whatsappTienda";

/**
 * El correo que le llega a la concesionaria cuando alguien consulta por un
 * vehículo, pide una tasación o deja una búsqueda (08/10/26). Antes sólo
 * sonaba la campanita y el teléfono, y el teléfono sólo si la dueña había
 * activado las notificaciones: una consulta (una posible venta) se podía
 * pasar.
 *
 * Arriba qué pasó, los datos en una tabla, y dos botones: contestarle por
 * WhatsApp (con el número del cliente y un saludo ya escrito) y verlo en el
 * panel. Todo lo que escribió el cliente pasa por `escapar`: es texto de un
 * desconocido metido en un HTML.
 */

export type AvisoParaConcesionaria = {
  tienda: string;
  /** "Nueva consulta", "Nueva tasación", "Nueva búsqueda". */
  titulo: string;
  /** Una línea: "Juan consultó por el Toyota Corolla XEI 2022". */
  resumen: string;
  filas: [string, string | null | undefined][];
  nombre: string;
  telefono: string;
  /** El mensaje de WhatsApp ya escrito para contestarle. */
  saludo: string;
  /** La pantalla del panel (url completa). */
  panel: string;
  panelTexto: string;
};

export function escapar(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** El asunto y el cuerpo del correo. */
export function correoAvisoAutos(a: AvisoParaConcesionaria): { asunto: string; html: string } {
  const wa = linkWhatsApp(a.telefono, a.saludo);
  const filas = a.filas.filter(([, v]) => v != null && String(v).trim() !== "");
  const boton = (href: string, texto: string, fondo: string) =>
    `<a href="${escapar(href)}" style="display:inline-block;background:${fondo};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:10px;margin:0 6px 10px 0;">${escapar(texto)}</a>`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:28px 16px;color:#0f172a;">
      <p style="margin:0 0 4px;font-size:13px;color:#64748b;">${escapar(a.tienda)}</p>
      <h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;">${escapar(a.titulo)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#334155;">${escapar(a.resumen)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;margin-bottom:22px;">
        ${filas.map(([k, v]) => `
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;width:38%;vertical-align:top;">${escapar(k)}</td>
          <td style="padding:10px 14px;font-size:14px;font-weight:700;border-bottom:1px solid #e2e8f0;white-space:pre-line;">${escapar(String(v))}</td>
        </tr>`).join("")}
      </table>
      <div>
        ${wa ? boton(wa, `Contestarle por WhatsApp`, "#16a34a") : ""}
        ${boton(a.panel, a.panelTexto, "#0f172a")}
      </div>
      ${wa ? "" : `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">El teléfono que dejó no parece un celular para WhatsApp: llamalo al ${escapar(a.telefono)}.</p>`}
      <p style="margin:22px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">Te llega porque alguien completó un formulario en tu tienda. Contestar rápido es lo que más vende.</p>
    </div>`;
  // El asunto lleva texto del cliente: sin saltos de línea.
  return { asunto: `${a.titulo}: ${a.resumen}`.replace(/[\r\n]+/g, " ").slice(0, 160), html };
}
