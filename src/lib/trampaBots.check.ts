/* La trampa para bots de los formularios de autos. Correr: npx tsx src/lib/trampaBots.check.ts */
import { readFileSync } from "node:fs";
import { cayoEnLaTrampa, CAMPO_TRAMPA } from "./trampaBots";

let fallas = 0;
function check(id: string, ok: boolean, que: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${que}`);
  if (!ok) fallas++;
}

check("BOT-A", cayoEnLaTrampa({ [CAMPO_TRAMPA]: "http://spam" }) && !cayoEnLaTrampa({ [CAMPO_TRAMPA]: "" }) && !cayoEnLaTrampa({}) && !cayoEnLaTrampa(null),
  "sólo cae quien completó el campo invisible; vacío o ausente pasa");

/* ⚠️ El orden importa: la trampa va ANTES de guardar y de avisar. Si queda
   después, el bot igual llena el panel y la casilla de la concesionaria. */
for (const r of ["leads", "tasaciones", "busquedas"]) {
  const s = readFileSync(`src/app/api/${r}/route.ts`, "utf8");
  const trampa = s.indexOf("cayoEnLaTrampa(body)");
  const guarda = s.search(/prisma\.\w+\.create\(/);
  check(`BOT-B ${r}`, trampa > 0 && guarda > trampa, `/api/${r}: la trampa se mira antes de guardar`);
}
for (const f of ["ConsultaVehiculo", "TasacionVehiculo", "BusquedaVehiculo"]) {
  const s = readFileSync(`src/components/store/auto/${f}.tsx`, "utf8");
  check(`BOT-C ${f}`, /<CampoTrampa /.test(s) && /\[CAMPO_TRAMPA\]: trampa/.test(s), `${f}: dibuja el campo y lo manda`);
}
const campo = readFileSync("src/components/store/auto/CampoTrampa.tsx", "utf8");
check("BOT-D", /aria-hidden="true"/.test(campo) && /tabIndex=\{-1\}/.test(campo) && /autoComplete="off"/.test(campo),
  "una persona no lo ve, no llega con Tab y el navegador no lo autocompleta");

if (fallas) { console.log(`\n${fallas} fallaron.`); process.exit(1); }
console.log("\nTodo bien.");
