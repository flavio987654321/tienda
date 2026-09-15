/**
 * Chequeos de los cupones de descuento. Se corre con:
 *
 *   npx tsx src/lib/cupones-digitales.check.ts
 *
 * Lo que importa: que el descuento lo decida el servidor con el cupón leído
 * de la base (el navegador manda el CÓDIGO, nunca un monto), que un cupón
 * vencido, agotado, apagado o de otro producto no aplique y diga por qué, que
 * nunca deje la compra en cero, y que el uso se gaste al cobrar y no al
 * crear la orden.
 */

import { readFileSync } from "node:fs";
import {
  normalizarCodigo, validarCuponNuevo, porQueNoAplica, descuentoDe, textoDelDescuento, estadoDelCupon,
  MINIMO_A_COBRAR, PORCENTAJE_MAXIMO, type CuponDigitalPuro,
} from "./cupones-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

/* ── El código ───────────────────────────────────────────────────────────── */

check("COD-A", normalizarCodigo(" promo 20 ") === "PROMO20" && normalizarCodigo("día-del-padre") === "DIA-DEL-PADRE", "mayúsculas, sin espacios ni acentos: es lo que se tipea en un celular");
check("COD-B", normalizarCodigo(123) === "" && normalizarCodigo("x".repeat(40)).length === 20, "lo que no es texto es vacío, y se recorta");

/* ── Crear ───────────────────────────────────────────────────────────────── */

const ok = validarCuponNuevo({ codigo: "promo20", tipo: "PORCENTAJE", valor: "20", productId: "ckabc", venceAt: "2099-12-31", topeUsos: "100" });
check("CREAR-A", ok.ok && ok.datos.codigo === "PROMO20" && ok.datos.valor === 20 && ok.datos.productId === "ckabc" && ok.datos.topeUsos === 100
  && ok.datos.venceAt !== null && ok.datos.venceAt.toISOString() === "2100-01-01T02:59:59.000Z",
  "un cupón bien armado: el código normalizado, los números como números, y vence al final del día argentino");
check("CREAR-B", !validarCuponNuevo({ codigo: "ab", tipo: "PORCENTAJE", valor: 10 }).ok && !validarCuponNuevo({ codigo: "PROMO 20!", tipo: "PORCENTAJE", valor: 10 }).ok,
  "un código corto o con signos se rechaza");
check("CREAR-C", !validarCuponNuevo({ codigo: "TODO", tipo: "PORCENTAJE", valor: 100 }).ok && validarCuponNuevo({ codigo: "TODO", tipo: "PORCENTAJE", valor: PORCENTAJE_MAXIMO }).ok,
  `el porcentaje va hasta ${PORCENTAJE_MAXIMO}: el 100 % es un regalo, no un cupón`);
check("CREAR-D", !validarCuponNuevo({ codigo: "X10", tipo: "PESOS", valor: 0 }).ok && !validarCuponNuevo({ codigo: "X10", tipo: "PESOS", valor: 12.5 }).ok && !validarCuponNuevo({ codigo: "X10", tipo: "PESOS", valor: -5 }).ok,
  "cero, decimales y negativos se rechazan");
check("CREAR-E", !validarCuponNuevo({ codigo: "X10", tipo: "PESOS", valor: 100, venceAt: "2001-01-01" }).ok && !validarCuponNuevo({ codigo: "X10", tipo: "PESOS", valor: 100, venceAt: "ayer" }).ok,
  "una fecha pasada o inválida se rechaza");
check("CREAR-F", !validarCuponNuevo({ codigo: "X10", tipo: "REGALO", valor: 100 }).ok && (validarCuponNuevo({ codigo: "X10", tipo: "PESOS", valor: 100, productId: "../x" }) as { ok: true; datos: { productId: string | null } }).datos.productId === null,
  "un tipo inventado se rechaza; un id de producto raro se ignora (la ruta lo vuelve a mirar)");
check("CREAR-G", (validarCuponNuevo({ codigo: "X10", tipo: "PESOS", valor: 100, venceAt: "", topeUsos: "" }) as { ok: true; datos: { venceAt: null; topeUsos: null } }).datos.venceAt === null,
  "vencimiento y tope vacíos son \"sin\"");

/* ── Cuánto y cuándo ─────────────────────────────────────────────────────── */

const base = (x: Partial<CuponDigitalPuro> = {}): CuponDigitalPuro => ({
  codigo: "PROMO20", tipo: "PORCENTAJE", valor: 20, productId: null, venceAt: null, topeUsos: null, usos: 0, activo: true, ...x,
});
check("DESC-A", descuentoDe(base(), 13000) === 2600 && descuentoDe(base({ valor: 33 }), 999) === 330, "el porcentaje se redondea a pesos enteros");
check("DESC-B", descuentoDe(base({ tipo: "PESOS", valor: 2000 }), 13000) === 2000 && descuentoDe(base({ tipo: "PESOS", valor: 50000 }), 13000) === 13000, "un monto fijo, nunca más que el total");
check("DESC-C", porQueNoAplica(base(), { productId: "a", total: 13000 }) === null, "un cupón sano aplica");
check("DESC-D", porQueNoAplica(base({ activo: false }), { productId: "a", total: 13000 }) === "Ese cupón ya no está activo.", "apagado no aplica, y lo dice");
check("DESC-E", porQueNoAplica(base({ venceAt: new Date("2001-01-01") }), { productId: "a", total: 13000 }) === "Ese cupón venció.", "vencido no aplica");
check("DESC-F", porQueNoAplica(base({ topeUsos: 3, usos: 3 }), { productId: "a", total: 13000 }) === "Ese cupón ya se usó todas las veces que se podía."
  && porQueNoAplica(base({ topeUsos: 3, usos: 2 }), { productId: "a", total: 13000 }) === null,
  "agotado no aplica; con un uso libre sí");
check("DESC-G", porQueNoAplica(base({ productId: "b" }), { productId: "a", total: 13000 }) === "Ese cupón es para otro producto."
  && porQueNoAplica(base({ productId: "a" }), { productId: "a", total: 13000 }) === null,
  "de otro producto no aplica; del mismo sí");
check("DESC-H", porQueNoAplica(base({ tipo: "PESOS", valor: 12950 }), { productId: "a", total: 13000 }) !== null
  && porQueNoAplica(base({ tipo: "PESOS", valor: 12900 }), { productId: "a", total: 13000 }) === null,
  `nunca deja la compra por debajo de $ ${MINIMO_A_COBRAR}: Mercado Pago no cobra cero`);
check("TXT-A", textoDelDescuento(base()) === "20 %" && textoDelDescuento(base({ tipo: "PESOS", valor: 2000 })).replace(/ /g, " ") === "$ 2.000", "el texto del descuento");
check("EST-A", estadoDelCupon(base()) === "vivo" && estadoDelCupon(base({ activo: false })) === "apagado" && estadoDelCupon(base({ topeUsos: 1, usos: 1 })) === "agotado"
  && estadoDelCupon(base({ venceAt: new Date("2001-01-01") })) === "vencido", "el estado para la lista");

/* ── Las rutas y las pantallas ───────────────────────────────────────────── */

const comprar = leer("src/app/api/digitales/comprar/route.ts");
const cobro = leer("src/app/api/digitales/cobro/route.ts");
const publica = leer("src/app/api/digitales/cupon/route.ts");
const crear = leer("src/app/api/digitales/cupones/route.ts");
const unoRuta = leer("src/app/api/digitales/cupones/[id]/route.ts");
const checkout = leer("src/app/p/[id]/pagar/CheckoutClient.tsx");
const pantalla = leer("src/app/digitales/marketing/cupones/page.tsx");
const cliente = leer("src/app/digitales/marketing/cupones/CuponesClient.tsx");
const schema = leer("prisma/schema.prisma");
const migracion = leer("prisma/migrations/20260915180000_cupones_digitales/migration.sql");

check("RUTA-A", /const codigoPedido = normalizarCodigo\(cuerpo\.cupon\)/.test(comprar) && /porQueNoAplica\(cupon, \{ productId: producto\.id, total: totalSinCupon \}\)/.test(comprar)
  && /const total = totalSinCupon - \(cuponAplicado\?\.descuento \?\? 0\)/.test(comprar),
  "la compra lee el CÓDIGO, busca el cupón en la base, decide si aplica y descuenta ella");
check("RUTA-B", /if \(codigoPedido && !ordenPrevia\)/.test(comprar), "un agregado (la oferta de después de pagar) no lleva cupón");
check("RUTA-B2", /checkRateLimit\(`digital-cupon:\$\{ip\}`, INTENTOS_DE_CUPON_POR_HORA/.test(comprar) && /checkRateLimit\(`digital-cupon:\$\{ip\}`, INTENTOS_POR_HORA/.test(publica)
  && /const INTENTOS_DE_CUPON_POR_HORA = 30;/.test(comprar) && /const INTENTOS_POR_HORA = 30;/.test(publica),
  "adivinar códigos por la compra cuesta lo mismo que por la ruta pública: misma clave y mismo tope por IP");
check("RUTA-B3", /cupon\.usos \+= await prisma\.order\.count\(\{[\s\S]*?cuponCodigo: cupon\.codigo, status: "PENDING",[\s\S]*?RESERVA_DE_CUPON_MS/.test(comprar),
  "una compra abierta con cupón reserva el uso: el tope no se sobrevende entre la compra y el pago");
check("RUTA-C", /storeId_codigo: \{ storeId: producto\.store\.id, codigo: codigoPedido \}/.test(comprar), "el cupón es de LA TIENDA del producto: el de otra vendedora no vale");
check("RUTA-D", /cuponCodigo: cuponAplicado\?\.codigo \?\? null,\n\s+descuento: cuponAplicado\?\.descuento \?\? 0,/.test(comprar), "la orden guarda con qué cupón y cuánto descontó");
check("RUTA-E", /if \(orden\.cuponCodigo\) \{\n\s+await tx\.cuponDigital\.updateMany\(\{\n\s+where: \{ storeId: orden\.store\.id, codigo: orden\.cuponCodigo \},\n\s+data: \{ usos: \{ increment: 1 \} \},/.test(cobro)
  && cobro.indexOf("usos: { increment: 1 }") > cobro.indexOf("data: { status: \"CONFIRMED\" }"),
  "el uso se gasta al CONFIRMAR el pago, dentro de la misma transacción: un carrito abandonado no gasta");
check("RUTA-F", /checkRateLimit\(`digital-cupon:\$\{ip\}`, INTENTOS_POR_HORA/.test(publica) && !/usos|topeUsos|venceAt/.test(publica.split("return NextResponse.json({\n    ok: true")[1] ?? "x"),
  "la ruta pública tiene tope por IP y no cuenta cuántos usos quedan ni cuándo vence");
check("RUTA-G", /isActive: true, store: \{ owner: \{ role: "DIGITAL" \} \}/.test(publica), "sólo para productos digitales publicados");
check("RUTA-H", /validarCuponNuevo\(await req\.json/.test(crear) && /storeId: store\.id \}/.test(crear) && /MAX_CUPONES_POR_CUENTA/.test(crear) && /P2002/.test(crear),
  "crear: valida, el producto tiene que ser propio, con tope por cuenta y el código repetido se dice");
check("RUTA-I", /updateMany\(\{\n\s+where: \{ id, store: \{ ownerId: user\.id \} \}/.test(unoRuta) && /deleteMany\(\{ where: \{ id, store: \{ ownerId: user\.id \} \} \}\)/.test(unoRuta),
  "apagar y borrar llevan el dueño en el where");
check("PANT-A", /cupon: cupon\?\.codigo,/.test(checkout) && !/descuento:/.test(checkout.split("body: JSON.stringify({")[1]?.split("})")[0] ?? ""),
  "el checkout manda el código, nunca el monto");
check("PANT-B", /descuentoDe\(cupon, sinCupon\)/.test(checkout) && /fetch\("\/api\/digitales\/cupon"/.test(checkout), "el checkout muestra el precio con la misma función que cobra, y verifica contra la ruta pública");
check("PANT-C", /estadoDelCupon\(puro, ahora\)/.test(pantalla) && /validarCuponNuevo\(borrador\)/.test(cliente) && /window\.confirm/.test(cliente),
  "la pantalla del panel muestra el estado, valida antes de mandar y confirma antes de borrar");
check("BASE-A", /^model CuponDigital \{/m.test(schema) && /@@unique\(\[storeId, codigo\]\)/.test(schema) && /cuponCodigo String\?/.test(schema)
  && /CREATE TABLE IF NOT EXISTS "CuponDigital"/.test(migracion) && /ADD COLUMN IF NOT EXISTS "cuponCodigo"/.test(migracion),
  "el modelo, la clave única por cuenta y la migración idempotente");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
