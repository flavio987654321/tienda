"use client";

import { useState, useEffect } from "react";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { getStoreType } from "@/lib/storeTypes";

export type StorefrontVariant = {
  id: string;
  name: string;
  value: string;
  stock: number;
  price: number | null;
};

// Escalón de precio mayorista: a partir de "desde" unidades, el precio es "precio".
export type PrecioEscalonFront = { desde: number; precio: number };

export type StorefrontProduct = {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  featured?: boolean;
  viewCount?: number;
  precioMayorista: number | null;
  cantMinMayorista: number | null;
  preciosEscalonados: PrecioEscalonFront[];
  soloMayorista: boolean;
  promoQtyMin: number | null;
  promoQtyDiscount: number | null;
  promoType?: string;
  promoPayQty?: number | null;
  // Cuotas sin interés informativas (0/undefined = no mostrar). No conectado
  // a ninguna API bancaria ni de Mercado Pago — solo se usa para calcular
  // precio/N en la página de producto.
  cuotas?: number;
  category: string;
  subcategory?: string;
  gender: string;
  description: string | null;
  images: string[];
  imageItems: { url: string; variantValue?: string }[];
  reelUrls: string[];
  sizes: string[];
  colors: string[];
  variants: StorefrontVariant[];
  attributes: { key: string; value: string }[];
  badge?: string;
};

export type ValidatedCoupon = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  discount: number;
};

export type PlaceOrderParams = {
  cartItems: { productId: string; variantId: string | null; quantity: number }[];
  customer: {
    name: string;
    email: string;
    phone?: string;
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    notes?: string;
  };
  shippingMethod: string;
  paymentProvider: string;
  couponId?: string | null;
  rewardCouponCode?: string | null;
  donationAmount?: number | null;
};

// Claves que mapean a "talle" (dimensión principal no-color) según tipoTienda
const SIZE_ATTRS  = [
  "talle", "size", "talla", "talles", "sizes",          // ROPA / DEPORTE
  "tamaño", "tamano",                                    // HOGAR / MASCOTAS / GENERAL
  "almacenamiento",                                      // TECH
  "ram",                                                 // TECH
  "versión", "version",                                  // AUTOS
  "formato",                                             // LIBROS
  "variante",                                            // GENERAL
  "material",                                            // HOGAR
  "sabor",                                               // ALIMENTOS / MASCOTAS
  "peso/tamaño", "peso",                                 // ALIMENTOS
];
// Claves que mapean a "color"
const COLOR_ATTRS = ["color", "colour", "colores", "colors", "tono"];

/* ── Productos de muestra para el preview del dashboard ─────── */
const DEMO_PRODUCTS: StorefrontProduct[] = [
  { id: "demo-1", name: "Remera Oversize", price: 18500, comparePrice: null, category: "remeras", description: "Remera de algodón premium con corte oversized.", images: ["https://picsum.photos/seed/dp-rem/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-rem/600/800" }], sizes: ["XS","S","M","L","XL"], colors: ["Blanco","Negro","Gris"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "mujer", badge: "NUEVO", attributes: [] },
  { id: "demo-2", name: "Jeans Skinny", price: 35900, comparePrice: 48000, category: "pantalones", description: "Jeans de corte skinny con elastán.", images: ["https://picsum.photos/seed/dp-jean/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-jean/600/800" }], sizes: ["38","40","42","44"], colors: ["Azul","Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "mujer", badge: "SALE", attributes: [] },
  { id: "demo-3", name: "Hoodie Premium", price: 29900, comparePrice: null, category: "buzos", description: "Hoodie de algodón french terry 380g.", images: ["https://picsum.photos/seed/dp-hood/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-hood/600/800" }], sizes: ["S","M","L","XL","XXL"], colors: ["Gris","Negro","Oliva"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "hombre", badge: "NUEVO", attributes: [] },
  { id: "demo-4", name: "Pantalón Cargo", price: 42000, comparePrice: null, category: "pantalones", description: "Pantalón cargo con múltiples bolsillos.", images: ["https://picsum.photos/seed/dp-carg/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-carg/600/800" }], sizes: ["28","30","32","34","36"], colors: ["Beige","Negro","Verde"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "hombre", attributes: [] },
  { id: "demo-5", name: "Vestido Midi", price: 38500, comparePrice: null, category: "vestidos", description: "Vestido midi floreado ideal para el verano.", images: ["https://picsum.photos/seed/dp-vest/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-vest/600/800" }], sizes: ["XS","S","M","L"], colors: ["Floral","Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "mujer", badge: "NUEVO", attributes: [] },
  { id: "demo-6", name: "Cinturón de Cuero", price: 12000, comparePrice: 16000, category: "accesorios", description: "Cinturón de cuero genuino con hebilla dorada.", images: ["https://picsum.photos/seed/dp-belt/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-belt/600/800" }], sizes: ["Único"], colors: ["Marrón","Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "SALE", attributes: [] },
  { id: "demo-7", name: "Campera de Jean", price: 55000, comparePrice: 68000, category: "camperas", description: "Campera de jean clásica con detalles lavados.", images: ["https://picsum.photos/seed/dp-camp/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-camp/600/800" }], sizes: ["S","M","L","XL"], colors: ["Azul","Blanco"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "hombre", badge: "SALE", attributes: [] },
  { id: "demo-8", name: "Cartera Tote", price: 24500, comparePrice: null, category: "accesorios", description: "Cartera tote de lona con interior forrado.", images: ["https://picsum.photos/seed/dp-tote/600/800"], imageItems: [{ url: "https://picsum.photos/seed/dp-tote/600/800" }], sizes: ["Único"], colors: ["Beige","Negro","Bordo"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [] },
];

const DEMO_PRODUCTS_AUTOS: StorefrontProduct[] = [
  { id: "auto-1", name: "Toyota Corolla XEI", price: 28500000, comparePrice: null, category: "Sedanes", description: "Excelente estado. Un dueño. Full equipo, cámara de retroceso, tapizado cuero.", images: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "DESTACADO", attributes: [{ key: "Marca", value: "Toyota" }, { key: "Modelo", value: "Corolla" }, { key: "Versión", value: "XEI" }, { key: "Año", value: "2022" }, { key: "Km", value: "28.000" }, { key: "Motor", value: "2.0" }, { key: "Transmisión", value: "Automática" }, { key: "Combustible", value: "Nafta" }, { key: "Tracción", value: "4x2" }, { key: "Carrocería", value: "Sedán" }, { key: "Color", value: "Blanco" }, { key: "Puertas", value: "4" }] },
  { id: "auto-2", name: "Volkswagen Amarok V6", price: 52000000, comparePrice: null, category: "Pickups", description: "La pickup más potente de su segmento. Motor V6 turbo diesel, tracción 4x4 permanente.", images: ["https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "NUEVO", attributes: [{ key: "Marca", value: "Volkswagen" }, { key: "Modelo", value: "Amarok" }, { key: "Versión", value: "V6 Extreme" }, { key: "Año", value: "2023" }, { key: "Km", value: "5.000" }, { key: "Motor", value: "3.0 V6 TDI" }, { key: "Transmisión", value: "Automática" }, { key: "Combustible", value: "Diesel" }, { key: "Tracción", value: "4x4" }, { key: "Carrocería", value: "Pickup" }, { key: "Color", value: "Gris" }, { key: "Puertas", value: "4" }] },
  { id: "auto-3", name: "Ford Ranger XLT", price: 38000000, comparePrice: null, category: "Pickups", description: "Doble cabina, tracción 4x4 selectiva. Motor TDCi turbo diesel 170 HP.", images: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1581540222194-0def2dda95b8?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1581540222194-0def2dda95b8?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [{ key: "Marca", value: "Ford" }, { key: "Modelo", value: "Ranger" }, { key: "Versión", value: "XLT" }, { key: "Año", value: "2021" }, { key: "Km", value: "45.000" }, { key: "Motor", value: "2.2 TDCi" }, { key: "Transmisión", value: "Manual" }, { key: "Combustible", value: "Diesel" }, { key: "Tracción", value: "4x4" }, { key: "Carrocería", value: "Pickup" }, { key: "Color", value: "Negro" }, { key: "Puertas", value: "4" }] },
  { id: "auto-4", name: "Chevrolet S10 LTZ", price: 34500000, comparePrice: null, category: "Pickups", description: "Full equipo, techo panorámico, cámara 360°. Ideal para trabajo y familia.", images: ["https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [{ key: "Marca", value: "Chevrolet" }, { key: "Modelo", value: "S10" }, { key: "Versión", value: "LTZ" }, { key: "Año", value: "2022" }, { key: "Km", value: "33.000" }, { key: "Motor", value: "2.8 CTDi" }, { key: "Transmisión", value: "Automática" }, { key: "Combustible", value: "Diesel" }, { key: "Tracción", value: "4x4" }, { key: "Carrocería", value: "Pickup" }, { key: "Color", value: "Plata" }, { key: "Puertas", value: "4" }] },
  { id: "auto-5", name: "Honda CR-V EXL", price: 41000000, comparePrice: null, category: "SUVs", description: "SUV premium, 7 asientos, motor turbo. Sistema Honda Sensing de seguridad activa.", images: ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "FINANCIADO", attributes: [{ key: "Marca", value: "Honda" }, { key: "Modelo", value: "CR-V" }, { key: "Versión", value: "EXL" }, { key: "Año", value: "2023" }, { key: "Km", value: "12.000" }, { key: "Motor", value: "1.5 Turbo" }, { key: "Transmisión", value: "CVT" }, { key: "Combustible", value: "Nafta" }, { key: "Tracción", value: "AWD" }, { key: "Carrocería", value: "SUV" }, { key: "Color", value: "Rojo" }, { key: "Puertas", value: "5" }] },
  { id: "auto-6", name: "Renault Duster Oroch", price: 22000000, comparePrice: 25000000, category: "Pickups", description: "La pickup compacta más versátil. Motor 1.3 turbo, suspensión elevada.", images: ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OPORTUNIDAD", attributes: [{ key: "Marca", value: "Renault" }, { key: "Modelo", value: "Duster Oroch" }, { key: "Versión", value: "Dynamique" }, { key: "Año", value: "2021" }, { key: "Km", value: "58.000" }, { key: "Motor", value: "1.3 TCe" }, { key: "Transmisión", value: "Manual" }, { key: "Combustible", value: "Nafta" }, { key: "Tracción", value: "4x2" }, { key: "Carrocería", value: "Pickup" }, { key: "Color", value: "Naranja" }, { key: "Puertas", value: "4" }] },
  { id: "auto-7", name: "Yamaha MT-07", price: 8500000, comparePrice: null, category: "Motos", description: "Naked deportiva 689cc. Motor CP2 de 73 HP. Ideal para city y ruta.", images: ["https://images.unsplash.com/photo-1558981852-426c372de4a0?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1558981852-426c372de4a0?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "NUEVO", attributes: [{ key: "Marca", value: "Yamaha" }, { key: "Modelo", value: "MT-07" }, { key: "Versión", value: "Standard" }, { key: "Año", value: "2023" }, { key: "Km", value: "2.000" }, { key: "Motor", value: "689cc" }, { key: "Transmisión", value: "Manual 6v" }, { key: "Combustible", value: "Nafta" }, { key: "Carrocería", value: "Naked" }, { key: "Color", value: "Negro" }] },
  { id: "auto-8", name: "Honda CB 500F", price: 5800000, comparePrice: null, category: "Motos", description: "Moto naked media con motor bicilíndrico paralelo. Ideal para la ciudad.", images: ["https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [{ key: "Marca", value: "Honda" }, { key: "Modelo", value: "CB 500F" }, { key: "Versión", value: "ABS" }, { key: "Año", value: "2022" }, { key: "Km", value: "15.000" }, { key: "Motor", value: "471cc" }, { key: "Transmisión", value: "Manual 6v" }, { key: "Combustible", value: "Nafta" }, { key: "Carrocería", value: "Naked" }, { key: "Color", value: "Rojo" }] },
  { id: "auto-9", name: "Toyota Hilux SRX", price: 47000000, comparePrice: null, category: "Pickups", description: "La pickup más vendida de Argentina. Motor diesel 2.8, full equipo, techo solar.", images: ["https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "DESTACADO", attributes: [{ key: "Marca", value: "Toyota" }, { key: "Modelo", value: "Hilux" }, { key: "Versión", value: "SRX" }, { key: "Año", value: "2023" }, { key: "Km", value: "18.000" }, { key: "Motor", value: "2.8 TDI" }, { key: "Transmisión", value: "Automática" }, { key: "Combustible", value: "Diesel" }, { key: "Tracción", value: "4x4" }, { key: "Carrocería", value: "Pickup" }, { key: "Color", value: "Blanco Perla" }, { key: "Puertas", value: "4" }] },
  { id: "auto-10", name: "Peugeot 208 GT", price: 18500000, comparePrice: 21000000, category: "Sedanes", description: "Hatchback premium con interior i-Cockpit. Motor PureTech 130 HP turbo.", images: ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OPORTUNIDAD", attributes: [{ key: "Marca", value: "Peugeot" }, { key: "Modelo", value: "208" }, { key: "Versión", value: "GT" }, { key: "Año", value: "2022" }, { key: "Km", value: "42.000" }, { key: "Motor", value: "1.2 PureTech" }, { key: "Transmisión", value: "Automática" }, { key: "Combustible", value: "Nafta" }, { key: "Tracción", value: "4x2" }, { key: "Carrocería", value: "Hatchback" }, { key: "Color", value: "Rojo" }, { key: "Puertas", value: "5" }] },
  { id: "auto-11", name: "Kawasaki Ninja 400", price: 7200000, comparePrice: null, category: "Motos", description: "Súper deportiva 400cc. Chasis trellis de acero, frenos radiales Nissin.", images: ["https://images.unsplash.com/photo-1558981285-6f0c94958bb6?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1558981359-219d6364c9c8?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1558981285-6f0c94958bb6?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1558981359-219d6364c9c8?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "NUEVO", attributes: [{ key: "Marca", value: "Kawasaki" }, { key: "Modelo", value: "Ninja 400" }, { key: "Versión", value: "ABS" }, { key: "Año", value: "2023" }, { key: "Km", value: "3.500" }, { key: "Motor", value: "399cc" }, { key: "Transmisión", value: "Manual 6v" }, { key: "Combustible", value: "Nafta" }, { key: "Carrocería", value: "Deportiva" }, { key: "Color", value: "Verde" }] },
  { id: "auto-12", name: "Jeep Compass Trailhawk", price: 58000000, comparePrice: null, category: "SUVs", description: "SUV aventurero con capacidad offroad real. Motor 2.0 diesel, tracción 4WD con modos.", images: ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=75","https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=75" },{ url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=75" }], sizes: [], colors: [], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "FINANCIADO", attributes: [{ key: "Marca", value: "Jeep" }, { key: "Modelo", value: "Compass" }, { key: "Versión", value: "Trailhawk" }, { key: "Año", value: "2023" }, { key: "Km", value: "9.000" }, { key: "Motor", value: "2.0 Diesel" }, { key: "Transmisión", value: "Automática 9v" }, { key: "Combustible", value: "Diesel" }, { key: "Tracción", value: "4WD" }, { key: "Carrocería", value: "SUV" }, { key: "Color", value: "Negro" }, { key: "Puertas", value: "5" }] },
];

const DEMO_PRODUCTS_HOGAR_TECH: StorefrontProduct[] = [
  { id: "hogar-1", name: "Heladera Samsung No Frost 380L", price: 899999, comparePrice: 1099999, category: "electrodomesticos", subcategory: "refrigeracion", description: "No Frost, dispenser de agua, eficiencia A+++.",
    images: [
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=700&q=75",
      "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=700&q=75",
      "https://images.unsplash.com/photo-1556909114-44e3e70034e2?auto=format&fit=crop&w=700&q=75",
    ],
    imageItems: [
      { url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=700&q=75", variantValue: "Gris" },
      { url: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=700&q=75", variantValue: "Negro" },
      { url: "https://images.unsplash.com/photo-1556909114-44e3e70034e2?auto=format&fit=crop&w=700&q=75" },
    ],
    sizes: [], colors: ["Gris","Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Marca", value:"Samsung" },{ key:"Modelo", value:"RT38" },{ key:"Garantía", value:"12 meses" },{ key:"Capacidad (litros)", value:"380" },{ key:"Tipo de frío", value:"No Frost" }] },
  { id: "hogar-2", name: "Cafetera Espresso Automática", price: 145000, comparePrice: 189000, category: "pequenos-electrodomesticos", subcategory: "desayuno", description: "Molienda integrada, 15 bares de presión.", images: ["https://images.unsplash.com/photo-1666950030199-d68343ea5a9a?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1666950030199-d68343ea5a9a?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Marca", value:"Philips" },{ key:"Garantía", value:"6 meses" },{ key:"Potencia (W)", value:"1450" }] },
  { id: "hogar-3", name: "Smartphone Xiaomi Redmi Note 13", price: 389999, comparePrice: null, featured: true, category: "celulares-y-accesorios", subcategory: "smartphones", description: "128GB, cámara 108MP, batería 5000mAh.", images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Negro","Verde","Azul"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "NUEVO", attributes: [{ key:"Marca", value:"Xiaomi" },{ key:"Modelo", value:"Redmi Note 13" },{ key:"Garantía", value:"12 meses" },{ key:"Almacenamiento", value:"128GB" },{ key:"Memoria RAM", value:"8GB" },{ key:"Pantalla", value:"6.67\" AMOLED" }] },
  { id: "hogar-4", name: "Notebook Lenovo IdeaPad 15.6\"", price: 1250000, comparePrice: 1480000, category: "informatica-y-gaming", subcategory: "notebooks", description: "Ryzen 5, 16GB RAM, SSD 512GB.", images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Gris"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Marca", value:"Lenovo" },{ key:"Modelo", value:"IdeaPad 3" },{ key:"Garantía", value:"12 meses" },{ key:"Procesador", value:"Ryzen 5 5500U" },{ key:"Memoria RAM", value:"16GB" },{ key:"Almacenamiento", value:"512GB SSD" }] },
  { id: "hogar-5", name: "Smart TV LED 55\" 4K", price: 699999, comparePrice: 849999, category: "audio-imagen-y-video", subcategory: "tvs", description: "4K UHD, Android TV, HDR10.", images: ["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Marca", value:"LG" },{ key:"Garantía", value:"12 meses" },{ key:"Pulgadas", value:"55" },{ key:"Resolución", value:"4K UHD" },{ key:"Sistema operativo", value:"Android TV" }] },
  { id: "hogar-6", name: "Sillón Reclinable de Living", price: 320000, comparePrice: null, featured: true, category: "muebles-y-colchones", subcategory: "sillones", description: "Tapizado en símil cuero, mecanismo reclinable.", images: ["https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Marrón","Gris"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [{ key:"Garantía", value:"6 meses" },{ key:"Tapizado", value:"Símil cuero" },{ key:"Plazas", value:"1" }] },
  { id: "hogar-7", name: "Set de Macetas Decorativas", price: 28500, comparePrice: 36000, category: "casa-y-jardin", subcategory: "plantas-deco", description: "Set de 3 macetas de cerámica con plato.", images: ["https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Blanco","Terracota"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Material", value:"Cerámica" }] },
  { id: "hogar-8", name: "Auriculares Bluetooth Inalámbricos", price: 65000, comparePrice: null, featured: true, category: "audio-imagen-y-video", subcategory: "auriculares", description: "Cancelación de ruido activa, 30hs de batería.", images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Negro","Blanco"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "NUEVO", attributes: [{ key:"Marca", value:"JBL" },{ key:"Garantía", value:"6 meses" },{ key:"Conectividad", value:"Bluetooth" }] },
  { id: "hogar-9", name: "Microondas Digital 28L", price: 175000, comparePrice: 210000, featured: true, category: "electrodomesticos", subcategory: "cocina", description: "Grill, 10 niveles de potencia, panel digital.", images: ["https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Marca", value:"Whirlpool" },{ key:"Garantía", value:"12 meses" },{ key:"Tipo", value:"Microondas con grill" },{ key:"Potencia (W)", value:"900" }] },
  { id: "hogar-10", name: "Monitor Gamer 27\" 144Hz", price: 420000, comparePrice: null, featured: true, category: "informatica-y-gaming", subcategory: "monitores", description: "Full HD, panel IPS, 1ms de respuesta.", images: ["https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [{ key:"Marca", value:"Samsung" },{ key:"Garantía", value:"12 meses" },{ key:"Pulgadas", value:"27" },{ key:"Resolución", value:"Full HD" }] },
  { id: "hogar-11", name: "Mesa Ratona de Madera y Hierro", price: 98000, comparePrice: null, featured: true, category: "muebles-y-colchones", subcategory: "mesas", description: "Estructura de hierro, tapa de madera maciza.", images: ["https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Marrón"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [{ key:"Material", value:"Madera y hierro" },{ key:"Medidas", value:"90x50 cm" }] },
  { id: "hogar-12", name: "Plancha de Vapor Cerámica", price: 42000, comparePrice: 54000, category: "pequenos-electrodomesticos", subcategory: "limpieza", description: "Suela cerámica antiadherente, vapor continuo.", images: ["https://images.unsplash.com/photo-1742344334557-f37e92d9ca87?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1742344334557-f37e92d9ca87?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Blanco"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Marca", value:"Philco" },{ key:"Garantía", value:"6 meses" },{ key:"Potencia (W)", value:"1800" }] },
  { id: "hogar-13", name: "Smartwatch Deportivo", price: 89000, comparePrice: 110000, category: "celulares-y-accesorios", subcategory: "wearables", description: "Pantalla AMOLED, GPS, resistente al agua.", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Negro","Rosa"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Marca", value:"Xiaomi" },{ key:"Garantía", value:"6 meses" },{ key:"Pantalla", value:"AMOLED 1.4\"" },{ key:"Autonomía de batería", value:"7 días" },{ key:"Resistencia al agua", value:"5 ATM" }] },
  { id: "hogar-14", name: "Cargador Inalámbrico Rápido", price: 18500, comparePrice: null, category: "celulares-y-accesorios", subcategory: "cargadores", description: "Carga rápida 15W, compatible con todos los celulares.", images: ["https://images.unsplash.com/photo-1591290619618-904f6dd935e3?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1591290619618-904f6dd935e3?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Negro","Blanco"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [{ key:"Garantía", value:"3 meses" },{ key:"Compatible con", value:"Universal Qi" },{ key:"Potencia (W)", value:"15" }] },
  { id: "hogar-15", name: "Funda + Vidrio Templado", price: 9500, comparePrice: null, category: "celulares-y-accesorios", subcategory: "fundas", description: "Protección completa para tu celular, varios modelos.", images: ["https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Transparente","Negro"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "NUEVO", attributes: [{ key:"Compatible con", value:"iPhone 13/14/15, Samsung A54..." }] },
  { id: "hogar-16", name: "Lámpara de Pie Nórdica", price: 56000, comparePrice: 68000, category: "casa-y-jardin", subcategory: "lamparas", description: "Estructura de madera, pantalla de tela, luz cálida.", images: ["https://images.unsplash.com/photo-1543198126-42848eb37ea7?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1543198126-42848eb37ea7?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Madera natural"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Garantía", value:"6 meses" },{ key:"Tipo de luz", value:"Cálida" }] },
  { id: "hogar-17", name: "Set de Toallones de Algodón", price: 32000, comparePrice: null, category: "casa-y-jardin", subcategory: "textiles-hogar", description: "Juego de 3 toallones 100% algodón, alta absorción.", images: ["https://images.unsplash.com/photo-1523471826770-c437b4636fe6?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1523471826770-c437b4636fe6?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Blanco","Gris","Beige"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", attributes: [{ key:"Material", value:"Algodón 100%" },{ key:"Medidas", value:"70x140 cm" }] },
  { id: "hogar-18", name: "Cortina de Living Blackout", price: 47000, comparePrice: 58000, category: "casa-y-jardin", subcategory: "textiles-hogar", description: "Tela blackout térmica, bloquea 100% la luz.", images: ["https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=75"], imageItems: [{ url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=75" }], sizes: [], colors: ["Gris","Beige"], variants: [], reelUrls: [], precioMayorista: null, cantMinMayorista: null, preciosEscalonados: [], soloMayorista: false, promoQtyMin: null, promoQtyDiscount: null, gender: "unisex", badge: "OFERTA", attributes: [{ key:"Material", value:"Blackout térmico" },{ key:"Medidas", value:"140x220 cm" }] },
];

function isSize (name: string) { return SIZE_ATTRS.includes(name.toLowerCase()); }
function isColor(name: string) { return COLOR_ATTRS.includes(name.toLowerCase()); }

type RawProduct = {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  featured?: boolean;
  viewCount?: number;
  precioMayorista?: number | null;
  cantMinMayorista?: number | null;
  preciosEscalonados?: string;
  soloMayorista?: boolean;
  promoQtyMin?: number | null;
  promoQtyDiscount?: number | null;
  promoType?: string;
  promoPayQty?: number | null;
  cuotas?: number;
  category?: string;
  subcategory?: string;
  gender?: string;
  description?: string | null;
  images?: string;
  reelUrls?: string;
  attributes?: string;
  variants?: StorefrontVariant[];
};

function mapProduct(raw: RawProduct): StorefrontProduct {
  const variants: StorefrontVariant[] = (raw.variants ?? []);
  const sizesSet  = new Set<string>();
  const colorsSet = new Set<string>();
  variants.forEach(v => {
    let attrs: Record<string, string> = {};
    try { const p = JSON.parse(v.name); if (p && typeof p === "object") attrs = p; } catch {}
    if (Object.keys(attrs).length > 0) {
      Object.entries(attrs).forEach(([k, val]) => {
        if (isSize(k)  && val) sizesSet.add(val);
        if (isColor(k) && val) colorsSet.add(val);
      });
    } else {
      if (isSize(v.name)  && v.value) sizesSet.add(v.value);
      if (isColor(v.name) && v.value) colorsSet.add(v.value);
    }
  });
  const sizes  = [...sizesSet];
  const colors = [...colorsSet];
  let images: string[] = [];
  let imageItems: { url: string; variantValue?: string }[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    imageItems = parsed
      .map((img: string | { url: string; variantValue?: string }) =>
        typeof img === "string" ? { url: img } : { url: img?.url ?? "", variantValue: img?.variantValue }
      )
      .filter((x: { url: string }) => x.url);
    images = imageItems.map(x => x.url);
  } catch { images = []; imageItems = []; }

  let reelUrls: string[] = [];
  try {
    const parsed = JSON.parse(raw.reelUrls || "[]");
    reelUrls = Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch { reelUrls = []; }

  let attributes: { key: string; value: string }[] = [];
  try {
    const parsed = JSON.parse(raw.attributes || "[]");
    attributes = Array.isArray(parsed) ? parsed.filter((a: unknown) => a && typeof a === "object") : [];
  } catch { attributes = []; }

  let preciosEscalonados: PrecioEscalonFront[] = [];
  try {
    const parsed = JSON.parse(raw.preciosEscalonados || "[]");
    if (Array.isArray(parsed)) {
      preciosEscalonados = parsed
        .filter((b: unknown) => b && typeof b === "object" && !Array.isArray(b))
        .map((b: unknown) => {
          const band = b as Record<string, unknown>;
          const desde = Number(band.desde);
          const precio = Number(band.precio);
          return { desde, precio };
        })
        .filter((b) => Number.isInteger(b.desde) && b.desde > 0 && b.precio > 0);
    }
  } catch { preciosEscalonados = []; }

  return {
    id: raw.id,
    name: raw.name,
    price: raw.price,
    comparePrice: raw.comparePrice ?? null,
    featured: raw.featured ?? false,
    viewCount: raw.viewCount ?? 0,
    precioMayorista: raw.precioMayorista ?? null,
    cantMinMayorista: raw.cantMinMayorista ?? null,
    preciosEscalonados,
    soloMayorista: raw.soloMayorista ?? false,
    promoQtyMin: raw.promoQtyMin ?? null,
    promoQtyDiscount: raw.promoQtyDiscount ?? null,
    promoType: raw.promoType ?? "PERCENT",
    promoPayQty: raw.promoPayQty ?? null,
    cuotas: raw.cuotas ?? 0,
    category: raw.category ?? "general",
    subcategory: raw.subcategory ?? undefined,
    gender: raw.gender ?? "unisex",
    description: raw.description ?? null,
    images,
    imageItems,
    reelUrls,
    sizes,
    colors,
    variants,
    attributes,
  };
}

export { isDemoProductId } from "@/lib/demoProducts";

export function getDemoPool(tipoTienda?: string | null): StorefrontProduct[] {
  return tipoTienda === "AUTOS" ? DEMO_PRODUCTS_AUTOS : tipoTienda === "HOGAR_TECH" ? DEMO_PRODUCTS_HOGAR_TECH : DEMO_PRODUCTS;
}

export function fillTargetFor(tipoTienda?: string | null): number {
  return tipoTienda === "AUTOS" || tipoTienda === "HOGAR_TECH" ? 12 : 8;
}

export function useStorefront() {
  const config = useStoreConfig();
  const storeId    = config?.storeId ?? null;
  const slug       = config?.slug ?? null;
  const previewFill = config?.previewFill ?? false;

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);

  // Lee ?ref= de la URL y registra el click de la afiliada (una vez por sesión de navegador)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el query param ?ref= de la URL (sistema externo)
    setAffiliateId(ref);

    const dedupeKey = `aff_click_${ref}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");

    const utmSource = params.get("utm_source");
    fetch("/api/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affiliateId: ref, utmSource }),
    }).catch(() => {});
  }, []);

  // Carga productos reales; usa demo cuando no hay slug (preview del dashboard)
  useEffect(() => {
    if (!slug) {
      const tipoTienda = config?.tipoTienda ?? "ROPA";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el preview demo con el tipo de tienda elegido en el editor
      setProducts(getDemoPool(tipoTienda));
      setLoadingProducts(false);
      return;
    }
    fetch(`/api/public/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const real: StorefrontProduct[] = data?.store?.products?.length
          ? data.store.products.map(mapProduct)
          : [];
        if (previewFill) {
          // En el editor: productos reales primero, demos para completar hasta el objetivo (8, o 12 para AUTOS/HOGAR_TECH)
          const tipoTienda = config?.tipoTienda ?? "ROPA";
          const demoPool = getDemoPool(tipoTienda);
          const fillTarget = fillTargetFor(tipoTienda);
          const needed = Math.max(0, fillTarget - real.length);
          setProducts([...real, ...demoPool.slice(0, needed)]);
        } else {
          setProducts(real);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [slug, previewFill, config?.tipoTienda]);

  // Encuentra el variantId que coincide con el valor seleccionado
  function resolveVariantId(product: StorefrontProduct, sizeValue: string, colorValue: string): string | null {
    if (!product.variants.length) return null;
    // Busca variante que coincida con size o color seleccionado
    const match = product.variants.find(v =>
      v.value === sizeValue || v.value === colorValue
    );
    // Si solo hay una variante, siempre la usamos
    if (!match && product.variants.length === 1) return product.variants[0].id;
    return match?.id ?? product.variants[0]?.id ?? null;
  }

  async function validateCoupon(code: string, subtotal: number): Promise<{ coupon: ValidatedCoupon; discount: number } | { error: string }> {
    if (!storeId) return { error: "Tienda no disponible" };
    const res = await fetch("/api/cupones/validar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase(), storeId, subtotal }),
    });
    return res.json();
  }

  async function placeOrder(params: PlaceOrderParams): Promise<{ ok: boolean; orderId?: string; donationId?: string; error?: string }> {
    if (!storeId) return { ok: false, error: "Tienda no disponible" };
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        affiliateId: affiliateId ?? undefined,
        couponId:        params.couponId ?? null,
        rewardCouponCode: params.rewardCouponCode ?? null,
        items: params.cartItems,
        customer: params.customer,
        shippingMethod:  params.shippingMethod,
        paymentProvider: params.paymentProvider,
        donationAmount:  params.donationAmount ?? undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || "Error al procesar el pedido" };
    return { ok: true, orderId: data.order?.id, donationId: data.donationId ?? undefined };
  }

  const storeTypeConfig    = getStoreType(config?.tipoTienda || "GENERAL");
  const checkoutMode       = storeTypeConfig.checkoutMode;
  const isWholesale        = config?.tieneVentaMayorista ?? false;
  const ocultarPrecios     = config?.ocultarPreciosPublico ?? false;
  const defaultCategories  = storeTypeConfig.categorias;
  const featuredCategories = config?.featuredCategories ?? [];
  const hasMercadoPago     = config?.hasMercadoPago ?? false;
  const shippingMethods    = config?.shippingMethods ?? null;

  return { products, loadingProducts, affiliateId, storeId, slug, isOwner: config?.isOwner ?? false, resolveVariantId, validateCoupon, placeOrder, checkoutMode, isWholesale, ocultarPrecios, defaultCategories, featuredCategories, hasMercadoPago, shippingMethods };
}
