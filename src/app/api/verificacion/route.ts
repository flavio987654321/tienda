import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendVerificationReceivedEmail, sendVerificationNewRequestAdminEmail } from "@/lib/resend";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      isVerified: true,
      verifiedShowName: true,
      verifiedShowCity: true,
      verifiedShowPhone: true,
      verifiedShowSince: true,
      verificationRequest: {
        select: { id: true, status: true, reviewNote: true, createdAt: true },
      },
    },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  return NextResponse.json({ store });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, isVerified: true, verificationRequest: { select: { status: true } } },
  });

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  if (store.isVerified) return NextResponse.json({ error: "La tienda ya está verificada" }, { status: 400 });
  if (store.verificationRequest?.status === "PENDING") {
    return NextResponse.json({ error: "Ya tenés una solicitud en revisión" }, { status: 400 });
  }

  const formData = await req.formData();
  const dniFrontFile = formData.get("dniFront") as File | null;
  const dniBackFile = formData.get("dniBack") as File | null;
  const selfieFile = formData.get("selfie") as File | null;

  if (!dniFrontFile || !dniBackFile || !selfieFile) {
    return NextResponse.json({ error: "Se requieren las 3 imágenes: DNI frente, DNI dorso y selfie" }, { status: 400 });
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (dniFrontFile.size > MAX_SIZE || dniBackFile.size > MAX_SIZE || selfieFile.size > MAX_SIZE) {
    return NextResponse.json({ error: "Cada imagen debe pesar menos de 5MB" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  async function uploadFile(file: File, name: string): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${store!.id}/${name}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("verificaciones")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(`Error al subir ${name}: ${error.message}`);
    return path;
  }

  try {
    const [dniFrontPath, dniBackPath, selfiePath] = await Promise.all([
      uploadFile(dniFrontFile, "dni-frente"),
      uploadFile(dniBackFile, "dni-dorso"),
      uploadFile(selfieFile, "selfie"),
    ]);

    const existing = store.verificationRequest;

    if (existing) {
      await prisma.verificationRequest.update({
        where: { storeId: store.id },
        data: { status: "PENDING", dniFront: dniFrontPath, dniBack: dniBackPath, selfie: selfiePath, reviewNote: null, reviewedAt: null },
      });
    } else {
      await prisma.verificationRequest.create({
        data: { storeId: store.id, dniFront: dniFrontPath, dniBack: dniBackPath, selfie: selfiePath },
      });
    }

    // Email al dueño confirmando recepción + aviso al admin
    sendVerificationReceivedEmail({ to: user.email, userName: user.name ?? "" }).catch(() => {});
    sendVerificationNewRequestAdminEmail({ ownerName: user.name ?? "Sin nombre", ownerEmail: user.email }).catch(() => {});
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "VERIFICACION_ENVIADA",
        title: "Solicitud de verificación recibida",
        body: "Recibimos tus documentos. Los revisaremos en las próximas 24 a 48hs y te avisamos el resultado.",
        link: "/dashboard/perfil",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("VERIFICACION ERROR:", e?.message);
    return NextResponse.json({ error: "No se pudo enviar la solicitud. Intentá de nuevo." }, { status: 500 });
  }
}
