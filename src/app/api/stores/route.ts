import { NextRequest, NextResponse } from "next/server";
import { listarTiendas } from "@/lib/tiendasDirectorio";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawPage = parseInt(searchParams.get("page") ?? "1");
  const rawLimit = parseInt(searchParams.get("limit") ?? "12");

  return NextResponse.json(
    await listarTiendas({
      page: isNaN(rawPage) ? 1 : rawPage,
      limit: isNaN(rawLimit) ? 12 : rawLimit,
      category: searchParams.get("category") ?? "",
      tipoTienda: searchParams.get("tipoTienda") ?? "",
      featured: searchParams.get("featured") === "true",
      slug: searchParams.get("slug") ?? "",
    })
  );
}
