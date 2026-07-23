"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Package, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/components/AuthProvider";

// Nav público único. Antes cada página pública se copiaba el nav a mano
// (home, contacto, precios, seguimiento, quienes-somos) y las copias se
// fueron desincronizando: quienes-somos apuntaba a /tiendas mientras el resto
// apuntaba al ancla #tiendas, y contacto/seguimiento nunca mostraron la sesión
// iniciada. Un solo componente evita que vuelva a pasar.

export type SiteNavKey =
  | "tiendas"
  | "como-funciona"
  | "quienes-somos"
  | "precios"
  | "seguimiento"
  | "contacto";

const LINKS: { key: SiteNavKey; href: string; label: string; icon?: LucideIcon }[] = [
  { key: "tiendas",       href: "/tiendas",          label: "Tiendas" },
  { key: "como-funciona", href: "/#como-funciona",   label: "Cómo funciona" },
  { key: "quienes-somos", href: "/quienes-somos",    label: "Quiénes somos" },
  { key: "precios",       href: "/precios",          label: "Precios" },
  { key: "seguimiento",   href: "/seguimiento",      label: "Seguimiento", icon: Package },
  { key: "contacto",      href: "/contacto",         label: "Contacto",    icon: MessageCircle },
];

export function SiteNav({ active, fixed = false }: { active?: SiteNavKey; fixed?: boolean }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { user } = useAuth();

  const role = user?.role;
  const panelHref  = role === "ADMIN" ? "/admin" : role === "OWNER" ? "/dashboard" : role === "SELLER" ? "/afiliados" : "/mi-cuenta";
  const panelLabel = role === "ADMIN" ? "Admin"  : role === "OWNER" ? "Mi tienda" : role === "SELLER" ? "Mi panel"   : "Mi cuenta";
  const userName = user?.name?.split(" ")[0] ?? null;

  return (
    <>
    <nav className={`${fixed ? "fixed top-0 left-0 right-0 z-50" : "relative"} bg-white/90 backdrop-blur-xl border-b border-gray-200`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <AppLogo size={72} />
          <span className="text-lg font-bold text-gray-950">TiendaApps</span>
        </Link>

        {/* El menú completo (6 links + logo + 2 botones) no entra en 768px: en
            tablet se encimaban el logo y el primer link. Aparece recién en `lg`
            (1024px), que es donde hay ancho de sobra; abajo de eso manda la
            hamburguesa. El gap arranca chico y se agranda en `xl` para respetar
            el desktop grande, que ya se veía bien. */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {LINKS.map(({ key, href, label, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className={`${active === key ? "text-gray-950" : "text-gray-500 hover:text-gray-900"} text-sm font-medium whitespace-nowrap transition-colors${Icon ? " flex items-center gap-1.5" : ""}`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-gray-500 text-sm whitespace-nowrap">Hola, {userName ?? "!"}</span>
              <Link href={panelHref} className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold whitespace-nowrap px-5 py-2.5 rounded-xl transition-all">
                {panelLabel}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium whitespace-nowrap px-5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
                Iniciar sesión
              </Link>
              <Link href="/registro" className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold whitespace-nowrap px-5 py-2.5 rounded-xl transition-all">
                Crear cuenta
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenu(true)}
          aria-label="Abrir menú"
          className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </nav>

    {/* El panel va FUERA del <nav> a propósito, y no es un detalle de orden.
        El <nav> tiene `backdrop-blur-xl`, y un elemento con backdrop-filter pasa a
        ser el bloque contenedor de sus descendientes `position: fixed` — igual que
        pasa con transform o filter. Estando adentro, el `inset-0` del panel no se
        media contra la pantalla sino contra la barra: 72 px de alto. El fondo
        blanco tapaba solo la franja del título "Menú" y los links de abajo se
        desbordaban sin nada atrás, así que se leía la página por debajo y parecía
        que el panel era transparente. Afuera del nav, `inset-0` vuelve a ser la
        pantalla entera. */}
    {mobileMenu && (
      <div className="lg:hidden fixed inset-0 z-[60] bg-white flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
            <span className="text-gray-900 font-bold">Menú</span>
            <button onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" className="text-gray-500 hover:text-gray-900">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1 px-4 py-4 flex-1">
            {LINKS.map(({ key, href, label }) => (
              <Link
                key={key}
                href={href}
                onClick={() => setMobileMenu(false)}
                className={`block ${active === key ? "text-gray-950 font-semibold" : "text-gray-700 hover:text-gray-900"} py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-200 flex flex-col gap-2 mt-2">
              {user ? (
                <Link href={panelHref} onClick={() => setMobileMenu(false)} className="text-center bg-orange-600 hover:bg-orange-500 rounded-xl py-3 text-sm font-semibold text-white transition-colors">
                  {panelLabel}
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenu(false)} className="text-center border border-gray-200 rounded-xl py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors">Iniciar sesión</Link>
                  <Link href="/registro" onClick={() => setMobileMenu(false)} className="text-center bg-orange-600 hover:bg-orange-500 rounded-xl py-3 text-sm font-semibold text-white transition-colors">Crear cuenta</Link>
                </>
              )}
            </div>
          </div>
      </div>
    )}
    </>
  );
}
