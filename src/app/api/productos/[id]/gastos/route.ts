import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore } from "@/lib/products";

type Ctx = { params: Promise<{ id: string }> };

const MAX_GASTOS_PER_VEHICLE = 100;

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId, deletedAt: null },
    select: { id: true, _count: { select: { expenses: true } } },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  if (product._count.expenses >= MAX_GASTOS_PER_VEHICLE) {
    return NextResponse.json({ error: `Podés cargar hasta ${MAX_GASTOS_PER_VEHICLE} gastos por vehículo` }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { concepto, monto, fecha } = body;

  if (typeof concepto !== "string" || concepto.trim().length === 0) {
    return NextResponse.json({ error: "Ingresá un concepto para el gasto" }, { status: 400 });
  }
  if (concepto.trim().length > 100) {
    return NextResponse.json({ error: "El concepto no puede superar 100 caracteres" }, { status: 400 });
  }

  const parsedMonto = parseFloat(monto);
  if (isNaN(parsedMonto) || parsedMonto <= 0) {
    return NextResponse.json({ error: "El monto debe ser un número mayor a 0" }, { status: 400 });
  }

  let parsedFecha: Date | null = null;
  if (fecha) {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "La fecha del gasto no es válida" }, { status: 400 });
    }
    parsedFecha = d;
  }

  const gasto = await prisma.vehicleExpense.create({
    data: {
      productId: id,
      concepto: concepto.trim(),
      monto: parsedMonto,
      fecha: parsedFecha,
    },
  });

  return NextResponse.json({ gasto }, { status: 201 });
}
