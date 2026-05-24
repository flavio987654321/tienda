"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Check, MessageCircle, Loader2,
  Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.934 1.395 5.608L0 24l6.534-1.376A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.386l-.361-.214-3.741.981.999-3.648-.235-.374A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z" />
  </svg>
);

const TgIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

interface AffiliateData {
  id: string;
  store: { name: string; slug: string };
  commissions?: { amount: number }[];
}

interface Template {
  id: string;
  platform: "whatsapp" | "instagram" | "telegram" | "general";
  tone: "casual" | "profesional" | "urgente";
  label: string;
  text: (ctx: TemplateContext) => string;
}

interface TemplateContext {
  storeName: string;
  link: string;
  productName?: string;
  productPrice?: string;
}

const TEMPLATES: Template[] = [
  // WhatsApp - Casual
  {
    id: "wa-casual-1",
    platform: "whatsapp",
    tone: "casual",
    label: "Presentación de tienda",
    text: ({ storeName, link }) =>
      `Hola! 😊 Quería contarte que estoy vendiendo productos de ${storeName} y son una pasada!\n\nTenés ropa y accesorios buenísimos a precios re accesibles 💕\n\n¡Entrá y mirá! 👇\n${link}`,
  },
  {
    id: "wa-casual-2",
    platform: "whatsapp",
    tone: "casual",
    label: "Producto específico",
    text: ({ storeName, link, productName, productPrice }) =>
      `Mirá este producto de ${storeName} que encontré 👀\n\n✨ ${productName ?? "Producto destacado"}\n💰 $${productPrice ?? "Consultá"}\n\n¡Está hermoso y a buen precio! Te dejo el link 👇\n${link}`,
  },
  {
    id: "wa-urgent-1",
    platform: "whatsapp",
    tone: "urgente",
    label: "Oferta por tiempo limitado",
    text: ({ storeName, link }) =>
      `🔥 ¡ÚLTIMAS UNIDADES en ${storeName}!\n\nNo dejes pasar esto, se están agotando rápido 😱\n\n⚡ Comprá ahora antes de que se acabe:\n${link}\n\n¡Cualquier consulta escribime! 💬`,
  },
  {
    id: "wa-prof-1",
    platform: "whatsapp",
    tone: "profesional",
    label: "Catálogo formal",
    text: ({ storeName, link }) =>
      `Buenas! Te comparto el catálogo actualizado de ${storeName} con todo lo disponible 📋\n\n✅ Envíos a todo el país\n✅ Múltiples medios de pago\n✅ Atención personalizada\n\nConsultá sin compromiso:\n${link}`,
  },
  // Instagram
  {
    id: "ig-caption-1",
    platform: "instagram",
    tone: "casual",
    label: "Caption para feed",
    text: ({ storeName, link, productName }) =>
      `¿Buscando algo lindo? 😍\n\n${productName ? `${productName} de @${storeName.toLowerCase().replace(/\s+/g, "")}` : `La tienda de ${storeName}`} tiene exactamente lo que necesitás ✨\n\nLink en bio para ver todo 👆\n\n#moda #estilo #compraonline #${storeName.toLowerCase().replace(/\s+/g, "")}`,
  },
  {
    id: "ig-story-1",
    platform: "instagram",
    tone: "casual",
    label: "Texto para Story",
    text: ({ storeName, link }) =>
      `¡Mirá lo que encontré! 😍\n${storeName}\n\n👉 Deslizá o link en bio\n\n${link}`,
  },
  {
    id: "ig-caption-2",
    platform: "instagram",
    tone: "urgente",
    label: "Caption oferta",
    text: ({ storeName, link, productName, productPrice }) =>
      `🔥 PRECIO INCREÍBLE 🔥\n\n${productName ? `${productName}` : "Estos productos"} en ${storeName}\n${productPrice ? `Solo $${productPrice} 💸` : ""}\n\n⏰ Stock limitado — Link en bio!\n\n#oferta #descuento #${storeName.toLowerCase().replace(/\s+/g, "")} #moda`,
  },
  // Telegram
  {
    id: "tg-1",
    platform: "telegram",
    tone: "casual",
    label: "Mensaje para grupo",
    text: ({ storeName, link }) =>
      `Hola a todos 👋\n\nLes comparto ${storeName}, una tienda con productos increíbles a muy buen precio 💯\n\n🛍 Comprá con mi link y me ayudás:\n${link}\n\nCualquier duda, ¡pregunten!`,
  },
  // General
  {
    id: "gen-bio-1",
    platform: "general",
    tone: "profesional",
    label: "Bio / descripción de perfil",
    text: ({ storeName, link }) =>
      `Vendedora oficial de ${storeName} 🛍\n💌 Pedidos y consultas: escribime\n🔗 ${link}`,
  },
  {
    id: "gen-email-1",
    platform: "general",
    tone: "profesional",
    label: "Email a contactos",
    text: ({ storeName, link }) =>
      `Hola,\n\nTe escribo para contarte que estoy vendiendo productos de ${storeName}, una tienda con artículos de gran calidad.\n\nPodés ver el catálogo completo en el siguiente enlace:\n${link}\n\nCualquier consulta, estoy a tu disposición.\n\n¡Muchos saludos!`,
  },
];

const PLATFORM_CONFIG = {
  whatsapp:  { label: "WhatsApp",  icon: <WaIcon />, color: "text-green-600 bg-green-50 border-green-200" },
  instagram: { label: "Instagram", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>, color: "text-pink-600 bg-pink-50 border-pink-200" },
  telegram:  { label: "Telegram",  icon: <TgIcon />, color: "text-blue-500 bg-blue-50 border-blue-200" },
  general:   { label: "General",   icon: <MessageCircle className="h-4 w-4" />, color: "text-gray-600 bg-gray-50 border-gray-200" },
};

const TONE_LABELS = {
  casual: "Casual",
  profesional: "Profesional",
  urgente: "Urgente 🔥",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? "bg-green-100 text-green-700" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

function TemplateCard({ template, context }: { template: Template; context: TemplateContext }) {
  const [expanded, setExpanded] = useState(false);
  const text = template.text(context);
  const pCfg = PLATFORM_CONFIG[template.platform];

  return (
    <div className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${pCfg.color}`}>
            {pCfg.icon} {pCfg.label}
          </span>
          <span className="text-xs text-gray-400">{TONE_LABELS[template.tone]}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{template.label}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans bg-gray-50 dark:bg-white/5 rounded-lg p-3 leading-relaxed">
                {text}
              </pre>
              <div className="flex justify-end">
                <CopyButton text={text} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlantillasPage() {
  const { status: sessionStatus } = useAuth();
  const [affiliates, setAffiliates] = useState<AffiliateData[]>([]);
  const [selectedAffId, setSelectedAffId] = useState("");
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [platform, setPlatform] = useState<string>("all");

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/vendedoras/wallet")
      .then((r) => r.json())
      .then((d) => {
        const active = (d.affiliates ?? []).filter((a: any) => a.isActive && a.status === "APPROVED");
        setAffiliates(active);
        setSelectedAffId(active[0]?.id ?? "");
        setLoading(false);
      });
  }, [sessionStatus]);

  const selectedAff = affiliates.find((a) => a.id === selectedAffId);

  const getLink = useCallback(() => {
    if (!selectedAff) return "";
    if (typeof window === "undefined") return `/tienda/${selectedAff.store.slug}?ref=${selectedAff.id}`;
    return `${window.location.origin}/tienda/${selectedAff.store.slug}?ref=${selectedAff.id}`;
  }, [selectedAff]);

  const ctx: TemplateContext = {
    storeName: selectedAff?.store.name ?? "mi tienda",
    link: getLink(),
    productName: productName || undefined,
    productPrice: productPrice || undefined,
  };

  const filtered = platform === "all"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.platform === platform);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/vendedoras" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plantillas de mensajes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Copiá y pegá para vender en cualquier plataforma</p>
          </div>
          <Sparkles className="h-5 w-5 text-indigo-400" />
        </div>

        {affiliates.length === 0 ? (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center">
            <MessageCircle className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No tenés afiliaciones activas</p>
            <p className="text-gray-400 text-sm mt-1">Unite a una tienda para ver tus plantillas personalizadas.</p>
          </div>
        ) : (
          <>
            {/* Config */}
            <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-5 mb-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Personalizar plantillas</p>

              {affiliates.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tienda</label>
                  <select value={selectedAffId} onChange={(e) => setSelectedAffId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {affiliates.map((a) => (
                      <option key={a.id} value={a.id}>{a.store.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Producto <span className="text-gray-300 font-normal">(opcional)</span>
                  </label>
                  <input value={productName} onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ej: Vestido floral"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Precio <span className="text-gray-300 font-normal">(opcional)</span>
                  </label>
                  <input value={productPrice} onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="Ej: 12500"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>

            {/* Filtro por plataforma */}
            <div className="flex gap-2 flex-wrap mb-4">
              {(["all", "whatsapp", "instagram", "telegram", "general"] as const).map((p) => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${platform === p ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400"}`}>
                  {p === "all" ? "Todas" : PLATFORM_CONFIG[p].label}
                </button>
              ))}
            </div>

            {/* Plantillas */}
            <div className="space-y-2">
              {filtered.map((t) => (
                <TemplateCard key={t.id} template={t} context={ctx} />
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center mt-6">
              Tip: personalizá los textos antes de copiarlos para que suenen más auténticos.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
