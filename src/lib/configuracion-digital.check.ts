/**
 * Chequeos de la Configuración de una cuenta digital. Se corre con:
 *
 *   npx tsx src/lib/configuracion-digital.check.ts
 *
 * Las tres funciones son puras, así que acá se EJECUTAN de verdad y no se busca
 * texto en el archivo.
 */

import { readFileSync } from "fs";
import { validarGaId, validarPixelId, validarClarityId, extraerClarityId } from "./tracking-ids";
import {
  normalizarSlug, validarSlug, validarNombre, validarCheckoutName, validarEmail,
  validarContextoIA, logoValido,
  SLUGS_RESERVADOS, SLUG_MINIMO, SLUG_MAXIMO, LARGO_NOMBRE, LARGO_CHECKOUT,
  LARGO_IA_PRODUCTO, LARGO_IA_DESCRIPCION,
} from "./configuracion-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── Cómo queda escrita la dirección ──────────────────────────────────────── */

check("SLUG-A", normalizarSlug("Mis Guías") === "mis-guias",
  "los acentos se sacan y no rompen la palabra: 'Mis Guías' → 'mis-guias'");
check("SLUG-B", normalizarSlug("ÑANDÚ") === "nandu", "la eñe y la u con tilde también");
check("SLUG-C", normalizarSlug("  GUÍA   de   Mecánica  ") === "guia-de-mecanica",
  "los espacios de más se juntan en un solo guion");
check("SLUG-D", normalizarSlug("---hola---") === "hola", "los guiones de los bordes se van");
check("SLUG-E", normalizarSlug("mis!!!guias???") === "mis-guias",
  "los signos se convierten en un guion, no en varios");

/* Recortar a lo largo puede dejar un guion colgando justo en el corte, y una
   dirección terminada en guion se ve rota. */
check("SLUG-F", !normalizarSlug("a".repeat(39) + " b").endsWith("-"),
  "el recorte no deja un guion colgando al final");
check("SLUG-G", normalizarSlug("x".repeat(100)).length <= SLUG_MAXIMO,
  "nunca pasa del largo máximo");

/* ── Qué dirección se acepta ──────────────────────────────────────────────── */

check("SLUG-H", validarSlug("mis-guias") === null, "una dirección normal pasa");
check("SLUG-I", validarSlug("Mis Guías") === null,
  "y una escrita 'mal' también: se arregla sola en vez de retar");

check("SLUG-J", validarSlug("!!!") !== null, "una que se queda vacía al limpiarla no");
check("SLUG-K", validarSlug("ab") !== null, `ni una de menos de ${SLUG_MINIMO} caracteres`);
check("SLUG-L", [null, undefined, 5, {}].every((v) => validarSlug(v) !== null),
  "ni lo que directamente no es texto");

/* ⚠️ Las reservadas. Dos motivos distintos: "www" y "api" chocan con el mapeo de
   subdominio → tienda que ya hace el middleware; "soporte" y "tiendaapps" hacen
   que la página de un tercero parezca nuestra, que es la mitad del trabajo de un
   engaño ya hecha y con nuestro dominio dándole respaldo. */
check("SLUG-M", SLUGS_RESERVADOS.every((r) => validarSlug(r) !== null),
  "ninguna palabra reservada se puede usar");
check("SLUG-N", validarSlug("WWW") !== null && validarSlug("  Api  ") !== null,
  "y no se esquivan con mayúsculas ni con espacios: se comparan ya normalizadas");
check("SLUG-Ñ", (SLUGS_RESERVADOS as readonly string[]).includes("tiendaapps"),
  "nuestro propio nombre está en la lista");

/* ── El nombre ────────────────────────────────────────────────────────────── */

check("NOM-A", validarNombre("Mis guías") === null, "un nombre normal pasa");
check("NOM-B", validarNombre("a") !== null, "uno de una letra no");
check("NOM-C", validarNombre("   ") !== null, "ni uno que es todo espacios");
check("NOM-D", validarNombre("x".repeat(LARGO_NOMBRE + 1)) !== null, "ni uno más largo que el tope");
check("NOM-E", validarNombre("x".repeat(LARGO_NOMBRE)) === null, "el borde exacto sí entra");
check("NOM-F", [null, undefined, 7, []].every((v) => validarNombre(v) !== null),
  "lo que no es texto tampoco");

/* ── El nombre en el checkout ─────────────────────────────────────────────── */

check("CHK-A", validarCheckoutName("Mis guías") === null, "un nombre de checkout normal pasa");

/* Vacío es una respuesta legítima: quiere decir "usá el de la marca". Por eso NO
   se le exige el mínimo de dos letras que sí tiene el nombre de la marca —
   borrarlo es volver al de siempre, no dejar el checkout sin nombre. */
check("CHK-B", validarCheckoutName("") === null && validarCheckoutName("   ") === null,
  "vacío también: significa 'usá el nombre de la marca'");

/* Es más corto que el de la marca a propósito: lo ve el comprador mientras paga
   y en el resumen de su tarjeta, y ahí la pregunta es "¿esto es lo que compré?".
   La respuesta tiene que entrar de un vistazo. */
check("CHK-C", LARGO_CHECKOUT < LARGO_NOMBRE, "el tope del checkout es más corto que el de la marca");
check("CHK-D", validarCheckoutName("x".repeat(LARGO_CHECKOUT + 1)) !== null, "y se respeta");
check("CHK-E", validarCheckoutName(5) !== null, "lo que no es texto no pasa");

/* ── El mail de soporte ───────────────────────────────────────────────────── */

check("MAIL-A", validarEmail("hola@misguias.com") === null, "un correo normal pasa");

/* ⚠️ La comprobación es floja a propósito. Las expresiones "completas" para
   correo son famosas por rechazar direcciones válidas, y acá rechazar de más
   tiene un costo concreto: es el único lugar donde alguien que pagó y no recibió
   el archivo puede reclamar. */
check("MAIL-B", validarEmail("juan+ofertas@mi-dominio.com.ar") === null,
  "una con signo de más y guiones también: rechazar de más deja a alguien sin poder reclamar");

check("MAIL-C", validarEmail("") === null, "vacío pasa: es opcional");
check("MAIL-D", validarEmail("sinarroba.com") !== null, "sin arroba no");
check("MAIL-E", validarEmail("sin@punto") !== null, "sin punto en el dominio tampoco");
check("MAIL-F", validarEmail("con espacio@ahi.com") !== null, "ni con espacios adentro");
check("MAIL-G", validarEmail("a@b@c.com") !== null, "ni con dos arrobas");
check("MAIL-H", validarEmail("x".repeat(250) + "@ab.com") !== null, "ni una más larga que la norma");
check("MAIL-I", [null, undefined, 7, {}].every((v) => validarEmail(v) !== null),
  "ni lo que no es texto");

/* ── El contexto de la IA ─────────────────────────────────────────────────── */

check("IA-A", validarContextoIA({ producto: "Mecánica del automotor", descripcion: "Una guía." }) === null,
  "un contexto normal pasa");
check("IA-B", validarContextoIA({}) === null, "y no exige nada: los dos campos son opcionales");
check("IA-C", validarContextoIA({ producto: "", descripcion: "" }) === null,
  "vacío pasa: es 'todavía no lo definí'");

/* Una sola letra no es un nicho, y de ese nicho sale un ebook entero. */
check("IA-D", validarContextoIA({ producto: "a" }) !== null,
  "una sola letra no: de ahí saldría un ebook entero");

/* Los topes no son por la base: este texto entra en CADA pedido a la IA, así que
   un contexto largo se paga en cada generación y encima diluye lo importante. */
check("IA-E", validarContextoIA({ producto: "x".repeat(LARGO_IA_PRODUCTO + 1) }) !== null,
  "el producto tiene tope");
check("IA-F", validarContextoIA({ descripcion: "x".repeat(LARGO_IA_DESCRIPCION + 1) }) !== null,
  "la descripción también");
check("IA-G", validarContextoIA({ producto: "x".repeat(LARGO_IA_PRODUCTO) }) === null,
  "el borde exacto entra");
check("IA-H", validarContextoIA({ producto: 5 }) !== null && validarContextoIA({ descripcion: [] }) !== null,
  "lo que no es texto no pasa");

/* ── Los IDs de medición ──────────────────────────────────────────────────── */

/* ⚠️ Estos dos valores terminan interpolados LITERALMENTE adentro de un
   `<script>` de una página pública, así que lo que pase por acá es lo que se va
   a ejecutar en el navegador de cualquiera que entre. */

check("GA-A", validarGaId("G-ABC1234567") === null, "un ID de Analytics normal pasa");
check("GA-B", validarGaId("") === null, "vacío pasa: es opcional");
check("GA-C", validarGaId("UA-123456-1") !== null, "el formato viejo UA- no");
check("GA-D", validarGaId("G-ABC'; alert(1); //") !== null,
  "y algo con comillas y punto y coma NO entra: iría adentro de un <script>");
check("GA-E", validarGaId("<script>x</script>") !== null, "ni una etiqueta");
check("GA-F", [null, undefined, 9, {}].every((v) => validarGaId(v) !== null),
  "ni lo que no es texto");

check("PIX-A", validarPixelId("1234567890123456") === null, "un píxel normal pasa");
check("PIX-B", validarPixelId("") === null, "vacío pasa");
check("PIX-C", validarPixelId("123") !== null, "uno demasiado corto no");
check("PIX-D", validarPixelId("12345678901234567890123") !== null, "ni uno demasiado largo");
check("PIX-E", validarPixelId("123456789012'+alert(1)+'") !== null,
  "ni uno con código pegado atrás");
check("PIX-F", validarPixelId("abc1234567890") !== null, "ni uno con letras");

/* ── Microsoft Clarity ────────────────────────────────────────────────────── */

check("CLA-A", validarClarityId("abc123def4") === null, "un Project ID normal pasa");
check("CLA-B", validarClarityId("") === null, "vacío pasa: es opcional");

/* Clarity no te muestra el ID pelado en ningún lado cómodo: lo que te da para
   copiar es un bloque de <script>. Pedirle a alguien que busque el pedacito de
   adentro es pedirle que haga a mano algo que podemos hacer nosotros — y el
   primero que se equivoque va a pegar el script igual. */
const SCRIPT_CLARITY = `<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    })(window, document, "clarity", "script", "s1mnpqr7t9");
</script>`;
check("CLA-C", extraerClarityId(SCRIPT_CLARITY) === "s1mnpqr7t9",
  "del script de instalación entero se saca el ID solo");
check("CLA-D", validarClarityId(SCRIPT_CLARITY) === null, "y por eso pegar el script se acepta");
check("CLA-E", extraerClarityId("abc123def4") === "abc123def4", "un ID pelado se deja como está");

/* ⚠️ Lo que se extrae termina adentro de un <script>. Si del script pegado
   saliera cualquier cosa, estaríamos ejecutando lo que trajo el usuario. */
check("CLA-F", validarClarityId('"clarity", "script", "abc";alert(1);//') !== null,
  "algo con código pegado atrás NO pasa");
check("CLA-G", validarClarityId("id-con-guiones") !== null, "ni un ID con guiones");
check("CLA-H", [null, undefined, 3, {}].every((v) => validarClarityId(v) !== null),
  "ni lo que no es texto");

/* ⚠️ La regla tiene que ser UNA sola. La pantalla que deja escribir el ID y el
   componente que lo inyecta adentro del `<script>` son dos puertas al mismo
   lugar: si cada una tuviera su copia, el día que una afloje queda guardado algo
   que la otra va a ejecutar. Es exactamente lo que pasó con el teléfono. */
const inyector = readFileSync("src/components/store/StoreTrackingScripts.tsx", "utf8");
check("PIX-G", /from "@\/lib\/tracking-ids"/.test(inyector),
  "el que inyecta los scripts importa la regla, no la copia");
check("PIX-H", !/const GA_ID_RE\s*=/.test(inyector) && !/const PIXEL_ID_RE\s*=/.test(inyector),
  "y ya no la declara por su cuenta");

/* ⚠️ EL agujero silencioso de esta pantalla.
 *
 * `analytics` es una clave de DISEÑO, así que el editor de templates la
 * reescribe entera cada vez que se guarda un diseño — y zod DESCARTA las claves
 * que no figuran en su esquema. Un ID que no esté declarado se guarda bien, se
 * ve bien, y desaparece la primera vez que alguien toca el diseño. Sin ningún
 * error, sin nada en los registros.
 *
 * Los tres archivos se tocan juntos, siempre. */
const esquema = readFileSync("src/lib/store-config.ts", "utf8");
const tipos = readFileSync("src/types/store-config.ts", "utf8");
const inyecta = readFileSync("src/components/store/StoreTrackingScripts.tsx", "utf8");

for (const id of ["googleAnalyticsId", "facebookPixelId", "clarityProjectId"]) {
  check(`SYNC-${id}`,
    new RegExp(`${id}: z\\.string\\(\\)`).test(esquema) && new RegExp(`${id}\\?: string`).test(tipos),
    `${id} está en el esquema Y en los tipos (si no, guardar el diseño lo borra)`);
}
check("SYNC-merge", /"googleAnalyticsId", "facebookPixelId", "clarityProjectId"/.test(esquema),
  "y los tres se mezclan al guardar, ninguno queda afuera");
check("SYNC-inject", /validClarityId/.test(inyecta),
  "y Clarity se inyecta de verdad: un campo que guarda y no hace nada es peor que no tenerlo");

/* ── El logo ──────────────────────────────────────────────────────────────── */

/* Es la MISMA función que valida la portada de un producto, importada y no
   copiada: dos listas blancas se desincronizan de a una, y el agujero que dejan
   es el mismo —una dirección ajena adentro de una página nuestra es un
   rastreador de un tercero mirando quién entra. */
check("LOGO-A", logoValido("/uploads/abc.png"), "lo que sube /api/upload entra");
check("LOGO-B", !logoValido("https://rastreador.example.com/pixel.png"),
  "una dirección de otro servidor NO entra");
check("LOGO-C", !logoValido("//rastreador.example.com/x.png"),
  "ni una que arranca con dos barras");

/* ── Lo que la pantalla dice que no existe, tiene que no existir ──────────
   El 21/09/26 la pestaña Dominio decía "viene después" (existía por producto
   desde el 04/09) y "Activar avisos" estaba apagado diciendo que a una cuenta
   digital no le llega ningún aviso (el cobro manda el push de "¡Vendiste!" y
   el panel pide el permiso). Un panel que dice que algo no anda cuando anda
   es peor que uno que no lo nombra. */
const cliente = readFileSync("src/app/digitales/configuracion/ConfiguracionClient.tsx", "utf8");
const general = readFileSync("src/app/digitales/configuracion/TabGeneral.tsx", "utf8");
const avisos = readFileSync("src/app/digitales/configuracion/AvisosDeVenta.tsx", "utf8");
const layout = readFileSync("src/app/digitales/layout.tsx", "utf8");
check("VIEJO-A", !/lista: false/.test(cliente) && /El dominio va <strong[^>]*>por producto<\/strong>/.test(cliente) && /href="\/digitales\/productos"/.test(cliente),
  "la pestaña Dominio no dice 'viene después': dice que va por producto y lleva a Productos");

/* La pestaña Dominio se bifurca por plan. Hasta el 24/09/26 era una sola para
   todos: en Free mostraba la explicación completa y el botón naranja a
   Productos, o sea mandaba a alguien a un callejón —se llega al producto, se
   toca "Cambiar la dirección" y recién ahí aparece que hace falta Pro—. El
   candado del servidor (`api/digitales/productos/[id]/dominio`) siempre estuvo;
   lo que faltaba era decirlo antes del viaje. */
check("DOM-PLAN-A", /\{p\.tier === "PRO" \? \(/.test(cliente),
  "la pestaña Dominio mira el plan antes de dibujar");
check("DOM-PLAN-B", /Conectar tu propio dominio viene con el plan/.test(cliente)
  && /href="\/digitales\/mi-cuenta"/.test(cliente),
  "sin Pro dice que es de Pro y lleva a Mi cuenta, no a Productos");
check("DOM-PLAN-C", /p\.dominios\.length > 0/.test(cliente) && /No se apagó/.test(cliente),
  "y a quien cayó a Free con un dominio conectado le aclara que no se le apagó");
/* Los días salen del servidor con `diasParaPerderElDominio`, que usa el mismo
   plazo que aplica el cron. Un número escrito a mano en la pantalla se queda
   viejo el día que cambie `DIAS_DE_DOMINIO_EN_FREE` y nadie se entera. */
const pantallaConfig = readFileSync("src/app/digitales/configuracion/page.tsx", "utf8");
check("DOM-PLAN-D", /diasParaPerderElDominio\(/.test(pantallaConfig)
  && /p\.diasDeDominio/.test(cliente) && !/\b90 días\b/.test(cliente),
  "el plazo lo calcula el servidor con el mismo número que el cron, no está escrito en la pantalla");
check("VIEJO-B", !/todavía no le llega ningún\s+aviso/.test(general) && /<AvisosDeVenta \/>/.test(general)
  && /subscribeToPush\(\)/.test(avisos) && /unsubscribeFromPush\(\)/.test(avisos) && /enVuelo\.current/.test(avisos)
  && /Notification\.permission === "denied"/.test(avisos) && /candadito/.test(avisos)
  && !/useEffect\(\(\) => \{[^}]*setEstado\("bloqueado"\)/.test(avisos),
  "'Activar avisos' es un interruptor de verdad, con doble click cubierto, el caso bloqueado explicado y sin setState en el efecto");
check("VIEJO-C", (layout.match(/<PWAManager[^>]*scope="\/digitales"/g) ?? []).some((t) => !/disableNotifPrompt/.test(t)),
  "el panel armado pide el permiso de avisos (sin disableNotifPrompt), así el push de la venta tiene a quién llegar");

console.log(fallos === 0
  ? "\nok — la Configuración de una cuenta digital se sostiene"
  : `\nFALLA — ${fallos} chequeo(s) de la Configuración`);
process.exit(fallos === 0 ? 0 : 1);
