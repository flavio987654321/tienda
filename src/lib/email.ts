import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${ownerName}</strong>,</p>
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

        <p style="color:#374151;font-size:15px;margin-bottom:8px;">Hola <strong>${buyerName || "compradora"}</strong>,</p>
        <p style="color:#374151;font-size:15px;margin-bottom:24px;">
          Esperamos que hayas quedado contenta con tu compra en <strong>${storeName}</strong>.
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
