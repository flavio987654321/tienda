import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "TiendaApps <noreply@tiendaapps.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
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
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${userName || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Revisamos tus documentos pero no pudimos completar la verificación. Te contamos el motivo para que puedas reenviarlos corregidos.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#991b1b;margin:0 0 8px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">Motivo del rechazo</p>
          <p style="font-size:15px;color:#374151;margin:0;">${reason}</p>
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
