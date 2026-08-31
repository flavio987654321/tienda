import { Resend } from "resend";
import { RUBROS, ESTETICAS, PALETAS, FOTOS, CATALOGO, LOGO } from "@/lib/designBrief";
import { siteUrl } from "@/lib/site";

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Antes esto salía por SMTP de Gmail con una "contraseña de aplicación", que
// Google revoca cada vez que se cambia la clave de la cuenta: pasó el 9/7/2026
// y dejó los 25 mails de este archivo muertos en silencio durante días (Gmail
// devolvía EAUTH 535 y el error se perdía en un .catch()). Ahora se manda por
// Resend, el mismo servicio que ya venía entregando los otros mails del
// proyecto, desde el dominio propio y sin credenciales que caduquen.
const resend = new Resend(process.env.RESEND_API_KEY ?? "no-key");

// Solo se puede enviar desde un dominio verificado en Resend. La casilla no
// necesita existir: es solo la dirección que figura como remitente.
const FROM_ADDRESS =
  (process.env.RESEND_FROM ?? "TiendaApps <noreply@tiendaapps.com>").match(/<([^>]+)>/)?.[1]?.trim() ??
  "noreply@tiendaapps.com";

/**
 * Remitente para el correo de MARKETING (newsletters), separado del de arriba.
 *
 * Todas las tiendas del proyecto comparten un solo dominio de envío, así que
 * para Gmail hay un único remitente: si una tienda se gana denuncias de spam, la
 * reputación que baja es la de todas. Y lo que se cae con esa reputación no son
 * sólo los newsletters — son las confirmaciones de pedido, los avisos de pago y
 * el código de ingreso, o sea el correo del que depende que la tienda funcione.
 *
 * Gmail y el resto puntúan en buena medida POR SUBDOMINIO. Mandando las
 * novedades desde `envios.` y lo transaccional desde el dominio pelado, una
 * tienda que abusa quema el canal de marketing y deja intacto el otro. Es la
 * diferencia entre perder una función y perder el negocio.
 *
 * Requiere verificar ese subdominio en Resend (uno más, aparte del principal).
 * Mientras no esté verificado, `RESEND_FROM_MARKETING` sin definir lo deja
 * cayendo al dominio de siempre: sigue andando, sin la protección.
 */
const MARKETING_FROM_ADDRESS = (() => {
  const crudo = (process.env.RESEND_FROM_MARKETING ?? "").trim();
  if (!crudo) return FROM_ADDRESS;
  // Acepta las dos formas: "Novedades <novedades@envios.tiendaapps.com>" o la
  // dirección pelada.
  return crudo.match(/<([^>]+)>/)?.[1]?.trim() ?? crudo;
})();

/**
 * Adaptador con la misma forma que nodemailer (`sendMail`), para que las 25
 * funciones de abajo no cambien. Conserva el nombre visible que ya usaban
 * (ej. "Girly Store") pero reemplaza la dirección por la del dominio
 * verificado, que es la única desde la que Resend permite enviar.
 */
const transporter = {
  async sendMail({
    from,
    to,
    subject,
    html,
    replyTo,
  }: {
    from: string;
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }) {
    const displayName = from.match(/^\s*"?([^"<]*?)"?\s*</)?.[1]?.trim().replace(/[<>"]/g, "");
    const fromHeader = displayName ? `${displayName} <${FROM_ADDRESS}>` : FROM_ADDRESS;

    const { error } = await resend.emails.send({
      from: fromHeader,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    // Resend devuelve el error en la respuesta en vez de tirar excepción, así
    // que se convierte en throw para que los .catch() de siempre lo registren.
    if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
  },
};

export async function sendContactFormEmail({
  ownerEmail,
  storeName,
  name,
  email,
  phone,
  message,
}: {
  ownerEmail: string;
  storeName: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: ownerEmail,
    replyTo: email,
    subject: `Nuevo mensaje de contacto de ${name} — ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Nuevo mensaje de contacto</h1>
        </div>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#6366f1;">${escapeHtml(email)}</a></p>
          ${phone ? `<p style="margin:0 0 8px;font-size:14px;"><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>` : ""}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
          <p style="margin:0;font-size:14px;white-space:pre-line;color:#374151;">${escapeHtml(message)}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Podés responder directamente a este email para contestarle a ${escapeHtml(name)}.
        </p>
      </div>
    `,
  });
}

export async function sendLowStockEmail({
  ownerEmail,
  ownerName,
  storeName,
  products,
}: {
  ownerEmail: string;
  ownerName: string;
  storeName: string;
  products: { name: string; variant: string; stock: number }[];
}) {
  if (!process.env.RESEND_API_KEY) return;

  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0);

  const rows = products
    .map((p) => {
      const badge = p.stock === 0
        ? `<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:700;">Sin stock</span>`
        : `<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:700;">${p.stock} u.</span>`;
      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 16px;font-size:14px;color:#111827;">${escapeHtml(p.name)}</td>
          <td style="padding:10px 16px;font-size:14px;color:#6b7280;">${escapeHtml(p.variant)}</td>
          <td style="padding:10px 16px;">${badge}</td>
        </tr>`;
    })
    .join("");

  const subject = outOfStock.length > 0
    ? `⚠️ ${outOfStock.length} producto${outOfStock.length !== 1 ? "s" : ""} sin stock en ${storeName}`
    : `⚡ Stock bajo en ${storeName}`;

  const summary = outOfStock.length > 0
    ? `<strong>${outOfStock.length}</strong> producto${outOfStock.length !== 1 ? "s" : ""} se quedaron sin stock${lowStock.length > 0 ? ` y <strong>${lowStock.length}</strong> están por agotarse` : ""}.`
    : `<strong>${lowStock.length}</strong> producto${lowStock.length !== 1 ? "s" : ""} tienen stock bajo.`;

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: ownerEmail,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 4px;">Tu tienda · ${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Alerta de stock</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(ownerName)}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">${summary} Repone a tiempo para no perder ventas.</p>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Producto</th>
                <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Variante</th>
                <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Stock</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div style="text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/productos"
             style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            Ir a mis productos
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Este mensaje fue enviado automáticamente por tu tienda.
        </p>
      </div>
    `,
  });
}

export async function sendReviewRequestEmail({
  buyerEmail,
  buyerName,
  storeName,
  storeSlug,
  products,
}: {
  buyerEmail: string;
  buyerName: string;
  storeName: string;
  storeSlug: string;
  products: { id: string; name: string }[];
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const productLinks = products
    .map(
      (p) =>
        `<a href="${appUrl}/tienda/${storeSlug}?producto=${encodeURIComponent(p.id)}"
           style="display:block;padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6366f1;text-decoration:none;">
          ⭐ Dejar reseña de <strong>${escapeHtml(p.name)}</strong>
        </a>`
    )
    .join("");

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: buyerEmail,
    subject: `¿Cómo te fue con tu compra en ${storeName}?`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">¡Tu pedido fue entregado!</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(buyerName) || "compradora"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          Esperamos que hayas quedado contenta con tu compra en <strong>${escapeHtml(storeName)}</strong>.
          Tu opinión ayuda a otras compradoras a elegir mejor. ¿Nos dejás una reseña?
        </p>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
          ${productLinks}
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Este mensaje fue enviado automáticamente porque tu pedido fue marcado como entregado.
        </p>
      </div>
    `,
  });
}

export async function sendNewReviewToOwnerEmail({
  ownerEmail,
  storeName,
  storeSlug,
  productId,
  productName,
  reviewerName,
  rating,
  comment,
  pendiente = false,
}: {
  ownerEmail: string;
  storeName: string;
  storeSlug: string;
  /** `null` cuando la reseña habla de la tienda entera y no de un producto. */
  productId?: string | null;
  productName?: string | null;
  reviewerName: string;
  rating: number;
  comment?: string | null;
  /** Está esperando aprobación: todavía no se ve en la tienda. */
  pendiente?: boolean;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);

  // Adónde manda el botón. Una reseña pendiente NO está publicada: mandar a la
  // tienda sería mandar a un lugar donde no está, sin explicar por qué. Y aunque
  // esté publicada, para hacer algo con ella —borrarla, verificarla— hay que
  // estar en el panel, que hasta ahora el mail no nombraba en ningún lado.
  const destino = pendiente || !productId
    ? { url: `${appUrl}/dashboard/resenas`, texto: pendiente ? "Revisarla y aprobarla" : "Verla en mi panel" }
    : { url: `${appUrl}/tienda/${storeSlug}/producto/${productId}`, texto: "Ver la reseña en mi tienda" };

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: ownerEmail,
    subject: pendiente
      ? `Reseña de tu tienda (${rating}★) esperando tu aprobación`
      : `Nueva reseña (${rating}★) en ${storeName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff;">
        <div style="background:#111827;border-radius:16px;padding:28px;margin-bottom:24px;">
          <p style="color:#9ca3af;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;font-weight:600;">${escapeHtml(storeName)}</p>
          <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:800;letter-spacing:-0.02em;">${
            productName ? "Nueva reseña recibida" : "Opinaron sobre tu tienda"
          }</h1>
        </div>

        ${pendiente ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;margin-bottom:16px;">
          <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;">
            <strong>Todavía no se ve en tu tienda.</strong> Las reseñas sobre la tienda no apuntan a
            ningún producto y salen en tu portada, así que las revisás vos antes de que se publiquen.
          </p>
        </div>` : ""}

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">${productName ? "Producto" : "Sobre"}</p>
          <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 14px;">${escapeHtml(productName ?? "Tu tienda en general")}</p>
          <p style="font-size:18px;margin:0 0 10px;">${stars}</p>
          ${comment ? `<p style="font-size:14px;color:#374151;line-height:1.6;margin:0;white-space:pre-wrap;">"${escapeHtml(comment)}"</p>` : ""}
          <p style="font-size:12px;color:#9ca3af;margin:14px 0 0;">— ${escapeHtml(reviewerName)}</p>
        </div>

        <div style="text-align:center;margin-bottom:24px;">
          <a href="${destino.url}"
             style="display:inline-block;background:#111827;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            ${destino.texto}
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendAffiliateStatusEmail({
  affiliateEmail,
  affiliateName,
  storeName,
  storeSlug,
  status,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
  storeSlug: string;
  status: "APPROVED" | "PAUSED" | "REMOVED" | "REJECTED";
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const dashboardUrl = `${appUrl}/afiliados`;

  const content = {
    APPROVED: {
      subject: `Ya podés vender para ${storeName}`,
      title: "Afiliación aprobada",
      body: `Tu solicitud para vender en <strong>${escapeHtml(storeName)}</strong> fue aprobada. Ya podés entrar a tu panel, copiar tu link y empezar a compartir productos.`,
      accent: "#16a34a",
      cta: "Ir a mi panel",
      ctaUrl: dashboardUrl,
    },
    PAUSED: {
      subject: `Tu afiliación en ${storeName} fue pausada`,
      title: "Afiliación pausada",
      body: `La tienda <strong>${escapeHtml(storeName)}</strong> pausó temporalmente tu acceso como afiliado. Tu link deja de estar activo hasta que te reactiven.`,
      accent: "#6b7280",
      cta: "Ver mi estado",
      ctaUrl: dashboardUrl,
    },
    REMOVED: {
      subject: `Tu afiliación en ${storeName} fue dada de baja`,
      title: "Afiliación dada de baja",
      body: `La tienda <strong>${escapeHtml(storeName)}</strong> dio de baja tu afiliación. Tu link ya no está activo. Si vuelven a habilitarte o querés postularte otra vez, vas a verlo desde tu panel.`,
      accent: "#dc2626",
      cta: "Abrir mi panel",
      ctaUrl: dashboardUrl,
    },
    REJECTED: {
      subject: `Tu solicitud en ${storeName} no fue aprobada`,
      title: "Solicitud rechazada",
      body: `La tienda <strong>${escapeHtml(storeName)}</strong> no aprobó tu solicitud por ahora. Podés seguir explorando otras tiendas o volver a revisar tu panel más adelante.`,
      accent: "#dc2626",
      cta: "Explorar tiendas",
      ctaUrl: `${appUrl}/afiliados`,
    },
  }[status];

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: affiliateEmail,
    subject: content.subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:${content.accent};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">${escapeHtml(content.title)}</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(affiliateName) || "afiliado"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">${content.body}</p>

        <div style="text-align:center;">
          <a href="${content.ctaUrl}"
             style="display:inline-block;background:${content.accent};color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            ${content.cta}
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Estado de tu afiliación en ${escapeHtml(storeName)} · tienda/${escapeHtml(storeSlug)}
        </p>
      </div>
    `,
  });
}

export async function sendNewAffiliateApplicationEmail({
  ownerEmail,
  ownerName,
  storeName,
  applicantName,
  applicantEmail,
  applicationMessage,
}: {
  ownerEmail: string;
  ownerName: string;
  storeName: string;
  applicantName: string;
  applicantEmail: string;
  applicationMessage?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const dashboardUrl = `${appUrl}/dashboard/vendedoras`;

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: ownerEmail,
    subject: `Nueva solicitud de afiliado en ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Nueva solicitud de afiliado</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(ownerName) || "titular"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:20px;">
          <strong>${escapeHtml(applicantName)}</strong> (${escapeHtml(applicantEmail)}) se postuló para vender en tu tienda <strong>${escapeHtml(storeName)}</strong>.
        </p>

        ${applicationMessage ? `
        <div style="background:#f3f4f6;border-radius:10px;padding:16px;margin-bottom:20px;">
          <p style="color:#6b7280;font-size:12px;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Su mensaje</p>
          <p style="color:#374151;font-size:14px;margin:0;">${escapeHtml(applicationMessage)}</p>
        </div>
        ` : ""}

        <div style="text-align:center;">
          <a href="${dashboardUrl}"
             style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            Ver solicitud en mi panel
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Panel de afiliados de ${escapeHtml(storeName)}
        </p>
      </div>
    `,
  });
}

export async function sendCommissionEarnedEmail({
  affiliateEmail,
  affiliateName,
  storeName,
  commissionAmount,
  orderTotal,
  commissionRate,
  newBalance,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
  commissionAmount: number;
  orderTotal: number;
  commissionRate: number;
  newBalance: number;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: affiliateEmail,
    subject: `💰 Ganaste ${fmt(commissionAmount)} de comisión en ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#16a34a;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">¡Comisión acreditada!</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(affiliateName) || "afiliado"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          Una venta que generaste en <strong>${escapeHtml(storeName)}</strong> fue confirmada y tu comisión ya está disponible en tu panel de comisiones.
        </p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Total de la venta</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${fmt(orderTotal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Tu comisión (${commissionRate}%)</span>
            <span style="font-size:16px;font-weight:800;color:#16a34a;">${fmt(commissionAmount)}</span>
          </div>
          <hr style="border:none;border-top:1px solid #bbf7d0;margin:12px 0;" />
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:14px;color:#6b7280;">Saldo en comisiones</span>
            <span style="font-size:14px;font-weight:700;color:#111827;">${fmt(newBalance)}</span>
          </div>
        </div>

        <div style="text-align:center;">
          <a href="${appUrl}/afiliados/billetera"
             style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            Ver mis comisiones
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Podés solicitar un retiro cuando quieras desde tu panel de comisiones · ${escapeHtml(storeName)}
        </p>
      </div>
    `,
  });
}

// ── Bloque de ahorros (promos / cupón / envío) ────────────────────────────────
// Compartido por los 3 mails de pedido. La regla: el comprador tiene que ver QUÉ
// promo se le aplicó y cuánto le ahorró, no un "ahorraste $X" anónimo.
export type EmailPromo = { name: string | null; label: string; type: string; savings: number };

const emailMoney = (n: number) => `$${n.toLocaleString("es-AR")}`;

/** Lee `Order.promoSummary` (JSON congelado en la venta) de forma tolerante: si el
 *  dato falta o vino roto, se devuelve vacío y el email simplemente no muestra promos. */
export function parseOrderPromoSummary(raw: string | null | undefined): {
  appliedPromos: EmailPromo[];
  freeShippingPromo: EmailPromo | null;
} {
  const empty = { appliedPromos: [], freeShippingPromo: null };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw);
    const isPromo = (p: unknown): p is EmailPromo =>
      !!p && typeof p === "object" && typeof (p as EmailPromo).label === "string";
    return {
      appliedPromos: Array.isArray(parsed?.applied) ? parsed.applied.filter(isPromo) : [],
      freeShippingPromo: isPromo(parsed?.freeShipping) ? parsed.freeShipping : null,
    };
  } catch {
    return empty;
  }
}

/** Una fila por promo aplicada: "🎉 Verano en remeras · 20% OFF   − $2.000" */
function promoRowsHtml(appliedPromos?: EmailPromo[] | null): string {
  if (!appliedPromos?.length) return "";
  return appliedPromos
    .filter((p) => p.savings > 0)
    .map((p) => {
      // Si tiene nombre propio se muestran los dos: el nombre dice cuál es, la
      // etiqueta dice en qué consiste. Si no tiene nombre, alcanza la etiqueta.
      const title = p.name ? `${escapeHtml(p.name)} · ${escapeHtml(p.label)}` : escapeHtml(p.label);
      return `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">🎉 ${title}</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${emailMoney(p.savings)}</span>
          </div>`;
    })
    .join("");
}

/** Fila de envío: distingue "gratis POR una promo" de un simple "sin cargo" (retiro). */
function shippingRowHtml(shippingCost: number, shippingMethod: string, freeShippingPromo?: EmailPromo | null): string {
  const isFreeByPromo = shippingCost === 0 && !!freeShippingPromo;
  const value = shippingCost === 0
    ? (isFreeByPromo ? "¡Gratis!" : "Sin cargo")
    : emailMoney(shippingCost);
  const valueColor = isFreeByPromo ? "#16a34a" : "#374151";
  const sub = isFreeByPromo
    ? `${escapeHtml(shippingMethod)} · <span style="color:#16a34a;font-weight:600;">Envío gratis${freeShippingPromo?.name ? ` por “${escapeHtml(freeShippingPromo.name)}”` : " por promoción"}</span>`
    : escapeHtml(shippingMethod);
  return `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Costo de envío</span>
            <span style="font-size:14px;color:${valueColor};font-weight:${isFreeByPromo ? "700" : "400"};">${value}</span>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:14px;">${sub}</div>`;
}

/** Cartel final: cuánto se ahorró en total, en una sola frase. */
function savingsBannerHtml(totalSaved: number, freeShippingPromo?: EmailPromo | null): string {
  if (totalSaved <= 0 && !freeShippingPromo) return "";
  const line = totalSaved > 0
    ? `🎉 En esta compra ahorraste ${emailMoney(totalSaved)}`
    : `🚚 En esta compra el envío te salió gratis`;
  const extra = totalSaved > 0 && freeShippingPromo
    ? `<p style="font-size:12.5px;color:#16a34a;margin:5px 0 0;">…y además el envío te salió gratis 🚚</p>`
    : "";
  return `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 18px;margin-bottom:28px;text-align:center;">
          <p style="font-size:15px;font-weight:800;color:#15803d;margin:0;">${line}</p>
          ${extra}
        </div>`;
}

function buildPaymentBlock(paymentInfo?: {
  transferencia?: { enabled?: boolean; titular?: string; cbu?: string; cvu?: string; alias?: string; banco?: string; cuil?: string; instrucciones?: string };
  efectivo?: { enabled?: boolean; instrucciones?: string };
} | null): string {
  const t = paymentInfo?.transferencia;
  const e = paymentInfo?.efectivo;
  const hasTransfer = t?.enabled && (t.cbu || t.cvu || t.alias);
  const hasEfectivo = e?.enabled && e.instrucciones;
  if (!hasTransfer && !hasEfectivo) return "";

  const rows: string[] = [];

  if (hasTransfer) {
    rows.push(`<p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Datos para transferir</p>`);
    if (t!.titular) rows.push(payRow("Titular", escapeHtml(t!.titular)));
    if (t!.cbu)     rows.push(payRow("CBU", `<span style="font-family:monospace;letter-spacing:0.05em;">${escapeHtml(t!.cbu)}</span>`));
    if (t!.cvu)     rows.push(payRow("CVU", `<span style="font-family:monospace;letter-spacing:0.05em;">${escapeHtml(t!.cvu)}</span>`));
    if (t!.alias)   rows.push(payRow("Alias", `<strong>${escapeHtml(t!.alias)}</strong>`));
    if (t!.banco)   rows.push(payRow("Banco", escapeHtml(t!.banco)));
    if (t!.cuil)    rows.push(payRow("CUIL/CUIT", escapeHtml(t!.cuil)));
    if (t!.instrucciones) {
      rows.push(`<div style="background:#f0f0ff;border-radius:8px;padding:10px 12px;margin-top:8px;font-size:13px;color:#4338ca;line-height:1.6;">${escapeHtml(t!.instrucciones)}</div>`);
    }
  }

  if (hasEfectivo) {
    if (hasTransfer) rows.push(`<hr style="border:none;border-top:1px solid #f3f4f6;margin:14px 0;" />`);
    rows.push(`<p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Pago en efectivo</p>`);
    rows.push(`<p style="font-size:13px;color:#374151;line-height:1.6;margin:0;">${escapeHtml(e!.instrucciones!)}</p>`);
  }

  return `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:28px;">
      ${rows.join("")}
    </div>`;
}

function payRow(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;gap:12px;">
    <span style="font-size:13px;color:#6b7280;white-space:nowrap;">${label}</span>
    <span style="font-size:14px;color:#111827;text-align:right;">${value}</span>
  </div>`;
}

const RECORTE_POLITICA = 300;

function buildPoliciesBlock(
  policies?: { returns?: string; shipping?: string; terms?: string; privacy?: string } | null
): string {
  if (!policies) return "";
  // El texto se recorta porque en el mail es un resumen, no el documento: el
  // documento entero está en la página legal de la tienda, linkeada abajo.
  const item = (titulo: string, texto?: string) => {
    if (!texto?.trim()) return null;
    const recortado = escapeHtml(texto.slice(0, RECORTE_POLITICA));
    const puntos = texto.length > RECORTE_POLITICA ? "…" : "";
    return `<li style="margin-bottom:4px;"><strong>${titulo}:</strong> ${recortado}${puntos}</li>`;
  };
  const items = [
    item("Devoluciones", policies.returns),
    item("Envíos", policies.shipping),
    item("Términos", policies.terms),
    item("Privacidad", policies.privacy),
  ].filter((x): x is string => x !== null);
  if (!items.length) return "";
  return `
    <div style="margin-bottom:28px;">
      <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Políticas de la tienda</p>
      <ul style="font-size:12px;color:#6b7280;line-height:1.7;padding-left:16px;margin:0;">${items.join("")}</ul>
    </div>`;
}

export async function sendOrderConfirmationEmail({
  buyerEmail,
  buyerName,
  orderId,
  storeName,
  items,
  subtotal,
  promoSavings,
  appliedPromos,
  freeShippingPromo,
  discountAmount,
  couponCode,
  shippingCost,
  shippingMethod,
  total,
  paymentInfo,
  policies,
  ownerContact,
  paymentProvider,
}: {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  storeName: string;
  items: { name: string; variant?: string | null; quantity: number; price: number; lineTotal?: number | null; offerPrice?: number | null; comparePrice?: number | null }[];
  subtotal: number;
  promoSavings?: number;
  appliedPromos?: EmailPromo[] | null;
  freeShippingPromo?: EmailPromo | null;
  discountAmount: number;
  couponCode?: string | null;
  shippingCost: number;
  shippingMethod: string;
  total: number;
  paymentInfo?: {
    transferencia?: { enabled?: boolean; titular?: string; cbu?: string; cvu?: string; alias?: string; banco?: string; cuil?: string; instrucciones?: string };
    efectivo?: { enabled?: boolean; instrucciones?: string };
  } | null;
  policies?: { returns?: string; shipping?: string; terms?: string; privacy?: string } | null;
  ownerContact?: { name: string | null; email: string | null; phone: string | null } | null;
  paymentProvider?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const shortId = orderId.slice(-8).toUpperCase();

  const ofertaSavings = items.reduce((acc, item) => {
    const ref = item.offerPrice ?? item.price;
    if (item.comparePrice && item.comparePrice > ref) {
      return acc + (item.comparePrice - ref) * item.quantity;
    }
    return acc;
  }, 0);

  const itemRows = items
    .map((item) => {
      const hasOferta = item.comparePrice && item.comparePrice > item.price;
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
            <span style="font-size:14px;font-weight:600;color:#111827;display:block;">${escapeHtml(item.name)}</span>
            ${item.variant ? `<span style="font-size:12px;color:#9ca3af;display:block;margin-top:2px;">${escapeHtml(item.variant)}</span>` : ""}
          </td>
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:center;border-bottom:1px solid #f3f4f6;white-space:nowrap;">
            ${hasOferta ? `<s style="color:#9ca3af;font-size:12px;">${fmt(item.comparePrice!)}</s> ` : ""}${item.quantity} × ${fmt(item.price)}
          </td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;white-space:nowrap;">
            ${fmt(item.lineTotal ?? item.price * item.quantity)}
          </td>
        </tr>`;
    })
    .join("");

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: buyerEmail,
    subject: `Gracias por tu compra en ${storeName} — Pedido #${shortId}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff;">

        <!-- Header -->
        <div style="background:#111827;border-radius:16px;padding:32px 28px;margin-bottom:28px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;font-weight:600;">${escapeHtml(storeName)}</p>
          <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;font-weight:800;letter-spacing:-0.02em;">Gracias por tu compra</h1>
          <p style="color:#6b7280;font-size:13px;margin:0;">Pedido <span style="color:#e5e7eb;font-weight:700;">#${shortId}</span></p>
        </div>

        <!-- Greeting -->
        <p style="font-size:15px;color:#374151;margin:0 0 6px;">Hola <strong>${escapeHtml(buyerName)}</strong>,</p>
        <p style="font-size:15px;color:#6b7280;margin:0 0 28px;line-height:1.6;">
          ${paymentProvider === "mp"
            ? "Tu pedido fue registrado. Completá el pago en MercadoPago para que el vendedor pueda prepararlo. Cuando se confirme el pago, te avisamos por email."
            : "Recibimos tu pedido. El vendedor lo revisará y se va a poner en contacto con vos para coordinar el pago y el envío."
          }
        </p>

        <!-- Products table -->
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Detalle del pedido</p>
        <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Producto</th>
                <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Cant. × P.U.</th>
                <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>

        <!-- Totals -->
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Subtotal</span>
            <span style="font-size:14px;color:#374151;">${fmt(subtotal)}</span>
          </div>
          ${ofertaSavings > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#dc2626;font-weight:600;">🏷️ Ahorro por oferta</span>
            <span style="font-size:14px;color:#dc2626;font-weight:600;">− ${fmt(ofertaSavings)}</span>
          </div>` : ""}
          ${appliedPromos?.length
            ? promoRowsHtml(appliedPromos)
            : (promoSavings && promoSavings > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">🎉 Ahorro por promoción</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(promoSavings)}</span>
          </div>` : "")}
          ${discountAmount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:${couponCode ? "4px" : "10px"};">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">🎟️ Cupón de descuento</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(discountAmount)}</span>
          </div>
          ${couponCode ? `<div style="text-align:right;margin-bottom:10px;"><span style="font-size:11px;font-family:monospace;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;color:#15803d;font-weight:700;letter-spacing:0.08em;">${escapeHtml(couponCode)}</span></div>` : ""}` : ""}
          ${shippingRowHtml(shippingCost, shippingMethod, freeShippingPromo)}
          <div style="border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;font-weight:700;color:#111827;">Total</span>
            <span style="font-size:20px;font-weight:800;color:#111827;">${fmt(total)}</span>
          </div>
        </div>

        ${savingsBannerHtml(ofertaSavings + (promoSavings ?? 0) + discountAmount, freeShippingPromo)}

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${appUrl}/seguimiento/${shortId}"
             style="display:inline-block;background:#111827;color:#ffffff;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:0.01em;">
            Ver estado de mi pedido
          </a>
        </div>

        ${paymentProvider === "mp"
          ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px 20px;margin-bottom:28px;text-align:center;">
              <p style="font-size:13px;font-weight:700;color:#1d4ed8;margin:0 0 4px;">💳 Pago pendiente en MercadoPago</p>
              <p style="font-size:13px;color:#2563eb;margin:0;">Completá el pago en MercadoPago para que el vendedor pueda preparar tu pedido. Cuando se confirme, te enviamos otro email.</p>
             </div>`
          : buildPaymentBlock(paymentInfo)
        }

        <!-- Consumer rights -->
        <div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:14px 18px;border-radius:0 8px 8px 0;font-size:13px;color:#78350f;margin-bottom:28px;line-height:1.6;">
          <strong>Ley 24.240 — Derechos del consumidor:</strong> Tenés derecho a solicitar cambio o devolución dentro de los 10 días corridos si el producto no coincide con lo publicado.
        </div>

        ${buildPoliciesBlock(policies)}

        ${ownerContact && (ownerContact.email || ownerContact.phone) ? `
        <!-- Vendor contact -->
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
          <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Contacto del vendedor</p>
          ${ownerContact.name ? `<p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 4px;">${escapeHtml(ownerContact.name)}</p>` : ""}
          ${ownerContact.email ? `<p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Email: <a href="mailto:${escapeHtml(ownerContact.email)}" style="color:#4f46e5;">${escapeHtml(ownerContact.email)}</a></p>` : ""}
          ${ownerContact.phone ? `<p style="font-size:13px;color:#6b7280;margin:0;">WhatsApp / Tel: <strong>${escapeHtml(ownerContact.phone)}</strong></p>` : ""}
        </div>` : ""}

        <!-- Footer -->
        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:0;">
          ${escapeHtml(storeName)} · Pedido <strong>#${shortId}</strong>
        </p>
      </div>
    `,
  });
}

export async function sendNewOrderToOwnerEmail({
  ownerEmail,
  storeName,
  orderId,
  customer,
  items,
  subtotal,
  promoSavings,
  appliedPromos,
  freeShippingPromo,
  discountAmount,
  couponCode,
  shippingCost,
  shippingMethod,
  total,
  paymentProvider,
}: {
  ownerEmail: string;
  storeName: string;
  orderId: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    street?: string;
    city?: string;
    province?: string;
  };
  items: { name: string; variant?: string | null; quantity: number; price: number; lineTotal?: number | null; offerPrice?: number | null; comparePrice?: number | null }[];
  subtotal: number;
  promoSavings?: number;
  appliedPromos?: EmailPromo[] | null;
  freeShippingPromo?: EmailPromo | null;
  discountAmount: number;
  couponCode?: string | null;
  shippingCost: number;
  shippingMethod: string;
  total: number;
  paymentProvider?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const shortId = orderId.slice(-8).toUpperCase();

  const ofertaSavings = items.reduce((acc, item) => {
    const ref = item.offerPrice ?? item.price;
    if (item.comparePrice && item.comparePrice > ref) {
      return acc + (item.comparePrice - ref) * item.quantity;
    }
    return acc;
  }, 0);

  const itemRows = items
    .map((item) => {
      const hasOferta = item.comparePrice && item.comparePrice > item.price;
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
            <span style="font-size:14px;font-weight:600;color:#111827;display:block;">${escapeHtml(item.name)}</span>
            ${item.variant ? `<span style="font-size:12px;color:#9ca3af;display:block;margin-top:2px;">${escapeHtml(item.variant)}</span>` : ""}
          </td>
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:center;border-bottom:1px solid #f3f4f6;white-space:nowrap;">
            ${hasOferta ? `<s style="color:#9ca3af;font-size:12px;">${fmt(item.comparePrice!)}</s> ` : ""}${item.quantity} × ${fmt(item.price)}
          </td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;white-space:nowrap;">
            ${fmt(item.lineTotal ?? item.price * item.quantity)}
          </td>
        </tr>`;
    })
    .join("");

  const addressParts = [customer.street, customer.city, customer.province].filter(Boolean);
  const addressLine = addressParts.length > 0 ? escapeHtml(addressParts.join(", ")) : null;

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: ownerEmail,
    subject: `Nuevo pedido #${shortId} en ${storeName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff;">

        <!-- Header -->
        <div style="background:#111827;border-radius:16px;padding:28px;margin-bottom:28px;">
          <p style="color:#9ca3af;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;font-weight:600;">${escapeHtml(storeName)}</p>
          <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;font-weight:800;letter-spacing:-0.02em;">Nuevo pedido recibido</h1>
          <p style="color:#6b7280;font-size:13px;margin:0;">Pedido <span style="color:#e5e7eb;font-weight:700;">#${shortId}</span> · ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>

        <!-- Customer card -->
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Datos del comprador</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
            <span style="font-size:13px;color:#6b7280;">Nombre</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${escapeHtml(customer.name)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
            <span style="font-size:13px;color:#6b7280;">Email</span>
            <span style="font-size:14px;color:#374151;">${escapeHtml(customer.email)}</span>
          </div>
          ${customer.phone ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
            <span style="font-size:13px;color:#6b7280;">Teléfono</span>
            <span style="font-size:14px;color:#374151;">${escapeHtml(customer.phone)}</span>
          </div>` : ""}
          ${addressLine ? `
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
            <span style="font-size:13px;color:#6b7280;">Dirección</span>
            <span style="font-size:14px;color:#374151;text-align:right;">${addressLine}</span>
          </div>` : ""}
        </div>

        ${customer.phone ? (() => {
          const digits = customer.phone.replace(/\D/g, "");
          const waNumber = digits.startsWith("0") ? "549" + digits.slice(1) : digits.startsWith("549") ? digits : "549" + digits;
          const waMsg = encodeURIComponent(`Hola ${customer.name}, te escribo por tu pedido #${shortId} en ${storeName}. ¿Podemos coordinar el pago?`);
          return `<div style="text-align:center;margin-bottom:20px;">
          <a href="https://wa.me/${waNumber}?text=${waMsg}"
             style="display:inline-block;background:#25d366;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Contactar por WhatsApp
          </a>
        </div>`;
        })() : ""}

        <!-- Products table -->
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Productos</p>
        <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Producto</th>
                <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Cant. × P.U.</th>
                <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>

        <!-- Totals -->
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Subtotal</span>
            <span style="font-size:14px;color:#374151;">${fmt(subtotal)}</span>
          </div>
          ${ofertaSavings > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#dc2626;font-weight:600;">🏷️ Ahorro por oferta</span>
            <span style="font-size:14px;color:#dc2626;font-weight:600;">− ${fmt(ofertaSavings)}</span>
          </div>` : ""}
          ${appliedPromos?.length
            ? promoRowsHtml(appliedPromos)
            : (promoSavings && promoSavings > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">🎉 Ahorro por promoción</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(promoSavings)}</span>
          </div>` : "")}
          ${discountAmount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:${couponCode ? "4px" : "10px"};">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">🎟️ Cupón de descuento</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(discountAmount)}</span>
          </div>
          ${couponCode ? `<div style="text-align:right;margin-bottom:10px;"><span style="font-size:11px;font-family:monospace;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;color:#15803d;font-weight:700;letter-spacing:0.08em;">${escapeHtml(couponCode)}</span></div>` : ""}` : ""}
          ${shippingRowHtml(shippingCost, shippingMethod, freeShippingPromo)}
          <div style="border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;font-weight:700;color:#111827;">Total a cobrar${paymentProvider === "mp" ? " (MercadoPago)" : ""}</span>
            <span style="font-size:22px;font-weight:800;color:#111827;">${fmt(total)}</span>
          </div>
          ${paymentProvider === "mp" ? `<div style="margin-top:10px;background:#fefce8;border-radius:8px;padding:8px 12px;font-size:12px;color:#854d0e;font-weight:600;">⏳ Pago pendiente — el cliente debe completar el pago en MercadoPago. Te avisamos cuando se confirme.</div>` : ""}
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${appUrl}/dashboard/pedidos/${orderId}"
             style="display:inline-block;background:#111827;color:#ffffff;padding:15px 40px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.01em;">
            Ver pedido en el panel
          </a>
        </div>

        <!-- Footer -->
        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:0;">
          TiendaApps · ${escapeHtml(storeName)} · Pedido <strong>#${shortId}</strong>
        </p>
      </div>
    `,
  });
}

export async function sendOrderShippedEmail({
  buyerEmail,
  buyerName,
  orderId,
  storeName,
  trackingCode,
  shippingMethod,
  items,
}: {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  storeName: string;
  trackingCode?: string | null;
  shippingMethod: string;
  items: { name: string; variant?: string | null; quantity: number }[];
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const shortId = orderId.slice(-8).toUpperCase();

  const productList = items
    .map((i) => `<li style="margin-bottom:4px;font-size:14px;color:#374151;">
      <strong>${escapeHtml(i.name)}</strong>${i.variant ? ` — ${escapeHtml(i.variant)}` : ""} × ${i.quantity}
    </li>`)
    .join("");

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: buyerEmail,
    subject: `Tu pedido #${shortId} fue enviado — ${storeName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff;">

        <div style="background:#0ea5e9;border-radius:16px;padding:32px 28px;margin-bottom:28px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;font-weight:600;">${escapeHtml(storeName)}</p>
          <div style="font-size:48px;margin-bottom:8px;">📦</div>
          <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;font-weight:800;letter-spacing:-0.02em;">¡Tu pedido está en camino!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">Pedido <strong>#${shortId}</strong></p>
        </div>

        <p style="font-size:15px;color:#374151;margin:0 0 6px;">Hola <strong>${escapeHtml(buyerName)}</strong>,</p>
        <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
          Tu pedido fue despachado y está en camino. Método de envío: <strong>${escapeHtml(shippingMethod)}</strong>.
        </p>

        ${trackingCode ? `
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:18px 20px;margin-bottom:24px;text-align:center;">
          <p style="font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Número de seguimiento</p>
          <p style="font-size:22px;font-weight:800;color:#0ea5e9;margin:0;font-family:monospace;letter-spacing:0.05em;">${escapeHtml(trackingCode)}</p>
        </div>` : ""}

        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Productos enviados</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
          <ul style="margin:0;padding-left:16px;">${productList}</ul>
        </div>

        <div style="text-align:center;margin-bottom:28px;">
          <a href="${appUrl}/seguimiento/${shortId}"
             style="display:inline-block;background:#0ea5e9;color:#ffffff;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Ver estado de mi pedido
          </a>
        </div>

        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:0;">
          ${escapeHtml(storeName)} · Pedido <strong>#${shortId}</strong>
        </p>
      </div>
    `,
  });
}

export async function sendWithdrawalRequestEmail({
  ownerEmail,
  ownerName,
  storeName,
  affiliateName,
  affiliateEmail,
  amount,
  cbu,
  alias,
  cuil,
  bankHolder,
}: {
  ownerEmail: string;
  ownerName: string;
  storeName: string;
  affiliateName: string;
  affiliateEmail: string;
  amount: number;
  cbu: string | null;
  alias: string | null;
  cuil: string | null;
  bankHolder: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const bankRows = [
    bankHolder ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Titular</td><td style="padding:6px 0;font-weight:600;color:#111827;font-size:14px;">${escapeHtml(bankHolder)}</td></tr>` : "",
    cuil ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">CUIL</td><td style="padding:6px 0;font-weight:600;color:#111827;font-size:14px;">${escapeHtml(cuil)}</td></tr>` : "",
    cbu ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">CBU / CVU</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:14px;font-family:monospace;">${escapeHtml(cbu)}</td></tr>` : "",
    alias ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Alias</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:14px;font-family:monospace;">${escapeHtml(alias)}</td></tr>` : "",
  ].filter(Boolean).join("");

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: ownerEmail,
    subject: `💸 ${affiliateName} solicitó un retiro de ${fmt(amount)} — ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#f59e0b;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(0,0,0,0.6);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">Solicitud de retiro</h1>
          <p style="color:#fff;font-size:32px;font-weight:900;margin:8px 0 0;">${fmt(amount)}</p>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(ownerName) || "administrador"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          <strong>${escapeHtml(affiliateName)}</strong> (${escapeHtml(affiliateEmail)}) solicitó retirar sus comisiones ganadas.
          Por favor realizá la transferencia a los datos bancarios indicados abajo.
        </p>

        <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Datos para la transferencia</p>
          <table style="width:100%;border-collapse:collapse;">
            ${bankRows}
            <tr style="border-top:1px solid #fde68a;">
              <td style="padding:10px 0 0;color:#6b7280;font-size:14px;">Monto a transferir</td>
              <td style="padding:10px 0 0;font-weight:900;color:#d97706;font-size:18px;">${fmt(amount)}</td>
            </tr>
          </table>
        </div>

        <p style="color:#6b7280;font-size:13px;background:#f9fafb;border-radius:8px;padding:12px;">
          El afiliado ya ve su retiro como "en proceso". Una vez que realices la transferencia, el pago está completo. Si tenés algún inconveniente, contactá a soporte de TiendaApps.
        </p>
      </div>
    `,
  });
}

export async function sendWithdrawalReminderEmail({
  ownerEmail,
  ownerName,
  storeName,
  affiliateName,
  amount,
  daysOld,
  dashboardUrl,
}: {
  ownerEmail: string;
  ownerName: string;
  storeName: string;
  affiliateName: string;
  amount: number;
  daysOld: number;
  dashboardUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const isUrgent = daysOld >= 15;

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: ownerEmail,
    subject: `${isUrgent ? "⚠️ URGENTE" : "🔔 Recordatorio"}: retiro pendiente de ${affiliateName} (${daysOld} días) — ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:${isUrgent ? "#dc2626" : "#d97706"};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">
            ${isUrgent ? "Retiro sin procesar — 15 días" : "Recordatorio de retiro — 7 días"}
          </h1>
          <p style="color:#fff;font-size:32px;font-weight:900;margin:8px 0 0;">${fmt(amount)}</p>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(ownerName) || "administrador"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          <strong>${escapeHtml(affiliateName)}</strong> solicitó un retiro de <strong>${fmt(amount)}</strong> hace <strong>${daysOld} días</strong> y todavía no fue procesado.
          ${isUrgent ? "Este es un recordatorio urgente — el afiliado está esperando hace más de 2 semanas." : "Por favor procesalo cuando puedas."}
        </p>

        <a href="${dashboardUrl}" style="display:block;text-align:center;background:${isUrgent ? "#dc2626" : "#d97706"};color:#fff;font-weight:700;font-size:15px;padding:14px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
          Ver en el dashboard →
        </a>

        <p style="color:#6b7280;font-size:13px;background:#f9fafb;border-radius:8px;padding:12px;">
          Para procesar el retiro, accedé a <em>Admin → Retiros</em> en tu panel y marcá como pagado una vez que hayas realizado la transferencia.
          Si ya la realizaste, ignorá este mensaje.
        </p>
      </div>
    `,
  });
}

export async function sendWithdrawalApprovedEmail({
  affiliateEmail,
  affiliateName,
  storeName,
  amount,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
  amount: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: affiliateEmail,
    subject: `✅ Tu retiro de ${fmt(amount)} fue transferido — ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#16a34a;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">¡Tu retiro fue procesado!</h1>
          <p style="color:#fff;font-size:36px;font-weight:900;margin:8px 0 0;">${fmt(amount)}</p>
        </div>
        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(affiliateName)}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          TiendaApps procesó tu retiro de comisiones generadas en <strong>${escapeHtml(storeName)}</strong>.
          El dinero debería aparecer en tu cuenta en las próximas horas según tu banco o billetera virtual.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <p style="font-size:13px;color:#15803d;margin:0 0 4px;">Monto transferido</p>
          <p style="font-size:28px;font-weight:900;color:#16a34a;margin:0;">${fmt(amount)}</p>
        </div>
        <p style="color:#6b7280;font-size:13px;">Si no recibís el dinero en 48hs hábiles, escribinos a soporte desde tu panel de afiliado.</p>
      </div>
    `,
  });
}

export async function sendAfiliadoSoporteEmail({
  userName,
  userEmail,
  categoria,
  asunto,
  mensaje,
}: {
  userName: string;
  userEmail: string;
  categoria: string;
  asunto: string;
  mensaje: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  // Antes caía a SMTP_USER si faltaba ADMIN_EMAIL; ya no hay SMTP, y sin una
  // casilla real a la que escribir no tiene sentido intentar el envío.
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: adminEmail,
    replyTo: userEmail,
    subject: `🆘 Soporte afiliado: ${asunto}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#4f46e5;border-radius:12px;padding:24px;margin-bottom:24px;">
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 4px;">Consulta de soporte</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">${escapeHtml(asunto)}</h1>
        </div>
        <table style="width:100%;margin-bottom:20px;font-size:14px;">
          <tr><td style="color:#6b7280;padding:4px 0;width:100px;">Afiliado</td><td style="font-weight:600;">${escapeHtml(userName)}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;">Email</td><td><a href="mailto:${escapeHtml(userEmail)}" style="color:#4f46e5;">${escapeHtml(userEmail)}</a></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;">Categoría</td><td style="font-weight:600;">${escapeHtml(categoria)}</td></tr>
        </table>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;">${escapeHtml(mensaje)}</div>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Respondé directamente a este email para contestarle al afiliado.</p>
      </div>
    `,
  });
}

// Aviso al admin cuando entra una idea desde "Diseñá tu propia tienda". El brief
// ya quedó guardado y visible en /admin/disenos; esto es el segundo canal, para
// enterarse aunque no se entre al panel. Sale por Resend como el resto.
export async function sendDesignBriefAdminEmail(brief: {
  nombre: string;
  email: string;
  telefono: string | null;
  tipoTienda: string;
  estetica: string;
  paleta: string;
  coloresPropios: string | null;
  referencias: string | null;
  noQuiero: string | null;
  nombreTienda: string | null;
  queVende: string | null;
  fotos: string | null;
  catalogo: string | null;
  logo: string | null;
  tieneTienda: boolean;
  tiendaUrl: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const rubro = RUBROS.find((r) => r.id === brief.tipoTienda);
  const rubroLabel = rubro ? `${rubro.emoji} ${rubro.label}` : brief.tipoTienda;
  const esteticaLabel = ESTETICAS.find((e) => e.id === brief.estetica)?.label ?? brief.estetica;
  const paletaLabel = PALETAS.find((p) => p.id === brief.paleta)?.label ?? brief.paleta;
  const waDigits = brief.telefono ? brief.telefono.replace(/\D/g, "") : "";
  // Los briefs anteriores a estas preguntas no los traen, así que cada uno se
  // muestra solo si vino.
  const fotosLabel = FOTOS.find((f) => f.id === brief.fotos)?.label ?? null;
  const catalogoLabel = CATALOGO.find((c) => c.id === brief.catalogo)?.label ?? null;
  const logoLabel = LOGO.find((l) => l.id === brief.logo)?.label ?? null;

  const row = (label: string, value: string) =>
    `<tr><td style="color:#6b7280;padding:5px 0;width:120px;vertical-align:top;">${label}</td><td style="font-weight:600;color:#111827;">${value}</td></tr>`;

  const extra = (label: string, value: string | null) =>
    value
      ? `<div style="margin-top:12px;"><p style="color:#6b7280;font-size:13px;margin:0 0 4px;">${label}</p><div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px;font-size:14px;line-height:1.5;color:#374151;white-space:pre-wrap;">${escapeHtml(value)}</div></div>`
      : "";

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: adminEmail,
    replyTo: brief.email,
    subject: `🎨 Nueva idea de diseño: ${rubroLabel} · ${esteticaLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#ea580c;border-radius:12px;padding:24px;margin-bottom:24px;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">Diseñá tu propia tienda</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Nueva idea de diseño</h1>
        </div>
        <table style="width:100%;margin-bottom:8px;font-size:14px;">
          ${row("Nombre", escapeHtml(brief.nombre))}
          ${row("Email", `<a href="mailto:${escapeHtml(brief.email)}" style="color:#ea580c;">${escapeHtml(brief.email)}</a>`)}
          ${brief.telefono ? row("Teléfono", `<a href="https://wa.me/${waDigits}" style="color:#16a34a;">${escapeHtml(brief.telefono)}</a>`) : ""}
          ${brief.tieneTienda ? row("Tienda", `Ya tiene${brief.tiendaUrl ? `: ${escapeHtml(brief.tiendaUrl)}` : ""}`) : ""}
          ${brief.nombreTienda ? row("Su tienda", escapeHtml(brief.nombreTienda)) : ""}
          ${row("Rubro", escapeHtml(rubroLabel))}
          ${brief.queVende ? row("Qué vende", escapeHtml(brief.queVende)) : ""}
          ${row("Estética", escapeHtml(esteticaLabel))}
          ${row("Paleta", escapeHtml(paletaLabel))}
          ${brief.coloresPropios ? row("Colores marca", escapeHtml(brief.coloresPropios)) : ""}
          ${fotosLabel ? row("Fotos", escapeHtml(fotosLabel)) : ""}
          ${catalogoLabel ? row("Catálogo", escapeHtml(catalogoLabel)) : ""}
          ${logoLabel ? row("Logo", escapeHtml(logoLabel)) : ""}
        </table>
        ${extra("Referencias", brief.referencias)}
        ${extra("Qué NO quiere", brief.noQuiero)}
        <a href="${siteUrl("/admin/disenos")}" style="display:inline-block;margin-top:24px;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">Ver en el panel</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Respondé directamente a este email para escribirle a la persona.</p>
      </div>
    `,
  });
}

export async function sendStoreOfflineEmail({
  affiliateEmail,
  affiliateName,
  storeName,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: affiliateEmail,
    subject: `La tienda ${storeName} pausó su actividad temporalmente`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6b7280;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">TiendaApps · Programa de Afiliados</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Tienda pausada temporalmente</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(affiliateName) || "afiliado"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          La tienda <strong>${escapeHtml(storeName)}</strong> pausó temporalmente su actividad en TiendaApps.
          Tu link de afiliado sigue existiendo, pero la tienda no está visible para el público por ahora.
          Cuando vuelva a estar activa te avisaremos.
        </p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
          <p style="font-size:14px;color:#6b7280;margin:0 0 4px;">Mientras tanto podés explorar otras tiendas</p>
          <a href="${appUrl}/afiliados"
             style="display:inline-block;margin-top:12px;background:#6366f1;color:#fff;padding:10px 24px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            Ver tiendas disponibles
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Este aviso fue generado automáticamente · TiendaApps
        </p>
      </div>
    `,
  });
}

export async function sendOrderPaymentConfirmedEmail({
  buyerEmail,
  buyerName,
  orderId,
  storeName,
  storeSlug,
  total,
  items,
  subtotal,
  discountAmount,
  couponCode,
  shippingCost,
  shippingMethod,
  appliedPromos,
  freeShippingPromo,
  promoSavings,
}: {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  storeName: string;
  storeSlug: string;
  total: number;
  // Detalle de lo COBRADO. Es el mail que el comprador guarda como comprobante,
  // así que lleva el mismo desglose que el de confirmación, no solo el total.
  items?: { name: string; variant?: string | null; quantity: number; lineTotal: number }[];
  subtotal?: number;
  discountAmount?: number;
  couponCode?: string | null;
  shippingCost?: number;
  shippingMethod?: string | null;
  // Promos congeladas en la venta (Order.promoSummary / promoSavings).
  appliedPromos?: EmailPromo[] | null;
  freeShippingPromo?: EmailPromo | null;
  promoSavings?: number;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const shortId = orderId.slice(-8).toUpperCase();
  const storeUrl = `${appUrl}/tienda/${storeSlug}`;
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  const itemsBlock = items?.length
    ? `
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Qué compraste</p>
        <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:18px;">
          ${items.map((it, i) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;${i > 0 ? "border-top:1px solid #f3f4f6;" : ""}">
            <div>
              <p style="font-size:14px;color:#111827;margin:0;font-weight:600;">${escapeHtml(it.name)}</p>
              <p style="font-size:12px;color:#9ca3af;margin:2px 0 0;">${it.variant ? escapeHtml(it.variant) + " · " : ""}Cantidad: ${it.quantity}</p>
            </div>
            <span style="font-size:14px;color:#374151;font-weight:600;white-space:nowrap;">${fmt(it.lineTotal)}</span>
          </div>`).join("")}
        </div>`
    : "";

  const breakdown = subtotal != null
    ? `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Subtotal</span>
            <span style="font-size:14px;color:#374151;">${fmt(subtotal)}</span>
          </div>
          ${promoRowsHtml(appliedPromos)}
          ${discountAmount && discountAmount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:${couponCode ? "4px" : "10px"};">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">🎟️ Cupón de descuento</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(discountAmount)}</span>
          </div>
          ${couponCode ? `<div style="text-align:right;margin-bottom:10px;"><span style="font-size:11px;font-family:monospace;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;color:#15803d;font-weight:700;letter-spacing:0.08em;">${escapeHtml(couponCode)}</span></div>` : ""}` : ""}
          ${shippingCost != null ? shippingRowHtml(shippingCost, shippingMethod ?? "", freeShippingPromo) : ""}
          <div style="border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;font-weight:700;color:#111827;">Total pagado</span>
            <span style="font-size:20px;font-weight:800;color:#16a34a;">${fmt(total)}</span>
          </div>
        </div>`
    : `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px 20px;margin-bottom:28px;text-align:center;">
          <p style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Total confirmado</p>
          <p style="font-size:28px;font-weight:900;color:#16a34a;margin:0;">${fmt(total)}</p>
        </div>`;

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: buyerEmail,
    subject: `Pago confirmado — Pedido #${shortId} en preparación`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff;">

        <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:16px;padding:32px 28px;margin-bottom:28px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;font-weight:600;">${escapeHtml(storeName)}</p>
          <div style="font-size:48px;margin-bottom:8px;">✅</div>
          <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;font-weight:800;letter-spacing:-0.02em;">¡Pago confirmado!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">Pedido <strong>#${shortId}</strong></p>
        </div>

        <p style="font-size:15px;color:#374151;margin:0 0 6px;">Hola <strong>${escapeHtml(buyerName)}</strong>,</p>
        <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
          Tu pago fue confirmado y el pedido ya está en preparación. Te avisaremos cuando sea despachado.
          Guardá este email como comprobante.
        </p>

        ${itemsBlock}
        ${breakdown}
        ${savingsBannerHtml((promoSavings ?? 0) + (discountAmount ?? 0), freeShippingPromo)}

        <div style="text-align:center;margin-bottom:28px;">
          <a href="${appUrl}/seguimiento/${shortId}"
             style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Seguir mi pedido
          </a>
        </div>

        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:0;">
          <a href="${storeUrl}" style="color:#9ca3af;text-decoration:none;">${escapeHtml(storeName)}</a> · Pedido <strong>#${shortId}</strong>
        </p>
      </div>
    `,
  });
}

export async function sendOrderCancelledEmail({
  buyerEmail,
  buyerName,
  orderId,
  storeName,
  ownerContact,
}: {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  storeName: string;
  ownerContact?: { email?: string | null; phone?: string | null } | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const shortId = orderId.slice(-8).toUpperCase();

  const contactBlock = ownerContact?.email || ownerContact?.phone ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Contactar a la tienda</p>
      ${ownerContact.email ? `<p style="margin:0 0 4px;font-size:14px;">📧 <a href="mailto:${escapeHtml(ownerContact.email)}" style="color:#6366f1;">${escapeHtml(ownerContact.email)}</a></p>` : ""}
      ${ownerContact.phone ? `<p style="margin:0;font-size:14px;">📱 ${escapeHtml(ownerContact.phone)}</p>` : ""}
    </div>` : "";

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to: buyerEmail,
    subject: `Tu pedido #${shortId} fue cancelado — ${storeName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff;">

        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:16px;padding:32px 28px;margin-bottom:28px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;font-weight:600;">${escapeHtml(storeName)}</p>
          <div style="font-size:48px;margin-bottom:8px;">❌</div>
          <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;font-weight:800;letter-spacing:-0.02em;">Pedido cancelado</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">Pedido <strong>#${shortId}</strong></p>
        </div>

        <p style="font-size:15px;color:#374151;margin:0 0 6px;">Hola <strong>${escapeHtml(buyerName)}</strong>,</p>
        <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
          Lamentamos informarte que tu pedido <strong>#${shortId}</strong> en <strong>${escapeHtml(storeName)}</strong> fue cancelado.
          Si tenés preguntas, podés contactar a la tienda directamente.
        </p>

        ${contactBlock}

        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:0;">
          ${escapeHtml(storeName)} · Pedido <strong>#${shortId}</strong>
        </p>
      </div>
    `,
  });
}

export async function sendNewStorePublishedEmail({
  affiliateEmail,
  affiliateName,
  storeName,
  commissionRate,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
  commissionRate: number;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const storeUrl = `${appUrl}/afiliados`;

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: affiliateEmail,
    subject: `Nueva tienda disponible: ${storeName} — postulate ahora`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 4px;">TiendaApps · Programa de Afiliados</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Nueva tienda disponible</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(affiliateName) || "afiliado"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          La tienda <strong>${escapeHtml(storeName)}</strong> acaba de abrir su programa de afiliados.
          Podés postularte ahora y empezar a ganar comisiones del <strong>${commissionRate}%</strong> por cada venta que generes.
        </p>

        <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <p style="font-size:13px;color:#6b7280;margin:0 0 6px;">Comisión por venta</p>
          <p style="font-size:32px;font-weight:900;color:#6366f1;margin:0;">${commissionRate}%</p>
          <p style="font-size:13px;color:#6b7280;margin:6px 0 0;">${escapeHtml(storeName)}</p>
        </div>

        <div style="text-align:center;margin-bottom:24px;">
          <a href="${storeUrl}"
             style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ver tienda y postularme
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Recibís este email porque activaste las alertas de nuevas tiendas en tu panel.
          <a href="${appUrl}/afiliados" style="color:#6b7280;">Gestionar mis preferencias</a>
        </p>
      </div>
    `,
  });
}

export async function sendMpDisconnectedEmail({
  affiliateEmail,
  affiliateName,
  storeName,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: affiliateEmail,
    subject: `El programa de afiliados de ${storeName} está pausado`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#f59e0b;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(0,0,0,0.5);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Programa pausado temporalmente</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:16px;">Hola <strong>${escapeHtml(affiliateName) || "afiliado"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          La tienda <strong>${escapeHtml(storeName)}</strong> desconectó su cuenta de MercadoPago,
          por lo que el programa de afiliados está pausado temporalmente.
          Tus links de referido no generarán nuevas comisiones hasta que la tienda reconecte MP.
        </p>

        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Lo que no cambia</p>
          <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8;">
            <li>Tu saldo acumulado en tu panel de comisiones <strong>sigue disponible</strong> para retirar.</li>
            <li>Podés solicitar un retiro normalmente desde tu panel.</li>
            <li>Cuando la tienda reconecte MP, el programa se <strong>reactiva automáticamente</strong>.</li>
          </ul>
        </div>

        <div style="text-align:center;margin-bottom:24px;">
          <a href="${appUrl}/afiliados/billetera"
             style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ver mis comisiones
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          TiendaApps · Programa de Afiliados
        </p>
      </div>
    `,
  });
}

export async function sendAdminAlertEmail({
  subject,
  title,
  reason,
  actions,
}: {
  subject: string;
  title: string;
  reason: string;
  actions: string[];
}) {
  if (!process.env.RESEND_API_KEY) return;
  const actionItems = actions.map(a => `<li>${escapeHtml(a)}</li>`).join("");
  await transporter.sendMail({
    from: `"TiendaApps Alerta" <${FROM_ADDRESS}>`,
    to: "marketplacemitienda@gmail.com",
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;">
        <div style="background:#7f1d1d;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <h1 style="color:#fff;font-size:18px;margin:0;font-weight:700;">⚠️ ${escapeHtml(title)}</h1>
        </div>
        <p style="color:#374151;font-size:15px;"><strong>Detalle:</strong> ${escapeHtml(reason)}</p>
        <p style="color:#374151;font-size:15px;"><strong>Hora de detección:</strong> ${new Date().toLocaleString("es-AR")}</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-top:20px;">
          <p style="font-size:13px;color:#991b1b;margin:0 0 6px;font-weight:700;">Acciones recomendadas:</p>
          <ul style="margin:0;padding-left:18px;color:#991b1b;font-size:13px;line-height:1.8;">${actionItems}</ul>
        </div>
        <p style="font-size:11px;color:#9ca3af;margin-top:20px;">Alerta automática de TiendaApps · tiendaapps.com</p>
      </div>
    `,
  });
}

export async function sendMpHealthAlertEmail({
  reason,
  lastEventAt,
}: {
  reason: string;
  lastEventAt: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await transporter.sendMail({
    from: `"TiendaApps Alerta" <${FROM_ADDRESS}>`,
    to: "marketplacemitienda@gmail.com",
    subject: `⚠️ ALERTA: Problema detectado con MercadoPago — ${new Date().toLocaleString("es-AR")}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;">
        <div style="background:#7f1d1d;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <h1 style="color:#fff;font-size:18px;margin:0;font-weight:700;">⚠️ Alerta de sistema — TiendaApps</h1>
        </div>
        <p style="color:#374151;font-size:15px;"><strong>Motivo:</strong> ${escapeHtml(reason)}</p>
        <p style="color:#374151;font-size:15px;"><strong>Último evento MP registrado:</strong> ${escapeHtml(lastEventAt)}</p>
        <p style="color:#374151;font-size:15px;"><strong>Hora de detección:</strong> ${new Date().toLocaleString("es-AR")}</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-top:20px;">
          <p style="font-size:13px;color:#991b1b;margin:0;font-weight:700;">Acciones recomendadas:</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#991b1b;font-size:13px;line-height:1.8;">
            <li>Verificar el panel de MercadoPago Developers</li>
            <li>Revisar la cuenta MP por posibles restricciones</li>
            <li>Si la suspensión se confirma, notificar a tiendas y afiliados</li>
          </ul>
        </div>
        <p style="font-size:11px;color:#9ca3af;margin-top:20px;">Este email fue enviado automáticamente por el sistema de monitoreo de TiendaApps.</p>
      </div>
    `,
  });
}

export async function sendServiceInterruptionEmail({
  recipients,
  subject,
  title,
  body,
  estimatedResolution,
}: {
  recipients: string[];
  subject: string;
  title: string;
  body: string;
  estimatedResolution?: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const results = await Promise.allSettled(
    recipients.map((to) =>
      transporter.sendMail({
        from: `"TiendaApps" <${FROM_ADDRESS}>`,
        to,
        subject: escapeHtml(subject),
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
            <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
              <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;">TiendaApps</p>
              <h1 style="color:#fff;font-size:18px;margin:0;font-weight:700;">${escapeHtml(title)}</h1>
            </div>
            <div style="color:#374151;font-size:15px;line-height:1.7;margin-bottom:24px;">${escapeHtml(body)}</div>
            ${estimatedResolution ? `
            <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:24px;">
              <p style="font-size:13px;color:#92400e;margin:0;"><strong>Resolución estimada:</strong> ${escapeHtml(estimatedResolution)}</p>
            </div>` : ""}
            <p style="font-size:12px;color:#9ca3af;">Para consultas escribinos a marketplacemitienda@gmail.com</p>
            <p style="font-size:11px;color:#d1d5db;text-align:center;margin-top:24px;">TiendaApps · tiendaapps.com</p>
          </div>
        `,
      })
    )
  );
  return results;
}

export async function sendCommissionRateChangedEmail({
  affiliateEmail,
  affiliateName,
  storeName,
  oldRate,
  newRate,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
  oldRate: number;
  newRate: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const direction = newRate < oldRate ? "bajó" : "subió";
  const color = newRate < oldRate ? "#dc2626" : "#16a34a";

  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to: affiliateEmail,
    subject: `Cambio de comisión en ${escapeHtml(storeName)} — ${oldRate}% → ${newRate}%`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Cambio de comisión</h1>
        </div>
        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(affiliateName)}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          La tienda <strong>${escapeHtml(storeName)}</strong> modificó su porcentaje de comisión:
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
          <div style="display:flex;justify-content:center;align-items:center;gap:16px;">
            <div>
              <p style="font-size:12px;color:#64748b;margin:0 0 4px;">Antes</p>
              <p style="font-size:28px;font-weight:900;color:#64748b;margin:0;">${oldRate}%</p>
            </div>
            <p style="font-size:24px;color:${color};font-weight:900;margin:0;">→</p>
            <div>
              <p style="font-size:12px;color:${color};margin:0 0 4px;font-weight:600;">Ahora</p>
              <p style="font-size:28px;font-weight:900;color:${color};margin:0;">${newRate}%</p>
            </div>
          </div>
          <p style="font-size:13px;color:#64748b;margin:12px 0 0;">La comisión ${direction} ${Math.abs(newRate - oldRate).toFixed(1)} puntos porcentuales.</p>
        </div>
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:24px;">
          <p style="font-size:13px;color:#92400e;margin:0 0 6px;font-weight:700;">¿Qué cambia para vos?</p>
          <ul style="margin:0;padding-left:18px;color:#92400e;font-size:13px;line-height:1.7;">
            <li>Las ventas confirmadas a partir de ahora usarán el nuevo porcentaje de <strong>${newRate}%</strong>.</li>
            <li>Las comisiones ya acreditadas no se ven afectadas.</li>
          </ul>
        </div>
        <p style="font-size:12px;color:#9ca3af;margin-bottom:16px;">
          Según los Términos de TiendaApps, el/la Titular debía notificarte con al menos 5 días corridos de anticipación antes de realizar este cambio.
          Si considerás que no se respetó ese plazo, podés escribirnos a marketplacemitienda@gmail.com.
        </p>
      </div>
    `,
  });
}

export async function sendGamificationWinEmail({
  to,
  storeName,
  storeSlug,
  prizeLabel,
  couponCode,
  discountType,
  discountValue,
  minOrderAmount,
  expiresAt,
  legalText,
}: {
  to: string;
  storeName: string;
  storeSlug: string;
  prizeLabel: string;
  couponCode: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  expiresAt: Date;
  legalText?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const storeUrl = `${appUrl}/tienda/${storeSlug}`;
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const discountLabel = discountType === "percentage" ? `${discountValue}% OFF` : `${fmt(discountValue)} OFF`;
  const expiryLabel = `${expiresAt.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })} a las ${expiresAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;

  await transporter.sendMail({
    from: `"${storeName}" <${FROM_ADDRESS}>`,
    to,
    subject: `🎉 ¡Ganaste ${discountLabel} en ${storeName}!`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:16px;padding:32px 28px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;font-weight:600;">${escapeHtml(storeName)}</p>
          <div style="font-size:44px;margin-bottom:6px;">🎉</div>
          <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:800;letter-spacing:-0.02em;">¡Ganaste ${escapeHtml(discountLabel)}!</h1>
        </div>

        <p style="font-size:15px;color:#374151;margin:0 0 20px;">
          Jugaste en la ruleta de <strong>${escapeHtml(storeName)}</strong> y ganaste <strong>${escapeHtml(prizeLabel)}</strong>. Guardá este email — acá tenés tu código y hasta cuándo podés usarlo.
        </p>

        <div style="background:#f5f3ff;border:2px dashed #a5b4fc;border-radius:14px;padding:24px;text-align:center;margin-bottom:20px;">
          <p style="font-size:11px;color:#6366f1;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;font-weight:700;">Tu código</p>
          <p style="font-size:28px;font-weight:900;letter-spacing:0.08em;color:#4338ca;margin:0;font-family:monospace;">${escapeHtml(couponCode)}</p>
        </div>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;${minOrderAmount > 0 ? "margin-bottom:10px;" : ""}">
            <span style="font-size:13px;color:#6b7280;">Válido hasta</span>
            <span style="font-size:13px;font-weight:700;color:#111827;">${expiryLabel}</span>
          </div>
          ${minOrderAmount > 0 ? `
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:13px;color:#6b7280;">Compra mínima</span>
            <span style="font-size:13px;font-weight:700;color:#111827;">${fmt(minOrderAmount)}</span>
          </div>` : ""}
        </div>

        <div style="text-align:center;margin-bottom:20px;">
          <a href="${storeUrl}"
             style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            Ir a ${escapeHtml(storeName)}
          </a>
        </div>

        <p style="font-size:13px;color:#6b7280;margin-bottom:8px;">Ingresá el código al finalizar tu compra, en el paso de cupón de descuento.</p>

        ${legalText ? `<p style="font-size:12px;color:#9ca3af;line-height:1.6;margin-top:20px;">${escapeHtml(legalText)}</p>` : ""}

        <p style="color:#d1d5db;font-size:11px;text-align:center;margin-top:28px;">${escapeHtml(storeName)} · Premio de la ruleta</p>
      </div>
    `,
  });
}

export async function sendOtpEmail({
  to,
  name,
  code,
}: {
  to: string;
  name: string | null;
  code: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await transporter.sendMail({
    from: `"TiendaApps" <${FROM_ADDRESS}>`,
    to,
    subject: `Tu código de verificación: ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;padding:32px;border-radius:16px;color:#f8fafc;">
        <p style="font-size:14px;color:#94a3b8;margin:0 0 24px;">Hola${name ? ` ${escapeHtml(name)}` : ""},</p>
        <p style="font-size:14px;color:#cbd5e1;margin:0 0 24px;">Solicitaste acceder a tus datos bancarios en TiendaApps. Ingresá este código para continuar:</p>
        <div style="background:#1e293b;border:2px solid #6366f1;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
          <p style="font-size:42px;font-weight:900;letter-spacing:12px;color:#a5b4fc;margin:0;font-family:monospace;">${escapeHtml(code)}</p>
          <p style="font-size:12px;color:#64748b;margin:8px 0 0;">Válido por 10 minutos</p>
        </div>
        <p style="font-size:12px;color:#64748b;margin:0 0 8px;">Si no fuiste vos, ignorá este email. Nadie puede acceder a tus datos sin el código.</p>
        <p style="font-size:11px;color:#475569;text-align:center;margin-top:24px;">TiendaApps · tiendaapps.com</p>
      </div>
    `,
  });
}

// Formulario de contacto de la plataforma (tiendaapps.com/contacto). Vive acá y
// no en la ruta para no repetir el cliente de correo: antes /api/contacto tenía
// su propio nodemailer + SMTP de Gmail duplicado, y quedó roto igual que el
// resto cuando Google revocó la contraseña de aplicación.
export async function sendPlatformContactEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  await transporter.sendMail({
    from: `"TiendaApps Contacto" <${FROM_ADDRESS}>`,
    to: adminEmail,
    replyTo: email,
    subject: `[Contacto] ${subject || "Sin asunto"} — ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px">
        <h2 style="color:#818cf8;margin:0 0 24px">Nuevo mensaje de contacto</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;width:120px">Nombre</td><td style="padding:8px 0;font-weight:600">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Email</td><td style="padding:8px 0"><a href="mailto:${escapeHtml(email)}" style="color:#818cf8">${escapeHtml(email)}</a></td></tr>
          ${subject ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Asunto</td><td style="padding:8px 0">${escapeHtml(subject)}</td></tr>` : ""}
        </table>
        <div style="margin-top:24px;background:#1e293b;border-radius:12px;padding:20px">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Mensaje</p>
          <p style="margin:0;line-height:1.7;white-space:pre-wrap">${escapeHtml(message)}</p>
        </div>
      </div>
    `,
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   NEWSLETTER
   ═══════════════════════════════════════════════════════════════════════════

   Estos dos mails salen por MARKETING_FROM_ADDRESS, no por el remitente de
   siempre. El motivo está arriba, donde se define esa constante.

   Los dos llevan link de baja. El de confirmación también, aunque suene raro:
   si alguien escribió tu dirección sin permiso, el mail de confirmación es el
   PRIMERO que te llega — y si ahí no hay salida, la salida que te queda es el
   botón de spam.                                                              */

/** Marca visible del remitente, saneada. Un `"` o un `<` en el nombre de la
 *  tienda rompería la cabecera From. */
function nombreRemitente(storeName: string): string {
  return storeName.replace(/[<>"\r\n]/g, "").trim().slice(0, 60) || "Tienda";
}

/**
 * Envío de marketing. No usa `transporter` porque necesita dos cosas que aquel
 * no da: el remitente del subdominio de novedades y cabeceras propias.
 */
async function enviarMarketing(mail: {
  to: string;
  storeName: string;
  subject: string;
  html: string;
  /** Página con el botón de baja: la que se pone en el pie, para una persona. */
  bajaUrl: string;
  /** Endpoint que acepta POST: la que va en la cabecera, para el cliente de correo. */
  bajaPostUrl: string;
  replyTo?: string;
}) {
  const { error } = await resend.emails.send({
    from: `${nombreRemitente(mail.storeName)} <${MARKETING_FROM_ADDRESS}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    headers: cabecerasBaja(mail.bajaPostUrl),
  });
  if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
}

/**
 * Las cabeceras que hacen aparecer el "Cancelar suscripción" arriba de todo en
 * Gmail, al lado del remitente.
 *
 * Ese botón importa más que el link del pie: es el que compite con el de spam.
 * El que se cansó va a apretar el que tenga a mano, y si el único a mano es
 * "spam", eso nos cuesta reputación de dominio — que acá pagan todas las
 * tiendas.
 *
 * `List-Unsubscribe-Post` le avisa a Gmail que puede dar de baja con un POST
 * automático, sin abrir nada. Va junto con el `POST` que acepta la ruta de baja.
 */
function cabecerasBaja(bajaPostUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${bajaPostUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Pie común: quién manda, por qué le llega, y cómo salir. */
function pieNewsletter(storeName: string, bajaUrl: string, motivo: string): string {
  return `
    <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:18px;text-align:center">
      <p style="font-size:11px;color:#9ca3af;line-height:1.7;margin:0 0 8px">
        ${escapeHtml(motivo)}
      </p>
      <p style="font-size:11px;color:#9ca3af;margin:0">
        <a href="${bajaUrl}" style="color:#6b7280;text-decoration:underline">Cancelar suscripción</a>
        &nbsp;·&nbsp; ${escapeHtml(storeName)}
      </p>
    </div>`;
}

/**
 * Mail de confirmación (doble opt-in). Hasta que no toquen este botón, el
 * suscriptor no recibe ninguna campaña.
 */
export async function sendNewsletterConfirmacionEmail({
  to,
  storeName,
  confirmarUrl,
  bajaUrl,
  bajaPostUrl,
}: {
  to: string;
  storeName: string;
  confirmarUrl: string;
  bajaUrl: string;
  bajaPostUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  await enviarMarketing({
    to,
    storeName,
    bajaUrl,
    bajaPostUrl,
    subject: `Confirmá tu suscripción a ${nombreRemitente(storeName)}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff">
        <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;margin:0 0 10px;font-weight:600">${escapeHtml(storeName)}</p>
        <h1 style="font-size:21px;margin:0 0 16px;font-weight:800;letter-spacing:-.02em">Confirmá tu suscripción</h1>

        <!-- Sin guiños. Este mail existe para que la persona confíe y apriete el
             botón, y una broma acá resta — sobre todo en el caso que más importa,
             que es el de alguien que NO se suscribió y necesita entender rápido
             qué pasó. De eso se ocupa la línea de abajo, en serio. -->
        <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">
          Alguien cargó esta dirección para recibir las novedades y ofertas de
          <strong>${escapeHtml(storeName)}</strong>. Tocá el botón y quedás suscripto.
        </p>

        <div style="text-align:center;margin-bottom:24px">
          <a href="${confirmarUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;padding:14px 36px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
            Sí, quiero suscribirme
          </a>
        </div>

        <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0">
          Si no fuiste vos, no hagas nada: sin confirmar no te vamos a escribir de nuevo.
        </p>

        ${pieNewsletter(storeName, bajaUrl, "Recibís este único mail porque esta dirección se cargó en el formulario de suscripción de la tienda.")}
      </div>
    `,
  });
}

/** Una campaña, ya lista para mandarle a UN suscriptor. */
export type CampanaNewsletter = {
  storeName: string;
  /** Link al que va el botón principal. */
  storeUrl: string;
  logo?: string | null;
  title: string;
  body: string;
  /** Para que responder le llegue al dueño y no se pierda. */
  ownerEmail?: string | null;
  /**
   * El acento de la tienda. Sin esto el mail salía en blanco y negro y era
   * exactamente igual para las diez tiendas del proyecto — el suscriptor no
   * tenía forma de reconocer de quién le estaba llegando salvo leyendo.
   */
  accent?: string | null;
};

/**
 * Blanco o negro, el que se lea sobre `hex`.
 *
 * Es una copia chica de lo que hace `getContrastColor` en el editor, porque
 * aquella vive en un componente de cliente y esto corre en el servidor. La regla
 * es la misma: luminancia relativa con los coeficientes de la W3C.
 *
 * Un acento amarillo con tinta blanca encima no se lee, y en un mail no hay
 * forma de arreglarlo después de mandarlo.
 */
function tintaSobre(hex: string): string {
  const limpio = hex.replace("#", "").trim();
  const completo = limpio.length === 3 ? limpio.split("").map((c) => c + c).join("") : limpio;
  if (!/^[0-9a-f]{6}$/i.test(completo)) return "#ffffff";
  const canal = (i: number) => {
    const v = parseInt(completo.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luz = 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
  return luz > 0.45 ? "#111827" : "#ffffff";
}

/** Un color válido para CSS, o el negro de siempre si vino cualquier cosa. */
function acentoSeguro(hex?: string | null): string {
  const v = (hex ?? "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : "#111827";
}

/**
 * Manda UNA campaña a UN suscriptor.
 *
 * Es de a uno a propósito: cada destinatario necesita su propia URL de baja
 * —lleva su token— así que no hay nada que compartir entre dos mails. Quien
 * llama se encarga de la concurrencia y del cursor.
 */
export async function sendNewsletterCampanaEmail({
  to,
  bajaUrl,
  bajaPostUrl,
  campana,
}: {
  to: string;
  bajaUrl: string;
  bajaPostUrl: string;
  campana: CampanaNewsletter;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const { storeName, storeUrl, logo, title, body, ownerEmail, accent } = campana;

  const acento = acentoSeguro(accent);
  const tinta = tintaSobre(acento);

  await enviarMarketing({
    to,
    storeName,
    bajaUrl,
    bajaPostUrl,
    replyTo: ownerEmail ?? undefined,
    subject: title,
    // `table` y estilos en línea, no flexbox ni clases: Outlook y Gmail
    // descartan buena parte del CSS moderno, y lo único que se puede dar por
    // sentado en un mail es lo que anda desde hace veinte años.
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f5;padding:24px 12px">
        <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">

          <!-- Franja de la marca. Es lo que hace que el mail se vea DE esta
               tienda y no del sistema: sin ella los diez templates mandaban el
               mismo mail blanco. -->
          <div style="background:${acento};padding:22px 24px;text-align:center">
            ${logo
              ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(storeName)}" width="auto" style="max-height:52px;max-width:220px;height:auto;width:auto;display:inline-block;border:0">`
              : `<p style="font-size:17px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0;color:${tinta}">${escapeHtml(storeName)}</p>`}
          </div>

          <div style="padding:30px 28px 24px">
            <h1 style="font-size:22px;margin:0 0 14px;font-weight:800;letter-spacing:-.02em;line-height:1.35;color:#111827">${escapeHtml(title)}</h1>

            <p style="font-size:15px;color:#374151;line-height:1.75;margin:0 0 28px;white-space:pre-wrap">${escapeHtml(body)}</p>

            <div style="text-align:center">
              <a href="${storeUrl}"
                 style="display:inline-block;background:${acento};color:${tinta};padding:14px 38px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
                Ver en la tienda
              </a>
            </div>

            ${pieNewsletter(storeName, bajaUrl, `Recibís este mail porque confirmaste tu suscripción a las novedades de ${storeName}.`)}
          </div>
        </div>
      </div>
    `,
  });
}

/* ── Arrepentimiento (Resolución 424/2020) ────────────────────────────────────
 *
 * Salen DOS mails y los dos importan, por motivos distintos:
 *
 *   · A quien vende, para que se entere. Sin esto la solicitud queda esperando
 *     en una base que nadie mira, y del otro lado hay un plazo corriendo.
 *   · A quien se arrepintió, porque **la constancia es la parte que exige la
 *     resolución**. Un botón que toma el pedido y no devuelve nada deja a la
 *     persona sin con qué demostrar que lo pidió, que es justo para lo que
 *     sirve.
 *
 * Van los dos en un `Promise.allSettled` y no en cadena: si el mail a la tienda
 * falla —una casilla mal escrita, por ejemplo— la persona igual tiene que
 * recibir su constancia. El que falle se registra.
 */
export async function sendArrepentimientoEmails({
  numero,
  fecha,
  nombre,
  email,
  telefono,
  referencia,
  motivo,
  tienda,
}: {
  numero: string;
  fecha: Date;
  nombre: string;
  email: string;
  telefono?: string;
  referencia: string;
  motivo?: string;
  /** Null = la solicitud es contra TiendaApps, no contra una tienda. */
  tienda: { nombre: string; email: string } | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const cuando = fecha.toLocaleString("es-AR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const destinatario = tienda?.nombre ?? "TiendaApps";
  const paraQuienVende = tienda?.email ?? process.env.ADMIN_EMAIL;

  const datos = `
    <table style="width:100%;margin-bottom:20px;font-size:14px;">
      <tr><td style="color:#6b7280;padding:4px 0;width:120px;">Constancia</td><td style="font-weight:700;font-family:monospace;">${escapeHtml(numero)}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;">Fecha</td><td>${escapeHtml(cuando)}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;">Nombre</td><td style="font-weight:600;">${escapeHtml(nombre)}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;">Email</td><td><a href="mailto:${escapeHtml(email)}" style="color:#4f46e5;">${escapeHtml(email)}</a></td></tr>
      ${telefono ? `<tr><td style="color:#6b7280;padding:4px 0;">Teléfono</td><td>${escapeHtml(telefono)}</td></tr>` : ""}
      <tr><td style="color:#6b7280;padding:4px 0;">Su compra</td><td>${escapeHtml(referencia)}</td></tr>
    </table>
    ${motivo ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;">${escapeHtml(motivo)}</div>` : ""}
  `;

  const resultados = await Promise.allSettled([
    /* 1. A quien vende. Con `replyTo` a la persona, para que contestar el mail
       sea contestarle a ella y no haga falta copiar la dirección a mano. */
    paraQuienVende
      ? transporter.sendMail({
          from: `"TiendaApps" <${FROM_ADDRESS}>`,
          to: paraQuienVende,
          replyTo: email,
          subject: `⚠️ Arrepentimiento de compra — constancia ${numero}`,
          html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#b45309;border-radius:12px;padding:24px;margin-bottom:24px;">
          <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0 0 4px;">Solicitud de arrepentimiento</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Alguien quiere dar marcha atrás con su compra</h1>
        </div>
        <p style="color:#374151;font-size:15px;margin-bottom:20px;">
          Se recibió por el botón de arrepentimiento de <strong>${escapeHtml(destinatario)}</strong>.
        </p>
        ${datos}
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="font-size:14px;color:#92400e;margin:0;">
            <strong>Es un derecho, no un pedido de favor.</strong> La Ley 24.240 (art. 34) le da
            10 días corridos para arrepentirse sin tener que justificar por qué, y el reintegro
            va sin descuentos. Contestale cuanto antes: respondiendo este mail le escribís directo.
          </p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Este mail se generó automáticamente · TiendaApps
        </p>
      </div>
          `,
        })
      : Promise.resolve(),

    /* 2. La constancia, a quien se arrepintió. Es la parte que pide la
       resolución: sin número entregado, el botón no cumple. */
    transporter.sendMail({
      from: `"TiendaApps" <${FROM_ADDRESS}>`,
      to: email,
      subject: `Tu constancia de arrepentimiento — ${numero}`,
      html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#4f46e5;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0 0 8px;">Constancia de arrepentimiento</p>
          <p style="color:#fff;font-size:28px;margin:0;font-weight:800;font-family:monospace;letter-spacing:2px;">${escapeHtml(numero)}</p>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:20px;">
          Recibimos tu solicitud de arrepentimiento sobre tu compra en
          <strong>${escapeHtml(destinatario)}</strong>. Guardá este número: es la constancia de
          que la pediste, y con qué fecha.
        </p>

        ${datos}

        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="font-size:14px;color:#075985;margin:0 0 8px;"><strong>Qué pasa ahora</strong></p>
          <p style="font-size:14px;color:#075985;margin:0;line-height:1.6;">
            Le avisamos a ${escapeHtml(destinatario)} y se va a comunicar con vos para resolverlo.
            La Ley 24.240 te da 10 días corridos para arrepentirte sin justificar el motivo, y el
            reintegro va sin descuentos.
          </p>
        </div>

        <p style="color:#6b7280;font-size:13px;line-height:1.6;">
          Si no tenés respuesta, podés reclamar sin cargo y sin abogado ante Defensa del
          Consumidor de tu provincia —
          <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" style="color:#4f46e5;">argentina.gob.ar/defensadelconsumidor</a>.
          Llevá este número.
        </p>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Este mail se generó automáticamente · TiendaApps
        </p>
      </div>
      `,
    }),
  ]);

  /* Se registra cuál falló y cuál no. Si el que no salió es el de la constancia,
     la persona se quedó sin su comprobante y hay que mandárselo a mano: eso
     tiene que quedar escrito en algún lado, no perderse en un catch mudo. */
  const nombres = ["aviso a quien vende", "constancia a quien compró"];
  resultados.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[arrepentimiento] ${numero}: no salió el ${nombres[i]}:`, r.reason);
    }
  });
}
