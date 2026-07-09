import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`contacto:${ip}`, 5, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Completá todos los campos obligatorios." }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "El mensaje es muy corto." }, { status: 400 });
  }

  // Captcha al final: un error de campos no consume el token (es de un solo uso)
  if (!(await verifyTurnstile(body.turnstileToken, ip, "contacto"))) {
    return NextResponse.json({ error: "No pudimos verificar que sos una persona. Intentá de nuevo." }, { status: 400 });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return NextResponse.json({ error: "Error de configuración del servidor." }, { status: 500 });
  }

  try {
    await transporter.sendMail({
      from: `"TiendaApps Contacto" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: email,
      subject: `[Contacto] ${subject || "Sin asunto"} — ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px">
          <h2 style="color:#818cf8;margin:0 0 24px">Nuevo mensaje de contacto</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px;width:120px">Nombre</td><td style="padding:8px 0;font-weight:600">${esc(name)}</td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Email</td><td style="padding:8px 0"><a href="mailto:${esc(email)}" style="color:#818cf8">${esc(email)}</a></td></tr>
            ${subject ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Asunto</td><td style="padding:8px 0">${esc(subject)}</td></tr>` : ""}
          </table>
          <div style="margin-top:24px;background:#1e293b;border-radius:12px;padding:20px">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Mensaje</p>
            <p style="margin:0;line-height:1.7;white-space:pre-wrap">${esc(message)}</p>
          </div>
        </div>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el mensaje. Intentá de nuevo." }, { status: 500 });
  }
}
