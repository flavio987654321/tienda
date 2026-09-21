/* El botón "Instalar la app": el evento del navegador se guarda una vez y se
   usa una vez. Correr: npx tsx src/lib/instalar-app.check.ts */

import { readFileSync } from "node:fs";

let fallas = 0;
function check(id: string, ok: boolean, que: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${que}`);
  if (!ok) fallas++;
}

/* Un `window` de mentira con lo único que usa el módulo. Va ANTES del import:
   el módulo mira `typeof window` al llamar, no al cargar, pero mejor no depender. */
const oyentes: Record<string, ((e: unknown) => void)[]> = {};
(globalThis as unknown as { window: unknown }).window = {
  addEventListener: (n: string, f: (e: unknown) => void) => { (oyentes[n] ??= []).push(f); },
};

async function main() {
  const { escucharInstalacion, instalarLaApp } = await import("./instalar-app");
  escucharInstalacion(); escucharInstalacion();
  check("INST-A", (oyentes.beforeinstallprompt ?? []).length === 1 && (oyentes.appinstalled ?? []).length === 1,
    "escucha una sola vez aunque se la llame dos");
  check("INST-B", (await instalarLaApp()) === false, "sin evento guardado, instalar no hace nada");

  let prevented = false; let prompted = 0;
  const evento = { preventDefault: () => { prevented = true; }, prompt: async () => { prompted++; }, userChoice: Promise.resolve({ outcome: "accepted" as const }) };
  for (const f of oyentes.beforeinstallprompt) f(evento);
  check("INST-C", prevented, "le dice al navegador que no muestre su cartel solo: lo mostramos nosotros con el botón");
  check("INST-D", (await instalarLaApp()) === true && prompted === 1, "instalar abre el cartel del navegador y contesta si aceptó");
  check("INST-E", (await instalarLaApp()) === false && prompted === 1, "el evento se usa una sola vez: el navegador no deja repetirlo");

  const pwa = readFileSync("src/components/PWAManager.tsx", "utf8");
  const avisos = readFileSync("src/app/digitales/configuracion/AvisosDeVenta.tsx", "utf8");
  check("INST-F", /useEffect\(\(\) => \{ escucharInstalacion\(\); \}, \[\]\);/.test(pwa)
    && /useSePuedeInstalar\(\)/.test(avisos) && /Instalar la app/.test(avisos) && /!instalada && sePuedeInstalar/.test(avisos) && /Agregar a inicio/.test(avisos),
    "el layout guarda el evento, y la sección de avisos muestra el botón sólo si el navegador lo ofreció y no está instalada; en iPhone, las instrucciones");

  if (fallas) { console.log(`\n${fallas} fallaron.`); process.exit(1); }
  console.log("\nTodo bien.");
}
main();
