"use client";

import { useMemo, useState } from "react";
import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ActivePromotion } from "@/lib/pricing";
import { resolveProductPromo } from "@/lib/promoDisplay";
import { esAtributoInterno } from "@/lib/fichaVehiculo";

/* ══════════════════════════════════════════════════════════════════════════
   EL CEREBRO DEL CATÁLOGO
   ══════════════════════════════════════════════════════════════════════════

   Qué productos se ven, en qué orden y en qué página: categoría, subcategoría,
   búsqueda, filtros por atributo, rango de precio, "en oferta", "en promoción",
   "lo más buscado" y el orden.

   Vivía escrito adentro de `CatalogoGenerico`, pegado a cómo se dibuja. Eso
   obligaba a que todos los templates tuvieran el MISMO catálogo con otros
   colores: para tener uno propio había que copiar estas reglas, y una copia de
   un filtro es la que se queda atrás el día que cambia el original (ya pasó
   con el buscador de variantes: seis copias, tres rotas).

   Ahora el cerebro es uno y la cara es de cada uno. `CatalogoGenerico` lo usa
   tal cual estaba, y Aurora lo usa para dibujar su catálogo propio (03/10/26).

   No sabe nada de pantallas: ni de acordeones abiertos, ni de cajones de
   filtros, ni de anchos. Eso es de quien dibuja. */

export type FiltroInicial = {
  categoria?: string | null;
  subcategoria?: string | null;
  soloOfertas?: boolean;
  /** NO filtra: reordena por visitas reales. Ver `masVistos` en `CatalogoEmbebido`. */
  masVistos?: boolean;
  soloPromos?: boolean;
};

export type OrdenCatalogo = "newest" | "price_asc" | "price_desc" | "name_az" | "discount";

export function useFiltrosCatalogo({
  products, promotions, inicial = {}, porPagina,
}: {
  products: StorefrontProduct[];
  promotions: ActivePromotion[];
  inicial?: FiltroInicial;
  porPagina: number;
}) {
  const [onlyOfertas,       setOnlyOfertas]       = useState(!!inicial.soloOfertas);
  const [onlyDestacados,    setOnlyDestacados]    = useState(!!inicial.masVistos);
  const [onlyPromos,        setOnlyPromos]        = useState(!!inicial.soloPromos);
  const [search,            setSearch]            = useState("");
  const [activeCategory,    setActiveCategory]    = useState(inicial.categoria ?? "Todos");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(inicial.subcategoria ?? null);
  const [sortBy,            setSortBy]            = useState<string>("newest");
  const [page,              setPage]              = useState(1);
  const [activeAttrFilters, setActiveAttrFilters] = useState<Record<string, string[]>>({});
  const [priceRange,        setPriceRange]        = useState<[number, number] | null>(null);

  const categoryList = useMemo(() => [...new Set(products.map(p => p.category).filter(c => c && c !== "general"))], [products]);
  const CATEGORIES   = useMemo(() => ["Todos", ...categoryList], [categoryList]);

  // ── Filtro dinámico por atributos: solo se muestran los que el dueño cargó de verdad,
  // y solo si hay más de un valor distinto (sino el filtro no aporta nada) ──────
  const productsInCategory = useMemo(
    () => products.filter(p =>
      (activeCategory === "Todos" || p.category === activeCategory) &&
      (!activeSubcategory || p.subcategory === activeSubcategory)
    ),
    [products, activeCategory, activeSubcategory]
  );

  // ¿Hay al menos un producto con precio anterior? De eso depende que se muestre
  // el filtro "En oferta" — se mira sobre TODO el catálogo y no sobre la categoría
  // abierta, para que el botón no aparezca y desaparezca al navegar entre
  // categorías, que se lee como un parpadeo y no como una decisión.
  const hayOfertas = useMemo(
    () => products.some(p => p.comparePrice != null && p.comparePrice > p.price),
    [products]
  );

  const availableAttrFilters = useMemo(() => {
    // En "Todos" se mezclan productos de rubros muy distintos (heladeras, sillones,
    // celulares...) y mostrar specs como Pulgadas o Potencia ahí no tiene sentido —
    // recién aparecen cuando el usuario elige una categoría puntual.
    if (activeCategory === "Todos") return [];
    const map: Record<string, Set<string>> = {};
    productsInCategory.forEach(p => {
      p.attributes.forEach(({ key, value }) => {
        // La ficha técnica y los servicios van en JSON: no son un filtro.
        if (!key || !value || esAtributoInterno(key)) return;
        if (!map[key]) map[key] = new Set();
        map[key].add(value);
      });
    });
    // Orden fijo: Marca y Modelo primero (lo que más ayuda a decidir),
    // el resto de specs en el medio, y Garantía al final (es un dato de
    // confianza, no algo por lo que normalmente se filtra primero).
    const PRIORITY = ["marca", "modelo"];
    const LAST = ["garantia", "garantía"];
    const rank = (key: string) => {
      const k = key.toLowerCase();
      if (PRIORITY.includes(k)) return PRIORITY.indexOf(k);
      if (LAST.includes(k)) return 100;
      return 10;
    };
    return Object.entries(map)
      .filter(([, values]) => values.size > 1)
      .map(([key, values]) => ({ key, values: [...values].sort() }))
      .sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
  }, [productsInCategory, activeCategory]);

  const toggleAttrFilter = (key: string, value: string) => {
    setActiveAttrFilters(prev => {
      const current = prev[key] ?? [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      const updated = { ...prev, [key]: next };
      if (next.length === 0) delete updated[key];
      return updated;
    });
    setPage(1);
  };

  const clearAttrFilters = () => setActiveAttrFilters({});

  // Tope real de precios para la categoría actual — se recalcula cuando cambiás
  // de categoría, y reseteamos la selección manual para no dejar un rango viejo
  // que ya no tiene sentido con los productos nuevos.
  const priceBounds = useMemo<[number, number]>(() => {
    if (productsInCategory.length === 0) return [0, 0];
    const prices = productsInCategory.map(p => p.price);
    return [Math.min(...prices), Math.max(...prices)];
  }, [productsInCategory]);

  // Si cambiás de categoría, el rango de precio anterior ya no tiene sentido —
  // lo reseteamos durante el render (no en un efecto) para evitar un re-render extra.
  const catKey = `${activeCategory}|${activeSubcategory ?? ""}`;
  const [prevCatKey, setPrevCatKey] = useState(catKey);
  if (catKey !== prevCatKey) {
    setPrevCatKey(catKey);
    setPriceRange(null);
  }

  const effectivePriceRange = priceRange ?? priceBounds;

  const subcategoriesFor = useMemo(() => {
    const map: Record<string, string[]> = {};
    products.forEach(p => {
      if (p.subcategory && p.category) {
        if (!map[p.category]) map[p.category] = [];
        if (!map[p.category].includes(p.subcategory)) map[p.category].push(p.subcategory);
      }
    });
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    let r = productsInCategory.filter(p => {
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !(p.subcategory ?? "").toLowerCase().includes(search.toLowerCase()) &&
          !p.category.toLowerCase().includes(search.toLowerCase())) return false;
      for (const [key, values] of Object.entries(activeAttrFilters)) {
        if (values.length === 0) continue;
        const productValue = p.attributes.find(a => a.key === key)?.value;
        if (!productValue || !values.includes(productValue)) return false;
      }
      if (priceRange && (p.price < priceRange[0] || p.price > priceRange[1])) return false;
      if (onlyOfertas && !(p.comparePrice && p.comparePrice > p.price)) return false;
      if (onlyPromos) {
        // "En promoción" = alguna promo de TIENDA vigente alcanza al producto (precio
        // tachado, N×M, envío gratis o descuento condicional). Reusa el mismo resolver
        // que pinta el badge, para que filtro y cartel coincidan.
        const d = resolveProductPromo(p, promotions);
        if (!(d.hasPriceDrop || d.nxm || d.freeShipping || d.pctOff != null)) return false;
      }
      return true;
    });
    // "Lo más buscado" ordena por vistas reales de compradores (mayor a menor)
    if (onlyDestacados) return [...r].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    if (sortBy === "price_asc")  r = [...r].sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sortBy === "name_az")    r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "discount")   r = [...r].sort((a, b) => {
      const da = a.comparePrice ? (a.comparePrice - a.price) / a.comparePrice : 0;
      const db = b.comparePrice ? (b.comparePrice - b.price) / b.comparePrice : 0;
      return db - da;
    });
    return r;
  }, [productsInCategory, activeAttrFilters, priceRange, search, sortBy, onlyOfertas, onlyDestacados, onlyPromos, promotions]);

  const totalPages = Math.ceil(filtered.length / porPagina) || 1;
  const paginated  = filtered.slice((page - 1) * porPagina, page * porPagina);

  /** Cambia de categoría y limpia lo que era de la anterior. */
  const changeCategory = (cat: string, sub: string | null = null) => {
    setActiveCategory(cat); setActiveSubcategory(sub); setPage(1); setActiveAttrFilters({});
  };

  return {
    onlyOfertas, setOnlyOfertas, onlyDestacados, setOnlyDestacados, onlyPromos, setOnlyPromos,
    search, setSearch, activeCategory, setActiveCategory, activeSubcategory, setActiveSubcategory,
    sortBy, setSortBy, page, setPage, activeAttrFilters, setActiveAttrFilters, priceRange, setPriceRange,
    categoryList, CATEGORIES, productsInCategory, hayOfertas, availableAttrFilters,
    toggleAttrFilter, clearAttrFilters, priceBounds, effectivePriceRange, subcategoriesFor,
    filtered, totalPages, paginated, changeCategory,
  };
}
