import nodemailer from "nodemailer";

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0);

  const rows = products
    .map((p) => {
      const badge = p.stock === 0
        ? `<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:700;">Sin stock</span>`
        : `<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:700;">${p.stock} u.</span>`;
      return `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 16px;font-size:14px;color:#111827;">${p.name}</td>
          <td style="padding:10px 16px;font-size:14px;color:#6b7280;">${p.variant}</td>
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
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
    to: ownerEmail,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 4px;">Tu tienda · ${storeName}</p>
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const productLinks = products
    .map(
      (p) =>
        `<a href="${appUrl}/tienda/${storeSlug}?producto=${p.id}"
           style="display:block;padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6366f1;text-decoration:none;">
          ⭐ Dejar reseña de <strong>${p.name}</strong>
        </a>`
    )
    .join("");

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
    to: buyerEmail,
    subject: `¿Cómo te fue con tu compra en ${storeName}?`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 4px;">${storeName}</p>
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const dashboardUrl = `${appUrl}/afiliados`;

  const content = {
    APPROVED: {
      subject: `Ya podés vender para ${storeName}`,
      title: "Afiliación aprobada",
      body: `Tu solicitud para vender en <strong>${storeName}</strong> fue aprobada. Ya podés entrar a tu panel, copiar tu link y empezar a compartir productos.`,
      accent: "#16a34a",
      cta: "Ir a mi panel",
      ctaUrl: dashboardUrl,
    },
    PAUSED: {
      subject: `Tu afiliación en ${storeName} fue pausada`,
      title: "Afiliación pausada",
      body: `La tienda <strong>${storeName}</strong> pausó temporalmente tu acceso como afiliado. Tu link deja de estar activo hasta que te reactiven.`,
      accent: "#6b7280",
      cta: "Ver mi estado",
      ctaUrl: dashboardUrl,
    },
    REMOVED: {
      subject: `Tu afiliación en ${storeName} fue dada de baja`,
      title: "Afiliación dada de baja",
      body: `La tienda <strong>${storeName}</strong> dio de baja tu afiliación. Tu link ya no está activo. Si vuelven a habilitarte o querés postularte otra vez, vas a verlo desde tu panel.`,
      accent: "#dc2626",
      cta: "Abrir mi panel",
      ctaUrl: dashboardUrl,
    },
    REJECTED: {
      subject: `Tu solicitud en ${storeName} no fue aprobada`,
      title: "Solicitud rechazada",
      body: `La tienda <strong>${storeName}</strong> no aprobó tu solicitud por ahora. Podés seguir explorando otras tiendas o volver a revisar tu panel más adelante.`,
      accent: "#dc2626",
      cta: "Explorar tiendas",
      ctaUrl: `${appUrl}/afiliados`,
    },
  }[status];

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
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
          Estado de tu afiliación en ${storeName} · tienda/${storeSlug}
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const dashboardUrl = `${appUrl}/dashboard/vendedoras`;

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
    to: ownerEmail,
    subject: `Nueva solicitud de afiliada en ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Nueva solicitud de afiliada</h1>
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
          Panel de afiliados de ${storeName}
        </p>
      </div>
    `,
  });
}

export async function sendCommissionEarnedEmail({
  affiliateEmail,
  affiliateName,
  storeName,
  storeSlug,
  commissionAmount,
  orderTotal,
  commissionRate,
  newBalance,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
  storeSlug: string;
  commissionAmount: number;
  orderTotal: number;
  commissionRate: number;
  newBalance: number;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
    to: affiliateEmail,
    subject: `💰 Ganaste ${fmt(commissionAmount)} de comisión en ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#16a34a;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">¡Comisión acreditada!</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(affiliateName) || "afiliada"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          Una venta que generaste en <strong>${escapeHtml(storeName)}</strong> fue confirmada y tu comisión ya está en tu billetera.
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
            <span style="font-size:14px;color:#6b7280;">Saldo en billetera</span>
            <span style="font-size:14px;font-weight:700;color:#111827;">${fmt(newBalance)}</span>
          </div>
        </div>

        <div style="text-align:center;">
          <a href="${appUrl}/afiliados/billetera"
             style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            Ver mi billetera
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Podés solicitar un retiro cuando quieras desde tu billetera · ${storeName}
        </p>
      </div>
    `,
  });
}

export async function sendOrderConfirmationEmail({
  buyerEmail,
  buyerName,
  orderId,
  storeName,
  storeSlug,
  items,
  subtotal,
  discountAmount,
  shippingCost,
  shippingMethod,
  total,
}: {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  storeName: string;
  storeSlug: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  shippingMethod: string;
  total: number;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  const itemRows = items
    .map(
      (item) => `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 16px;font-size:14px;color:#111827;">${item.name}</td>
          <td style="padding:10px 16px;font-size:14px;color:#6b7280;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 16px;font-size:14px;color:#111827;text-align:right;">${fmt(item.price * item.quantity)}</td>
        </tr>`
    )
    .join("");

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
    to: buyerEmail,
    subject: `Tu pedido en ${storeName} fue recibido`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 4px;">${storeName}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">¡Tu pedido fue recibido!</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:4px;">Hola <strong>${escapeHtml(buyerName)}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          Gracias por tu compra en <strong>${escapeHtml(storeName)}</strong>. El vendedor revisará tu pedido y se pondrá en contacto para coordinar el pago y el envío.
        </p>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Producto</th>
                <th style="padding:10px 16px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Cant.</th>
                <th style="padding:10px 16px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>

        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:14px;color:#6b7280;">Subtotal</span>
            <span style="font-size:14px;color:#111827;">${fmt(subtotal)}</span>
          </div>
          ${discountAmount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:14px;color:#16a34a;">Descuento</span>
            <span style="font-size:14px;color:#16a34a;">−${fmt(discountAmount)}</span>
          </div>` : ""}
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:14px;color:#6b7280;">Envío (${shippingMethod})</span>
            <span style="font-size:14px;color:#111827;">${shippingCost === 0 ? "Gratis" : fmt(shippingCost)}</span>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0;" />
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:15px;font-weight:700;color:#111827;">Total</span>
            <span style="font-size:16px;font-weight:800;color:#6366f1;">${fmt(total)}</span>
          </div>
        </div>

        <div style="text-align:center;margin-bottom:24px;">
          <a href="${appUrl}/mi-cuenta"
             style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            Ver mis pedidos
          </a>
        </div>

        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:13px;color:#92400e;margin-bottom:20px;">
          <strong>Tus derechos como consumidor:</strong> Según la Ley 24.240, tenés derecho a solicitar cambio o devolución dentro de los 10 días corridos si el producto no coincide con lo publicado. Podés contactar a la tienda desde esta página o enviando un email a soporte.
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          Número de pedido: <strong>${orderId.slice(-8).toUpperCase()}</strong> · ${storeName}
        </p>
      </div>
    `,
  });
}

export async function sendAffiliateOrderNotificationEmail({
  ownerEmail,
  ownerName,
  storeName,
  affiliateName,
  affiliateEmail,
  orderTotal,
  commissionAmount,
  commissionRate,
  itemCount,
}: {
  ownerEmail: string;
  ownerName: string;
  storeName: string;
  affiliateName: string;
  affiliateEmail: string;
  orderTotal: number;
  commissionAmount: number;
  commissionRate: number;
  itemCount: number;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
    to: ownerEmail,
    subject: `🛍️ Nueva venta por afiliada en ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Nueva venta por afiliada</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(ownerName) || "titular"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          <strong>${escapeHtml(affiliateName)}</strong> generó una nueva venta en tu tienda. Confirmá el pago para que la comisión se acredite automáticamente.
        </p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Afiliada</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${escapeHtml(affiliateName)} <span style="color:#9ca3af;font-weight:400;">(${escapeHtml(affiliateEmail)})</span></span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Productos</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${itemCount} ítem${itemCount !== 1 ? "s" : ""}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Total del pedido</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${fmt(orderTotal)}</span>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:14px;color:#6b7280;">Comisión a pagar (${commissionRate}%)</span>
            <span style="font-size:14px;font-weight:700;color:#6366f1;">${fmt(commissionAmount)}</span>
          </div>
        </div>

        <div style="text-align:center;">
          <a href="${appUrl}/dashboard/pedidos"
             style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            Ver pedido y confirmar pago
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          La comisión se acredita automáticamente al confirmar el pago del pedido.
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const bankRows = [
    bankHolder ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Titular</td><td style="padding:6px 0;font-weight:600;color:#111827;font-size:14px;">${escapeHtml(bankHolder)}</td></tr>` : "",
    cuil ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">CUIL</td><td style="padding:6px 0;font-weight:600;color:#111827;font-size:14px;">${escapeHtml(cuil)}</td></tr>` : "",
    cbu ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">CBU / CVU</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:14px;font-family:monospace;">${escapeHtml(cbu)}</td></tr>` : "",
    alias ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Alias</td><td style="padding:6px 0;font-weight:700;color:#111827;font-size:14px;font-family:monospace;">${escapeHtml(alias)}</td></tr>` : "",
  ].filter(Boolean).join("");

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
    to: ownerEmail,
    subject: `💸 ${affiliateName} solicitó un retiro de ${fmt(amount)} — ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#f59e0b;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(0,0,0,0.6);font-size:13px;margin:0 0 4px;">${storeName}</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">Solicitud de retiro</h1>
          <p style="color:#fff;font-size:32px;font-weight:900;margin:8px 0 0;">${fmt(amount)}</p>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(ownerName) || "titular"}</strong>,</p>
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
          La afiliada ya ve su retiro como "en proceso". Una vez que realices la transferencia, el pago está completo. Si tenés algún inconveniente, contactá a soporte de TiendaApps.
        </p>
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
    to: affiliateEmail,
    subject: `La tienda ${escapeHtml(storeName)} pausó su actividad temporalmente`,
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

export async function sendNewStorePublishedEmail({
  affiliateEmail,
  affiliateName,
  storeName,
  storeSlug,
  commissionRate,
}: {
  affiliateEmail: string;
  affiliateName: string;
  storeName: string;
  storeSlug: string;
  commissionRate: number;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const storeUrl = `${appUrl}/afiliados`;

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
    to: affiliateEmail,
    subject: `Nueva tienda disponible: ${escapeHtml(storeName)} — postulate ahora`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#6366f1;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 4px;">TiendaApps · Programa de Afiliadas</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Nueva tienda disponible</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${escapeHtml(affiliateName) || "afiliada"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          La tienda <strong>${escapeHtml(storeName)}</strong> acaba de abrir su programa de afiliadas.
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
