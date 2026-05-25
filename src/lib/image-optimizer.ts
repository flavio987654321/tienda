// Client-side image optimizer — runs in the browser before upload.
// Converts to WebP and scales down only if needed, preserving maximum quality.

export interface OptimizeOptions {
  maxSidePx?: number;    // max pixel on longest side (default 3000)
  maxBytes?: number;     // max file size in bytes (default 4 MB)
  startQuality?: number; // first quality to try, 0–1 (default 0.92)
}

const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.70, 0.62, 0.54];
const SCALE_STEPS   = [1, 0.85, 0.70, 0.55];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}

export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<File> {
  const maxSidePx  = options.maxSidePx  ?? 3000;
  const maxBytes   = options.maxBytes   ?? 4 * 1024 * 1024;
  const startQuality = options.startQuality ?? 0.92;

  // Si ya es WebP pequeña y no hay que redimensionar, la devolvemos sin tocar.
  // Esto preserva imágenes que ya vienen bien optimizadas.
  if (file.type === "image/webp" && file.size <= maxBytes) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);

    const sourceMax = Math.max(img.width, img.height);
    const baseScale = Math.min(1, maxSidePx / sourceMax);
    const baseName  = file.name.replace(/\.[^.]+$/, "") || "imagen";

    const qualities = QUALITY_STEPS.filter(q => q <= startQuality + 0.01);

    for (const scaleFactor of SCALE_STEPS) {
      const scale  = baseScale * scaleFactor;
      const width  = Math.max(1, Math.round(img.width  * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.drawImage(img, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, quality);
        if (blob && blob.size <= maxBytes) {
          return new File([blob], `${baseName}.webp`, { type: "image/webp" });
        }
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  throw new Error(`No pudimos optimizar "${file.name}". Probá con una imagen más liviana (máx ${Math.round(maxBytes / 1024 / 1024)} MB).`);
}
