"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Edit, Eye, EyeOff, Package, Search, X } from "lucide-react";

interface Variant {
  id: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  price: number;
  comparePrice: number | null;
  images: string;
  isActive: boolean;
  variants: Variant[];
}

interface Props {
  products: Product[];
}

export default function ProductsTable({ products }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q) && !(p.subcategory || "").toLowerCase().includes(q)) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter === "active" && !p.isActive) return false;
      if (statusFilter === "hidden" && p.isActive) return false;
      if (stockFilter === "out" && totalStock !== 0) return false;
      if (stockFilter === "low" && (totalStock === 0 || totalStock >= 5)) return false;
      if (stockFilter === "critical" && totalStock >= 5) return false;
      return true;
    });
  }, [products, search, categoryFilter, statusFilter, stockFilter]);

  const hasFilters = search || categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all";

  function clearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o categoría..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="hidden">Ocultos</option>
        </select>

        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600"
        >
          <option value="all">Todo el stock</option>
          <option value="out">Sin stock (0 u.)</option>
          <option value="low">Stock bajo (1–4 u.)</option>
          <option value="critical">Stock crítico (0–4 u.)</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors px-2"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* Results count */}
      {hasFilters && (
        <p className="text-xs text-gray-400">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Search className="h-8 w-8 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin resultados</p>
          <p className="text-gray-400 text-sm mt-1">Probá con otros filtros de búsqueda</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Producto</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoría</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Precio</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((product) => {
                const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
                const images = JSON.parse(product.images || "[]");
                return (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                          {images[0] ? (
                            <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {product.variants.length} variante{product.variants.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm text-gray-500 capitalize">{product.category}</span>
                        {product.subcategory && <p className="text-xs text-gray-400 capitalize">{product.subcategory}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          ${product.price.toLocaleString("es-AR")}
                        </p>
                        {product.comparePrice && (
                          <p className="text-xs text-gray-400 line-through">
                            ${product.comparePrice.toLocaleString("es-AR")}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${totalStock === 0 ? "text-red-500" : totalStock < 5 ? "text-yellow-500" : "text-green-600"}`}>
                        {totalStock} u.
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                        product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {product.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {product.isActive ? "Activo" : "Oculto"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/productos/nuevo?edit=${product.id}`}
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
