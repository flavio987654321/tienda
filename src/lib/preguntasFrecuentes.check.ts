/**
 * Chequeos de `armarPreguntas`. Se corre con:
 *
 *   npx tsx src/lib/preguntasFrecuentes.check.ts
 *
 * Las respuestas de "Preguntas frecuentes" salen de lo que la tienda cargó, y
 * las usan todos los templates de moda. Lo que se vigila:
 *
 *   - que nombre SOLO los envíos prendidos, con su precio bien dicho;
 *   - que los medios de pago salgan de lo que está activo, y sin ninguno no
 *     invente;
 *   - que sin política de cambios no prometa un plazo, pero el botón de
 *     arrepentimiento (obligatorio por ley) vaya siempre;
 *   - que la respuesta de contacto nombre WhatsApp sólo si está prendido.
 */

import { armarPreguntas } from "./preguntasFrecuentes";
import type { ShippingMethod, StorePaymentInfo } from "@/types/store-config";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const fmt = (n: number) => `$${n}`;
const envio = (e: Partial<ShippingMethod>): ShippingMethod =>
  ({ id: "x", label: "Envío", price: 0, coordinar: false, enabled: true, isPickup: false, ...e });
const pagos = (t: boolean, e: boolean) => ({ transferencia: { enabled: t }, efectivo: { enabled: e } }) as unknown as StorePaymentInfo;
const de = (lista: ReturnType<typeof armarPreguntas>, tema: string) => lista.find(x => x.tema === tema)!;

const base = { envios: [], mercadoPago: false, pagos: undefined, legales: undefined, fmt, conWhatsapp: false };

// Envíos
const conEnvios = armarPreguntas({ ...base, envios: [
  envio({ label: "Correo", price: 3500 }),
  envio({ label: "Retiro", price: 0 }),
  envio({ label: "Moto", coordinar: true }),
  envio({ label: "Andreani", liveQuote: true }),
  envio({ label: "Apagado", enabled: false }),
] });
const rEnv = de(conEnvios, "envios").r;
chequear("nombra el envío con precio", rEnv.includes("Correo ($3500)"), rEnv);
chequear("precio 0 se dice sin cargo", rEnv.includes("Retiro (sin cargo)"), rEnv);
chequear("a coordinar", rEnv.includes("Moto (a coordinar)"), rEnv);
chequear("cotización en vivo", rEnv.includes("Andreani (se calcula con tu código postal)"), rEnv);
chequear("no nombra el apagado", !rEnv.includes("Apagado"), rEnv);
chequear("sin envíos no inventa ninguno", de(armarPreguntas({ ...base, envios: null }), "envios").r.startsWith("Coordinamos"));

// Pagos
chequear("sin medios no inventa", de(armarPreguntas(base), "pagos").r.startsWith("Al confirmar"));
chequear("uno solo, sin 'y'", de(armarPreguntas({ ...base, pagos: pagos(true, false) }), "pagos").r === "Aceptamos transferencia bancaria.");
const tres = de(armarPreguntas({ ...base, mercadoPago: true, pagos: pagos(true, true) }), "pagos").r;
chequear("tres, con coma y 'y'", tres.includes(", transferencia bancaria y efectivo."), tres);

// Cambios y políticas
const sinPol = de(armarPreguntas(base), "cambios");
chequear("sin política no promete plazo", sinPol.r.startsWith("Escribinos"), sinPol.r);
chequear("arrepentimiento siempre", sinPol.politicas.length === 1 && sinPol.politicas[0].texto === "Botón de arrepentimiento", sinPol.politicas);
const conPol = armarPreguntas({ ...base, legales: ["devoluciones", "envios"] });
chequear("con política la enlaza", de(conPol, "cambios").politicas.length === 2);
chequear("política de envíos enlazada", de(conPol, "envios").politicas[0]?.tipo === "envios");
chequear("sin política de envíos, sin link", de(armarPreguntas(base), "envios").politicas.length === 0);

// Contacto
chequear("WhatsApp sólo si está prendido", de(armarPreguntas({ ...base, conWhatsapp: true }), "contacto").r.includes("WhatsApp")
  && !de(armarPreguntas(base), "contacto").r.includes("WhatsApp"));
chequear("cinco preguntas, en orden", armarPreguntas(base).map(x => x.tema).join() === "envios,pagos,cambios,talles,contacto");

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
