import {
  CANTIDAD_CODIGOS, DIAS_DINERO_TRABADO, DIAS_ESPERA_CON_CONTRASENA, DIAS_ESPERA_SIN_CONTRASENA,
  DIAS_HISTORIAL, HORAS_TRABA_POR_RESPALDO,
} from "@/lib/seguridad-cuenta-reglas";

/**
 * Lo que dicen los términos y la privacidad de la verificación en dos pasos
 * (15/10/26, versión 1.11). Va en un solo lugar y con los plazos sacados de las
 * mismas constantes que usa el código: si un día la espera pasa a ser de 10
 * días, el documento lo dice solo. Copiado en tres solapas, un día se corrige
 * una y quedan dos diciendo otra cosa.
 *
 * Va en las solapas de Dueño de tienda, Afiliado y Productos Digitales: son las
 * cuentas que la pueden activar. Ver `lib/seguridad-cuenta`.
 */

export const TERMINOS_DOS_PASOS: string[] = [
  "Podés activar, si querés, la verificación en dos pasos desde Seguridad, en tu panel: además de tu contraseña, de un código por mail o de Google, para entrar se te pide la huella o la cara de tu dispositivo (una llave de acceso) o un código de una app de autenticación.",
  `Al activarla te damos ${CANTIDAD_CODIGOS} códigos de respaldo de un solo uso. Guardarlos es tu responsabilidad: TiendaApps no puede verlos ni volver a mostrártelos.`,
  "Con la verificación activada, también se pide antes de cambiar tus datos de cobro (CBU, CVU, alias o cuenta de Mercado Pago), de pedir un retiro y de cambiar la seguridad de tu cuenta. Sin ella, para eso mismo se pide un código por mail cuando ya había datos cargados.",
  `Si perdés todos tus métodos y tus códigos, podés pedir que se quite desde "Perdí mi celular": confirmás desde tu mail y se quita después de ${DIAS_ESPERA_CON_CONTRASENA} días corridos (${DIAS_ESPERA_SIN_CONTRASENA} si al pedirlo entraste sin tu contraseña). Si en ese tiempo alguien entra a la cuenta con el segundo paso, el pedido se cancela solo. Te avisamos por mail y en tu panel mientras dura la espera.`,
  `Cuando la verificación se quita sin el segundo paso —al terminar esa espera, o al entrar con un código de respaldo— los datos de cobro no se pueden cambiar y no se pueden pedir retiros durante ${DIAS_DINERO_TRABADO} días (${HORAS_TRABA_POR_RESPALDO} horas en el caso del código de respaldo). Lo que ya cobraste o tenés acreditado no se pierde: sólo se demora poder cambiar a dónde se cobra.`,
  "TiendaApps nunca quita la verificación en dos pasos de una cuenta ni acorta la espera, aunque se lo pidan por mail, teléfono, WhatsApp o cualquier otro medio. Lo único que podemos hacer, si nos avisás que un pedido de \"Perdí mi celular\" no lo hiciste vos, es congelarlo mientras lo revisamos.",
  "La espera y las trabas existen para protegerte de quien consiga tu contraseña o tu mail. TiendaApps nunca te va a pedir tu contraseña, tus códigos de respaldo ni que apagues la verificación.",
];

export const PRIVACIDAD_DATO_DOS_PASOS =
  "Seguridad de tu cuenta, si activás la verificación en dos pasos: la llave pública de tu llave de acceso (tu huella o tu cara nunca salen de tu dispositivo: no las recibimos ni las guardamos), el secreto de la app de autenticación (lo guarda nuestro proveedor de autenticación, Supabase), tus códigos de respaldo guardados como una huella cifrada que no permite leerlos, y un historial de seguridad: qué pasó (activaste, entraste con el segundo paso, se pidió \"Perdí mi celular\"), cuándo y desde qué tipo de dispositivo y navegador. Las sesiones abiertas (dispositivo, navegador y dirección IP) las registra el proveedor de autenticación, y en Seguridad te mostramos el dispositivo y la última vez que se usó cada una. Finalidad: proteger el acceso a tu cuenta y a tus cobros. Base legal: la ejecución del servicio que pediste al activarla y nuestro interés legítimo en prevenir accesos no autorizados (art. 5 inc. c Ley 25.326).";

export const PRIVACIDAD_PLAZO_DOS_PASOS =
  `Verificación en dos pasos: el historial de seguridad se borra a los ${DIAS_HISTORIAL} días; los códigos de respaldo y las llaves, cuando los quitás o cuando eliminás la cuenta.`;
