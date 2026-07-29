"use client";
import { useState } from "react";
import Image from "next/image";
import { X, Plus, Camera } from "lucide-react";

export type VariantBuilderItem = {
  attrs: Record<string, string>;
  stock: string;
  price: string;
  sku: string;
  lowStockThreshold: string;
};

type ImageItem = { url: string; variantValue?: string };

const BASIC_COLORS: { label: string; hex: string }[] = [
  { label: "Negro",    hex: "#111827" },
  { label: "Blanco",   hex: "#f1f5f9" },
  { label: "Rojo",     hex: "#ef4444" },
  { label: "Azul",     hex: "#3b82f6" },
  { label: "Gris",     hex: "#9ca3af" },
  { label: "Amarillo", hex: "#eab308" },
  { label: "Rosa",     hex: "#ec4899" },
  { label: "Verde",    hex: "#22c55e" },
  { label: "Marrón",   hex: "#92400e" },
  { label: "Naranja",  hex: "#f97316" },
  { label: "Violeta",  hex: "#8b5cf6" },
  { label: "Celeste",  hex: "#67e8f9" },
  { label: "Plata",    hex: "#94a3b8" },
  { label: "Beige",    hex: "#d4b896" },
  { label: "Fucsia",   hex: "#d946ef" },
  { label: "Bordó",    hex: "#881337" },
];

const COLOR_HEX_MAP: Record<string, string> = Object.fromEntries(
  BASIC_COLORS.map(c => [c.label.toLowerCase(), c.hex])
);

function resolveHex(label: string): string {
  if (/^#[0-9a-fA-F]{3,8}$/.test(label)) return label;
  return COLOR_HEX_MAP[label.toLowerCase()] ?? "#6b7280";
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url);
}

export function VariantBuilder({
  colors,
  sizes,
  variants,
  images,
  stdSizes,
  sizeDim = "Talle",
  sizeLabel = "Talles",
  sizePlaceholder = "ej: 44, 3XL",
  sizeHint = "Si no encontrás el talle podés crearlo. Escribilo y apretá Enter.",
  onColorsChange,
  onSizesChange,
  onVariantChange,
  onAssignPhoto,
}: {
  colors: string[];
  sizes: string[];
  variants: VariantBuilderItem[];
  images: ImageItem[];
  stdSizes: string[];
  sizeDim?: string;
  sizeLabel?: string;
  sizePlaceholder?: string;
  sizeHint?: string;
  onColorsChange: (c: string[]) => void;
  onSizesChange: (s: string[]) => void;
  onVariantChange: (idx: number, field: "stock" | "price" | "sku" | "lowStockThreshold", val: string) => void;
  onAssignPhoto: (colorValue: string, imageUrl: string | undefined) => void;
}) {
  const [customColor, setCustomColor] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  const photoImages = images.filter(img => img.url && !isVideoUrl(img.url));

  function toggleColor(label: string) {
    onColorsChange(colors.includes(label) ? colors.filter(c => c !== label) : [...colors, label]);
  }

  function addCustomColor() {
    const v = customColor.trim();
    if (!v || colors.includes(v)) { setCustomColor(""); return; }
    onColorsChange([...colors, v]);
    setCustomColor("");
  }

  function toggleSize(s: string) {
    onSizesChange(sizes.includes(s) ? sizes.filter(x => x !== s) : [...sizes, s]);
  }

  function addCustomSize() {
    const v = customSize.trim();
    if (!v || sizes.includes(v)) { setCustomSize(""); return; }
    onSizesChange([...sizes, v]);
    setCustomSize("");
  }

  function getVariantPhoto(color: string): string | undefined {
    return photoImages.find(img => img.variantValue === color)?.url;
  }

  return (
    <div className="space-y-5">
      {/* ── Colores ── */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Colores</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Si no encontrás el color podés crearlo. Escribilo y apretá Enter.
          </p>
        </div>

        {/* Colores básicos.
            `flex flex-wrap` y no `grid-cols-4`: la grilla le daba a los 16 chips el
            MISMO ancho, y a 368px eso son 62px por chip — de los cuales 40 se los
            llevan el círculo, el padding y el espacio. Con 22px para el texto,
            "Blanco" se veía "Blanc…" y "Amarillo" "Amari…".
            Dejándolos medir lo que necesitan, cada uno ocupa lo suyo y entran de a
            tres o cuatro por fila según el largo del nombre. Es además el mismo
            patrón que ya usan los chips de abajo (los colores ya elegidos). */}
        <div className="flex flex-wrap gap-2">
          {BASIC_COLORS.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => toggleColor(c.label)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                colors.includes(c.label)
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 border border-gray-200"
                style={{ backgroundColor: c.hex }}
              />
              {c.label}
            </button>
          ))}
        </div>

        {/* Input color personalizado */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customColor}
            onChange={e => setCustomColor(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomColor(); } }}
            placeholder="Color personalizado (ej: Turquesa, #FF5500)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button
            type="button"
            onClick={addCustomColor}
            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Chips de colores seleccionados */}
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {colors.map(c => (
              <span
                key={c}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-200 rounded-full text-xs text-indigo-700 font-medium"
              >
                <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: resolveHex(c) }} />
                {c}
                <button
                  type="button"
                  onClick={() => onColorsChange(colors.filter(x => x !== c))}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Segunda dimensión (Talles / Tamaños / etc.) ── */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">{sizeLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sizeHint}</p>
          {stdSizes.length > 0 && <p className="text-xs text-gray-400">{sizeLabel} estándar:</p>}
        </div>

        {/* Grilla de talles estándar */}
        <div className="flex flex-wrap gap-2">
          {stdSizes.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                sizes.includes(s)
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input segunda dimensión personalizada */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customSize}
            onChange={e => setCustomSize(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSize(); } }}
            placeholder={sizePlaceholder}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button
            type="button"
            onClick={addCustomSize}
            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Chips de talles seleccionados (si son personalizados o no están en stdSizes) */}
        {sizes.filter(s => !stdSizes.includes(s)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sizes.filter(s => !stdSizes.includes(s)).map(s => (
              <span
                key={s}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-200 rounded-full text-xs text-indigo-700 font-medium"
              >
                {s}
                <button
                  type="button"
                  onClick={() => onSizesChange(sizes.filter(x => x !== s))}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabla de variantes generadas ── */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Variantes creadas ({variants.length})
          </p>

          {/* Encabezado */}
          <div className="hidden sm:grid gap-3 px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide"
            style={{ gridTemplateColumns: "32px 56px 1fr 72px 88px 72px" }}>
            <span />
            <span>Foto</span>
            <span>Variante</span>
            <span className="text-center">Stock</span>
            <span>Precio propio</span>
            <span>Alerta</span>
          </div>

          {variants.map((v, idx) => {
            const color = v.attrs["Color"] || "";
            const size = v.attrs[sizeDim] || "";
            const hex = color ? resolveHex(color) : null;
            const photo = color ? getVariantPhoto(color) : undefined;
            return (
              <div
                key={idx}
                className="grid gap-3 items-center px-3 py-2.5 bg-gray-50 rounded-xl"
                style={{ gridTemplateColumns: "32px 56px 1fr 72px 88px 72px" }}
              >
                {/* Círculo de color */}
                <span className="flex justify-center">
                  {hex && (
                    <span
                      className="w-5 h-5 rounded-full border border-gray-300 shrink-0"
                      style={{ background: hex }}
                    />
                  )}
                </span>

                {/* Foto / cámara */}
                <button
                  type="button"
                  onClick={() => color && setPhotoModal(color)}
                  title={color ? `Asignar foto a ${color}` : ""}
                  disabled={!color}
                  className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center hover:border-indigo-400 transition-colors relative bg-white disabled:opacity-40"
                >
                  {photo ? (
                    <Image src={photo} alt={color} fill sizes="56px" style={{ objectFit: "cover" }} />
                  ) : (
                    <Camera className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Nombre de variante */}
                <p className="text-sm text-gray-700 truncate">
                  {color && <span className="font-medium">{color}</span>}
                  {color && size && <span className="text-gray-400"> · </span>}
                  {size && <span>{size}</span>}
                </p>

                {/* Stock */}
                <input
                  type="number"
                  value={v.stock}
                  onChange={e => onVariantChange(idx, "stock", e.target.value)}
                  min="0"
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center bg-white"
                />

                {/* Precio propio */}
                <input
                  type="number"
                  value={v.price}
                  onChange={e => onVariantChange(idx, "price", e.target.value)}
                  min="0"
                  placeholder="base"
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />

                {/* Alerta stock */}
                <input
                  type="number"
                  value={v.lowStockThreshold}
                  onChange={e => onVariantChange(idx, "lowStockThreshold", e.target.value)}
                  min="0"
                  placeholder="5"
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de selección de foto ── */}
      {photoModal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setPhotoModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-900 text-sm">
                Seleccioná una imagen para <strong>{photoModal}</strong>
              </p>
              <button
                type="button"
                onClick={() => setPhotoModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {photoImages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                Primero subí fotos del producto (sección de imágenes arriba).
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {photoImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onAssignPhoto(photoModal, img.url);
                      setPhotoModal(null);
                    }}
                    className={`relative w-full rounded-xl overflow-hidden border-2 transition-colors hover:border-indigo-500 ${
                      img.variantValue === photoModal ? "border-indigo-500" : "border-transparent"
                    }`}
                    style={{ aspectRatio: "1" }}
                  >
                    <Image src={img.url} alt={`Foto ${i + 1}`} fill sizes="120px" style={{ objectFit: "cover" }} />
                    {img.variantValue === photoModal && (
                      <span className="absolute top-1 right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                        <svg width={10} height={10} viewBox="0 0 10 10" fill="white">
                          <polyline points="1.5,5 4,7.5 8.5,2.5" strokeWidth={1.5} stroke="white" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {photoImages.some(img => img.variantValue === photoModal) && (
                <button
                  type="button"
                  onClick={() => {
                    onAssignPhoto(photoModal, undefined);
                    setPhotoModal(null);
                  }}
                  className="flex-1 py-2.5 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Quitar foto
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhotoModal(null)}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                ¡Listo!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
