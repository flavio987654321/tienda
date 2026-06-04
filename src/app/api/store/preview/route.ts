import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { slug: true },
  });
  if (!store) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  try {
    const origin = new URL(req.url).origin;
    const ogRes = await fetch(`${origin}/api/og/store/${store.slug}`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!ogRes.ok) return NextResponse.json({ error: "OG fallido" }, { status: 500 });

    const imageBuffer = Buffer.from(await ogRes.arrayBuffer());

    const supabase = createSupabaseAdminClient();
    const path = `tienda-imagenes/previews/${store.slug}.png`;
    const { error: upErr } = await supabase.storage
      .from("tienda-imagenes")
      .upload(path, imageBuffer, { upsert: true, contentType: "image/png" });
    if (upErr) return NextResponse.json({ error: "Upload fallido" }, { status: 500 });

    const { data } = supabase.storage.from("tienda-imagenes").getPublicUrl(path);

    await prisma.store.update({
      where: { ownerId: user.id },
      data: { previewImage: data.publicUrl },
    });

    return NextResponse.json({ ok: true, previewImage: data.publicUrl });
  } catch (err) {
    console.error("[store/preview]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
