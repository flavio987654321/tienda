import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth-session";

export const runtime = "nodejs";

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_DOCUMENT_SIZE_MB = 15;
const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  ...ALLOWED_IMAGE_TYPES,
]);
const DEFAULT_BUCKET = "product-images";

const uploadRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = uploadRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    uploadRateMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function getSupabaseStorageConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;

  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey, bucket };
}

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName) return fromName;
  return file.type.split("/")[1] || "bin";
}

async function uploadToSupabaseStorage(file: File, bytes: ArrayBuffer, folder = "products") {
  const config = getSupabaseStorageConfig();
  if (!config) {
    throw new Error("Falta configurar Supabase Storage en Vercel para subir archivos.");
  }

  const ext = extensionFor(file);
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Demasiadas subidas en poco tiempo. Esperá un momento." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const purpose = String(formData.get("purpose") || "image");
    const isDocument = purpose === "affiliate-doc";
    if (!file) return NextResponse.json({ error: "No se recibio archivo" }, { status: 400 });
    if (isDocument) {
      if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Solo se permiten PDF, Word, Excel, PowerPoint, TXT o imagenes" }, { status: 400 });
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        return NextResponse.json({ error: `El archivo no puede superar ${MAX_DOCUMENT_SIZE_MB} MB` }, { status: 413 });
      }
    } else if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Solo se permiten imagenes JPG, PNG, WEBP o GIF" }, { status: 400 });
    }
    if (!isDocument && file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `La imagen no puede superar ${MAX_FILE_SIZE_MB} MB` }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();

    if (getSupabaseStorageConfig()) {
      const url = await uploadToSupabaseStorage(file, bytes, isDocument ? "affiliate-docs" : "products");
      return NextResponse.json({ url });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Falta configurar Supabase Storage en Vercel para subir archivos." },
        { status: 500 }
      );
    }

    const ext = extensionFor(file);
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
