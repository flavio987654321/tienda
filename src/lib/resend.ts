import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "no-key");

const FROM = process.env.RESEND_FROM ?? "TiendaApps <noreply@tiendaapps.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const CANASTA_SUPPORT_EMAIL = process.env.CANASTA_SUPPORT_EMAIL ?? process.env.ADMIN_EMAIL ?? "";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationReceivedEmail({
  to,
  userName,
}: {
  to: string;
  userName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Recibimos tu solicitud de verificación",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#6366f1;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#c7d2fe;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Solicitud recibida</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${userName || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Recibimos tus documentos de verificación de identidad. Nuestro equipo los revisará en las próximas <strong>24 a 48 horas</strong> y te notificaremos el resultado por este mismo correo.
        </p>
        <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:14px;color:#4338ca;margin:0;font-weight:600;">¿Qué pasa mientras tanto?</p>
          <p style="font-size:14px;color:#374151;margin:8px 0 0;">Tu tienda sigue funcionando con normalidad. Al aprobar tu identidad, aparecerá un badge azul de verificación visible para tus clientes.</p>
        </div>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${APP_URL}/dashboard/perfil"
             style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ver estado en mi perfil
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          Si tenés dudas escribinos a soporte@tiendaapps.com
        </p>
      </div>
    `,
  });
}

export async function sendVerificationApprovedEmail({
  to,
  userName,
}: {
  to: string;
  userName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "¡Tu identidad fue verificada en TiendaApps!",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#2563eb;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#bfdbfe;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">✓ Identidad verificada</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${userName || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          ¡Buenas noticias! Tu identidad fue verificada exitosamente. Tu tienda ahora muestra el <strong>badge azul de verificación</strong> que genera confianza en tus clientes.
        </p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:14px;color:#1d4ed8;margin:0;font-weight:600;">¿Qué hacer ahora?</p>
          <p style="font-size:14px;color:#374151;margin:8px 0 0;">Entrá a tu perfil y activá los toggles de los datos que querés mostrar cuando alguien hace click en el badge (nombre, ciudad, teléfono, fecha de ingreso).</p>
        </div>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${APP_URL}/dashboard/perfil"
             style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Configurar mi badge verificado
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          TiendaApps — tu tienda online profesional
        </p>
      </div>
    `,
  });
}

export async function sendVerificationRejectedEmail({
  to,
  userName,
  reason,
}: {
  to: string;
  userName: string;
  reason: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Actualización sobre tu solicitud de verificación",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#6b7280;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#e5e7eb;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Verificación no aprobada</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Revisamos tus documentos pero no pudimos completar la verificación. Te contamos el motivo para que puedas reenviarlos corregidos.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#991b1b;margin:0 0 8px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">Motivo del rechazo</p>
          <p style="font-size:15px;color:#374151;margin:0;">${escapeHtml(reason)}</p>
        </div>
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          Podés volver a enviar tus documentos desde tu perfil en cualquier momento. Si tenés dudas sobre qué imágenes subir, escribinos.
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${APP_URL}/dashboard/perfil"
             style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Reenviar documentos
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          Si creés que fue un error, escribinos a soporte@tiendaapps.com
        </p>
      </div>
    `,
  });
}

export async function sendVerificationRevokedEmail({
  to,
  userName,
  reason,
}: {
  to: string;
  userName: string;
  reason: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu verificación fue revocada en TiendaApps",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#991b1b;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#fecaca;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Badge de verificación revocado</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          El equipo de TiendaApps revisó tu cuenta y decidió revocar el badge azul de verificación. El badge ya no aparecerá en tu tienda ni en tu perfil.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#991b1b;margin:0 0 8px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">Motivo</p>
          <p style="font-size:15px;color:#374151;margin:0;">${escapeHtml(reason)}</p>
        </div>
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          Si creés que esta decisión fue un error o querés más información, escribinos a <a href="mailto:soporte@tiendaapps.com" style="color:#6366f1;">soporte@tiendaapps.com</a> con el asunto <em>"Revocación de verificación"</em>.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          TiendaApps — tu tienda online profesional
        </p>
      </div>
    `,
  });
}

export async function sendVerificationBannedEmail({
  to,
  userName,
  reason,
}: {
  to: string;
  userName: string;
  reason: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu cuenta fue inhabilitada para verificación en TiendaApps",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#1f2937;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#9ca3af;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Cuenta inhabilitada para verificación</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          El equipo de TiendaApps detectó una irregularidad grave en tu solicitud de verificación de identidad. Como resultado, tu cuenta fue <strong>inhabilitada permanentemente</strong> para enviar nuevas solicitudes de verificación y tu badge fue removido.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#991b1b;margin:0 0 8px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">Motivo</p>
          <p style="font-size:15px;color:#374151;margin:0;">${escapeHtml(reason)}</p>
        </div>
        <p style="font-size:14px;color:#6b7280;margin-bottom:8px;">
          Tu tienda puede seguir operando con normalidad, pero no podrás obtener el badge de identidad verificada.
        </p>
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          Si creés que fue un error podés escribirnos a <a href="mailto:soporte@tiendaapps.com" style="color:#6366f1;">soporte@tiendaapps.com</a> con el asunto <em>"Impugnar inhabilitación de verificación"</em>.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          TiendaApps — tu tienda online profesional
        </p>
      </div>
    `,
  });
}

export async function sendVerificationNewRequestAdminEmail({
  ownerName,
  ownerEmail,
}: {
  ownerName: string;
  ownerEmail: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to: "marketplacemitienda@gmail.com",
    subject: `Nueva solicitud de verificación — ${ownerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#f59e0b;border-radius:16px;padding:28px 24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(0,0,0,0.6);font-size:13px;margin:0 0 4px;font-weight:500;">TiendaApps Admin</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">Nueva verificación pendiente</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:20px;">
          <strong>${ownerName}</strong> (${ownerEmail}) envió una solicitud de verificación de identidad.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${APP_URL}/admin/verificaciones"
             style="display:inline-block;background:#f59e0b;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Revisar ahora
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">Panel admin · TiendaApps</p>
      </div>
    `,
  });
}

export async function sendStoreReportAdminEmail({
  storeName,
  storeSlug,
  reason,
  description,
  reporterEmail,
}: {
  storeName: string;
  storeSlug: string;
  reason: string;
  description?: string;
  reporterEmail?: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to: "marketplacemitienda@gmail.com",
    subject: `Nueva denuncia recibida — ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#dc2626;border-radius:16px;padding:28px 24px;margin-bottom:24px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:0 0 4px;font-weight:500;">TiendaApps Admin</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">⚠️ Nueva denuncia recibida</h1>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="font-size:13px;color:#991b1b;margin:0 0 4px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">Tienda denunciada</p>
          <p style="font-size:16px;font-weight:700;color:#111827;margin:0 0 4px;">${storeName}</p>
          <p style="font-size:13px;color:#6b7280;margin:0;">tiendaapps.com/tienda/${storeSlug}</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="font-size:13px;color:#374151;margin:0 0 6px;font-weight:600;">Motivo: <span style="color:#dc2626;">${reason}</span></p>
          ${description ? `<p style="font-size:14px;color:#374151;margin:8px 0 0;">${description}</p>` : ""}
          ${reporterEmail ? `<p style="font-size:13px;color:#6b7280;margin:10px 0 0;">Reportado por: ${reporterEmail}</p>` : ""}
        </div>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${APP_URL}/admin/denuncias"
             style="display:inline-block;background:#dc2626;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ver en el panel
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">Panel admin · TiendaApps</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({
  to,
  resetLink,
}: {
  to: string;
  resetLink: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Recuperá tu contraseña — TiendaApps",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#6366f1;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#c7d2fe;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Recuperá tu contraseña</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          Hacé click en el botón de abajo para crear una nueva contraseña.
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${resetLink}"
             style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Restablecer contraseña
          </a>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="font-size:13px;color:#6b7280;margin:0;">
            Este link es válido por <strong>24 horas</strong>. Si no solicitaste este cambio, podés ignorar este email — tu contraseña no se modificará.
          </p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          TiendaApps · soporte@tiendaapps.com
        </p>
      </div>
    `,
  });
}

export async function sendSubscriptionConfirmationEmail({
  to,
  userName,
  planLabel,
  billingLabel,
  amount,
  periodEnd,
}: {
  to: string;
  userName: string;
  planLabel: string;
  billingLabel: string;
  amount: number;
  periodEnd: Date;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const nextRenewal = periodEnd.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Tu suscripción en TiendaApps está activa",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#6366f1;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#c7d2fe;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:24px;margin:0;font-weight:800;">¡Suscripción confirmada!</h1>
        </div>

        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${userName || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:28px;">
          Tu suscripción está activa. Ya podés usar todas las herramientas de tu tienda sin límites.
        </p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:28px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Plan</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${planLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Facturación</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${billingLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="font-size:14px;color:#6b7280;">Monto pagado</span>
            <span style="font-size:14px;font-weight:700;color:#6366f1;">${fmt(amount)}</span>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:14px;color:#6b7280;">Próxima renovación</span>
            <span style="font-size:14px;font-weight:600;color:#111827;">${nextRenewal}</span>
          </div>
        </div>

        <div style="text-align:center;margin-bottom:28px;">
          <a href="${APP_URL}/dashboard"
             style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ir a mi panel
          </a>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
          Si tenés alguna duda escribinos a soporte@tiendaapps.com
        </p>
      </div>
    `,
  });
}

// ───────────────── Canasta Solidaria ─────────────────

export async function sendAbandonedCartEmail({
  to,
  customerName,
  storeName,
  items,
  total,
  recoveryUrl,
}: {
  to: string;
  customerName?: string | null;
  storeName: string;
  items: { name: string; qty: number; price: number; image?: string | null }[];
  total: number;
  recoveryUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const itemsHtml = items
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;">${escapeHtml(i.name)} ${i.qty > 1 ? `<span style="color:#9ca3af;">x${i.qty}</span>` : ""}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;font-size:14px;font-weight:600;">${fmt(i.price * i.qty)}</td>
        </tr>
      `
    )
    .join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Te olvidaste algo en ${storeName} 🛒`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#6366f1;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#c7d2fe;font-size:13px;margin:0 0 6px;font-weight:500;">${escapeHtml(storeName)}</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Tu carrito te está esperando</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Hola <strong>${escapeHtml(customerName || "")}</strong>, dejaste estos productos en tu carrito. Todavía podés completar tu compra.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          ${itemsHtml}
        </table>
        <div style="display:flex;justify-content:space-between;padding:12px 0;margin-bottom:24px;border-top:2px solid #111827;">
          <span style="font-size:15px;font-weight:700;color:#111827;">Total</span>
          <span style="font-size:15px;font-weight:700;color:#111827;">${fmt(total)}</span>
        </div>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${recoveryUrl}"
             style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Completar mi compra
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          Si ya no te interesa, podés ignorar este mensaje.
        </p>
      </div>
    `,
  });
}

export async function sendCanastaCompletedAdminEmail({
  to,
  campaignName,
  totalRaised,
  goalAmount,
  campaignType = "CANASTA",
}: {
  to: string;
  campaignName: string;
  totalRaised: number;
  goalAmount: number;
  campaignType?: "CANASTA" | "LIBRE";
}) {
  if (!process.env.RESEND_API_KEY) return;
  const label = campaignType === "LIBRE" ? "Causa Libre" : "Canasta Solidaria";
  await resend.emails.send({
    from: FROM,
    to,
    subject: `¡Se completó la meta de ${campaignName}!`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#d97706;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#fde68a;font-size:13px;margin:0 0 6px;font-weight:500;">${label}</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">¡Se completó la meta!</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;"><strong>${campaignName}</strong> llegó a su meta.</p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:14px;color:#92400e;margin:0;font-weight:600;">Total recaudado: ${fmt(totalRaised)} de ${fmt(goalAmount)}</p>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">Ya podés elegir a quién se le entrega y confirmar la entrega desde el panel.</p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${APP_URL}/admin/canasta"
             style="display:inline-block;background:#d97706;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ir al panel
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendCanastaDonationConfirmedEmail({
  to,
  donorName,
  amount,
  campaignName,
  campaignUrl,
  campaignType = "CANASTA",
}: {
  to: string;
  donorName: string;
  amount: number;
  campaignName: string;
  campaignUrl: string;
  campaignType?: "CANASTA" | "LIBRE";
}) {
  if (!process.env.RESEND_API_KEY) return;
  const label = campaignType === "LIBRE" ? "Causa Libre" : "Canasta Solidaria";
  const bodyText =
    campaignType === "LIBRE"
      ? `Tu donación de <strong>${fmt(amount)}</strong> a la <strong>${campaignName}</strong> ya está registrada. Nuestro equipo se encarga de hacerla llegar. Si querés ver cómo sigue, podés entrar a la página de la causa cuando quieras.`
      : `Tu donación de <strong>${fmt(amount)}</strong> a la <strong>${campaignName}</strong> ya está registrada. Cuando se complete la meta, nuestro equipo elige a la familia que la recibe. Si querés ver cómo sigue, podés entrar a la página de la campaña cuando quieras.`;
  const closingText =
    campaignType === "LIBRE"
      ? "Gracias a aportes como el tuyo, alguien va a recibir una ayuda real. No es solo plata: es una forma concreta de decirle a alguien que no está solo. ¡Gracias por ser parte! 💛"
      : "Gracias a aportes como el tuyo, hoy un vecino va a tener una canasta completa en su mesa. No es solo plata: es una forma concreta de decirle a alguien que no está solo. ¡Gracias por ser parte! 💛";
  await resend.emails.send({
    from: FROM,
    to,
    replyTo: CANASTA_SUPPORT_EMAIL || undefined,
    subject: `Gracias por tu donación a ${label}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#d97706;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#fde68a;font-size:13px;margin:0 0 6px;font-weight:500;">${label}</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">¡Gracias por donar!</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${donorName}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:16px;">
          ${bodyText}
        </p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          ${closingText}
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${campaignUrl}"
             style="display:inline-block;background:#d97706;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ver la campaña
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          Esta donación es voluntaria y no reembolsable. No te vamos a mandar más correos sobre esta donación — para ver novedades, entrá a la campaña cuando quieras.
        </p>
      </div>
    `,
  });
}

export async function sendCanastaAnnouncementEmail({
  to,
  donorName,
  campaignName,
  message,
  campaignUrl,
  campaignType = "CANASTA",
}: {
  to: string;
  donorName: string;
  campaignName: string;
  message: string;
  campaignUrl?: string;
  campaignType?: "CANASTA" | "LIBRE";
}) {
  if (!process.env.RESEND_API_KEY) return;
  const label = campaignType === "LIBRE" ? "Causa Libre" : "Canasta Solidaria";
  await resend.emails.send({
    from: FROM,
    to,
    replyTo: CANASTA_SUPPORT_EMAIL || undefined,
    subject: `Novedades de la ${campaignName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#d97706;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#fde68a;font-size:13px;margin:0 0 6px;font-weight:500;">${label}</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">${campaignName}</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${donorName}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;white-space:pre-line;">${message}</p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${campaignUrl || `${APP_URL}/comunidad/campana`}"
             style="display:inline-block;background:#d97706;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ver la campaña
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendCanastaSoporteEmail({
  nombre,
  email,
  telefono,
  localidad,
  edad,
  mensaje,
}: {
  nombre: string;
  email: string;
  telefono: string;
  localidad: string;
  edad: string;
  mensaje: string;
}) {
  if (!process.env.RESEND_API_KEY || !CANASTA_SUPPORT_EMAIL) return;
  await resend.emails.send({
    from: FROM,
    to: CANASTA_SUPPORT_EMAIL,
    replyTo: email,
    subject: `🆘 Soporte Canasta Solidaria: ${nombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#d97706;border-radius:16px;padding:24px;margin-bottom:24px;">
          <p style="color:#fde68a;font-size:13px;margin:0 0 4px;">Canasta Solidaria</p>
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">Consulta de soporte</h1>
        </div>
        <table style="width:100%;margin-bottom:20px;font-size:14px;">
          <tr><td style="color:#6b7280;padding:4px 0;width:110px;">Nombre</td><td style="font-weight:600;">${escapeHtml(nombre)}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;">Email</td><td><a href="mailto:${escapeHtml(email)}" style="color:#d97706;">${escapeHtml(email)}</a></td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;">Teléfono</td><td style="font-weight:600;">${escapeHtml(telefono) || "—"}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;">Localidad</td><td style="font-weight:600;">${escapeHtml(localidad) || "—"}</td></tr>
          <tr><td style="color:#6b7280;padding:4px 0;">Edad</td><td style="font-weight:600;">${escapeHtml(edad) || "—"}</td></tr>
        </table>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;">${escapeHtml(mensaje)}</div>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Respondé directamente a este email para contestarle.</p>
      </div>
    `,
  });
}
