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
        title: "1 bis. Menores de edad",
        body: null,
        list: [
          "TiendaApps no está dirigido a personas menores de 18 años y no recopilamos intencionalmente datos personales de menores.",
          "Si tomamos conocimiento de que hemos recopilado datos de un menor de edad, procederemos a eliminar la cuenta y todos sus datos dentro de los 30 días.",
          "Para reportar una cuenta de menor de edad o solicitar la eliminación de datos de un menor escribinos a marketplacemitienda@gmail.com con el asunto 'Cuenta de menor de edad — eliminación de datos'.",
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
          "Para que Sacha, nuestro asistente con inteligencia artificial, te dé recomendaciones sobre tu tienda (ver sección 2 ter).",
        ],
      },
      {
        title: "2 ter. Sacha, asistente con inteligencia artificial",
        body: "Sacha es un asistente conversacional que te ayuda a entender cómo viene tu tienda y a usar el panel. Funciona con un modelo de inteligencia artificial de un tercero:",
        list: [
          "Qué le compartimos: datos agregados de tu tienda (nombre, tipo de rubro, cantidad de productos, ventas y pedidos de los últimos 30 días, estado de configuración del panel) y tu primer nombre. Nunca le compartimos datos personales de tus compradores (nombre, dirección, teléfono) ni datos bancarios (CBU/alias/CUIL) — solo si están configurados o no.",
          "Quién lo procesa: Anthropic (proveedor del modelo Claude), bajo sus propios términos de procesamiento de datos. Política de privacidad: anthropic.com/privacy",
          "Dónde queda la conversación: el historial del chat se guarda únicamente en tu navegador (localStorage) y se reinicia cada día. TiendaApps no guarda tus conversaciones con Sacha en su base de datos.",
          "Es parte del servicio: a diferencia de la Verificación de identidad, el uso de Sacha no requiere un consentimiento separado, ya que no procesa datos sensibles ni datos personales de terceros — solo información agregada de tu propia tienda.",
        ],
      },
      {
        title: "2 bis. Datos de suscriptores push (Plan Premium)",
        body: "Si usás la función de notificaciones push, almacenamos en tu nombre los tokens técnicos de los visitantes que se suscriben a tu tienda:",
        list: [
          "Qué almacenamos: endpoint URL de push del navegador del visitante y claves de cifrado técnicas (auth y p256dh). No almacenamos nombre, email ni ningún dato personal identificable del visitante.",
          "Finalidad exclusiva: enviar las campañas de notificaciones push que vos creás desde el panel.",
          "Duración: los tokens se conservan mientras el visitante permanezca suscripto. Se eliminan automáticamente si el navegador invalida la suscripción (ej: al borrar datos del navegador o desinstalar la app en iPhone).",
          "El visitante puede cancelar la suscripción en cualquier momento desde el banner en tu tienda pública.",
          "Sos responsable de que el contenido de las notificaciones cumpla con los Términos y Condiciones y con la legislación vigente sobre comunicaciones no solicitadas.",
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
          "Resend (resend.com): envío de emails transaccionales (confirmaciones, alertas). Solo se comparte el email necesario para cada mensaje. Política de privacidad: resend.com/legal/privacy-policy",
          "Anthropic (anthropic.com): procesa los datos agregados de tu tienda para el funcionamiento de Sacha, nuestro asistente con IA. Ver sección 2 ter para el detalle de qué le compartimos. Política de privacidad: anthropic.com/privacy",
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
        title: "1 bis. Menores de edad",
        body: null,
        list: [
          "TiendaApps no está dirigido a personas menores de 18 años y no recopilamos intencionalmente datos personales de menores.",
          "Si tomamos conocimiento de que hemos recopilado datos de un menor de edad, procederemos a eliminar la cuenta y todos sus datos dentro de los 30 días.",
          "Para reportar una cuenta de menor de edad o solicitar la eliminación de datos de un menor escribinos a marketplacemitienda@gmail.com con el asunto 'Cuenta de menor de edad — eliminación de datos'.",
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
        title: "1 bis. Menores de edad",
        body: null,
        list: [
          "TiendaApps no está dirigido a personas menores de 18 años y no recopilamos intencionalmente datos personales de menores.",
          "Si tomamos conocimiento de que hemos recopilado datos de un menor de edad, procederemos a eliminar la cuenta y todos sus datos dentro de los 30 días.",
          "Para reportar una cuenta de menor de edad o solicitar la eliminación de datos de un menor escribinos a marketplacemitienda@gmail.com con el asunto 'Cuenta de menor de edad — eliminación de datos'.",
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
        title: "3 bis. Política de privacidad de cada tienda",
        body: null,
        list: [
          "Cada tienda dentro de TiendaApps puede publicar su propia Política de Privacidad, redactada por el dueño de esa tienda.",
          "TiendaApps no redacta, revisa ni avala el contenido de esas políticas individuales. Son responsabilidad exclusiva del dueño de cada tienda.",
          "Al comprar en una tienda, tus datos pueden ser tratados también según la política de privacidad de esa tienda en particular.",
          "Te recomendamos leer la política de privacidad de cada tienda antes de realizar una compra.",
          "Si una tienda usa tus datos de manera inapropiada o contraria a lo declarado, podés reportarlo a marketplacemitienda@gmail.com",
        ],
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
        title: "6 bis. Notificaciones push de tiendas",
        body: "Si elegís activar notificaciones en una tienda de la plataforma:",
        list: [
          "Almacenamos un token técnico de suscripción de tu navegador (endpoint URL y claves de cifrado). Este token no contiene tu nombre, email ni datos personales identificables.",
          "El token se usa exclusivamente para enviarte notificaciones de esa tienda puntual. No lo compartimos con otros usuarios, otras tiendas ni terceros.",
          "Podés cancelar la suscripción en cualquier momento tocando el banner de notificaciones en la tienda y eligiendo 'Desactivar'. El token se elimina del servidor de inmediato.",
          "Si borrás los datos del navegador o desinstalás la app (en iPhone), la suscripción queda inválida y se elimina automáticamente del servidor la próxima vez que intentamos enviarte una notificación.",
          "La suscripción a notificaciones es voluntaria y no afecta tu acceso a la tienda ni a tus compras.",
        ],
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
  donor: {
    label: "Donante / Comunidad Solidaria",
    color: "text-amber-400",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    sections: [
      {
        title: "1. Información que recopilamos",
        body: "Si donás a una campaña o iniciás una solicitud de ayuda en la Comunidad Solidaria, recopilamos:",
        list: [
          "Datos de la donación: nombre, teléfono, email, localidad y preferencia de envío/retiro.",
          "Datos de pago: el monto donado y un identificador de pago de Mercado Pago. No almacenamos datos de tarjetas — los procesa directamente Mercado Pago.",
          "Si iniciás una solicitud de ayuda: nombre, email, teléfono, localidad, edad (opcional) y el mensaje donde contás tu situación. Ese mensaje puede incluir información sensible si decidís compartirla (por ejemplo, tu situación de salud o económica).",
          "Cuenta de usuario (opcional): si donás con sesión iniciada, vinculamos la donación a tu cuenta. También podés donar sin crear una cuenta.",
        ],
      },
      {
        title: "1 bis. Menores de edad",
        body: null,
        list: [
          "TiendaApps no está dirigido a personas menores de 18 años y no recopilamos intencionalmente datos personales de menores.",
          "Si tomamos conocimiento de que hemos recopilado datos de un menor de edad, procederemos a eliminar la cuenta y todos sus datos dentro de los 30 días.",
          "Para reportar una cuenta de menor de edad o solicitar la eliminación de datos de un menor escribinos a tiendaapps.solidaria@gmail.com con el asunto 'Cuenta de menor de edad — eliminación de datos'.",
        ],
      },
      {
        title: "2. Cómo usamos tu información",
        body: null,
        list: [
          "Para confirmar tu donación y darte acceso al seguimiento de la campaña correspondiente.",
          "Para contactarte por email o teléfono sobre el estado de la campaña o tu solicitud de ayuda.",
          "Para evaluar tu solicitud de ayuda y, si corresponde, publicar una campaña.",
          "Para prevenir donaciones duplicadas o fraudulentas (una donación confirmada por persona, por campaña).",
        ],
      },
      {
        title: "3. Información sensible en tu solicitud de ayuda",
        body: "Si nos escribís contando tu situación para pedir ayuda, ese mensaje puede contener datos sensibles según el art. 2 de la Ley 25.326 (por ejemplo, salud o situación económica):",
        list: [
          "Tratamos esa información con confidencialidad: solo la lee el equipo de administración de TiendaApps para evaluar tu solicitud.",
          "No publicamos tu solicitud ni tu situación en la web. Si decidimos armar una campaña a partir de tu historia, te consultamos antes qué información, fotos o videos vas a compartir públicamente, y solo publicamos lo que autorices expresamente.",
          "El mensaje se envía por email al equipo de TiendaApps y no queda guardado en una base de datos propia del formulario.",
          "Podés pedir que eliminemos tu solicitud o que no la tengamos más en cuenta escribiendo a tiendaapps.solidaria@gmail.com.",
        ],
      },
      {
        title: "4. Publicación de agradecimientos",
        body: "Si tu campaña se concreta y sos la familia beneficiaria elegida, podés compartir un mensaje, foto o video agradeciendo, que publicamos en la página de la campaña. Solo publicamos contenido que nos autorices expresamente a mostrar, y podés pedir que lo bajemos en cualquier momento.",
      },
      {
        title: "5. Procesadores de datos (terceros que procesan tus datos)",
        body: "No vendemos tus datos. Trabajamos con los siguientes proveedores:",
        list: [
          "Mercado Pago (mercadopago.com.ar): procesamiento del pago de tu donación. Nunca almacenamos datos de tarjetas.",
          "Resend (resend.com): envío de los emails de confirmación y de las consultas del formulario de ayuda.",
          "Supabase (supabase.com) y Vercel (vercel.com): infraestructura de base de datos y hosting de la plataforma.",
          "Autoridades competentes cuando sea requerido por ley.",
        ],
      },
      {
        title: "6. Retención de datos",
        body: null,
        list: [
          "Datos de la donación (nombre, teléfono, email, localidad): se conservan junto con el historial de la campaña, para sostener la transparencia pública y permitir reclamos.",
          "Solicitudes de ayuda enviadas por email: se conservan en la casilla de correo del equipo mientras sea necesario para evaluar y dar seguimiento a tu pedido.",
          "Para solicitar la eliminación de tus datos como donante escribí a tiendaapps.solidaria@gmail.com con el asunto 'Eliminación de datos — donación'.",
        ],
      },
      {
        title: "7. Seguridad",
        body: "Las comunicaciones con nuestros servidores usan HTTPS. El pago lo procesa Mercado Pago, certificado PCI-DSS nivel 1. No almacenamos datos de tarjetas en ningún momento.",
      },
      {
        title: "8. Tus derechos (ARCO — Ley 25.326)",
        body: "Podés ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición escribiendo a tiendaapps.solidaria@gmail.com con el asunto 'Solicitud ARCO — [tipo de derecho]'. Respondemos dentro de los 10 días hábiles. Si tu solicitud no es atendida podés recurrir a la Dirección Nacional de Protección de Datos Personales (argentina.gob.ar/aaip/datospersonales).",
      },
      {
        title: "9. Cambios a esta política",
        body: "Te notificaremos por los canales de contacto que nos dejaste ante cambios significativos.",
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
          <p className="text-gray-500 text-sm mb-6">Última actualización: junio 2026</p>

          {/* Responsable del tratamiento */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-8 text-sm text-gray-300 space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Responsable del tratamiento de datos</p>
            <p><span className="text-gray-500">Nombre:</span> Flavio Cesar Soltero Legoas</p>
            <p><span className="text-gray-500">CUIL:</span> 20-94992405-0</p>
            <p><span className="text-gray-500">Domicilio:</span> Buenos Aires, Argentina</p>
            <p><span className="text-gray-500">Email:</span>{" "}
              <a href="mailto:marketplacemitienda@gmail.com" className="text-indigo-400 hover:underline">marketplacemitienda@gmail.com</a>
            </p>
            <p><span className="text-gray-500">Plataforma:</span> TiendaApps</p>
          </div>

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
