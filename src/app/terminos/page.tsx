import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { TERMS_LAST_UPDATED } from "@/lib/legal";

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
          "Los pagos son por período: no hay débito automático ni renovación automática. Al vencer tu plan te avisamos por email y tenés que renovarlo vos desde 'Mi Plan'. Nunca te vamos a cobrar sin que lo confirmes.",
          "Ante el vencimiento, hay un período de gracia de 4 días para renovar antes de que se limite el acceso al panel. Si no renovás, tu tienda se cierra en los plazos de la sección 7 — sin perder nada y con posibilidad de reactivarla.",
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
          "Sos responsable de cumplir con las obligaciones impositivas de tu actividad comercial. Sos el vendedor real frente a tus clientes y el emisor de los comprobantes de venta: la facturación y la conservación de la documentación comercial y fiscal de tus operaciones (conforme al art. 328 del Código Civil y Comercial y la normativa fiscal vigente) están a tu cargo. TiendaApps es un intermediario tecnológico y no emite comprobantes por tus ventas.",
        ],
      },
      {
        title: "5 bis. Términos y política de privacidad de tu tienda",
        body: null,
        list: [
          "La plataforma te permite crear y publicar tus propios Términos y Condiciones y Política de Privacidad dentro de tu tienda, visibles para tus clientes. Para ayudarte, TiendaApps incluye un asistente que genera un borrador de ejemplo en base a preguntas sobre tu negocio.",
          "El texto generado es un punto de partida. Podés editarlo, ampliarlo o reemplazarlo con el contenido que consideres adecuado. TiendaApps no garantiza que el borrador sea suficiente para tu actividad específica ni que cumpla con todos los requisitos legales aplicables a tu caso.",
          "Sos el único responsable del contenido final que publiques. TiendaApps no valida ni avala el contenido definitivo de los términos o políticas de cada tienda.",
          "Debés asegurarte de que lo que publiques sea legal, veraz y no contradiga la legislación vigente (Ley 24.240 de Defensa del Consumidor, Ley 25.326 de Protección de Datos Personales y normativas aplicables).",
          "No podés incluir cláusulas que restrinjan derechos irrenunciables del consumidor ni que contradigan la legislación argentina.",
          "TiendaApps no es parte en la relación contractual entre vos y tus clientes. Los acuerdos establecidos en los términos de tu tienda son exclusivamente entre vos y el comprador.",
          "En caso de que tus términos o políticas sean utilizados para perjudicar a compradores o infringir la ley, TiendaApps puede suspender tu tienda sin previo aviso.",
          "Tracking y analítica: si configurás Google Analytics (GA4) o Meta Pixel en tu tienda, sos el único responsable de informarlo a tus compradores en tu política de privacidad y de obtener el consentimiento que corresponda según la legislación aplicable.",
        ],
      },
      {
        title: "6. Gestión de afiliados y comisiones",
        body: "Podés aceptar o rechazar solicitudes de afiliados para tu tienda. El funcionamiento del programa varía según el tipo de negocio: (a) Tiendas con venta online: para activar el programa necesitás tener conectada tu cuenta de MercadoPago. Cuando se confirma un pago, la plataforma retiene automáticamente la comisión y la acredita en el panel de comisiones del afiliado. El afiliado puede solicitar el retiro a su cuenta bancaria desde su panel. En ningún caso tenés que realizar transferencias ni intervenir en el pago de comisiones. TiendaApps es el responsable directo del pago de comisiones a los afiliados. (b) Tiendas de consultas (autos, motos y rubros similares): no se requiere MercadoPago. Cuando un potencial cliente consulta a través del link de un afiliado, la plataforma registra esa consulta en tu panel. Si confirmás la consulta como venta, la comisión se acredita automáticamente en el panel de comisiones del afiliado. Si la rechazás, no se genera comisión. En ambos casos, el titular de la tienda no tiene intervención ni responsabilidad sobre el pago de fondos a los afiliados. Los datos del consultante (nombre, teléfono, mensaje) quedan registrados y son de tu responsabilidad conforme a la Ley 25.326.",
      },
      {
        title: "6 bis. Programa de Verificación de identidad",
        body: "TiendaApps ofrece un programa voluntario de verificación de identidad. Al participar aceptás las siguientes condiciones:",
        list: [
          "Es voluntario: la verificación no es un requisito para operar tu tienda. Podés usar todas las funciones de la plataforma sin verificarte.",
          "Qué implica: debés enviar una fotografía del frente y dorso de tu DNI y una selfie sosteniéndolo. Esos documentos son revisados exclusivamente por el equipo de administración de TiendaApps.",
          "Número de CUIT/CUIL (opcional): como dato adicional al proceso, podés informar tu número de CUIT o CUIL. TiendaApps puede cotejar ese número en el registro público de AFIP (afip.gob.ar) para verificar actividad comercial registrada. El número de CUIT/CUIL es un dato de carácter público. TiendaApps no solicita ni almacena documentos fiscales adicionales, solo el número.",
          "Aprobación a criterio de TiendaApps: la aprobación o el rechazo queda a criterio exclusivo de TiendaApps. No garantizamos la aprobación de todas las solicitudes.",
          "El badge azul es revocable: si detectamos que la documentación enviada fue alterada, no pertenece al titular de la cuenta, o existe uso fraudulento del badge, podemos removerlo y suspender la cuenta sin previo aviso.",
          "Documentación falsa o ajena: el envío de documentos que no sean propios o que hayan sido alterados constituye una violación grave de estos términos y puede derivar en la inhabilitación permanente para enviar nuevas solicitudes de verificación, la suspensión de la cuenta, la cancelación de suscripciones activas sin reembolso y la denuncia ante las autoridades competentes.",
          "Inhabilitación para verificación: si el equipo de TiendaApps detecta fraude, documentación falsa o ajena, o cualquier irregularidad grave, puede revocar el badge aprobado e inhabilitar la cuenta para enviar futuras solicitudes de verificación. Esta medida es permanente salvo revisión expresa del equipo. Se notificará al titular por email y notificación en el panel.",
          "Retiro voluntario: podés solicitar la eliminación de tus documentos y el retiro del badge en cualquier momento escribiendo a marketplacemitienda@gmail.com con el asunto 'Eliminar documentos de verificación — [tu email]'. Tu tienda seguirá funcionando con normalidad.",
          "Privacidad: el tratamiento de los documentos de identidad se rige por la sección 3 bis de la Política de Privacidad y el art. 7 de la Ley 25.326.",
        ],
      },
      {
        title: "6 ter. Notificaciones push a visitantes (Plan Premium)",
        body: null,
        list: [
          "Los dueños de tiendas con Plan Tienda Premium pueden enviar notificaciones push a visitantes que hayan activado voluntariamente esta función en la tienda.",
          "Límite: máximo 3 campañas de notificaciones por semana por tienda. El límite se renueva cada 7 días.",
          "Contenido permitido: novedades de productos, ofertas, actualizaciones relevantes a tu tienda.",
          "Contenido prohibido: publicidad engañosa o falsa, spam, lenguaje ofensivo, inapropiado o discriminatorio, promoción de productos o servicios externos no relacionados con tu tienda.",
          "Cada suscriptor puede cancelar la suscripción en cualquier momento desde el banner en la tienda. Debés respetar esa decisión y no intentar re-suscribirlos sin su consentimiento.",
          "TiendaApps puede suspender o limitar permanentemente el acceso a esta función ante uso abusivo, spam o incumplimiento de estas reglas, sin derecho a reembolso.",
          "No podés usar notificaciones para redirigir a sitios externos, terceros o realizar actividades de phishing.",
        ],
      },
      {
        title: "6 quater. Aplicaciones e integraciones con servicios de terceros",
        body: "La sección Aplicaciones del panel te permite conectar tu tienda con servicios de terceros de forma opcional (por ejemplo: Catálogo de Meta para Facebook e Instagram, Google Analytics, Meta Pixel). Al usarlas aceptás lo siguiente:",
        list: [
          "Cada integración se rige también por los términos del tercero correspondiente. En particular, al conectar el Catálogo de Meta aceptás los Términos Comerciales de Meta y sus Políticas de Comercio, y sos responsable de cumplirlos (productos permitidos, información veraz, etc.).",
          "Sos responsable de la veracidad y legalidad de los datos de tu catálogo que se sincronizan con terceros (nombres, precios, imágenes, disponibilidad). La sincronización refleja lo que cargaste en tu tienda.",
          "La disponibilidad, aprobación y continuidad de las funciones de terceros dependen exclusivamente de cada proveedor. Por ejemplo, la activación de la pestaña Tienda en Facebook o el etiquetado en Instagram está sujeta a revisiones y requisitos propios de Meta que TiendaApps no controla ni garantiza.",
          "TiendaApps no es responsable por suspensiones, rechazos, cambios de políticas o interrupciones de los servicios de Meta, Google u otros terceros integrados.",
          "Podés desconectar cualquier integración en cualquier momento desde el panel. El tratamiento de datos de estas integraciones se detalla en la Política de Privacidad (secciones 2 quinquies y 2 sexies).",
          "TiendaApps puede agregar, modificar o discontinuar aplicaciones de la sección Aplicaciones, avisando con razonable anticipación cuando el cambio afecte una integración que tengas activa.",
        ],
      },
      {
        title: "7. Cerrar tu tienda, reactivarla y cierre por falta de pago",
        body: "Podés dejar de usar TiendaApps cuando quieras. Cerrar tu tienda y eliminar tu cuenta son dos cosas distintas:",
        list: [
          "Cerrar tu tienda (reversible): desde Configuración → Zona de peligro. Sale de línea en el momento, dejamos de cobrarte la suscripción y los links de tus afiliadas quedan pausados. No se borra nada: tu diseño, tus productos, tus imágenes y tu historial de pedidos quedan tal como los dejaste. Podés reactivarla desde tu panel cuando quieras, y las afiliadas que el cierre pausó recuperan su acceso automáticamente — no tienen que postularse de nuevo.",
          "El cierre es inmediato: si te quedaban días del período que ya abonaste, no se devuelven ni se acreditan para después. Te lo avisamos antes de confirmar.",
          "Bloqueos de protección: no vas a poder cerrar tu tienda mientras tengas pedidos sin entregar o cancelar, ni comisiones de afiliadas sin liquidar. Cerrar no extingue ninguna de esas obligaciones.",
          "Cierre automático por falta de pago: si tu suscripción vence y no la renovás, tu tienda sigue online un tiempo y después se cierra sola, con el mismo efecto que el cierre voluntario — no se borra nada y podés reactivarla. El plazo se cuenta desde el vencimiento: 10 días corridos si nunca completaste un período pago (por ejemplo, si venías del período de prueba), y 20 días corridos si ya tenías un plan pago.",
          "Antes de cerrarte la tienda por falta de pago te avisamos por email dos veces: el día que vence tu plan y otra vez unos días antes del cierre.",
          "Acceso al panel tras el vencimiento: durante los primeros 4 días corridos desde que vence seguís entrando normalmente a tu panel, con un aviso. Pasado ese plazo el panel queda bloqueado hasta que renueves, aunque tu tienda siga online hasta la fecha de cierre.",
          "Mientras tu tienda esté cerrada no acepta pedidos nuevos, y quien entre a su dirección web va a ver un aviso de que no está disponible.",
          "Eliminar tu cuenta es otra cosa y no tiene vuelta: ver la sección 8. Si lo que querés es dejar de pagar sin perder tu trabajo, lo que corresponde es cerrar la tienda.",
          "Las comisiones ya acreditadas en el panel de comisiones de tus afiliadas no se extinguen por cerrar tu tienda, ni por el cierre automático, ni por eliminar tu cuenta.",
        ],
      },
      {
        title: "7 bis. Fallecimiento o incapacidad del titular",
        body: null,
        list: [
          "Si el/la Dueño/a de una tienda fallece o queda incapacitado/a de forma permanente, la tienda puede seguir procesando ventas y los/las Afiliados/as siguen generando comisiones mientras la cuenta permanezca activa.",
          "Para que el/la representante legal, heredero/a o albacea asuma el control de la cuenta, deberá contactarse con TiendaApps en marketplacemitienda@gmail.com con el asunto 'Sucesión de cuenta — [nombre de la tienda]', adjuntando: (a) acta de defunción o resolución judicial de incapacidad; (b) documentación que acredite la representación legal (declaratoria de herederos, escritura de mandato o equivalente); (c) DNI del/la representante.",
          "Mientras se tramita la transferencia de control, TiendaApps suspenderá el acceso a la cuenta para evitar usos no autorizados. Las comisiones ya acreditadas en paneles de afiliados activos siguen siendo exigibles durante este período.",
          "Una vez verificada la representación legal, TiendaApps transferirá el control de la cuenta al representante acreditado. Si no se inicia el trámite dentro de los 90 días corridos desde el fallecimiento o incapacidad declarada, TiendaApps puede cancelar la tienda tras notificar a los afiliados activos con 30 días de anticipación.",
          "Las comisiones acreditadas en los paneles de afiliados activos no se extinguen por el fallecimiento del/la Titular ni por la cancelación de la cuenta.",
        ],
      },
      {
        title: "7 ter. Cambio de rubro de la tienda",
        body: "El panel te permite cambiar el tipo (rubro) de tu tienda. Es una acción con consecuencias importantes que aceptás al confirmarla:",
        list: [
          "El cambio de rubro reinicia tu tienda: se eliminan de tu panel los productos, pedidos, pagos, cupones, reseñas, consultas, carritos abandonados y el historial de ventas de tus afiliadas del ciclo anterior. La acción es irreversible desde el panel.",
          "Bloqueos de protección: el cambio no se permite mientras tengas pedidos sin entregar o cancelar, premios de ruleta ganados por clientes y todavía vigentes sin usar, o comisiones de afiliadas sin liquidar (saldo acreditado o retiros pendientes). Las comisiones ya acreditadas no se extinguen por el cambio de rubro: el sistema exige liquidarlas antes.",
          "Antes de confirmar, la plataforma te ofrece descargar una copia de tus productos, pedidos (con pagos y comisiones) y cupones. Como emisor de los comprobantes y responsable fiscal de tus ventas (sección 5), la conservación de esos registros es tu responsabilidad — te recomendamos descargarlos y guardarlos.",
          "TiendaApps conserva además una copia interna de respaldo de los registros del ciclo anterior por hasta 10 años, con finalidad exclusiva contable y de defensa ante disputas, garantías o contracargos. Podés descargarla en cualquier momento desde Configuración → Respaldos.",
          "Cupones vigentes: el cambio elimina todos los cupones de descuento. Si comunicaste cupones a tus clientes (por email, redes u otro medio) y siguen vigentes, sos responsable de avisarles de la baja por los mismos medios por los que los difundiste (art. 7, Ley 24.240 — la oferta obliga a quien la emite) o de esperar a que venzan antes de cambiar de rubro.",
          "Tu tienda pública queda despublicada (offline) desde el cambio hasta que configures y publiques el catálogo del nuevo rubro. La ruleta de premios, si la usabas, queda desactivada hasta que la configures con premios nuevos.",
        ],
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
          "Indemnidad: si un tercero reclama a TiendaApps por contenido que vos subiste (por ejemplo, imágenes o videos de otro sitio o de otra marca), te comprometés a notificar a TiendaApps de inmediato y a colaborar activamente en la defensa. La responsabilidad económica final será proporcional a la efectiva participación de cada parte en los hechos que originaron el reclamo, conforme la legislación argentina vigente. Esta cláusula no implica renuncia a ningún derecho reconocido por la Ley 24.240.",
          "Denuncia de contenido robado: cualquier persona o empresa que considere que una imagen, video o texto de una tienda infringe sus derechos puede denunciarlo a marketplacemitienda@gmail.com con el asunto 'Denuncia de contenido — [nombre de la tienda]', adjuntando prueba de la titularidad.",
          "Ante una denuncia con prueba suficiente, TiendaApps puede dar de baja el contenido denunciado de forma preventiva mientras se resuelve el reclamo, sin necesidad de orden judicial previa.",
          "La reiteración de denuncias confirmadas contra una misma tienda puede derivar en la suspensión de la cuenta sin derecho a reembolso.",
          "TiendaApps actúa únicamente como intermediario tecnológico que aloja el contenido cargado por cada dueño de tienda y no revisa ni avala el contenido subido antes de su publicación.",
        ],
      },
      {
        title: "9. Disponibilidad del servicio",
        body: "TiendaApps realiza esfuerzos razonables para mantener la plataforma disponible. No se garantiza disponibilidad ininterrumpida. Las tareas de mantenimiento programado serán comunicadas con al menos 24 horas de anticipación. TiendaApps no asume responsabilidad por pérdida de ventas derivada de interrupciones del servicio no imputables a dolo o negligencia grave de su parte.",
      },
      {
        title: "9 bis. Fuerza mayor e interrupciones de Mercado Pago",
        body: null,
        list: [
          "TiendaApps no será responsable por interrupciones causadas por eventos fuera de su control razonable, incluyendo sin limitación: fallas de infraestructura de terceros (Mercado Pago, Supabase, Vercel, proveedores de red), desastres naturales, actos de autoridad gubernamental o cortes de internet.",
          "Suspensión de cuenta Mercado Pago: si la cuenta de MercadoPago de TiendaApps fuera suspendida o limitada por decisión de MercadoPago (por revisión de compliance, chargebacks, error administrativo u otro motivo), ningún nuevo pago podrá procesarse mientras dure la suspensión. TiendaApps notificará a todas las tiendas y afiliados activos dentro de las 24 horas de conocida la situación.",
          "Durante una suspensión de MP: las comisiones ya acreditadas en paneles de afiliados siguen siendo válidas y exigibles. TiendaApps trabajará para restablecer el servicio o habilitar un método de pago alternativo en el menor tiempo posible.",
          "TiendaApps no asume responsabilidad por pérdida de ventas durante el período de interrupción, pero en ningún caso la suspensión extingue las obligaciones de pago de comisiones ya devengadas.",
        ],
      },
      {
        title: "10. Modificaciones",
        body: "Podemos actualizar estos términos. Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
      },
      {
        title: "11. Contacto",
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
          "Dado que el rol de Afiliado implica percibir ingresos económicos y manejar un panel de comisiones, la mayoría de edad es un requisito irrenunciable.",
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
          "Las comisiones se acreditan automáticamente en tu panel de comisiones dentro de TiendaApps cuando se confirma un pago. Desde ahí podés solicitar un retiro a tu cuenta bancaria (CBU/alias) cuando quieras, sin vencimiento de saldo. Para tiendas por consulta (AUTOS), la comisión se acredita cuando el dueño de la tienda confirma la venta.",
          "Podés afiliarte a múltiples tiendas simultáneamente según las disponibilidades de cada una.",
          "Podés prestar servicios similares a otras plataformas o marcas al mismo tiempo. TiendaApps no impone exclusividad.",
        ],
      },
      {
        title: "4. Responsabilidades del afiliado",
        body: null,
        list: [
          "No podés hacer publicidad engañosa ni prometer beneficios que la tienda no ofrece.",
          "No podés usar spam, técnicas de phishing ni prácticas desleales para generar ventas.",
          "Identificar claramente tu condición de afiliado/a al realizar publicaciones promocionales en redes sociales u otros medios (por ejemplo, con etiquetas como #publicidad, #afiliado o equivalentes), en cumplimiento de las normas de publicidad transparente vigentes.",
          "Sos responsable de declarar tus ingresos por comisiones ante la AFIP según corresponda.",
          "No podés compartir tu link de afiliado en nombre de terceros sin autorización.",
          "Debés respetar las condiciones de cada tienda a la que estés afiliado.",
        ],
      },
      {
        title: "5. Comisiones",
        body: "Las comisiones son definidas por cada dueño de tienda y pueden variar. TiendaApps no garantiza un monto mínimo de comisión ni un volumen de ventas. Las comisiones se calculan sobre el subtotal del pedido menos descuentos, sin incluir el costo de envío. Se acreditan en tu panel de comisiones cuando se confirma el pago. Pedidos en estado Pendiente no generan comisión. El dueño de la tienda está obligado a notificar a sus afiliados con al menos 5 días corridos de anticipación antes de modificar el porcentaje de comisión. TiendaApps enviará la notificación por email y en el panel en el momento en que el titular aplique el cambio — el nuevo porcentaje nunca aplica de forma retroactiva sobre comisiones ya generadas. En caso de devolución de cargo (chargeback) aprobada por MercadoPago, TiendaApps se reserva el derecho de descontar la comisión correspondiente de futuros acreditamientos.",
      },
      {
        title: "6. Premios y beneficios",
        body: "TiendaApps puede ofrecer premios o cupones adicionales por volumen de ventas a afiliados destacados. Estos beneficios son opcionales y pueden modificarse sin previo aviso.",
      },
      {
        title: "7. Baja de la cuenta y cierre de una tienda donde vendés",
        body: null,
        list: [
          "Podés dejar de usar la plataforma como afiliado/a en cualquier momento, sin necesidad de cancelar ninguna suscripción. Tus comisiones ya acreditadas en tu panel de comisiones siguen disponibles para retirar.",
          "Si una tienda te da de baja como afiliado/a, perdés acceso a tu link para esa tienda, pero tu cuenta sigue activa para postularte a otras.",
          "Si una tienda donde vendés cierra —porque su dueño/a lo decidió o porque su plan venció— tu link para esa tienda queda pausado y deja de generar ventas nuevas. Te avisamos por email y por notificación en tu panel.",
          "El cierre de una tienda no afecta tu saldo: las comisiones ya acreditadas siguen siendo tuyas y disponibles para retirar. Ninguna tienda puede cerrar ni eliminar su cuenta mientras te deba comisiones sin liquidar — el sistema se lo impide.",
          "Si esa tienda vuelve a abrir, recuperás tu lugar y tu link se reactiva automáticamente: no tenés que postularte de nuevo ni volver a aceptar estos términos.",
          "Tu cuenta y tus comisiones en otras tiendas no se ven afectadas por el cierre de una.",
        ],
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
          "TiendaApps puede mediar en casos de conflicto pero no garantiza resultados. Ante incumplimientos graves y comprobados (no entrega del producto, fraude, abandono del comprador), TiendaApps puede suspender o cancelar la cuenta de la tienda infractora, sin perjuicio de las acciones legales que correspondan.",
          "Para contactar al equipo de TiendaApps podés usar el chat de soporte disponible en tiendaapps.com (ícono en la esquina inferior derecha) o escribir a marketplacemitienda@gmail.com. Todas las consultas quedan registradas con historial.",
        ],
      },
      {
        title: "4 bis. Términos y políticas de cada tienda",
        body: null,
        list: [
          "Cada tienda dentro de TiendaApps puede tener sus propios Términos y Condiciones y Política de Privacidad. TiendaApps puede proporcionar un borrador generado automáticamente como punto de partida, pero el contenido final es responsabilidad exclusiva del dueño de cada tienda.",
          "TiendaApps no valida ni avala el contenido definitivo de los términos o políticas de cada tienda individual. El borrador generado es orientativo y no garantiza su adecuación a la actividad específica de cada negocio.",
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
        body: "Podés eliminar tu cuenta en cualquier momento desde la configuración. Tus pedidos anteriores quedan registrados a efectos de garantías o reclamos. Excepción: si una tienda donde compraste cambia de rubro, tus pedidos en esa tienda dejan de verse en tu historial; TiendaApps conserva una copia interna de respaldo y podés pedir el comprobante de esa compra escribiendo a marketplacemitienda@gmail.com con el asunto 'Comprobante de compra archivada'.",
      },
      {
        title: "9. Modificaciones",
        body: "Podemos actualizar estos términos. Ante cambios significativos te avisaremos por el canal que consideremos más adecuado (email, aviso en tu panel u otro medio de contacto que nos hayas dejado), con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
      },
      {
        title: "10. Contacto y reclamos",
        body: "Para consultas o reclamos escribinos a marketplacemitienda@gmail.com. También podés contactar a Defensa del Consumidor de tu provincia si considerás que tus derechos fueron vulnerados. Como alternativa a la justicia ordinaria, podés recurrir al Sistema Nacional de Arbitraje de Consumo (SNAC), un servicio gratuito y voluntario de mediación entre consumidores y empresas — más info en argentina.gob.ar/produccion/defensadelconsumidor/snac",
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
          <p className="text-gray-500 text-sm mb-6">Última actualización: {TERMS_LAST_UPDATED}</p>

          {/* Responsable */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-8 text-sm text-gray-300 space-y-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Datos del prestador del servicio</p>
            <p><span className="text-gray-500">Nombre:</span> Flavio Cesar Soltero Legoas</p>
            <p><span className="text-gray-500">CUIL:</span> 20-94992405-0</p>
            <p><span className="text-gray-500">Domicilio:</span> Bacota 1833 (entre Apolo y Juno), Pinamar, Buenos Aires, CP 7167</p>
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
