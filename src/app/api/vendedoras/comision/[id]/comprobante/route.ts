import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const commission = await prisma.commission.findUnique({
    where: { id },
    include: {
      affiliate: {
        select: {
          userId: true,
          store: { select: { name: true, slug: true } },
          user: { select: { name: true, email: true } },
        },
      },
      order: { select: { id: true, total: true, createdAt: true } },
    },
  });

  if (!commission || commission.affiliate.userId !== user.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  function escHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  const fecha = new Date(commission.createdAt).toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const fechaOrden = new Date(commission.order.createdAt).toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const afiliado = escHtml(commission.affiliate.user.name ?? commission.affiliate.user.email);
  const tienda = escHtml(commission.affiliate.store.name);
  const statusLabel: Record<string, string> = {
    PAID: "Acreditada",
    PENDING: "Pendiente",
    REVERSED: "Revertida (chargeback)",
    DISBURSED: "Transferida a MercadoPago",
  };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de comisión — TiendaApps</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; }
    .page { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #4f46e5; color: white; padding: 32px; }
    .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 13px; opacity: 0.8; }
    .body { padding: 32px; }
    .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 600; color: #1e293b; text-align: right; max-width: 60%; }
    .total-row { background: #f0fdf4; border-radius: 8px; padding: 16px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-size: 14px; font-weight: 600; color: #15803d; }
    .total-value { font-size: 24px; font-weight: 900; color: #15803d; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .badge.reversed { background: #fee2e2; color: #dc2626; }
    .badge.pending { background: #fef9c3; color: #92400e; }
    @media print {
      body { background: white; padding: 0; }
      .page { box-shadow: none; border-radius: 0; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>Comprobante de comisión</h1>
      <p>TiendaApps · tiendaapps.com</p>
    </div>
    <div class="body">
      <div class="row">
        <span class="label">N° de comisión</span>
        <span class="value" style="font-family:monospace;font-size:12px">${escHtml(commission.id)}</span>
      </div>
      <div class="row">
        <span class="label">Afiliado/a</span>
        <span class="value">${afiliado}</span>
      </div>
      <div class="row">
        <span class="label">Tienda</span>
        <span class="value">${tienda}</span>
      </div>
      <div class="row">
        <span class="label">Fecha de la venta</span>
        <span class="value">${escHtml(fechaOrden)}</span>
      </div>
      <div class="row">
        <span class="label">Fecha de acreditación</span>
        <span class="value">${escHtml(fecha)}</span>
      </div>
      <div class="row">
        <span class="label">N° de orden</span>
        <span class="value" style="font-family:monospace;font-size:12px">${escHtml(commission.order.id)}</span>
      </div>
      <div class="row">
        <span class="label">Monto de la venta</span>
        <span class="value">$${commission.order.total.toLocaleString("es-AR")}</span>
      </div>
      <div class="row">
        <span class="label">Tasa de comisión</span>
        <span class="value">${Number(commission.rate).toFixed(2)}%</span>
      </div>
      <div class="row">
        <span class="label">Estado</span>
        <span class="value">
          <span class="badge ${commission.status === "REVERSED" ? "reversed" : commission.status === "PENDING" ? "pending" : ""}">
            ${escHtml(statusLabel[commission.status] ?? commission.status)}
          </span>
        </span>
      </div>
      <div class="total-row">
        <span class="total-label">Comisión acreditada</span>
        <span class="total-value">$${commission.amount.toLocaleString("es-AR")}</span>
      </div>
    </div>
    <div class="footer">
      <p>Este comprobante es un registro interno de TiendaApps y puede usarse como respaldo para declaraciones ante AFIP.</p>
      <p style="margin-top:6px">TiendaApps · Bacota 1833 (entre Apolo y Juno), Pinamar, Buenos Aires, CP 7167 · marketplacemitienda@gmail.com</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:20px" class="print-btn">
    <button onclick="window.print()" style="background:#4f46e5;color:white;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
      Guardar / Imprimir PDF
    </button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
