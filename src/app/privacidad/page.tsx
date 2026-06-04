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
          "Datos de verificación de identidad (voluntario y con consentimiento explícito): imágenes de DNI y selfie. Ver sección 3 bis para el detalle completo.",
        ],
      },
      {
        title: "3 bis. Verificación de identidad — datos sensibles",
        body: "El programa de Verificación de identidad es completamente voluntario. Si decidís participar, recopilamos documentos que constituyen datos sensibles según el art. 2 de la Ley 25.326 de Protección de Datos Personales:",
        list: [
          "Qué recopilamos: imagen del frente de tu DNI, imagen del dorso de tu DNI y una fotografía (selfie) sosteniéndolo.",
          "Finalidad exclusiva: confirmar que sos una persona física real, para mostrar el badge azul de verificación en tu tienda pública.",
          "Quién accede: únicamente el equipo de administración de TiendaApps, a través de URLs temporales con vencimiento de 1 hora. No se comparten con terceros, otros usuarios ni socios comerciales.",
          "Dónde se almacenan: en un bucket privado de Supabase Storage (servidores AWS us-east-1) con acceso restringido. No son accesibles públicamente.",
          "Retención: si la verificación es aprobada, los documentos se conservan mientras el badge esté activo. Si es rechazada o solicitás la eliminación, los archivos se eliminan dentro de los 30 días.",
          "Es voluntario: la verificación no es obligatoria. Podés usar la plataforma sin verificarte. Podés solicitar la eliminación de tus documentos en cualquier momento escribiendo a marketplacemitienda@gmail.com con el asunto 'Eliminar documentos de verificación — [tu email]'.",
          "Consentimiento expreso: al enviar el formulario de verificación y confirmar el envío, otorgás consentimiento expreso e informado para el tratamiento de tus datos sensibles conforme al art. 7 de la Ley 25.326. Podés revocar este consentimiento en cualquier momento solicitando la eliminación de tus documentos.",
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
        title: "3. Datos de tus clientes y potenciales compradores",
        body: "Como Dueño de tienda, tenés acceso a los datos de envío y contacto de tus compradores. Adicionalmente, cuando un potencial comprador hace una consulta por WhatsApp a través del link de un afiliado, la Plataforma registra el nombre, teléfono y mensaje del consultante y te lo muestra en el panel de Consultas para que puedas confirmar o rechazar la venta y gestionar la comisión correspondiente. Sos responsable de tratar esos datos de acuerdo con la legislación vigente (Ley 25.326 de Protección de Datos Personales) y no podés usarlos para fines distintos a la gestión del pedido o la consulta.",
      },
      {
        title: "4. Procesadores de datos (terceros que procesan tus datos)",
        body: "No vendemos tus datos. Trabajamos con los siguientes proveedores que procesan datos en tu nombre:",
        list: [
          "Supabase (supabase.com): gestión de autenticación, base de datos y almacenamiento de archivos (incluyendo documentos de verificación en bucket privado). Servidores en AWS us-east-1. Política de privacidad: supabase.com/privacy",
          "Vercel (vercel.com): hosting y ejecución de la plataforma. Servidores en AWS/Cloudflare. Política de privacidad: vercel.com/legal/privacy-policy",
          "Mercado Pago (mercadopago.com.ar): procesamiento de pagos de suscripción. Nunca almacenamos datos de tarjetas — Mercado Pago gestiona todo con cumplimiento PCI-DSS nivel 1. Política de privacidad: mercadopago.com.ar/privacidad",
          "Nodemailer / SMTP: envío de emails transaccionales (confirmaciones, alertas). Solo se comparte el email necesario para cada mensaje.",
          "Autoridades competentes cuando sea requerido por ley.",
        ],
      },
      {
        title: "5. Seguridad de tus pagos",
        body: null,
        list: [
          "TiendaApps NO almacena datos de tarjetas de crédito o débito. Todo el procesamiento de pagos lo realiza Mercado Pago, certificado PCI-DSS nivel 1 (el estándar de seguridad más alto para pagos).",
          "Las comunicaciones entre tu navegador y nuestros servidores usan HTTPS con TLS 1.2 o superior.",
          "Los datos de acceso bancario de las afiliadas (CBU, CUIL) se almacenan cifrados con AES-256-GCM.",
          "Las contraseñas se almacenan con hash bcrypt. Nunca las vemos ni podemos recuperarlas.",
        ],
      },
      {
        title: "6. Retención de datos",
        body: "Conservamos cada tipo de dato durante el período mínimo necesario:",
        list: [
          "Datos de cuenta (nombre, email): mientras la cuenta esté activa + 90 días adicionales tras la cancelación.",
          "Datos de tienda (productos, precios, imágenes): mismos plazos que la cuenta.",
          "Historial de pedidos: 12 meses adicionales tras el cierre de cuenta para resolver disputas o reclamaciones de garantía.",
          "Datos bancarios cifrados (CBU/CUIL): eliminados junto con la cuenta. No se conservan post-cancelación.",
          "Backups automáticos de base de datos: 30 días de retención gestionados por Supabase. Los backups no permiten recuperar una cuenta eliminada.",
          "Logs de auditoría y seguridad: 90 días máximo.",
          "Para solicitar eliminación anticipada escribí a marketplacemitienda@gmail.com con el asunto 'Eliminación de datos — [tu email de cuenta]'.",
        ],
      },
      {
        title: "7. Seguridad técnica",
        body: "Usamos HTTPS, contraseñas hasheadas con bcrypt, acceso por roles, bases de datos con cifrado en reposo y datos bancarios cifrados con AES-256-GCM. Realizamos revisiones periódicas de seguridad.",
      },
      {
        title: "8. Tus derechos (ARCO — Ley 25.326)",
        body: "La Ley 25.326 de Protección de Datos Personales te otorga los derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO). Para ejercerlos:",
        list: [
          "Acceso: podés solicitar qué datos tenemos sobre vos, cómo los usamos y a quién los compartimos.",
          "Rectificación: podés pedir que corrijamos datos inexactos o incompletos.",
          "Cancelación / Eliminación: podés solicitar que eliminemos tus datos cuando ya no sean necesarios o retires tu consentimiento.",
          "Oposición: podés oponerte al tratamiento de tus datos en casos justificados.",
          "Cómo ejercerlos: escribí a marketplacemitienda@gmail.com con el asunto 'Solicitud ARCO — [tipo de derecho]' indicando tu nombre completo y email de cuenta.",
          "Respondemos dentro de los 10 días hábiles conforme al art. 14 de la Ley 25.326.",
          "Si considerás que tu solicitud no fue atendida correctamente podés presentar una denuncia ante la Dirección Nacional de Protección de Datos Personales (argentina.gob.ar/aaip/datospersonales).",
        ],
      },
      {
        title: "9. Cambios a esta política",
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
        title: "3. Link de afiliado, tracking y consultas",
        body: "Tu link de afiliado incluye un identificador único que registra tanto las ventas como las consultas que generás. Cuando un potencial comprador hace clic en tu link y consulta al dueño de la tienda por WhatsApp, la Plataforma registra ese evento (consulta/lead) vinculado a tu cuenta. El nombre, teléfono y mensaje del consultante son compartidos con el dueño de la tienda para que pueda gestionar la consulta. Si el dueño confirma la venta, se acredita una comisión en tu billetera. Tus estadísticas son visibles solo para vos y para el dueño de la tienda a la que estás afiliado. No compartimos tu identidad ni datos con otros afiliados.",
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
        body: null,
        list: [
          "Datos de cuenta: mientras esté activa + 90 días adicionales tras la cancelación.",
          "Historial de comisiones: 3 años a efectos impositivos (AFIP).",
          "Datos bancarios cifrados (CBU/CUIL): eliminados al cerrar la cuenta.",
          "Para solicitar eliminación escribí a marketplacemitienda@gmail.com con el asunto 'Eliminación de datos — [tu email]'.",
        ],
      },
      {
        title: "6. Seguridad",
        body: "Usamos HTTPS, contraseñas hasheadas con bcrypt y control de acceso por roles. Tus datos de comisiones son privados y solo accesibles por vos.",
      },
      {
        title: "7. Tus derechos (ARCO — Ley 25.326)",
        body: "Podés ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición escribiendo a marketplacemitienda@gmail.com con el asunto 'Solicitud ARCO — [tipo de derecho]'. Respondemos dentro de los 10 días hábiles. Si tu solicitud no es atendida podés recurrir a la Dirección Nacional de Protección de Datos Personales (argentina.gob.ar/aaip/datospersonales).",
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
          "Datos de pago: procesados directamente por cada tienda. TiendaApps no almacena datos de tarjetas.",
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
        body: null,
        list: [
          "Datos de cuenta (nombre, email): mientras la cuenta esté activa + 30 días para eliminación completa.",
          "Historial de pedidos: 1 año tras el cierre de cuenta para resolución de garantías y disputas.",
          "Favoritos y preferencias: eliminados al eliminar la cuenta.",
          "Para eliminar tu cuenta antes del plazo escribí a marketplacemitienda@gmail.com con el asunto 'Eliminación de cuenta — [tu email]'.",
        ],
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
        title: "8. Tus derechos (ARCO — Ley 25.326)",
        body: "Podés ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición en cualquier momento:",
        list: [
          "Desde la configuración de tu cuenta para acceder o eliminar tus datos directamente.",
          "Por email a marketplacemitienda@gmail.com con el asunto 'Solicitud ARCO — [tipo de derecho]'.",
          "Respondemos dentro de los 10 días hábiles (art. 14, Ley 25.326).",
          "Si considerás que no fue atendido correctamente podés recurrir a la Dirección Nacional de Protección de Datos Personales: argentina.gob.ar/aaip/datospersonales",
        ],
      },
      {
        title: "9. Cambios a esta política",
        body: "Te notificaremos por email ante cambios significativos.",
      },
    ],
  },
};

export default async function PrivacidadPage({
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

          <h1 className="text-4xl font-black mb-2">Política de Privacidad</h1>
          <p className="text-gray-500 text-sm mb-3">Última actualización: junio 2026</p>

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
