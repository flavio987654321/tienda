import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "TiendaApps <noreply@tiendaapps.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
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
