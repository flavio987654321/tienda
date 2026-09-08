/**
 * Chequeos del panel de Productos Digitales. Se corre a mano con:
 *
 *   npx tsx src/lib/panel-digitales.check.ts
 *
 * Cuida tres cosas que no se pueden probar importando nada, porque viven adentro
 * de rutas y componentes que arrastran Prisma, Supabase y Mercado Pago:
 *
 *   1. Los frenos de `/api/digitales/prueba`, que es la única ruta del proyecto
 *      que **regala un plan pago**. No cobra, así que no pasa por el webhook ni
 *      por ninguno de los controles que ya existen: los suyos son todos propios.
 *   2. Que ninguna pantalla del panel prometa una ruta que no existe.
 *   3. Que después de pagar, la persona vuelva a SU panel.
 *
 * Es un chequeo tosco a propósito: no prueba que funcionen, prueba que **no
 * desaparecieron**. Todos los agujeros que cubre tienen la misma forma —no rompen
 * nada, no tiran ningún error— y se descubren cuando ya pasó.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { PLANES, TOPES_DIGITALES, COMISION_DIGITAL } from "./planLimits";
import { TIERS_DIGITALES, featuresDigital, esElPlanMasAlto } from "./planes-digitales";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* El archivo sin sus comentarios. Varios de estos chequeos verifican que algo NO
   esté, y los comentarios de esas mismas rutas explican el error viejo citándolo
   textual — sin sacarlos, el chequeo se dispara con su propia documentación.
   Mismo criterio que en `pagos-suscripcion.check.ts`. */
function soloCodigo(fuente: string): string {
  return fuente
    .split("\n")
    .filter((linea) => {
      const t = linea.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"));
    })
    .join("\n");
}

const prueba = soloCodigo(readFileSync("src/app/api/digitales/prueba/route.ts", "utf8"));
const preferencia = soloCodigo(readFileSync("src/app/api/suscripcion/preferencia/route.ts", "utf8"));
const barra = readFileSync("src/app/digitales/DigitalesSidebar.tsx", "utf8");
const layout = soloCodigo(readFileSync("src/app/digitales/layout.tsx", "utf8"));
const miCuenta = soloCodigo(readFileSync("src/app/digitales/mi-cuenta/MiCuentaClient.tsx", "utf8"));
const modal = soloCodigo(readFileSync("src/components/subscription/PaymentModal.tsx", "utf8"));
const cron = soloCodigo(readFileSync("src/app/api/cron/daily/route.ts", "utf8"));
const perfil = soloCodigo(readFileSync("src/app/api/perfil/route.ts", "utf8"));
const registro = soloCodigo(readFileSync("src/app/api/auth/registro/route.ts", "utf8"));
const mails = soloCodigo(readFileSync("src/lib/resend.ts", "utf8"));
const crear = soloCodigo(readFileSync("src/app/api/digitales/productos/route.ts", "utf8"));
const editar = soloCodigo(readFileSync("src/app/api/digitales/productos/[id]/route.ts", "utf8"));
const pantallaProductos = soloCodigo(readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8"));
const config = soloCodigo(readFileSync("src/app/api/digitales/configuracion/route.ts", "utf8"));
const pantallaConfig = soloCodigo(readFileSync("src/app/digitales/configuracion/ConfiguracionClient.tsx", "utf8"));
const tabGeneral = soloCodigo(readFileSync("src/app/digitales/configuracion/TabGeneral.tsx", "utf8"));
const piezasConfig = soloCodigo(readFileSync("src/app/digitales/configuracion/piezas.tsx", "utf8"));
const paginaConfig = soloCodigo(readFileSync("src/app/digitales/configuracion/page.tsx", "utf8"));
const mpConnect = soloCodigo(readFileSync("src/app/api/mp/oauth/connect/route.ts", "utf8"));
const mpCallback = soloCodigo(readFileSync("src/app/api/mp/oauth/callback/route.ts", "utf8"));

/* ── 1. La ruta que regala un plan pago ────────────────────────────────────── */
console.log("\n1) Los frenos de /api/digitales/prueba");

chequear("exige sesión", /getCurrentUser\(\)/.test(prueba) && /status: 401/.test(prueba));

chequear("tiene tope de intentos", /checkRateLimit\(`digital-prueba:/.test(prueba));

// El tier llega del navegador y elige QUÉ plan se regala. Con un cast, "PRO"
// escrito a mano en la consola es Pro gratis; con una clave heredada del
// prototipo (`constructor`) se rompe de otra forma.
chequear("el tier sale de una tabla con hasOwnProperty y no de un cast",
  /hasOwnProperty\.call\(PROBABLES, tier\)/.test(prueba) &&
  !/tier as ("STARTER"|"PRO")/.test(prueba));

// Si Productos Digitales está apagado, sus planes no se venden — y tampoco se
// regalan. Es el mismo freno que ya tienen la preferencia y el webhook.
chequear("rechaza el plan de un producto cerrado", /if \(planCerrado\(defPlan\)\)/.test(prueba));

// El candado de ecosistema. Sin esto, una dueña de tienda que le pegara a esta
// ruta se quedaba con role DIGITAL y el cron le cerraba la tienda sola.
chequear("sólo toca suscripciones DIGITAL",
  /sub\.role !== "DIGITAL"/.test(prueba) && /status: 403/.test(prueba));

chequear("sólo se prueba desde Free", /sub\.tier !== "FREE"/.test(prueba));

// Una prueba repetible es Starter gratis para siempre, de a siete días.
chequear("no se puede volver a usar la prueba", /pruebaYaUsada\(sub\)/.test(prueba));

/* El `where` con la condición adentro es lo que hace que un doble click no empuje
   `trialEndsAt` dos veces. Un `update` por id la aplicaría las dos veces. */
chequear("la escritura es un updateMany condicionado (no un update por id)",
  /updateMany\(\{[\s\S]*?where: \{ userId: user\.id, role: "DIGITAL", tier: "FREE" \}/.test(prueba) &&
  /count === 0/.test(prueba));

// Lo más importante: el estado que queda es TRIAL. Un ACTIVE acá sería el plan
// más caro, gratis y para siempre, pedido desde el navegador.
chequear("el alta la arma altaDigitalConPrueba (que devuelve TRIAL, nunca ACTIVE)",
  /altaDigitalConPrueba\(tierProbable, billing\)/.test(prueba) &&
  !/status: "ACTIVE"/.test(prueba));

/* ── 2. Ninguna pantalla promete una ruta que no existe ────────────────────── */
console.log("\n2) Los links del panel llevan a algún lado");

// El menú es lo primero que se toca al entrar. Un link a una pantalla que todavía
// no está da 404 y se lee como "el panel está roto", no como "eso viene después".
const rutasDelNav = [...barra.matchAll(/href: "(\/digitales[^"]*)"/g)].map((m) => m[1]);
chequear("la barra declara al menos dos pantallas", rutasDelNav.length >= 2, rutasDelNav);
for (const ruta of rutasDelNav) {
  const archivo = `src/app${ruta}/page.tsx`;
  chequear(`${ruta} tiene su page.tsx`, existsSync(archivo));
}

// Y el aviso del cron —el único que le llega a una cuenta digital— tiene que
// caer en la pantalla que explica lo que pasó, no en la raíz del panel.
chequear("el aviso de baja a Free lleva a Mi cuenta",
  /link: "\/digitales\/mi-cuenta"/.test(cron) && existsSync("src/app/digitales/mi-cuenta/page.tsx"));


/* Y ninguna pantalla de adentro puede quedar sin salida.
 *
 * En escritorio la barra está siempre a la vista y el botón parece de más —el
 * panel de tiendas se lo sacó por eso—, pero en el celular el menú vive atrás de
 * una hamburguesa, y hay un caso peor: el aviso del cron linkea DERECHO a una
 * pantalla de adentro, así que se puede caer ahí sin haber pasado nunca por el
 * inicio. Este chequeo existe para que la próxima pantalla no se olvide.
 *
 * Mira los `page.tsx` y no los componentes de navegador a propósito: el
 * encabezado y el volver viven en el servidor, iguales en todas las pantallas. */
const pantallasDeAdentro = readdirSync("src/app/digitales", { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => `src/app/digitales/${e.name}/page.tsx`)
  .filter((p) => existsSync(p));

chequear("hay al menos una pantalla de adentro", pantallasDeAdentro.length >= 1, pantallasDeAdentro);
for (const pantalla of pantallasDeAdentro) {
  chequear(`${pantalla.replace("src/app", "")} tiene botón de volver`,
    /<BotonVolver/.test(readFileSync(pantalla, "utf8")));
}

/* ── 3. Después de pagar, cada uno vuelve a su panel ───────────────────────── */
console.log("\n3) La vuelta de Mercado Pago");

// Estaba fijo en /dashboard/mi-plan. Con los planes digitales, el que pagaba
// Starter terminaba en el panel de tiendas, que le contesta "esta no es tu
// cuenta" — justo después de pagar.
chequear("las back_urls dependen del ecosistema del plan",
  /defPlan\.ecosistema === "DIGITAL" \? "\/digitales\/mi-cuenta" : "\/dashboard\/mi-plan"/.test(preferencia));

// El nombre del plan en el checkout salía de un `? :` escrito a mano: cualquier
// plan que no fuera de tienda se anunciaba como "Afiliado".
chequear("el modal de pago toma el nombre del registro",
  /PLANES\[plan\]\.label/.test(modal) && !/plan === "OWNER_PREMIUM" \?/.test(modal));

/* ── 4. La pantalla dice lo mismo que la base ──────────────────────────────── */
console.log("\n4) Mi cuenta no inventa números");

// Los tres números que se muestran salen de las constantes que los hacen cumplir.
// Copiados a mano se desincronizan solos, y esta es la pantalla donde se decide
// pagar.
chequear("la comisión sale de COMISION_DIGITAL", /COMISION_DIGITAL\[tier\]/.test(miCuenta));
chequear("el precio sale de PRECIOS_DIGITALES", /PRECIOS_DIGITALES\[PLAN_KEY\[tier\]\]\[billing\]/.test(miCuenta));
chequear("las funciones salen de featuresDigital", /featuresDigital\(tier\)/.test(miCuenta));

// Con el producto cerrado no se ofrece pagar: la ruta lo rechaza igual, así que
// sería un botón que no puede funcionar.
chequear("no ofrece pagar con el producto cerrado", /\{DIGITALES_ABIERTO && \(/.test(miCuenta));

// Los tres planes tienen que poder dibujarse: `featuresDigital` cruza tiers con
// topes, y un tier sin fila en TOPES_DIGITALES explota en pantalla.
chequear("los tres tiers tienen topes, comisión y funciones",
  TIERS_DIGITALES.every((t) =>
    TOPES_DIGITALES[t] !== undefined &&
    COMISION_DIGITAL[t] !== undefined &&
    featuresDigital(t).length > 0));

// La comisión tiene que bajar a medida que se paga más: es el argumento de venta
// de la pantalla ("con Starter baja a 6%"). Si alguna vez subiera, ese texto
// pasaría a mentir sin que nada avise.
chequear("la comisión baja de Free a Starter a Pro",
  COMISION_DIGITAL.FREE > COMISION_DIGITAL.STARTER &&
  COMISION_DIGITAL.STARTER > COMISION_DIGITAL.PRO);

// Los dos planes que se pueden probar tienen que existir con precio: la pantalla
// muestra "después $X/mes" al lado del botón de probar.
chequear("Starter y Pro existen en el registro y tienen precio",
  PLANES.DIGITAL_STARTER.precios !== null && PLANES.DIGITAL_PRO.precios !== null);

/* ── 5. La puerta del panel ────────────────────────────────────────────────── */
console.log("\n5) El layout sigue decidiendo sesión y rol");

chequear("sin sesión dibuja el login, no redirige", /LoginGate/.test(layout) && !/redirect\(/.test(layout));
chequear("un rol ajeno no entra", /user\.role !== "DIGITAL"/.test(layout) && /PanelRolAjeno/.test(layout));
// El manifiesto y el ícono ya pueden ir: el panel tiene adentro una pantalla que
// funciona. A medias instalaba una app rota.
chequear("declara su manifiesto y su ícono",
  /manifest: "\/api\/manifest\/digitales"/.test(layout) &&
  /icons\/digitales/.test(layout) &&
  existsSync("src/app/api/manifest/digitales/route.ts") &&
  existsSync("src/app/api/icons/digitales/route.tsx"));
// El scope del service worker tiene que coincidir con el del manifiesto o Android
// no atribuye la app instalada.
chequear("el service worker se registra en /digitales", /scope="\/digitales"/.test(layout));

/* ── 6. La barra es lateral, como el panel de tiendas ──────────────────────── */
console.log("\n6) El menú está donde está en el resto de la plataforma");

/* La primera versión era una barra horizontal, calcada de `/afiliados`. Estaba
   mal copiada: el panel que manda en esta plataforma es el de tiendas, y ese es
   lateral. Dos paneles del mismo producto con el menú en lugares distintos se
   sienten dos programas distintos. */
chequear("hay una barra lateral fija a la izquierda",
  /<aside[\s\S]{0,200}?fixed left-0/.test(barra));
chequear("el layout la usa", /<DigitalesSidebar/.test(layout));
/* Si el `<main>` no deja libre la franja de 56 px, la barra —que es `fixed`— se
   dibuja ENCIMA del contenido y tapa el borde izquierdo de cada pantalla. */
chequear("el contenido deja libre la franja de la barra", /lg:ml-14/.test(layout));

/* ── 7. Los datos de la cuenta ─────────────────────────────────────────────── */
console.log("\n7) Editar tus datos no pisa lo que no tocaste");

/* El arreglo que hizo falta para usar esta ruta desde el panel: hacía
   `city: city?.trim() || null` para los tres campos SIEMPRE, así que quien
   mandara sólo nombre y teléfono —como hace esta pantalla, que no pide ciudad—
   le borraba la ciudad a la persona sin nombrarla. */
/* La regla se mudó a `texto-limpio.ts` para que la usen las CUATRO puertas que
   escriben texto y no sólo ésta. Acá se comprueba que la ruta la use; el
   comportamiento en sí lo prueba `texto-limpio.check.ts`, ejecutándolo. */
chequear("la ruta distingue 'no vino' de 'vino vacío'",
  /campoTexto/.test(perfil) && !/city: city\?\.trim\(\) \|\| null/.test(perfil));
chequear("los campos tienen tope de largo",
  /const TOPES = \{/.test(perfil) && /campo\(/.test(perfil));
chequear("la ruta tiene tope de intentos", /checkRateLimit\(`perfil:/.test(perfil));
chequear("la pantalla manda sólo los campos que edita",
  /name: nombre\.trim\(\), phone: telefono\.trim\(\)/.test(miCuenta));

/* La contraseña se cambia por un link al correo y NO con un formulario acá.
   Un formulario en esta pantalla deja que cualquiera con la sesión abierta
   —el teléfono desbloqueado arriba de la mesa— te cambie la contraseña y te deje
   afuera de tu propia cuenta. Si alguna vez se agrega uno, tiene que verificar
   la contraseña vieja del lado del servidor, y este chequeo va a saltar para que
   esa decisión se tome a propósito y no de pasada. */
chequear("la contraseña se cambia por mail, no con un formulario en el panel",
  /\/api\/auth\/reset-password/.test(miCuenta) &&
  !/type="password"/.test(miCuenta));

/* ── 8. Lo que se escribe en un campo no puede hacer daño ──────────────────── */
console.log("\n8) Los dos campos que se escriben a mano");

/* La regla del teléfono es UNA sola y la usan los tres: el registro, la ruta que
   lo edita y la pantalla. Estaba nada más que en el alta, así que el número que
   el registro rechazaba se guardaba igual entrando por `/api/perfil`. Es el mismo
   error que ya había pasado con la contraseña (ver `password-policy`). */
chequear("el registro usa la regla compartida", /validarTelefono\(phone\)/.test(registro));
chequear("la ruta que lo edita usa la MISMA", /validarTelefono\(data\.phone\)/.test(perfil));
chequear("y la pantalla también", /validarTelefono\(telefono\)/.test(miCuenta));

/* Un nombre de una letra no identifica a nadie, y se dibuja en el panel, en los
   mails y en el checkout de Mercado Pago. */
chequear("el nombre tiene mínimo del lado del servidor", /data\.name\.length < 2/.test(perfil));

/* Los caracteres de control no los escribe nadie a mano: llegan pegados. Un salto
   de línea adentro del nombre se arrastra a los mails; el byte nulo rompe
   Postgres, que no lo acepta adentro de un texto. */
chequear("se limpian los caracteres de control",
  /from "@\/lib\/texto-limpio"/.test(perfil));

/* ⚠️ El agujero de verdad que apareció al hacer editable el nombre.
   `sendVerificationReceivedEmail` y `sendVerificationApprovedEmail` metían
   `userName` CRUDO adentro del HTML del mail, mientras el resto del archivo ya
   usaba `escapeHtml`. Con el nombre editable desde el panel, eso es HTML puesto
   por la persona dentro de un correo que mandamos nosotros. */
chequear("ningún mail mete el nombre crudo en el HTML",
  !/\$\{userName \|\| "ahí"\}/.test(mails) &&
  /escapeHtml\(userName\)/.test(mails));

/* ── 9. Los botones no se pueden apretar dos veces ─────────────────────────── */
console.log("\n9) Doble click");

/* Cada botón que escribe algo tiene que apagarse solo mientras trabaja. Un
   `disabled` no alcanza como garantía —alcanza un Enter en el momento justo— así
   que además la función corta al entrar. */
chequear("guardar datos se apaga mientras guarda y corta al entrar",
  /disabled=\{guardando \|\| !datosCambiaron \|\| hayProblema\}/.test(miCuenta) &&
  /if \(guardando \|\| hayProblema \|\| !datosCambiaron\) return;/.test(miCuenta));

/* Y el que se apretó una vez con éxito no se puede volver a apretar con los
   MISMOS datos: la comparación va contra lo último guardado y no contra la prop,
   que no cambia sin recargar la página. */
chequear("después de guardar, el botón queda apagado",
  /guardadoComo/.test(miCuenta) && /setGuardadoComo\(guardadoAhora\)/.test(miCuenta));

chequear("probar el plan se apaga mientras trabaja", /disabled=\{probando !== null\}/.test(miCuenta));
chequear("el link de contraseña no se puede mandar dos veces",
  /disabled=\{mandandoLink\}/.test(miCuenta) && /linkMandado \?/.test(miCuenta));

/* ── 10. Los renglones ─────────────────────────────────────────────────────── */
console.log("\n10) Nada se desborda ni empuja la pantalla");

/* Un correo largo sin cortar ensancha la tarjeta entera y aparece la barra de
   desplazamiento horizontal en el celular. `break-all` es feo pero es lo único
   que corta una dirección que no tiene espacios. */
chequear("el correo se corta", /break-all/.test(miCuenta));
/* En la barra el nombre vive en 240 px y no se puede cortar en dos renglones. */
chequear("el nombre en la barra se recorta con puntos", /truncate/.test(barra));
/* El `<main>` no puede desbordar a lo ancho: si lo hace, la página entera se
   mueve para los costados en el celular y la barra lateral se despega. */
chequear("el contenido no desborda a lo ancho", /overflow-x-hidden/.test(layout));

/* ── 11. Las rutas que crean y editan productos ────────────────────────────── */
console.log("\n11) Los frenos de /api/digitales/productos");

chequear("crear exige sesión Y rol DIGITAL",
  /user\.role !== "DIGITAL"/.test(crear) && /status: 403/.test(crear));
chequear("editar y borrar también", /user\.role !== "DIGITAL"/.test(editar));
chequear("crear tiene tope de intentos", /checkRateLimit\(`digital-producto:/.test(crear));

/* El rol decide dónde se guarda el producto. Con un cast entraría cualquier
   cadena; con `rolDe` sale de una lista o no sale. */
chequear("el rol sale de la lista, no de un cast",
  /rolDe\(rolCrudo\)/.test(crear) && !/as RolDigital/.test(crear));

/* ⚠️ El freno más importante de esta ruta. `padreId` llega del navegador: sin
   cruzarlo contra la tienda de ESTA cuenta, mandar el id del producto de otra
   persona le cuelga un bono adentro de su embudo, y ese bono se entrega con sus
   compras. */
chequear("el producto padre se verifica contra la cuenta que pide",
  /findFirst\([\s\S]{0,200}?id: padreId,[\s\S]{0,80}?storeId: espacio\.storeId/.test(crear));

/* El botón apagado en la pantalla es una cortesía, no un permiso: se cuenta en
   la base. */
chequear("el tope del plan se cuenta en la base",
  /\.product\.count\(/.test(crear) && /cuantos >= tope/.test(crear));

/* ⚠️ Y se cuenta DENTRO de la misma transacción que crea, con candado por tienda.
   Sueltos, contar y crear son dos pasos con un ratito en el medio: dos pedidos de
   la misma cuenta preguntan "¿cuántos hay?", a los dos les contestan "cero" y los
   dos crean. Quedan dos productos en un plan que permite uno.
   Con una persona haciendo clic no pasaba —va de a uno—, pero la cáscara que
   arma la IA crea el principal, el bono y el upsell de una sentada, que es
   exactamente el caso que lo dispara. */
chequear("contar y crear van juntos, con candado por tienda",
  /\$transaction\(async \(tx\)/.test(crear) &&
  /pg_advisory_xact_lock/.test(crear) &&
  /tx\.product\.count\(/.test(crear) &&
  /tx\.product\.create\(/.test(crear));

/* El candado va por TIENDA y no global: si no, dos personas distintas creando
   productos al mismo tiempo se harían cola una detrás de la otra sin motivo. */
chequear("el candado es por tienda, no de toda la base",
  /pg_advisory_xact_lock\(hashtext\(\$\{?espacio\.storeId/.test(crear) ||
  /hashtext\(\$\{espacio\.storeId\}\)/.test(crear));



/* Un producto recién creado NO puede nacer publicado, aunque venga con todo
   cargado: todavía no tiene archivo, y publicar sin archivo es cobrar por algo
   que no se entrega. */
chequear("nace despublicado siempre", /isActive: false,/.test(crear));

/* Y publicar pasa por el mismo chequeo que dibuja el cartel rojo, verificado del
   lado del SERVIDOR: la pantalla apaga el botón, pero el botón no es el permiso. */
chequear("publicar pasa por loQueFalta en el servidor",
  /if \(publicado === true\)/.test(editar) && /loQueFalta\(\{/.test(editar));

/* ⚠️ El `id` viaja en la URL. Sin cruzarlo con el dueño, alguien edita, publica
   o borra el producto de otra persona probando ids. Va adentro del `where` a
   propósito: una consulta que ya no puede devolver lo ajeno no se puede olvidar
   de comprobarlo después. */
chequear("un producto sólo se toca si es de quien lo pide",
  /store: \{ ownerId: userId \}/.test(editar));

/* Borrar de verdad dejaría pedidos viejos sin poder decir qué se vendió, y con
   ellos los permisos de descarga de gente que ya pagó. */
chequear("el borrado es suave y arrastra los bonos y upsells",
  /deletedAt: ahora/.test(editar) && /padreId: id/.test(editar));

/* Las dos rutas y la pantalla usan LA MISMA validación. Copiada en cada una se
   desincroniza sola: se agrega una condición al alta y la edición sigue
   aceptando lo que el alta rechaza. Ya pasó con el teléfono. */
chequear("crear, editar y la pantalla comparten validarCampos",
  /validarCampos\(/.test(crear) && /validarCampos\(/.test(editar) && /validarCampos\(/.test(pantallaProductos));

/* Un bono es un regalo: su precio lo fija el servidor en 0 y no se acepta el que
   venga del navegador. */
chequear("el precio de un bono lo pone el servidor",
  /rol === "BONO" \? 0 : price/.test(crear) && /rol === "BONO" \? 0 : price/.test(editar));

/* ⚠️ El doble clic. `guardando` y `trabajando` son estado, y el estado se ve
   recién en el dibujo siguiente: dos clics en el mismo cuadro leen los dos el
   valor viejo, los dos pasan, y salen dos pedidos. El botón apagado llega tarde.
   Un ref cambia en el acto. Sin esto, dos altas seguidas crean dos productos y
   gastan dos lugares del plan. */
chequear("el doble clic se corta con un ref, no con estado",
  /useRef\(false\)/.test(pantallaProductos) && /enVuelo\.current = true/.test(pantallaProductos));
chequear("y lo tienen las cuatro acciones que escriben",
  (pantallaProductos.match(/if \(.*enVuelo\.current\) return;|if \(enVuelo\.current\) return;/g) ?? []).length >= 4);

/* ── 12. La Configuración del negocio ──────────────────────────────────────── */
console.log("\n12) Los frenos de /api/digitales/configuracion");

chequear("guardar exige sesión Y rol DIGITAL",
  /user\.role !== "DIGITAL"/.test(config) && /status: 403/.test(config));
chequear("tiene tope de intentos", /checkRateLimit\(`digital-config:/.test(config));

/* Es un PATCH parcial: cada sección de la pantalla manda sólo su campo. Un POST
   del objeto entero haría que guardar el WhatsApp reescribiera el nombre y el
   logo con lo que la pantalla tuviera cargado, que puede estar viejo. */
chequear("sólo se escribe lo que vino", /PATCH/.test(config) && /\.\.\.\(typeof nombre === "string"/.test(config));
chequear("un pedido vacío se rechaza en vez de crear el espacio de gorra",
  /vino\.every\(\(v\) => v === undefined\)/.test(config));

/* ⚠️ El mail de soporte va adentro del mail de entrega: es la ÚNICA puerta que
   tiene alguien que pagó y no recibió el archivo. Si acá entra cualquier cosa,
   esa persona se queda sin forma de reclamar. */
chequear("el mail de soporte se valida", /validarEmail\(supportEmail\)/.test(config));
chequear("y se guarda en minúsculas", /supportEmail\.toLowerCase\(\)/.test(config));

/* El contexto de la IA es el nicho de la cuenta: entra en CADA pedido a la IA,
   así que un texto sin tope se paga en cada generación. El recorte va del lado
   del servidor aunque la pantalla tenga `maxLength` — el `maxLength` es del
   navegador, y el navegador no es quien manda el pedido. */
chequear("el contexto de la IA se valida", /validarContextoIA\(/.test(config));
chequear("y se recorta del lado del servidor",
  /limpiarTexto\(iaDescripcion, LARGO_IA_DESCRIPCION\)/.test(config));

/* Vacío se guarda como `null` y no como cadena vacía: `null` es "no lo definió"
   —el checkout cae al nombre de la marca, la IA sabe que no tiene nicho— y una
   cadena vacía es un valor puesto que pasa cualquier chequeo de "¿está
   cargado?" sin decir nada. */
/* Vacío se guarda como `null` y no como cadena vacía: `null` es "no lo definió"
   —el checkout cae al nombre de la marca, la IA sabe que no tiene nicho— y una
   cadena vacía es un valor puesto que pasa cualquier chequeo de "¿está cargado?"
   sin decir nada. Lo garantiza `limpiarTexto`, que es compartida. */
chequear("lo que llega vacío se guarda como null, no como texto vacío",
  /from "@\/lib\/texto-limpio"/.test(config));

/* ⚠️ La dirección se comprueba contra TODAS las tiendas y contra TODOS los
   productos digitales: `algo.tiendaapps.com` puede ser una cosa o la otra, en
   dos tablas con dos índices únicos que no se ven entre sí.

   Esto pedía el `findFirst` con `slug: slugNuevo` escrito tal cual, y así estaba
   —mirando una sola tabla— hasta el 05/09/26. Ahora pide la función compartida,
   que es la que mira las dos. Ver `direcciones-compartidas.check.ts`.

   Y hay una carrera: dos cuentas pidiendo la misma dirección en el mismo
   instante pasan las dos el chequeo y una choca contra el índice. Sin el catch,
   esa persona ve un error de base sin explicación. */
chequear("la dirección se comprueba contra todas las tiendas Y todos los productos",
  /estaLibre\(slugNuevo/.test(config) && /from "@\/lib\/direccion-digital"/.test(config));
chequear("y la carrera contra el índice único se atrapa", /P2002/.test(config));

/* La misma lista blanca que la portada de un producto, importada y no copiada:
   una dirección ajena adentro de una página nuestra es un rastreador de un
   tercero mirando quién entra. */
chequear("el logo pasa por la lista blanca", /logoValido\(logo\)/.test(config));
/* El WhatsApp salió de esta pantalla: el orden de la competencia trae "Mail de
   soporte" en su lugar, que además es lo que va adentro del mail de entrega. La
   ruta ya no lo acepta —era un camino validado al que no llegaba nadie— y la
   regla del teléfono sigue viva donde sí se usa: el registro y Mi cuenta. */
chequear("el WhatsApp ya no entra por acá: era un camino muerto",
  !/whatsappNumber/.test(config));

/* ⚠️ Esto es un componente de servidor que le pasa sus datos al del navegador,
   así que todo lo que seleccione termina viajando adentro del HTML. Los tokens
   de Mercado Pago no se pueden ni rozar. */
chequear("la pantalla NO lee los tokens de Mercado Pago",
  !/mpAccessToken/.test(paginaConfig) && !/mpRefreshToken/.test(paginaConfig));
chequear("sólo mira si está conectado", /mpConnectedAt: true/.test(paginaConfig));

chequear("el doble clic se corta con un ref, no con estado",
  /useRef\(false\)/.test(pantallaConfig) && /if \(enVuelo\.current\) return;/.test(pantallaConfig));
chequear("la pantalla y el servidor comparten las validaciones",
  /validarSlug/.test(pantallaConfig) && /validarSlug/.test(config)
  && /validarNombre/.test(pantallaConfig) && /validarNombre/.test(config));

/* ⚠️ Lo que se dibuja pero todavía no anda.
 *
 * Se dibuja a propósito —lo que no está dibujado se olvida— pero una sección que
 * PARECE que anda y no anda es peor que no tenerla: la persona la configura, se
 * queda tranquila y se entera de que no pasó nada cuando ya es tarde. Los
 * controles apagados y el aviso son lo único que separa "esto viene después" de
 * "esto está roto". */
chequear("las secciones que todavía no andan se avisan",
  /EtiquetaPendiente/.test(piezasConfig) && /Todavía no/.test(piezasConfig));
chequear("y dicen QUÉ falta, no 'próximamente'",
  !/próximamente/i.test(tabGeneral) && /NotaPendiente/.test(tabGeneral));

/* Cada control de una sección apagada va deshabilitado de verdad. Un cartel que
   dice "todavía no" arriba de un campo que se puede escribir es un cartel que
   nadie lee. */
chequear("y sus controles están apagados de verdad",
  (tabGeneral.match(/disabled\b/g) ?? []).length >= 5);

/* ⚠️ La zona de peligro es la que MENOS se puede apurar: de la cuenta cuelgan
   pedidos y permisos de descarga de gente que ya pagó. Un borrado hecho de
   cualquier manera les saca el acceso a lo que compraron. */
chequear("borrar la cuenta sigue apagado",
  /Zona de peligro/.test(tabGeneral) && /Cerrar mi cuenta/.test(tabGeneral));

/* El nombre del checkout es opcional y vacío quiere decir "usá el de la marca".
   Un campo vacío no dice eso solo, así que la pantalla muestra siempre cuál va
   a quedar. */
chequear("se muestra qué nombre va a ver el comprador",
  /checkoutEfectivo/.test(tabGeneral));

/* Los IDs de medición se guardan MEZCLANDO adentro de `storeConfig`, que es un
   JSON con el diseño entero, los cobros y los envíos. Escribir el objeto desde
   esta pantalla —que no conoce el resto— lo borraría sin enterarse. */
chequear("los IDs de medición se mezclan, no pisan el storeConfig",
  /configNueva = actual\?\.storeConfig \?\? "\{\}"/.test(config) && /mergeAnalytics\(configNueva/.test(config));
chequear("y se validan con la misma regla que los inyecta",
  /from "@\/lib\/tracking-ids"/.test(config));

/* ⚠️ EL CANDADO DE LA TRANSFERENCIA.
 *
 * Free no puede prenderla, y el chequeo tiene que estar en el SERVIDOR: la
 * pantalla dibuja un candado, y un candado dibujado no frena a nadie que arme el
 * pedido a mano. Y no es una función recortada para empujar a pagar — Free no
 * cobra abono, así que lo único que deja es la comisión, y esa comisión se
 * retiene adentro del cobro de Mercado Pago. En una transferencia no pasa un
 * peso por la plataforma: un Free con transferencia prendida no paga nada por
 * nada. */
const pantallaPagos = soloCodigo(readFileSync("src/app/digitales/configuracion/TabPagos.tsx", "utf8"));

chequear("el candado de la transferencia está en el SERVIDOR",
  /TRANSFERENCIA_DIGITAL\[tier\]/.test(config) && /status: 409/.test(config));

/* Y el plan se lee de la BASE, no de lo que diga el navegador: si viniera en el
   pedido, cualquiera se declararía Pro. */
chequear("y el plan se lee de la base, no del pedido",
  /prisma\.subscription\.findUnique\([\s\S]{0,120}?userId: user\.id/.test(config));

chequear("los datos de transferencia se validan con la misma función que la pantalla",
  /validarTransferencia\(/.test(config) && /validarTransferencia\(/.test(pantallaConfig));

/* El CBU se guarda con números y nada más, aunque se haya pegado del homebanking
   con espacios o guiones. */
chequear("el CBU se guarda limpio", /soloDigitos\(t\.cbu\)/.test(config));

/* Se mezcla adentro de `paymentInfo` para no borrarle el efectivo a una tienda
   que sí lo usa: una cuenta digital no tiene por qué saber que existe. */
chequear("la transferencia se mezcla, no pisa el paymentInfo",
  /mergeTransferencia\(configNueva/.test(config));

/* ⚠️ Con Mercado Pago la entrega es automática; con transferencia NO — alguien
   tiene que mirar el banco y confirmar a mano. Quien la prende sin saberlo se
   entera cuando un comprador reclama que pagó y no recibió nada. */
chequear("se avisa que con transferencia la entrega deja de ser automática",
  /la entrega no es automática/.test(pantallaPagos));

/* ── 12 bis. El tema del panel ─────────────────────────────────────────────── */
console.log("\n12 bis) Claro y oscuro");

const tema = soloCodigo(readFileSync("src/lib/tema-digitales.ts", "utf8"));
const layoutDig = soloCodigo(readFileSync("src/app/digitales/layout.tsx", "utf8"));
const estilos = readFileSync("src/app/globals.css", "utf8");

/* ⚠️ Por qué una variante propia y no `dark:`. `next-themes` está en la raíz con
   `defaultTheme="dark"`, así que `<html>` lleva `.dark` casi siempre: un
   `dark:bg-gray-900` adentro del panel se aplicaría SIEMPRE y sin forma de
   apagarlo desde la pantalla de Apariencia. */
chequear("el panel tiene su propia variante, separada de la del sitio",
  /@custom-variant panel-oscuro/.test(estilos));

/* ⚠️ El parpadeo. Sin un script sincrónico, entrar en oscuro es un flash blanco
   de pantalla completa: el HTML llega claro, React hidrata, y recién ahí se lee
   la preferencia. Ningún efecto de React corre antes del primer dibujo. */
chequear("el tema se pinta con un script, antes del primer dibujo",
  /SCRIPT_TEMA/.test(layoutDig) && /dangerouslySetInnerHTML/.test(layoutDig));

/* Leer `localStorage` TIRA con el almacenamiento bloqueado. Sin el `try`, ese
   error corta el script y la página queda a medio pintar. */
chequear("y ese script no se cae aunque el almacenamiento esté bloqueado",
  /function\(\)\{try\{/.test(tema) && /catch\(e\)\{/.test(tema));

chequear("el tema sale de una lista, nunca de un valor por defecto",
  /TEMAS as readonly string\[\]\)\.includes/.test(tema));

/* `color-scheme` no es decorativo: es lo que hace que las barras de scroll y los
   desplegables salgan oscuros. Sin esto, adentro de un panel oscuro se abre un
   menú blanco.
   ⚠️ Y sale del CSS, colgado del mismo atributo, NO de JS: `next-themes` escribe
   el suyo en línea sobre `<html>` y en línea le gana a cualquier JS que corra
   antes. Escrito desde el script del tema, el panel en claro se veía con las
   barras y los desplegables oscuros — y se acomodaba recién al tocar un botón de
   Apariencia, que es justo lo que uno hace al probarlo. */
chequear("el color-scheme cuelga del atributo desde el CSS, con !important",
  /\[data-panel-tema="claro"\][^}]*color-scheme:\s*light\s*!important/.test(estilos) &&
  /\[data-panel-tema="oscuro"\][^}]*color-scheme:\s*dark\s*!important/.test(estilos));
chequear("y no hay una segunda copia escribiéndolo desde JS", !/style\.colorScheme/.test(tema));

/* Zona horaria se sacó: vendemos en Argentina, así que era un selector con una
   sola respuesta posible. */
/* Se busca la SECCIÓN, no la palabra: el comentario que explica por qué se sacó
   sigue en el archivo a propósito, y un chequeo que se tropiece con su propia
   explicación obliga a borrar la explicación para que pase. */
chequear("zona horaria ya no se dibuja", !/titulo="Zona horaria"/.test(tabGeneral));

/* Y Apariencia dejó de ser una sección apagada: ahora hace algo de verdad. */
chequear("Apariencia ya no está apagada",
  /titulo="Apariencia"/.test(tabGeneral) && /p\.setTema\(/.test(tabGeneral));

/* ── 13. La vuelta de Mercado Pago ─────────────────────────────────────────── */
console.log("\n13) A dónde vuelve quien conecta el cobro");

/* ⚠️ EL chequeo de esta sección. El callback redirige con NUESTRO dominio, que
   es exactamente lo que un atacante quiere para que un engaño se vea legítimo.
   Por eso el destino se traduce contra una lista fija en vez de guardarse la
   dirección entera: aunque la palabra llegara de otro lado, lo peor que puede
   pasar es caer en el destino por defecto. */
chequear("el destino sale de una lista fija, no de una dirección guardada",
  /const VUELTAS: Record<string, string>/.test(mpCallback) && /VUELTA_POR_DEFECTO/.test(mpCallback));
chequear("y la lista tiene los dos paneles",
  /tienda: "\/dashboard\/pagos"/.test(mpCallback) && /digital: "\/digitales\/configuracion"/.test(mpCallback));

/* El panel de origen sale del ROL y no de un parámetro: un destino que viaja en
   el pedido lo cambia cualquiera. */
chequear("de qué panel salió lo decide el rol, no el pedido",
  /user\.role === "DIGITAL" \? "digital" : "tienda"/.test(mpConnect));

/* Si algo falla, la persona tiene que volver al panel del que salió. Una cuenta
   digital que aterriza en /dashboard/pagos ve el panel que no le corresponde. */
chequear("hasta el error vuelve al panel correcto",
  (mpCallback.match(/\$\{destino\}\?mp=error/g) ?? []).length >= 2);

/* Una cuenta digital puede no tener su espacio creado todavía: se crea con el
   primer producto, y conectar el cobro antes de cargar nada es de lo más
   razonable que puede hacer alguien que recién entra. */
chequear("conectar el cobro funciona aunque todavía no haya ningún producto",
  /espacioDigital\(user\.id\)/.test(mpConnect));

/* ── 14. Moverse adentro del panel ─────────────────────────────────────────── */
console.log("\n14) Los enlaces de adentro del panel");

/* ⚠️ Un `<a href="/digitales/...">` recarga la aplicación entera para ir a una
   pantalla que ya está cargada. Se nota en tres cosas: el parpadeo blanco al
   pasar de una pantalla a otra —justo el que el script del tema existe para
   evitar—, la barra lateral que se vuelve a armar, y lo que quedó escrito y sin
   guardar en un formulario, que se pierde sin aviso.
   La regla es angosta a propósito: `<a>` a una ruta de `/api/` o a la web
   comercial está bien y hay casos con su comentario. Lo que no puede haber es un
   `<a>` a una pantalla DEL PANEL. */
function tsxDe(dir: string): string[] {
  const salida: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = `${dir}/${e.name}`;
    if (e.isDirectory()) salida.push(...tsxDe(ruta));
    else if (e.name.endsWith(".tsx")) salida.push(ruta);
  }
  return salida;
}

const conAnclaInterna = tsxDe("src/app/digitales").filter((f) => {
  const src = soloCodigo(readFileSync(f, "utf8"));
  /* Busca la apertura de un `<a` y, dentro de la misma etiqueta, un href al
     panel. `[^>]*` no cruza el `>` de cierre, así que no confunde un `<a>` de
     arriba con el href de otra etiqueta más abajo. */
  return /<a\s[^>]*href="\/digitales\//.test(src);
});
chequear(
  conAnclaInterna.length === 0
    ? "todas las pantallas del panel navegan con Link"
    : `hay <a> a pantallas del panel en: ${conAnclaInterna.join(", ")}`,
  conAnclaInterna.length === 0
);

/* ── Los dos botones de IA ─────────────────────────────────────────────────── */
console.log("\n15) La IA: uno anda, el otro todavía no");

/* ⚠️ El de armar el embudo YA ANDA (04/09/26) y vive en su propia ventana, no
   adentro del formulario de crear: la IA devuelve TRES fichas y ese formulario
   crea UNA. Metido ahí habría que decidir qué hacer con las otras dos mientras
   hay un formulario a medio llenar encima. */
chequear("armar el embudo con IA existe y tiene su propia ventana",
  existsSync("src/app/digitales/productos/EmbudoIA.tsx") &&
  /setEmbudoIA\(true\)/.test(pantallaProductos) &&
  !/te armo el embudo[\s\S]{0,200}Próximamente/.test(pantallaProductos));

/* Y va PRIMERO, con "a mano" al lado. Es el camino que resuelve la pantalla en
   blanco, que es el problema que la persona tiene cuando entra. */
chequear("la IA es el botón principal y cargar a mano queda al lado",
  pantallaProductos.indexOf("Armar con IA") < pantallaProductos.indexOf("A mano"));

/* ⚠️ EL chequeo de esta sección, y es un pasador. `IA_LISTA` prendido con la ruta
   de generación sin construir es una pantalla que promete escribir un ebook y no
   escribe nada. Prenderlo tiene que costar más que borrar una palabra: acá falla
   la prueba y dice por qué. */
const rutaIA = existsSync("src/app/api/digitales/ia");
chequear(
  rutaIA
    ? "la IA ya existe: `IA_LISTA` puede prenderse"
    : "`IA_LISTA` sigue apagado mientras no exista la ruta que genera",
  rutaIA || /const IA_LISTA = false;/.test(pantallaProductos)
);

/* Y que los botones dependan de esa palabra y no de un `disabled` suelto en cada
   uno, que es como se prende uno y se olvida el otro. */
chequear("el botón del ebook mira `IA_LISTA` para saber qué explicar",
  /IA_LISTA\s*\n?\s*\?/.test(pantallaProductos) || /IA_LISTA \?/.test(pantallaProductos));

/* Free no lo tiene por el PLAN y para siempre; si algún día se apaga
   `IA_LISTA`, el motivo es otro — que no anda todavía. Son dos motivos
   distintos y el cartel tiene que decir cuál es, o el que paga cree que le
   falta plan. Los dos textos tienen que seguir existiendo. */
chequear("el motivo de que esté apagado distingue el plan de la obra",
  /viene desde el plan Starter/.test(pantallaProductos) &&
  /Todavía no está listo/.test(pantallaProductos));

/* ── No perder el trabajo al salir, 03/09/26 ──────────────────────────────── */

/* ⚠️ Encontrado A MANO probando el panel botón por botón, y es la clase de
   agujero que ningún chequeo iba a encontrar solo: la guarda EXISTÍA.

   El editor avisaba con `beforeunload`, que salta cuando el navegador descarga
   la página de verdad —F5, cerrar la pestaña—. Pero irse a "Mi cuenta" desde la
   barra es un `<Link>` de Next: navega del lado del cliente y no descarga nada,
   así que el aviso no aparecía y el trabajo se perdía en silencio. La guarda no
   cubría la salida más usada de todas.

   El arreglo es el patrón que documenta Next 16 para el App Router: un contexto
   y un `<Link>` propio que pregunta en su `onNavigate`. */
/* `barra` y `layoutDig` ya están leídos más arriba en este mismo archivo. */
const salida = readFileSync("src/app/digitales/SalidaSinGuardar.tsx", "utf8");
const volver = readFileSync("src/app/digitales/BotonVolver.tsx", "utf8");
const editorPag = readFileSync("src/app/digitales/productos/[id]/pagina/EditorClient.tsx", "utf8");

chequear("el freno cancela la navegación de verdad",
  salida.includes("onNavigate") && salida.includes("e.preventDefault()"));

/* Si el proveedor no envolviera a los dos, la barra tendría su propio estado y
   nunca se enteraría de que la pantalla tiene algo que perder. */
chequear("el proveedor envuelve la barra Y la pantalla",
  layoutDig.indexOf("<ProveedorDeSalida>") < layoutDig.indexOf("<DigitalesSidebar") &&
  layoutDig.indexOf("{children}") < layoutDig.indexOf("</ProveedorDeSalida>"));

/* ⚠️ Éste es EL chequeo. Volver a `next/link` en cualquiera de los dos deja el
   agujero exactamente como estaba, sin romper nada y sin avisar. */
chequear("la barra y el botón de volver usan el Link del panel, no el de Next",
  barra.includes('LinkDelPanel as Link } from "./SalidaSinGuardar"') &&
  volver.includes('LinkDelPanel as Link } from "./SalidaSinGuardar"') &&
  !/^import Link from "next\/link";$/m.test(barra) &&
  !/^import Link from "next\/link";$/m.test(volver));

/* Los dos, y cada uno tapa una salida distinta. */
chequear("el editor avisa por las dos vías: descarga y Link",
  editorPag.includes("beforeunload") && editorPag.includes("setBloqueado(sucio)"));

/* Sin soltar el freno al desmontar, guardar y salir seguiría preguntando desde
   otra pantalla: el interruptor vive arriba y sobrevive al editor. */
chequear("y suelta el freno al salir del editor",
  editorPag.includes("return () => setBloqueado(false)"));

/* ── 16. El editor en pantalla chica ────────────────────────────────────────
 *
 * Es la única pantalla del panel donde hay que mostrar DOS cosas a la vez —el
 * formulario y la previa— y a 360 px entra una. Las solapas ya estaban; lo que
 * faltaba era que se pudieran usar sin volver arriba, y que guardar no
 * dependiera de scrollear hasta el techo.
 */
console.log("\n16) El editor en pantalla chica");

const barraDelEditor = editorPag.slice(
  editorPag.indexOf('className="sticky top-0'),
  editorPag.indexOf("{/* ── Estilo y contenido"),
);

/* ⚠️ Las solapas Y el guardar viajan juntos y pegados. Con el guardar quieto en
   el encabezado, había que subir varias pantallas para guardar — y el aviso de
   "tenés cambios sin guardar" esperando en la puerta convierte eso en trampa. */
chequear("las solapas y el guardar quedan pegados arriba en pantalla chica",
  barraDelEditor.includes("sticky top-0") &&
  barraDelEditor.includes("lg:hidden") &&
  barraDelEditor.includes("onClick={guardar}"));

/* Y no quedan dos botones de guardar a la vista: el del encabezado es sólo de
   escritorio. Dos botones que hacen lo mismo se leen como que uno hace otra. */
chequear("el guardar del encabezado desaparece en pantalla chica",
  /onClick=\{guardar\}[\s\S]{0,300}?hidden items-center[\s\S]{0,200}?lg:inline-flex/.test(editorPag));

/* ⚠️ El desplazamiento NO se escribe acá: el contenedor que scrollea ya tiene
   `pt-14` para dejarle lugar a la barra fija del celular, y lo pegado se cuenta
   desde donde arranca su contenido. Con `top-14` los 56 px se sumaban dos veces
   y la barra quedaba flotando, con contenido asomando entre ella y la barra del
   celular. Se veía como si no se pegara. */
chequear("el desplazamiento sale del `pt-14` del contenedor, no se suma de nuevo",
  !/sticky top-(?!0\b)/.test(barraDelEditor) && /pt-14/.test(layout));

/* ⚠️ Y la grilla declara su columna también en pantalla chica. Sin
   `grid-cols-1`, la única columna se dimensiona por el contenido más ancho que
   tenga adentro y arrastra a todo lo demás: a 360 los botones de cada sección
   quedaban afuera de la pantalla, cortados por el `overflow-x-hidden` del panel.
   `grid-cols-1` de Tailwind es `repeat(1, minmax(0, 1fr))` — mínimo cero. */
chequear("la grilla del editor no se estira con su contenido",
  /grid grid-cols-1 gap-6 lg:grid-cols-\[minmax\(0,420px\)_minmax\(0,1fr\)\]/.test(editorPag) &&
  (editorPag.match(/min-w-0 \$\{vista ===/g) ?? []).length === 2);

/* Las dos columnas se esconden con `display:none`, así que al cambiar de solapa
   el navegador recorta el scroll. Sin esto, la previa se abre por el medio y el
   formulario vuelve en cualquier lado menos donde se estaba escribiendo. */
chequear("cambiar de solapa no pierde dónde estabas",
  editorPag.includes("scrollDelFormulario") &&
  /contenedor\.scrollTop = vista === "previa" \? 0 : scrollDelFormulario\.current/.test(editorPag));

/* El ancla existe porque `scrollIntoView` sobre algo `sticky` usa la posición
   donde está pegado, o sea que no scrollea nada. */
chequear("el scroll se cuelga de un ancla y no de la barra pegada",
  /ref=\{ancla\}/.test(editorPag) && /ancla\.current\?\.closest\("main"\)/.test(editorPag));

/* ── La pantalla de Ventas ──────────────────────────────────────────────────
 *
 * Es la que contesta la única pregunta por la que alguien abre el panel todos
 * los días: ¿vendí? Y es la que muestra plata, así que lo que se cuida acá es
 * que los números digan la verdad.
 */
const ventasPag = soloCodigo(readFileSync("src/app/digitales/ventas/page.tsx", "utf8"));
const ventasCli = soloCodigo(readFileSync("src/app/digitales/ventas/VentasClient.tsx", "utf8"));

/* En el menú, y arriba: enterrada abajo obligaría a pasar por Configuración
   para llegar a lo que más se mira. */
chequear("Ventas está en el menú, antes de Configuración",
  barra.indexOf("/digitales/ventas") > barra.indexOf("/digitales/productos") &&
  barra.indexOf("/digitales/ventas") < barra.indexOf("/digitales/configuracion"));

/* ⚠️ LA COMISIÓN SALE DE LA ORDEN, NO DEL PLAN DE HOY. Alguien que vendió diez
   veces en Free al 8% y hoy está en Pro vería esas diez recalculadas al 2%:
   números que nunca existieron. */
chequear("la comisión de una venta vieja sale del porcentaje congelado en la orden",
  ventasPag.includes("comisionCongelada") &&
  ventasPag.includes("lockedCommissionRate") &&
  !ventasPag.includes("comisionDeLaVenta"));

/* Sólo las ventas de ESTA cuenta. Es una pantalla con sesión, pero la consulta
   tiene que estar anclada a su tienda igual: sin el `storeId`, un filtro mal
   armado muestra las ventas de todo el mundo. */
chequear("sólo se leen las ventas de la tienda de quien mira",
  /storeId: store\.id/.test(ventasPag) && ventasPag.includes('user.role !== "DIGITAL"'));

/* Todo lo que llega por la dirección se limpia: el estado sale de una lista
   nuestra, la búsqueda tiene tope de largo y la página es un entero sano. */
chequear("el filtro sólo puede ser uno de los nuestros, nunca texto crudo",
  ventasPag.includes("esFiltro(parametros.estado)") && ventasPag.includes("FILTROS[filtro]"));
chequear("la búsqueda entra recortada y la página es un entero sano",
  /slice\(0, 120\)/.test(ventasPag) && /Number\.isFinite\(pedida\)/.test(ventasPag));

/* La fecha se arma en el servidor y con la zona escrita. Formateada en el
   navegador, el mismo texto sale distinto en el servidor (que corre en UTC) y en
   la máquina de quien mira: React avisa de la hidratación y una venta de las
   22:30 aparece con la fecha del día siguiente. */
chequear("las fechas se formatean en el servidor y con la zona de Argentina",
  ventasPag.includes("America/Argentina/Buenos_Aires") && !ventasCli.includes("DateTimeFormat"));

/* ⚠️ No se inventa un estado de descarga donde no hay permiso: una línea sin
   archivo no puede decir "0 de 5", porque eso afirma que hay algo esperando. */
chequear("una línea sin permiso no muestra un contador inventado",
  ventasCli.includes("l.bajadas === null"));

/* ══════════════════════════════════════════════════════════════════════════
   NINGUNA LISTA SIN TECHO
   ══════════════════════════════════════════════════════════════════════════

   Un `findMany` sin `take` anda perfecto con veinte filas y se cae con veinte
   mil, sin avisar y en producción. Y no hace falta que sea a propósito: la
   pantalla nueva se copia de una vieja y el límite no viaja en la copia.

   Esto recorre TODO el ecosistema —el panel, sus rutas y las pantallas
   públicas— y exige que cada `findMany` tenga `take` cerca. `take` puede ser
   una página (Ventas), un techo calculado (Productos) o un tope de barrido; lo
   que no puede es no estar.

   Se busca en las 25 líneas siguientes porque entre el `findMany` y el `take`
   suele haber un `where` largo y un comentario que explica por qué. */
function archivosDeCodigo(raiz: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
    const camino = `${raiz}/${entrada.name}`;
    if (entrada.isDirectory()) salida.push(...archivosDeCodigo(camino));
    else if (/\.tsx?$/.test(entrada.name)) salida.push(camino);
  }
  return salida;
}

const dondeSeLeenFilas = [
  "src/app/digitales",
  "src/app/api/digitales",
  "src/app/p",
].flatMap(archivosDeCodigo);

const listasSinTecho: string[] = [];
for (const archivo of dondeSeLeenFilas) {
  const fuente = readFileSync(archivo, "utf8");
  const lineas = fuente.split("\n");
  lineas.forEach((linea, i) => {
    if (!linea.includes("findMany(")) return;
    const alcance = lineas.slice(i, i + 25).join("\n");
    if (!/\btake:/.test(alcance)) listasSinTecho.push(`${archivo}:${i + 1}`);
  });
}

chequear("ninguna consulta de lista sale sin techo", listasSinTecho.length === 0, listasSinTecho);

/* Y la única que crece para siempre —las ventas— pagina de verdad: `skip` y
   `take` van juntos. Con `take` solo, la página 2 muestra la 1. */
chequear("Ventas pagina en el servidor, no sólo recorta",
  /skip: \(pagina - 1\) \* POR_PAGINA/.test(ventasPag) && /take: POR_PAGINA/.test(ventasPag));

/* ══════════════════════════════════════════════════════════════════════════
   17. CADA TIPO DE CUENTA LEE SU PROPIO DOCUMENTO
   ══════════════════════════════════════════════════════════════════════════

   El bug que esto existe para que no vuelva: el registro armaba el link a los
   términos con una cadena de tres condiciones —seller, owner, y todo lo demás a
   "buyer"— escrita cuando los tipos de cuenta eran tres. Al aparecer el cuarto,
   `digital` caía en ese último "buyer", así que quien se registraba en Productos
   Digitales aceptaba los términos del CLIENTE: el documento de alguien que
   compra en una tienda, y encima el que promete 10 días de arrepentimiento.

   No fallaba nada. No había error. Sólo se firmaba el papel equivocado.
*/
console.log("\n17) Cada tipo de cuenta lee su propio documento");

const registroPag = readFileSync("src/app/(auth)/registro/page.tsx", "utf8");
const terminosPag = readFileSync("src/app/terminos/page.tsx", "utf8");
const privacidadPag = readFileSync("src/app/privacidad/page.tsx", "utf8");

/* ⚠️ EL CHEQUEO QUE LO HABRÍA AGARRADO. Saca los tipos de cuenta de su propia
   declaración y exige que los dos documentos tengan solapa para cada uno. El día
   que aparezca un quinto ecosistema, esto falla antes de que nadie firme nada. */
const tiposDeCuenta = (registroPag.match(/type AccountType = ([^;]+);/)?.[1] ?? "")
  .split("|").map((t) => t.trim().replace(/"/g, "")).filter(Boolean);

chequear("se pudieron leer los tipos de cuenta", tiposDeCuenta.length >= 4, tiposDeCuenta);
for (const tipo of tiposDeCuenta) {
  chequear(`"${tipo}" tiene su solapa en términos y en privacidad`,
    new RegExp(`^  ${tipo}: \\{`, "m").test(terminosPag) &&
    new RegExp(`^  ${tipo}: \\{`, "m").test(privacidadPag));
}

/* Y el rol viaja ENTERO a los dos documentos, sin traducirse en el camino. Un
   `else` que elige un documento legal envejece mal: no se rompe, se equivoca.
   `rolValido` del otro lado ya descarta cualquier rol que no exista. */
chequear("el registro manda el rol entero, sin traducirlo",
  /href=\{`\/terminos\?role=\$\{accountType\}`\}/.test(registroPag) &&
  /href=\{`\/privacidad\?role=\$\{accountType\}`\}/.test(registroPag));

/* Los números que el texto promete salen de las constantes que los aplican.
   Escritos a mano, los términos prometen un plazo y el sistema aplica otro — y
   en un reclamo vale lo que dice el papel. */
chequear("los plazos y la comisión de los términos salen de las constantes",
  /DIAS_DEL_PERMISO/.test(terminosPag) && /MAX_DESCARGAS/.test(terminosPag) &&
  /COMISION_DIGITAL\.FREE/.test(terminosPag));

/* ⚠️ Las dos IPs que este ecosistema guarda y ningún otro. Están en los términos
   desde que existen; el agujero fue que faltaran en la política de privacidad,
   que es el documento donde la Ley 25.326 exige declararlas. */
const digitalPriv = privacidadPag.slice(
  privacidadPag.indexOf("  digital: {"),
  privacidadPag.indexOf("  buyer: {"),
);
chequear("privacidad declara la IP del consentimiento y la de cada descarga",
  /1116/.test(digitalPriv) && (digitalPriv.match(/dirección IP/g) ?? []).length >= 2 &&
  /Ley 25\.326/.test(digitalPriv));

/* Y quien COMPRA un producto digital también tiene que poder leerlo: nunca se
   registra, así que jamás eligió una solapa, pero es su dato el que se guarda. */
chequear("y la solapa de Cliente también lo dice, para quien compra",
  /producto digital/i.test(privacidadPag.slice(privacidadPag.indexOf("  buyer: {"))));

/* ⚠️ Las CINCO solapas dicen que los datos salen del país. Estaba escrito en una
   sola —la de Dueño de tienda— y es un hecho de la plataforma entera: la base
   corre en `aws-1-us-east-2` y el hosting también. Lo exige el art. 12 de la Ley
   25.326, y quien vende afiliado, quien compra y quien dona no lo leían. */
chequear("las cinco solapas avisan que los datos salen del país",
  (privacidadPag.match(/^\s+TRANSFERENCIA_INTERNACIONAL,$/gm) ?? []).length === tiposDeCuenta.length + 1);

/* ══════════════════════════════════════════════════════════════════════════
   ⚠️ LA IA NO SE PUEDE PRENDER SIN DECLARARLA
   ══════════════════════════════════════════════════════════════════════════

   Los planes digitales VENDEN funciones con IA —"Página de venta armada con IA"
   en los tres, "Sasha, la asistente" en los pagos— y hoy la solapa digital de la
   política de privacidad no nombra a ningún proveedor de modelos. Está bien
   mientras `IA_LISTA` esté apagado: no se procesa nada, así que no hay nada que
   declarar.

   El día que se prenda, el texto de la página de venta de alguien sale hacia un
   tercero, y eso hay que decirlo ANTES —no después—. Anthropic ya está declarado
   en la solapa de Dueño de tienda, por Sasha; falta el equivalente acá.

   Este chequeo es el recordatorio: se pone en rojo solo en el mismo commit que
   encienda la IA. */
chequear("si la IA está encendida, la solapa digital declara quién procesa",
  !/const IA_LISTA = true/.test(pantallaProductos) ||
  /Anthropic/.test(privacidadPag.slice(
    privacidadPag.indexOf("  digital: {"), privacidadPag.indexOf("  buyer: {"))));

/* ── Las cinco secciones que salieron de comparar temarios ──────────────────
 *
 * Ninguna estaba, y las cinco tapan un hueco distinto. Se chequea que no
 * desaparezcan, que es la forma en que un documento legal se rompe: nadie lo
 * borra a propósito, se pierde en una reescritura.
 */
const digitalTerm = terminosPag.slice(
  terminosPag.indexOf("  digital: {"), terminosPag.indexOf("  buyer: {"));

/* ⚠️ La más importante: qué somos en la venta. El art. 40 hace solidariamente
   responsable a toda la cadena, y no había una línea sobre el tema. */
chequear("los términos digitales dicen qué es la plataforma en la venta",
  /2 bis\. Qué somos en tu venta/.test(digitalTerm) && /art\. 40/.test(digitalTerm));

/* ⚠️ Y dicen en voz alta que NO recortan derechos. Una cláusula que se presenta
   como escudo del art. 40 —que es de orden público— es una cláusula abusiva; la
   misma cláusula que admite su propio límite, no. */
chequear("y aclaran que eso no le quita derechos a quien compra",
  /orden público/.test(digitalTerm));

/* El permiso para alojar y entregar el archivo. Sin esto guardábamos el PDF de
   alguien y se lo mandábamos a terceros sin autorización escrita. */
chequear("hay licencia para alojar y entregar el archivo, y sigue siendo suyo",
  /4 bis\. Tu contenido sigue siendo tuyo/.test(digitalTerm));

chequear("los impuestos del vendedor están escritos", /3 bis\. Los impuestos/.test(digitalTerm));
chequear("la IA reparte responsabilidades antes de existir", /4 ter\./.test(digitalTerm));

/* Y lo que más importa de la baja: no puede dejar sin su compra a quien pagó. */
chequear("una baja de cuenta no toca los permisos ya vendidos",
  /8 bis\. Cuándo podemos suspender/.test(digitalTerm) &&
  /permisos de descarga vigentes se respetan/.test(digitalTerm));

/* ══════════════════════════════════════════════════════════════════════════
   18. CADA VENDEDOR PUBLICA SUS PROPIOS DOCUMENTOS
   ══════════════════════════════════════════════════════════════════════════

   El agujero que esto existe para que no vuelva: el pie de cada página de venta
   linkeaba a `/terminos` y `/privacidad` —los de TiendaApps— así que quien
   compraba un ebook leía NUESTROS documentos creyendo que eran los de quien se
   lo vendía. Y contradecía de frente lo que esos mismos términos dicen. En una
   denuncia gana lo que el comprador vio, no lo que el contrato afirma.
*/
console.log("\n18) Cada vendedor publica sus propios documentos");

const dibujante = readFileSync("src/components/digitales/PaginaDeVenta.tsx", "utf8");
const legalesPub = readFileSync("src/app/p/[id]/legales/page.tsx", "utf8");
const tabLegales = readFileSync("src/app/digitales/configuracion/TabLegales.tsx", "utf8");
const rutaConfig = soloCodigo(readFileSync("src/app/api/digitales/configuracion/route.ts", "utf8"));

/* ⚠️ EL CHEQUEO QUE IMPORTA. El pie no puede volver a mandar a los documentos de
   la plataforma como si fueran los de quien vende. */
const pieDeLaPagina = dibujante.slice(dibujante.indexOf('case "pie":'));
chequear("el pie manda a los documentos de quien vende, no a los nuestros",
  /href=\{`\/p\/\$\{producto\.id\}\/legales/.test(pieDeLaPagina) &&
  !/href="\/terminos"/.test(pieDeLaPagina) &&
  !/href="\/privacidad"/.test(pieDeLaPagina));

/* Y el arrepentimiento sigue estando: es la Resolución 424/2020, no una
   preferencia. Lo que cambió es por dónde entra, no si existe. */
chequear("el botón de arrepentimiento sigue en el pie",
  /tipo=arrepentimiento/.test(pieDeLaPagina));

chequear("la página legal del producto existe",
  existsSync("src/app/p/[id]/legales/page.tsx"));

/* Dice de quién son, arriba de todo. Es la línea que evita que alguien crea que
   está leyendo los de la plataforma. */
chequear("dice de quién son los documentos que se están leyendo",
  /quien te vende este producto/.test(legalesPub));

/* Y los nuestros siguen estando, pero abajo y etiquetados: existen, no rigen
   esa venta, y hasta hoy eran los únicos que la página mostraba. */
chequear("los de la plataforma quedan aparte y nombrados como tales",
  /De la plataforma/.test(legalesPub) && /no reemplazan a las de quien te vende/.test(legalesPub));

/* Tres y no cuatro: no hay envíos que declarar en un archivo que se descarga. */
chequear("son tres documentos, sin envíos",
  /CLAVES_DIGITALES = \["devoluciones", "terminos", "privacidad"\]/.test(
    readFileSync("src/lib/politicas-tienda.ts", "utf8")));

/* La pantalla para escribirlas, y que no guarde con su propia regla: el mismo
   limpiador que tiendas, importado y no copiado. */
chequear("hay dónde escribirlas y se guardan con el limpiador compartido",
  existsSync("src/app/digitales/configuracion/TabLegales.tsx") &&
  /limpiarTextoLegal\(/.test(rutaConfig) && /CAMPOS_DE_POLITICA/.test(rutaConfig));

/* La bandera de visible llega del navegador: `"false"` es verdadero en
   JavaScript, así que apagar una política tiene que comparar contra `true`. */
chequear("apagar una política compara contra `true` exacto",
  /visible === true/.test(rutaConfig));

/* ⚠️ La fecha de "última actualización" sólo se toca si de verdad vino una
   política. Sin la condición, guardar el nombre de la marca haría figurar que
   los términos cambiaron ese día — una afirmación sobre un documento legal. */
chequear("la fecha de actualización no se mueve por guardar otra cosa",
  /Object\.keys\(politicasLimpias\)\.length > 0 \? \{ policiesUpdatedAt/.test(rutaConfig));

/* El ejemplo se puede copiar, pero hay que guardarlo a mano y se avisa que
   obliga: un documento legal copiado sin leer promete lo que no se va a
   cumplir, y quien responde es quien vende. */
chequear("el ejemplo se ofrece como borrador, no como documento listo",
  /borrador para editar, no un documento listo/.test(tabLegales));

/* Un cambio de documento sin subir la versión es un cambio que nadie re-acepta:
   el banner mira este número. Estuvo clavado en 1.2 mientras el texto cambió
   seis veces — está contado en el propio archivo. */
const legal = readFileSync("src/lib/legal.ts", "utf8");

/* ⚠️ NO se clava un número. Antes decía `= "1.7"` y `1.7 (03/09/2026)`, o sea que
   el chequeo se ponía en rojo con CUALQUIER cambio de versión posterior —incluso
   uno bien hecho— y lo único que enseñaba era a venir acá a corregir el número.
   Un chequeo que hay que apagar para avanzar deja de leerse.

   Lo que sí importa es que la versión vigente TENGA SU ENTRADA en el registro de
   cambios del mismo archivo: subir el número sin contar qué cambió deja saliendo
   un mail que describe la versión anterior, y es el mail que avisa un cambio de
   contrato. */
const versionVigente = /CURRENT_TERMS_VERSION = "([\d.]+)"/.exec(legal)?.[1] ?? "";
chequear("la versión vigente de los términos tiene su entrada en el registro",
  versionVigente.length > 0 &&
  new RegExp(`^//\\s*${versionVigente.replace(/\./g, "\\.")} \\(\\d{2}/\\d{2}/\\d{4}\\)`, "m").test(legal));

/* Y el resumen para el mail vive pegado a la versión: si se sube el número y no
   se toca esto, el aviso sale contando los cambios de la versión de antes. */
chequear("el resumen del mail de cambio de términos no quedó vacío",
  /CURRENT_TERMS_SUMMARY: string\[\] = \[\s*"/.test(legal));

/* ══════════════════════════════════════════════════════════════════════════
   19. EL DETALLE DE UNA VENTA — la carpeta que se abre cuando alguien reclama
   ══════════════════════════════════════════════════════════════════════════

   El sistema venía guardando dos pruebas —la casilla del art. 1116 con su fecha,
   su IP y el texto exacto que esa persona leyó, y una fila por descarga— y no
   había ninguna pantalla que las mostrara. Una prueba que no se puede mostrar no
   sirve para nada.

   Lo que se cuida acá es, en este orden: que no se filtre la venta de otro, que
   no se muestre el token, y que lo que se muestre como prueba sea lo guardado y
   no una constante de hoy. */
const detalleCrudo = readFileSync("src/app/digitales/ventas/[orden]/page.tsx", "utf8");
const detalle = soloCodigo(detalleCrudo);
const botonReenviar = soloCodigo(readFileSync("src/app/digitales/ventas/BotonReenviar.tsx", "utf8"));

/* ⚠️ LO MÁS IMPORTANTE DE ESTA PANTALLA. El `storeId` va DENTRO del `where`, no
   en un `if` después de leer: es la única línea que separa el detalle propio de
   "poné el id de la venta de otro y mirale el correo del comprador". Buscando con
   los dos, una venta ajena directamente no existe. */
chequear("el detalle busca la venta con el storeId adentro del where",
  /findFirst\(\{\s*where: \{ id: ordenId, storeId: store\.id \}/.test(detalle) &&
  detalle.includes('user.role !== "DIGITAL"'));

/* Y lo que llega por la dirección se valida antes de tocar la base, con el mismo
   filtro que la ruta de reenviar. */
chequear("el id de la venta se valida antes de consultar",
  /ID_RE\.test\(ordenId\)/.test(detalle) && detalle.indexOf("ID_RE.test") < detalle.indexOf("findFirst"));

/* ⚠️ El token de descarga NO se muestra. Quien vende no lo necesita —para ayudar
   está "Reenviar el mail", que va al correo de la venta— y a la vista en el panel
   es un archivo que se reparte por fuera del tope, con la cara de quien vendió. */
chequear("el detalle no trae ni muestra el token de descarga",
  !/\btoken\b/.test(detalle));

/* La prueba es lo GUARDADO, no el texto de hoy. Si esto leyera la constante,
   una venta de hace seis meses mostraría una frase que su comprador nunca vio —
   que es exactamente lo contrario de una prueba. */
chequear("se muestra el texto del consentimiento guardado en la orden, no la constante",
  detalle.includes("orden.digitalConsentTexto") &&
  !detalle.includes("TEXTO_CONSENTIMIENTO"));

/* El registro de descargas es la otra mitad de la prueba, y va con techo: hoy el
   tope real es 5, pero una lista sin `take` es una pantalla de mil renglones el
   día que ese número cambie. */
chequear("el registro de descargas se lee con tope",
  /registros: \{[\s\S]{0,120}take: TOPE_REGISTROS/.test(detalle));

/* Las fechas de la prueba, con la zona escrita a mano. Acá pesa el doble que en
   la lista: una descarga de las 22:30 fechada al día siguiente en un reclamo es
   una prueba que juega en contra. */
chequear("las fechas del detalle llevan la zona de Argentina",
  detalle.includes("America/Argentina/Buenos_Aires") &&
  /second: "2-digit"/.test(detalle));

/* ⚠️ El botón de reenviar es UNO solo. Copiado en la lista y en el detalle, el
   día que cambie el aviso cambia en uno de los dos — y el freno del doble click
   se copia mal en el otro. */
chequear("reenviar el mail es un solo botón compartido",
  existsSync("src/app/digitales/ventas/BotonReenviar.tsx") &&
  ventasCli.includes("BotonReenviar") && detalle.includes("BotonReenviar") &&
  !ventasCli.includes("/reenviar"));

/* Y el freno sigue siendo un `ref`: dos clics seguidos leen el mismo `false` de
   un `useState` antes de que React vuelva a dibujar, y salen los dos mails. */
chequear("el botón compartido frena el doble click con un ref",
  /useRef\(false\)/.test(botonReenviar) && /if \(enVuelo\.current\) return/.test(botonReenviar));

/* ⚠️ El navegador no se inventa. Si la cadena no se reconoce se muestra cruda:
   escribir "Chrome" donde no se sabe es fabricar prueba. Y el orden de las
   preguntas importa —Edge y Opera también dicen "Chrome", y Chrome dice
   "Safari"—, así que al revés todo termina siendo Chrome. */
chequear("un navegador desconocido se muestra crudo, no adivinado",
  /if \(!cual && !donde\) return \{ corto: ua\.slice\(0, 60\), crudo: ua \}/.test(detalle));
chequear("Edge y Opera se preguntan antes que Chrome, y Chrome antes que Safari",
  detalle.indexOf('"Edge"') < detalle.indexOf('"Chrome"') &&
  detalle.indexOf('"Opera"') < detalle.indexOf('"Chrome"') &&
  detalle.indexOf('"Chrome"') < detalle.indexOf('"Safari"'));

/* Una cancelada y una devuelta se ven igual en `status` —las dos dicen
   CANCELLED—, así que la devolución se reconoce por el pago y por la marca que
   dejó el webhook. Sin esto, una devolución se muestra como "nadie la pagó". */
chequear("una venta devuelta se distingue de una que nadie pagó",
  /payment\?\.status === "REFUNDED"/.test(detalle) &&
  detalle.includes("digital_contracargo"));

/* La promesa que se escribió antes de cobrar el primer peso, dicha en el único
   lugar donde se vuelve real. */
chequear("cuando hay devolución, el detalle dice que la comisión se devuelve entera",
  /Nuestra comisión se devuelve entera/.test(detalleCrudo));

/* Y el porcentaje que se muestra es el de la orden. Sin decirlo, alguien que pasó
   de Free a Pro ve un descuento que no coincide con su plan de hoy y cree que le
   cobramos de más. */
chequear("el detalle descuenta con el porcentaje congelado y lo dice",
  detalle.includes("comisionCongelada") && /de tu plan de ese día/.test(detalleCrudo));

/* Los mails de entrega, que son la otra pregunta que nadie podía contestar:
   ¿salió? Con tope, porque el botón permite 3 por día y una venta vieja y muy
   reclamada junta filas. */
chequear("el detalle muestra los mails de entrega, con tope",
  /enviosDigitales: \{[\s\S]{0,120}take: TOPE_ENVIOS/.test(detalle));

/* ⚠️ Sin filas NO se afirma que el mail no salió: la venta es anterior al
   registro y lo único cierto es que no sabemos. Inventar un problema en una
   venta que anduvo bien manda a quien vende a molestar a un cliente contento. */
chequear("sin filas de envío no se afirma que el mail no salió",
  /nuncaSalio = orden\.enviosDigitales\.length > 0/.test(detalle));

/* Y cuando de verdad pasó —alguien pagó y no recibió nada— se avisa ARRIBA DE
   TODO. Es lo único de esta pantalla que no puede esperar a que se scrollee. */
chequear("si el mail nunca salió, el aviso va arriba de todo y con role=alert",
  detalle.indexOf("cobrada && nuncaSalio") < detalle.indexOf("Encabezado") &&
  /role="alert"/.test(detalle));

/* Se llega desde la lista, y desde TODAS las filas: una cancelada es justo la
   que hay que poder abrir para ver por qué. */
chequear("desde la lista se entra al detalle de cualquier venta",
  /href=\{`\/digitales\/ventas\/\$\{v\.id\}`\}/.test(ventasCli) &&
  !/estado === "COBRADA" &&[\s\S]{0,80}Ver el detalle/.test(ventasCli));

/* ── No se ofrece mejorar cuando no hay a dónde (08/09/26) ─────────────────
 *
 * ⚠️ Quien paga el plan MÁS CARO leía "Llegaste al tope de tu plan →" con un
 * enlace a Mi cuenta. No hay nada mejor que Pro: primero le hace pensar que le
 * falta algo, y después le hace perder el viaje para descubrir que ya lo tiene.
 * Encontrado mirando el panel el 08/09/26.
 *
 * Y `esElPlanMasAlto` sale del ÚLTIMO de `TIERS_DIGITALES`, no de la palabra
 * "PRO": escrito a mano, el día del cuarto plan esto le escondería la mejora
 * justo a quien la puede pagar. */
chequear("`esElPlanMasAlto` es cierto sólo para el último de la lista, y sale de la lista",
  esElPlanMasAlto(TIERS_DIGITALES[TIERS_DIGITALES.length - 1]) &&
  TIERS_DIGITALES.slice(0, -1).every((t) => !esElPlanMasAlto(t)) &&
  !/["']PRO["']/.test(
    (readFileSync("src/lib/planes-digitales.ts", "utf8")
      .match(/export function esElPlanMasAlto[\s\S]*?\n\}/) ?? [""])[0],
  ));

/* Los DOS carteles del tope —el de las páginas de venta y el de cada grupo de
   bonos y upsells— tienen que preguntar. Uno solo arreglado deja el otro
   empujando, y el de los bonos es el que más se ve. */
chequear("en el plan más alto, los dos carteles del tope informan en vez de ofrecer mejorar",
  (pantallaProductos.match(/esElPlanMasAlto\(/g) ?? []).length >= 2);

/* ── Subir el archivo se tiene que poder con el teclado (08/09/26) ─────────
 *
 * ⚠️ El `<input type="file">` estaba con `class="hidden"`, o sea `display:none`.
 * Un elemento así **no recibe foco**, y el `<label>` que lo envuelve tampoco
 * está en el orden de tabulación: **con teclado, "Subir PDF" era inalcanzable**.
 * Y subir el archivo es el paso obligatorio para poder vender — el único que en
 * el plan Free no tiene otro camino.
 *
 * `sr-only` lo saca de la vista y lo deja enfocable. El `focus-within` del label
 * es la otra mitad: sin él se tabula a un botón que no se ve, que en la práctica
 * es lo mismo que no poder llegar.
 *
 * Quien navega con teclado no manda reportes de error: se va. Por eso esto se
 * prueba en vez de confiar en que alguien lo mire. */
chequear("el input de archivo se puede alcanzar con el teclado, y el foco se ve",
  /type="file"[\s\S]{0,200}className="sr-only"/.test(pantallaProductos) &&
  !/type="file"[\s\S]{0,200}className="hidden"/.test(pantallaProductos) &&
  /focus-within:ring/.test(pantallaProductos));

/* Y el motivo por el que "Publicar" está apagado tiene que llegar sin depender
   del `title`, que en un celular no existe. */
chequear("el motivo por el que no se puede publicar está atado al botón",
  /aria-describedby=\{!p\.publicado && falta \?/.test(pantallaProductos));

/* ── El fondo del sitio no se ve por detrás del panel (08/09/26) ───────────
 *
 * El sitio arranca en tema oscuro, así que el `<body>` está pintado de
 * `#0f172a`. El panel es una caja clara apoyada encima: en cuanto no llega a
 * cubrir el alto de la ventana, aparece una franja azul oscuro abajo. Visto en
 * pantalla, no leyendo el código.
 *
 * ⚠️ Se cuida que la regla exista Y que esté atada a `data-panel-tema`, que es
 * el atributo que el panel borra al salir. Con una clase propia, o suelta en el
 * `body`, se le escaparía al sitio público. */
{
  const estilosGlobales = readFileSync("src/app/globals.css", "utf8");
  chequear("el fondo del body acompaña al panel, y sólo mientras se está adentro",
    /html\[data-panel-tema="claro"\]\s+body\s*\{[^}]*background/.test(estilosGlobales) &&
    /html\[data-panel-tema="oscuro"\]\s+body\s*\{[^}]*background/.test(estilosGlobales));

  /* ⚠️ Y el documento no scrollea adentro del panel. El diseño es caja fija con
     el scroll en el `<main>`; si el `<body>` puede scrollear, el armazón se va
     para arriba y abajo queda el fondo. La regla tiene que estar atada a
     `data-panel-tema`: suelta, dejaría el SITIO PÚBLICO sin poder scrollear,
     que es muchísimo peor que la franja que arregla. */
  const bloqueDelPanel = estilosGlobales.slice(
    estilosGlobales.indexOf("html[data-panel-tema],"),
    estilosGlobales.indexOf("html[data-panel-tema],") + 200);
  const noScrollea = /html\[data-panel-tema\],\s*html\[data-panel-tema\] body\s*\{[^}]*overflow:\s*hidden/.test(estilosGlobales);
  chequear("adentro del panel el documento no scrollea, y la regla no se escapa al sitio público",
    noScrollea && !/^html,\s*body\s*\{[^}]*overflow:\s*hidden/m.test(estilosGlobales));

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ Y TIENE QUE SER `clip`, NO ALCANZA CON `hidden`.
     ══════════════════════════════════════════════════════════════════════════

     `hidden` apaga la BARRA, no el scroll: la caja sigue siendo un contenedor
     scrolleable y el navegador la mueve solo —al enfocar algo, al reacomodar la
     página, al compensar un salto—. Con `hidden` la franja volvió PEOR que
     antes: el documento se iba igual, pero ya sin barra para volver.

     `clip` es la que dice lo que hay que decir: la caja no es un contenedor
     scrolleable y su `scrollTop` no se puede mover ni desde JavaScript.

     Se pide que estén las dos, y en ese orden: `hidden` primero de respaldo
     para un navegador que no entienda `clip`, `clip` después para ganarle. */
  chequear("y el documento se recorta con `clip`, que es lo único que apaga el scroll de verdad",
    /overflow:\s*hidden\s*;\s*overflow:\s*clip\s*;/.test(bloqueDelPanel));

  /* ══════════════════════════════════════════════════════════════════════════
     CADA BOTÓN DE "AGREGAR" NOMBRA LO QUE CREA
     ══════════════════════════════════════════════════════════════════════════

     Los mismos dos botones existen TRES veces en esta pantalla —arriba para el
     producto, y en el encabezado de bonos y de upsells— y decían lo mismo en los
     tres lados: "Con IA" y "A mano". Eso dice el MÉTODO y no la cosa: se lee el
     botón y no se sabe qué va a aparecer.

     Con lector de pantalla era peor: se escuchaba "A mano" tres veces sin forma
     de saber cuál era cuál, porque el título del grupo que da el contexto está
     en otro elemento.

     ⚠️ Y el de arriba HACE MÁS DE LO QUE PARECE: no crea un producto, crea los
     tres —producto, bono y upsell— de una sola vez. Por eso lleva "todo" en el
     nombre y un renglón que lo dice; sin eso, alguien aprieta esperando una
     tarjeta y le aparecen tres.

     Se pide la FORMA de cada uno, en positivo. En negativo —"que no diga 'A
     mano' suelto"— chocaría con este mismo comentario, que las nombra para
     explicarlas. Tercera vez que pasa en este archivo. */
  chequear("los botones de los grupos dicen qué crean, no sólo cómo",
    /\{COPY_ROL\[rol\]\.corto\} con IA/.test(pantallaProductos) &&
    /\{COPY_ROL\[rol\]\.corto\} a mano/.test(pantallaProductos));

  chequear("y el de arriba avisa que la IA crea los tres de una",
    /Armar todo con IA/.test(pantallaProductos) &&
    /Producto nuevo/.test(pantallaProductos) &&
    /producto, bono y upsell/.test(pantallaProductos));

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ TODO `<label>` QUE ENVUELVA UN INPUT `sr-only` VA `relative`.
     ══════════════════════════════════════════════════════════════════════════

     Ésta fue la causa de la franja, después de tres arreglos que le erraron.

     `sr-only` incluye `position: absolute`. Un absoluto se ubica contra el
     ancestro posicionado más cercano, y **si no hay ninguno, contra el documento
     entero**. Sin `relative` en el label, el input escondido quedaba colgado del
     documento: no se movía con el scroll del `<main>`, y su posición —la de la
     última tarjeta de una lista larga— caía miles de píxeles debajo de la
     ventana. Eso le daba al documento un sobrante para scrollear que no debería
     existir, y al apretar el botón —que le da el foco al input— el navegador
     movía la página entera para "mostrarlo".

     Por eso pasaba sólo abajo de todo: cuanto más abajo la tarjeta, más lejos
     caía su input. En la primera no se notaba.

     Se revisan los CUATRO archivos del panel que esconden un input así. Es el
     precio de haber elegido `sr-only` sobre `hidden` por accesibilidad: la otra
     mitad del arreglo es esta línea, y falta sin hacer ruido. */
  const conInputEscondido = [
    "src/app/digitales/productos/ProductosClient.tsx",
    "src/app/digitales/configuracion/TabGeneral.tsx",
    "src/app/digitales/productos/[id]/pagina/EditorClient.tsx",
  ];
  for (const archivo of conInputEscondido) {
    const src = readFileSync(archivo, "utf8");
    let bien = true;
    let visto = 0;
    /* Por cada input escondido, el `<label ...>` que lo abre más cerca hacia
       atrás. Es el que lo contiene: estos inputs viven pegados a su label. */
    for (const m of src.matchAll(/className=(?:"|\{`)sr-only/g)) {
      const antes = src.slice(0, m.index);
      /* ⚠️ `<label` SEGUIDO DE ESPACIO, no `<label` a secas. Los comentarios de
         estos labels explican el arreglo, y para explicarlo escriben `<label>`
         en prosa: buscando `<label` pelado, la etiqueta "más cercana" resultaba
         ser una palabra adentro de un comentario y el chequeo fallaba con el
         código bien puesto. Una etiqueta de verdad siempre trae atributos.

         (El primer intento fue borrar los comentarios antes de mirar, y salió
         peor: un `/*` suelto adentro del archivo se llevó puesto 5.000
         caracteres de código junto con ellos.) */
      const abre = antes.search(/<label\s(?![\s\S]*<label\s)/);
      if (abre === -1) continue;
      /* Sólo los que envuelven un input de archivo: `PrimerosPasos` usa
         `sr-only` en un `<span>` de texto, que no se enfoca ni se posiciona. */
      const cuerpo = src.slice(abre, m.index);
      if (!/type="file"/.test(cuerpo)) continue;
      visto++;
      const etiqueta = src.slice(abre, src.indexOf(">", abre));
      if (!/\brelative\b/.test(etiqueta)) bien = false;
    }
    chequear(`en ${archivo.split("/").pop()}, todo label con input \`sr-only\` es \`relative\``,
      visto > 0 && bien);
  }

  /* Y el `<main>` tiene que conservar SU scroll: si se pierde, la regla de
     arriba deja el panel sin ninguna forma de scrollear y no se ve el contenido
     de abajo. Las dos mitades van juntas o no van. */
  const armazon = readFileSync("src/app/digitales/layout.tsx", "utf8");
  chequear("y el <main> conserva su propio scroll, que es el que reemplaza al del documento",
    /<main[^>]*overflow-y-auto/.test(armazon));
}

console.log(fallos === 0
  ? "\nok — el panel de Productos Digitales sigue en pie"
  : `\nFALLA — ${fallos} chequeo(s) del panel de Productos Digitales`);
process.exit(fallos === 0 ? 0 : 1);
