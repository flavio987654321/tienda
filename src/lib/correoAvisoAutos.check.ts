/**
 * Chequeo del correo que le llega a la concesionaria. Se corre con:
 *
 *   npx tsx src/lib/correoAvisoAutos.check.ts
 */
import { correoAvisoAutos } from "./correoAvisoAutos";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };

const base = {
  tienda: "Autos <Sur>", titulo: "Nueva consulta", resumen: "Juan consultó por el Corolla.",
  filas: [["Vehículo", "Corolla"], ["Mensaje", "<script>alert(1)</script>"], ["Vacío", ""], ["Nulo", null]] as [string, string | null][],
  nombre: "Juan", telefono: "011 15 5555-1234", saludo: "Hola Juan, te escribo de Autos Sur.",
  panel: "https://www.tiendaapps.com/dashboard/consultas", panelTexto: "Ver en Consultas",
};
const { asunto, html } = correoAvisoAutos(base);
ok("lo que escribió el cliente va escapado", !html.includes("<script>") && html.includes("&lt;script&gt;"));
ok("el nombre de la tienda también", html.includes("Autos &lt;Sur&gt;"));
ok("botón de WhatsApp al celular del cliente, con el saludo", html.includes("wa.me/5491155551234") && html.includes("Hola%20Juan"), html.match(/wa\.me[^"]*/)?.[0]);
ok("botón al panel", html.includes("https://www.tiendaapps.com/dashboard/consultas"));
ok("las filas vacías no se muestran", !html.includes("Vacío") && !html.includes("Nulo"));

const fijo = correoAvisoAutos({ ...base, telefono: "abc" }).html;
ok("sin un celular válido: sin botón de WhatsApp y con el número para llamar", !fijo.includes("wa.me") && fijo.includes("llamalo al abc"));

const conSalto = correoAvisoAutos({ ...base, resumen: "Juan\r\nBcc: x@y.com" }).asunto;
ok("el asunto no lleva saltos de línea", !/[\r\n]/.test(conSalto), conSalto);
ok("asunto con qué pasó", asunto.startsWith("Nueva consulta: Juan consultó"));

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
