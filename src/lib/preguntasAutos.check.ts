/**
 * Chequeo de las preguntas frecuentes de autos. Se corre con:
 *
 *   npx tsx src/lib/preguntasAutos.check.ts
 */
import { armarPreguntasAutos } from "./preguntasFrecuentes";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };

const soloPesos = armarPreguntasAutos({ monedas: ["ARS"], conWhatsapp: true });
const mixta = armarPreguntasAutos({ monedas: ["ARS", "USD"], conWhatsapp: false });
const todo = [...soloPesos, ...mixta].map((x) => `${x.p} ${x.r}`).join(" ");
ok("seis preguntas", soloPesos.length === 6);
ok("moneda: sólo pesos", soloPesos[1].r.includes("pesos argentinos") && !soloPesos[1].r.includes("dólares"));
ok("moneda: mixta dice que cada uno tiene la suya", mixta[1].r.includes("Cada vehículo muestra su moneda"));
ok("sólo dólares", armarPreguntasAutos({ monedas: ["USD"], conWhatsapp: true })[1].r.includes("dólares"));
ok("sin WhatsApp no nombra WhatsApp", !mixta.map((x) => x.r).join(" ").includes("WhatsApp"));
ok("con WhatsApp lo nombra", soloPesos[2].r.includes("WhatsApp"));
ok("no promete lo que nadie cargó", !/financiaci|garant|prueba de manejo|test drive|en todo el país/i.test(todo));

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
if (fallos) process.exit(1);
