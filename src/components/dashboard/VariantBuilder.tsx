"use client";
import { useState } from "react";
import Image from "next/image";
import { X, Plus, Camera } from "lucide-react";
import { NombreOpcion } from "@/components/dashboard/NombreOpcion";

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
  sizePlaceholder = "ej: 44, 3XL",
  sizeHint = "Si no encontrás el talle podés crearlo. Escribilo y apretá Enter.",
  onSizeDimChange,
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
  /** El nombre de la segunda dimensión. Es lo que se guarda con la variante. */
  sizeDim?: string;
  sizePlaceholder?: string;
  sizeHint?: string;
  /** Sin esto el nombre es de sólo lectura y el bloque se comporta como antes. */
  onSizeDimChange?: (nombre: string) => void;
  onColorsChange: (c: string[]) => void;
  onSizesChange: (s: string[]) => void;
  onVariantChange: (idx: number, field: "stock" | "price" | "sku" | "lowStockThreshold", val: string) => void;
  /** `valor` es el valor de la opción, no necesariamente un color. */
  onAssignPhoto: (valor: string, imageUrl: string | undefined) => void;
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

  function getVariantPhoto(valor: string): string | undefined {
    return photoImages.find(img => img.variantValue === valor)?.url;
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
          {/* El nombre de la opción es EDITABLE. Antes era un título fijo por
              rubro, así que un collar en una tienda de Moda se guardaba como
              "Talle: 45cm". Se sugiere según la categoría y se puede cambiar. */}
          {onSizeDimChange ? (
            <div className="flex items-center gap-2">
              <NombreOpcion
                valor={sizeDim}
                // La otra dimensión del builder es siempre el color: si acá se
                // escribe "Color", las dos claves se pisan y se pierden los talles.
                otros={["Color"]}
                onCommit={onSizeDimChange}
                ariaLabel="Nombre de la opción"
                className="text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-400">así lo va a ver el comprador</span>
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-700">{sizeDim}</p>
          )}
          <p className="text-xs text-gray-400 mt-1.5">{sizeHint}</p>
          {stdSizes.length > 0 && <p className="text-xs text-gray-400">Sugerencias:</p>}
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

      {/* ── Tabla de variantes generadas ──
          El hueco de las pantallas anchas se llena con el SKU en vez de cortar la
          tabla: cortarla dejaba el vacío del lado derecho, que es peor. El SKU no
          era código muerto —va a los datos estructurados de Google
          (`structured-data.ts`), que lo usa para saber que la misma prenda
          vendida en dos lados es una sola— pero no había dónde escribirlo, así
          que nunca se mandaba. Aparece sólo de `lg` para arriba: ahí el espacio
          ya estaba vacío, y en el celular no suma un campo más que llenar. */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Variantes creadas ({variants.length})
          </p>

          {/* Encabezado. Sólo de sm para arriba: abajo cada número lleva su
              propia etiqueta, porque la fila se parte en dos. */}
          <div className="hidden sm:grid gap-3 px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide sm:grid-cols-[32px_56px_1fr_72px_88px_72px] lg:grid-cols-[32px_56px_1fr_1.4fr_72px_88px_72px]">
            <span />
            <span>Foto</span>
            <span>Variante</span>
            <span
              className="hidden lg:block"
              title="Tu código interno para esta variante (ej: COL-40-BL). Es opcional. Sirve para encontrarla en tu depósito o cruzarla con la lista de tu proveedor, y se lo pasamos a Google para que sepa que la misma prenda vendida en dos lados es un solo producto."
            >
              SKU
            </span>
            <span className="text-center">Stock</span>
            <span>Precio propio</span>
            <span>Alerta</span>
          </div>

          {variants.map((v, idx) => {
            const color = v.attrs["Color"] || "";
            const size = v.attrs[sizeDim] || "";
            const hex = color ? resolveHex(color) : null;
            // A qué valor se le cuelga la foto de esta fila. El color primero
            // —es lo normal: 98 de 107 productos tienen la foto colgada de un
            // color— pero si el producto no tiene colores se usa la otra opción.
            // Antes era `v.attrs["Color"]` a secas, así que una joyería que vende
            // por largo tenía el botón deshabilitado en todas las filas: no había
            // forma de darle una foto al collar de 40cm y otra al de 70cm.
            const valorFoto = color || size;
            const photo = valorFoto ? getVariantPhoto(valorFoto) : undefined;
            return (
              // Las columnas fijas sumaban 320px, más 60 de huecos y 24 de padding:
              // 404px mínimos antes del nombre. En un celular de 360 el ancho útil
              // adentro de la tarjeta es ~280, así que la tabla se desbordaba. El
              // encabezado sí era responsive (`hidden sm:grid`) pero las filas no,
              // o sea que en celular se escondían los títulos y la tabla seguía
              // igual de ancha.
              //
              // Ahora abajo de sm la fila se parte: arriba el color, la foto y el
              // nombre; abajo los tres números con su etiqueta. De sm para arriba
              // `sm:contents` disuelve el envoltorio y todo vuelve a la grilla de
              // seis columnas, sin duplicar el marcado.
              <div
                key={idx}
                className="grid gap-3 items-center px-3 py-2.5 bg-gray-50 rounded-xl grid-cols-[28px_56px_1fr] sm:grid-cols-[32px_56px_1fr_72px_88px_72px] lg:grid-cols-[32px_56px_1fr_1.4fr_72px_88px_72px]"
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
                  onClick={() => valorFoto && setPhotoModal(valorFoto)}
                  title={valorFoto ? `Asignar foto a ${valorFoto}` : ""}
                  disabled={!valorFoto}
                  className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center hover:border-indigo-400 transition-colors relative bg-white disabled:opacity-40"
                >
                  {photo ? (
                    <Image src={photo} alt={valorFoto} fill sizes="56px" style={{ objectFit: "cover" }} />
                  ) : (
                    <Camera className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Nombre de variante. `min-w-0` porque `1fr` es minmax(auto,1fr) y
                    `truncate` no baja el mínimo por sí solo: sin esto un nombre
                    largo ensancha la columna y vuelve el desborde. */}
                <p className="text-sm text-gray-700 truncate min-w-0">
                  {color && <span className="font-medium">{color}</span>}
                  {color && size && <span className="text-gray-400"> · </span>}
                  {size && <span>{size}</span>}
                </p>

                {/* SKU. `hidden lg:block`, así que abajo de lg no es ni un ítem de
                    la grilla y las seis columnas de arriba siguen valiendo. */}
                <input
                  type="text"
                  value={v.sku}
                  onChange={e => onVariantChange(idx, "sku", e.target.value)}
                  placeholder="opcional"
                  aria-label={`SKU de ${[color, size].filter(Boolean).join(" · ")}`}
                  className="hidden lg:block w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />

                {/* Los tres números. En celular, fila propia con etiquetas. */}
                <div className="col-span-3 grid grid-cols-3 gap-2 sm:contents">
                  <label className="sm:contents">
                    <span className="block sm:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Stock</span>
                    <input
                      type="number"
                      value={v.stock}
                      onChange={e => onVariantChange(idx, "stock", e.target.value)}
                      min="0"
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center bg-white"
                    />
                  </label>

                  <label className="sm:contents">
                    <span className="block sm:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Precio</span>
                    <input
                      type="number"
                      value={v.price}
                      onChange={e => onVariantChange(idx, "price", e.target.value)}
                      min="0"
                      placeholder="base"
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </label>

                  <label className="sm:contents">
                    <span className="block sm:hidden text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Alerta</span>
                    <input
                      type="number"
                      value={v.lowStockThreshold}
                      onChange={e => onVariantChange(idx, "lowStockThreshold", e.target.value)}
                      min="0"
                      placeholder="5"
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </label>
                </div>
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
