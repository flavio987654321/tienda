"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Plus, Trash2, Loader2, ArrowLeft, ChevronLeft, ChevronRight,
  Upload, X, Star, ShoppingCart, Heart, Tag, Package,
} from "lucide-react";
import Link from "next/link";

const BASE_CATEGORIAS = ["ropa", "joyas", "accesorios", "calzado", "bolsos", "hogar", "belleza", "deporte"];

interface Variant {
  name: string;
  value: string;
  stock: string;
  price: string;
  sku: string;
}

interface Attribute {
  key: string;
  value: string;
}

interface StoreConfig {
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  fontFamily: string;
  buttonStyle: string;
  cardRadius: string;
  cardShadow: string;
  showPrices: boolean;
  showRatings: boolean;
  currency: string;
}

const SHADOW_MAP: Record<string, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};
const RADIUS_MAP: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-3xl",
};

const MAX_SOURCE_IMAGE_SIZE_MB = 20;
const MAX_SOURCE_IMAGE_SIZE_BYTES = MAX_SOURCE_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_UPLOAD_IMAGE_SIZE_MB = 4;
const MAX_UPLOAD_IMAGE_SIZE_BYTES = MAX_UPLOAD_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIDE = 2400;
const MAX_PRODUCT_IMAGES = 5;
const DEFAULT_VARIANT: Variant = { name: "Talle", value: "", stock: "0", price: "", sku: "" };

function safeJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatCategoryLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeImageForUpload(file: File) {
  if (file.size <= MAX_UPLOAD_IMAGE_SIZE_BYTES) return file;

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo leer la imagen"));
      image.src = objectUrl;
    });

    const sourceMaxSide = Math.max(image.width, image.height);
    const baseScale = Math.min(1, MAX_IMAGE_SIDE / sourceMaxSide);
    const outputType = "image/webp";

    for (const scaleFactor of [1, 0.85, 0.7, 0.55]) {
      const scale = baseScale * scaleFactor;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo preparar la imagen");
      ctx.drawImage(image, 0, 0, width, height);

      for (const quality of [0.86, 0.78, 0.7, 0.62, 0.54]) {
        const blob = await canvasToBlob(canvas, outputType, quality);
        if (blob && blob.size <= MAX_UPLOAD_IMAGE_SIZE_BYTES) {
          const name = file.name.replace(/\.[^.]+$/, "") || "producto";
          return new File([blob], `${name}.webp`, { type: outputType });
        }
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  throw new Error(`No pudimos optimizar ${file.name}. Proba con una foto un poco mas liviana.`);
}

async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { url?: string; error?: string };
  } catch {
    return { error: text };
  }
}

function ProductoFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("edit");
  const isEditing = Boolean(editingId);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [error, setError] = useState("");
  const [store, setStore] = useState<StoreConfig>({
    primaryColor: "#6366f1",
    accentColor: "#f59e0b",
    secondaryColor: "#f1f5f9",
    fontFamily: "Inter",
    buttonStyle: "rounded",
    cardRadius: "md",
    cardShadow: "sm",
    showPrices: true,
    showRatings: false,
    currency: "ARS",
  });
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    category: "ropa",
    tags: "",
  });
  const [productCategories, setProductCategories] = useState<string[]>(BASE_CATEGORIAS);
  const [customCategory, setCustomCategory] = useState("");
  const [variants, setVariants] = useState<Variant[]>([DEFAULT_VARIANT]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/configuracion")
      .then((r) => r.json())
      .then((d) => d.store && setStore((p) => ({ ...p, ...d.store })))
      .catch(() => {});

    fetch("/api/productos")
      .then((r) => r.json())
      .then((d) => {
        const categories = Array.from(
          new Set([
            ...BASE_CATEGORIAS,
            ...((d.products || []).map((product: any) => product.category).filter(Boolean) as string[]),
          ])
        );
        setProductCategories(categories);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editingId) return;

    setLoadingProduct(true);
    setError("");
    fetch(`/api/productos/${editingId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el producto");
        return data.product;
      })
      .then((product) => {
        const knownCategory = productCategories.includes(product.category);
        setForm({
          name: product.name || "",
          description: product.description || "",
          price: product.price?.toString() || "",
          comparePrice: product.comparePrice?.toString() || "",
          category: knownCategory ? product.category : "otro",
          tags: safeJsonArray(product.tags).join(", "),
        });
        setCustomCategory(knownCategory ? "" : product.category || "");
        setImages(safeJsonArray(product.images).filter((url) => typeof url === "string") as string[]);
        setCarouselIdx(0);
        setVariants(
          product.variants?.length
            ? product.variants.map((v: any) => ({
                name: v.name || "Talle",
                value: v.value || "",
                stock: v.stock?.toString() || "0",
                price: v.price?.toString() || "",
                sku: v.sku || "",
              }))
            : [DEFAULT_VARIANT]
        );
        setAttributes(safeJsonArray(product.attributes).filter(
          (a: any) => a && typeof a.key === "string" && typeof a.value === "string"
        ) as Attribute[]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el producto"))
      .finally(() => setLoadingProduct(false));
  }, [editingId, productCategories]);

  function updateForm(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function updateVariant(idx: number, field: keyof Variant, value: string) {
    setVariants((p) => p.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  function addVariant() {
    setVariants((p) => [...p, { name: "Talle", value: "", stock: "0", price: "", sku: "" }]);
  }

  function removeVariant(idx: number) {
    setVariants((p) => p.filter((_, i) => i !== idx));
  }

  function addAttribute() {
    setAttributes((p) => [...p, { key: "", value: "" }]);
  }

  function updateAttribute(idx: number, field: keyof Attribute, value: string) {
    setAttributes((p) => p.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  }

  function removeAttribute(idx: number) {
    setAttributes((p) => p.filter((_, i) => i !== idx));
  }

  async function uploadImages(files: File[]) {
    if (!files.length) return;

    const availableSlots = Math.max(0, MAX_PRODUCT_IMAGES - images.length);
    const validFiles = files
      .filter((file) => file.type.startsWith("image/") && file.size <= MAX_SOURCE_IMAGE_SIZE_BYTES)
      .slice(0, availableSlots);

    if (!availableSlots) {
      setError(`Podes subir hasta ${MAX_PRODUCT_IMAGES} imagenes por producto.`);
      return;
    }

    if (!validFiles.length) {
      setError(`Subi imagenes JPG, PNG o WEBP de hasta ${MAX_SOURCE_IMAGE_SIZE_MB} MB.`);
      return;
    }

    setError("");
    setUploadingImg(true);
    try {
      const urls: string[] = [];
      for (const file of validFiles) {
        const uploadFile = await optimizeImageForUpload(file);
        const fd = new FormData();
        fd.append("file", uploadFile);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await readJsonResponse(res);
        if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");
        if (data.url) urls.push(data.url);
      }
      setImages((p) => {
        const next = [...p, ...urls];
        setCarouselIdx(next.length - urls.length);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron subir las imagenes");
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    uploadImages(Array.from(e.target.files || []));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    uploadImages(Array.from(e.dataTransfer.files || []));
  }

  function removeImage(idx: number) {
    setImages((p) => {
      const next = p.filter((_, i) => i !== idx);
      setCarouselIdx((c) => Math.min(c, Math.max(0, next.length - 1)));
      return next;
    });
  }

  function prevImg() {
    setCarouselIdx((c) => (c - 1 + images.length) % images.length);
  }

  function nextImg() {
    setCarouselIdx((c) => (c + 1) % images.length);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");

    const category = form.category === "otro" ? customCategory.trim() : form.category;
    if (!category) {
      setError("Escribi la categoria personalizada.");
      setLoading(false);
      return;
    }

    const res = await fetch(isEditing ? `/api/productos/${editingId}` : "/api/productos", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        images,
        variants: variants.filter((v) => v.value),
        attributes: attributes.filter((a) => a.key.trim() && a.value.trim()),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al guardar");
      setLoading(false);
    } else {
      router.push("/dashboard/productos");
    }
  }

  const btnRadius =
    store.buttonStyle === "square" ? "rounded-lg" :
    store.buttonStyle === "pill" ? "rounded-full" : "rounded-xl";

  const cardRadius = RADIUS_MAP[store.cardRadius] || "rounded-xl";
  const cardShadow = SHADOW_MAP[store.cardShadow] || "shadow-sm";
  const previewCategory = form.category === "otro" ? customCategory.trim() || "otro" : form.category;

  const discount =
    form.comparePrice && form.price && parseFloat(form.comparePrice) > parseFloat(form.price)
      ? Math.round((1 - parseFloat(form.price) / parseFloat(form.comparePrice)) * 100)
      : 0;

  const totalStock = variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/productos" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEditing ? "Editar producto" : "Nuevo producto"}</h1>
            <p className="text-gray-500 mt-0.5">
              {isEditing ? "Actualiza los datos y guarda los cambios" : "Completa los datos y mira la vista previa en tiempo real"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}

        <div className="flex gap-6 flex-1 min-h-0">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5 pb-6">
            {loadingProduct && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando producto...
              </div>
            )}

            {/* Images */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Imagenes del producto</h2>
                <span className="text-xs text-gray-400">{images.length}/{MAX_PRODUCT_IMAGES}</span>
              </div>

              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
              >
                {uploadingImg ? (
                  <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-2" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-300 group-hover:text-indigo-400 mx-auto mb-2 transition-colors" />
                )}
                <p className="text-sm text-gray-500">
                  {uploadingImg ? "Subiendo..." : "Hace clic o arrastra imagenes aqui"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Hasta {MAX_PRODUCT_IMAGES} fotos. JPG, PNG, WEBP - hasta {MAX_SOURCE_IMAGE_SIZE_MB} MB; se optimizan al subir
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {images.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setCarouselIdx(i)}
                      className={`group relative w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        carouselIdx === i ? "border-indigo-500 scale-105" : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Basic info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Informacion basica</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del producto *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  required
                  placeholder="Ej: Remera oversize negra"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripcion</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={3}
                  placeholder="Describi tu producto..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {productCategories.map((c) => (
                      <option key={c} value={c}>{formatCategoryLabel(c)}</option>
                    ))}
                    <option value="otro">Otra categoria</option>
                  </select>
                  {form.category === "otro" && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Escribi la categoria"
                      className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (separados por coma)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => updateForm("tags", e.target.value)}
                    placeholder="negro, oversize, algodon"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Precio */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Precio</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio de venta *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => updateForm("price", e.target.value)}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio tachado (opcional)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input
                      type="number"
                      value={form.comparePrice}
                      onChange={(e) => updateForm("comparePrice", e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              {discount > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                  <Tag className="h-4 w-4" />
                  El cliente vera un descuento del <strong>{discount}%</strong>
                </div>
              )}
            </div>

            {/* Variantes */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Variantes y stock</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Talles, colores, materiales, etc.</p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </button>
              </div>

              {variants.map((variant, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-xl">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                    <select
                      value={variant.name}
                      onChange={(e) => updateVariant(idx, "name", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option>Talle</option>
                      <option>Color</option>
                      <option>Material</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                    <input
                      type="text"
                      value={variant.value}
                      onChange={(e) => updateVariant(idx, "value", e.target.value)}
                      placeholder="Ej: S, M, L"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
                    <input
                      type="number"
                      value={variant.stock}
                      onChange={(e) => updateVariant(idx, "stock", e.target.value)}
                      min="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Precio extra</label>
                    <input
                      type="number"
                      value={variant.price}
                      onChange={(e) => updateVariant(idx, "price", e.target.value)}
                      min="0"
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Atributos adicionales */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Atributos adicionales</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Número de serie, peso, material, dimensiones, etc.</p>
                </div>
                <button
                  type="button"
                  onClick={addAttribute}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </button>
              </div>

              {attributes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Sin atributos. Usá esto para especificar datos técnicos del producto.
                </p>
              )}

              {attributes.map((attr, idx) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del atributo</label>
                    <input
                      type="text"
                      value={attr.key}
                      onChange={(e) => updateAttribute(idx, "key", e.target.value)}
                      placeholder="Ej: Número de serie, Peso, Material"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                    <input
                      type="text"
                      value={attr.value}
                      onChange={(e) => updateAttribute(idx, "value", e.target.value)}
                      placeholder="Ej: ABC-123, 2.5 kg, Algodón"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttribute(idx)}
                    className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors mb-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-2">
              <Link
                href="/dashboard/productos"
                className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar producto"}
              </button>
            </div>
          </form>

          {/* Preview */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Vista previa</p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Tu tienda</span>
              </div>

              {/* Product Card Preview */}
              <div
                className={`bg-white overflow-hidden ${cardRadius} ${cardShadow} border border-gray-100`}
                style={{ fontFamily: store.fontFamily }}
              >
                {/* Image carousel */}
                <div className="relative bg-gray-100 aspect-square overflow-hidden">
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[carouselIdx]}
                        alt=""
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={prevImg}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-white transition-all"
                          >
                            <ChevronLeft className="h-4 w-4 text-gray-700" />
                          </button>
                          <button
                            type="button"
                            onClick={nextImg}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:bg-white transition-all"
                          >
                            <ChevronRight className="h-4 w-4 text-gray-700" />
                          </button>
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                            {images.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setCarouselIdx(i)}
                                aria-label={`Ver imagen ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all ${
                                  i === carouselIdx ? "w-5 bg-white" : "w-1.5 bg-white/60"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <Package className="h-12 w-12 mb-2" />
                      <p className="text-xs">Sin imagen</p>
                    </div>
                  )}

                  {/* Discount badge */}
                  {discount > 0 && (
                    <div
                      className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: store.accentColor }}
                    >
                      -{discount}%
                    </div>
                  )}

                  {/* Wishlist */}
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow hover:scale-110 transition-all"
                  >
                    <Heart className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-3">
                  {images.length > 1 && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {images.map((url, i) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setCarouselIdx(i)}
                          className={`aspect-square overflow-hidden rounded-md border-2 transition ${
                            i === carouselIdx ? "border-indigo-500" : "border-gray-100 opacity-70 hover:opacity-100"
                          }`}
                          aria-label={`Seleccionar imagen ${i + 1}`}
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Category */}
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: store.primaryColor }}>
                    {previewCategory}
                  </p>

                  {/* Name */}
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                    {form.name || "Nombre del producto"}
                  </h3>

                  {/* Ratings */}
                  {store.showRatings && (
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-xs text-gray-400 ml-1">(12)</span>
                    </div>
                  )}

                  {/* Price */}
                  {store.showPrices && (
                    <div className="flex items-baseline gap-2">
                      {form.price ? (
                        <>
                          <span className="text-lg font-bold" style={{ color: store.primaryColor }}>
                            {store.currency} {parseFloat(form.price).toLocaleString("es-AR")}
                          </span>
                          {form.comparePrice && parseFloat(form.comparePrice) > parseFloat(form.price) && (
                            <span className="text-sm text-gray-400 line-through">
                              {store.currency} {parseFloat(form.comparePrice).toLocaleString("es-AR")}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-lg font-bold text-gray-300">$ -</span>
                      )}
                    </div>
                  )}

                  {/* Variants preview */}
                  {variants.filter((v) => v.value).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variants.filter((v) => v.value).slice(0, 4).map((v, i) => (
                        <span
                          key={i}
                          className="text-xs border px-2 py-0.5 rounded-md"
                          style={{ borderColor: store.primaryColor + "40", color: store.primaryColor }}
                        >
                          {v.value}
                        </span>
                      ))}
                      {variants.filter((v) => v.value).length > 4 && (
                        <span className="text-xs text-gray-400">+{variants.filter((v) => v.value).length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Stock indicator */}
                  {totalStock > 0 && totalStock <= 5 && (
                    <p className="text-xs text-orange-500 font-medium">Ultimas {totalStock} unidades!</p>
                  )}

                  {/* CTA */}
                  <button
                    type="button"
                    className={`w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${btnRadius}`}
                    style={{ backgroundColor: store.primaryColor, color: "#fff" }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Agregar al carrito
                  </button>
                </div>
              </div>

              {/* Tags preview */}
              {form.tags && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {form.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Info footer */}
              <div className="mt-4 bg-indigo-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-indigo-700">Resumen del producto</p>
                <div className="flex justify-between text-xs text-indigo-600">
                  <span>Imagenes</span>
                  <span>{images.length} subidas</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-600">
                  <span>Variantes</span>
                  <span>{variants.filter((v) => v.value).length} cargadas</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-600">
                  <span>Stock total</span>
                  <span>{totalStock} unidades</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function NuevoProductoPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="p-6 text-sm text-gray-500">Cargando...</div></DashboardLayout>}>
      <ProductoFormPage />
    </Suspense>
  );
}
