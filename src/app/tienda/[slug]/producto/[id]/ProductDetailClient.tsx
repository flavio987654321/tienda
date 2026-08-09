"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag, MessageCircle, Check } from "lucide-react";
import { useCartLogic } from "@/hooks/useCartLogic";
import { registrarVista } from "@/lib/registrarVista";
import { getDemoPool, isDemoProductId, parsePromotions, type StorefrontProduct, type PlaceOrderParams, type SeleccionOpciones } from "@/hooks/useStorefront";
import { valoresElegidos } from "@/lib/opciones";
import { buscarVariante } from "@/lib/variantMatch";
import { opcionesVisibles, opcionesAElegir } from "@/lib/opciones";
import type { ActivePromotion } from "@/lib/pricing";
import { resolveProductPromo, describePromo } from "@/lib/promoDisplay";
import { PromoTag, PromoBlock } from "@/components/store/PromoDisplay";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { mapProduct } from "@/lib/productoStorefront";
import type { ProductDetailViewProps } from "@/components/store/templates/productDetail/shared";
import ElectroPrimeDetail from "@/components/store/templates/productDetail/ElectroPrimeDetail";
import TechNovaDetail from "@/components/store/templates/productDetail/TechNovaDetail";
import HomeStudioDetail from "@/components/store/templates/productDetail/HomeStudioDetail";
import CasaClaraDetail from "@/components/store/templates/productDetail/CasaClaraDetail";
import BohoTerraDetail from "@/components/store/templates/productDetail/BohoTerraDetail";
import UrbanPulseDetail from "@/components/store/templates/productDetail/UrbanPulseDetail";

const THEMED_DETAIL: Record<string, React.ComponentType<{ view: ProductDetailViewProps }>> = {
  "electro-prime": ElectroPrimeDetail,
  "tech-nova": TechNovaDetail,
  "home-studio": HomeStudioDetail,
  "casa-clara": CasaClaraDetail,
  "boho-terra": BohoTerraDetail,
  "urban-pulse": UrbanPulseDetail,
};


const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

export default function ProductDetailClient({ slug, productId, productoInicial = null, templateInicial = null }: {
  slug: string;
  productId: string;
  /**
   * El producto ya resuelto en el servidor.
   *
   * Con esto el HTML sale con el nombre, el precio, las fotos y la descripción
   * adentro. Sin esto —como estaba— el servidor mandaba una cáscara vacía y el
   * navegador pedía la tienda entera después: una persona veía un "Cargando…" de
   * un instante, pero el robot de Google se quedaba con la página en blanco, o
   * con el cartel de "Producto no disponible" si no esperaba a que el pedido
   * volviera. Eso último fue lo que terminó indexado como descripción de los
   * productos en el buscador.
   *
   * No reemplaza al pedido del navegador: ese sigue, y trae lo que esto no puede
   * traer —promociones vivas, productos relacionados, el carrito—. Pasa de ser
   * la única fuente a ser el refresco.
   */
  productoInicial?: StorefrontProduct | null;
  /**
   * El template de la tienda, resuelto en el servidor.
   *
   * Sin esto el HTML inicial salia con la ficha generica —el template se sabia
   * recien cuando volvia el pedido del navegador— asi que Google veia la
   * generica igual, y la persona veia un parpadeo al cambiar.
   */
  templateInicial?: string | null;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [promotions, setPromotions] = useState<ActivePromotion[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("Tienda");
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [template, setTemplate] = useState<string | null>(templateInicial);
  const [currency, setCurrency] = useState("ARS");
  const [hasMercadoPago, setHasMercadoPago] = useState(false);
  const [isPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "editor");
  const [isOwner, setIsOwner] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string> | undefined>(undefined);
  const [accentOverride, setAccentOverride] = useState<string | undefined>(undefined);
  const [footerBg, setFooterBg] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFoundLocal, setNotFoundLocal] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const fromEditor = isPreview;
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject("not_found"))
      .then(data => {
        if (!data?.store) { setNotFoundLocal(true); return; }
        if (data.store.id) setStoreId(data.store.id);
        setStoreName(data.store.name ?? "Tienda");
        setHasMercadoPago(!!data.hasMercadoPago);
        setIsOwner(!!data.isOwner);
        try {
          const cfg = JSON.parse(data.store.storeConfig || "{}");
          if (cfg.whatsapp?.enabled && cfg.whatsapp?.number) setWhatsapp(cfg.whatsapp.number);
          if (cfg.template) setTemplate(cfg.template);
          if (cfg.currency) setCurrency(cfg.currency);
          if (cfg.colors?.accent) setAccentOverride(cfg.colors.accent);
          if (cfg.socialLinks) setSocialLinks(cfg.socialLinks);
          if (cfg.sectionColors?.bgFooter) setFooterBg(cfg.sectionColors.bgFooter);
        } catch {}
        setPromotions(parsePromotions(data.store.promotions));
        const real = (data.store.products ?? []).map(mapProduct);
        // Productos demo del editor (ej. "hogar-2"): no existen en la base,
        // se completan con el mismo pool de muestra que usa el home del template.
        if (fromEditor && isDemoProductId(productId) && !real.some((p: StorefrontProduct) => p.id === productId)) {
          setProducts([...real, ...getDemoPool(data.store.tipoTienda)]);
        } else {
          setProducts(real);
        }
      })
      .catch(() => setNotFoundLocal(true))
      .finally(() => setLoading(false));
  }, [slug, productId, isPreview]);

  // El del servidor vale hasta que llegue la lista del navegador, que trae más
  // (promociones aplicadas, stock al día). El orden importa: si `productoInicial`
  // fuera primero, nunca se actualizaría.
  const product = useMemo(
    () => products.find(p => p.id === productId) ?? productoInicial ?? null,
    [products, productId, productoInicial]
  );

  // Contar la vista también acá. Antes solo se contaba al abrir el modal de vista
  // rápida desde la home o el listado, así que quien llegaba directo a esta página
  // —desde Google, desde un link compartido, desde una publicación— no sumaba nada.
  // Era la mitad de los caminos, y justamente la que trae gente de afuera.
  //
  // Se espera a que `isOwner` esté resuelto (viene del fetch de arriba): contar antes
  // sería contarle las visitas al dueño mientras revisa su propia tienda.
  useEffect(() => {
    if (loading || !product) return;
    registrarVista(product.id, slug, isOwner, isPreview);
  }, [loading, product, slug, isOwner, isPreview]);
  const related = useMemo(
    () => products.filter(p => p.id !== productId && p.category === product?.category).slice(0, 6),
    [products, productId, product?.category]
  );

  /**
   * QUINTA copia del mismo buscador, y estaba rota igual que la de
   * `useStorefront`: comparaba `v.value` —que guarda `"M/L / Negro"`— contra el
   * talle o el color sueltos, no coincidía nunca y caía en la primera variante.
   *
   * El arreglo del commit `2eac7e8` cubrió la compra desde el MODAL, pero no
   * esta: comprar desde la ficha de producto seguía descontando stock de la fila
   * equivocada. Ahora las cinco usan `lib/variantMatch.ts`.
   */
  const resolveVariantId = useCallback(
    (p: StorefrontProduct, sel: SeleccionOpciones): string | null =>
      buscarVariante(p.variants, valoresElegidos(sel))?.id ?? null,
    [],
  );

  const validateCoupon = useCallback(async (code: string, subtotal: number, email?: string) => {
    if (!storeId) return { error: "Tienda no disponible" };
    try {
      const res = await fetch("/api/cupones/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), storeId, subtotal, email }),
      });
      return res.json();
    } catch { return { error: "Error de conexión" }; }
  }, [storeId]);

  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<{ ok: boolean; error?: string }> => {
    if (!storeId) return { ok: false, error: "Tienda no disponible" };
    try {
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId, couponId: params.couponId ?? null, items: params.cartItems,
          customer: params.customer, shippingMethod: params.shippingMethod, paymentProvider: params.paymentProvider,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error || "Error al procesar el pedido" };
      return { ok: true };
    } catch { return { ok: false, error: "Error de conexión" }; }
  }, [storeId]);

  // `slug`, `isOwner` e `isPreview` no se pasaban, y sin ellos el hook no puede
  // registrar nada: el embudo se perdía justo los pasos de esta pantalla, que es
  // por donde entra la gente de afuera —Google, un link compartido, una
  // publicación—. Es el mismo agujero que ya había con las vistas de producto y
  // que está documentado en `lib/registrarVista.ts`: se arregló ahí arriba
  // (línea 135) llamando a la función a mano, pero la copia que vive adentro del
  // hook seguía muda. Un carrito que arranca acá contaba como si no existiera.
  //
  // Acá no hace falta esperar a que `isOwner` resuelva, como sí hace el efecto de
  // la vista: eso dispara solo al cargar, y esto dispara cuando la persona toca
  // el botón. Para ese momento la página ya cargó y `isOwner` ya es el de verdad.
  const cart = useCartLogic({ products, promotions, storeId, slug, isOwner, isPreview, resolveVariantId, validateCoupon, placeOrder, lockScrollOnModal: false });
  const {
    seleccion, setSeleccion, setOpcion, qty, setQty,
    addToCart, cartCount, toastMsg, openModal,
  } = cart;

  // Pre-selecciona la primera opción disponible de cada dimensión cuando cambia el producto
  // (ajuste de estado durante el render en vez de un efecto, siguiendo el patrón de React
  // para "resetear estado cuando cambia un prop" sin un render extra innecesario)
  const [lastProductId, setLastProductId] = useState("");
  if (product && productId !== lastProductId) {
    setLastProductId(productId);
    setActiveImg(0);
    // openModal carga el producto en el estado interno del carrito (sin esto,
    // addToCart no tenía ningún producto seleccionado y no hacía nada)
    openModal(product);
    // La ficha NO preelige cuando hay varias opciones: el comprador tiene que
    // elegir a propósito. Sólo se completa lo que no tiene alternativa.
    setSeleccion(Object.fromEntries(
      product.opciones.filter(o => o.valores.length === 1).map(o => [o.nombre, o.valores[0]]),
    ));
  }

  // `&& !product`: con el producto del servidor ya hay algo que mostrar, así que
  // no se tapa la pantalla con "Cargando…" mientras llega el resto. Es lo que
  // hace que el HTML inicial tenga contenido en vez de un cartel.
  if (loading && !product) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Cargando...</div>;
  }
  if (notFoundLocal || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-lg font-semibold text-gray-900">Producto no disponible</p>
        <p className="text-sm text-gray-500">Puede haber sido eliminado o ya no está a la venta.</p>
        <Link href={`/tienda/${slug}/productos`} className="text-sm text-indigo-600 font-medium underline">Ver catálogo completo</Link>
      </div>
    );
  }

  // Falta elegir algo si alguna opción CON alternativas quedó sin responder. Las
  // que tienen un solo valor no cuentan: ahí no hay nada que elegir.
  const canAdd = opcionesAElegir(product.opciones).every(o => !!seleccion[o.nombre]);
  const variantPrice = resolveVariantPrice(product.variants, valoresElegidos(seleccion));
  const displayPrice = variantPrice ?? product.price;
  const discount = !variantPrice && product.comparePrice && product.comparePrice > product.price
    ? Math.round((1 - product.price / product.comparePrice) * 100) : null;
  // Promo de tienda del producto (usa displayPrice para respetar variantes). Alimenta el
  // tag + bloque en la vista genérica y en los detalles temáticos (via ProductDetailViewProps).
  const detailPromo = resolveProductPromo({ id: product.id, price: displayPrice, category: product.category }, promotions);
  const catalogHref = `/tienda/${slug}/productos${isPreview ? "?from=editor" : ""}`;

  const ThemedDetail = template ? THEMED_DETAIL[template] : undefined;
  if (ThemedDetail) {
    const view: ProductDetailViewProps = {
      slug, storeName, currency, whatsapp, product, related, hasMercadoPago,
      isPreview, isOwner, socialLinks, accentOverride, footerBg, cart,
      activeImg, setActiveImg, seleccion, setOpcion,
      canAdd, qty, setQty, addToCart, cartCount, toastMsg, discount, promo: detailPromo, catalogHref,
    };
    return <ThemedDetail view={view} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6">
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Galería */}
          <div>
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-3 relative">
              {detailPromo.primaryPromo ? (
                <PromoTag tipo={detailPromo.primaryPromo.type} label={describePromo(detailPromo.primaryPromo).headline} size="sm" />
              ) : discount ? (
                <div className="absolute top-3 left-3 z-10 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{discount}% OFF</div>
              ) : null}
              {product.images[activeImg] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">Sin imagen</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((url, i) => (
                  <button key={url + i} onClick={() => setActiveImg(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${i === activeImg ? "border-indigo-500" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1.5">{storeName}{product.subcategory ? ` · ${product.subcategory}` : ` · ${product.category}`}</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

            <div className="flex items-baseline gap-3 mb-1 flex-wrap">
              {detailPromo.hasPriceDrop ? (
                <>
                  <span className="text-3xl font-bold text-red-600">{fmt(detailPromo.effectivePrice)}</span>
                  <span className="text-lg text-gray-400 line-through">{fmt(detailPromo.originalPrice)}</span>
                  {detailPromo.pctOff != null && <span className="text-sm font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded">{detailPromo.pctOff}% OFF</span>}
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold text-gray-900">{fmt(displayPrice)}</span>
                  {!variantPrice && product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-lg text-gray-400 line-through">{fmt(product.comparePrice)}</span>
                  )}
                </>
              )}
            </div>
            {detailPromo.primaryPromo && (
              <div className="mb-2"><PromoBlock promo={detailPromo.primaryPromo} freeShippingExtra={detailPromo.freeShipping} /></div>
            )}
            {product.offerNote && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                📋 {product.offerNote}
              </p>
            )}
            <p className="text-xs text-gray-400 mb-6">Pagá en cuotas con tarjeta de crédito</p>

            {/* Un bloque por opción, con el nombre que le puso quien cargó el
                producto. Antes eran dos fijos, y el primero se titulaba "Opción"
                a secas aunque el dato dijera "Talle". */}
            {opcionesVisibles(product.opciones).map(op => (
              <div key={op.nombre} className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{op.nombre}</p>
                {op.tipo === "dato" ? (
                  <p className="text-sm font-semibold text-gray-900">{op.valor}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {op.valores.map(valor => (
                      <button key={valor} onClick={() => setOpcion(op.nombre, valor)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium ${seleccion[op.nombre] === valor ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"}`}>
                        {valor}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-gray-500">−</button>
                <span className="px-3 text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-gray-500">+</button>
              </div>
              {/* 3×2 en vivo: progreso del beneficio N×M según la cantidad. */}
              {detailPromo.nxm && (() => {
                const { n, m } = detailPromo.nxm;
                const paid = qty - Math.floor(qty / n) * (n - m);
                const free = qty - paid;
                const toNext = (n - (qty % n)) % n;
                return (
                  <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${free > 0 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {free > 0
                      ? `🎉 Pagás ${paid} de ${qty}${toNext > 0 ? ` · sumá ${toNext} y otra gratis` : ""}`
                      : `Promo ${n}×${m}: sumá ${toNext} y una gratis`}
                  </span>
                );
              })()}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button onClick={addToCart} disabled={!canAdd}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-xl">
                <ShoppingBag className="h-4 w-4" /> Agregar al carrito
              </button>
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hola! Te consulto sobre ${product.name}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 border border-green-600 text-green-700 font-semibold py-3.5 rounded-xl">
                  <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
                </a>
              )}
            </div>

            {cartCount > 0 && (
              <Link href={`/tienda/${slug}/productos`} className="text-sm text-indigo-600 underline mb-6 inline-block">
                Ver carrito ({cartCount})
              </Link>
            )}

            {product.description && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-1.5">Descripción</p>
                {/* La descripción viene del editor de texto enriquecido, o sea que
                    es HTML. Puesta como texto —que es lo que había— el comprador
                    leía literalmente "<p>Sweater con cuello simulando camisa.</p>",
                    etiquetas incluidas, en la ficha del producto.
                    Se dibuja igual que en los templates y en el modal del
                    catálogo, que ya la tratan como HTML. */}
                <div
                  className="text-sm text-gray-600 leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_a]:text-indigo-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {product.attributes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Especificaciones</p>
                <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
                  {product.attributes.map((a, i) => (
                    <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-500">{a.key}</span>
                      <span className="text-gray-900 font-medium">{a.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <p className="text-lg font-bold text-gray-900 mb-4">También te puede interesar</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {related.map(p => (
                <Link key={p.id} href={`/tienda/${slug}/producto/${p.id}`} className="group">
                  <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-2">
                    {p.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2">{p.name}</p>
                  <p className="text-sm font-semibold text-gray-900">{fmt(p.price)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full flex items-center gap-2 shadow-lg z-50">
          <Check className="h-4 w-4 text-green-400" /> {toastMsg}
        </div>
      )}
    </div>
  );
}
