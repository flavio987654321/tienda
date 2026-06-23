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
        title: "1 bis. Edad mínima requerida",
        body: null,
        list: [
          "Para usar TiendaApps como Dueño de tienda debés tener al menos 18 años de edad.",
          "Al registrarte, declarás bajo responsabilidad propia que cumplís con este requisito. TiendaApps no es responsable por declaraciones falsas.",
          "Si tomamos conocimiento de que una cuenta pertenece a una persona menor de 18 años, procederemos a suspenderla y eliminar los datos asociados, sin derecho a reembolso de períodos abonados.",
          "Para reportar una cuenta de menor de edad escribinos a marketplacemitienda@gmail.com con el asunto 'Cuenta de menor de edad'.",
        ],
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
        title: "5 bis. Términos y política de privacidad de tu tienda",
        body: null,
        list: [
          "La plataforma te permite redactar y publicar tus propios Términos y Condiciones y Política de Privacidad dentro de tu tienda, visibles para tus clientes.",
          "Sos el único responsable del contenido que escribas en esos documentos. TiendaApps no redacta, revisa, valida ni avala el contenido de los términos o políticas de cada tienda.",
          "Debés asegurarte de que lo que escribas sea legal, veraz y no contradiga la legislación vigente (Ley 24.240 de Defensa del Consumidor, Ley 25.326 de Protección de Datos Personales y normativas aplicables).",
          "No podés incluir cláusulas que restrinjan derechos irrenunciables del consumidor ni que contradigan la legislación argentina.",
          "TiendaApps no es parte en la relación contractual entre vos y tus clientes. Los acuerdos establecidos en los términos de tu tienda son exclusivamente entre vos y el comprador.",
          "En caso de que tus términos o políticas sean utilizados para perjudicar a compradores o infringir la ley, TiendaApps puede suspender tu tienda sin previo aviso.",
        ],
      },
      {
        title: "6. Gestión de afiliados y consultas",
        body: "Podés aceptar o rechazar solicitudes de afiliados para tu tienda. Al aceptar un afiliado y activar el programa, aceptás los Términos del Programa de Afiliados y te comprometés a pagarle la comisión configurada por cada venta válida generada a través de su link. Las comisiones se acreditan al confirmar el pago del pedido. Adicionalmente, cuando un potencial cliente consulta por WhatsApp a través del link de un afiliado, la Plataforma registra esa consulta en tu panel. Si confirmás la consulta como venta, la comisión se acredita automáticamente en la billetera del afiliado. Si la rechazás, no se genera comisión. Los datos del consultante (nombre, teléfono, mensaje) quedan registrados y son de tu responsabilidad conforme a la Ley 25.326. TiendaApps actúa como intermediaria tecnológica en la gestión de comisiones.",
      },
      {
        title: "6 bis. Programa de Verificación de identidad",
        body: "TiendaApps ofrece un programa voluntario de verificación de identidad. Al participar aceptás las siguientes condiciones:",
        list: [
          "Es voluntario: la verificación no es un requisito para operar tu tienda. Podés usar todas las funciones de la plataforma sin verificarte.",
          "Qué implica: debés enviar una fotografía del frente y dorso de tu DNI y una selfie sosteniéndolo. Esos documentos son revisados exclusivamente por el equipo de administración de TiendaApps.",
          "Aprobación a criterio de TiendaApps: la aprobación o el rechazo queda a criterio exclusivo de TiendaApps. No garantizamos la aprobación de todas las solicitudes.",
          "El badge azul es revocable: si detectamos que la documentación enviada fue alterada, no pertenece al titular de la cuenta, o existe uso fraudulento del badge, podemos removerlo y suspender la cuenta sin previo aviso.",
          "Documentación falsa o ajena: el envío de documentos que no sean propios o que hayan sido alterados constituye una violación grave de estos términos y puede derivar en la suspensión permanente de la cuenta, la cancelación de suscripciones activas sin reembolso y la denuncia ante las autoridades competentes.",
          "Retiro voluntario: podés solicitar la eliminación de tus documentos y el retiro del badge en cualquier momento escribiendo a marketplacemitienda@gmail.com con el asunto 'Eliminar documentos de verificación — [tu email]'. Tu tienda seguirá funcionando con normalidad.",
          "Privacidad: el tratamiento de los documentos de identidad se rige por la sección 3 bis de la Política de Privacidad y el art. 7 de la Ley 25.326.",
        ],
      },
      {
        title: "6 ter. Notificaciones push a visitantes (Plan Premium)",
        body: null,
        list: [
          "Los dueños de tiendas con Plan Tienda Premium pueden enviar notificaciones push a visitantes que hayan activado voluntariamente esta función en la tienda.",
          "Límite: máximo 2 campañas de notificaciones por semana por tienda. El límite se renueva cada 7 días.",
          "Contenido permitido: novedades de productos, ofertas, actualizaciones relevantes a tu tienda.",
          "Contenido prohibido: publicidad engañosa o falsa, spam, lenguaje ofensivo, inapropiado o discriminatorio, promoción de productos o servicios externos no relacionados con tu tienda.",
          "Cada suscriptor puede cancelar la suscripción en cualquier momento desde el banner en la tienda. Debés respetar esa decisión y no intentar re-suscribirlos sin su consentimiento.",
          "TiendaApps puede suspender o limitar permanentemente el acceso a esta función ante uso abusivo, spam o incumplimiento de estas reglas, sin derecho a reembolso.",
          "No podés usar notificaciones para redirigir a sitios externos, terceros o realizar actividades de phishing.",
        ],
      },
      {
        title: "7. Cancelación y acceso",
        body: "Podés cancelar tu suscripción en cualquier momento desde 'Mi Plan'. Tu tienda permanecerá visible hasta el fin del período abonado. Tras el vencimiento y período de gracia, la tienda se ocultará pero tus datos no se borran — podés reactivarla en cualquier momento. La cancelación no extingue las obligaciones de pago de comisiones ya acreditadas en billeteras de afiliados activos.",
      },
      {
        title: "8. Propiedad intelectual",
        body: "Las imágenes, descripciones y contenidos que cargás en tu tienda deben ser de tu propiedad o estar autorizados expresamente por su titular para que los uses. Al subirlos, otorgás a TiendaApps una licencia no exclusiva para mostrarlos a compradores dentro de la plataforma. Ver sección 8 ter para las consecuencias de subir contenido que no te pertenece.",
      },
      {
        title: "8 bis. Donaciones a la Canasta Solidaria o a una Causa Libre",
        body: "Como cualquier usuario de TiendaApps, podés donar de forma opcional a la iniciativa \"Canasta Solidaria\" o a una \"Causa Libre\" — al hacerlo, sea desde la página de la campaña o desde el carrito de una compra, se aplican términos específicos detallados en tiendaapps.com/canasta/terminos.",
      },
      {
        title: "8 ter. Contenido robado o que infringe derechos de terceros",
        body: "Sos el único responsable de las imágenes, videos, descripciones y demás contenido que cargues en tu tienda. No podés usar fotos, videos o textos tomados de otros sitios, marcas o personas sin su autorización.",
        list: [
          "Indemnidad: si un tercero reclama o demanda a TiendaApps por contenido que vos subiste (por ejemplo, imágenes o videos de otro sitio o de otra marca), te comprometés a cubrir los gastos, honorarios y daños que esto le genere a TiendaApps, en la medida que el reclamo se origine en contenido cargado por vos.",
          "Denuncia de contenido robado: cualquier persona o empresa que considere que una imagen, video o texto de una tienda infringe sus derechos puede denunciarlo a marketplacemitienda@gmail.com con el asunto 'Denuncia de contenido — [nombre de la tienda]', adjuntando prueba de la titularidad.",
          "Ante una denuncia con prueba suficiente, TiendaApps puede dar de baja el contenido denunciado de forma preventiva mientras se resuelve el reclamo, sin necesidad de orden judicial previa.",
          "La reiteración de denuncias confirmadas contra una misma tienda puede derivar en la suspensión de la cuenta sin derecho a reembolso.",
          "TiendaApps actúa únicamente como intermediario tecnológico que aloja el contenido cargado por cada dueño de tienda y no revisa ni avala el contenido subido antes de su publicación.",
        ],
      },
      {
        title: "9. Modificaciones",
        body: "Podemos actualizar estos términos. Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
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
        title: "1 bis. Edad mínima requerida",
        body: null,
        list: [
          "Para usar TiendaApps como Vendedor/Afiliado debés tener al menos 18 años de edad.",
          "Al registrarte, declarás bajo responsabilidad propia que cumplís con este requisito. TiendaApps no es responsable por declaraciones falsas.",
          "Dado que el rol de Afiliado implica percibir ingresos económicos y manejar una billetera digital, la mayoría de edad es un requisito irrenunciable.",
          "Si tomamos conocimiento de que una cuenta pertenece a una persona menor de 18 años, procederemos a suspenderla y retener los fondos disponibles hasta verificar la situación ante las autoridades competentes.",
          "Para reportar una cuenta de menor de edad escribinos a marketplacemitienda@gmail.com con el asunto 'Cuenta de menor de edad'.",
        ],
      },
      {
        title: "2. Descripción del servicio para afiliados",
        body: "Como Afiliado, podés postularte a tiendas activas dentro de TiendaApps y, una vez aceptado, compartir tu link personal de afiliado para generar ventas. Por cada venta concretada a través de tu link, recibís una comisión definida por el dueño de la tienda.",
      },
      {
        title: "3. Acceso a la plataforma",
        body: null,
        list: [
          "El plan de Afiliado/a es gratuito, sin costo de suscripción y sin límite de tiempo.",
          "No se requiere tarjeta de crédito para usar la plataforma como afiliado/a.",
          "Una vez aprobado/a por una tienda, podés generar y usar tu link de afiliado de inmediato, sin necesidad de pagar ni de período de prueba.",
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
        title: "7. Baja de la cuenta",
        body: "Podés dejar de usar la plataforma como afiliado/a en cualquier momento, sin necesidad de cancelar ninguna suscripción. Tus comisiones ya acreditadas en billetera siguen disponibles para retirar. Si una tienda te da de baja como afiliado/a, perdés acceso a tu link para esa tienda, pero tu cuenta sigue activa para postularte a otras.",
      },
      {
        title: "7 bis. Donaciones a la Canasta Solidaria o a una Causa Libre",
        body: "Como cualquier usuario de TiendaApps, podés donar de forma opcional a la iniciativa \"Canasta Solidaria\" o a una \"Causa Libre\" — al hacerlo, sea desde la página de la campaña o desde el carrito de una compra, se aplican términos específicos detallados en tiendaapps.com/canasta/terminos.",
      },
      {
        title: "8. Modificaciones",
        body: "Podemos actualizar estos términos. Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
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
        title: "1 bis. Edad mínima requerida",
        body: null,
        list: [
          "Para usar TiendaApps como Cliente debés tener al menos 18 años de edad.",
          "Al registrarte, declarás bajo responsabilidad propia que cumplís con este requisito.",
          "Si un menor de edad realiza compras usando una cuenta de adulto, la responsabilidad recae sobre el titular de la cuenta.",
          "Si tomamos conocimiento de que una cuenta pertenece a una persona menor de 18 años, procederemos a suspenderla y eliminar los datos asociados.",
          "Para reportar una cuenta de menor de edad escribinos a marketplacemitienda@gmail.com con el asunto 'Cuenta de menor de edad'.",
        ],
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
        title: "4 bis. Términos y políticas de cada tienda",
        body: null,
        list: [
          "Cada tienda dentro de TiendaApps puede tener sus propios Términos y Condiciones y Política de Privacidad, redactados por el dueño de esa tienda.",
          "TiendaApps no redacta, revisa, valida ni avala el contenido de los términos o políticas de cada tienda individual. Ese contenido es exclusiva responsabilidad del dueño de la tienda.",
          "Al comprar en una tienda, estás aceptando los términos de esa tienda en particular, que pueden ser distintos a estos Términos Generales de TiendaApps.",
          "Te recomendamos leer los términos y la política de privacidad de cada tienda antes de realizar una compra.",
          "Si los términos de una tienda te parecen abusivos o ilegales, podés reportarlo a marketplacemitienda@gmail.com y lo analizaremos.",
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
        title: "6 bis. Donaciones a la Canasta Solidaria o a una Causa Libre",
        body: "TiendaApps ofrece, de forma opcional, la posibilidad de donar a la iniciativa \"Canasta Solidaria\" (una colecta comunitaria para comprar una canasta de alimentos real a un vecino) o a una \"Causa Libre\" (una colecta para una persona o situación puntual, descripta en cada campaña) — las dos sin fines de lucro. Al donar, aceptás lo siguiente:",
        list: [
          "Es un aporte voluntario, separado de cualquier compra que hagas en una tienda. No es el pago de un producto ni de un servicio, por lo que no aplica el derecho de arrepentimiento de la Ley 24.240 ni las garantías legales de productos.",
          "Las donaciones son no reembolsables, salvo error de cobro comprobado.",
          "El dinero donado va directo a la cuenta de TiendaApps (no a la tienda donde estabas comprando), y se destina exclusivamente al objetivo de la campaña correspondiente.",
          "Donar funciona como una colecta solidaria tradicional (igual que donarle a la Cruz Roja): el equipo de TiendaApps decide quién recibe lo recaudado en cada campaña — nunca es uno de los donantes, y donar no es un sorteo ni garantiza ningún premio.",
          "El detalle completo de montos mínimos/máximos por donación y el límite de una donación por persona por campaña está en tiendaapps.com/canasta/terminos.",
          "TiendaApps puede modificar, pausar o cancelar una campaña en cualquier momento, informando a los donantes por email ante cambios relevantes.",
          "Para consultas o reclamos sobre una donación, escribinos a tiendaapps.solidaria@gmail.com",
        ],
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
        body: "Podemos actualizar estos términos. Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
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
          <p className="text-gray-500 text-sm mb-6">Última actualización: junio 2026</p>

          {/* Responsable */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-8 text-sm text-gray-300 space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Datos del prestador del servicio</p>
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
