"use client";

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { StorefrontProduct, StorefrontVariant, ValidatedCoupon, PlaceOrderParams, SeleccionOpciones } from "./useStorefront";
import { valoresElegidos, reacomodarSeleccion, opcionesDeVariantes, opcionDelValor, opcionesAElegir, combinaciones } from "@/lib/opciones";
import { getEnvioOptions, fmtEnvioPrice, getPagoOptions, crearFmt, claveItem, type CartItem, type CheckoutStatus, type ShippingMethod } from "@/components/store/shared/cartTypes";
import { useAuth } from "@/components/AuthProvider";
import { LIVE_QUOTE_DOMICILIO_ID } from "@/types/store-config";
import { PROVINCIAS_ARGENTINA } from "@/lib/provincias";
import { buscarVariante, varianteTiene } from "@/lib/variantMatch";
import { resolveVariantPrice } from "@/lib/variantPrice";
import { priceCart, resolveBasePrice, parseEscalones, freeShippingProgress, type ActivePromotion } from "@/lib/pricing";
import { couponDiscountFor } from "@/lib/coupons";
import { registrarVista } from "@/lib/registrarVista";
import { registrarPaso } from "@/lib/registrarPaso";

/**
 * El índice de la foto asignada a un valor de opción, o -1.
 *
 * Al cargar el producto se le puede colgar una foto a cada valor. No mira sólo
 * los colores a propósito, y desde 2026-08-05 el formulario tampoco: se le asigna
 * una foto a cualquier opción, así que un collar puede tener la del 40cm y la del
 * 70cm. Hasta entonces esto ya funcionaba y el formulario era lo que no dejaba.
 */
function indiceFotoDe(p: StorefrontProduct, valor: string): number {
  if (!valor) return -1;
  return p.imageItems.findIndex(
    img => !!img.variantValue && img.variantValue.toLowerCase() === valor.toLowerCase(),
  );
}

// Misma lógica de matching de variante por talle/color que usan los templates
// para mostrar "Sin stock"/"Últimas unidades" — se centraliza acá (y se expone
// como `selectedVariantStock`) para que addToCart pueda topar la cantidad al
// stock real, y los templates no necesiten reimplementarla cada uno.
//
// Cuando NINGUNA variante coincide devuelve 0, no `null`. La diferencia era una
// venta cobrada sin descontar stock:
//
//   · `buscarVariante` devuelve `null` si hay varias variantes y ninguna casa —
//     y eso está bien, es lo que evita vender la equivocada.
//   · Pero `null` se leía como "no se puede saber" y se trataba como DISPONIBLE:
//     el botón quedaba prendido y sin techo de cantidad.
//   · En la caja, `checkout/route.ts` sólo descuenta stock `if (variant)`. Con
//     `variantId` en null no entra: el pedido se crea, se cobra, y el stock no se
//     toca. Ni siquiera falla.
//
// Si hay varias variantes y ninguna coincide, esa combinación NO EXISTE, y cero
// es la respuesta honesta. Además la entienden solas las seis pantallas: todas
// apagan el botón y escriben "Sin stock" con `selectedVariantStock === 0`.
//
// Con una sola variante `buscarVariante` siempre la devuelve, así que el `null`
// que queda es únicamente el del producto sin variantes — que se sigue tratando
// como disponible, igual que antes.
function resolveVariantStock(product: StorefrontProduct, seleccion: SeleccionOpciones): number | null {
  const v = buscarVariante(product.variants, valoresElegidos(seleccion));
  if (v) return v.stock;
  return product.variants.length > 1 ? 0 : null;
}

/**
 * Reconstruye la selección a partir de valores sueltos, buscando a qué opción
 * pertenece cada uno.
 *
 * Sirve para los carritos que ya estaban guardados cuando esto cambió: ahí cada
 * ítem tiene `size` y `color` en vez de la selección con nombres. Se resuelve
 * mirando los valores contra las opciones del producto, en vez de suponer que se
 * llamaban "Talle" y "Color" — así también funciona si la dueña las renombró.
 */
function seleccionDesdeValores(p: StorefrontProduct, valores: (string | undefined)[]): SeleccionOpciones {
  const sel: SeleccionOpciones = {};
  for (const valor of valores) {
    if (!valor) continue;
    // Acá estaba escrito el mismo `find` que `opcionDelValor`, palabra por
    // palabra. Las dos están en el camino del carrito guardado: si una cambiaba y
    // la otra no, un carrito viejo se leía distinto según por dónde entrara.
    const nombre = opcionDelValor(p.opciones, valor);
    if (nombre) sel[nombre] = valor;
  }
  return sel;
}

/**
 * Convierte el carrito guardado en localStorage a la forma actual.
 *
 * Sin esto la tienda se caía entera —pantalla de error, no un ítem raro— para
 * cualquiera que tuviera algo en el carrito al momento del cambio: los ítems
 * viejos no tienen `seleccion`, y `Object.values(undefined)` revienta apenas se
 * dibuja el carrito. El carrito se guarda desde siempre y no vence, así que eso
 * alcanzaba a todos los compradores con una compra a medio hacer.
 *
 * Hay dos cosas que arreglar en cada ítem viejo:
 *  - `size`/`color` sueltos → `seleccion` con los nombres reales de las opciones.
 *  - el producto guardado tampoco tiene `opciones`: se rearman desde sus propias
 *    variantes, que sí quedaron guardadas.
 *
 * `variantId` se respeta tal cual: es lo único que viaja al pedido, y ya estaba
 * bien guardado. Lo que se recupera es cómo se muestra y cómo se vuelve a
 * encontrar la variante.
 */
type ItemGuardado = {
  product?: StorefrontProduct & { variants?: StorefrontVariant[] };
  seleccion?: SeleccionOpciones;
  /** Forma vieja: exactamente dos opciones, siempre con estos nombres. */
  size?: string;
  color?: string;
  variantId?: string | null;
  qty?: number;
};

/* ── El carrito es UNO por pestaña, no uno por copia de este hook ─────────────
 *
 * Este hook lo llaman varias pantallas, y algunas conviven en la MISMA. Boho
 * Terra dibuja el catálogo adentro del template: ahí quedaban dos copias vivas al
 * mismo tiempo, cada una con su propio `useState`, cada una con su carrito.
 *
 * Medido en Amaranta, agregando un vestido desde el catálogo:
 *
 *     guardado en el navegador ............. 1 producto
 *     numerito del carrito de la barra ..... (ninguno)
 *
 * O sea: el cliente cargaba cosas y la barra de la tienda le seguía mostrando el
 * carrito vacío. Las dos copias sólo se ponían de acuerdo al RECARGAR la página,
 * porque las dos leen `localStorage` al montar. Y se notaba también en cómo
 * hablan: el carrito de Boho Terra dice "Tu selección" y el del catálogo "Tu
 * carrito", así que la voz propia del template se perdía a mitad de camino.
 *
 * La regla verdadera es "hay UN carrito por pestaña", así que el estado sale de
 * los `useState` y pasa a vivir acá, en el módulo. Todas las copias del hook
 * miran el mismo, y cuando una lo cambia se enteran todas en el acto.
 *
 * `useSyncExternalStore` y no un `useState` con eventos: es la forma que React
 * tiene para exactamente esto —estado que vive afuera de React— y evita la
 * carrera que tendría el bus a mano (una copia leyendo el valor viejo mientras
 * otra ya lo cambió). Es la misma mecánica que ya usa `PushBellContext`.
 *
 * `localStorage` sigue igual y sigue haciendo falta: esto comparte entre las
 * copias que están vivas AHORA; `localStorage` es lo que hace que el carrito
 * siga estando mañana. */
let carritoDelModulo: CartItem[] = [];
const oyentesDelCarrito = new Set<() => void>();

function leerCarrito(): CartItem[] {
  return carritoDelModulo;
}
/* El servidor no tiene carrito. Devuelve SIEMPRE la misma lista vacía —la
   constante, no un `[]` nuevo— porque `useSyncExternalStore` compara por
   identidad y un array nuevo en cada llamada sería un bucle infinito. */
const CARRITO_VACIO: CartItem[] = [];
function leerCarritoEnElServidor(): CartItem[] {
  return CARRITO_VACIO;
}
/* El carrito guardado se lee UNA vez por carga de página.
 *
 * Antes cada copia del hook lo leía al montar, y estaba bien porque cada una
 * tenía el suyo. Ahora que el carrito es compartido, una copia que monta tarde
 * —el catálogo al abrirse adentro del template— estaría pisando el carrito VIVO
 * con lo último que se alcanzó a guardar. En el caso normal es lo mismo, pero
 * "en el caso normal" no es una garantía cuando lo que está en juego es lo que
 * el cliente cargó para comprar. */
let carritoYaRestaurado = false;
function marcarCarritoRestaurado(): boolean {
  if (carritoYaRestaurado) return false;
  carritoYaRestaurado = true;
  return true;
}
function suscribirseAlCarrito(avisar: () => void): () => void {
  oyentesDelCarrito.add(avisar);
  return () => { oyentesDelCarrito.delete(avisar); };
}
/** Misma firma que un `setState`: acepta el valor o una función que lo calcula. */
function guardarCarrito(v: CartItem[] | ((prev: CartItem[]) => CartItem[])): void {
  const siguiente = typeof v === "function" ? (v as (p: CartItem[]) => CartItem[])(carritoDelModulo) : v;
  if (siguiente === carritoDelModulo) return;
  carritoDelModulo = siguiente;
  for (const avisar of oyentesDelCarrito) avisar();
}

function migrarCarritoGuardado(crudo: unknown): CartItem[] {
  if (!Array.isArray(crudo)) return [];
  const salida: CartItem[] = [];
  for (const it of crudo as ItemGuardado[]) {
    const product = it?.product;
    if (!product?.id) continue;

    // El producto guardado antes del cambio no trae `opciones`. Se rearman desde
    // sus variantes con la misma función que usa el resto del storefront.
    const conOpciones: StorefrontProduct = product.opciones
      ? product
      : { ...product, opciones: opcionesDeVariantes(product.variants ?? []) };

    let seleccion = it.seleccion;
    if (!seleccion) {
      seleccion = seleccionDesdeValores(conOpciones, [it.size, it.color]);
      // Si el producto ya no tiene esa variante cargada no hay contra qué buscar
      // el nombre. `size` y `color` eran literalmente el talle y el color, así
      // que ese es el nombre honesto — mejor que perder el dato.
      if (it.size && !Object.values(seleccion).includes(it.size)) seleccion.Talle = it.size;
      if (it.color && !Object.values(seleccion).includes(it.color)) seleccion.Color = it.color;
    }

    salida.push({
      product: conOpciones,
      seleccion,
      variantId: it.variantId ?? null,
      qty: typeof it.qty === "number" && it.qty > 0 ? it.qty : 1,
    });
  }
  return salida;
}

type StorefrontDeps = {
  products: StorefrontProduct[];
  // Promos de tienda vigentes (StorefrontProduct no las trae; llegan por acá desde
  // useStorefront). El motor las aplica al total y define envío gratis / gate de cupón.
  promotions?: ActivePromotion[];
  storeId?: string | null;
  affiliateId?: string | null;
  slug?: string | null;
  isOwner?: boolean;
  // Estamos dentro del editor del dashboard (o de la galería de plantillas), no en
  // la tienda real. Solo se usa para no ensuciar las vistas de producto: el dueño
  // abre veinte veces la vista rápida acomodando la tienda y eso no es tráfico.
  isPreview?: boolean;
  resolveVariantId: (product: StorefrontProduct, seleccion: SeleccionOpciones) => string | null;
  validateCoupon: (code: string, subtotal: number, email?: string) => Promise<{ coupon: ValidatedCoupon; discount: number } | { error: string }>;
  placeOrder: (params: PlaceOrderParams) => Promise<{ ok: boolean; orderId?: string; donationId?: string; error?: string }>;
  checkoutMode?: "cart" | "inquiry";
  isWholesale?: boolean;
  hasMercadoPago?: boolean;
  shippingMethods?: ShippingMethod[] | null;
  // Moneda mostrada en la tienda (ARS/USD) — solo se usa para reportar el valor
  // real de la compra al evento Purchase del Pixel de Meta, si está conectado.
  currency?: string;
  // Las páginas de detalle de producto reusan `openModal` solo para cargar el producto
  // en el estado del carrito (addToCart, seleccion, qty), sin mostrar ningún modal
  // flotante encima — por eso no deben heredar el bloqueo de scroll del body pensado
  // para el quick-view modal del catálogo.
  lockScrollOnModal?: boolean;
};

export function useCartLogic({ products, promotions = [], storeId, affiliateId = null, slug = null, isOwner = false, isPreview = false, resolveVariantId, validateCoupon, placeOrder, checkoutMode = "cart", isWholesale = false, hasMercadoPago = false, shippingMethods, lockScrollOnModal = true, currency = "ARS" }: StorefrontDeps) {
  /* Va arriba de todo porque abajo lo usan `fmtLiveQuote` y el resto del hook.
     Hasta acá `fmt` era la constante en pesos importada del módulo, así que la
     moneda que este hook ya recibía sólo llegaba al evento Purchase del Pixel y
     nunca a los precios en pantalla. */
  const fmt = useMemo(() => crearFmt(currency), [currency]);

  /* Ver el comentario largo arriba de `carritoDelModulo`: el carrito es uno por
     pestaña y no uno por copia de este hook. Todo lo demás de acá abajo sí es de
     cada pantalla —qué ficha está abierta, qué talle se eligió, si el cajón está
     desplegado— y sigue en `useState`. */
  const cartItems = useSyncExternalStore(suscribirseAlCarrito, leerCarrito, leerCarritoEnElServidor);
  /* Sin `useCallback`: `guardarCarrito` vive en el módulo, así que ya es la misma
     función siempre. Envolverla no la haría más estable y además el lint marca
     `useCallback` sobre una función que no se escribe ahí mismo. */
  const setCartItems = guardarCarrito;
  const [cartOpen,       setCartOpen]       = useState(false);
  const [modalProduct,   setModalProduct]   = useState<StorefrontProduct | null>(null);
  const [modalImg,       setModalImg]       = useState(0);
  /** El contenedor que scrollea adentro del modal de producto. Cada template le
   *  cuelga este ref al suyo; `openModal` lo manda arriba al abrir otra ficha. */
  const modalScrollRef = useRef<HTMLDivElement>(null);
  /** Lo elegido en la ficha abierta: `{ Talle: "M", Color: "Negro" }`. */
  const [seleccion,      setSeleccion]      = useState<SeleccionOpciones>({});
  const [qty,            setQty]            = useState(1);
  const [checkoutOpen,   setCheckoutOpen]   = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle");
  const [checkoutError,  setCheckoutError]  = useState("");
  const [envioId,        setEnvioId]        = useState("retiro");
  const [pagoId,         setPagoId]         = useState("transferencia");
  const [coupon,         setCoupon]         = useState("");
  const [couponError,    setCouponError]    = useState("");
  // El campo de cupón arranca plegado detrás de un link (ver CheckoutModal). Vive
  // acá y no en cada checkout para que el listado y los templates se comporten igual.
  const [cuponAbierto,   setCuponAbierto]   = useState(false);
  // Se guardan las REGLAS del cupón, no el monto que descontó al aplicarlo: ese
  // número envejece apenas cambia el carrito. El monto se deriva más abajo.
  const [appliedCoupon,  setAppliedCoupon]  = useState<{ id: string; code: string; discountType: string; discountValue: number; minOrderAmount: number } | null>(null);
  const [notas,          setNotas]          = useState("");
  const [rememberData,   setRememberData]   = useState(false);
  const [buyerForm,      setBuyerForm]      = useState({ nombre:"", email:"", telefono:"", direccion:"", ciudad:"", provincia:"", cp:"" });
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [favorites,      setFavorites]      = useState<string[]>([]);
  const [favoritesOpen,  setFavoritesOpen]  = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [toastMsg,       setToastMsg]       = useState<string | null>(null);
  const [acceptedTerms,  setAcceptedTerms]  = useState(false);
  const [donationEnabled, setDonationEnabled] = useState(false);
  const [donationAmount,  setDonationAmount]  = useState(1000);
  // El toggle de "¿Donar?" del checkout solo tiene sentido si hay una
  // canasta ACTIVE recibiendo donaciones — si no hay ninguna, o ya se
  // completó, el backend de /api/checkout ignora el aporte en silencio, así
  // que ocultamos el toggle entero para no dejar donar "al aire".
  const [canastaDisponible, setCanastaDisponible] = useState(false);
  const [liveQuote, setLiveQuote] = useState<{
    status: "idle" | "loading" | "unavailable" | "ready";
    domicilio: number | null;
    sucursal: number | null;
  }>({ status: "idle", domicilio: null, sucursal: null });

  const userDropdownRef = useRef<HTMLDivElement>(null);
  // `addingToCartRef` vivía acá como guarda contra el doble click. No podía
  // dispararse nunca: se prendía y se apagaba dentro del mismo tick, sin nada
  // asíncrono en el medio, así que para cuando llegaba el segundo click ya estaba
  // apagada. Tampoco hacía falta — `setCartItems` junta por `claveItem`, así que
  // dos clicks suman cantidad, que es lo que la persona pidió.
  /** La última foto la movió el código, no el comprador. Ver `setOpcion`. */
  const fotoAutomaticaRef = useRef(false);
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Si el comprador llegó por link de afiliado, forzar MP como único método de pago.
  // `affiliateId` arranca en null y se completa recién después del montaje (useStorefront
  // lee `?ref=` de la URL en su propio efecto) — no hay forma de calcular esto en el
  // render inicial, así que sincronizarlo con un efecto es el patrón correcto acá.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (affiliateId) setPagoId("mercadopago");
  }, [affiliateId]);

  useEffect(() => {
    fetch("/api/canasta/campaign")
      .then((r) => r.json())
      .then((d) => setCanastaDisponible(d?.campaign?.status === "ACTIVE"))
      .catch(() => {});
  }, []);

  // Restaurar carrito y datos del comprador desde localStorage. Es una lectura
  // de un sistema externo al montar (no hay forma de leer localStorage durante
  // el render en el servidor), así que corresponde hacerlo en un efecto.
  useEffect(() => {
    try {
      // Sólo la primera copia que monta. Ver `marcarCarritoRestaurado`.
      const savedCart = marcarCarritoRestaurado() ? localStorage.getItem("storefront_cart") : null;
      /* Sin `eslint-disable` acá: desde que el carrito vive en el módulo, esto ya
         no es un `setState` de React y la regla no aplica. El de abajo sí lo es y
         lo lleva. */
      if (savedCart) setCartItems(migrarCarritoGuardado(JSON.parse(savedCart)));
      const savedBuyer = localStorage.getItem("storefront_buyer");
      if (savedBuyer) {
        const parsed = JSON.parse(savedBuyer);
        // Compradores que guardaron sus datos antes de que "provincia" pasara
        // a ser un código ISO (ej: "B") tienen ahí texto libre (ej: "Buenos
        // Aires") que no matchea ninguna opción del <select> — se limpia para
        // que no quede un valor inválido sin que el comprador lo note.
        if (parsed?.provincia && !PROVINCIAS_ARGENTINA.some((p) => p.code === parsed.provincia)) {
          parsed.provincia = "";
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura de localStorage al montar, no hay otra forma
        setBuyerForm(parsed);
        setRememberData(true);
      }
    } catch {}
  }, []);

  // Cargar favoritos: desde API si está logueado, desde localStorage si no
  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") {
      fetch("/api/favoritos")
        .then(r => r.ok ? r.json() : [])
        .then((data: { productId: string }[]) => setFavorites(data.map(f => f.productId)))
        .catch(() => {});
    } else {
      try {
        const savedFavs = localStorage.getItem("storefront_favorites");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura de localStorage al montar, no hay otra forma
        if (savedFavs) setFavorites(JSON.parse(savedFavs));
      } catch {}
    }
  }, [status]);

  useEffect(() => {
    try { localStorage.setItem("storefront_cart", JSON.stringify(cartItems)); } catch {}
  }, [cartItems]);

  // Solo persistir en localStorage cuando no está logueado
  useEffect(() => {
    if (status === "authenticated") return;
    try { localStorage.setItem("storefront_favorites", JSON.stringify(favorites)); } catch {}
  }, [favorites, status]);

  useEffect(() => {
    try {
      if (rememberData) localStorage.setItem("storefront_buyer", JSON.stringify(buyerForm));
      else localStorage.removeItem("storefront_buyer");
    } catch {}
  }, [buyerForm, rememberData]);

  // Embudo: abrió el checkout.
  //
  // Va como efecto sobre el estado y no pegado a los `setCheckoutOpen(true)`:
  // el botón de finalizar está en seis templates y en el carrito compartido, así
  // que enganchar cada llamada era garantizar que la próxima pantalla que se
  // agregue no cuente. Lo que importa es que el checkout se abrió, y eso es
  // exactamente lo que dice esta variable.
  useEffect(() => {
    if (checkoutOpen) registrarPaso("checkout", slug, isOwner, isPreview);
  }, [checkoutOpen, slug, isOwner, isPreview]);

  // Carrito abandonado: si ya escribió un email válido en el checkout pero
  // todavía no completó la compra, guardamos un snapshot para poder mandarle
  // un recordatorio más tarde. No aplica a "inquiry" (tiendas sin carrito real).
  useEffect(() => {
    if (checkoutMode !== "cart" || !storeId || cartItems.length === 0) return;
    const email = buyerForm.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    const timeout = setTimeout(() => {
      const total = cartItems.reduce((s, i) => s + i.product.price * i.qty, 0);
      fetch("/api/cart/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          email,
          name: buyerForm.nombre,
          phone: buyerForm.telefono,
          total,
          items: cartItems.map((i) => ({
            productId: i.product.id,
            variantId: i.variantId,
            name: i.product.name,
            image: i.product.images[0] ?? null,
            price: i.product.price,
            qty: i.qty,
            // Se sigue mandando `size`/`color` porque así están guardadas las filas
            // que ya existen y así las restaura el link de recuperación. Nadie las
            // LEE río abajo —el email de carrito abandonado usa sólo nombre, precio
            // y cantidad—, así que con los dos primeros valores alcanza.
            size: Object.values(i.seleccion)[0] ?? "",
            color: Object.values(i.seleccion)[1] ?? "",
          })),
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerForm.email, buyerForm.nombre, buyerForm.telefono, storeId, checkoutMode, JSON.stringify(cartItems.map((i) => [i.product.id, i.qty]))]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userDropdownOpen]);

  /* ── Escape cierra lo que esté abierto ─────────────────────────────────────
   *
   * Antes cerraba SÓLO el buscador y la ficha. Medido en la tienda: el carrito,
   * el cajón de favoritos y el menú de la cuenta se quedaban abiertos.
   *
   * Y estaba justo al revés de lo otro: el buscador cierra con Escape pero NO
   * con un clic afuera, y esos tres cierran con un clic afuera pero NO con
   * Escape. O sea que ninguno cerraba de las dos formas, y cuál servía dependía
   * de cuál hubieras abierto. Nadie puede aprender eso.
   *
   * Se cierra UNO POR VEZ, el de más arriba, en vez de todos de una: si algún día
   * se abren dos cosas superpuestas, un Escape tiene que sacar la de encima y
   * dejar la de abajo, que es lo que hace cualquier programa.
   *
   * La última línea es la de antes, tal cual: el buscador y la ficha juntos. Son
   * los dos que nunca están abiertos a la vez, y así el cambio no toca lo que ya
   * andaba en los diez templates. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (userDropdownOpen) { setUserDropdownOpen(false); return; }
      if (cartOpen)         { setCartOpen(false);         return; }
      if (favoritesOpen)    { setFavoritesOpen(false);    return; }
      setSearchOpen(false); setModalProduct(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [userDropdownOpen, cartOpen, favoritesOpen]);

  const savedScrollY = useRef(0);
  // true solo mientras el modal estuvo abierto en esta instancia — evita
  // que el scrollTo(0,0) se dispare en el montaje inicial o en previews
  const modalWasOpen = useRef(false);

  // Bloquear scroll del body cuando el modal está abierto (fix iOS Safari)
  useEffect(() => {
    if (!lockScrollOnModal) return;
    if (modalProduct) {
      modalWasOpen.current = true;
      savedScrollY.current = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${savedScrollY.current}px`;
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      // solo restaura si el modal realmente estuvo abierto en esta instancia
      if (modalWasOpen.current) {
        window.scrollTo(0, savedScrollY.current);
        modalWasOpen.current = false;
      }
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [modalProduct, lockScrollOnModal]);

  // Cotización en vivo (Envíopack): se dispara cuando hay un método liveQuote
  // habilitado y el comprador ya escribió un CP con pinta de válido. Debounced
  // para no spamear el endpoint en cada tecla.
  const liveQuoteMethods = (shippingMethods ?? []).filter((m) => m.liveQuote && m.enabled);
  useEffect(() => {
    if (liveQuoteMethods.length === 0 || !storeId) return;
    const cp = buyerForm.cp.trim();
    const provincia = buyerForm.provincia.trim();
    if (cp.length < 4 || !provincia || cartItems.length === 0) {
      // El destino dejó de ser válido (ej: el comprador borró el CP después
      // de tener una cotización) — no dejar el precio viejo mostrándose.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLiveQuote({ status: "idle", domicilio: null, sucursal: null });
      return;
    }

    setLiveQuote((q) => ({ ...q, status: "loading" }));
    const timeout = setTimeout(() => {
      fetch("/api/envios/cotizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          destinationPostalCode: cp,
          destinationProvince: provincia,
          items: cartItems.map((i) => ({ productId: i.product.id, quantity: i.qty })),
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.available) {
            setLiveQuote({ status: "ready", domicilio: data.domicilio ?? null, sucursal: data.sucursal ?? null });
          } else {
            setLiveQuote({ status: "unavailable", domicilio: null, sucursal: null });
          }
        })
        .catch(() => setLiveQuote({ status: "unavailable", domicilio: null, sucursal: null }));
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerForm.cp, buyerForm.provincia, storeId, JSON.stringify(cartItems.map((i) => [i.product.id, i.qty]))]);

  function getLiveQuotePrice(methodId: string): number | null {
    if (liveQuote.status !== "ready") return null;
    if (methodId === LIVE_QUOTE_DOMICILIO_ID) return liveQuote.domicilio;
    return null;
  }

  function fmtLiveQuote(methodId: string): string {
    if (liveQuote.status === "loading") return "Calculando...";
    const price = getLiveQuotePrice(methodId);
    if (price != null) return fmt(price);
    return "A coordinar"; // unavailable (Fase A) o sin CP todavía
  }

  // Stock de la variante (talle/color) actualmente seleccionada en el modal de
  // producto — calculado una sola vez acá para que los templates no necesiten
  // reimplementar el mismo parseo de `variant.name` para mostrar "Sin stock"
  // o "Últimas unidades" en el modal.
  const selectedVariantStock = useMemo(() => {
    if (!modalProduct) return null;
    return resolveVariantStock(modalProduct, seleccion);
  }, [modalProduct, seleccion]);

  /* Valores que no se pueden comprar, para tacharlos ANTES de que el comprador los
     elija y recién ahí lea "sin stock en esta combinación".

     Antes eran dos listas separadas y asimétricas: los talles miraban el color ya
     elegido, pero los colores no miraban el talle. La razón escrita era evitar que
     un color se tachara y destachara al cambiar de talle, que se leía como parpadeo.

     Ahora es UNA regla para todas las opciones: un valor se tacha si, junto con lo
     ya elegido en las otras opciones, no queda stock. Es un cambio de comportamiento
     y es a propósito:

       - Es lo que hacen Shopify y Tiendanube, que deshabilitan las combinaciones
         que no existen.
       - Con tres opciones la regla vieja no se puede ni escribir: ¿cuál mira a cuál?
       - Y ese "parpadeo" es la información que hacía falta: avisa que ese color no
         viene en el talle elegido, en vez de dejar que lo elija y ahí se entere.

     La clave lleva el nombre de la opción adelante porque dos opciones distintas
     pueden tener el mismo valor —un "Negro" de Color y un "Negro" de Material— y
     tacharlos juntos sería un error. */
  const valoresSinStock = useMemo(() => {
    const set = new Set<string>();
    if (!modalProduct?.variants.length) return set;
    for (const op of modalProduct.opciones) {
      const otras = Object.entries(seleccion)
        .filter(([nombre]) => nombre !== op.nombre)
        .map(([, valor]) => valor);
      for (const valor of op.valores) {
        const matching = modalProduct.variants.filter(v => varianteTiene(v, [valor, ...otras]));
        if (matching.length > 0 && matching.every(v => v.stock === 0)) set.add(op.nombre + "|" + valor);
      }
    }
    return set;
  }, [modalProduct, seleccion]);

  /** ¿Este valor de esta opción está agotado, dado lo ya elegido? */
  const sinStock = (nombre: string, valor: string) => valoresSinStock.has(nombre + "|" + valor);


  // Derived values
  // El total lo calcula priceCart — la MISMA función que usa el checkout que cobra.
  // Antes acá había una copia de la cuenta de promos que difería del checkout en el
  // redondeo del N×M (B-03). El precio base (variante o mayorista con escalones) se
  // resuelve acá y se le pasa al motor; las StorePromotion las aplica él.
  const pricingItems = cartItems.map((item) => {
      const vp = resolveVariantPrice(item.product.variants, valoresElegidos(item.seleccion), item.variantId);
      // Mismo resolvedor que el checkout: mayorista + escalones si califica por
      // cantidad, si no el precio de la variante. Sin gate de modo (como el checkout).
      const basePrice = resolveBasePrice({
        retailPrice: vp ?? item.product.price,
        precioMayorista: item.product.precioMayorista,
        cantMinMayorista: item.product.cantMinMayorista,
        preciosEscalonados: parseEscalones(item.product.preciosEscalonados),
      }, item.qty);
      return {
        productId: item.product.id,
        variantId: item.variantId,
        quantity: item.qty,
        basePrice,
        category: item.product.category,
      };
    });
  const cartPricing = priceCart(pricingItems, { promotions });
  const cartTotal = cartPricing.subtotal;
  // Líneas ya con la promo aplicada, en el mismo orden que cartItems — el CartDrawer
  // las lee de acá en vez de recalcular (una sola cuenta, como manda la Fase 1).
  const pricedLines = cartPricing.lines;
  const cartPromoSavings = cartPricing.promoSavings;
  // Envío gratis y si el cupón puede combinarse — derivados del motor, coherentes
  // con lo que cobra el checkout.
  const freeShipping = cartPricing.freeShipping;
  const couponsAllowed = cartPricing.couponsAllowed;
  // "Agregá $X y el envío es gratis": cuánto falta para la promo de envío más cercana.
  // null si el carrito está vacío, si ya es gratis, o si no hay promo de envío que alcance.
  const freeShippingGoal = freeShipping || cartItems.length === 0 ? null : freeShippingProgress(pricingItems, promotions);
  const wholesaleWarnings = isWholesale ? cartItems.filter(i =>
    i.product.cantMinMayorista && i.qty < i.product.cantMinMayorista
  ) : [];
  const cartCount      = cartItems.reduce((s, i) => s + i.qty, 0);
  const envioOptions   = getEnvioOptions(shippingMethods);
  const selectedEnvio  = envioOptions.find(o => o.id === envioId) ?? envioOptions[0];
  const selectedLiveQuotePrice = selectedEnvio?.liveQuote ? getLiveQuotePrice(selectedEnvio.id) : null;
  const envioPriceRaw  = selectedEnvio?.liveQuote ? (selectedLiveQuotePrice ?? 0) : (selectedEnvio?.coordinar ? 0 : (selectedEnvio?.price ?? 0));
  // Una promo de envío gratis pone el costo en 0 y deja de ser "a coordinar".
  const envioPrice     = freeShipping ? 0 : envioPriceRaw;
  const envioCoordinar = freeShipping ? false : (selectedEnvio?.liveQuote ? selectedLiveQuotePrice == null : (selectedEnvio?.coordinar ?? false));
  // El cupón no descuenta si una promo activa no combina con cupones — el checkout
  // hace lo mismo, así que el total mostrado coincide con el cobrado.
  //
  // Y eso puede cambiar SIN que el comprador toque el cupón: lo aplica con 1 unidad
  // en el carrito, agrega 2 más, se activa un 3×2 no combinable y el cupón deja de
  // valer. Antes `appliedCoupon` seguía en pie y el checkout mostraba a la vez el
  // cartel de "no se puede sumar un cupón" y el recuadro verde "¡Cupón aplicado!".
  // La plata estaba bien (el descuento ya era 0); lo que se contradecía era la
  // pantalla.
  //
  // Se DERIVA en vez de borrar el cupón guardado: si vuelve a sacar la unidad, vale
  // otra vez sin tener que tipearlo. `cuponBloqueado` es ese mismo cupón cuando no
  // entra, para poder DECIRLO en pantalla en lugar de que desaparezca solo.
  //
  // Y el monto se RECALCULA sobre el carrito de ahora con la misma función que usa
  // el servidor para cobrar (`couponDiscountFor`). Antes se guardaba el número que
  // había dado al aplicarlo y no se tocaba nunca: con un 20% aplicado sobre
  // $100.000 el carrito seguía restando $20.000 aunque el comprador sacara la mitad
  // de las cosas — un 40% sobre lo que quedaba. El servidor cobraba bien; el total
  // en pantalla era el que mentía.
  //
  // El mínimo de compra también se vuelve a mirar: si el carrito baja de ese monto,
  // el cupón deja de valer, igual que lo va a decidir el checkout.
  const bajoMinimo     = appliedCoupon != null && cartTotal < appliedCoupon.minOrderAmount;
  const cuponVale      = couponsAllowed && !bajoMinimo;
  const cuponActivo    = cuponVale ? appliedCoupon : null;
  const cuponBloqueado = cuponVale ? null : appliedCoupon;
  // Por qué no entra, para poder decirlo en pantalla en vez de que desaparezca solo.
  const motivoCupon: "promo" | "minimo" | null =
    !cuponBloqueado ? null : (!couponsAllowed ? "promo" : "minimo");
  const couponDiscount = cuponActivo ? couponDiscountFor(cuponActivo, cartTotal) : 0;
  const orderTotal     = cartTotal + envioPrice - couponDiscount;

  const searchResults = searchQuery.trim().length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  // Functions
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  /* Al abrir la ficha se elige la primera COMBINACIÓN de talle y color con stock.

     Versión 1 del arreglo: se preseleccionaba `p.sizes[0]` sin mirar nada, así que
     un pantalón con el 32 agotado abría con el 32 marcado, tachado, el cartel "Sin
     stock en esta combinación" y el botón apagado — se veía vendido teniendo 34.

     Versión 2: se elegía el primer talle con stock Y el primer color con stock,
     pero **cada uno por su lado**. Lo encontró Flavio probando: eso no garantiza
     que la PAREJA tenga stock. Con este inventario —

         Beige/32 = 0    Beige/34 = 5    Gris/32 = 5    Gris/34 = 0

     — el talle 32 "tiene stock" (por Gris) y el color Beige "tiene stock" (por el
     34), así que cada dimensión pasa su propio examen… y la ficha abre en
     Beige/32, que es cero. Dos combinaciones vendibles y abre en la única muerta.

     Ahora se busca la pareja directamente, y con `resolveVariantStock`, que es
     **la misma función que usa la ficha** para decidir si prende el botón. Esa es
     la parte que importa: no hay una segunda cuenta que pueda opinar distinto de
     la que el comprador termina viendo. */
  const primerComboConStock = (p: StorefrontProduct): SeleccionOpciones => {
    // Se recorre en el mismo orden en que la ficha muestra los chips, así que sale
    // elegida la primera combinación que el comprador vería disponible leyendo de
    // arriba a abajo. Antes eran dos bucles anidados fijos (talles × colores);
    // ahora sirve para cualquier cantidad de opciones.
    const combos = combinaciones(p.opciones);
    const porDefecto = combos[0] ?? {};
    if (!p.variants.length) return porDefecto;
    for (const combo of combos) {
      const stock = resolveVariantStock(p, combo);
      // `null` es "no se puede saber" (ninguna variante casa). Se trata como
      // disponible, igual que en el resto del carrito.
      if (stock === null || stock > 0) return combo;
    }
    // Todo agotado: se deja la primera y el cartel de "sin stock" dice la verdad.
    return porDefecto;
  };

  /**
   * Elegir un valor de una opción. Es lo que llaman los chips de la ficha, en vez
   * de los viejos `setSelectedSize` / `setSelectedColor`: ahora la opción se
   * identifica por su nombre, así que sirve para las que haya y como se llamen.
   */
  const setOpcion = (nombre: string, valor: string) => {
    const tentativa = { ...seleccion, [nombre]: valor };
    // Si la combinación que queda no existe —Rojo sólo viene en L y estabas en
    // S—, se mueven las OTRAS opciones a una que sí exista, respetando la que
    // el comprador acaba de tocar. Sin esto el botón de comprar se apaga y nada
    // explica por qué.
    //
    // Va acá, en el `setOpcion` compartido, y no en cada template: esto vivía
    // como tres efectos duplicados en los cuatro de Moda, doce en total, y
    // ninguno sabía manejar más de dos dimensiones.
    const nueva = modalProduct
      ? (reacomodarSeleccion(modalProduct.variants, tentativa, nombre) ?? tentativa)
      : tentativa;
    setSeleccion(nueva);

    // Y la foto sigue a lo elegido. Gana la del valor que acaba de tocar; si esa
    // no tiene foto propia, se busca entre los demás valores por si el reacomodo
    // movió justo el que sí la tiene.
    if (!modalProduct) return;
    let idx = indiceFotoDe(modalProduct, valor);
    if (idx === -1) {
      for (const v of Object.values(nueva)) {
        idx = indiceFotoDe(modalProduct, v);
        if (idx !== -1) break;
      }
    }
    if (idx !== -1 && idx !== modalImg) {
      fotoAutomaticaRef.current = true;
      setModalImg(idx);
    }
  };

  // Y al revés: si el comprador pasa a una foto que es de otro valor, se elige
  // ese valor. Es lo que hace que mirar la foto del rojo deje el rojo elegido.
  //
  // `fotoAutomaticaRef` corta el ida y vuelta: sin eso, elegir un color movía la
  // foto, la foto volvía a elegir el color, y quedaban rebotando.
  //
  // Y ACÁ NO SE TOCA LA FOTO. Un producto puede tener varias fotos del mismo
  // color; si esto la reacomodara, tocar la segunda foto del azul volvería sola
  // a la primera. Verificado en su momento contra la base: 37 de 90 productos
  // activos tienen dos o más fotos del mismo color, y hay uno con las cuatro en
  // azul —ahí las flechas y las miniaturas no servían para nada—. La foto queda
  // donde la puso el comprador; lo único que se mueve es lo elegido.
  useEffect(() => {
    if (fotoAutomaticaRef.current) { fotoAutomaticaRef.current = false; return; }
    if (!modalProduct) return;
    const valor = modalProduct.imageItems[modalImg]?.variantValue;
    if (!valor) return;
    const opcion = opcionDelValor(modalProduct.opciones, valor);
    if (!opcion) return;
    // Ya está elegido: no hay nada que hacer. Es lo que evita el rebote de arriba.
    if (seleccion[opcion]?.toLowerCase() === valor.toLowerCase()) return;
    const tentativa = { ...seleccion, [opcion]: valor };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- responde a que el comprador cambió de foto, no se puede calcular durante el render
    setSeleccion(reacomodarSeleccion(modalProduct.variants, tentativa, opcion) ?? tentativa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalImg, modalProduct?.id]);

  const openModal = (p: StorefrontProduct) => {
    setModalProduct(p);
    const inicial = primerComboConStock(p);
    // La ficha abre mostrando la foto del color que viene elegido, no la primera
    // del carrete: si el producto abre en Rojo, se ve el rojo.
    let idx = -1;
    for (const v of Object.values(inicial)) {
      idx = indiceFotoDe(p, v);
      if (idx !== -1) break;
    }
    // Aunque quede en 0, se marca como automática: la foto 0 puede pertenecer a
    // otro color, y sin esto el efecto de abajo la haría mandar sobre lo elegido.
    //
    // Pero se marca SÓLO si el efecto va a correr de verdad. El efecto depende de
    // `[modalImg, modalProduct?.id]`: si se reabre el mismo producto con la misma
    // foto, no cambia ninguno de los dos, el efecto no corre, y la bandera quedaba
    // prendida esperando. La consumía el próximo cambio de foto —uno del
    // comprador—, y esa vez la selección no lo seguía.
    const fotoNueva = idx === -1 ? 0 : idx;
    fotoAutomaticaRef.current = fotoNueva !== modalImg || p.id !== modalProduct?.id;
    setModalImg(fotoNueva);
    setSeleccion(inicial);
    setQty(isWholesale && p.cantMinMayorista ? p.cantMinMayorista : 1);
    setSearchOpen(false);
    // La ficha nueva arranca ARRIBA. Los "productos similares" viven al final del
    // modal, así que el que toca uno está siempre abajo de todo: cambiaba el
    // producto y aparecía el pie de la ficha nueva —las reseñas, los similares de
    // nuevo— sin ver nunca la foto, el nombre ni el precio. Se leía como si no
    // hubiera pasado nada.
    // Va acá y no en cada template porque es lo mismo que las cuatro líneas de
    // arriba: lo que hay que dejar en cero al abrir otro producto. Suelto en los
    // templates, hay que acordarse diez veces.
    if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
    registrarVista(p.id, slug, isOwner, isPreview);
  };

  // Deep link a un producto puntual (ej: ?producto=ID desde favoritos en otro panel)
  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("producto");
    if (id) {
      const p = products.find((pr) => pr.id === id);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- abre el modal según la URL, solo se sabe tras montar
      if (p) openModal(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Recuperar un carrito abandonado desde el link del email (?recuperar=ID)
  useEffect(() => {
    if (!products.length) return;
    const id = new URLSearchParams(window.location.search).get("recuperar");
    if (!id) return;

    fetch(`/api/cart/track/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { storeId: string; items: { productId: string; variantId: string | null; qty: number; size?: string; color?: string }[] } | null) => {
        if (!data || data.storeId !== storeId) return;
        const restored: CartItem[] = [];
        for (const item of data.items) {
          const product = products.find((p) => p.id === item.productId);
          if (!product) continue;
          // Las filas guardadas traen `size`/`color` sueltos, de antes de que la
          // selección tuviera nombres. Se reconstruye buscando a qué opción
          // pertenece cada valor (ver `seleccionDesdeValores`).
          const seleccionItem = seleccionDesdeValores(product, [item.size, item.color]);
          restored.push({ product, seleccion: seleccionItem, variantId: item.variantId ?? null, qty: item.qty });
        }
        if (restored.length === 0) return;
        setCartItems((prev) => {
          const existingKeys = new Set(prev.map((i) => claveItem(i.product.id, i.seleccion)));
          const toAdd = restored.filter((i) => !existingKeys.has(claveItem(i.product.id, i.seleccion)));
          return [...prev, ...toAdd];
        });
        setCartOpen(true);
        showToast("Recuperamos tu carrito");
      })
      .catch(() => {})
      .finally(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete("recuperar");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, storeId]);

  const addToCart = () => {
    if (!modalProduct) return;
    // ¿Eligió todo lo que había para elegir?
    //
    // Esta guarda existía en UNA de las seis pantallas (`ProductDetailClient`).
    // Poniéndola acá la tienen las seis, sin tocar ningún template.
    //
    // Y no la cubre el candado del stock: con una selección INCOMPLETA
    // —sólo el talle, sin color— `buscarVariante` busca por los valores que hay,
    // encuentra la primera variante con ese talle, y devuelve un stock mayor que
    // cero. O sea que el botón queda prendido y el pedido sale con un color que el
    // comprador nunca eligió. Son dos agujeros distintos.
    const faltan = opcionesAElegir(modalProduct.opciones).filter(o => !seleccion[o.nombre]);
    if (faltan.length > 0) {
      showToast(`Elegí ${faltan.map(o => o.nombre.toLowerCase()).join(" y ")}`);
      return;
    }
    const variantId = resolveVariantId(modalProduct, seleccion);
    const name = modalProduct.name;
    const stock = resolveVariantStock(modalProduct, seleccion);
    // Segundo candado, por si alguna pantalla deja el botón prendido: sin stock
    // —o con una combinación que no existe, que ahora también da 0— no se agrega.
    // El primero es que las seis pantallas ya apagan el botón con stock 0; éste
    // es el que igual protege la caja si mañana aparece una séptima.
    if (stock === 0) {
      showToast("Esa combinación no está disponible");
      return;
    }
    const clave = claveItem(modalProduct.id, seleccion);
    setCartItems(prev => {
      const ex = prev.find(i => claveItem(i.product.id, i.seleccion) === clave);
      if (ex) {
        const total = stock !== null ? Math.min(ex.qty + qty, stock) : ex.qty + qty;
        return prev.map(i => i === ex ? { ...i, qty: total } : i);
      }
      const initialQty = stock !== null ? Math.min(qty, stock) : qty;
      return [...prev, { product: modalProduct, seleccion, variantId, qty: initialQty }];
    });
    setModalProduct(null);
    showToast(`${name} agregado al carrito`);
    setCartOpen(true);
    // El primero de los dos escalones del embudo que no se pueden sacar de
    // ninguna tabla. Va acá y no en cada template porque las seis pantallas
    // agregan al carrito por esta misma función.
    registrarPaso("carrito", slug, isOwner, isPreview);
  };

  /**
   * Agregar al carrito desde la GRILLA, sin abrir la ficha.
   *
   * Devuelve `false` cuando el producto tiene algo para elegir —talle, color— y
   * en ese caso el template tiene que abrir la ficha. Agregarlo igual, con la
   * selección vacía, manda un pedido sin talle: es exactamente el agujero que
   * describe la guarda de `addToCart` unas líneas más arriba, y no alcanza con
   * el candado del stock para taparlo. Un clic de más es mucho más barato que
   * un pedido que hay que cancelar por teléfono.
   *
   * Es una función aparte y no `addToCart` con un parámetro porque `addToCart`
   * trabaja sobre `modalProduct` y `seleccion`, que son el estado de la ficha
   * ABIERTA. Para llamarla desde una tarjeta habría que abrir la ficha primero,
   * que es justo lo que este atajo evita.
   *
   * No abre el cajón del carrito, a diferencia de `addToCart`. Desde una grilla
   * se agregan varias cosas seguidas, y un cajón que se abre solo en cada clic
   * tapa la grilla y hay que cerrarlo para seguir mirando. Queda el aviso
   * flotante, que confirma sin interrumpir.
   */
  const agregarDirecto = (product: StorefrontProduct): boolean => {
    if (opcionesAElegir(product.opciones).length > 0) return false;
    const seleccionVacia: SeleccionOpciones = {};
    const stock = resolveVariantStock(product, seleccionVacia);
    if (stock === 0) {
      showToast("Ese producto está sin stock");
      return true;
    }
    const variantId = resolveVariantId(product, seleccionVacia);
    const clave = claveItem(product.id, seleccionVacia);

    /* En una tienda mayorista se entra por el mínimo del producto, no por uno.

       Abriendo la ficha esto ya pasaba (ver `openModal`), pero el atajo de la
       grilla agregaba UNA unidad siempre: en una tienda con mínimo de 6, el
       botón de comprar rápido dejaba el carrito en un estado que el checkout
       rechaza —salta el aviso de cantidad mínima— y el comprador tenía que ir
       a buscar el más para llegar a seis. El atajo no puede armar un pedido
       que no se puede pagar.

       Se respeta el stock igual: si hay menos que el mínimo, entra lo que hay
       y el aviso de cantidad mínima aparece, que es lo correcto — el problema
       ahí es de stock, no del botón. */
    const arranque = isWholesale && product.cantMinMayorista ? product.cantMinMayorista : 1;
    const primeraCantidad = stock !== null ? Math.min(arranque, stock) : arranque;

    setCartItems(prev => {
      const ex = prev.find(i => claveItem(i.product.id, i.seleccion) === clave);
      if (ex) {
        const total = stock !== null ? Math.min(ex.qty + 1, stock) : ex.qty + 1;
        return prev.map(i => i === ex ? { ...i, qty: total } : i);
      }
      return [...prev, { product, seleccion: seleccionVacia, variantId, qty: primeraCantidad }];
    });
    showToast(`${product.name} agregado al carrito`);
    // El mismo escalón del embudo que registra `addToCart`: si no se registrara
    // acá, todo lo que se compre por el atajo desaparecería de las métricas y el
    // embudo diría que la grilla no vende.
    registrarPaso("carrito", slug, isOwner, isPreview);
    return true;
  };

  const removeFromCart = (idx: number) =>
    setCartItems(prev => prev.filter((_, i) => i !== idx));

  /* El "+" del carrito no tenía techo. Sólo ponía piso con `Math.max(1, …)`, así
     que se podía subir la cantidad sin límite: Flavio llegó a 65 unidades de un
     pantalón que tiene 5. `addToCart` sí recortaba contra el stock, pero recortar
     al agregar no sirve de nada si después se puede seguir sumando de a uno.

     No se vendía de más —la caja descuenta con `stock >= cantidad` en la misma
     operación, así que el pedido rebota—, pero rebotaba EN EL ÚLTIMO PASO: la
     persona llenaba el carrito, cargaba nombre, dirección y forma de pago, y recién
     ahí se enteraba. Y con un medio de pago externo el rechazo llega todavía más
     tarde.

     Ahora el techo es el stock de esa variante, la misma cuenta que usa
     `addToCart`. Cuando el tope muerde se avisa, porque un botón que deja de hacer
     efecto sin decir nada se lee como que la página se colgó. */
  const updateQty = (idx: number, delta: number) =>
    setCartItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const stock = resolveVariantStock(item.product, item.seleccion);
      const pedido = item.qty + delta;
      const conTecho = stock !== null ? Math.min(pedido, stock) : pedido;
      const final = Math.max(1, conTecho);
      if (delta > 0 && final === item.qty && stock !== null) {
        // El cero llega por dos caminos: agotado de verdad, o una combinación que
        // dejó de existir —un carrito viejo de un producto que se recargó—. En los
        // dos casos "solo quedan 0 unidades" se lee como un error de la página.
        showToast(
          stock === 0 ? "Esa combinación ya no está disponible"
          : stock === 1 ? "Queda 1 unidad"
          : `Solo quedan ${stock} unidades`,
        );
      }
      return { ...item, qty: final };
    }));

  const openCheckout = () => {
    setCartOpen(false);
    setCheckoutStatus("idle");
    setCheckoutError("");
    setCheckoutOpen(true);
  };

  const handleApplyCoupon = async () => {
    setCouponError("");
    if (!coupon.trim()) return;
    if (!couponsAllowed) { setCouponError("La promoción activa no se combina con cupones."); return; }
    const emailForValidation = buyerForm.email.trim() || undefined;
    const res = await validateCoupon(coupon, cartTotal, emailForValidation);
    if ("error" in res) { setCouponError(res.error); return; }
    setAppliedCoupon({
      id: res.coupon.id, code: res.coupon.code,
      discountType: res.coupon.discountType, discountValue: res.coupon.discountValue,
      minOrderAmount: res.coupon.minOrderAmount ?? 0,
    });
    setCoupon("");
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { setCheckoutError("Debés aceptar los términos y condiciones para continuar."); return; }
    setCheckoutStatus("placing");
    setCheckoutError("");
    const res = await placeOrder({
      cartItems: cartItems.map(item => ({
        productId: item.product.id,
        variantId: item.variantId,
        quantity:  item.qty,
      })),
      customer: {
        name:       buyerForm.nombre,
        email:      buyerForm.email,
        phone:      buyerForm.telefono,
        street:     buyerForm.direccion,
        city:       buyerForm.ciudad,
        province:   buyerForm.provincia,
        postalCode: buyerForm.cp,
        notes:      notas,
      },
      shippingMethod:  envioId,
      paymentProvider: pagoId,
      // El bloqueado no se manda: el servidor lo ignoraría igual (chequea
      // `pricing.couponsAllowed`), pero así el pedido no queda con un cupón atado
      // que no descontó nada.
      couponId:        cuponActivo?.id ?? null,
      donationAmount:  donationEnabled ? donationAmount : undefined,
    });
    if (!res.ok) { setCheckoutStatus("idle"); setCheckoutError(res.error ?? "Error al procesar"); return; }

    // Si eligió MercadoPago, crear preferencia y redirigir
    if (pagoId === "mercadopago" && res.orderId) {
      const mpRes = await fetch("/api/mp/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: res.orderId, donationId: res.donationId }),
      });
      const mpData = await mpRes.json().catch(() => ({}));
      if (!mpRes.ok || !mpData.initPoint) {
        setCheckoutStatus("idle");
        setCheckoutError(mpData.error ?? "No se pudo iniciar el pago. Intentá de nuevo.");
        return;
      }
      setCartItems([]);
      setAppliedCoupon(null);
      setCuponAbierto(false);
      try { localStorage.removeItem("storefront_cart"); } catch {}
      window.location.href = mpData.initPoint;
      return;
    }

    setCartItems([]);
    setAppliedCoupon(null);
    setCuponAbierto(false);
    try { localStorage.removeItem("storefront_cart"); } catch {}

    // Pago por transferencia: no hay redirección a MP para la compra. Si
    // pidió donar, ese segundo pago (siempre vía MercadoPago) se ofrece en
    // el mismo modal de "compra confirmada" que usa el camino de MP, en vez
    // de mostrarlo metido dentro del panel de checkout.
    if (res.donationId && res.orderId) {
      setCheckoutOpen(false);
      router.replace(`${pathname}?pago=ok&orden=${res.orderId}&donacionId=${res.donationId}`, { scroll: false });
      return;
    }

    // Pago por transferencia sin donación: no hay ninguna navegación de por
    // medio (a diferencia de MercadoPago o la donación), así que el email
    // recién tipeado en el formulario sigue en memoria acá — el Pixel lo
    // hashea solo del lado del navegador, nunca se manda en texto plano.
    if (typeof window !== "undefined") {
      const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
      if (fbq && res.orderId) {
        const email = buyerForm.email.trim().toLowerCase();
        if (email) fbq("set", "userData", { em: email });
        fbq("track", "Purchase", { value: orderTotal, currency }, { eventID: res.orderId });
      }
    }

    setCheckoutStatus("done");
  };

  const toggleFavorite = async (id: string) => {
    if (status !== "authenticated") {
      showToast("Iniciá sesión para guardar favoritos");
      return;
    }
    // Optimistic update
    const wasFavorite = favorites.includes(id);
    setFavorites(prev => wasFavorite ? prev.filter(f => f !== id) : [...prev, id]);
    try {
      await fetch("/api/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
    } catch {
      // Revert on error
      setFavorites(prev => wasFavorite ? [...prev, id] : prev.filter(f => f !== id));
    }
  };

  return {
    // State
    cartItems, cartOpen, setCartOpen,
    modalProduct, setModalProduct, modalImg, setModalImg,
    seleccion, setSeleccion, setOpcion,
    qty, setQty,
    checkoutOpen, setCheckoutOpen, checkoutStatus, setCheckoutStatus, checkoutError,
    envioId, setEnvioId, pagoId, setPagoId,
    coupon, setCoupon, couponError, appliedCoupon, setAppliedCoupon,
    cuponAbierto, setCuponAbierto,
    notas, setNotas, rememberData, setRememberData,
    buyerForm, setBuyerForm,
    searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    favorites, favoritesOpen, setFavoritesOpen,
    userDropdownOpen, setUserDropdownOpen, userDropdownRef,
    toastMsg,
    acceptedTerms, setAcceptedTerms,
    donationEnabled, setDonationEnabled, donationAmount, setDonationAmount, canastaDisponible,
    // Derived
    cartTotal, cartCount, envioPrice, envioCoordinar, envioOptions, couponDiscount, orderTotal,
    // Promos de tienda: líneas ya con promo, ahorro total, envío gratis y gate de cupón.
    pricedLines, cartPromoSavings, freeShipping, couponsAllowed, freeShippingGoal,
    // El cupón guardado, partido en el que descuenta y el que quedó bloqueado por
    // una promo. Los checkouts pintan uno u otro, nunca los dos.
    cuponActivo, cuponBloqueado, motivoCupon,
    // Qué promos ganaron y cuánto aportó cada una — para NOMBRARLAS en el checkout
    // (F6-C6) con la misma lista que después sale en el email del pedido.
    appliedPromos: cartPricing.appliedPromos,
    searchResults, favoriteProducts, selectedVariantStock, sinStock,
    checkoutMode, isWholesale, wholesaleWarnings,
    pagoOptions: getPagoOptions(hasMercadoPago, !!affiliateId),
    fmtEnvioPrice, fmtLiveQuote,
    modalScrollRef,
    // Functions
    fmt, showToast, openModal, addToCart, agregarDirecto,
    removeFromCart, updateQty,
    openCheckout, handleApplyCoupon, handlePlaceOrder, toggleFavorite,
  };
}
