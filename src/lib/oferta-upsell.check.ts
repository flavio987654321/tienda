/**
 * Chequeos de la oferta del upsell. Se corre con:
 *
 *   npx tsx src/lib/oferta-upsell.check.ts
 *
 * Lo que importa, y es todo lo mismo: **que el reloj no sea un adorno.**
 *
 *   - Que el plazo esté firmado, sea de ESTE producto y no se pueda cruzar
 *     con el de las otras dos ofertas con reloj.
 *   - Que la ruta que cobra NO firme un plazo nuevo: sin token válido no hay
 *     precio de oferta. Si no, alcanzaba con no mandarlo.
 *   - Que al vencer suba el precio de verdad, con la MISMA función en la
 *     pantalla y en el cobro.
 *   - Que nunca se cobre más de lo que decía el botón.
 *   - Que sólo entre el upsell que tiene a qué precio volver.
 */

import { readFileSync } from "node:fs";

process.env.NEXTAUTH_SECRET ??= "clave-de-prueba-para-los-chequeos-0123456789";

import {
  validarOfertaUpsell, leerOfertaUpsell, entraEnLaOferta, precioDelUpsell, claveDeOfertaUpsell,
  venceEnDelTokenDeUpsell, elTokenDeUpsellMasViejo, OFERTA_UPSELL_DE_FABRICA, MINUTOS_DE_UPSELL,
  MINUTOS_MAXIMOS_UPSELL, TEXTO_UPSELL_MAX,
} from "./oferta-upsell";
import { firmarUpsell, leerTokenDeUpsell, firmarBienvenida, firmarOferta } from "./oferta-salida-firma";
import { ofertaUpsellDeLaVisita } from "./oferta-upsell-servidor";
import { upsellsQueValen } from "./compra-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

const ID = "clx0000000000000000000001";
const OTRO = "clx0000000000000000000002";
const AHORA = 1_800_000_000_000;

/* ── Las reglas ─────────────────────────────────────────────────────────── */

check("UPS-A", !validarOfertaUpsell({ minutos: 7, texto: "Corré" }).ok
  && !validarOfertaUpsell({ minutos: 10, texto: "ya" }).ok
  && !validarOfertaUpsell({ minutos: 10, texto: "x".repeat(TEXTO_UPSELL_MAX + 1) }).ok
  && validarOfertaUpsell({ activa: true, minutos: 10, texto: "La oferta se termina en" }).ok,
  "los minutos salen de la lista, el texto tiene un mínimo y un tope");

check("UPS-B", MINUTOS_DE_UPSELL.every((m) => m <= MINUTOS_MAXIMOS_UPSELL),
  "ningún plazo de la lista promete más que el máximo que la firma acepta");

check("UPS-C", leerOfertaUpsell(null).activa === false && leerOfertaUpsell("{roto").activa === false
  && leerOfertaUpsell(JSON.stringify({ activa: true, minutos: 999, texto: "hola" })).activa === false
  && OFERTA_UPSELL_DE_FABRICA.activa === false,
  "lo roto, lo inventado y lo que no está cae en la de fábrica, que está APAGADA");

/* ── Quién entra, y a qué precio ────────────────────────────────────────── */

check("UPS-D", entraEnLaOferta({ price: 2990, comparePrice: 5990 })
  && !entraEnLaOferta({ price: 2990, comparePrice: null })
  && !entraEnLaOferta({ price: 2990, comparePrice: 2990 })
  && !entraEnLaOferta({ price: 2990, comparePrice: 1000 })
  && !entraEnLaOferta({ price: 0, comparePrice: 5990 }),
  "entra sólo el que tiene precio de lista MAYOR: sin eso el reloj llegaría a cero y no cambiaría nada");

check("UPS-E", precioDelUpsell({ price: 2990, comparePrice: 5990 }, true) === 2990
  && precioDelUpsell({ price: 2990, comparePrice: 5990 }, false) === 5990
  && precioDelUpsell({ price: 2990, comparePrice: null }, false) === 2990
  && precioDelUpsell({ price: 2990, comparePrice: 1000 }, false) === 2990,
  "vivo: precio de oferta; vencido: precio de lista; el que no participa vale lo mismo siempre");

/* ── El plazo firmado ───────────────────────────────────────────────────── */

const vivo = firmarUpsell(ID, AHORA + 5 * 60_000);
const muerto = firmarUpsell(ID, AHORA - 1_000);

check("UPS-F", leerTokenDeUpsell(vivo, ID, AHORA)?.vivo === true
  && leerTokenDeUpsell(muerto, ID, AHORA)?.vivo === false
  && leerTokenDeUpsell(vivo, OTRO, AHORA) === null
  && leerTokenDeUpsell(`${AHORA + 60_000}.aaaaaaaaaaaaaaaaaaaaaaaa`, ID, AHORA) === null,
  "el token vale sólo para su producto, y uno tocado no vale; vencido se distingue de inválido");

check("UPS-G", leerTokenDeUpsell(firmarBienvenida(ID, AHORA + 60_000), ID, AHORA) === null
  && leerTokenDeUpsell(firmarOferta(ID, AHORA + 60_000), ID, AHORA) === null,
  "un plazo del precio de bienvenida o de la oferta de salida NO vale como plazo del upsell");

check("UPS-H", leerTokenDeUpsell(firmarUpsell(ID, AHORA + 10 * 60 * 60_000), ID, AHORA) === null,
  "un token que promete más que el plazo máximo no se acepta: una firma nuestra nunca dice eso");

check("UPS-I", venceEnDelTokenDeUpsell(vivo) === AHORA + 5 * 60_000
  && venceEnDelTokenDeUpsell("cualquier cosa") === null
  && elTokenDeUpsellMasViejo([firmarUpsell(ID, AHORA + 9 * 60_000), vivo, null]) === vivo,
  "el navegador lee la hora sin verificar la firma, y se queda con el que vence ANTES: recargar no estira el plazo");

/* ── El servidor: dibujar es distinto de cobrar ─────────────────────────── */

const alDia = { tier: "STARTER", status: "ACTIVE", trialEndsAt: new Date(AHORA), currentPeriodEnd: new Date(AHORA + 30 * 86_400_000), gracePeriodEndsAt: null };
const fila = (activa: boolean, sub: typeof alDia | null = alDia) => ({
  id: ID,
  ofertaUpsell: JSON.stringify({ activa, minutos: 10, texto: "La oferta se termina en" }),
  store: { owner: { subscription: sub } },
});

check("UPS-J", ofertaUpsellDeLaVisita(fila(false), [], true, AHORA) === null
  && ofertaUpsellDeLaVisita(fila(true), [], false, AHORA) === null
  && ofertaUpsellDeLaVisita(fila(true, null), [], true, AHORA) === null
  && ofertaUpsellDeLaVisita(fila(true, { ...alDia, tier: "FREE" }), [], true, AHORA) === null,
  "apagada, sin ningún upsell que participe, sin plan o en Free: no hay oferta para nadie");

const primeraVez = ofertaUpsellDeLaVisita(fila(true), [], true, AHORA);
check("UPS-K", primeraVez?.estado === "viva" && primeraVez.venceEn === AHORA + 10 * 60_000
  && leerTokenDeUpsell(primeraVez.token, ID, AHORA)?.vivo === true,
  "quien entra por primera vez se lleva un plazo firmado de los minutos configurados");

check("UPS-L", ofertaUpsellDeLaVisita(fila(true), [muerto], true, AHORA)?.estado === "vencida"
  && ofertaUpsellDeLaVisita(fila(true), [vivo], true, AHORA)?.estado === "viva",
  "con un token vencido NO se firma otro: ya tuvo su plazo");

/* ⚠️ EL CHEQUEO QUE SOSTIENE TODO. Sin `firmarSiNoHay: false`, a cualquiera le
   alcanza con no mandar el token —o mandar basura— para que la ruta que cobra
   le firme un plazo fresco y le cobre el precio de oferta para siempre. */
check("UPS-M", ofertaUpsellDeLaVisita(fila(true), [], true, AHORA, { firmarSiNoHay: false })?.estado === "vencida"
  && ofertaUpsellDeLaVisita(fila(true), ["inventado"], true, AHORA, { firmarSiNoHay: false })?.estado === "vencida"
  && ofertaUpsellDeLaVisita(fila(true), [firmarUpsell(OTRO, AHORA + 60_000)], true, AHORA, { firmarSiNoHay: false })?.estado === "vencida"
  && ofertaUpsellDeLaVisita(fila(true), [vivo], true, AHORA, { firmarSiNoHay: false })?.estado === "viva",
  "al COBRAR no se firma un plazo nuevo: sin token válido (o de otro producto) no hay precio de oferta");

/* ── El precio que se cobra ─────────────────────────────────────────────── */

const hijos = [
  { id: "u1", name: "Diagnóstico", price: 2990, comparePrice: 5990, rolDigital: "UPSELL", padreId: ID },
  { id: "u2", name: "Checklist", price: 1500, comparePrice: null, rolDigital: "UPSELL", padreId: ID },
  { id: "b1", name: "Bono", price: 0, comparePrice: 9000, rolDigital: "BONO", padreId: ID },
  { id: "aj", name: "De otro embudo", price: 4000, comparePrice: 9000, rolDigital: "UPSELL", padreId: OTRO },
];

check("UPS-N", upsellsQueValen(["u1", "u2"], hijos, ID, true).map((u) => u.price).join() === "2990,1500"
  && upsellsQueValen(["u1", "u2"], hijos, ID, false).map((u) => u.price).join() === "5990,1500",
  "con el reloj vivo se cobra el de oferta; vencido, el de lista — y el que no participa no cambia");

check("UPS-O", upsellsQueValen(["aj"], hijos, ID, false).length === 0
  && upsellsQueValen(["b1"], hijos, ID, false).length === 0
  && upsellsQueValen(["u1", "u1"], hijos, ID, true).length === 1,
  "el upsell de otro embudo, el bono y los repetidos siguen quedando afuera con la oferta vencida");

check("UPS-P", upsellsQueValen(["u1"], hijos, ID).map((u) => u.price).join() === "2990",
  "sin decir nada, el precio es el de siempre: un producto sin oferta configurada no cambia de precio");

/* ── Lo que no se puede leer de una función ─────────────────────────────── */

const cliente = leer("src/app/p/[id]/pagar/CheckoutClient.tsx");
const pago = leer("src/app/p/[id]/pagar/page.tsx");
const comprar = leer("src/app/api/digitales/comprar/route.ts");
const servidor = leer("src/lib/oferta-upsell-servidor.ts");
const ruta = leer("src/app/api/digitales/productos/[id]/upsells/route.ts");
const pantalla = leer("src/app/digitales/marketing/upsells/UpsellsClient.tsx");
const hub = leer("src/app/digitales/marketing/page.tsx");
const esquema = leer("prisma/schema.prisma");

check("UPS-Q", /firmarSiNoHay: false/.test(comprar) && /ofertaUpsellDeLaVisita\(/.test(comprar)
  && /const ofertaDelUpsellViva = ofertaDelUpsell === null \|\| ofertaDelUpsell\.estado === "viva";/.test(comprar)
  && /upsellsQueValen\(cuerpo\.upsells, producto\.hijos, producto\.id, ofertaDelUpsellViva\)/.test(comprar),
  "la ruta que cobra verifica el plazo con la misma función, sin firmar uno nuevo, y con eso pone el precio");

check("UPS-R", /if \(!ofertaDelUpsellViva && eligioUnoConReloj && !yaVioElPrecioDeLista\) \{/.test(comprar) && /upsellVencido: true,/.test(comprar)
  && /if \(datos\.upsellVencido\) setUpsellRechazado\(true\);/.test(cliente),
  "si el reloj se termina entre el clic y el pago se corta y la pantalla acomoda los precios: NUNCA se cobra de más a escondidas");

check("UPS-S", /comparePrice: true/.test(comprar) && /\.\.\.SUB_STATUS_SELECT/.test(comprar),
  "la ruta trae el precio de lista y el estado de la suscripción: sin eso no puede decidir ni el precio ni si la oferta corre");

check("UPS-T", /guardarPlazo\(\n\s+claveDeOfertaUpsell\(ofertaUpsell\.productoId\),\n\s+ofertaUpsell\.token,\n\s+elTokenDeUpsellMasViejo,\n\s+\)/.test(cliente)
  && /if \(pedirDeNuevo\) router\.refresh\(\);/.test(cliente) && !/setInterval/.test(cliente),
  "el checkout guarda el plazo con la cocina compartida y, si tenía uno más viejo, pide la pantalla de nuevo");

check("UPS-U", /upsell: tokenDeUpsell \?\? undefined/.test(cliente)
  && /const tokenDeUpsell = ofertaUpsell\?\.estado === "viva" \? ofertaUpsell\.token : null;/.test(cliente),
  "el token viaja al pagar y sale de las props: no hay una segunda verdad sobre el mismo plazo en la pantalla");

check("UPS-V", /La oferta se terminó: queda el precio de siempre\./.test(cliente)
  && /\{u\.regular !== null && sale < u\.regular && \(/.test(cliente),
  "vencida se DICE, y el tachado sale sólo si de verdad se está pagando menos");

/* Se cuentan los que se DIBUJAN (el texto adentro de una etiqueta), no las
   veces que el nombre aparece en un comentario. */
check("UPS-W", (cliente.match(/>\s*Sumá a tu compra\s*</g) ?? []).length === 1
  && /\{upsellVivo && upsellVenceEn !== null && ahoraUpsell > 0/.test(cliente),
  "un solo título y un solo reloj para toda la caja, y el reloj no se dibuja en el servidor (hidratación)");

check("UPS-X", /estado: "vencida"/.test(pago) && /if \(!o\) return null;/.test(pago),
  "el checkout distingue «no hay oferta» de «ya la tuvo y venció»: si no, le mostraría el precio de oferta a quien lo perdió");

check("UPS-Y", /rolDigital: "PRINCIPAL", store: \{ ownerId: user\.id \}/.test(ruta)
  && /hijos: \{ where: \{ deletedAt: null, rolDigital: "UPSELL" \}/.test(ruta)
  && /const hijo = producto\.hijos\.find\(\(h\) => h\.id === fila\.id\);/.test(ruta)
  && /if \(!hijo\) continue;/.test(ruta),
  "guardar pide ser la dueña del producto y sólo toca upsells que son hijos de ÉL: un id ajeno no cambia ningún precio");

check("UPS-Z", /sub\.tier === "FREE" \|\| !isSubscriptionActive\(sub\)/.test(ruta) && /tiene que ser mayor que el de la oferta/.test(ruta),
  "Starter y Pro al día, y el precio de después tiene que ser mayor que el de la oferta");

check("UPS-AA", /El precio de después <strong>se cobra de verdad<\/strong>/.test(pantalla)
  && /Cuando se termina el reloj/.test(pantalla),
  "en el panel ese número NO se llama «precio original»: se dice que es plata que se cobra");

check("UPS-AB", /«\{elegido\.name\}» todavía no tiene ningún upsell/.test(pantalla)
  && /Cargar el upsell en Productos/.test(pantalla)
  && /sin upsell/.test(pantalla),
  "sin upsell cargado la pantalla dice dónde se carga, y las fichas de producto lo muestran sin entrar a cada uno");

check("UPS-AC", /href: "\/digitales\/marketing\/upsells"/.test(hub),
  "la tarjeta de Marketing lleva a la pantalla y no a Productos a buscarlos");

check("UPS-AD", /ofertaUpsell  String\?/.test(esquema)
  && /ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ofertaUpsell" TEXT;/.test(leer("prisma/migrations/20260924120000_oferta_upsell/migration.sql")),
  "la columna y la migración idempotente");

check("UPS-AE", !/node:crypto/.test(leer("src/lib/oferta-upsell.ts"))
  && claveDeOfertaUpsell(ID) === `pv_upsell_${ID}`,
  "lo que importa el navegador no trae crypto, y la clave del guardado es por producto");

/* ⚠️ El agregado de después de pagar NO lleva reloj: es otra oferta, en otra
   pantalla. Si entrara acá, a quien se le venció el reloj en el checkout
   tampoco le serviría el upsell de la pantalla de gracias. */
check("UPS-AF", /const ofertaDelUpsell = ordenPrevia\n\s+\? null/.test(comprar),
  "el upsell de después de pagar queda afuera del reloj, a propósito");

check("UPS-AG", /if \(!elegido && !firmarSiNoHay\) return \{ estado: "vencida" \};/.test(servidor),
  "el corte está escrito en una línea sola y se ve: sin token y sin permiso de firmar, no hay oferta");

/* ⚠️ EL BUCLE. El corte por reloj vencido existe para que nadie pague más de
   lo que vio, y para NADA más. Sin levantarlo cuando la pantalla ya está
   mostrando el precio de lista, el segundo intento manda el mismo token
   vencido, choca contra el mismo corte, y la persona no puede comprar ese
   upsell nunca más: sólo sacándolo del pedido. Encontrado auditando. */
check("UPS-AI", /const yaVioElPrecioDeLista = cuerpo\.upsellVencido === true;/.test(comprar)
  && /if \(!ofertaDelUpsellViva && eligioUnoConReloj && !yaVioElPrecioDeLista\) \{/.test(comprar)
  && /upsellVencido: hayOfertaDeUpsell && !upsellVivo \? true : undefined,/.test(cliente),
  "el corte se levanta cuando la pantalla YA muestra el precio de lista: corta una vez, no traba la compra");

/* ⚠️ `venceEn > leerAhora()`. Un plazo vencido sigue cumpliendo "le queda
   menos de una hora" —le queda menos que cero—, así que sin esto el latido
   no se apagaba nunca y la pantalla de pago se redibujaba entera cada
   segundo, para siempre, mientras la persona escribe su correo. */
check("UPS-AJ", /const late = venceEn !== null && venceEn > leerAhora\(\) && mostrarReloj\(venceEn, leerAhora\(\)\);/.test(leer("src/lib/reloj-compartido.ts")),
  "el reloj compartido deja de latir cuando el plazo pasó: sin eso late para siempre");

check("UPS-AK", !/conReloj/.test(cliente) && !/conReloj/.test(pago),
  "el upsell del checkout no lleva una bandera de más diciendo lo que `regular !== null` ya dice");

check("UPS-AL", /validarCampos\(\{ price: hijo\.price, comparePrice: n \}, "UPSELL"\)/.test(ruta),
  "el precio de después se valida con la MISMA función que Productos: es el mismo campo y ahora se escribe desde dos pantallas");

/* ⚠️ El mismo campo se carga en dos pantallas con dos nombres, y en una de
   las dos ("Precio original") nadie piensa que sea plata. Ahí hay que
   decirlo, o alguien infla el tachado y termina cobrándolo. */
check("UPS-AH", /borrador\.rol === "UPSELL" && \(/.test(leer("src/app/digitales/productos/ProductosClient.tsx"))
  && /es lo que se cobra cuando el reloj termina/.test(leer("src/app/digitales/productos/ProductosClient.tsx")),
  "en Productos, el «Precio original» de un upsell avisa que con la oferta prendida es plata que se cobra");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
