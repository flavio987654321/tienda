import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth-session";

export const runtime = "nodejs";

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DEFAULT_BUCKET = "product-images";

function getSupabaseStorageConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;

  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey, bucket };
}

async function uploadToSupabaseStorage(file: File, bytes: ArrayBuffer) {
  const config = getSupabaseStorageConfig();
  if (!config) {
    throw new Error("Falta configurar Supabase Storage en Vercel para subir imagenes.");
  }

  const ext = file.type.split("/")[1] || "webp";
  const filePath = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${filePath}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: bytes,
  });
  const data = await res.json().catch(() => null) as { error?: string; message?: string } | null;

  if (!res.ok) {
    const message = data?.message || data?.error || "No se pudo subir la imagen a Supabase Storage";
    throw new Error(message);
  }

  return `${config.supabaseUrl}/storage/v1/object/public/${config.bucket}/${filePath}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No se recibio archivo" }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Solo se permiten imagenes JPG, PNG, WEBP o GIF" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `La imagen no puede superar ${MAX_FILE_SIZE_MB} MB` }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();

    if (getSupabaseStorageConfig()) {
      const url = await uploadToSupabaseStorage(file, bytes);
      return NextResponse.json({ url });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Falta configurar Supabase Storage en Vercel para subir imagenes." },
        { status: 500 }
      );
    }

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const buffer = Buffer.from(bytes);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo subir la imagen" },
      { status: 500 }
    );
  }
}
