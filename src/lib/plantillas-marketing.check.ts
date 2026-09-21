/**
 * Chequeos de los ejemplos de Marketing. Se corre con:
 *
 *   npx tsx src/lib/plantillas-marketing.check.ts
 *
 * Lo que importa: que cada idea de cupón pase por la MISMA validación que
 * la ruta (un ejemplo que después no se puede crear es peor que ninguno),
 * que las plantillas de mail pasen por la de correos y no dejen ningún
 * `{producto}` sin reemplazar, y que ningún consejo traiga un porcentaje o
 * una estadística inventada.
 */

import { readFileSync } from "node:fs";
import { IDEAS_DE_CUPON, cuponDeLaIdea, PLANTILLAS_DE_CORREO, correoDeLaPlantilla, CONSEJO_DE_CUPON, CONSEJO_DE_CORREO, CONSEJO_DE_ENLACES, CONSEJO_DE_MEDICION } from "./plantillas-marketing";
import { validarCuponNuevo } from "./cupones-digitales";
import { validarCorreoNuevo } from "./correos-compradores";
import { getArgentinaDayKey } from "./fechas-comerciales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

/* Una fecha fija para las cuentas de días (CUP-C: el resultado tiene que ser
   siempre el mismo), y la de HOY de verdad para validar (CUP-B):
   `validarCuponNuevo` rechaza un vencimiento que ya pasó, así que con la fija
   este chequeo empezó a fallar solo el 19/09/26, cuatro días después de
   escribirse, sin que nada estuviera roto. */
const HOY = "2026-09-15";
const HOY_DE_VERDAD = getArgentinaDayKey();

/* ── Cupones ─────────────────────────────────────────────────────────────── */

check("CUP-A", IDEAS_DE_CUPON.length === 3 && new Set(IDEAS_DE_CUPON.map((i) => i.codigo)).size === 3, "tres ideas, con códigos distintos");
check("CUP-B", IDEAS_DE_CUPON.every((i) => validarCuponNuevo(cuponDeLaIdea(i, HOY_DE_VERDAD)).ok), "cada idea pasa por validarCuponNuevo: lo que se sugiere se puede crear");
const lanz = cuponDeLaIdea(IDEAS_DE_CUPON.find((i) => i.clave === "lanzamiento")!, HOY);
check("CUP-C", lanz.venceAt === "2026-09-22" && lanz.topeUsos === "50" && cuponDeLaIdea(IDEAS_DE_CUPON.find((i) => i.clave === "volver")!, HOY).venceAt === "", "el vencimiento se cuenta desde hoy; sin vida es sin vencimiento");
check("CUP-D", IDEAS_DE_CUPON.every((i) => i.porQue.length > 40 && !/\d+ ?% de (la gente|los compradores|las personas)/i.test(i.porQue)), "cada idea dice por qué, sin estadísticas inventadas");

/* ── Mails ───────────────────────────────────────────────────────────────── */

check("MAIL-A", PLANTILLAS_DE_CORREO.length === 3 && PLANTILLAS_DE_CORREO.every((p) => validarCorreoNuevo(correoDeLaPlantilla(p, "Mecánica fácil")).ok), "tres plantillas, y cada una pasa por validarCorreoNuevo");
check("MAIL-B", PLANTILLAS_DE_CORREO.every((p) => { const c = correoDeLaPlantilla(p, "Guía de frenos"); return !/\{producto\}/.test(c.asunto + c.cuerpo) && c.asunto.includes("Guía de frenos"); }), "el nombre del producto queda puesto en todos lados");
check("MAIL-C", correoDeLaPlantilla(PLANTILLAS_DE_CORREO[0], null).asunto === "Salió el material" && correoDeLaPlantilla(PLANTILLAS_DE_CORREO[0], "  ").cuerpo.includes("el material"), "sin producto elegido se lee bien igual");
check("MAIL-D", PLANTILLAS_DE_CORREO.every((p) => !/^Hola/i.test(p.cuerpo)), "las plantillas no arrancan con Hola: el saludo con el nombre lo pone el envío");
check("MAIL-E", PLANTILLAS_DE_CORREO.filter((p) => p.conBoton).length === 1 && PLANTILLAS_DE_CORREO[0].conBoton, "sólo el lanzamiento sugiere el botón: un aviso de actualización no tiene a dónde llevar");

/* ── Consejos ────────────────────────────────────────────────────────────── */

const consejos = [CONSEJO_DE_CUPON, CONSEJO_DE_CORREO, CONSEJO_DE_ENLACES, CONSEJO_DE_MEDICION];
check("CON-A", consejos.every((c) => c.length > 80 && c.length < 420), "cuatro consejos, de dos a cuatro líneas");
check("CON-B", consejos.every((c) => !/\d+ ?% (de la gente|de los compradores|más|de conversión)|el \d+ ?%/i.test(c)), "ningún consejo trae un porcentaje que no se pueda defender");

/* ── Las pantallas ───────────────────────────────────────────────────────── */

const cupones = leer("src/app/digitales/marketing/cupones/CuponesClient.tsx");
const compradores = leer("src/app/digitales/marketing/compradores/CompradoresClient.tsx");
const enlaces = leer("src/app/digitales/marketing/enlaces/EnlacesClient.tsx");
const medicion = leer("src/app/digitales/productos/[id]/direccion/MedicionDelProducto.tsx");
const direcciones = leer("src/app/digitales/Direcciones.tsx");
const inicio = leer("src/app/digitales/page.tsx");

check("PANT-A", /IDEAS_DE_CUPON\.map/.test(cupones) && /usarIdea\(i\.clave\)/.test(cupones) && /setAbierto\(true\)/.test(cupones.slice(cupones.indexOf("function usarIdea"))) && /<ConsejoDeUso>\{CONSEJO_DE_CUPON\}/.test(cupones),
  "Cupones: las tres ideas cargan el formulario y lo abren; el consejo va adentro del formulario");
check("PANT-B", /PLANTILLAS_DE_CORREO\.map/.test(compradores) && /usarPlantilla\(p\.clave\)/.test(compradores) && /<ConsejoDeUso>\{CONSEJO_DE_CORREO\}/.test(compradores),
  "Mail a compradores: las plantillas cargan asunto y mensaje; el consejo va antes de mandar");
check("PANT-C", /<ConsejoDeUso>\{CONSEJO_DE_ENLACES\}/.test(enlaces) && /\{CONSEJO_DE_MEDICION\}/.test(medicion), "Enlaces y Medición llevan su consejo");
check("PANT-D", /rotulo: "Directo al pago"/.test(direcciones) && /RUTA_DE_PAGO = "\/pagar"/.test(direcciones) && /conPago && principal/.test(direcciones) && /conPago\n/.test(inicio),
  "Inicio dice qué es cada dirección y muestra el link directo al pago sobre la principal");
check("PANT-E", /Sigue andando siempre, en todos los planes/.test(direcciones), "con dominio propio, la de TiendaApps se explica como la que no se apaga nunca");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
