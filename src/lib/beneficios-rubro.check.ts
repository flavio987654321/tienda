/**
 * Chequeo de las promesas de la vidriera. Se corre a mano:
 *
 *   npx tsx src/lib/beneficios-rubro.check.ts
 *
 * ── Qué se cuida ─────────────────────────────────────────────────────────────
 *
 * Cada template abre con una barra de anuncios y tres fichas de garantía, y los
 * textos por defecto están escritos a mano dentro de cada uno. Todos decían lo
 * mismo: **"Envío gratis en compras mayores a $30.000"**.
 *
 * En una tienda que vende archivos descargables eso es mentira: no envía nada.
 * Y "cambios sin cargo hasta 30 días" es peor todavía, porque en contenido
 * digital el derecho a arrepentirse cambia una vez que el archivo se bajó — la
 * tienda estaría prometiendo algo que después no puede cumplir.
 *
 * El bug no rompe nada: la tienda carga, se ve linda y vende. Sólo miente. Por
 * eso está acá y no en la cabeza de nadie.
 *
 * ── La trampa que este chequeo existe para evitar ────────────────────────────
 *
 * Habilitar un template para el rubro digital es sumar una palabra a una lista
 * (`TEMPLATE_TIPO_TIENDA`). Es tan fácil que nadie se acuerda de que además hay
 * que arreglarle los textos. Este chequeo cruza las dos cosas: si un template
 * está habilitado para un rubro sin envío, tiene que estar leyendo los textos
 * del rubro y no los suyos escritos a mano.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { anunciosPorDefecto, garantiasPorDefecto, anunciosDeRubro } from "./beneficios-rubro";
import { TEMPLATE_TIPO_TIENDA } from "../types/store-config";
import { STORE_TYPES } from "./storeTypes";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

console.log("\nTextos por rubro\n");

const RUBROS_SIN_ENVIO = STORE_TYPES.filter((t) => t.requiereArchivo).map((t) => t.id);
chequear("hay al menos un rubro que entrega por descarga", RUBROS_SIN_ENVIO.length > 0, RUBROS_SIN_ENVIO);

for (const rubro of RUBROS_SIN_ENVIO) {
  const anuncios = anunciosPorDefecto(rubro).join(" | ").toLowerCase();
  const garantias = garantiasPorDefecto(rubro).map((g) => `${g.title} ${g.desc}`).join(" | ").toLowerCase();
  chequear(`${rubro}: los anuncios no prometen envío`, !anuncios.includes("envío") && !anuncios.includes("envio"), anuncios);
  chequear(`${rubro}: las garantías no prometen envío`, !garantias.includes("envío") && !garantias.includes("envio"), garantias);
  chequear(`${rubro}: las garantías no prometen cambios sin cargo`, !garantias.includes("cambios sin cargo"), garantias);
}

// El rubro con envío conserva lo suyo: el arreglo no puede aplanar a los demás.
chequear("ROPA sigue prometiendo envío gratis", anunciosPorDefecto("ROPA").join(" ").toLowerCase().includes("envío gratis"));
chequear(
  "un template con voz propia la conserva cuando el rubro SÍ envía",
  anunciosDeRubro("ROPA", ["🌿 propio del template"])[0] === "🌿 propio del template"
);

console.log("\nTemplates habilitados para un rubro sin envío\n");

/* Dónde vive cada template. Se arma a mano porque el registro importa los
   componentes de React y este chequeo corre en Node sin JSX. */
const ARCHIVO_DE: Record<string, string> = {
  "aire": "Aire", "boho-terra": "BohoTerra", "urban-pulse": "UrbanPulse",
  "chic-paris": "ChicParis", "aurora": "Aurora", "auto-motor": "AutoMotor",
  "auto-drive": "AutoDrive", "electro-prime": "ElectroPrime",
  "tech-nova": "TechNova", "home-studio": "HomeStudio", "casa-clara": "CasaClara",
};

for (const [templateId, rubros] of Object.entries(TEMPLATE_TIPO_TIENDA)) {
  const habilitadoSinEnvio = rubros.some((r) => RUBROS_SIN_ENVIO.includes(r));
  if (!habilitadoSinEnvio) continue;

  const archivo = ARCHIVO_DE[templateId];
  chequear(`${templateId}: se sabe en qué archivo vive`, !!archivo, templateId);
  if (!archivo) continue;

  const fuente = leer(`src/components/store/templates/${archivo}.tsx`);
  chequear(
    `${templateId}: lee los textos del rubro (está habilitado para ${rubros.filter((r) => RUBROS_SIN_ENVIO.includes(r)).join(", ")})`,
    fuente.includes("beneficios-rubro"),
    `falta importar lib/beneficios-rubro en ${archivo}.tsx`
  );
}

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
