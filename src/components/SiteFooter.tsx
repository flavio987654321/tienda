import Link from "next/link";
import { Mail } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

// Footer público único, extraído del home.
//
// "Cómo funciona" salió de acá: era el ancla /#como-funciona de la galería de
// plantillas de la home, que se sacó. Los diseños se muestran ahora en los
// videos publicitarios.

const PLATAFORMA = [
  { href: "/tiendas",         label: "Ver tiendas" },
  { href: "/precios",         label: "Precios" },
  { href: "/registro",        label: "Crear cuenta" },
  { href: "/login",           label: "Iniciar sesión" },
];

/* Este footer lo lee gente SIN cuenta, y eso decide a dónde apunta cada link.
 *
 * "Postularme" mandaba a `/afiliados`, que es un panel de adentro: al que no
 * tenía sesión le hacía un flash y lo pateaba al login, y a una dueña la metía
 * en un panel que no es el suyo. Ahora va al registro de afiliado, que es lo
 * que necesita el que lee esto: crearse la cuenta.
 *
 * "Mis comisiones" se sacó por lo mismo. Era un link directo a la billetera —
 * una pantalla de adentro— colgado de un footer público. */
const AFILIADOS = [
  { href: "/registro?plan=seller", label: "Quiero ser afiliado" },
  { href: "/quienes-somos",        label: "Quiénes somos" },
  { href: "/contacto",             label: "Contacto" },
];

/* Los términos y la privacidad EXISTÍAN y no estaban linkeados en ningún lado:
   se llegaba sabiéndose la dirección de memoria. Para una plataforma que cobra
   suscripciones en Argentina eso no es un detalle de diseño.

   La ayuda va acá también: es pública y la indexa Google, así que el footer es
   su lugar natural — y de paso es la puerta para el que todavía no tiene
   cuenta y está averiguando cómo funciona. */
const AYUDA_Y_LEGAL = [
  { href: "/ayuda",      label: "Centro de ayuda" },
  { href: "/terminos",   label: "Términos y condiciones" },
  { href: "/privacidad", label: "Política de privacidad" },
];

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        {/* En celular las listas iban apiladas: dejaba el footer largo y con la
            mitad derecha vacía. Con dos columnas, la marca ocupa el ancho
            completo arriba (col-span-2) y las listas quedan de a dos abajo.

            En desktop la grilla pasó de 4 a 5 al entrar "Ayuda y legal": la
            marca sigue ocupando 2 y cada lista una. Con 4 columnas, la tercera
            lista se caía a un renglón nuevo ella sola. */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-10 md:gap-10 mb-10">
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
          <div>
            <p className="text-gray-900 font-semibold text-sm mb-4">Ayuda y legal</p>
            <ul className="space-y-2.5">
              {AYUDA_Y_LEGAL.map(({ href, label }) => (
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
