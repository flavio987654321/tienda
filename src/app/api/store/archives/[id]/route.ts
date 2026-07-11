import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { ordersToCsv, couponsToCsv, CSV_BOM, type ArchivedOrder } from "@/lib/storeArchive";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Prisma } from "@prisma/client";

// GET /api/store/archives/[id]?tipo=pedidos|cupones|completo
// Descarga del respaldo interno creado en el cambio de rubro (StoreArchive).
// Los CSV se regeneran desde el snapshot archivado con los mismos generadores
// que usa el export pre-reset, así el dueño recupera sus registros contables
// aunque no los haya descargado en el momento.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  if (!(await checkRateLimit(`archive-download:${user.id}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiadas descargas seguidas. Esperá un minuto." }, { status: 429 });
  }

  const { id } = await params;
  // storeId en el where: un dueño no puede bajar el respaldo de otra tienda
  const archive = await prisma.storeArchive.findFirst({ where: { id, storeId: store.id } });
  if (!archive) return NextResponse.json({ error: "Respaldo no encontrado" }, { status: 404 });

  const date = new Date(archive.createdAt).toISOString().slice(0, 10);
  const rubro = archive.tipoTiendaAnterior.toLowerCase();
  const tipo = req.nextUrl.searchParams.get("tipo") ?? "completo";

  // Las fechas del snapshot son strings tras el JSON.parse; los generadores de
  // CSV las pasan por new Date(), que acepta ambos formatos.
  const data = JSON.parse(archive.data) as {
    orders?: ArchivedOrder[];
    coupons?: Prisma.CouponGetPayload<Record<string, never>>[];
  };

  if (tipo === "pedidos") {
    return new NextResponse(CSV_BOM + ordersToCsv(data.orders ?? []), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="respaldo_pedidos_${rubro}_${date}.csv"`,
      },
    });
  }

  if (tipo === "cupones") {
    return new NextResponse(CSV_BOM + couponsToCsv(data.coupons ?? []), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="respaldo_cupones_${rubro}_${date}.csv"`,
      },
    });
  }

  return new NextResponse(archive.data, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="respaldo_completo_${rubro}_${date}.json"`,
    },
  });
}
