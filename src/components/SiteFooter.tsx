import Link from "next/link";
import { Mail } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

// Footer público único, extraído del home. Ojo con "Cómo funciona": vive en el
// home, así que el href va con la barra (/#como-funciona) y no como ancla suelta
// (#como-funciona) — si no, desde contacto o precios apuntaría a una sección que
// esa página no tiene.

const PLATAFORMA = [
  { href: "/tiendas",         label: "Ver tiendas" },
  { href: "/#como-funciona",  label: "Cómo funciona" },
  { href: "/registro",        label: "Crear cuenta" },
  { href: "/login",           label: "Iniciar sesión" },
];

const AFILIADOS = [
  { href: "/afiliados",           label: "Postularme" },
  { href: "/afiliados/billetera", label: "Mis comisiones" },
  { href: "/quienes-somos",       label: "Quiénes somos" },
  { href: "/contacto",            label: "Contacto" },
];

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        {/* En celular "Plataforma" y "Afiliados" iban apiladas: dejaba el footer
            largo y con la mitad derecha vacía. Con dos columnas, la marca ocupa
            el ancho completo arriba (col-span-2) y las dos listas de links quedan
            lado a lado abajo. En desktop siguen siendo las cuatro columnas de
            siempre (grid de 4: marca 2 + las dos listas). */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 md:gap-10 mb-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <AppLogo size={32} />
              <span className="text-lg font-bold text-gray-900">TiendaApps</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              La plataforma de ecommerce con sistema de afiliados para crecer con equipo.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <Link href="/contacto" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors">
                <Mail className="h-4 w-4" /> marketplacemitienda@gmail.com
              </Link>
            </div>
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-sm mb-4">Plataforma</p>
            <ul className="space-y-2.5">
              {PLATAFORMA.map(({ href, label }) => (
                <li key={label}>
                  <Link href={href} className="text-gray-500 hover:text-gray-900 text-sm transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-sm mb-4">Afiliados</p>
            <ul className="space-y-2.5">
              {AFILIADOS.map(({ href, label }) => (
                <li key={label}>
                  <Link href={href} className="text-gray-500 hover:text-gray-900 text-sm transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-400 text-sm">© 2026 TiendaApps. Hecho con ❤️ para vos.</p>
          <p className="text-gray-400 text-xs">Plataforma ecommerce para tiendas y afiliados</p>
        </div>
      </div>
    </footer>
  );
}
