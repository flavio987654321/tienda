import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";

const CONTENT = {
  owner: {
    label: "Dueño de tienda",
    color: "text-indigo-400",
    badge: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    sections: [
      {
        title: "1. Información que recopilamos",
        body: "Al registrarte como Dueño de tienda recopilamos:",
        list: [
          "Datos de cuenta: nombre, email y contraseña (almacenada con hash bcrypt).",
          "Datos de tienda: nombre, logo, productos, precios, stock e imágenes.",
          "Datos de operación: pedidos, afiliados, estadísticas de ventas.",
          "Datos de pago: procesados por Mercado Pago. No almacenamos datos de tarjetas.",
          "Datos de uso: sesiones, acciones en el panel y eventos de la plataforma.",
        ],
      },
      {
        title: "2. Cómo usamos tu información",
        body: null,
        list: [
          "Para operar tu tienda y mostrar tus productos a compradores.",
          "Para gestionar el sistema de afiliados y liquidar comisiones.",
          "Para procesar pagos de suscripción a través de Mercado Pago.",
          "Para enviarte alertas de pedidos, vencimientos y actividad de tu tienda.",
          "Para generar estadísticas de rendimiento de tu tienda.",
          "Para prevenir fraudes y actividades maliciosas.",
        ],
      },
      {
        title: "3. Datos de tus clientes",
        body: "Como Dueño de tienda, tenés acceso a los datos de envío y contacto de tus compradores. Sos responsable de tratar esos datos de acuerdo con la legislación vigente (Ley 25.326 de Protección de Datos Personales). No podés usar esos datos para fines distintos a la gestión de pedidos.",
      },
      {
        title: "4. Compartir información",
        body: "No vendemos tus datos. Podemos compartirlos con:",
        list: [
          "Mercado Pago para procesar pagos de suscripción.",
          "Supabase y Vercel como proveedores de infraestructura bajo acuerdos de confidencialidad.",
          "Autoridades competentes cuando sea requerido por ley.",
        ],
      },
      {
        title: "5. Retención de datos",
        body: "Conservamos tus datos mientras tu cuenta esté activa. Si cancelás, mantenemos los datos por 90 días adicionales para resolver disputas pendientes. Podés solicitar la eliminación completa escribiendo a soporte@mitienda.ar",
      },
      {
        title: "6. Seguridad",
        body: "Usamos HTTPS, contraseñas hasheadas, acceso por roles y bases de datos con cifrado en reposo. Realizamos auditorías periódicas de seguridad.",
      },
      {
        title: "7. Tus derechos",
        body: "Podés solicitar en cualquier momento acceso, corrección o eliminación de tus datos enviando un email a soporte@mitienda.ar con el asunto 'Solicitud de datos'.",
      },
      {
        title: "8. Cambios a esta política",
        body: "Te notificaremos por email con al menos 15 días de anticipación ante cambios significativos.",
      },
    ],
  },
  seller: {
    label: "Vendedor/Afiliado",
    color: "text-purple-400",
    badge: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    sections: [
      {
        title: "1. Información que recopilamos",
        body: "Al registrarte como Afiliado recopilamos:",
        list: [
          "Datos de cuenta: nombre, email y contraseña (almacenada con hash bcrypt).",
          "Datos de actividad: ventas generadas, clicks en tu link, comisiones acumuladas.",
          "Datos de cobro: información necesaria para liquidar comisiones (puede incluir CUIT/CUIL).",
          "Datos de pago de suscripción: procesados por Mercado Pago.",
          "Datos de uso: acciones en el panel y tiendas visitadas.",
        ],
      },
      {
        title: "2. Cómo usamos tu información",
        body: null,
        list: [
          "Para generar y gestionar tu link personal de afiliado con tracking.",
          "Para calcular y liquidar tus comisiones.",
          "Para procesar pagos de suscripción a través de Mercado Pago.",
          "Para enviarte reportes de ventas y alertas de comisiones.",
          "Para prevenir fraudes y uso abusivo del sistema.",
        ],
      },
      {
        title: "3. Link de afiliado y tracking",
        body: "Tu link de afiliado incluye un identificador único que registra las ventas que generás. Esta información es visible solo para vos y para el dueño de la tienda a la que estás afiliado. No compartimos tus estadísticas con otros afiliados.",
      },
      {
        title: "4. Compartir información",
        body: "No vendemos tus datos. Los compartimos únicamente con:",
        list: [
          "Los dueños de tiendas a las que estés afiliado (solo tus estadísticas de ventas, no tus datos personales).",
          "Mercado Pago para procesar suscripciones.",
          "Supabase y Vercel como proveedores de infraestructura.",
          "Autoridades competentes cuando sea requerido por ley.",
        ],
      },
      {
        title: "5. Retención de datos",
        body: "Conservamos tus datos mientras tu cuenta esté activa más 90 días adicionales tras la cancelación. El historial de comisiones se conserva por 3 años a efectos impositivos.",
      },
      {
        title: "6. Seguridad",
        body: "Usamos HTTPS, contraseñas hasheadas con bcrypt y control de acceso por roles. Tus datos de comisiones son privados y solo accesibles por vos.",
      },
      {
        title: "7. Tus derechos",
        body: "Podés solicitar acceso, corrección o eliminación de tus datos en cualquier momento escribiendo a soporte@mitienda.ar con el asunto 'Solicitud de datos'.",
      },
      {
        title: "8. Cambios a esta política",
        body: "Te notificaremos por email con al menos 15 días de anticipación ante cambios significativos.",
      },
    ],
  },
  buyer: {
    label: "Cliente",
    color: "text-pink-400",
    badge: "bg-pink-500/10 border-pink-500/20 text-pink-400",
    sections: [
      {
        title: "1. Información que recopilamos",
        body: "Al registrarte como Cliente recopilamos:",
        list: [
          "Datos de cuenta: nombre, email y contraseña (almacenada con hash bcrypt).",
          "Datos de pedidos: dirección de envío, productos comprados e historial de compras.",
          "Datos de pago: procesados directamente por cada tienda. MiTienda no almacena datos de tarjetas.",
          "Datos de uso: tiendas visitadas, productos vistos y productos guardados como favoritos.",
        ],
      },
      {
        title: "2. Cómo usamos tu información",
        body: null,
        list: [
          "Para gestionar tu cuenta y permitirte hacer compras.",
          "Para mostrarte el historial de tus pedidos.",
          "Para sincronizar tus favoritos entre dispositivos.",
          "Para enviarte notificaciones de estado de tus pedidos.",
          "Para mejorar la plataforma en base a patrones de uso anónimos.",
        ],
      },
      {
        title: "3. Datos compartidos con tiendas",
        body: "Cuando realizás una compra, tus datos de envío y contacto son compartidos con el dueño de la tienda para que pueda gestionar el pedido. Esos datos son tratados por cada tienda según su propia política.",
      },
      {
        title: "4. Compartir con terceros",
        body: "No vendemos tus datos. Los compartimos con:",
        list: [
          "Tiendas dentro de la plataforma, solo los datos necesarios para completar tus pedidos.",
          "Supabase y Vercel como proveedores de infraestructura.",
          "Autoridades competentes cuando sea requerido por ley.",
        ],
      },
      {
        title: "5. Retención de datos",
        body: "Conservamos tus datos mientras tu cuenta esté activa. Si la eliminás, borramos tus datos personales en un plazo de 30 días, excepto el historial de pedidos que se conserva por 1 año a efectos de garantías.",
      },
      {
        title: "6. Cookies",
        body: "Usamos cookies de sesión para mantenerte autenticado. No usamos cookies de tracking de terceros ni publicidad comportamental.",
      },
      {
        title: "7. Seguridad",
        body: "Usamos HTTPS en todas las comunicaciones. Tus contraseñas se almacenan con hash y nunca en texto plano. Nunca te pediremos tu contraseña por email o chat.",
      },
      {
        title: "8. Tus derechos",
        body: "Podés solicitar acceso, corrección o eliminación de tus datos en cualquier momento escribiendo a soporte@mitienda.ar o desde la configuración de tu cuenta.",
      },
      {
        title: "9. Cambios a esta política",
        body: "Te notificaremos por email ante cambios significativos.",
      },
    ],
  },
};

export default function PrivacidadPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const role = (searchParams.role as keyof typeof CONTENT) ?? "buyer";
  const content = CONTENT[role] ?? CONTENT.buyer;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">MiTienda</span>
          </Link>
        </div>
      </nav>

      <div className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/registro" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" /> Volver al registro
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${content.badge}`}>
              {content.label}
            </span>
          </div>

          <h1 className="text-4xl font-black mb-2">Política de Privacidad</h1>
          <p className="text-gray-500 text-sm mb-3">Última actualización: mayo 2026</p>

          {/* Tabs por tipo */}
          <div className="flex gap-2 mb-10 flex-wrap">
            {(Object.entries(CONTENT) as [keyof typeof CONTENT, typeof CONTENT.buyer][]).map(([key, val]) => (
              <Link
                key={key}
                href={`/privacidad?role=${key}`}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  role === key ? val.badge : "border-white/10 text-gray-500 hover:text-gray-300"
                }`}
              >
                {val.label}
              </Link>
            ))}
          </div>

          <div className="space-y-8 text-gray-300">
            {content.sections.map((s) => (
              <section key={s.title}>
                <h2 className={`text-xl font-bold mb-3 ${content.color}`}>{s.title}</h2>
                {s.body && <p className="text-sm leading-relaxed">{s.body}</p>}
                {s.list && (
                  <ul className="list-disc list-inside space-y-1.5 mt-2 text-sm">
                    {s.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
