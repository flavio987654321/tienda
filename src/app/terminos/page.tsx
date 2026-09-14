import type { Metadata } from "next";
import { PRICES, PRO_MAX_ACTIVE_COUPONS, PRO_MAX_LIVE_PROMOTIONS, PRO_MAX_AFFILIATES, PRO_MAX_PRODUCTS, MAX_PRODUCTS_POR_TIENDA, COMISION_DIGITAL } from "@/lib/planLimits";
/* Los plazos de la entrega digital salen de la MISMA constante que los aplica.
   Escritos a mano acá, el día que cambie el tope los términos prometen un número
   y el sistema entrega otro — y lo que vale para un reclamo es lo que dicen los
   términos. */
import { DIAS_DEL_PERMISO, MAX_DESCARGAS } from "@/lib/entrega-digital";
import { DIAS_DE_DOMINIO_EN_FREE, DIAS_DE_AVISO_DEL_DOMINIO } from "@/lib/configuracion-digital";
import { siteUrl } from "@/lib/site";
import PaginaLegalPlataforma, { rolValido } from "@/components/legal/PaginaLegalPlataforma";
import { volverAlPanel, panelValido, robotsDeDocumentoLegal } from "@/components/legal/desde-el-panel";

const DESCRIPTION =
  "Términos y condiciones de TiendaApps: qué incluye cada plan, cómo funcionan los cobros, las cancelaciones y el programa de afiliados.";

const META: Metadata = {
  title: "Términos y Condiciones",
  description: DESCRIPTION,
  alternates: { canonical: "/terminos" },
  openGraph: {
    title: "Términos y Condiciones | TiendaApps",
    description: DESCRIPTION,
    url: siteUrl("/terminos"),
  },
};

/* `generateMetadata` y no un `metadata` fijo por una sola cosa: la copia que se
   abre desde un panel lleva `noindex`. Es la misma página con el encabezado
   cambiado, y dos direcciones con el mismo texto compiten entre ellas. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}): Promise<Metadata> {
  const { panel } = await searchParams;
  return { ...META, robots: robotsDeDocumentoLegal(panel) };
}

// Los precios y topes de la sección 3 salen de las constantes que los aplican.
// Escritos a mano, este texto podía quedar diciendo un precio viejo — y es el
// documento que la gente acepta, así que no puede estar desactualizado.
// Si cambian, hay que subir CURRENT_TERMS_VERSION: es un cambio de contrato.
const ars = (n: number) => "$" + n.toLocaleString("es-AR");
// Los topes de productos son de cuatro cifras: sin separador de miles, "5000" se
// lee peor que "5.000" en un párrafo largo.
const miles = (n: number) => n.toLocaleString("es-AR");

const CONTENT = {
  owner: {
    label: "Dueño de tienda",
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
          `Plan Tienda Pro: ${ars(PRICES.OWNER_BASIC.MONTHLY)} ARS/mes o ${ars(PRICES.OWNER_BASIC.ANNUAL)} ARS/año. Incluye subdominio propio (tutienda.tiendaapps.com), hasta ${PRO_MAX_AFFILIATES} afiliados activos, hasta ${PRO_MAX_ACTIVE_COUPONS} cupones vigentes, hasta ${PRO_MAX_LIVE_PROMOTIONS} promociones vigentes, hasta ${miles(PRO_MAX_PRODUCTS)} productos publicados y soporte por email.`,
          `Plan Tienda Premium: ${ars(PRICES.OWNER_PREMIUM.MONTHLY)} ARS/mes o ${ars(PRICES.OWNER_PREMIUM.ANNUAL)} ARS/año. Incluye todo lo del plan Pro más la posibilidad de conectar tu propio dominio, afiliados ilimitados, y cupones y promociones sin límite, con soporte prioritario.`,
          "Los topes del plan Pro cuentan lo que está vigente en cada momento, no lo que creaste alguna vez: al desactivar, archivar o dejar vencer un cupón o una promoción, ese lugar queda libre de inmediato, y lo mismo pasa con un producto al eliminarlo. Tampoco ocupan lugar los cupones que genera la ruleta o la raspadita (ni sus premios ganados), que no tienen tope.",
          `Por razones técnicas y de seguridad, ninguna tienda puede superar los ${miles(MAX_PRODUCTS_POR_TIENDA)} productos, cualquiera sea su plan. No es un límite comercial: es un resguardo para que el uso automatizado o accidental de las herramientas de carga masiva no afecte el servicio del resto. Si tu catálogo real necesita más, escribinos y lo vemos.`,
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
          "Sos responsable de definir el porcentaje de comisión de tu programa de afiliados y de respetar el aviso previo antes de modificarlo (ver sección 6). El pago de las comisiones no está a tu cargo: lo hace TiendaApps directamente al afiliado, como se detalla en esa sección.",
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
          "Cerrar tu tienda (reversible): desde Configuración → Zona de peligro. Sale de línea en el momento, dejamos de cobrarte la suscripción y los links de tus afiliados quedan pausados. No se borra nada: tu diseño, tus productos, tus imágenes y tu historial de pedidos quedan tal como los dejaste. Podés reactivarla desde tu panel cuando quieras, y los afiliados que el cierre pausó recuperan su acceso automáticamente — no tienen que postularse de nuevo.",
          "El cierre es inmediato: si te quedaban días del período que ya abonaste, no se devuelven ni se acreditan para después. Te lo avisamos antes de confirmar.",
          "Bloqueos de protección: no vas a poder cerrar tu tienda mientras tengas pedidos sin entregar o cancelar, ni comisiones de afiliados sin liquidar. Cerrar no extingue ninguna de esas obligaciones.",
          "Cierre automático por falta de pago: si tu suscripción vence y no la renovás, tu tienda sigue online un tiempo y después se cierra sola, con el mismo efecto que el cierre voluntario — no se borra nada y podés reactivarla. El plazo se cuenta desde el vencimiento: 10 días corridos si nunca completaste un período pago (por ejemplo, si venías del período de prueba), y 20 días corridos si ya tenías un plan pago.",
          "Antes de cerrarte la tienda por falta de pago te avisamos por email dos veces: el día que vence tu plan y otra vez unos días antes del cierre.",
          "Acceso al panel tras el vencimiento: durante los primeros 4 días corridos desde que vence seguís entrando normalmente a tu panel, con un aviso. Pasado ese plazo el panel queda bloqueado hasta que renueves, aunque tu tienda siga online hasta la fecha de cierre.",
          "Mientras tu tienda esté cerrada no acepta pedidos nuevos, y quien entre a su dirección web va a ver un aviso de que no está disponible.",
          "Eliminar tu cuenta es otra cosa y no tiene vuelta: ver la sección 7 quater. Si lo que querés es dejar de pagar sin perder tu trabajo, lo que corresponde es cerrar la tienda.",
          "Las comisiones ya acreditadas en el panel de comisiones de tus afiliados no se extinguen por cerrar tu tienda, ni por el cierre automático, ni por eliminar tu cuenta.",
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
          "El cambio de rubro reinicia tu tienda: se eliminan de tu panel los productos, pedidos, pagos, cupones, promociones, reseñas, consultas, carritos abandonados y el historial de ventas de tus afiliados del ciclo anterior. La acción es irreversible desde el panel.",
          "Bloqueos de protección: el cambio no se permite mientras tengas pedidos sin entregar o cancelar, premios de ruleta ganados por clientes y todavía vigentes sin usar, comisiones de afiliados sin liquidar (saldo acreditado o retiros pendientes), cupones que tus clientes todavía puedan usar, o promociones aplicándose en tu tienda. Las comisiones ya acreditadas no se extinguen por el cambio de rubro: el sistema exige liquidarlas antes.",
          "Ofertas vigentes: el sistema no te deja cambiar de rubro con cupones o promociones que un cliente pueda usar en ese momento. Tenés que darlos de baja vos —desactivar o eliminar los cupones, archivar las promociones— para que la baja de la oferta sea una decisión tuya y no un borrado automático. Los que ya estén desactivados, vencidos, agotados o archivados no frenan el cambio, y se eliminan junto con el resto del ciclo anterior.",
          "Antes de confirmar, la plataforma te ofrece descargar una copia de tus productos, pedidos (con pagos y comisiones), cupones y promociones. Como emisor de los comprobantes y responsable fiscal de tus ventas (sección 5), la conservación de esos registros es tu responsabilidad — te recomendamos descargarlos y guardarlos.",
          "TiendaApps conserva además una copia interna de respaldo de los registros del ciclo anterior por hasta 10 años, con finalidad exclusiva contable y de defensa ante disputas, garantías o contracargos. Podés descargarla en cualquier momento desde Configuración → Respaldos.",
          "Aviso a tus clientes: si difundiste un cupón o una promoción (por email, redes u otro medio) y lo das de baja para poder cambiar de rubro, sos responsable de avisar de esa baja por los mismos medios por los que lo difundiste (art. 7, Ley 24.240 — la oferta obliga a quien la emite), o de esperar a que venza antes de cambiar. Darlo de baja en el panel lo desactiva en la plataforma, pero no cancela por sí solo el anuncio que hiciste por fuera.",
          "Los cupones de premio que TiendaApps le entrega a los afiliados (sección 6) no se ven afectados por tu cambio de rubro ni te frenan el cambio: no son cupones de tu tienda, pertenecen al afiliado y puede usarlos en cualquier otra tienda que los acepte.",
          "Tu tienda pública queda despublicada (offline) desde el cambio hasta que configures y publiques el catálogo del nuevo rubro. La ruleta de premios, si la usabas, queda desactivada hasta que la configures con premios nuevos.",
        ],
      },
      {
        title: "7 quater. Eliminar tu cuenta",
        body: "Eliminar tu cuenta es distinto de cerrar tu tienda (sección 7) y no tiene vuelta atrás. Se hace desde Configuración → Zona de peligro, escribiendo tu email para confirmar.",
        list: [
          "Antes de eliminarla, el sistema verifica lo mismo que para cerrar la tienda: no se permite mientras tengas pedidos sin entregar o cancelar, ni comisiones de afiliados sin liquidar. Eliminar la cuenta no extingue ninguna de esas obligaciones.",
          "Qué se borra: tus datos personales, los de tu tienda, tus imágenes y archivos, y tus datos bancarios cifrados (CBU/CUIL), que no se conservan. Tu email queda liberado, así que podés volver a registrarte con la misma dirección más adelante.",
          "Qué NO se borra, y por qué: los pedidos, pagos y comisiones quedan anonimizados en lugar de eliminarse. No se conservan tus datos personales en ellos, pero sí el registro de la operación, porque son documentación comercial que la ley obliga a conservar (art. 328 del Código Civil y Comercial) y porque un comprador puede tener una garantía o un reclamo en curso (Ley 24.240 art. 10 bis).",
          "También se conserva la constancia de qué versión de estos Términos aceptaste y cuándo. Es la prueba de tu propio consentimiento: sin ella no podríamos acreditar en qué condiciones operaste.",
          "Los plazos exactos de conservación de cada tipo de dato están en la sección 6 de la Política de Privacidad.",
          "Si tenés afiliados activos, se les avisa que la tienda cerró y que los saldos ya acreditados en su panel siguen disponibles para retirar. Esas comisiones no se extinguen por eliminar tu cuenta.",
          "No hay reembolso de los días que te quedaran del período abonado.",
          "Si lo que buscás es dejar de pagar sin perder tu trabajo, no elimines la cuenta: cerrá la tienda (sección 7). Es reversible y no se borra nada.",
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
        list: [
          "Los cupones de premio se canjean en las tiendas que eligieron aceptarlos. La aceptación es opcional y está desactivada por defecto: se activa desde el panel de la tienda, y el descuento lo absorbe la tienda donde se usa, no TiendaApps.",
          "El descuento de un cupón de premio tiene un tope de $100.000 ARS por pedido y no se acumula con otro cupón en la misma compra.",
          "El afiliado no puede usar un cupón de premio en la tienda donde está afiliado.",
        ],
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
  /* ⚠️ Faltaba, y no era que faltara un documento: era que le dábamos OTRO. El
     registro mandaba a las cuentas digitales a leer los términos de Cliente
     —los de alguien que compra en una tienda, y los que prometen 10 días de
     arrepentimiento para todo—. Arreglado el 03/09/26 junto con este apartado. */
  digital: {
    label: "Productos Digitales",
    sections: [
      {
        title: "1. Aceptación de los términos",
        body: "Al crear una cuenta de Productos Digitales en TiendaApps, aceptás estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no podés usar el servicio.",
      },
      {
        title: "1 bis. Edad mínima requerida",
        body: "Tenés que ser mayor de 18 años para crear una cuenta. Al registrarte declarás que cumplís con ese requisito. Si detectamos una cuenta de una persona menor de edad, la eliminamos junto con todos sus datos.",
      },
      {
        title: "2. Qué es este servicio",
        body: "Productos Digitales es un espacio para vender archivos que se descargan —ebooks, guías, plantillas— con su propia página de venta y entrega automática. No es una tienda: no hay envíos, no hay stock y no hay carrito con varios productos.",
        list: [
          "Vos ponés el archivo, el precio y los textos. TiendaApps pone la página, el cobro y la entrega.",
          "El cobro se hace con Mercado Pago, a tu nombre, con tu cuenta conectada. La plata entra a tu cuenta de Mercado Pago, no a la nuestra.",
          "Apenas Mercado Pago acredita el pago, la plataforma le entrega el archivo a quien compró: se lo muestra en pantalla y se lo manda por correo.",
        ],
      },
      /* ⚠️ LA SECCIÓN QUE FALTABA ENTERA, y es la más importante de todas.
       *
       * El art. 40 de la Ley 24.240 hace solidariamente responsable a TODA la
       * cadena de comercialización por el daño de un producto. Una plataforma
       * que aloja el archivo, cobra reteniendo su comisión y manda el mail de
       * entrega desde su propio dominio está mucho más adentro de esa cadena que
       * un software que sólo presta pantallas — o sea que esto nos importa MÁS
       * que a un competidor que deja el envío de mails en manos del vendedor.
       *
       * ⚠️ Y no es un escudo: el art. 40 es de orden público y un contrato no lo
       * apaga. Por eso el último punto lo dice en voz alta en vez de esconderlo.
       * Lo que esto sí hace es encuadrar la relación y dejar escrito, donde el
       * vendedor lo lee antes de vender, que los reclamos de sus compradores son
       * suyos. Sin esto no había una sola línea sobre el tema. */
      {
        title: "2 bis. Qué somos en tu venta, y qué no",
        body: "TiendaApps te presta la herramienta: la página, el cobro y la entrega. Pero la venta es tuya, y conviene que esté escrito con todas las letras.",
        list: [
          "La compraventa se perfecciona entre vos y quien te compra. TiendaApps no es vendedora, ni autora, ni editora del producto, y no es parte de esa relación de consumo.",
          "No revisamos ni aprobamos tu producto antes de que lo publiques, y no estamos obligados a hacerlo. Si en algún momento revisamos o damos de baja algo, es una facultad nuestra y no convierte a TiendaApps en responsable de lo que publicaste.",
          "Cualquier reclamo, garantía, soporte o devolución por tu producto se resuelve con vos. Por eso tu página lleva tus datos de contacto y el mail de entrega los muestra.",
          "⚠️ Esto NO recorta los derechos del comprador. El art. 40 de la Ley 24.240 es de orden público y ninguna cláusula lo puede desactivar: lo que esta sección hace es dejar claro quién responde por qué, no quitarle derechos a nadie. Si un comprador tiene un reclamo, lo puede hacer igual.",
          "TiendaApps tampoco es tu socia, tu representante ni tu empleadora. Sos una actividad independiente, por tu cuenta y riesgo.",
        ],
      },
      /* ⚠️ LA DIRECCIÓN Y EL DOMINIO NO ESTABAN EN NINGUNA PARTE de este
       * apartado (agregado el 04/09/26, con la Fase 5 bis recién hecha).
       *
       * La sección 4 del apartado de TIENDAS habla de dominio propio, pero es de
       * otro apartado y de otro producto: allá es uno por cuenta y acá es uno
       * por producto. Una cuenta digital que conectaba su dominio no tenía una
       * sola línea que dijera de quién es, quién lo paga ni qué pasa si lo
       * desconecta.
       *
       * Y la dirección de tiendaapps es todavía más delicada: es NUESTRA y se
       * presta. Quien pauta contra ella durante meses tiene que saber, antes de
       * empezar a gastar en publicidad, que no es suya y bajo qué condiciones la
       * tiene. */
      {
        title: "2 ter. La dirección de tu producto, y tu dominio",
        body: "Cada producto tiene su propia dirección, y puede tener además un dominio tuyo. Son dos cosas distintas y conviene no confundirlas.",
        list: [
          "La dirección tipo tuproducto.tiendaapps.com es NUESTRA y te la prestamos mientras tengas la cuenta activa. Viene con todos los planes, incluido el gratuito, y no se apaga por cambiar de plan.",
          "El nombre lo elegís vos, si está libre. Se comparte con el resto de la plataforma: si otra cuenta ya lo tomó, no está disponible. Y hay nombres reservados que no se pueden usar porque harían pasar tu página por una nuestra.",
          "⚠️ Si cambiás la dirección, la anterior deja de funcionar y no la reservamos: los enlaces que hayas repartido y los anuncios que apunten ahí dejan de llegar. Es tu decisión y la pantalla te lo avisa antes.",
          "Podemos cambiar o dar de baja una dirección si suplanta una marca ajena, si imita a TiendaApps o si la usa una cuenta suspendida. Fuera de esos casos, no te la tocamos.",
          "El dominio propio (ej: tuproducto.com) viene con el plan Pro, es uno por producto y lo comprás y lo pagás vos, en el registrador que quieras. No lo compramos, no lo gestionamos y no lo renovamos por vos.",
          "Si no renovás tu dominio y lo perdés, no somos responsables. Tu dirección de tiendaapps.com sigue funcionando igual: el dominio se suma, no la reemplaza.",
          "Podés desconectar tu dominio cuando quieras, aunque tu plan esté vencido: es tuyo. Al desconectarlo deja de abrir tu página en pocos minutos.",
          /* ⚠️ 1.9: decía "si tu plan Pro se vence, el dominio sigue funcionando", y
             desde el 14/09/26 no es así. Sin Pro el dominio REDIRIGE a la
             dirección de tiendaapps —no se rompe, no se pierde— y si pasan
             DIAS_DE_DOMINIO_EN_FREE sin Pro se desconecta de nuestro lado, con
             aviso antes. Los números salen de la misma constante que los aplica. */
          `Si dejás de tener el plan Pro, tu dominio no se rompe ni se pierde: pasa a redirigir a tu dirección de tiendaapps.com, así que quien entre por ahí llega igual a tu página. Si volvés a Pro, vuelve a funcionar solo. Si pasan ${DIAS_DE_DOMINIO_EN_FREE} días sin Pro, lo desconectamos de nuestro lado —te avisamos ${DIAS_DE_AVISO_DEL_DOMINIO} días antes por correo— y el dominio te queda libre; para volver a usarlo hay que conectarlo de nuevo.`,
          "Sin el plan Pro tampoco vas a poder conectar un dominio nuevo ni cambiar el que hay.",
        ],
      },
      {
        title: "3. La comisión, y qué pasa si hay una devolución",
        body: "TiendaApps retiene un porcentaje de cada venta. No hay factura ni cobro aparte: la comisión se retiene sola dentro del cobro de Mercado Pago.",
        list: [
          `El porcentaje depende de tu plan: ${COMISION_DIGITAL.FREE}% en Free, ${COMISION_DIGITAL.STARTER}% en Starter y ${COMISION_DIGITAL.PRO}% en Pro. En Free no hay abono: la comisión es lo único que se cobra.`,
          "El porcentaje queda congelado en cada venta al momento de cobrarse. Si después cambiás de plan, las ventas viejas conservan el porcentaje que tenían — no se recalculan.",
          "Si hay una devolución, TiendaApps devuelve su comisión completa. Si la venta se deshizo no hay servicio prestado, y quedarnos con la comisión de una venta anulada sería cobrar por nada.",
          "La comisión solo funciona con Mercado Pago. Si en el futuro se habilitan otros medios de pago, se informará cómo se cobra en cada uno antes de activarlos.",
        ],
      },
      /* La palabra "impuestos" aparecía UNA vez en todo el documento, y era en
         el derecho del comprador a saber el precio final. Cero sobre el vendedor.
         Para alguien que factura infoproductos en Argentina no es un detalle. */
      {
        title: "3 bis. Los impuestos son tuyos",
        body: null,
        list: [
          "Vos determinás, declarás y pagás todos los tributos de tus ventas: IVA, ingresos brutos, ganancias, retenciones provinciales y cualquier otro que corresponda a tu situación.",
          "TiendaApps no actúa como agente de retención ni de percepción de tus obligaciones fiscales. La comisión que retenemos es nuestra contraprestación por el servicio, no un impuesto.",
          "El precio que ponés en tu página es el que ve tu comprador. Si tu situación fiscal exige discriminar algo, es tu responsabilidad reflejarlo ahí.",
          "Lo mismo con la facturación a tus compradores: emitir el comprobante que corresponda es tuyo. TiendaApps te factura a vos la suscripción, no le factura nada a quien te compra.",
        ],
      },
      {
        title: "4. Qué podés vender, y qué no",
        body: "Sos el único responsable del archivo que subís y de lo que prometés en tu página de venta.",
        list: [
          "Tiene que ser tuyo o tenés que tener derecho a venderlo. Subir material de otra persona —un ebook ajeno, un curso pirateado, plantillas con licencia que no permite reventa— es motivo de baja inmediata y de responder ante quien reclame.",
          "Lo que la página promete tiene que ser lo que el archivo entrega. Una página que anuncia 200 páginas y entrega 12 es publicidad engañosa (arts. 4 y 8, Ley 24.240), y responde quien la escribió.",
          "No se puede vender contenido ilegal, ni que infrinja derechos de terceros, ni que prometa resultados que no se pueden cumplir (curas, rendimientos financieros garantizados y similares).",
          "Si un tercero reclama por contenido que subiste, te comprometés a avisarnos de inmediato y a colaborar en la defensa. La responsabilidad final será proporcional a la participación de cada parte, conforme la legislación argentina. Esta cláusula no implica renuncia a ningún derecho reconocido por la Ley 24.240.",
        ],
      },
      /* ⚠️ Faltaba el PERMISO. Los términos del Dueño de tienda tienen su
         licencia desde siempre (sección 8); estos, escritos el mismo día que
         esto se detectó, no la tenían. O sea que guardábamos su PDF, lo
         firmábamos y se lo mandábamos por mail a terceros sin una línea que
         dijera que nos autorizó. Es el hueco más fácil de tapar y el más raro
         de tener abierto. */
      {
        title: "4 bis. Tu contenido sigue siendo tuyo",
        body: null,
        list: [
          "Lo que subís es tuyo y sigue siendo tuyo. TiendaApps no adquiere ningún derecho sobre tu ebook, tus textos ni tus imágenes.",
          "Lo que sí nos das es un permiso acotado y para una sola cosa: alojar el archivo, guardarlo, procesarlo y entregárselo a quien te lo compra. Sin ese permiso no podríamos ni guardarlo. Es revocable —se termina cuando borrás el producto o la cuenta— y no lo usamos para nada más: no lo mostramos en otro lado, no lo cedemos y no lo vendemos.",
          "La única excepción a 'se termina cuando borrás' es la cuarentena de 30 días de la sección 5, que existe para no dejar sin su compra a alguien que ya pagó.",
          "El software, el diseño, la marca y las plantillas de TiendaApps son nuestros. Al usar la plataforma tenés una licencia limitada para usarla, no para copiarla ni revenderla.",
        ],
      },
      /* Los planes ya VENDEN funciones con IA —"Página de venta armada con IA"
         está en los tres— así que el reparto de responsabilidades tiene que
         estar escrito antes de que la primera se encienda, no después. Está
         redactado como una condición de uso ("cuando uses"), no como una promesa
         de disponibilidad. El otro lado del mismo pendiente vive en la política
         de privacidad, y tiene su propio chequeo. */
      {
        title: "4 ter. Cuando uses las funciones con inteligencia artificial",
        body: "Algunas funciones arman textos, páginas o fichas con IA. Lo que sale de ahí es un borrador tuyo, no una obra nuestra ni un consejo profesional.",
        list: [
          "Se entrega tal cual: puede tener errores, datos inventados o frases que no dicen lo que vos querías. Revisarlo antes de publicarlo o venderlo es tuyo.",
          "Sos responsable de que lo generado sea veraz y de que no infrinja derechos de terceros. Que lo haya escrito una IA no cambia quién responde por lo que dice tu página.",
          "Usar la IA no es una aprobación nuestra de nada. Es una herramienta, no una revisión ni una certificación.",
          "Las funciones de IA pueden tener cupos según tu plan, y podemos suspenderlas si se usan para intentar sacar información de otras cuentas o del sistema.",
        ],
      },
      /* ⚠️ El 4 ter de arriba habla de la IA que escribe TEXTOS de la página.
       * Esto es otra cosa y por eso va aparte: un ebook escrito por una máquina
       * que después se VENDE a un tercero por plata. La diferencia importa —lo
       * que ahí es un borrador que se revisa antes de publicar, acá es la
       * mercadería. Agregado el 04/09/26, con la función ya andando. */
      {
        title: "4 quater. El ebook escrito con inteligencia artificial",
        body: "Algunos planes incluyen que la IA te escriba un ebook completo a partir de un tema. Lo que sale de ahí es un BORRADOR tuyo, y venderlo sin leerlo es tu responsabilidad.",
        list: [
          "El contenido puede tener errores, afirmaciones inexactas o datos inventados. La IA no verifica nada de lo que escribe. Leerlo entero antes de venderlo es tuyo, no nuestro.",
          "No es asesoramiento profesional de ninguna clase. Si el tema es de salud, dinero, derecho o cualquier otro donde una recomendación equivocada pueda hacer daño, sos vos quien responde por lo que ese archivo dice.",
          "El texto no lleva estadísticas, estudios, testimonios ni casos reales, y no promete resultados. Si agregás algo de eso por tu cuenta, tenés que poder respaldarlo.",
          "El resultado es tuyo y podés venderlo. TiendaApps no reclama derechos sobre él, y tampoco te garantiza que sea único: la misma herramienta puede producir textos parecidos para otra persona con un pedido parecido.",
          "Los ebooks incluidos son un cupo por plan, no un servicio ilimitado. Un ebook que se generó cuenta aunque después no lo uses.",
          "Si la generación se corta por un problema nuestro y no se llega a armar el archivo, esa generación no te la contamos.",
        ],
      },
      {
        title: "5. La entrega, y qué se registra de ella",
        body: "La entrega la hace la plataforma, no vos. Estos son sus límites y su registro:",
        list: [
          `El enlace de descarga vale ${DIAS_DEL_PERMISO} días corridos desde la compra y permite hasta ${MAX_DESCARGAS} descargas. Es para que quien compró lo pueda bajar en el celular y en la computadora sin quedarse afuera.`,
          "Podés reenviar el mail de entrega desde tu panel de Ventas, con un tope diario por venta. Si el enlace estaba vencido, el reenvío lo renueva; el contador de descargas no se reinicia.",
          /* 1.9: el enlace entrega el archivo que el producto tiene EN ESE
             MOMENTO, no una copia congelada de la compra. Es lo que hacen las
             plataformas del rubro y sirve para corregir; el documento no lo
             decía, y el vendedor que pisa un producto con otro tiene que saber
             que sus compradores se lo llevan. */
          "El enlace entrega el archivo que el producto tiene en ese momento. Si reemplazás el archivo, quien ya lo compró descarga la versión nueva mientras su enlace esté vigente: sirve para corregir o mejorar lo que vendiste. Para vender otra cosa, creá otro producto; reemplazar un archivo por uno distinto de lo que se vendió es tu responsabilidad frente a quien compró.",
          "De cada descarga queda registrada la fecha, la dirección IP y el navegador. Es la prueba de que la entrega se hizo, y existe para poder defender un cobro si alguien lo discute. Vos ves si se descargó y cuándo; no ves la dirección IP.",
          "Si borrás un producto, su archivo queda 30 días en cuarentena antes de eliminarse del depósito. Ese plazo protege a quien todavía tiene un permiso vigente: no podemos dejar sin su compra a alguien que ya pagó.",
          /* Los bonos y los upsells viajan como líneas de la misma orden y se
             entregan igual, pero no aparecían en ninguna parte del documento.
             Un bono es un archivo que alguien recibe por haber pagado: le
             corresponden exactamente las mismas reglas que al principal. */
          "Los bonos van con la compra del producto principal y se entregan junto con él. Aunque su precio sea cero, son parte de lo que la persona compró: rigen para ellos las mismas reglas de entrega, de devolución y de responsabilidad que para el archivo principal.",
          "Los upsells que la persona acepte se suman a la misma compra y se entregan igual. Si los acepta después de haber pagado, se cobran aparte y se entregan aparte, con su propio enlace.",
        ],
      },
      {
        title: "6. Devoluciones: qué te cubre y qué no",
        body: "Un archivo de descarga inmediata no funciona como un producto físico, y conviene que sepas exactamente dónde estás parado.",
        list: [
          "Si quien compró NO descargó el archivo, tiene los 10 días corridos de arrepentimiento del art. 34 de la Ley 24.240, como en cualquier compra a distancia. Se devuelve y listo. Tu panel de Ventas muestra 'sin bajar' justamente para que puedas ver esa línea.",
          "Si YA lo descargó, el arrepentimiento no corresponde: lo excluye el art. 1116 inc. b del Código Civil y Comercial. Para que esa excepción se sostenga, antes de pagar le mostramos la condición y le pedimos que la acepte, y guardamos esa aceptación con fecha, hora y el texto que leyó.",
          "⚠️ La garantía que ofrezcas en tu página MANDA sobre lo anterior. El art. 1116 empieza con 'excepto pacto en contrario': si tu página promete '30 días o te devolvemos la plata', esa promesa vale aunque el archivo se haya descargado, y la cumplís vos. Por eso, cuando activás la sección de Garantía, el texto que acepta quien compra la nombra en lugar de contradecirla.",
          "Nada de esto te cubre si el archivo no llega, no abre o no es lo que la página describía. Eso no es arrepentimiento sino incumplimiento, y se reclama igual (Ley 24.240, arts. 10 bis y 19).",
          "Una devolución o un contracargo cortan el acceso a las descargas que falten. Lo que ya se descargó no vuelve: es una asimetría que ninguna plataforma puede resolver.",
        ],
      },
      {
        title: "7. Los datos de quien te compra",
        body: null,
        list: [
          "Recibís el correo y el nombre de quien te compra para poder entregarle el archivo y contactarlo por su compra.",
          "Si los usás para otra cosa —mandarle promociones, sumarlo a una lista, pasárselos a un tercero— sos vos el responsable de ese uso frente a la Ley 25.326, no TiendaApps.",
          "No recibís su dirección IP ni sus datos de pago. Nosotros tampoco guardamos datos de tarjetas: eso lo maneja Mercado Pago.",
        ],
      },
      {
        title: "8. Tu plan y su baja",
        body: null,
        list: [
          "Los planes pagos se cobran por adelantado. Si un pago no se acredita, la cuenta vuelve al plan Free y te avisamos por la campanita del panel.",
          "Volver a Free no borra nada: tus productos, tus páginas y tus ventas quedan donde están. Lo que cambia son los topes y la comisión.",
          "Podés eliminar tu cuenta cuando quieras. Tus ventas quedan registradas a efectos contables y de garantías, y tus archivos se eliminan del depósito respetando la cuarentena de la sección 5.",
        ],
      },
      /* Nuestro derecho a cortar. Estaba dicho de refilón en la sección 4 ("es
         motivo de baja inmediata") y en ningún lado se explicaba con qué
         criterio, con o sin aviso, ni qué pasa con lo que ya se vendió. Una
         facultad de dar de baja que no está escrita es una facultad que después
         hay que discutir. */
      {
        title: "8 bis. Cuándo podemos suspender o dar de baja una cuenta",
        body: "Podemos suspender o dar de baja una cuenta o un producto, con o sin aviso previo según la gravedad, cuando:",
        list: [
          "Se incumple lo de la sección 4 —material ajeno, contenido ilegal, una página que promete algo que el archivo no entrega— o hay indicios razonables de fraude.",
          "Llega un reclamo fundado de un tercero por derechos sobre el contenido, mientras se verifica.",
          "Lo exige una autoridad competente.",
          "Se usa la plataforma para dañarla: sobrecargarla, esquivar sus límites o intentar sacar datos de otras cuentas.",
          "Qué pasa con lo ya vendido: una baja no borra lo que alguien ya pagó. Los permisos de descarga vigentes se respetan, porque quien compró no tiene nada que ver con el motivo de la baja.",
          "Qué NO pasa: una suspensión por incumplimiento no genera derecho a devolución del período de suscripción ya abonado.",
        ],
      },
      {
        title: "9. Disponibilidad y cambios",
        body: "Hacemos lo posible por mantener el servicio disponible, pero no podemos garantizar que no haya interrupciones. Si Mercado Pago tiene una caída, los cobros y las entregas se demoran hasta que se restablezca — la entrega se dispara con su aviso de pago, así que sale sola cuando el aviso llega. Podemos actualizar estos términos avisándote con razonable anticipación ante cambios significativos.",
      },
      {
        title: "10. Contacto y reclamos",
        body: "Para consultas o reclamos escribinos a marketplacemitienda@gmail.com. También podés contactar a Defensa del Consumidor de tu provincia, o recurrir al Sistema Nacional de Arbitraje de Consumo (SNAC), gratuito y voluntario: argentina.gob.ar/produccion/defensadelconsumidor/snac",
      },
    ],
  },
  buyer: {
    label: "Cliente",
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
      /* ⚠️ ESTA SECCIÓN ES LA QUE SOSTIENE TODO EL ECOSISTEMA DE PRODUCTOS
         DIGITALES, y está escrita para que se pueda leer sin abogado.
         La excepción del art. 1116 inc. b arranca con "excepto pacto en
         contrario": si acá dijéramos de más —o si la página de venta promete una
         garantía— la excepción se cae. Por eso el punto de la garantía está
         escrito y por eso el consentimiento del checkout la nombra.
         Ver `lib/consentimiento-digital`. */
      {
        title: "6 ter. Productos digitales (archivos de descarga inmediata)",
        body: "Algunas cuentas de TiendaApps venden productos digitales: archivos que se descargan, como ebooks, plantillas o guías. Funcionan distinto de un producto físico y estas son las reglas, en castellano:",
        list: [
          "Cómo te llega: apenas Mercado Pago acredita el pago, se habilita la descarga en la pantalla de agradecimiento y además te mandamos un correo con el enlace. No se envía nada por correo postal ni hay costo de envío.",
          `Cuánto te dura: el enlace vale ${DIAS_DEL_PERMISO} días corridos desde la compra y permite hasta ${MAX_DESCARGAS} descargas. Es para que lo puedas bajar en el celular y en la computadora sin quedarte sin acceso. Guardá el archivo apenas puedas.`,
          "Arrepentimiento SI TODAVÍA NO LO DESCARGASTE: tenés los 10 días corridos del art. 34 de la Ley 24.240, como en cualquier compra a distancia. Pedilo por el botón de arrepentimiento del sitio y se te devuelve el dinero.",
          "Arrepentimiento UNA VEZ DESCARGADO: no corresponde. Lo establece el art. 1116 inc. b del Código Civil y Comercial, que excluye del derecho de revocación a los archivos informáticos suministrados por vía electrónica que se pueden descargar o reproducir de inmediato para uso permanente. Por eso, antes de pagar, se te muestra esta condición y tenés que aceptarla marcando una casilla: la aceptación queda registrada con fecha y hora.",
          "La garantía que ofrezca quien vende MANDA sobre lo anterior. Si la página de venta promete algo como \"30 días o te devolvemos la plata\", esa promesa vale y podés hacerla valer aunque hayas descargado el archivo. El texto que aceptás en el pago lo dice expresamente cuando hay garantía. Se reclama a quien te vendió.",
          "Si el archivo no llega, no abre o no es lo que se describía, no estás sin derechos: eso no es arrepentimiento sino incumplimiento, y se reclama igual (Ley 24.240, arts. 10 bis y 19). Escribile primero a quien te vendió y, si no responde, a marketplacemitienda@gmail.com",
          "Qué registramos de tus descargas: la fecha y hora, tu dirección IP y el navegador desde el que bajaste el archivo. Se guarda con un solo fin —poder acreditar que la entrega se hizo, si alguna vez se discute el cobro— y se borra junto con el permiso de descarga. No se usa para publicidad ni se comparte con terceros fuera de ese fin.",
          "El contenido del archivo es de quien lo vende, no de TiendaApps. Comprarlo te habilita a usarlo, no a revenderlo ni a redistribuirlo.",
        ],
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
          "Derecho de arrepentimiento (art. 34): si compraste a distancia (por internet), podés cancelar la compra sin dar explicaciones dentro de los 10 días corridos desde que recibiste el producto o desde que contrataste el servicio. El vendedor debe reintegrarte el dinero sin descuentos. Única excepción: los archivos digitales que ya descargaste (art. 1116 inc. b del Código Civil y Comercial) — está explicado en el punto 6 ter, y si todavía no lo descargaste el derecho corre igual.",
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
  /**
   * El donante existía en /privacidad pero no acá, y /comunidad manda a
   * `?role=donor`: quien venía de ahí a leer los términos caía en "Cliente"
   * sin aviso — y donar no requiere tener cuenta ni haber comprado nada, así
   * que ni siquiera es cliente.
   *
   * Es corto a propósito. El documento detallado de las donaciones es
   * /canasta/terminos, y ese ya declara que "forma parte de los Términos y
   * Condiciones generales". Repetir sus ocho puntos acá sería una cuarta copia
   * de las mismas reglas, con una cuarta forma de quedar desactualizada.
   */
  donor: {
    label: "Donante / Comunidad Solidaria",
    sections: [
      {
        title: "1. Qué son estos términos",
        body: "Si donás a una campaña de la Canasta Solidaria o a una Causa Libre, la donación se rige por los Términos de la donación, publicados en tiendaapps.com/canasta/terminos. Ese es el documento completo y forma parte de estos Términos y Condiciones generales. Acá está lo esencial.",
      },
      {
        title: "1 bis. No hace falta tener cuenta",
        body: "Podés donar sin registrarte en TiendaApps. Si donás con la sesión iniciada, vinculamos la donación a tu cuenta; si no, la donación es igual de válida. Para donar tenés que tener al menos 18 años.",
      },
      {
        title: "2. Una donación no es una compra",
        body: null,
        list: [
          "Es un aporte voluntario, separado de cualquier compra. No es el pago de un producto ni de un servicio, así que no aplican el derecho de arrepentimiento de la Ley 24.240 ni las garantías legales de productos.",
          "Las donaciones son no reembolsables, salvo error de cobro comprobado.",
          "Donar no te da derecho a recibir nada a cambio ni ningún premio. No es un sorteo.",
        ],
      },
      {
        title: "3. Adónde va la plata",
        body: "El dinero donado va directo a la cuenta de TiendaApps y se destina exclusivamente al objetivo de la campaña correspondiente. Nunca va a la cuenta de una tienda, aunque hayas donado desde el carrito de una compra. El equipo de TiendaApps decide quién recibe lo recaudado en cada campaña — nunca es uno de los donantes.",
      },
      {
        title: "4. Montos y límites",
        body: "Hay un mínimo por donación y un tope por persona para que cada campaña sea un aporte de la comunidad y no la financie una sola persona, además de una donación confirmada por persona y por campaña. Los valores exactos están en tiendaapps.com/canasta/terminos, que es donde se mantienen actualizados.",
      },
      {
        title: "5. Cambios en una campaña",
        body: "TiendaApps puede modificar, pausar o cancelar una campaña en cualquier momento, informando a los donantes por email ante cambios relevantes.",
      },
      {
        title: "6. Tus datos",
        body: "El tratamiento de los datos que dejás al donar —y de la información que compartas si iniciás una solicitud de ayuda, que puede ser sensible— está detallado en la Política de Privacidad, solapa 'Donante / Comunidad Solidaria'.",
      },
      {
        title: "7. Modificaciones",
        body: "Podemos actualizar estos términos. Ante cambios significativos te avisaremos por el canal que consideremos más adecuado, con razonable anticipación. La fecha de 'última actualización' al inicio de esta página siempre refleja la versión vigente.",
      },
      {
        title: "8. Contacto",
        body: "Para consultas o reclamos sobre una donación escribinos a tiendaapps.solidaria@gmail.com. Para cualquier otro tema, a marketplacemitienda@gmail.com",
      },
    ],
  },
};

export default async function TerminosPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; panel?: string }>;
}) {
  const { role: roleParam, panel } = await searchParams;
  // `rolValido` y no el `?? CONTENT.buyer` de antes: ese tapaba una clave que no
  // existe, pero no una heredada de Object.prototype. `?role=constructor`
  // devolvía la función `Object` —truthy, así que el `??` no la reemplazaba— y
  // la página reventaba con un 500 al hacer `content.sections.map`.
  const role = rolValido(roleParam, CONTENT) ?? "buyer";

  return (
    <PaginaLegalPlataforma
      titulo="Términos y Condiciones"
      ruta="/terminos"
      tituloResponsable="Datos del prestador del servicio"
      roles={CONTENT}
      rolActivo={role}
      /* Abierto desde un panel, el encabezado se queda sin salidas al sitio.
         Ver `desde-el-panel`. */
      volverA={volverAlPanel(panel)}
      /* Y el parámetro se vuelve a poner en las pestañas de rol: sin esto el
         primer clic adentro del documento lo perdía y volvían las salidas. */
      panel={panelValido(panel)}
    />
  );
}
