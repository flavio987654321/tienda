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

export async function sendNewReviewToOwnerEmail({
  ownerEmail,
  storeName,
  storeSlug,
  productId,
  productName,
  reviewerName,
  rating,
  comment,
}: {
  ownerEmail: string;
  storeName: string;
  storeSlug: string;
  productId: string;
  productName: string;
  reviewerName: string;
  rating: number;
  comment?: string | null;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const productUrl = `${appUrl}/tienda/${storeSlug}/producto/${productId}`;
  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
    to: ownerEmail,
    subject: `Nueva reseña (${rating}★) en ${storeName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#ffffff;">
        <div style="background:#111827;border-radius:16px;padding:28px;margin-bottom:24px;">
          <p style="color:#9ca3af;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;font-weight:600;">${escapeHtml(storeName)}</p>
          <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:800;letter-spacing:-0.02em;">Nueva reseña recibida</h1>
        </div>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Producto</p>
          <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 14px;">${escapeHtml(productName)}</p>
          <p style="font-size:18px;margin:0 0 10px;">${stars}</p>
          ${comment ? `<p style="font-size:14px;color:#374151;line-height:1.6;margin:0;white-space:pre-wrap;">"${escapeHtml(comment)}"</p>` : ""}
          <p style="font-size:12px;color:#9ca3af;margin:14px 0 0;">— ${escapeHtml(reviewerName)}</p>
        </div>

        <div style="text-align:center;margin-bottom:24px;">
          <a href="${productUrl}"
             style="display:inline-block;background:#111827;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ver la reseña en mi tienda
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
          Podés solicitar un retiro cuando quieras desde tu panel de comisiones · ${storeName}
        </p>
      </div>
    `,
  });
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

function buildPoliciesBlock(policies?: { returns?: string; shipping?: string; terms?: string } | null): string {
  if (!policies) return "";
  const items: string[] = [];
  if (policies.returns?.trim()) items.push(`<li style="margin-bottom:4px;"><strong>Devoluciones:</strong> ${escapeHtml(policies.returns.slice(0, 300))}${policies.returns.length > 300 ? "…" : ""}</li>`);
  if (policies.shipping?.trim()) items.push(`<li style="margin-bottom:4px;"><strong>Envíos:</strong> ${escapeHtml(policies.shipping.slice(0, 300))}${policies.shipping.length > 300 ? "…" : ""}</li>`);
  if (policies.terms?.trim()) items.push(`<li style="margin-bottom:4px;"><strong>Términos:</strong> ${escapeHtml(policies.terms.slice(0, 300))}${policies.terms.length > 300 ? "…" : ""}</li>`);
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
  promoType,
  promoQtyMin,
  promoPayQty,
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
  items: { name: string; variant?: string | null; quantity: number; price: number; offerPrice?: number | null; comparePrice?: number | null }[];
  subtotal: number;
  promoSavings?: number;
  promoType?: string | null;
  promoQtyMin?: number | null;
  promoPayQty?: number | null;
  discountAmount: number;
  couponCode?: string | null;
  shippingCost: number;
  shippingMethod: string;
  total: number;
  paymentInfo?: {
    transferencia?: { enabled?: boolean; titular?: string; cbu?: string; cvu?: string; alias?: string; banco?: string; cuil?: string; instrucciones?: string };
    efectivo?: { enabled?: boolean; instrucciones?: string };
  } | null;
  policies?: { returns?: string; shipping?: string; terms?: string } | null;
  ownerContact?: { name: string | null; email: string | null; phone: string | null } | null;
  paymentProvider?: string | null;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

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
            ${fmt(item.price * item.quantity)}
          </td>
        </tr>`;
    })
    .join("");

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
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
          ${promoSavings && promoSavings > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">${promoType === "N_PAY_M" && promoQtyMin && promoPayQty ? `🎉 Llevá ${promoQtyMin} pagá ${promoPayQty}` : "🎉 Ahorro por promo cantidad"}</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(promoSavings)} incluidos</span>
          </div>` : ""}
          ${discountAmount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:${couponCode ? "4px" : "10px"};">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">Cupón${couponCode ? "" : " aplicado"}</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(discountAmount)}</span>
          </div>
          ${couponCode ? `<div style="text-align:right;margin-bottom:10px;"><span style="font-size:11px;font-family:monospace;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;color:#15803d;font-weight:700;letter-spacing:0.08em;">${escapeHtml(couponCode)}</span></div>` : ""}` : ""}
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Costo de envío</span>
            <span style="font-size:14px;color:#374151;">${shippingCost === 0 ? "Sin cargo" : fmt(shippingCost)}</span>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:14px;">${escapeHtml(shippingMethod)}</div>
          <div style="border-top:1px solid #e5e7eb;padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;font-weight:700;color:#111827;">Total</span>
            <span style="font-size:20px;font-weight:800;color:#111827;">${fmt(total)}</span>
          </div>
        </div>

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
  promoType,
  promoQtyMin,
  promoPayQty,
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
  items: { name: string; variant?: string | null; quantity: number; price: number; offerPrice?: number | null; comparePrice?: number | null }[];
  subtotal: number;
  promoSavings?: number;
  promoType?: string | null;
  promoQtyMin?: number | null;
  promoPayQty?: number | null;
  discountAmount: number;
  couponCode?: string | null;
  shippingCost: number;
  shippingMethod: string;
  total: number;
  paymentProvider?: string | null;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

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
            ${fmt(item.price * item.quantity)}
          </td>
        </tr>`;
    })
    .join("");

  const addressParts = [customer.street, customer.city, customer.province].filter(Boolean);
  const addressLine = addressParts.length > 0 ? escapeHtml(addressParts.join(", ")) : null;

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
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
          ${promoSavings && promoSavings > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">${promoType === "N_PAY_M" && promoQtyMin && promoPayQty ? `Llevá ${promoQtyMin} pagá ${promoPayQty}` : "Ahorro promo cantidad"}</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(promoSavings)} incluidos</span>
          </div>` : ""}
          ${discountAmount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:${couponCode ? "4px" : "10px"};">
            <span style="font-size:14px;color:#16a34a;font-weight:600;">Cupón${couponCode ? "" : " aplicado"}</span>
            <span style="font-size:14px;color:#16a34a;font-weight:600;">− ${fmt(discountAmount)}</span>
          </div>
          ${couponCode ? `<div style="text-align:right;margin-bottom:10px;"><span style="font-size:11px;font-family:monospace;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 8px;color:#15803d;font-weight:700;letter-spacing:0.08em;">${escapeHtml(couponCode)}</span></div>` : ""}` : ""}
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:14px;color:#6b7280;">Envío</span>
            <span style="font-size:14px;color:#374151;">${shippingCost === 0 ? "Sin cargo" : fmt(shippingCost)}</span>
          </div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:14px;">${escapeHtml(shippingMethod)}</div>
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const shortId = orderId.slice(-8).toUpperCase();

  const productList = items
    .map((i) => `<li style="margin-bottom:4px;font-size:14px;color:#374151;">
      <strong>${escapeHtml(i.name)}</strong>${i.variant ? ` — ${escapeHtml(i.variant)}` : ""} × ${i.quantity}
    </li>`)
    .join("");

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
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
          La afiliada ya ve su retiro como "en proceso". Una vez que realices la transferencia, el pago está completo. Si tenés algún inconveniente, contactá a soporte de TiendaApps.
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const isUrgent = daysOld >= 15;

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
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
          ${isUrgent ? "Este es un recordatorio urgente — la afiliada está esperando hace más de 2 semanas." : "Por favor procesalo cuando puedas."}
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
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
        <p style="color:#6b7280;font-size:13px;">Si no recibís el dinero en 48hs hábiles, escribinos a soporte desde tu panel de afiliada.</p>
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
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
}: {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  storeName: string;
  storeSlug: string;
  total: number;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const shortId = orderId.slice(-8).toUpperCase();
  const storeUrl = `${appUrl}/tienda/${storeSlug}`;

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
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
        </p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px 20px;margin-bottom:28px;text-align:center;">
          <p style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Total confirmado</p>
          <p style="font-size:28px;font-weight:900;color:#16a34a;margin:0;">$${total.toLocaleString("es-AR")}</p>
        </div>

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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const shortId = orderId.slice(-8).toUpperCase();

  const contactBlock = ownerContact?.email || ownerContact?.phone ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Contactar a la tienda</p>
      ${ownerContact.email ? `<p style="margin:0 0 4px;font-size:14px;">📧 <a href="mailto:${escapeHtml(ownerContact.email)}" style="color:#6366f1;">${escapeHtml(ownerContact.email)}</a></p>` : ""}
      ${ownerContact.phone ? `<p style="margin:0;font-size:14px;">📱 ${escapeHtml(ownerContact.phone)}</p>` : ""}
    </div>` : "";

  await transporter.sendMail({
    from: `"${storeName}" <${process.env.SMTP_USER}>`,
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const storeUrl = `${appUrl}/afiliados`;

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
    to: affiliateEmail,
    subject: `Nueva tienda disponible: ${storeName} — postulate ahora`,
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

export async function sendMpDisconnectedEmail({
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
    subject: `El programa de afiliadas de ${storeName} está pausado`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;">
        <div style="background:#f59e0b;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(0,0,0,0.5);font-size:13px;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Programa pausado temporalmente</h1>
        </div>

        <p style="color:#374151;font-size:15px;margin-bottom:16px;">Hola <strong>${escapeHtml(affiliateName) || "afiliada"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          La tienda <strong>${escapeHtml(storeName)}</strong> desconectó su cuenta de MercadoPago,
          por lo que el programa de afiliadas está pausado temporalmente.
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
          TiendaApps · Programa de Afiliadas
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  const actionItems = actions.map(a => `<li>${escapeHtml(a)}</li>`).join("");
  await transporter.sendMail({
    from: `"TiendaApps Alerta" <${process.env.SMTP_USER}>`,
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: `"TiendaApps Alerta" <${process.env.SMTP_USER}>`,
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  const results = await Promise.allSettled(
    recipients.map((to) =>
      transporter.sendMail({
        from: `"TiendaApps" <${process.env.SMTP_USER}>`,
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
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  const direction = newRate < oldRate ? "bajó" : "subió";
  const color = newRate < oldRate ? "#dc2626" : "#16a34a";

  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
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

export async function sendOtpEmail({
  to,
  name,
  code,
}: {
  to: string;
  name: string | null;
  code: string;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  await transporter.sendMail({
    from: `"TiendaApps" <${process.env.SMTP_USER}>`,
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
