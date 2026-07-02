"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Check, Loader2, Share2,
  MessageCircle, X as XIcon, Play,
  AlertTriangle, ChevronRight, Globe, Rss,
} from "lucide-react";

const FbIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const IgIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tiendaapps.com";

interface ActiveAffiliate {
  id: string;
  store: { name: string; slug: string; commissionRate: number };
}

/* ── Botón copiar ── */
function CopyButton({ text, label = "Copiar link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {
          const el = document.createElement("textarea");
          el.value = text;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        copied
          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800/40"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "¡Copiado!" : label}
    </button>
  );
}

/* ── Video Card con modal ── */
// Para usar: pasá el videoId de YouTube (solo el ID, ej: "dQw4w9WgXcQ")
// Si no tenés el ID todavía, dejá videoId="" y se muestra placeholder.
function VideoCard({ videoId, title, description }: { videoId: string; title: string; description: string }) {
  const [open, setOpen] = useState(false);
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null;

  return (
    <>
      <button
        onClick={() => videoId && setOpen(true)}
        className={`relative w-full rounded-xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center group ${
          videoId ? "cursor-pointer" : "cursor-default"
        }`}
        aria-label={videoId ? `Reproducir: ${title}` : "Video próximamente"}
      >
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt={title} fill className="object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-gray-900" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-2">
          {videoId ? (
            <div className="w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group-hover:scale-110">
              <Play className="h-6 w-6 text-white fill-white ml-1" />
            </div>
          ) : (
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center">
              <Play className="h-6 w-6 text-white/40 fill-white/40 ml-1" />
            </div>
          )}
          <span className="text-white text-xs font-medium opacity-80">
            {videoId ? "Reproducir tutorial" : "Tutorial próximamente"}
          </span>
        </div>
      </button>
      <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>

      {/* Modal del video */}
      <AnimatePresence>
        {open && videoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-3xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Paso numerado ── */
function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ── Página principal ── */
export default function CanalesPage() {
  const { status: sessionStatus } = useAuth();
  const [affiliates, setAffiliates] = useState<ActiveAffiliate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/vendedoras/wallet")
      .then((r) => r.json())
      .then((d) => {
        type Raw = { id: string; isActive: boolean; status: string; store?: { name: string; slug: string }; commissionRate?: number };
        const active: ActiveAffiliate[] = (d.affiliates ?? [])
          .filter((a: Raw) => a.isActive && a.status === "APPROVED" && a.store)
          .map((a: Raw & { store: { name: string; slug: string; commissionRate?: number } }) => ({
            id: a.id,
            store: {
              name: a.store.name,
              slug: a.store.slug,
              commissionRate: a.store.commissionRate ?? 10,
            },
          }));
        setAffiliates(active);
        setLoading(false);
      });
  }, [sessionStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/afiliados" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis canales</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Conectá tus productos a WhatsApp Business y Facebook para vender más
            </p>
          </div>
        </div>

        {affiliates.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
            <Share2 className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tenés afiliaciones activas</p>
            <p className="text-gray-400 text-sm mt-1">Unite a una tienda para obtener tu feed de productos.</p>
          </div>
        ) : (
          <>
            {/* ── Banner 3 en 1 ── */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4">
              <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1">🚀 Una sola configuración — tres canales de venta</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
                Con el link de feed que te damos, conectás tus productos a <strong>WhatsApp Business</strong>, <strong>Facebook Shop</strong> e <strong>Instagram Shopping</strong> al mismo tiempo. Cada venta te acredita tu comisión automáticamente.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </div>
                <span className="text-gray-300 dark:text-gray-600">+</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  <span className="text-blue-600 dark:text-blue-400"><FbIcon /></span> Facebook
                </div>
                <span className="text-gray-300 dark:text-gray-600">+</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-700 dark:text-pink-400">
                  <span className="text-pink-500"><IgIcon /></span> Instagram
                </div>
              </div>
            </div>

            {/* ── Tu link de catálogo ── */}
            <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <Rss className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Tu feed de productos</p>
                  <p className="text-xs text-gray-400">Pegá este link en Facebook Commerce Manager o WhatsApp Business</p>
                </div>
              </div>

              <div className="space-y-3">
                {affiliates.map((aff) => {
                  const feedUrl = `${APP_URL}/api/vendedoras/feed?affiliateId=${aff.id}`;
                  return (
                    <div key={aff.id} className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{aff.store.name}</p>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                          {aff.store.commissionRate}% comisión
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 font-mono bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5">
                          {feedUrl}
                        </p>
                        <CopyButton text={feedUrl} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Aviso importante */}
              <div className="mt-4 flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>No modifiques este link.</strong> Contiene tu código único. Si lo cambiás, perdés el seguimiento y no cobrás comisión por las ventas generadas.
                </p>
              </div>
            </div>

            {/* ── WhatsApp Business ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">WhatsApp Business</p>
                  <p className="text-xs text-gray-400">Catálogo automático gratis — tus productos en tu WA de negocio</p>
                </div>
              </div>

              {/* Video tutorial */}
              <div className="mb-5">
                {/*
                  IMPORTANTE: Reemplazá el string vacío "" con el ID del video oficial de YouTube.
                  Buscá en YouTube: "WhatsApp Business catálogo productos tutorial" → canal oficial de WhatsApp.
                  Solo copiá el ID (lo que va después de "watch?v=" en la URL).
                */}
                <VideoCard
                  videoId="l4B9olaFgKQ"
                  title="Cómo usar el catálogo en WhatsApp Business"
                  description="Tutorial oficial de WhatsApp — 150K visualizaciones"
                />
              </div>

              {/* Qué necesitás */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Qué necesitás (todo gratis)</p>
                <div className="space-y-1">
                  {[
                    "WhatsApp Business app (Play Store / App Store)",
                    "Una Página de Facebook para tu negocio",
                    "Cuenta en Facebook Business Manager",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <p className="text-xs text-gray-700 dark:text-gray-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pasos */}
              <div className="space-y-4">
                <Step n={1} title="Descargá WhatsApp Business" description="Es gratis en Play Store (Android) o App Store (iPhone). Usá tu número de negocio — puede ser el mismo que el personal si lo transferís." />
                <Step n={2} title="Completá tu perfil de negocio" description="Nombre de tu negocio, categoría, descripción breve y horario de atención. Esto genera confianza en tus clientes." />
                <Step n={3} title="Vinculá tu Página de Facebook" description="En WhatsApp Business: Más opciones → Configuración → Cuenta de empresa → Facebook. Conectá tu página." />
                <Step n={4} title="Creá un catálogo en Facebook Commerce Manager" description="Entrá a business.facebook.com → Commerce Manager → Crear catálogo. En 'Fuentes de datos', elegí 'Feed de datos' y pegá tu link de feed de arriba." />
                <Step n={5} title="¡Listo! El catálogo se sincroniza solo" description="Los productos aparecen en tu WhatsApp Business automáticamente. Cada vez que la tienda actualiza un producto, tu catálogo se actualiza también." />
              </div>
            </motion.div>

            {/* ── Facebook Business ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FbIcon />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Facebook Business + Instagram</p>
                  <p className="text-xs text-gray-400">Tienda online en Facebook e Instagram con tus productos y comisión</p>
                </div>
              </div>

              {/* Video tutorial */}
              <div className="mb-5">
                {/*
                  IMPORTANTE: Reemplazá "" con el ID del video oficial de YouTube.
                  Buscá: "Facebook Commerce Manager catálogo feed datos tutorial" → canal Meta for Business.
                */}
                <VideoCard
                  videoId=""
                  title="Cómo conectar tu catálogo en Facebook Commerce Manager"
                  description="Tutorial oficial Meta for Business — duración aprox. 5 minutos"
                />
              </div>

              {/* Qué necesitás */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Qué necesitás (todo gratis)</p>
                <div className="space-y-1">
                  {[
                    "Cuenta de Facebook personal",
                    "Página de Facebook para tu negocio",
                    "Cuenta en Facebook Business Manager (business.facebook.com)",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <p className="text-xs text-gray-700 dark:text-gray-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pasos */}
              <div className="space-y-4">
                <Step n={1} title="Creá una Página de Facebook" description="Desde tu cuenta personal: Crear → Página. Ponele el nombre de tu negocio o tu nombre como revendedora." />
                <Step n={2} title="Accedé a Facebook Business Manager" description="Entrá a business.facebook.com y creá tu cuenta de negocio. Es gratis y te da acceso a herramientas avanzadas de venta." />
                <Step n={3} title="Abrí Commerce Manager" description="Dentro de Business Manager, buscá 'Commerce Manager' en el menú. Hacé clic en 'Crear catálogo'." />
                <Step n={4} title="Configurá tu fuente de datos" description="Elegí 'Catálogo de productos' → 'Feed de datos'. Pegá tu link de feed de arriba y configurá la actualización en 'Diaria'." />
                <Step n={5} title="Conectá a Instagram (opcional)" description="Si tenés cuenta de Instagram profesional, podés conectar el mismo catálogo para que tus productos aparezcan también en Instagram Shopping." />
              </div>
            </motion.div>

            {/* ── Instagram Shopping ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400">
                  <IgIcon />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Instagram Shopping</p>
                  <p className="text-xs text-gray-400">Se activa solo al conectar Facebook — sin pasos extra</p>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">✅ Sin trabajo extra</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  Si ya configuraste Facebook Commerce Manager con tu feed, Instagram Shopping se habilita solo conectando tu cuenta de Instagram profesional a tu Página de Facebook. No hace falta volver a cargar los productos.
                </p>
              </div>

              <div className="mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Qué necesitás (todo gratis)</p>
                <div className="space-y-1">
                  {[
                    "Cuenta de Instagram (convertida a cuenta profesional — gratis)",
                    "La misma Página de Facebook que usaste en el paso anterior",
                    "Tener el catálogo ya cargado en Facebook Commerce Manager",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                      <p className="text-xs text-gray-700 dark:text-gray-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Step n={1} title="Convertí tu Instagram a cuenta profesional" description="En Instagram: Configuración → Cuenta → Cambiar a cuenta profesional. Elegí 'Creador de contenido' o 'Empresa'. Es gratis y podés revertirlo cuando quieras." />
                <Step n={2} title="Vinculá tu cuenta de Instagram a tu Página de Facebook" description="En Instagram: Configuración → Cuenta → Cuenta vinculada → Facebook. Seleccioná la misma Página que configuraste en el paso anterior." />
                <Step n={3} title="Habilitá Instagram Shopping" description="En Instagram: Configuración → Empresa → Compras. Seguí los pasos para conectar tu catálogo de Facebook. Una vez aprobado (puede tardar 1-3 días), tus productos aparecen en Instagram." />
                <Step n={4} title="Etiquetá productos en tus publicaciones" description="Al publicar una foto, tocá 'Etiquetar productos'. Buscá el producto y la etiqueta aparece en la imagen. Cuando alguien toca la etiqueta, va directo al link de compra con tu código de afiliada." />
              </div>
            </motion.div>

            {/* ── Preguntas frecuentes ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Preguntas frecuentes</p>
              </div>
              <div className="space-y-4">
                {[
                  {
                    q: "¿Tengo que actualizar el catálogo manualmente cuando cambian los productos?",
                    a: "No. El feed se actualiza automáticamente. Facebook Commerce Manager refresca los productos cada 24 horas.",
                  },
                  {
                    q: "¿Cómo sé que la comisión se acredita cuando alguien compra desde mi catálogo?",
                    a: "Cada producto en el catálogo tiene tu link único de afiliada. Cuando el comprador hace click y compra, el sistema detecta tu código y acredita la comisión automáticamente.",
                  },
                  {
                    q: "¿Puedo cambiar el precio de los productos en el catálogo?",
                    a: "No. Los precios los maneja el dueño de la tienda. Si mostrás precios distintos a los reales, podés perder tu cuenta de afiliada. El feed siempre refleja el precio oficial.",
                  },
                  {
                    q: "¿Puedo usar el mismo feed en WhatsApp Y Facebook a la vez?",
                    a: "Sí. Es el mismo link de feed. Podés agregarlo en Facebook Commerce Manager y eso alimenta tanto Facebook como WhatsApp Business al mismo tiempo.",
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="border-b border-gray-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{q}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── Avisos legales ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-bold text-red-800 dark:text-red-300">Reglas del programa</p>
              </div>
              <div className="space-y-2">
                {[
                  "No modifiques los links de producto — son tus códigos de seguimiento y perderías todas las comisiones.",
                  "No publicites precios distintos a los de la tienda. Hacerlo puede suspender tu cuenta de afiliada permanentemente.",
                  "No uses el feed para crear tiendas o catálogos en nombre de las marcas — solo para promover con tu link.",
                  "Cualquier intento de generar clicks o ventas falsas es fraude y resulta en suspensión inmediata y pérdida de comisiones acumuladas.",
                  "El dueño de la tienda puede modificar o discontinuar productos en cualquier momento. Tu catálogo se actualiza automáticamente.",
                ].map((rule) => (
                  <div key={rule} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </>
        )}
      </div>
    </div>
  );
}
