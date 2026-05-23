import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";

const CONTENT = {
  owner: {
    label: "Dueño de tienda",
    color: "text-indigo-400",
    badge: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    sections: [
      {
        title: "1. Aceptación de los términos",
        body: "Al crear una cuenta como Dueño de tienda en TiendaApps, aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no podés usar el servicio.",
      },
      {
        title: "2. Descripción del servicio para dueños",
        body: "Como Dueño de tienda, podés crear y gestionar tu propia tienda online dentro de la plataforma TiendaApps. Esto incluye cargar productos, definir precios, configurar métodos de pago y gestionar una red de vendedores afiliados que comercialicen tus productos a cambio de comisiones.",
      },
      {
        title: "3. Planes disponibles",
        body: null,
        list: [
          "Plan Tienda Pro: $20.000 ARS/mes o $180.000 ARS/año. Incluye subdominio propio (tutienda.tiendaapps.com), hasta 6 afiliados activos, hasta 10 cupones activos simultáneos y soporte por email.",
          "Plan Tienda Premium: $25.000 ARS/mes o $225.000 ARS/año. Incluye todo lo del plan Pro más la posibilidad de conectar tu propio dominio, afiliados ilimitados, cupones ilimitados y soporte prioritario.",
          "Ambos planes incluyen 7 días de prueba gratuita sin tarjeta de crédito.",
          "Los pagos se procesan a través de Mercado Pago.",
          "Ante el vencimiento, hay un período de gracia de 4 días para renovar antes de que se limite el acceso.",
          "Las suscripciones se renuevan automáticamente salvo cancelación desde el panel.",
        ],
      },
      {
        title: "4. Dominio personalizado (Plan Tienda Premium)",
        body: null,
        list: [
          "El plan Tienda Premium permite conectar un dominio propio (ej: tutienda.com) comprado por el usuario en cualquier registrar.",
          "TiendaApps realiza la configuración técnica automáticamente, sin costo adicional.",
          "El dominio es propiedad exclusiva del usuario. TiendaApps no compra, gestiona ni renueva dominios en nombre del usuario.",
          "El costo del dominio (aproximadamente USD 9-15/año) es responsabilidad del usuario ante su registrar.",
          "TiendaApps no se hace responsable por la pérdida del dominio si el usuario no lo renueva a tiempo.",
        ],
      },
      {
        title: "5. Responsabilidades del dueño",
        body: null,
        list: [
          "Sos responsable de que los productos que publiques sean legales y tengan información veraz (precios, stock, imágenes, descripción).",
          "Sos responsable de cumplir con los envíos y la atención al cliente.",
          "No podés publicar productos prohibidos, falsificados, ilegales o que infrinjan derechos de terceros.",
          "Sos responsable de las comisiones que acordés con tus afiliados.",
          "Sos responsable de cumplir con las obligaciones impositivas de tu actividad comercial.",
        ],
      },
      {
        title: "6. Gestión de afiliados",
        body: "Podés aceptar o rechazar solicitudes de afiliados para tu tienda. Al aceptar un afiliado y activar el programa, aceptás los Términos del Programa de Afiliados y te comprometés a pagarle la comisión configurada por cada venta válida generada a través de su link. Las comisiones se acreditan al confirmar el pago del pedido. TiendaApps actúa como intermediaria tecnológica en la gestión de comisiones.",
      },
      {
        title: "7. Cancelación y acceso",
        body: "Podés cancelar tu suscripción en cualquier momento desde 'Mi Plan'. Tu tienda permanecerá visible hasta el fin del período abonado. Tras el vencimiento y período de gracia, la tienda se ocultará pero tus datos no se borran — podés reactivarla en cualquier momento. La cancelación no extingue las obligaciones de pago de comisiones ya acreditadas en billeteras de afiliados activos.",
      },
      {
        title: "8. Propiedad intelectual",
        body: "Las imágenes, descripciones y contenidos que cargás en tu tienda siguen siendo de tu propiedad. Al subirlos, otorgás a TiendaApps una licencia no exclusiva para mostrarlos a compradores dentro de la plataforma.",
      },
      {
        title: "9. Modificaciones",
        body: "Podemos actualizar estos términos. Te notificaremos por email ante cambios significativos con al menos 15 días de anticipación.",
      },
      {
        title: "10. Contacto",
        body: "Para consultas escribinos a marketplacemitienda@gmail.com",
      },
    ],
  },
  seller: {
    label: "Vendedor/Afiliado",
    color: "text-purple-400",
    badge: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    sections: [
      {
        title: "1. Aceptación de los términos",
        body: "Al crear una cuenta como Vendedor/Afiliado en TiendaApps, aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no podés usar el servicio.",
      },
      {
        title: "2. Descripción del servicio para afiliados",
        body: "Como Afiliado, podés postularte a tiendas activas dentro de TiendaApps y, una vez aceptado, compartir tu link personal de afiliado para generar ventas. Por cada venta concretada a través de tu link, recibís una comisión definida por el dueño de la tienda.",
      },
      {
        title: "3. Suscripción y pagos",
        body: null,
        list: [
          "El plan Afiliado tiene un costo de $15.000 ARS/mes o $135.000 ARS/año (equivalente a 9 meses, 3 meses gratis).",
          "Incluye 7 días de prueba gratuita sin tarjeta de crédito.",
          "Al vencer la prueba, se requiere suscripción activa para generar y usar tu link de afiliado.",
          "Los pagos de suscripción se procesan a través de Mercado Pago.",
          "Las comisiones ganadas se acreditan en tu billetera digital dentro de la plataforma.",
          "El cobro de comisiones está sujeto a los períodos de liquidación de cada tienda.",
          "Podés afiliarte a múltiples tiendas simultáneamente según las disponibilidades de cada una.",
        ],
      },
      {
        title: "4. Responsabilidades del afiliado",
        body: null,
        list: [
          "No podés hacer publicidad engañosa ni prometer beneficios que la tienda no ofrece.",
          "No podés usar spam, técnicas de phishing ni prácticas desleales para generar ventas.",
          "Sos responsable de declarar tus ingresos por comisiones ante la AFIP según corresponda.",
          "No podés compartir tu link de afiliado en nombre de terceros sin autorización.",
          "Debés respetar las condiciones de cada tienda a la que estés afiliado.",
        ],
      },
      {
        title: "5. Comisiones",
        body: "Las comisiones son definidas por cada dueño de tienda y pueden variar. TiendaApps no garantiza un monto mínimo de comisión ni un volumen de ventas. Las comisiones se calculan sobre el subtotal del pedido sin envío y se acreditan automáticamente en tu billetera cuando el dueño de la tienda confirma el pago del pedido (estado Confirmado). Pedidos en estado Pendiente no generan comisión.",
      },
      {
        title: "6. Premios y beneficios",
        body: "TiendaApps puede ofrecer premios o cupones adicionales por volumen de ventas a afiliados destacados. Estos beneficios son opcionales y pueden modificarse sin previo aviso.",
      },
      {
        title: "7. Cancelación",
        body: "Podés cancelar tu suscripción en cualquier momento desde 'Mi Plan'. Tus comisiones ya acreditadas en billetera seguirán disponibles para retirar durante 30 días desde la cancelación. Si no renovás, perdés acceso a tu link de afiliado activo.",
      },
      {
        title: "8. Modificaciones",
        body: "Podemos actualizar estos términos. Te notificaremos por email ante cambios significativos con al menos 15 días de anticipación.",
      },
      {
        title: "9. Contacto",
        body: "Para consultas escribinos a marketplacemitienda@gmail.com",
      },
    ],
  },
  buyer: {
    label: "Cliente",
    color: "text-pink-400",
    badge: "bg-pink-500/10 border-pink-500/20 text-pink-400",
    sections: [
      {
        title: "1. Aceptación de los términos",
        body: "Al crear una cuenta como Cliente en TiendaApps, aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo, no podés usar el servicio.",
      },
      {
        title: "2. Descripción del servicio para clientes",
        body: "Como Cliente, podés explorar tiendas dentro de TiendaApps, agregar productos al carrito, realizar compras y hacer seguimiento de tus pedidos. La cuenta es completamente gratuita sin suscripción requerida.",
      },
      {
        title: "3. Cuenta gratuita",
        body: "La cuenta de cliente no tiene costo. No se requiere tarjeta de crédito para registrarte. Solo pagarás al realizar compras dentro de las tiendas, mediante los métodos de pago que cada tienda habilite.",
      },
      {
        title: "4. Compras y pagos",
        body: null,
        list: [
          "Los precios y condiciones de venta los define cada tienda de forma independiente.",
          "TiendaApps actúa como plataforma tecnológica y no es parte en la relación de compraventa.",
          "Las disputas sobre productos, envíos o devoluciones deben resolverse directamente con el dueño de la tienda.",
          "TiendaApps puede mediar en casos de conflicto pero no garantiza resultados.",
        ],
      },
      {
        title: "5. Responsabilidades del cliente",
        body: null,
        list: [
          "Debés brindar datos de envío correctos y completos al realizar una compra.",
          "No podés usar la plataforma para actividades fraudulentas o ilegales.",
          "Sos responsable de mantener la confidencialidad de tu cuenta y contraseña.",
          "No podés hacer chargebacks abusivos o reclamaciones falsas.",
        ],
      },
      {
        title: "6. Devoluciones y reembolsos",
        body: "Las políticas de devolución y reembolso son definidas por cada tienda. Te recomendamos consultar la política de la tienda antes de comprar. En caso de incumplimiento grave por parte de una tienda, podés reportarlo a marketplacemitienda@gmail.com",
      },
      {
        title: "7. Tus derechos como consumidor — Ley 24.240",
        body: null,
        list: [
          "Derecho a información clara y veraz: antes de comprar, tenés derecho a conocer el precio total (con envío e impuestos), descripción del producto, datos de contacto del vendedor y plazo de entrega.",
          "Derecho de arrepentimiento (art. 34): si compraste a distancia (por internet), podés cancelar la compra sin dar explicaciones dentro de los 10 días corridos desde que recibiste el producto o desde que contrataste el servicio. El vendedor debe reintegrarte el dinero sin descuentos.",
          "Garantía legal (art. 11): los productos tienen garantía mínima de 3 meses para productos usados y 6 meses para productos nuevos. Si el producto tiene un defecto, podés pedir reparación, cambio o devolución del dinero.",
          "Derecho a trato digno (art. 8 bis): tenés derecho a ser tratado con respeto y dignidad. No podés ser discriminado ni intimidado.",
          "Derecho a hacer reclamos: podés reclamar ante la tienda, ante TiendaApps (marketplacemitienda@gmail.com) o ante Defensa del Consumidor de tu provincia sin costo alguno.",
          "Para más información sobre tus derechos visitá: argentina.gob.ar/produccion/defensadelconsumidor",
        ],
      },
      {
        title: "8. Cancelación de cuenta",
        body: "Podés eliminar tu cuenta en cualquier momento desde la configuración. Tus pedidos anteriores quedan registrados a efectos de garantías o reclamos.",
      },
      {
        title: "9. Modificaciones",
        body: "Podemos actualizar estos términos. Te notificaremos por email ante cambios significativos.",
      },
      {
        title: "10. Contacto y reclamos",
        body: "Para consultas o reclamos escribinos a marketplacemitienda@gmail.com. También podés contactar a Defensa del Consumidor de tu provincia si considerás que tus derechos fueron vulnerados.",
      },
    ],
  },
};

export default async function TerminosPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleParam } = await searchParams;
  const role = (roleParam as keyof typeof CONTENT) ?? "buyer";
  const content = CONTENT[role] ?? CONTENT.buyer;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">TiendaApps</span>
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

          <h1 className="text-4xl font-black mb-2">Términos y Condiciones</h1>
          <p className="text-gray-500 text-sm mb-3">Última actualización: mayo 2026</p>

          {/* Tabs por tipo */}
          <div className="flex gap-2 mb-10 flex-wrap">
            {(Object.entries(CONTENT) as [keyof typeof CONTENT, typeof CONTENT.buyer][]).map(([key, val]) => (
              <Link
                key={key}
                href={`/terminos?role=${key}`}
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
