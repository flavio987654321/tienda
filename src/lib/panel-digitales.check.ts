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
import { TIERS_DIGITALES, featuresDigital } from "./planes-digitales";

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

/* ⚠️ El slug es único en TODA la tabla de tiendas, no sólo entre las digitales.
   Y hay una carrera: dos cuentas pidiendo la misma dirección en el mismo
   instante pasan las dos el chequeo y una choca contra el índice. Sin el catch,
   esa persona ve un error de base sin explicación. */
chequear("la dirección se comprueba contra todas las tiendas",
  /findFirst\([\s\S]{0,120}?slug: slugNuevo/.test(config));
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

/* ── Los dos botones de IA, dibujados y apagados ───────────────────────────── */
console.log("\n15) La IA que todavía no existe");

/* Se dibujan aunque no anden porque el hueco donde van dice algo que el botón
   solo no dice: que el archivo tiene DOS caminos, escribirlo o subirlo. */
chequear("los dos botones de IA están dibujados",
  (pantallaProductos.match(/Generar con IA|te armo el embudo/g) ?? []).length >= 2);

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

/* Free no lo tiene por el PLAN y para siempre; Starter y Pro no lo tienen todavía.
   Son dos motivos distintos y el cartel tiene que decir cuál es, o el que paga
   cree que le falta plan. */
chequear("el motivo de que esté apagado distingue el plan de la obra",
  /Tu plan no incluye escribir el ebook con IA/.test(pantallaProductos) &&
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

/* Un cambio de documento sin subir la versión es un cambio que nadie re-acepta:
   el banner mira este número. Estuvo clavado en 1.2 mientras el texto cambió
   seis veces — está contado en el propio archivo. */
const legal = readFileSync("src/lib/legal.ts", "utf8");
chequear("la versión de los términos subió con este cambio",
  /CURRENT_TERMS_VERSION = "1\.7"/.test(legal) && /1\.7 \(03\/09\/2026\)/.test(legal));

console.log(fallos === 0
  ? "\nok — el panel de Productos Digitales sigue en pie"
  : `\nFALLA — ${fallos} chequeo(s) del panel de Productos Digitales`);
process.exit(fallos === 0 ? 0 : 1);
