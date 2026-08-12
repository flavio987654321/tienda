import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// `Store.storeConfig` es un blob JSON sin dueño: además del diseño guarda cosas
// que escriben otras features y que el editor no conoce.
//
//   diseño            → este schema (editor de /dashboard/configuracion)
//   paymentInfo       → /api/pagos          (CBU, alias, efectivo)
//   shippingMethods   → /api/pagos          (métodos de envío)
//   analytics         → OAuth de Google y Meta, y también campos del editor
//
// Tratarlo como si fuera solo diseño causó dos bugs distintos:
//   1. Guardar el diseño escribía `parsed.data` tal cual, y zod descarta las
//      claves que no están en el schema → cada guardado borraba el CBU y los
//      envíos de la tienda.
//   2. Los tres resets escribían `storeConfig: "{}"`, que además del diseño
//      borraba cobros, envíos y las integraciones conectadas.
//
// Este módulo es el único lugar que sabe qué clave es de quién.
// ─────────────────────────────────────────────────────────────────────────────

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export const storeConfigSchema = z.object({
  template: z.enum(["fashion-noir", "boho-terra", "urban-pulse", "chic-paris", "auto-motor", "auto-drive", "electro-prime", "tech-nova", "home-studio", "casa-clara"]),
  storeName: z.string().max(120),
  storeTagline: z.string().max(200),
  colors: z.object({ accent: z.string().regex(HEX_RE) }),
  whatsapp: z.object({ enabled: z.boolean(), number: z.string().max(30) }),
  socialLinks: z.object({
    instagram: z.string().max(200),
    facebook:  z.string().max(200),
    tiktok:    z.string().max(200),
    youtube:   z.string().max(200),
    pinterest: z.string().max(200),
  }),
  currency: z.enum(["ARS", "USD"]),
  language: z.enum(["ES", "EN"]),
  seo: z.object({ enabled: z.boolean(), title: z.string().max(120), description: z.string().max(320) }),
  analytics: z.object({
    googleAnalyticsId: z.string().max(30).optional(),
    facebookPixelId: z.string().max(30).optional(),
  }).optional(),
  // Espejo de `TextOverride` (src/types/store-config.ts). Zod DESCARTA las claves
  // que no figuran acá: si se agrega un ajuste al panel y se olvida esta lista, se
  // ve bien mientras editás y desaparece al recargar. Los dos archivos se tocan
  // juntos, siempre.
  textOverrides: z.record(z.string(), z.object({
    text: z.string().max(500).optional(),
    color: z.string().max(30).optional(),
    fontFamily: z.string().max(80).optional(),
    // Con topes: sin ellos, un valor absurdo guardado a mano reventaba el diseño y
    // no había forma de notarlo hasta verlo roto. El panel ofrece de 10 a 64.
    fontSize: z.number().min(8).max(200).optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    hidden: z.boolean().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    uppercase: z.boolean().optional(),
    lineHeight: z.number().min(0.7).max(3).optional(),
    letterSpacing: z.number().min(-5).max(20).optional(),
  })),
  // Espejo de `ImageOverride`. Mismo cuidado que arriba: lo que falte acá se
  // guarda bien en pantalla y desaparece al recargar, sin ningún error a la vista.
  imageOverrides: z.record(z.string(), z.object({
    url: z.string().max(2000).optional(),
    overlayType: z.enum(["none", "dark", "light"]).optional(),
    overlayOpacity: z.number().min(0).max(1).optional(),
    posX: z.number().min(0).max(100).optional(),
    posY: z.number().min(0).max(100).optional(),
    // Foco separado para celular (solo lo usan las imágenes a pantalla completa,
    // ej. el banner del hero). Sin esto, zod descartaría el encuadre de celular al
    // guardar: se vería bien en el momento y volvería a posX/posY al recargar.
    posXMobile: z.number().min(0).max(100).optional(),
    posYMobile: z.number().min(0).max(100).optional(),
    // Faltaba: el panel ofrecía "Ocultar texto del slide" desde siempre y Chic
    // Paris lo lee, pero zod lo descartaba al guardar. Se tildaba, el texto
    // desaparecía en el momento, y volvía solo al recargar la tienda.
    hideContent: z.boolean().optional(),
  })),
  // El fondo de una sección puede ser un color (`#0a0a0a`, 7 caracteres) o un
  // degradado ya armado como CSS (`linear-gradient(90deg, #… 20%, #… 100%)`, unos
  // 50). El tope viejo de 30 alcanzaba para el color y cortaba el degradado —y
  // como zod hace fallar el guardado entero, la tienda no habría podido guardar
  // NADA hasta sacarlo a mano de la base.
  sectionColors: z.record(z.string(), z.string().max(200)),
  bannerInterval: z.number().optional(),
  promoBanner: z.object({ enabled: z.boolean(), messages: z.array(z.string().max(120)).max(3).optional() }).optional(),
  previewFill: z.boolean().optional(),
  tipoTienda: z.string().max(30).optional(),
  tieneVentaMayorista: z.boolean().optional(),
  ocultarPreciosPublico: z.boolean().optional(),
  // `featuredCategories` se elimino: filtraba el menu de navegacion, no solo el
  // inicio como decia. Al no estar en el schema, el valor que haya quedado
  // guardado en el JSON de una tienda se descarta en el proximo guardado.
  storeId: z.string().optional(),
  slug: z.string().optional(),
  flyerConfig: z.object({
    enabled: z.boolean(),
    images: z.array(z.string().max(2000)).max(3),
  }).optional(),
  hiddenSections: z.array(z.string().max(60)).optional(),
  sectionOrder: z.array(z.string().max(60)).optional(),
});

export type StoreConfigInput = z.infer<typeof storeConfigSchema>;

/**
 * Claves que el editor de diseño es dueño de escribir. Se derivan del schema y
 * no se listan a mano: una clave nueva en el schema queda cubierta sola, y una
 * clave nueva de otra feature se preserva sola.
 */
const DESIGN_KEYS: ReadonlySet<string> = new Set(Object.keys(storeConfigSchema.shape));

/**
 * `analytics` está en el schema porque el editor tiene campos para pegar los IDs
 * a mano, pero el OAuth de Google y el de Meta escriben la misma clave. Un reset
 * de DISEÑO no puede desconectar una integración —el measurementId se va pero
 * `gaConnectedAt` es una columna aparte y sobrevive, así que la tienda quedaba
 * "conectada" sin medir nada—. Por eso sobrevive al reset aunque sea del schema.
 */
const SURVIVES_RESET: ReadonlySet<string> = new Set(["analytics"]);

function parseConfig(raw: string | null | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    // Un config corrupto o no-objeto se trata como vacío: se pierde lo ajeno,
    // pero es preferible a explotar y dejarla sin poder guardar ni resetear.
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* config ilegible */ }
  return {};
}

/**
 * Config resultante de guardar el diseño: las claves del diseño salen SOLO de
 * `design` —si el editor apagó algo tiene que desaparecer, no sobrevivir— y todo
 * lo ajeno se preserva tal cual estaba.
 */
export function mergeDesignConfig(existingRaw: string | null | undefined, design: StoreConfigInput): string {
  const existing = parseConfig(existingRaw);
  const preserved = Object.fromEntries(
    Object.entries(existing).filter(([key]) => !DESIGN_KEYS.has(key))
  );
  return JSON.stringify({ ...preserved, ...design });
}

/**
 * Config resultante de resetear el diseño: se queda con lo que no es diseño
 * visual (cobros, envíos, integraciones). Antes esto era `"{}"`.
 */
export function stripDesignConfig(existingRaw: string | null | undefined): string {
  const existing = parseConfig(existingRaw);
  const kept = Object.fromEntries(
    Object.entries(existing).filter(([key]) => !DESIGN_KEYS.has(key) || SURVIVES_RESET.has(key))
  );
  return JSON.stringify(kept);
}

/** Qué se conserva un reset de diseño, para poder decirlo en la UI sin mentir. */
export function describeKeptOnReset(existingRaw: string | null | undefined): {
  hasPaymentInfo: boolean;
  shippingMethodsCount: number;
  hasAnalytics: boolean;
} {
  const cfg = parseConfig(existingRaw);
  const analytics = cfg.analytics as { googleAnalyticsId?: string; facebookPixelId?: string } | undefined;
  return {
    hasPaymentInfo: !!cfg.paymentInfo,
    shippingMethodsCount: Array.isArray(cfg.shippingMethods) ? cfg.shippingMethods.length : 0,
    hasAnalytics: !!(analytics?.googleAnalyticsId?.trim() || analytics?.facebookPixelId?.trim()),
  };
}

/** ¿Hay algo que resetear? Sirve para no ofrecer una acción destructiva vacía. */
export function hasDesign(storeConfigRaw: string | null | undefined, pageBlocksRaw: string | null | undefined): boolean {
  const cfg = parseConfig(storeConfigRaw);
  const hasDesignKeys = Object.keys(cfg).some((key) => DESIGN_KEYS.has(key) && !SURVIVES_RESET.has(key));
  let hasBlocks = false;
  try {
    const parsed: unknown = JSON.parse(pageBlocksRaw || "[]");
    const blocks = Array.isArray(parsed) ? parsed : (parsed as { blocks?: unknown[] } | null)?.blocks;
    hasBlocks = Array.isArray(blocks) && blocks.length > 0;
  } catch { /* bloques ilegibles */ }
  return hasDesignKeys || hasBlocks;
}

/**
 * El reset de diseño, en un solo lugar. Existían dos copias divergentes —la de
 * /api/configuracion despublicaba, revalidaba y avisaba a las afiliadas; la de
 * /api/cuenta (Zona de peligro) no hacía nada de eso y dejaba la tienda
 * publicada sin diseño ni forma de cobrar, un estado del que ni siquiera podía
 * salir porque publicar exige template y método de pago.
 *
 * Devuelve lo que el llamador necesita para notificar después del commit.
 */
export async function resetStoreDesign(storeId: string): Promise<{
  slug: string;
  name: string;
  wasPublished: boolean;
}> {
  const before = await prisma.store.findUnique({
    where: { id: storeId },
    select: { storeConfig: true, isPublished: true, name: true },
  });
  if (!before) throw new Error(`resetStoreDesign: tienda ${storeId} no encontrada`);

  const store = await prisma.store.update({
    where: { id: storeId },
    data: {
      storeConfig: stripDesignConfig(before.storeConfig),
      pageBlocks: "[]",
      // Una tienda sin diseño no puede quedar online: el storefront no tendría
      // template que renderizar y publicar exige uno, así que quedaría en un
      // estado del que no se puede salir.
      isPublished: false,
    },
    select: { slug: true },
  });

  return { slug: store.slug, name: before.name, wasPublished: before.isPublished };
}
