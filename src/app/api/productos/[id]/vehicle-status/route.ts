import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore } from "@/lib/products";
import { despues } from "@/lib/despues";
import { revisarBusquedas } from "@/lib/busquedasServidor";

type Ctx = { params: Promise<{ id: string }> };

/** Texto libre de la dueña: sólo string, sin caracteres de control, con tope. */
function texto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
  return t || null;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId, deletedAt: null },
    select: { id: true, vehicleStatus: true, isActive: true },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = (await req.json().catch(() => null)) ?? {};
  const { vehicleStatus, soldPrice, soldBuyerName, soldBuyerPhone, soldNotes } = body;

  const VALID = ["AVAILABLE", "RESERVED", "SOLD"];
  if (!VALID.includes(vehicleStatus)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  /* El precio de venta: número (o texto numérico) mayor o igual a 0, o vacío
     (06/10/26). Antes se guardaba lo que llegara y un texto tiraba 500. */
  let precioVenta: number | null = null;
  if (vehicleStatus === "SOLD" && soldPrice != null && soldPrice !== "") {
    const n = typeof soldPrice === "number" ? soldPrice : Number(String(soldPrice).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "El precio de venta tiene que ser un número" }, { status: 400 });
    }
    precioVenta = n;
  }

  /* ── Qué se ve en la tienda (06/10/26) ────────────────────────────────────
     - VENDIDO lo saca de la tienda.
     - RESERVADO lo deja a la vista, con su etiqueta: que se vea movimiento
       vende, y alguien puede querer quedar primero si la reserva se cae.
       Antes lo ocultaba.
     - Volver a DISPONIBLE (o pasar a reservado) lo publica sólo si lo había
       ocultado un estado —vendido, o reservado con la regla vieja—. Si estaba
       disponible y oculto, lo ocultó la dueña a mano: no se toca. Antes
       cualquier vuelta a disponible lo publicaba. */
  const ocultoPorEstado = product.vehicleStatus === "SOLD" || product.vehicleStatus === "RESERVED";
  const isActive = vehicleStatus === "SOLD" ? false : (ocultoPorEstado ? true : product.isActive);

  const vendido = vehicleStatus === "SOLD";
  const updated = await prisma.product.update({
    where: { id },
    data: {
      vehicleStatus,
      soldAt:         vendido ? new Date() : null,
      soldPrice:      vendido ? precioVenta : null,
      soldBuyerName:  vendido ? texto(soldBuyerName, 80) : null,
      soldBuyerPhone: vendido ? texto(soldBuyerPhone, 30) : null,
      soldNotes:      vendido ? texto(soldNotes, 1000) : null,
      isActive,
    },
    select: {
      id: true, vehicleStatus: true, soldAt: true,
      soldPrice: true, soldBuyerName: true, soldBuyerPhone: true, soldNotes: true, isActive: true,
    },
  });

  // Un vendido que vuelve a estar disponible puede ser lo que alguien buscaba.
  if (updated.isActive) despues(() => revisarBusquedas(auth.storeId), "vehículo disponible: búsquedas guardadas");

  return NextResponse.json({ product: updated });
}
