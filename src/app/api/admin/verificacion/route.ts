import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  if (searchParams.get("count") === "1") {
    const count = await prisma.verificationRequest.count({ where: { status: "PENDING" } });
    return NextResponse.json({ count });
  }

  const requests = await prisma.verificationRequest.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "asc" },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
          owner: { select: { name: true, email: true, city: true, createdAt: true } },
        },
      },
    },
  });

  const supabase = createSupabaseAdminClient();

  const withSignedUrls = await Promise.all(
    requests.map(async (r) => {
      const [front, back, selfie] = await Promise.all([
        supabase.storage.from("verificaciones").createSignedUrl(r.dniFront, 3600),
        supabase.storage.from("verificaciones").createSignedUrl(r.dniBack, 3600),
        supabase.storage.from("verificaciones").createSignedUrl(r.selfie, 3600),
      ]);
      return {
        ...r,
        dniFrontUrl: front.data?.signedUrl ?? null,
        dniBackUrl: back.data?.signedUrl ?? null,
        selfieUrl: selfie.data?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json({ requests: withSignedUrls });
}
