import { Resend } from "resend";
import { PRO_MAX_PRODUCTS, PRO_MAX_AFFILIATES } from "@/lib/planLimits";
import { dominioDeLaPlataforma, DIAS_DE_DOMINIO_EN_FREE } from "@/lib/configuracion-digital";

const clienteResend = new Resend(process.env.RESEND_API_KEY ?? "no-key");

/**
 * El cliente de Resend, envuelto para que un mail rechazado no se pierda.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ `resend.emails.send()` NO TIRA ERROR CUANDO LA API RECHAZA EL MAIL
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Contesta `{ data, error }` y **resuelve la promesa igual**. Dirección
 * inválida, dominio sin verificar, cuota agotada, clave revocada: todo eso llega
 * como un campo adentro de la respuesta, no como una excepción.
 *
 * O sea que los 22 senders de este archivo venían mandando mails que la API
 * rechazaba y **siguiendo como si hubieran salido**. Un `try/catch` alrededor no
 * se enteraba de nada, y los `despues(...)` y los `.catch(...)` de los llamadores
 * tampoco: no había nada que atrapar.
 *
 * Encontrado el 03/09/26 armando el registro de envíos de digitales. Es el mismo
 * accidente que ya había pasado con el SMTP de Gmail en julio —25 mails muertos
 * en silencio durante días— y por eso `lib/email.ts` sí lo mira desde entonces.
 * Este archivo se quedó afuera de aquella corrección.
 *
 * ── Por qué se LOGUEA y no se tira, al revés que en `email.ts` ──────────────
 *
 * Porque los llamadores son distintos. Los de `email.ts` venían de nodemailer,
 * que tiraba, así que ya estaban escritos para que un mail fallido no voltee
 * nada. Los de acá se escribieron contra una función que nunca tiraba: hay
 * varios `await sendLoQueSea(...)` sueltos adentro de rutas sin `try`, y
 * convertirlos de golpe en excepciones haría, por ejemplo, que un registro
 * fallara entero porque no salió el mail de bienvenida. Eso es peor que el
 * problema.
 *
 * Así que el piso es: **nunca más en silencio**. Queda escrito con el asunto y el
 * destinatario, que es lo que hace falta para encontrarlo.
 *
 * Y arriba de ese piso, lo que de verdad no puede fallar sin avisarle a la
 * persona —confirmar el correo, recuperar la contraseña, entregar un archivo
 * pago— devuelve el resultado y su llamador lo mira. Ver `ResultadoDeEnvio`.
 */
const resend = {
  emails: {
    async send(payload: Parameters<typeof clienteResend.emails.send>[0]) {
      const r = await clienteResend.emails.send(payload);
      if (r.error) {
        console.error("[resend] la API rechazó el mail", {
          /* El asunto y el destino, que es con lo que se encuentra de qué venta
             o de qué persona se trata. El cuerpo no: son kilobytes de HTML en un
             renglón de registro. */
          asunto: "subject" in payload ? payload.subject : undefined,
          para: payload.to,
          motivo: r.error.message,
        });
      }
      return r;
    },
  },
};

const FROM = process.env.RESEND_FROM ?? "TiendaApps <noreply@tiendaapps.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const CANASTA_SUPPORT_EMAIL = process.env.CANASTA_SUPPORT_EMAIL ?? process.env.ADMIN_EMAIL ?? "";

// Los mails se arman en el servidor, y en Vercel eso es UTC (3 h adelante de
// Argentina). Sin fijar la zona, una fecha que cae después de las 21 hs de acá
// se muestra con el día siguiente, y el mail termina diciendo un día distinto
// del que ve la dueña en el panel (que se renderiza en su navegador, hora local).
const AR_TZ = "America/Argentina/Buenos_Aires";

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
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
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
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
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
          <strong>${escapeHtml(ownerName)}</strong> (${escapeHtml(ownerEmail)}) envió una solicitud de verificación de identidad.
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
          <p style="font-size:16px;font-weight:700;color:#111827;margin:0 0 4px;">${escapeHtml(storeName)}</p>
          <p style="font-size:13px;color:#6b7280;margin:0;">tiendaapps.com/tienda/${escapeHtml(storeSlug)}</p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;">
          <p style="font-size:13px;color:#374151;margin:0 0 6px;font-weight:600;">Motivo: <span style="color:#dc2626;">${escapeHtml(reason)}</span></p>
          ${description ? `<p style="font-size:14px;color:#374151;margin:8px 0 0;">${escapeHtml(description)}</p>` : ""}
          ${reporterEmail ? `<p style="font-size:13px;color:#6b7280;margin:10px 0 0;">Reportado por: ${escapeHtml(reporterEmail)}</p>` : ""}
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
  paymentId,
  planKey,
}: {
  to: string;
  userName: string;
  planLabel: string;
  billingLabel: string;
  amount: number;
  periodEnd: Date;
  paymentId?: string;
  planKey?: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const nextRenewal = periodEnd.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric", timeZone: AR_TZ,
  });

  // Los números salen de las constantes que los aplican. "Hasta 6 afiliados"
  // estaba escrito a mano —justo el mail que confirma un pago, o sea el peor
  // lugar para prometer un número distinto al que después se hace cumplir.
  const isPremium = planKey === "OWNER_PREMIUM";
  const features = isPremium
    ? ["Afiliados ilimitados", "Dominio propio configurado por nosotros", "PWA + notificaciones push", "Flyer de bienvenida en la tienda", "Soporte prioritario"]
    : [
        `Hasta ${PRO_MAX_PRODUCTS.toLocaleString("es-AR")} productos, con variantes ilimitadas`,
        `Hasta ${PRO_MAX_AFFILIATES} afiliados`,
        "Panel de pedidos y estadísticas",
        "Soporte por email",
      ];

  const txId = paymentId ? `#${String(paymentId).slice(-8).toUpperCase()}` : null;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `¡Tu suscripción ${planLabel} está activa! — TiendaApps`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px 16px;background:#f8fafc;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#ea580c 0%,#c2410c 100%);border-radius:20px;padding:36px 28px;margin-bottom:20px;text-align:center;">
          <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:26px;">🛍️</span>
          </div>
          <p style="color:#fed7aa;font-size:12px;margin:0 0 6px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">TiendaApps</p>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:900;line-height:1.2;">¡Suscripción activa!</h1>
          <p style="color:#fed7aa;font-size:14px;margin:10px 0 0;">Todo listo para empezar a vender</p>
        </div>

        <!-- Saludo -->
        <div style="background:#fff;border-radius:16px;padding:24px 24px 20px;margin-bottom:16px;border:1px solid #e2e8f0;">
          <p style="font-size:15px;color:#374151;margin:0 0 8px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong> 👋</p>
          <p style="font-size:14px;color:#6b7280;margin:0;line-height:1.6;">
            Tu plan <strong style="color:#ea580c;">${escapeHtml(planLabel)}</strong> está activo.
            Ya podés crear tu tienda, agregar productos y gestionar tus afiliados.
          </p>
        </div>

        <!-- Comprobante / Ticket -->
        <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;">
          <div style="background:#f1f5f9;padding:12px 20px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;">Comprobante de pago</p>
          </div>
          <div style="padding:20px;">
            ${txId ? `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:14px;border-bottom:1px dashed #e2e8f0;">
              <span style="font-size:13px;color:#9ca3af;">N° transacción</span>
              <span style="font-size:13px;font-weight:700;color:#374151;font-family:monospace;background:#f1f5f9;padding:3px 8px;border-radius:6px;">${txId}</span>
            </div>
            ` : ""}
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:14px;color:#6b7280;">Plan</span>
              <span style="font-size:14px;font-weight:600;color:#111827;">${escapeHtml(planLabel)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:14px;color:#6b7280;">Facturación</span>
              <span style="font-size:14px;font-weight:600;color:#111827;">${escapeHtml(billingLabel)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:14px;color:#6b7280;">Monto pagado</span>
              <span style="font-size:15px;font-weight:800;color:#ea580c;">${fmt(amount)}</span>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;color:#15803d;font-weight:600;">Próxima renovación</span>
              <span style="font-size:13px;font-weight:700;color:#15803d;">${nextRenewal}</span>
            </div>
          </div>
        </div>

        <!-- Qué incluye -->
        <div style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:20px;">
          <div style="background:#fff7ed;padding:12px 20px;border-bottom:1px solid #fed7aa;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#c2410c;letter-spacing:1.5px;text-transform:uppercase;">Lo que incluye tu plan</p>
          </div>
          <div style="padding:16px 20px;">
            ${features.map(f => `
            <div style="display:flex;align-items:center;gap:10px;padding:6px 0;">
              <span style="color:#ea580c;font-size:15px;flex-shrink:0;">✓</span>
              <span style="font-size:14px;color:#374151;">${escapeHtml(f)}</span>
            </div>`).join("")}
          </div>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${APP_URL}/dashboard"
             style="display:inline-block;background:#ea580c;color:#fff;padding:16px 40px;border-radius:12px;font-weight:800;font-size:15px;text-decoration:none;letter-spacing:0.3px;">
            Ir a mi panel →
          </a>
          <p style="font-size:12px;color:#9ca3af;margin:12px 0 0;">tiendaapps.com/dashboard</p>
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">
            ¿Tenés alguna duda? Escribinos a
            <a href="mailto:soporte@tiendaapps.com" style="color:#ea580c;text-decoration:none;">soporte@tiendaapps.com</a>
          </p>
          <p style="color:#cbd5e1;font-size:11px;margin:0;">TiendaApps · Argentina</p>
        </div>

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
        <p style="font-size:15px;color:#374151;margin-bottom:6px;"><strong>${escapeHtml(campaignName)}</strong> llegó a su meta.</p>
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
      ? `Tu donación de <strong>${fmt(amount)}</strong> a la <strong>${escapeHtml(campaignName)}</strong> ya está registrada. Nuestro equipo se encarga de hacerla llegar. Si querés ver cómo sigue, podés entrar a la página de la causa cuando quieras.`
      : `Tu donación de <strong>${fmt(amount)}</strong> a la <strong>${escapeHtml(campaignName)}</strong> ya está registrada. Cuando se complete la meta, nuestro equipo elige a la familia que la recibe. Si querés ver cómo sigue, podés entrar a la página de la campaña cuando quieras.`;
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
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(donorName)}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:16px;">
          ${bodyText}
        </p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          ${closingText}
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${escapeHtml(campaignUrl)}"
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
          <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">${escapeHtml(campaignName)}</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(donorName)}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;white-space:pre-line;">${escapeHtml(message)}</p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${escapeHtml(campaignUrl || `${APP_URL}/comunidad/campana`)}"
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

// ─── Vencimiento de la suscripción ───────────────────────────────────────────
// Hasta ahora no existía NINGÚN aviso de vencimiento: el cron solo mandaba
// carritos abandonados, recordatorios de retiro y alertas de MP. Cerrarle la
// tienda a alguien sin haberle avisado antes es indefendible.

/** Día 0: se venció. Todavía no pasa nada grave, pero el reloj arrancó. */
export async function sendSubscriptionExpiredEmail({
  to,
  userName,
  storeName,
  closesOn,
  daysLeft,
}: {
  to: string;
  userName: string;
  storeName: string;
  closesOn: Date;
  daysLeft: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const fecha = closesOn.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: AR_TZ });
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Se venció tu plan — ${storeName} sigue online por ${daysLeft} días`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#b45309;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#fed7aa;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Se venció tu plan</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Tu suscripción venció y <strong>${escapeHtml(storeName)}</strong> todavía está online, pero no por siempre.
        </p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">
            Tenés <strong>${daysLeft} días</strong> para renovar. Si no lo hacés, el <strong>${fecha}</strong> tu tienda
            se cierra sola — pero no se borra nada: podés reactivarla cuando quieras.
          </p>
        </div>
        ${APP_URL ? `
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${APP_URL}/dashboard/mi-plan" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Renovar mi plan</a>
        </div>` : ""}
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          ¿Problemas con el pago, o el plan te quedó grande? Respondé este email y lo vemos.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">TiendaApps — tu tienda online profesional</p>
      </div>
    `,
  });
}

/** Último aviso, unos días antes de que el cron la cierre. */
export async function sendSubscriptionClosingSoonEmail({
  to,
  userName,
  storeName,
  closesOn,
  daysLeft,
}: {
  to: string;
  userName: string;
  storeName: string;
  closesOn: Date;
  daysLeft: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const fecha = closesOn.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: AR_TZ });
  const cuando = daysLeft <= 1 ? "mañana" : `en ${daysLeft} días`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Último aviso: ${storeName} se cierra ${cuando}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#991b1b;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#fecaca;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Tu tienda se cierra ${cuando}</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Es el último aviso: el <strong>${fecha}</strong> vamos a cerrar <strong>${escapeHtml(storeName)}</strong> porque
          el plan sigue sin renovarse. Va a dejar de estar online y de vender.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#166534;margin:0 0 8px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">Igual no perdés nada</p>
          <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">
            Tus productos, tu diseño y tu historial quedan guardados tal cual. Si volvés, reactivás la tienda desde tu
            panel y está todo como lo dejaste.
          </p>
        </div>
        ${APP_URL ? `
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${APP_URL}/dashboard/mi-plan" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Renovar antes del ${fecha}</a>
        </div>` : ""}
        <p style="color:#9ca3af;font-size:12px;text-align:center;">TiendaApps — tu tienda online profesional</p>
      </div>
    `,
  });
}

// ─── Cierre de tienda ────────────────────────────────────────────────────────

/**
 * Comprobante para la dueña de que su tienda quedó cerrada. Antes de esto, cerrar
 * (que hasta ahora era eliminar la cuenta) no le mandaba absolutamente nada.
 *
 * El tono es deliberadamente tranquilo: cerrar no es un castigo ni un error, y lo
 * más importante que tiene que quedarle claro es que sus cosas siguen ahí y que
 * volver es un click.
 */
export async function sendStoreClosedOwnerEmail({
  to,
  userName,
  storeName,
  reason,
}: {
  to: string;
  userName: string;
  storeName: string;
  reason: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Cerraste ${storeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#374151;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#d1d5db;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Tu tienda está cerrada</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Cerramos <strong>${escapeHtml(storeName)}</strong> como pediste. Ya no está online y dejamos de cobrarte la suscripción.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#166534;margin:0 0 8px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">Nada se borró</p>
          <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">
            Tu diseño, tus productos, tus imágenes y tu historial quedaron guardados tal cual los dejaste. Cuando quieras volver, entrás a tu panel y la reactivás — está todo como estaba.
          </p>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="font-size:12px;color:#6b7280;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:0.03em;">Motivo que nos dejaste</p>
          <p style="font-size:14px;color:#374151;margin:0;">${escapeHtml(reason)}</p>
        </div>
        ${APP_URL ? `
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Reactivar mi tienda</a>
        </div>` : ""}
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          Si cerraste por algo que podamos resolver, contanos — respondé este email y lo vemos.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          TiendaApps — tu tienda online profesional
        </p>
      </div>
    `,
  });
}

/**
 * Aviso a cada afiliado de que la tienda donde vendía cerró.
 *
 * NO se reusa sendStoreOfflineEmail: ese dice "pausó temporalmente su actividad,
 * tu link sigue existiendo", que en un cierre es falso. Hasta ahora el cierre solo
 * generaba una notificación in-app, así que el afiliado que no abría la app nunca
 * se enteraba de que había perdido una fuente de ingresos — mientras que por una
 * simple pausa sí le llegaba un mail. El evento más grave avisaba menos.
 */
export async function sendStoreClosedAffiliateEmail({
  to,
  affiliateName,
  storeName,
}: {
  to: string;
  affiliateName: string;
  storeName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${storeName} cerró su tienda`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#374151;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#d1d5db;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">${escapeHtml(storeName)} cerró</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(affiliateName) || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Te avisamos que <strong>${escapeHtml(storeName)}</strong> cerró su tienda. Tu link de afiliado quedó pausado y por ahora no va a generar ventas nuevas.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:13px;color:#166534;margin:0 0 8px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">Tu plata está intacta</p>
          <p style="font-size:15px;color:#374151;margin:0;line-height:1.6;">
            El saldo que ya tenías acreditado sigue disponible para retirar, como siempre. Y si la tienda vuelve a abrir, recuperás tu lugar sin tener que postularte de nuevo.
          </p>
        </div>
        ${APP_URL ? `
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${APP_URL}/afiliados" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Ir a mi panel</a>
        </div>` : ""}
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          Podés seguir vendiendo en las otras tiendas donde estés afiliado, o postularte a nuevas desde tu panel.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          TiendaApps — tu tienda online profesional
        </p>
      </div>
    `,
  });
}

/**
 * Bienvenida, al crear la cuenta. Se manda desde el registro (no por cron): el
 * alta misma es el disparador, así llega en el momento y no al día siguiente.
 *
 * El contenido cambia según el rol porque los tres arrancan haciendo cosas
 * distintas — a una dueña le sirve "cargá tu primer producto" y a un afiliado
 * no le dice nada.
 */

/**
 * El mail de "acá va tu link otra vez", cuando alguien pide que se lo reenvíen.
 *
 * Es a propósito mucho más corto que el de bienvenida: la persona ya lo recibió
 * una vez, ya sabe qué es la plataforma, y lo único que necesita es el botón. Un
 * mail largo acá sólo aleja el clic.
 */
/**
 * ⚠️ Devuelve el resultado, y su llamador lo mira.
 *
 * Sin este mail la persona **no puede entrar nunca**: no hay otro camino para
 * confirmar la cuenta que acaba de crear. Es de los tres que no pueden fallar en
 * silencio (los otros dos: recuperar la contraseña y entregar un archivo pago).
 *
 * Y tiene un segundo camino esperando —el reenvío propio de Supabase, con su
 * plantilla— que hasta el 03/09/26 era **inalcanzable para este fallo**: como el
 * envío nunca tiraba, la ruta contestaba "listo" y nunca llegaba a probarlo. Ver
 * `api/auth/reenviar-confirmacion`.
 */
export async function sendConfirmEmail({
  to,
  confirmLink,
}: {
  to: string;
  confirmLink: string;
}): Promise<ResultadoDeEnvio> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no configurada: no se puede reenviar la confirmación");
  }

  const r = await resend.emails.send({
    from: FROM,
    to,
    subject: "Confirmá tu correo — TiendaApps",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#ea580c;border-radius:16px;padding:28px 24px;margin-bottom:26px;text-align:center;">
          <p style="color:#fed7aa;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Confirmá tu correo</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;line-height:1.6;">
          Acá está tu link de nuevo. Es un clic y ya podés entrar a tu cuenta.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${escapeHtml(confirmLink)}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:12px;">Confirmar mi correo</a>
        </div>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:24px;">
          Si no creaste ninguna cuenta en TiendaApps, ignorá este mail: sin este clic no pasa nada.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">TiendaApps — tu tienda online profesional</p>
      </div>
    `,
  });

  return { error: r.error ? { message: r.error.message } : null };
}

export async function sendWelcomeEmail({
  to,
  userName,
  role,
  storeName,
  digitalPlan,
  confirmLink,
}: {
  to: string;
  userName: string;
  role: "OWNER" | "SELLER" | "BUYER" | "DIGITAL";
  storeName?: string | null;
  /** El plan con el que arrancó una cuenta digital. Sin esto el mail le decía
   *  "arrancás en Free" a quien acababa de elegir Pro. */
  digitalPlan?: "FREE" | "STARTER" | "PRO" | null;
  /** El link que confirma el correo. Sin esto la cuenta queda creada y sin poder
   *  entrar, así que este mail dejó de ser informativo: es la llave. */
  confirmLink?: string | null;
}) {
  /* Antes esto era un `return` silencioso: sin clave configurada, no se manda y
     listo. Ahora el mail lleva el link de confirmación, así que callarse sería
     dejar la cuenta creada y sin forma de entrar, sin que nadie se entere. */
  if (!process.env.RESEND_API_KEY) {
    if (confirmLink) throw new Error("RESEND_API_KEY no configurada: no se puede mandar la confirmación");
    return;
  }

  const hola = escapeHtml(userName) || "ahí";
  /* Con confirmación pendiente este botón devuelve vacío: llevaría al panel, que
     todavía la va a rebotar. El único botón del mail tiene que ser el de
     confirmar. */
  const btn = (href: string, label: string) =>
    confirmLink ? "" :
    APP_URL
      ? `<div style="text-align:center;margin-bottom:24px;">
           <a href="${APP_URL}${href}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">${label}</a>
         </div>`
      : "";

  const paso = (n: number, titulo: string, detalle: string) => `
    <tr>
      <td style="vertical-align:top;padding:0 12px 16px 0;width:28px;">
        <div style="width:26px;height:26px;border-radius:999px;background:#eef2ff;color:#4f46e5;font-weight:800;font-size:13px;text-align:center;line-height:26px;">${n}</div>
      </td>
      <td style="vertical-align:top;padding-bottom:16px;">
        <p style="margin:0;font-size:15px;color:#111827;font-weight:700;">${titulo}</p>
        <p style="margin:2px 0 0;font-size:14px;color:#6b7280;line-height:1.5;">${detalle}</p>
      </td>
    </tr>`;

  let titular: string;
  let intro: string;
  let cuerpo: string;

  if (role === "OWNER") {
    titular = "Tu tienda ya existe";
    intro = `Creamos <strong>${escapeHtml(storeName) || "tu tienda"}</strong> y tenés <strong>7 días de prueba</strong>, sin tarjeta ni compromiso.`;
    cuerpo = `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
          <strong>Todavía nadie la puede ver.</strong> Tu tienda arranca apagada a propósito, para que la
          armes tranquila. Cuando esté como querés, la publicás vos desde el panel.
        </p>
      </div>
      <p style="font-size:15px;color:#111827;font-weight:700;margin:0 0 14px;">Por dónde empezar</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${paso(1, "Elegí el diseño", "Una plantilla y tus colores. Se cambia cuando quieras.")}
        ${paso(2, "Cargá tu primer producto", "Con uno solo ya podés ver cómo te queda la tienda.")}
        ${paso(3, "Configurá cómo cobrás", "Conectá MercadoPago o cargá tu CBU para transferencias.")}
        ${paso(4, "Publicá", "Recién ahí tu tienda queda online y podés compartir el link.")}
      </table>
      ${btn("/dashboard", "Ir a mi panel")}`;
  } else if (role === "SELLER") {
    titular = "Bienvenida a TiendaApps";
    intro = "Tu cuenta de vendedor ya está lista. Es gratis y no vence.";
    cuerpo = `
      <p style="font-size:15px;color:#111827;font-weight:700;margin:0 0 14px;">Cómo funciona</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${paso(1, "Buscá una tienda", "Mirá las que tienen el programa abierto y postulate.")}
        ${paso(2, "Esperá que te aprueben", "La dueña recibe tu solicitud y te avisa.")}
        ${paso(3, "Compartí tu link", "Cada venta que entre por ahí queda registrada a tu nombre.")}
        ${paso(4, "Cobrá tu comisión", "Se acredita sola en tu panel de comisiones cuando el pago se confirma.")}
      </table>
      ${btn("/afiliados", "Ver tiendas disponibles")}`;
  } else if (role === "DIGITAL") {
    titular = "Tu cuenta ya está lista";
    intro = digitalPlan && digitalPlan !== "FREE"
      ? `Estás probando <strong>${digitalPlan === "PRO" ? "Pro" : "Starter"}</strong> por 7 días, sin tarjeta. Al terminar, si no pagás, tu cuenta vuelve al plan Free — no se cierra nada.`
      : "Arrancás en el plan <strong>Free</strong>: es gratis, no vence y no te pedimos ninguna tarjeta.";
    cuerpo = `
      <p style="font-size:15px;color:#374151;line-height:1.6;margin-bottom:20px;">
        El Free se paga con una comisión por venta, así que no hay ningún abono que se te venza ni
        nada que se te cierre por no pagar. Cuando quieras más páginas de venta o una comisión más
        baja, pasás a Starter o a Pro desde tu panel.
      </p>
      ${btn("/digitales", "Ir a mi panel")}`;
  } else {
    titular = "Bienvenido a TiendaApps";
    intro = "Tu cuenta ya está lista. Es gratuita y no requiere tarjeta.";
    cuerpo = `
      <p style="font-size:15px;color:#374151;line-height:1.6;margin-bottom:20px;">
        Desde tu cuenta podés comprar en cualquier tienda de la plataforma, seguir el estado de tus
        pedidos y guardar tus productos favoritos.
      </p>
      ${btn("/tiendas", "Explorar tiendas")}`;
  }

  /* Cuando hay link de confirmación, ES el mail: se pone arriba de todo y el
     botón de "ir a mi panel" de cada rol desaparece. Dos botones compitiendo, y
     uno de ellos llevando a una pantalla que todavía no la va a dejar entrar,
     es la forma más rápida de que no toque el que importa. */
  const bloqueConfirmacion = confirmLink
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:22px 18px;margin-bottom:26px;text-align:center;">
         <p style="margin:0 0 6px;font-size:17px;font-weight:800;color:#9a3412;">Confirmá tu correo</p>
         <p style="margin:0 0 18px;font-size:14px;color:#7c2d12;line-height:1.6;">
           Es un clic. Hasta que lo hagas no vas a poder entrar a tu cuenta.
         </p>
         <a href="${escapeHtml(confirmLink)}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:12px;">Confirmar mi correo</a>
         <p style="margin:16px 0 0;font-size:12px;color:#9a3412;line-height:1.5;">
           Si no creaste ninguna cuenta en TiendaApps, ignorá este mail: sin este clic no pasa nada.
         </p>
       </div>`
    : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: role === "OWNER" ? `¡Bienvenida! ${storeName ? `${storeName} ya existe` : "Tu tienda ya existe"}` : "Bienvenida a TiendaApps",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#4f46e5;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#c7d2fe;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">${titular}</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${hola}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">${intro}</p>
        ${bloqueConfirmacion}
        ${cuerpo}
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          ¿Alguna duda? Respondé este email y te contestamos.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">TiendaApps — tu tienda online profesional</p>
      </div>
    `,
  });
}

/**
 * Aviso de que cambiaron los Términos / la Privacidad.
 *
 * Lo dispara el cron diario, y solo le llega a quien NO aceptó todavía: el que
 * entra a la app ve el banner, acepta ahí, y nunca recibe este mail. O sea que
 * es el plan B para el que no volvió a entrar, no un envío masivo.
 *
 * `acceptUrl` apunta a la pantalla donde vive el banner de ese rol, con
 * ?terminos=1 para que se muestre aunque lo hayan cerrado antes.
 */
export async function sendTermsUpdatedEmail({
  to,
  userName,
  acceptPath,
  summary,
}: {
  to: string;
  userName: string;
  acceptPath: string;
  summary: string[];
}) {
  if (!process.env.RESEND_API_KEY) return;

  const items = summary
    .map(
      (s) =>
        `<li style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.6;">${escapeHtml(s)}</li>`
    )
    .join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Actualizamos nuestros Términos y Política de Privacidad",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#4f46e5;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#c7d2fe;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Actualizamos nuestros términos</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${escapeHtml(userName) || "ahí"}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:22px;">
          Cambiamos nuestros Términos y Condiciones y la Política de Privacidad. Te contamos qué cambió,
          sin vueltas:
        </p>
        <ul style="margin:0 0 24px;padding-left:20px;">${items}</ul>
        <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#3730a3;line-height:1.6;">
            Para seguir usando tu cuenta necesitamos que los aceptes. Entrá y vas a ver un cartel arriba
            con el botón para hacerlo — te lleva menos de un segundo.
          </p>
        </div>
        ${APP_URL ? `
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${APP_URL}${acceptPath}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Entrar y aceptar</a>
        </div>
        <p style="font-size:13px;color:#9ca3af;text-align:center;margin-bottom:24px;">
          También podés leerlos completos en
          <a href="${APP_URL}/terminos" style="color:#6366f1;">Términos</a> y
          <a href="${APP_URL}/privacidad" style="color:#6366f1;">Privacidad</a>.
        </p>` : ""}
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          Si algo no te cierra, respondé este email y lo hablamos.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">TiendaApps — tu tienda online profesional</p>
      </div>
    `,
  });
}

/**
 * La entrega de un producto digital: el mail que llega cuando se acredita el pago.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ EL BOTÓN LLEVA A UNA PÁGINA, NUNCA A LA DIRECCIÓN DE DESCARGA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Abrir `/api/digitales/descargar/<token>` **gasta una de las cinco descargas**.
 * Y los enlaces de un correo los visitan solos, apenas llega, un montón de cosas
 * que no son la persona: Outlook Safe Links, los antivirus corporativos, los
 * previsualizadores de los clientes de mail. Con el enlace directo acá, alguien
 * podría quedarse sin sus cinco descargas sin haber tocado nada.
 *
 * Por eso apunta a la pantalla de gracias, que muestra los botones. Abrirla no
 * cuesta nada. Hay un chequeo que falla si alguien pone `/descargar/` acá.
 *
 * ── Por qué el mail, si el archivo ya se bajó en pantalla ───────────────────
 *
 * Porque se decidió que fueran las dos cosas (03/09/26) y cada una tapa el
 * agujero de la otra: la pantalla sirve a quien baja en el momento, y esto a
 * quien cerró la pestaña, cambió de aparato, o lo quiere dos semanas después.
 */
/**
 * Lo que contesta un envío que se puede anotar.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ EL SDK DE RESEND NO TIRA ERROR: LO DEVUELVE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `resend.emails.send()` (v6) contesta `{ data, error }`. Cuando la API rechaza
 * el mail —dirección inválida, dominio sin verificar, cuota agotada— **la
 * promesa se resuelve igual**, con `error` adentro. O sea que un `try/catch`
 * alrededor no se entera de nada y el código sigue como si el mail hubiera
 * salido.
 *
 * Eso vale para TODOS los mails del proyecto, no sólo para éste. Acá se
 * devuelve el resultado porque este mail es el único que se anota en la base
 * (ver `DigitalEnvioLog`): anotar "ENVIADO" sin mirar el `error` sería fabricar
 * una prueba de entrega de algo que nunca salió, que es peor que no anotar nada.
 *
 * 🔲 Los otros senders siguen sin mirarlo. Está anotado en el plan.
 */
export type ResultadoDeEnvio = { error: { message: string } | null };

export async function sendEntregaDigitalEmail({
  to,
  nombre,
  producto,
  archivos,
  enlace,
  vendedor,
  dias,
  maxDescargas,
}: {
  to: string;
  nombre: string | null;
  producto: string;
  /** Lo que se lleva, para que el mail sea también un comprobante. */
  archivos: { nombre: string; esBono: boolean }[];
  /** La pantalla de gracias con sus botones. NUNCA la ruta de descarga. */
  enlace: string;
  vendedor: string | null;
  dias: number;
  maxDescargas: number;
}): Promise<ResultadoDeEnvio> {
  /* Sin la clave no se manda nada, y eso se contesta como un fallo y no como un
     silencio: para quien compró, un mail que no salió porque falta una variable
     de entorno y uno que no salió porque Resend lo rechazó son la misma cosa —
     no le llegó. Devolver `undefined` acá dejaría anotado "ENVIADO". */
  if (!process.env.RESEND_API_KEY) {
    return { error: { message: "RESEND_API_KEY no configurada" } };
  }

  const lista = archivos
    .map(
      (a) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;">
          ${escapeHtml(a.nombre)}
          ${a.esBono ? `<span style="color:#059669;font-size:11px;font-weight:800;letter-spacing:.04em;margin-left:8px;">BONO GRATIS</span>` : ""}
        </td>
      </tr>`
    )
    .join("");

  const r = await resend.emails.send({
    from: FROM,
    to,
    subject: `Ya podés descargar: ${producto}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#0f172a;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#94a3b8;font-size:13px;margin:0 0 6px;font-weight:500;">Tu compra está lista</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">${escapeHtml(producto)}</h1>
        </div>

        <p style="font-size:15px;color:#374151;margin-bottom:6px;">
          Hola${nombre ? ` <strong>${escapeHtml(nombre)}</strong>` : ""},
        </p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          Se acreditó tu pago. Ya podés descargar todo lo que compraste.
        </p>

        <div style="text-align:center;margin-bottom:28px;">
          <a href="${enlace}"
             style="display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Descargar mis archivos
          </a>
        </div>

        <p style="font-size:13px;color:#6b7280;margin:0 0 8px;font-weight:700;">Lo que te llevás</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${lista}</table>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="font-size:13px;color:#475569;margin:0;">
            Tus enlaces valen <strong>${dias} días</strong> y <strong>${maxDescargas} descargas</strong> cada uno.
            Guardá los archivos en tu computadora o teléfono apenas puedas.
          </p>
        </div>

        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          ¿Algún problema con tu compra?${vendedor ? ` Escribile a <strong>${escapeHtml(vendedor)}</strong>.` : ""}
          Respondé este mail y lo vemos.
        </p>

        <p style="color:#9ca3af;font-size:12px;text-align:center;">
          ${vendedor ? `${escapeHtml(vendedor)} vende a través de TiendaApps` : "TiendaApps"}
        </p>
      </div>
    `,
  });

  /* Se devuelve el mensaje del error, no el objeto entero: lo que se guarda va a
     una columna de texto y el objeto de Resend puede traer campos que no hacen
     falta guardar. */
  return { error: r.error ? { message: r.error.message } : null };
}

/**
 * El recordatorio de una compra que quedó por la mitad. Productos Digitales, Pro.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SE MANDA UNA SOLA VEZ, Y ESO NO ES UNA LIMITACIÓN TÉCNICA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Insistirle a alguien que no quiso comprar es correo no deseado. Y el que queda
 * mal no somos nosotros: es el negocio de quien vende, con su nombre en el
 * asunto. Una sola vez es lo que se puede mandar sin quemar a nadie.
 *
 * ⚠️ Y no promete descuentos ni pone relojes. La competencia manda "última
 * oportunidad" y "quedan 2 horas" a alguien que abandonó hace diez minutos, y
 * eso es mentira escrita con el nombre de quien vende. Acá el mail dice lo único
 * que es cierto: empezaste esto, acá está el link para terminarlo.
 */
export async function sendCarritoAbandonadoDigitalEmail({
  to,
  nombre,
  producto,
  total,
  enlace,
  vendedor,
}: {
  to: string;
  nombre: string | null;
  producto: string;
  total: number;
  /** La página de venta del producto. Nunca un link de pago viejo. */
  enlace: string;
  vendedor: string | null;
}): Promise<ResultadoDeEnvio> {
  if (!process.env.RESEND_API_KEY) {
    return { error: { message: "RESEND_API_KEY no configurada" } };
  }

  const quien = vendedor?.trim() || "la tienda";
  const hola = nombre?.trim() ? `Hola ${escapeHtml(nombre.trim())}` : "Hola";

  const r = await resend.emails.send({
    from: FROM,
    to,
    /* Sin signos de admiración ni emojis: es un recordatorio, no una promoción,
       y en la bandeja tiene que parecer lo que es. */
    subject: `Quedó pendiente tu compra de ${producto}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <p style="font-size:13px;color:#6b7280;margin:0 0 6px;font-weight:600;">${escapeHtml(quien)}</p>
        <h1 style="font-size:21px;margin:0 0 20px;font-weight:800;color:#111827;">Tu compra quedó por la mitad</h1>

        <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
          ${hola}: empezaste a comprar <strong>${escapeHtml(producto)}</strong> y el pago no llegó a
          completarse. Si querés, podés terminarlo cuando quieras — el link sigue andando.
        </p>

        <div style="display:flex;justify-content:space-between;padding:12px 0;margin-bottom:24px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:14px;color:#6b7280;">${escapeHtml(producto)}</span>
          <span style="font-size:14px;font-weight:700;color:#111827;">${fmt(total)}</span>
        </div>

        <div style="text-align:center;margin-bottom:28px;">
          <a href="${enlace}"
             style="display:inline-block;background:#111827;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Terminar la compra
          </a>
        </div>

        <p style="font-size:12.5px;line-height:1.6;color:#9ca3af;margin:0;">
          Si ya no te interesa, no hace falta que hagas nada: este es el único recordatorio que te
          vamos a mandar por esta compra.
        </p>
      </div>
    `,
  });

  return { error: r.error ? { message: r.error.message } : null };
}

/**
 * A quien se le terminó Starter o Pro sin pagar y volvió a Free.
 *
 * Lo manda el cron diario en la misma vuelta que escribe la caída. Es el par
 * del aviso de adentro del panel: el aviso lo ve quien vuelve a entrar, y este
 * mail es para quien no entra hace semanas — que es justo el que dejó de pagar.
 *
 * Dice lo que pasó de verdad, en este orden: no se cerró nada, subió la
 * comisión, y si se apagaron páginas, CUÁLES. Un mail que dice "volviste a
 * Free" y se calla que tres páginas dejaron de verse le hace descubrir el
 * apagón mirando sus anuncios.
 */
export async function sendCaidaAFreeEmail({
  to,
  userName,
  planPerdido,
  topePaginas,
  quedaron,
  despublicadas,
  dominios,
}: {
  to: string;
  userName: string | null;
  /** "Starter" o "Pro": el nombre del plan que se terminó. */
  planPerdido: string;
  /** Cuántas páginas de venta publicadas permite Free. */
  topePaginas: number;
  /** Las páginas que quedaron publicadas, por nombre. */
  quedaron: string[];
  /** Lo que pasó a borrador, con el rol para que se entienda qué es cada cosa. */
  despublicadas: { name: string; rol: "PRINCIPAL" | "BONO" | "UPSELL" }[];
  /**
   * Los dominios propios que tenía conectados y desde hoy redirigen, con la
   * dirección a la que mandan. Vacío si no tenía ninguno.
   */
  dominios?: { dominio: string; redirigeA: string }[];
}) {
  if (!process.env.RESEND_API_KEY) return;

  const hola = escapeHtml(userName?.trim()) || "ahí";
  const ETIQUETA = { PRINCIPAL: "Página de venta", BONO: "Bono", UPSELL: "Upsell" } as const;
  const renglon = (rol: keyof typeof ETIQUETA, texto: string) =>
    `<li style="margin:0 0 6px;font-size:14px;color:#374151;"><span style="color:#9a3412;font-weight:700;">${ETIQUETA[rol]}</span> · ${escapeHtml(texto)}</li>`;

  const bloqueApagadas = despublicadas.length === 0 ? "" : `
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:15px;color:#111827;font-weight:700;margin:0 0 8px;">Se apagaron las páginas de más</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">
            Free permite ${topePaginas === 1 ? "una página de venta publicada" : `${topePaginas} páginas de venta publicadas`}, y
            ${quedaron.length === 1 ? "quedó publicada" : "quedaron publicadas"}
            ${quedaron.length === 0 ? "ninguna" : quedaron.map((n) => `<strong>${escapeHtml(n)}</strong>`).join(", ")}.
            Se dejaron prendidas las que más vendieron y, a igual venta, las más antiguas. Esto pasó a borrador:
          </p>
          <ul style="margin:0 0 12px;padding-left:18px;">
            ${despublicadas.map((d) => renglon(d.rol, d.name)).join("")}
          </ul>
          <p style="font-size:13px;color:#7c2d12;line-height:1.6;margin:0;">
            No se borró nada: el archivo, el texto y las ventas de cada una siguen ahí. Podés cambiar
            cuál queda publicada desde Productos, despublicando una y publicando otra.
          </p>
        </div>`;

  const bloqueDominios = !dominios || dominios.length === 0 ? "" : `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="font-size:15px;color:#111827;font-weight:700;margin:0 0 8px;">Tu dominio ahora redirige</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 12px;">
            El dominio propio viene con Pro. No se rompió nada: quien entre por ahí llega igual a tu
            página, por tu dirección de ${escapeHtml(dominioDeLaPlataforma())}.
          </p>
          <ul style="margin:0 0 12px;padding-left:18px;">
            ${dominios.map((d) => `<li style="margin:0 0 6px;font-size:14px;color:#374151;"><strong>${escapeHtml(d.dominio)}</strong> → ${escapeHtml(d.redirigeA.replace(/^https?:\/\//, ""))}</li>`).join("")}
          </ul>
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">
            Si volvés a Pro, vuelve a andar solo, sin tocar nada. Si no, a los ${DIAS_DE_DOMINIO_EN_FREE} días se
            desconecta de nuestro lado y te avisamos antes.
          </p>
        </div>`;

  const boton = APP_URL
    ? `<div style="text-align:center;margin-bottom:24px;">
         <a href="${APP_URL}/digitales/productos" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Ver mis productos</a>
       </div>
       <p style="font-size:14px;color:#374151;text-align:center;margin-bottom:24px;">
         ¿Querés recuperar lo que tenías? <a href="${APP_URL}/digitales/mi-cuenta" style="color:#ea580c;font-weight:700;">Volvé a Starter o Pro</a> cuando quieras.
       </p>`
    : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Tu plan ${planPerdido} terminó — tu cuenta sigue abierta, en Free`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:#9a3412;border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:#fed7aa;font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">Tu plan ${escapeHtml(planPerdido)} terminó</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${hola}</strong>,</p>
        <p style="font-size:15px;color:#374151;line-height:1.6;margin-bottom:24px;">
          No se cerró nada y no perdiste nada: tu cuenta, tus productos y tus ventas están donde
          estaban. Volviste al plan <strong>Free</strong>, así que la comisión por venta sube y las
          funciones pagas quedan apagadas.
        </p>
        ${bloqueApagadas}
        ${bloqueDominios}
        ${boton}
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          ¿Problemas con el pago, o el plan te quedó grande? Respondé este email y lo vemos.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">TiendaApps — tu tienda online profesional</p>
      </div>
    `,
  });
}

/**
 * El dominio propio de quien lleva mucho en Free: primero el aviso de que se
 * va a soltar, después la confirmación de que se soltó.
 *
 * Los dos son el mismo mail con dos tiempos verbales, y viven en una sola
 * función a propósito: si se separan, uno cambia de texto y el otro no, y la
 * persona lee "se va a desconectar el 12" y después "se desconectó el 15".
 *
 * `cuando: "aviso"` es la única vuelta en la que todavía puede hacer algo, así
 * que ahí el botón es volver a Pro. En `"soltado"` el botón lleva a la
 * dirección del producto, para que vea que la página sigue andando.
 */
export async function sendDominioEnFreeEmail({
  to,
  userName,
  cuando,
  fecha,
  dominios,
}: {
  to: string;
  userName: string | null;
  cuando: "aviso" | "soltado";
  /** Cuándo se suelta (aviso) o cuándo se soltó (soltado). */
  fecha: Date;
  /** Cada dominio con el producto al que apuntaba y la dirección que sigue andando. */
  dominios: { dominio: string; producto: string; direccion: string }[];
}) {
  if (!process.env.RESEND_API_KEY) return;

  const hola = escapeHtml(userName?.trim()) || "ahí";
  const dia = fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: AR_TZ });
  const esAviso = cuando === "aviso";
  const uno = dominios.length === 1;

  const lista = dominios.map((d) =>
    `<li style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.5;"><strong>${escapeHtml(d.dominio)}</strong> · ${escapeHtml(d.producto)}<br><span style="font-size:13px;color:#6b7280;">sigue en ${escapeHtml(d.direccion)}</span></li>`,
  ).join("");

  const boton = !APP_URL ? "" : esAviso
    ? `<div style="text-align:center;margin-bottom:24px;">
         <a href="${APP_URL}/digitales/mi-cuenta" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Volver a Pro</a>
       </div>`
    : `<div style="text-align:center;margin-bottom:24px;">
         <a href="${APP_URL}/digitales/productos" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;">Ver mis productos</a>
       </div>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: esAviso
      ? `${uno ? "Tu dominio se desconecta" : "Tus dominios se desconectan"} el ${dia}`
      : `${uno ? "Tu dominio se desconectó" : "Tus dominios se desconectaron"} de TiendaApps`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        <div style="background:${esAviso ? "#9a3412" : "#374151"};border-radius:16px;padding:32px 24px;margin-bottom:28px;text-align:center;">
          <p style="color:${esAviso ? "#fed7aa" : "#d1d5db"};font-size:13px;margin:0 0 6px;font-weight:500;">TiendaApps</p>
          <h1 style="color:#fff;font-size:22px;margin:0;font-weight:800;">${esAviso
            ? `${uno ? "Tu dominio" : "Tus dominios"} se ${uno ? "desconecta" : "desconectan"} el ${dia}`
            : `${uno ? "Tu dominio" : "Tus dominios"} ya no ${uno ? "apunta" : "apuntan"} acá`}</h1>
        </div>
        <p style="font-size:15px;color:#374151;margin-bottom:6px;">Hola <strong>${hola}</strong>,</p>
        <p style="font-size:15px;color:#374151;line-height:1.6;margin-bottom:20px;">
          ${esAviso
            ? `Hace casi ${DIAS_DE_DOMINIO_EN_FREE} días que tu cuenta está en Free, y el dominio propio viene con Pro. Hasta ahora ${uno ? "estuvo redirigiendo" : "estuvieron redirigiendo"} a tu dirección de ${escapeHtml(dominioDeLaPlataforma())}; el <strong>${dia}</strong> ${uno ? "lo desconectamos" : "los desconectamos"} de nuestro lado.`
            : `Tu cuenta lleva ${DIAS_DE_DOMINIO_EN_FREE} días en Free y el dominio propio viene con Pro, así que hoy ${uno ? "lo desconectamos" : "los desconectamos"} de nuestro lado. ${uno ? "Sigue siendo tuyo" : "Siguen siendo tuyos"}: ${uno ? "lo" : "los"} podés apuntar a donde quieras.`}
        </p>
        <ul style="margin:0 0 20px;padding-left:18px;">${lista}</ul>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">
            ${esAviso
              ? `Si volvés a Pro antes de esa fecha, ${uno ? "el dominio sigue andando" : "los dominios siguen andando"} sin que tengas que tocar nada. Después, para usarlo${uno ? "" : "s"} de nuevo hay que conectarlo${uno ? "" : "s"} otra vez desde el panel.`
              : `Tu página no se apagó: la dirección de ${escapeHtml(dominioDeLaPlataforma())} sigue andando igual. Si volvés a Pro, podés conectar el dominio de nuevo desde el panel; como el DNS ya apunta bien, es cuestión de minutos.`}
          </p>
        </div>
        ${boton}
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          ¿Alguna duda? Respondé este email y te contestamos.
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">TiendaApps — tu tienda online profesional</p>
      </div>
    `,
  });
}

/**
 * Un mail de la vendedora a quienes le compraron. Productos Digitales, Pro.
 *
 * ── De quién sale ───────────────────────────────────────────────────────────
 *
 * Sale de NUESTRA dirección (el dominio verificado en Resend es el nuestro)
 * con el nombre de la vendedora adelante, y con `replyTo` a su correo: quien
 * contesta le contesta a ella, no a un buzón nuestro que nadie lee. El
 * nombre se limpia de comillas y de signos: una comilla suelta en el
 * remitente hace que Resend rechace el mail entero.
 *
 * ── La salida ───────────────────────────────────────────────────────────────
 *
 * Las dos cabeceras `List-Unsubscribe` (Gmail las muestra al lado del
 * remitente) y el link del pie. El mismo criterio que el newsletter de
 * tiendas: el botón de irse tiene que estar más a mano que el de spam, porque
 * el de spam lo pagan todas las cuentas, que comparten el dominio.
 *
 * El cuerpo es texto plano de la vendedora, escapado y con los saltos de
 * línea respetados. Nada de HTML de ella: un mail que ella arma con etiquetas
 * es un mail que sale con nuestro dominio y con lo que ella quiera adentro.
 */
export async function sendCorreoACompradoresEmail({
  to,
  saludo,
  asunto,
  cuerpo,
  boton,
  producto,
  vendedor,
  replyTo,
  bajaUrl,
  bajaPostUrl,
}: {
  to: string;
  /** "Hola Ana," — lo arma `saludo` de `correos-compradores`. */
  saludo: string;
  asunto: string;
  cuerpo: string;
  /** El botón, o null. */
  boton: { texto: string; url: string } | null;
  /** Qué compró, para el pie: "porque compraste «X»". Null = "porque le compraste". */
  producto: string | null;
  vendedor: string | null;
  replyTo: string | null;
  bajaUrl: string;
  bajaPostUrl: string;
}): Promise<ResultadoDeEnvio> {
  if (!process.env.RESEND_API_KEY) {
    return { error: { message: "RESEND_API_KEY no configurada" } };
  }

  const quien = (vendedor ?? "").replace(/["<>\r\n]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  const direccion = FROM.match(/<([^>]+)>/)?.[1] ?? FROM;
  const from = quien ? `"${quien} · TiendaApps" <${direccion}>` : FROM;
  const motivo = producto
    ? `Recibís este mail porque compraste «${producto}»${quien ? ` a ${quien}` : ""}.`
    : `Recibís este mail porque le compraste${quien ? ` a ${quien}` : " a esta vendedora"}.`;

  const r = await resend.emails.send({
    from,
    to,
    subject: asunto,
    ...(replyTo ? { replyTo } : {}),
    headers: {
      "List-Unsubscribe": `<${bajaPostUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827;background:#fff;">
        ${quien ? `<p style="font-size:13px;color:#6b7280;margin:0 0 18px;font-weight:600;">${escapeHtml(quien)}</p>` : ""}

        <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 12px;">${escapeHtml(saludo)}</p>
        <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 24px;white-space:pre-wrap;">${escapeHtml(cuerpo)}</p>

        ${boton ? `
        <div style="text-align:center;margin:0 0 28px;">
          <a href="${escapeHtml(boton.url)}"
             style="display:inline-block;background:#111827;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            ${escapeHtml(boton.texto)}
          </a>
        </div>` : ""}

        <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;line-height:1.7;margin:0 0 6px;">${escapeHtml(motivo)}</p>
          <p style="font-size:11px;color:#9ca3af;margin:0;">
            <a href="${escapeHtml(bajaUrl)}" style="color:#6b7280;text-decoration:underline;">No quiero recibir más mails</a>
            &nbsp;·&nbsp; ${quien ? `${escapeHtml(quien)} vende a través de TiendaApps` : "TiendaApps"}
          </p>
        </div>
      </div>
    `,
  });

  return { error: r.error ? { message: r.error.message } : null };
}
