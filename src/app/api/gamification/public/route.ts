import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_STYLES = {
  popupBg: "#191B1B", textColor: "#ffffff",
  buttonBg: "#d77095", buttonText: "#ffffff",
  couponBg: "#191B1B", couponText: "#d77095",
  spinnerColors: ["#f472b6", "#ec4899", "#db2777", "#be185d", "#9d174d", "#831843"],
  spinnerBorder: "#3A9A22",
  centerBg: "#191B1B", centerBorder: "#3A9A22", centerText: "#d77095",
};

// GET /api/gamification/public?storeId=xxx
// Retorna solo lo necesario para mostrar el widget en la tienda (sin datos privados)
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ widget: null });

  const widget = await prisma.gamificationWidget.findUnique({
    where: { storeId, isActive: true },
    select: {
      id: true,
      type: true,
      title: true,
      subtitle: true,
      buttonText: true,
      reclaimText: true,
      legalText: true,
      headerImage: true,
      centerType: true,
      centerText: true,
      triggerType: true,
      triggerDelay: true,
      showFrequency: true,
      emailRequired: true,
      styles: true,
      prizes: {
        where: { isNoPrize: false },
        orderBy: { order: "asc" },
        select: { id: true, label: true, order: true, isNoPrize: true, probability: true },
      },
    },
  });

  if (!widget) return NextResponse.json({ widget: null });

  // Incluir también premios "sin premio" para la animación de la ruleta
  const allPrizes = await prisma.gamificationPrize.findMany({
    where: { widgetId: widget.id },
    orderBy: { order: "asc" },
    select: { id: true, label: true, order: true, isNoPrize: true },
  });

  let parsedStyles: Record<string, unknown> = {};
  try {
    parsedStyles = JSON.parse(widget.styles);
  } catch {}
  const styles = { ...DEFAULT_STYLES, ...parsedStyles };

  return NextResponse.json({
    widget: { ...widget, styles, prizes: allPrizes },
  });
}
