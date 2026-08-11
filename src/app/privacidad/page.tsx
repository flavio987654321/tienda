import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import PaginaLegalPlataforma, { rolValido } from "@/components/legal/PaginaLegalPlataforma";

const DESCRIPTION =
  "Política de privacidad de TiendaApps: qué datos guardamos, para qué los usamos, cuánto los conservamos y cómo pedir que los borremos.";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: DESCRIPTION,
  alternates: { canonical: "/privacidad" },
  openGraph: {
    title: "Política de Privacidad | TiendaApps",
    description: DESCRIPTION,
    url: siteUrl("/privacidad"),
  },
};

const CONTENT = {
  owner: {
    label: "Dueño de tienda",
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
          "Datos de verificación de identidad (voluntario y con consentimiento explícito): imágenes de DNI y selfie; número de CUIT/CUIL si lo informás voluntariamente. Ver sección 3 bis para el detalle completo.",
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
          "Qué recopilamos: imagen del frente de tu DNI, imagen del dorso de tu DNI y una fotografía (selfie) sosteniéndolo. Adicionalmente, si lo informás de forma voluntaria, tu número de CUIT o CUIL.",
          "CUIT/CUIL (opcional): es un dato de carácter público, verificable en el sitio oficial de AFIP. TiendaApps lo usa únicamente para cotejar actividad comercial registrada. No almacenamos documentos fiscales ni constancias — solo el número ingresado.",
          "Finalidad exclusiva: confirmar que sos una persona física real (y, si informás tu CUIT/CUIL, que tenés actividad comercial registrada), para mostrar el badge azul de verificación en tu tienda pública.",
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
          "Para que Sasha, nuestro asistente con inteligencia artificial, te dé recomendaciones sobre tu tienda (ver sección 2 ter).",
        ],
      },
      {
        title: "2 bis a. Base legal de cada tratamiento (Ley 25.326)",
        body: "Conforme al art. 5 de la Ley 25.326, cada tratamiento de datos tiene la siguiente base legal:",
        list: [
          "Datos de cuenta y operación de la tienda (nombre, email, productos, pedidos): ejecución del contrato de servicio entre vos y TiendaApps (art. 5 inc. b).",
          "Datos bancarios de afiliados (CBU, CUIL, alias): ejecución del contrato de afiliación y liquidación de comisiones (art. 5 inc. b).",
          "Datos de verificación de identidad (DNI, selfie): consentimiento expreso del titular (art. 5 inc. a y art. 7). Es voluntario y revocable.",
          "Datos de suscriptores push: consentimiento expreso del visitante al suscribirse (art. 5 inc. a).",
          "Logs de auditoría y seguridad: interés legítimo en la prevención de fraudes y obligación legal (art. 5 inc. c y f).",
          "Historial de pedidos conservado post-cancelación: obligación legal para resolución de disputas (Ley 24.240 art. 10 bis) e interés legítimo (art. 5 inc. f).",
          "Respaldo de registros de ventas ante un cambio de rubro: obligación legal de conservación de documentación comercial (art. 328 del Código Civil y Comercial) e interés legítimo en la defensa ante disputas y contracargos (art. 5 inc. f).",
          "Datos de contacto para envío de emails transaccionales: ejecución del contrato (art. 5 inc. b).",
        ],
      },
      {
        title: "2 ter. Sasha, asistente con inteligencia artificial",
        body: "Sasha es un asistente conversacional que te ayuda a entender cómo viene tu tienda y a usar el panel. Funciona con un modelo de inteligencia artificial de un tercero:",
        list: [
          "Qué le compartimos: datos agregados de tu tienda (nombre, tipo de rubro, cantidad de productos, ventas y pedidos de los últimos 30 días, estado de configuración del panel) y tu primer nombre. Nunca le compartimos datos personales de tus compradores (nombre, dirección, teléfono) ni datos bancarios (CBU/alias/CUIL) — solo si están configurados o no.",
          "Quién lo procesa: Anthropic (proveedor del modelo Claude), bajo sus propios términos de procesamiento de datos. Política de privacidad: anthropic.com/privacy",
          "Dónde queda la conversación: el historial del chat se guarda únicamente en tu navegador (localStorage) y se reinicia cada día. TiendaApps no guarda tus conversaciones con Sasha en su base de datos.",
          "Es parte del servicio: a diferencia de la Verificación de identidad, el uso de Sasha no requiere un consentimiento separado, ya que no procesa datos sensibles ni datos personales de terceros — solo información agregada de tu propia tienda.",
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
        title: "2 quater. Datos de la ruleta o raspadita de premios (gamificación)",
        body: "Si activás el widget de ruleta o raspadita en tu tienda, almacenamos en tu nombre los datos de los visitantes que participan:",
        list: [
          "Qué almacenamos: el email del visitante (si tu configuración lo pide), su dirección IP, y el resultado del sorteo (qué premio ganó o si no ganó nada).",
          "Finalidad exclusiva: evitar que la misma persona participe más de una vez mientras tenga un premio vigente sin usar, y entregarle su cupón por email si ganó.",
          "Duración: se conserva mientras el widget exista. Si borrás el widget desde el panel, este registro deja de usarse para nuevos sorteos, pero no se elimina automáticamente (podés pedir su eliminación por los medios de contacto de esta política).",
          "Sos responsable de que el mensaje legal que cargues en el widget (si lo cargás) cumpla con la legislación vigente sobre promociones.",
        ],
      },
      {
        title: "2 quinquies. Integración con Meta — Catálogo en Facebook e Instagram",
        body: "Desde la sección Aplicaciones podés conectar tu tienda con Meta (Facebook e Instagram) para sincronizar tu catálogo de productos. Esta integración es completamente opcional:",
        list: [
          "Qué recopilamos al conectar: un token de acceso otorgado por Facebook mediante tu autorización expresa (almacenado cifrado con AES-256-GCM), el identificador de tu usuario de Facebook, y los identificadores de tu portfolio comercial, catálogo y feed de productos en Meta. Nunca vemos tu contraseña de Facebook.",
          "Qué compartimos con Meta: los datos de tu catálogo de productos — nombre, descripción, precio, imágenes, disponibilidad y link de cada producto. Esta es la finalidad exclusiva de la integración: que tus productos aparezcan en Facebook e Instagram.",
          "Qué NO compartimos con Meta: datos personales de tus compradores, pedidos, datos bancarios ni ninguna otra información de tu cuenta de TiendaApps.",
          "Qué NO accedemos de tu Facebook: no leemos tus publicaciones, amigos, mensajes ni ningún contenido personal — solo los permisos de administración de negocios y catálogos que autorizás en la pantalla de conexión.",
          "Los datos que Meta recibe se rigen por su propia política de privacidad: facebook.com/privacy",
          "Eliminación de los datos de la integración: podés desconectar Facebook en cualquier momento desde tu panel (Aplicaciones → Catálogo de Meta → Desconectar) — al hacerlo eliminamos de inmediato el token de acceso y todos los identificadores de Meta de nuestra base de datos. También podés revocar el acceso desde tu propia cuenta de Facebook (Configuración → Integraciones comerciales) o solicitar la eliminación por email a marketplacemitienda@gmail.com con el asunto 'Eliminar datos de Meta — [tu email]'. El catálogo creado en Meta te pertenece y se administra desde Meta Commerce Manager.",
          "Si además conectás la app 'Catálogo en WhatsApp', usamos ese mismo token para vincular tu catálogo a tu WhatsApp Business — se guarda únicamente el identificador de esa cuenta de WhatsApp Business, con las mismas reglas de esta sección.",
        ],
      },
      {
        title: "2 sexies. Integración con Google Analytics",
        body: "Desde la sección Aplicaciones podés conectar tu cuenta de Google Analytics para medir las visitas de tu tienda automáticamente, sin copiar ningún ID a mano. Esta integración es completamente opcional:",
        list: [
          "Qué recopilamos al conectar: un token de acceso otorgado por Google mediante tu autorización expresa (almacenado cifrado con AES-256-GCM), y los identificadores de tu cuenta y propiedad de Google Analytics. Nunca vemos tu contraseña de Google.",
          "Qué hacemos con ese acceso: buscamos si ya tenés una propiedad de Google Analytics para reusarla, o creamos una nueva si no tenés, y creamos un 'flujo de datos web' para conseguir el ID de medición de tu tienda. Esta es la finalidad exclusiva de la integración.",
          "Qué NO hacemos: no leemos ningún dato de tráfico, visitas ni reportes de tu cuenta de Google Analytics, ni accedemos a ningún otro producto de tu cuenta de Google (Gmail, Drive, etc.) — el permiso que pedimos solo alcanza para configurar la conexión.",
          "Los datos que Google recibe se rigen por su propia política de privacidad: policies.google.com/privacy",
          "Eliminación de los datos de la integración: podés desconectar Google en cualquier momento desde tu panel (Aplicaciones → Google Analytics → Desconectar) — al hacerlo eliminamos de inmediato el token de acceso de nuestra base de datos. También podés revocar el acceso desde myaccount.google.com/permissions o solicitar la eliminación por email a marketplacemitienda@gmail.com con el asunto 'Eliminar datos de Google — [tu email]'.",
        ],
      },
      {
        title: "2 septies. Meta Pixel propio de TiendaApps (publicidad de la plataforma)",
        body: "TiendaApps hace publicidad en Facebook e Instagram para conseguir nuevos usuarios, y para medir si esa publicidad funciona usa un Meta Pixel propio en las páginas de la plataforma. Es distinto e independiente del Meta Pixel que vos podés configurar para tu tienda: aquel es tuyo y mide a tus compradores, este es nuestro y mide a quienes navegan TiendaApps.",
        list: [
          "Dónde funciona: en las páginas de la plataforma — inicio, precios, registro, planes, tu panel y demás secciones de TiendaApps.",
          "Dónde NO funciona: dentro de las tiendas públicas de los usuarios (las direcciones /tienda/...), en la página pública de seguimiento de pedidos, en los links de afiliado compartidos, ni en ninguna página de la Canasta Solidaria. En esas páginas nuestro pixel no se carga. Es una decisión deliberada: no medimos a tus compradores, y así tampoco se le mezclan datos a la medición de tu propio pixel.",
          "Qué recopila: las páginas de TiendaApps que visitás, y dos momentos concretos — cuando completás el registro (indicando solo el tipo de cuenta: dueño de tienda, afiliado o comprador) y cuando un alta de dueño de tienda inicia la prueba gratuita. Meta instala sus propias cookies (_fbp y, si llegaste desde un anuncio, _fbc) para reconocer el navegador.",
          "Qué NO le mandamos: tu nombre, tu email, tu teléfono, tu contraseña, los datos de tu tienda, tus productos, tus ventas ni los datos de tus compradores. No usamos la función de 'coincidencias avanzadas' en este pixel.",
          "Finalidad: saber qué campañas publicitarias traen usuarios que efectivamente abren una tienda, para no gastar en las que no funcionan y mostrar los anuncios a personas con intereses parecidos. Base legal: interés legítimo (art. 5 inc. 2 de la Ley 25.326).",
          "Los datos que Meta recibe se rigen por su propia política de privacidad: facebook.com/privacy",
          "Cómo evitarlo: podés bloquear estas cookies desde la configuración de tu navegador, usar cualquier extensión de bloqueo de rastreadores, o ajustar qué usa Meta para mostrarte anuncios en facebook.com/adpreferences. Bloquearlo no afecta en nada tu cuenta ni el funcionamiento de tu tienda.",
        ],
      },
      {
        title: "3. Datos de tus clientes y potenciales compradores",
        body: "Como Dueño de tienda, tenés acceso a los datos de envío y contacto de tus compradores. Adicionalmente, cuando un potencial comprador hace una consulta por WhatsApp a través del link de un afiliado, la Plataforma registra el nombre, teléfono y mensaje del consultante y te lo muestra en el panel de Consultas para que puedas confirmar o rechazar la venta y gestionar la comisión correspondiente. Sos responsable de tratar esos datos de acuerdo con la legislación vigente (Ley 25.326 de Protección de Datos Personales) y no podés usarlos para fines distintos a la gestión del pedido o la consulta.",
        list: [
          "Carritos abandonados: si alguien carga sus datos en tu checkout y no termina la compra, vas a ver su email, nombre, teléfono y los productos elegidos en la sección Carritos abandonados. Es la misma obligación que con el resto: solo podés usar esos datos para intentar recuperar esa compra puntual (un recordatorio o un mensaje por WhatsApp), nunca para sumarlos a una lista de difusión ni para ofrecerles otra cosa.",
          "Esos carritos se eliminan solos a los 45 días sin actividad si la compra no se completó. Si la persona te pide que borres sus datos, tenés que hacerlo aunque no hayan pasado los 45 días.",
        ],
      },
      {
        title: "4. Procesadores de datos (terceros que procesan tus datos)",
        body: "No vendemos tus datos. Trabajamos con los siguientes proveedores que procesan datos en tu nombre:",
        list: [
          "Transferencias internacionales: los proveedores detallados a continuación procesan datos en servidores fuera de Argentina (principalmente EE.UU.). Al usar TiendaApps, aceptás estas transferencias internacionales conforme al art. 12 de la Ley 25.326.",
          "Supabase (supabase.com): gestión de autenticación, base de datos y almacenamiento de archivos (incluyendo documentos de verificación en bucket privado). Servidores en AWS us-east-1. Política de privacidad: supabase.com/privacy",
          "Vercel (vercel.com): hosting y ejecución de la plataforma. Servidores en AWS/Cloudflare. Política de privacidad: vercel.com/legal/privacy-policy",
          "Mercado Pago (mercadopago.com.ar): procesamiento de pagos de suscripción. Nunca almacenamos datos de tarjetas — Mercado Pago gestiona todo con cumplimiento PCI-DSS nivel 1. Política de privacidad: mercadopago.com.ar/privacidad",
          "Resend (resend.com): envío de emails transaccionales (confirmaciones, alertas). Solo se comparte el email necesario para cada mensaje. Política de privacidad: resend.com/legal/privacy-policy",
          "Anthropic (anthropic.com): procesa los datos agregados de tu tienda para el funcionamiento de Sasha, nuestro asistente con IA. Ver sección 2 ter para el detalle de qué le compartimos. Política de privacidad: anthropic.com/privacy",
          "Envíopack (enviopack.com): si activás la cotización automática de envío, le compartimos la dirección de origen de tu tienda y el peso de los productos para calcular tarifas con Correo Argentino, OCA y Andreani. Política de privacidad: enviopack.com",
          "Meta Platforms (facebook.com): si conectás el Catálogo de Meta o Catálogo en WhatsApp desde la sección Aplicaciones, le compartimos los datos de tu catálogo de productos (ver sección 2 quinquies). Además, recibe los datos de navegación por las páginas de la plataforma que recoge nuestro propio Meta Pixel, que funciona siempre (ver sección 2 septies). Política de privacidad: facebook.com/privacy",
          "Google LLC (google.com): si conectás Google Analytics desde la sección Aplicaciones, usamos tu autorización para configurar tu propiedad de Analytics (ver sección 2 sexies). Política de privacidad: policies.google.com/privacy",
          "Autoridades competentes cuando sea requerido por ley.",
        ],
      },
      {
        title: "5. Seguridad de tus pagos",
        body: null,
        list: [
          "TiendaApps NO almacena datos de tarjetas de crédito o débito. Todo el procesamiento de pagos lo realiza Mercado Pago, certificado PCI-DSS nivel 1 (el estándar de seguridad más alto para pagos).",
          "Las comunicaciones entre tu navegador y nuestros servidores usan HTTPS con TLS 1.2 o superior.",
          "Los datos de acceso bancario de las afiliadas (CBU, CUIL), los tokens de MercadoPago y los tokens de acceso de Meta/Facebook se almacenan cifrados con AES-256-GCM.",
          "Las contraseñas se almacenan con hash bcrypt. Nunca las vemos ni podemos recuperarlas.",
        ],
      },
      {
        title: "6. Retención de datos",
        body: "Conservamos cada tipo de dato durante el período mínimo necesario:",
        list: [
          "Datos de cuenta (nombre, email): mientras la cuenta esté activa + 90 días adicionales tras la cancelación.",
          "Datos de tienda (productos, precios, imágenes): mismos plazos que la cuenta.",
          "Tienda cerrada ≠ cuenta cancelada: si cerrás tu tienda (o se cierra sola por falta de pago), tu cuenta sigue activa — podés entrar a tu panel y reactivarla cuando quieras. Por eso tu diseño, tus productos y tus imágenes se conservan sin plazo mientras no elimines la cuenta. El plazo de 90 días de arriba corre desde que eliminás la cuenta, no desde que cerrás la tienda.",
          "Si tenés una tienda cerrada y querés que borremos todo igual, podés eliminar tu cuenta desde Configuración → Zona de peligro, o pedirlo por email (ver sección 8).",
          "Historial de pedidos: 12 meses adicionales tras el cierre de cuenta para resolver disputas o reclamaciones de garantía.",
          "Carritos abandonados de tu tienda: se eliminan automáticamente a los 45 días sin actividad si la compra no se completó. Los que sí terminaron en compra quedan como parte del pedido y siguen su mismo plazo.",
          "Respaldo por cambio de rubro: si cambiás el tipo de tienda, los pedidos, pagos, comisiones y cupones del ciclo anterior se eliminan de tu panel, pero se conserva una copia interna de respaldo por hasta 10 años (plazo de conservación de documentación comercial, art. 328 del Código Civil y Comercial), con finalidad exclusiva contable y de resolución de disputas o contracargos. Podés descargarla en cualquier momento desde Configuración → Respaldos.",
          "Datos bancarios cifrados (CBU/CUIL): eliminados junto con la cuenta. No se conservan post-cancelación.",
          "Backups automáticos de base de datos: 30 días de retención gestionados por Supabase. Los backups no permiten recuperar una cuenta eliminada.",
          "Logs técnicos del servidor (Vercel): hasta 24 horas, gestionados automáticamente por la infraestructura de Vercel. Incluyen registros de webhooks de MercadoPago y errores de sistema.",
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
          "Excepción por obligación legal (art. 16 inc. 5, Ley 25.326): los datos que integran respaldos conservados por obligación legal — como los registros de ventas archivados ante un cambio de rubro — pueden quedar exceptuados de la supresión inmediata. En ese caso se mantienen bloqueados (solo disponibles ante disputas, contracargos o requerimiento de autoridad) hasta vencer el plazo de conservación.",
          "Oposición: podés oponerte al tratamiento de tus datos en casos justificados.",
          "Cómo ejercerlos: escribí a marketplacemitienda@gmail.com con el asunto 'Solicitud ARCO — [tipo de derecho]' indicando tu nombre completo y email de cuenta.",
          "Respondemos dentro de los 10 días hábiles conforme al art. 14 de la Ley 25.326.",
          "Si considerás que tu solicitud no fue atendida correctamente podés presentar una denuncia ante la Dirección Nacional de Protección de Datos Personales (argentina.gob.ar/aaip/datospersonales).",
          "TiendaApps se encuentra inscripta en el Registro Nacional de Bases de Datos Personales de la AAIP bajo el legajo N° RL-2026-67455817-APN-DNPDP#AAIP.",
        ],
      },
      {
        title: "9. Cambios a esta política",
        body: "Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
      },
    ],
  },
  seller: {
    label: "Vendedor/Afiliado",
    sections: [
      {
        title: "1. Información que recopilamos",
        body: "Al registrarte como Afiliado recopilamos:",
        list: [
          "Datos de cuenta: nombre, email y contraseña (almacenada con hash bcrypt).",
          "Datos de actividad: ventas generadas, clicks en tu link, comisiones acumuladas.",
          "Datos de cobro: información necesaria para liquidar comisiones (puede incluir CUIT/CUIL, CBU/alias), almacenada cifrada con AES-256-GCM.",
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
          "Para enviarte reportes de ventas y alertas de comisiones.",
          "Para prevenir fraudes y uso abusivo del sistema.",
        ],
      },
      {
        title: "3. Link de afiliado, tracking y consultas",
        body: "Tu link de afiliado incluye un identificador único que registra tanto las ventas como las consultas que generás. Cuando un potencial comprador hace clic en tu link y consulta al dueño de la tienda por WhatsApp, la Plataforma registra ese evento (consulta/lead) vinculado a tu cuenta. El nombre, teléfono y mensaje del consultante son compartidos con el dueño de la tienda para que pueda gestionar la consulta. Si el dueño confirma la venta, se acredita una comisión en tu billetera. Tus estadísticas son visibles solo para vos y para el dueño de la tienda a la que estás afiliado. No compartimos tu identidad ni datos con otros afiliados.",
      },
      {
        title: "3 bis. Meta Pixel propio de TiendaApps (publicidad de la plataforma)",
        body: "TiendaApps hace publicidad en Facebook e Instagram y usa un Meta Pixel propio para medir si funciona. No tiene nada que ver con tu actividad como afiliado ni con tus comisiones:",
        list: [
          "Dónde funciona: en las páginas de la plataforma — inicio, registro, precios y tu panel de afiliado.",
          "Dónde NO funciona: dentro de las tiendas públicas (/tienda/...), en la página de seguimiento de pedidos, en los links de afiliado que compartís, ni en ninguna página de la Canasta Solidaria. Cuando alguien abre tu link, nuestro pixel no se carga: ni le medimos la navegación a esa persona, ni queda registrado nada tuyo ahí.",
          "Qué recopila: las páginas de TiendaApps que visitás y si completás el registro (indicando solo el tipo de cuenta). Meta instala sus cookies _fbp y _fbc.",
          "Qué NO le mandamos: tu nombre, email, teléfono, tus estadísticas de ventas, tus comisiones ni los datos de los compradores que consultan por tu link.",
          "Los datos que Meta recibe se rigen por su política de privacidad: facebook.com/privacy. Podés bloquearlo desde tu navegador o ajustar tus preferencias en facebook.com/adpreferences, sin que afecte tu cuenta ni tus comisiones.",
        ],
      },
      {
        title: "4. Compartir información",
        body: "No vendemos tus datos. Los compartimos únicamente con:",
        list: [
          "Los dueños de tiendas a las que estés afiliado (solo tus estadísticas de ventas, no tus datos personales).",
          "MercadoPago: procesamos cobros a través de la cuenta de MercadoPago del dueño de la tienda. TiendaApps no almacena tokens de acceso de MP de los afiliados.",
          "Supabase y Vercel como proveedores de infraestructura.",
          "Meta Platforms: los datos de navegación por las páginas de la plataforma que recoge nuestro Meta Pixel (ver sección 3 bis).",
          "Autoridades competentes cuando sea requerido por ley.",
        ],
      },
      {
        title: "5. Retención de datos",
        body: null,
        list: [
          "Datos de cuenta: mientras esté activa + 90 días adicionales tras la cancelación.",
          "Historial de comisiones: 3 años a efectos impositivos (AFIP).",
          "Si la tienda a la que estás afiliada cambia de rubro, el detalle de comisiones de ese ciclo deja de verse en tu panel (tu saldo pendiente se liquida antes del cambio — la plataforma no permite el cambio de rubro con comisiones sin pagar). El detalle queda archivado en un respaldo interno: podés pedir una copia por email durante los 3 años de retención.",
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
        body: "Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
      },
    ],
  },
  buyer: {
    label: "Cliente",
    sections: [
      {
        title: "1. Información que recopilamos",
        body: "Al registrarte como Cliente recopilamos:",
        list: [
          "Datos de cuenta: nombre, email y contraseña (almacenada con hash bcrypt).",
          "Datos de pedidos: dirección de envío, productos comprados e historial de compras.",
          "Datos de pago: procesados directamente por cada tienda. TiendaApps no almacena datos de tarjetas.",
          "Datos de uso: tiendas visitadas, productos vistos y productos guardados como favoritos.",
          "Compras que no llegaste a terminar: si cargás tus datos en el checkout de una tienda y no completás el pedido, guardamos tu email, nombre, teléfono y los productos que habías elegido, y la tienda los ve en su panel. Sirve para que puedan recordarte el carrito. Ver la sección 2 bis.",
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
        title: "2 bis. Carritos que no terminaste de comprar",
        body: "Si empezás un pedido y cargás tus datos de contacto pero no lo completás, la tienda guarda ese carrito para poder recuperarlo:",
        list: [
          "Qué se guarda: tu email, tu nombre y tu teléfono si los cargaste, más los productos que habías elegido y el total.",
          "Para qué: la tienda puede enviarte un único email recordándote el carrito, y contactarte por WhatsApp si dejaste tu teléfono. Puede ofrecerte un cupón de descuento para que termines la compra.",
          "Base legal: interés legítimo en recuperar una operación que vos iniciaste (art. 5 inc. f, Ley 25.326). No es publicidad: no se usa para enviarte novedades ni ofertas de otros productos.",
          "Cuánto dura: si no completás la compra, el carrito se elimina automáticamente a los 45 días de tu última actividad.",
          "Cómo frenarlo: escribiendo a marketplacemitienda@gmail.com pedís que se borre el carrito y no recibís el recordatorio. También podés pedírselo directamente a la tienda.",
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
          "Cada tienda dentro de TiendaApps puede publicar su propia Política de Privacidad. TiendaApps puede proporcionar un borrador de ejemplo generado automáticamente como punto de partida, pero el contenido final es responsabilidad exclusiva del dueño de cada tienda.",
          "TiendaApps no valida ni avala el contenido definitivo de esas políticas individuales. El borrador generado es orientativo y no garantiza su adecuación a la actividad específica de cada negocio.",
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
          "Envíopack (enviopack.com): si la tienda tiene activada la cotización automática de envío, le compartimos tu código postal y provincia (no tu nombre ni dirección completa) para calcular el costo del envío.",
          "Autoridades competentes cuando sea requerido por ley.",
        ],
      },
      {
        title: "5. Retención de datos",
        body: null,
        list: [
          "Datos de cuenta (nombre, email): mientras la cuenta esté activa + 30 días para eliminación completa.",
          "Historial de pedidos: 1 año tras el cierre de cuenta para resolución de garantías y disputas.",
          "Carritos que no terminaste de comprar: 45 días desde tu última actividad, y después se eliminan solos (sección 2 bis).",
          "Si una tienda donde compraste cambia de rubro, ese pedido deja de verse en tu historial, pero TiendaApps conserva una copia interna de respaldo (incluye tus datos de contacto y envío de ese pedido) por hasta 10 años, con finalidad exclusiva de respaldo contable, garantías, disputas y contracargos. Podés pedir el comprobante de una compra archivada por los medios de la sección 8.",
          "Favoritos y preferencias: eliminados al eliminar la cuenta.",
          "Para eliminar tu cuenta antes del plazo escribí a marketplacemitienda@gmail.com con el asunto 'Eliminación de cuenta — [tu email]'.",
        ],
      },
      {
        title: "6. Cookies y tecnologías de seguimiento",
        body: "Hay que distinguir tres cosas, según dónde estés navegando:",
        list: [
          "Cookies técnicas: en toda la plataforma usamos cookies de sesión estrictamente necesarias para mantenerte autenticado (gestionadas por NextAuth.js). Sin estas el sitio no funciona.",
          "Meta Pixel propio de TiendaApps, solo en las páginas de la plataforma: TiendaApps hace publicidad en Facebook e Instagram y usa un Meta Pixel propio para medir si funciona. Se carga en las páginas de TiendaApps —inicio, registro, tu cuenta, el directorio de tiendas— y registra qué páginas visitás y si completás el registro (indicando solo el tipo de cuenta, nunca tu nombre ni tu email). Meta instala sus cookies _fbp y _fbc. Los datos que recibe se rigen por su política: facebook.com/privacy",
          "Ese pixel nuestro NO se carga dentro de las tiendas: cuando entrás a una tienda de la plataforma (las direcciones /tienda/...), cuando seguís un pedido, cuando abrís un link de afiliado compartido, ni en ninguna página de la Canasta Solidaria, nuestro pixel no se ejecuta. No medimos tu navegación ni tus compras dentro de las tiendas.",
          "Trackers propios de cada tienda: cada dueño puede configurar de forma opcional su propio Google Analytics (GA4) y/o Meta Pixel dentro de su tienda. Si una tienda los tiene activados, esos scripts sí se ejecutan cuando la visitás, bajo las políticas de Google o Meta — no de TiendaApps. El dueño de la tienda es el único responsable de informarte sobre su uso en su propia política de privacidad. Si querés saber si una tienda específica usa trackers, consultá su política o escribile directamente.",
          "Cómo evitar el rastreo publicitario: podés bloquear estas cookies desde la configuración de tu navegador, usar una extensión de bloqueo de rastreadores, o ajustar qué usa Meta para mostrarte anuncios en facebook.com/adpreferences. No afecta tu cuenta ni tus compras.",
        ],
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
        title: "6 ter. Ruleta o raspadita de premios",
        body: "Si jugás al widget de ruleta o raspadita en una tienda de la plataforma:",
        list: [
          "Si la tienda te pide un email para jugar, lo usamos solo para identificarte como ganador o no, evitar que participes más de una vez mientras tengas un premio vigente sin usar, y avisarte por email el código y la fecha límite si ganaste.",
          "No usamos ese email para publicidad ni se lo compartimos a otras tiendas — queda asociado únicamente a la tienda donde jugaste.",
          "Si la tienda no pide email, igual registramos tu dirección IP para limitar cuántas veces se puede jugar desde la misma conexión.",
          "Para pedir que se elimine tu participación, escribile directamente a la tienda o contactanos por los medios de la sección 8.",
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
          "Excepción por obligación legal (art. 16 inc. 5, Ley 25.326): los datos que integran respaldos contables — como los registros de compras archivados cuando una tienda cambia de rubro — pueden conservarse bloqueados durante el plazo legal de conservación; no se usan para ningún otro fin.",
          "Respondemos dentro de los 10 días hábiles (art. 14, Ley 25.326).",
          "Si considerás que no fue atendido correctamente podés recurrir a la Dirección Nacional de Protección de Datos Personales: argentina.gob.ar/aaip/datospersonales",
        ],
      },
      {
        title: "9. Cambios a esta política",
        body: "Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
      },
    ],
  },
  donor: {
    label: "Donante / Comunidad Solidaria",
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
        title: "4 bis. Cookies y publicidad en las páginas de la Canasta",
        body: "En las páginas de la Canasta Solidaria no se carga ningún rastreador publicitario:",
        list: [
          "TiendaApps usa un Meta Pixel propio para medir su publicidad en Facebook e Instagram, pero está deliberadamente desactivado en toda la sección Canasta. Ni cuando donás, ni cuando mirás una campaña, ni cuando pedís ayuda.",
          "El motivo: aunque ese pixel nunca recibe datos personales, dejaría marcado tu navegador como visitante de páginas de asistencia social. Nadie que pida o done ayuda tiene que quedar etiquetado en un sistema publicitario.",
          "Lo único que se usa acá son las cookies técnicas necesarias para que el sitio funcione y para mantenerte autenticado si tenés cuenta.",
          "Nunca le informamos a Meta, ni a ninguna otra plataforma de publicidad, que alguien pidió ayuda o hizo una donación.",
        ],
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
        body: "Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
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
  // Ver `rolValido`: el `?? CONTENT.buyer` de antes no tapaba las claves
  // heredadas de Object.prototype y `?role=constructor` devolvia un 500.
  const role = rolValido(roleParam, CONTENT) ?? "buyer";

  return (
    <PaginaLegalPlataforma
      titulo="Política de Privacidad"
      ruta="/privacidad"
      tituloResponsable="Responsable del tratamiento de datos"
      roles={CONTENT}
      rolActivo={role}
    />
  );
}
