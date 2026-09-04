/**
 * Chequeos del primer botón de IA: armar el embudo.
 *
 *   npx tsx src/lib/embudo-ia.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * Dos cosas, y las dos son de confianza.
 *
 * **Lo que vuelve del modelo no es un dato: es una propuesta.** Va a terminar
 * dibujada en una página pública que cobra plata, así que pasa por la misma
 * lima que el texto de una persona. El esquema de la herramienta garantiza que
 * `precio` sea un número — no que sea un número sensato.
 *
 * **Y la IA cuesta plata.** Ninguna función sale sin tope, ni en el plan más
 * caro, y los topes globales van últimos porque los contadores suman aunque el
 * pedido se rechace.
 */

import { readFileSync } from "fs";
import {
  normalizarEmbudo, precioSano, INSTRUCCIONES, ESQUEMA_DEL_EMBUDO,
  LARGO_TITULO_IA, LARGO_BAJADA_IA, PRECIO_MINIMO_IA, PRECIO_MAXIMO_IA,
  MINIMO_DEL_NICHO, LARGO_DEL_NICHO,
} from "./embudo-ia";
import { LARGO_TITULO, PRECIO_MAXIMO } from "./productos-digitales";
import {
  permitirGeneracion, DIARIO_POR_PLAN, RAFAGA_IA, GLOBAL_DIARIO, GLOBAL_PRUEBA_DIARIO,
} from "./ia-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const bueno = {
  principal: { titulo: "Arreglá tu auto sin taller", bajada: "Vas a poder hacer los arreglos básicos.", precio: 25000 },
  bono: { titulo: "Checklist de mantenimiento", bajada: "Para tener a mano.", precio: 0 },
  upsell: { titulo: "Los 40 arreglos completos", bajada: "El paso siguiente.", precio: 45000 },
};

/* ── Lo que vuelve del modelo ───────────────────────────────────────────── */

check("EMB-A", normalizarEmbudo(bueno) !== null, "una respuesta bien formada pasa");
check("EMB-B",
  normalizarEmbudo(null) === null && normalizarEmbudo("texto") === null && normalizarEmbudo(42) === null,
  "basura en vez de un objeto no pasa");

/* Falta una ficha entera: media pantalla con una tarjeta buena y dos vacías es
   peor que decir "probá de nuevo". */
check("EMB-C",
  normalizarEmbudo({ principal: bueno.principal, bono: bueno.bono }) === null,
  "si falta una de las tres fichas, no se muestra nada");

/* Un título vacío es una tarjeta sin nombre. Una bajada vacía se completa a
   mano en dos minutos, así que ésa sí se deja pasar. */
check("EMB-D",
  normalizarEmbudo({ ...bueno, principal: { ...bueno.principal, titulo: "   " } }) === null,
  "un título que queda vacío al limpiarlo tumba la generación");
check("EMB-E",
  normalizarEmbudo({ ...bueno, principal: { ...bueno.principal, bajada: 123 } })?.principal.bajada === "",
  "una bajada que no vino se deja vacía, no tumba nada");

/* ⚠️ Un bono que se cobra no es un regalo. Da igual qué precio venga. */
check("EMB-F",
  normalizarEmbudo({ ...bueno, bono: { ...bueno.bono, precio: 9999 } })?.bono.precio === 0,
  "el bono va en 0 aunque el modelo le ponga precio");

/* Del modelo puede volver NaN o Infinity: el esquema dice "number" y los dos lo
   son. Los dos pasan cualquier comparación hasta que un total sale en "NaN". */
check("EMB-G",
  precioSano(Number.NaN) === PRECIO_MINIMO_IA && precioSano(Number.POSITIVE_INFINITY) === PRECIO_MINIMO_IA,
  "NaN e Infinity no llegan a la pantalla");
check("EMB-H",
  precioSano(-500) === PRECIO_MINIMO_IA && precioSano(99_000_000) === PRECIO_MAXIMO_IA,
  "un precio fuera de rango se acomoda al borde, no tira las tres fichas");
check("EMB-I", precioSano(24_999.6) === 25_000, "un precio con decimales se redondea");
check("EMB-J", precioSano("25000") === PRECIO_MINIMO_IA && precioSano(null) === PRECIO_MINIMO_IA,
  "un precio que no es número tampoco pasa");

/* Lo que vuelve se dibuja en una página pública: un salto de línea o un
   carácter de control adentro de un título rompe el mismo renglón que rompería
   si lo hubiera tipeado una persona. */
const sucio = normalizarEmbudo({
  ...bueno,
  principal: { ...bueno.principal, titulo: "Arreglá\ntu\tauto", bajada: "Una\nbajada" },
});
check("EMB-K",
  !/[\n\t]/.test(sucio?.principal.titulo ?? "x\n") && !/[\n\t]/.test(sucio?.principal.bajada ?? "x\n"),
  "los saltos de línea y los caracteres de control se limpian");

const largo = normalizarEmbudo({
  ...bueno,
  principal: { ...bueno.principal, titulo: "a".repeat(500), bajada: "b".repeat(5000) },
});
check("EMB-L",
  (largo?.principal.titulo.length ?? 0) === LARGO_TITULO_IA &&
  (largo?.principal.bajada.length ?? 0) === LARGO_BAJADA_IA,
  "un modelo que se va de largo se corta acá, no en el CSS");

/* ⚠️ COHERENCIA CON LA RUTA DE CREAR. Si esta lima aceptara más de lo que acepta
   el producto, la IA propondría fichas que la creación rechaza: tres tarjetas
   lindas que no se pueden guardar. */
check("EMB-M", LARGO_TITULO_IA <= LARGO_TITULO,
  `el título que acepta la IA entra en el del producto (${LARGO_TITULO_IA} ≤ ${LARGO_TITULO})`);
check("EMB-N", PRECIO_MAXIMO_IA <= PRECIO_MAXIMO && PRECIO_MINIMO_IA > 0,
  "el precio que acepta la IA entra en el del producto, y nunca es 0 ni negativo");

/* ── El prompt ──────────────────────────────────────────────────────────── */

/* Lo que NO puede inventar. No es una preferencia de estilo: una promesa de
   resultados es publicidad engañosa, y quien responde es quien vende. */
check("EMB-O",
  /No prometas resultados/.test(INSTRUCCIONES) && /publicidad engañosa/.test(INSTRUCCIONES),
  "el prompt prohíbe prometer resultados, y dice por qué");
check("EMB-P",
  /No inventes títulos, matrículas/.test(INSTRUCCIONES) &&
  /salud, medicamentos, inversiones ni apuestas/.test(INSTRUCCIONES),
  "y prohíbe inventar respaldos, y los rubros que no se tocan");

/* Las tres fichas son obligatorias en el esquema: es lo que hace que la forma la
   garantice la API y no una frase pidiendo JSON. */
check("EMB-Q",
  ESQUEMA_DEL_EMBUDO.required.length === 3 &&
  ["principal", "bono", "upsell"].every((k) => ESQUEMA_DEL_EMBUDO.required.includes(k)),
  "el esquema exige las tres fichas");

/* La descripción del bono le explica al modelo que es un regalo. Está adentro
   del esquema a propósito: es la parte del prompt que más se confunde. */
check("EMB-R", /Siempre 0: el bono es gratis/.test(JSON.stringify(ESQUEMA_DEL_EMBUDO)),
  "el esquema le dice al modelo que el bono va gratis");

/* ── La ruta ────────────────────────────────────────────────────────────── */

const ruta = readFileSync("src/app/api/digitales/ia/embudo/route.ts", "utf8");

/* ⚠️ Rol DIGITAL, no OWNER. Es el error que ya está cometido al revés en la ruta
   de Sasha, que pide OWNER y por eso le contesta 403 a una cuenta digital. */
check("RUT-A", /user\.role !== "DIGITAL"/.test(ruta) && !/role !== "OWNER"/.test(ruta),
  "la puerta es el rol DIGITAL, no el de tiendas");

/* Los topes van ANTES de leer el cuerpo y antes de tocar la base: un pedido
   rechazado no tiene que costar nada. */
check("RUT-B",
  ruta.indexOf("permitirGeneracion") < ruta.indexOf("req.json()"),
  "los topes se aplican antes de leer el pedido");

/* ⚠️ Y si Redis no contesta, se FRENA. Del otro lado hay algo que se paga: "no
   pude contar" tiene que cortar, nunca dejar pasar. */
check("RUT-C",
  /catch \(e\) \{[\s\S]{0,200}no se pudieron contar los topes, se rechaza[\s\S]{0,300}status: 503/.test(ruta),
  "si no se puede contar el tope, se rechaza en vez de dejar pasar");

/* ⚠️ NO GUARDA NADA. Lo que se publica en una página que cobra lo firma quien
   vende: tiene que haberlo leído antes. Y así los topes del plan y la validación
   de campos siguen viviendo en un solo lugar, la ruta de crear. */
check("RUT-D",
  !/prisma\.product\.create/.test(ruta) && !/prisma\.product\.createMany/.test(ruta),
  "propone y no crea: ningún producto entra a la base por acá");

/* La forma la garantiza la API, no una frase pidiendo JSON. */
check("RUT-E",
  /tool_choice: \{ type: "tool", name: "armar_embudo" \}/.test(ruta),
  "la respuesta se fuerza por herramienta, no por texto");

/* Y lo que vuelve pasa igual por la lima antes de que nadie lo vea. */
check("RUT-F", /normalizarEmbudo\(/.test(ruta), "lo que devuelve el modelo se normaliza antes de mostrarlo");

/* El texto de la persona es lo único no confiable del pedido, así que va
   marcado y al final. Lo que de verdad lo frena es la forma de la salida. */
check("RUT-G", /<negocio>\\n\$\{nicho\}\\n<\/negocio>/.test(ruta),
  "lo que escribe la persona va marcado y al final del mensaje");

/* Y viene recortado y con mínimo: con dos palabras no se puede armar nada, y
   sin tope alguien manda un libro entero por el mismo precio que una frase. */
check("RUT-H",
  new RegExp(`slice\\(0, LARGO_DEL_NICHO\\)`).test(ruta) && /< MINIMO_DEL_NICHO/.test(ruta) &&
  MINIMO_DEL_NICHO > 0 && LARGO_DEL_NICHO <= 2000,
  "el texto de la persona entra recortado y con un mínimo");

/* Sin la clave no se promete nada: la persona aprieta, espera, y recibe el error
   de una librería. */
check("RUT-I", /if \(!process\.env\.ANTHROPIC_API_KEY\)/.test(ruta),
  "sin la clave de Anthropic se avisa antes de hacer esperar");

/* ── Los topes ──────────────────────────────────────────────────────────── */

/* Ninguno puede ser cero ni infinito, **ni en el plan más caro**. Es la regla
   que se escribió mirando el "Todos los ebooks con IA" de la competencia. */
check("TOP-A",
  Object.values(DIARIO_POR_PLAN).every((n) => Number.isFinite(n) && n > 0) &&
  RAFAGA_IA > 0 && GLOBAL_DIARIO > 0 && GLOBAL_PRUEBA_DIARIO > 0,
  "todos los topes existen y ninguno es infinito");

/* El plan más caro lleva el tope más alto, no ninguno. Y el global de pruebas va
   por debajo del total: es un presupuesto chico y aparte, para que el que abusa
   no deje sin IA al que paga. */
check("TOP-B",
  DIARIO_POR_PLAN.FREE < DIARIO_POR_PLAN.STARTER && DIARIO_POR_PLAN.STARTER < DIARIO_POR_PLAN.PRO,
  "el tope diario sube con el plan");
check("TOP-C", GLOBAL_PRUEBA_DIARIO < GLOBAL_DIARIO,
  "las cuentas en prueba compiten contra un presupuesto más chico y aparte");

/* ⚠️ EL ORDEN. Los contadores suman aunque el pedido se rechace, así que los
   globales van ÚLTIMOS: si fueran primero, alguien ya bloqueado por su tope
   personal seguiría comiéndose el presupuesto de todos con cada intento. */
/* Los de los topes son los únicos que necesitan esperar, así que van adentro de
   una función: `tsx` compila estos archivos a CommonJS y ahí un `await` suelto
   arriba de todo no existe. */
async function losTopes() {
  const llamadas: string[] = [];
  const contadorQueCorta = (clave: string) => {
    llamadas.push(clave);
    /* La ráfaga corta al primer intento; lo que importa es que después de cortar
       no se haya tocado ningún contador global. */
    return Promise.resolve({ permitido: false, cuenta: 99 });
  };
  await permitirGeneracion(
    { userId: "u1", tier: "FREE", enPrueba: true, day: "2026-09-04", que: "embudo" },
    contadorQueCorta,
  );
  check("TOP-D",
    llamadas.length === 1 && llamadas[0].startsWith("ia-dig:embudo:") &&
    !llamadas.some((c) => c.includes("global")),
    "cortado por ráfaga, no se toca ningún contador global");

  /* Y con todo permitido, se cuentan las cuatro capas en orden. */
  const todas: string[] = [];
  const veredicto = await permitirGeneracion(
    { userId: "u1", tier: "PRO", enPrueba: true, day: "2026-09-04", que: "embudo" },
    (c) => { todas.push(c); return Promise.resolve({ permitido: true, cuenta: 1 }); },
  );
  check("TOP-E",
    veredicto.permitido === true && todas.length === 4 &&
    todas[0].startsWith("ia-dig:") && todas[1].startsWith("ia-dig-dia:") &&
    todas[2].startsWith("ia-dig-prueba-dia:") && todas[3].startsWith("ia-dig-global-dia:"),
    "las cuatro capas se cuentan, y los globales van últimos");

  /* Una cuenta que paga no toca el presupuesto de las pruebas. */
  const dePago: string[] = [];
  await permitirGeneracion(
    { userId: "u2", tier: "PRO", enPrueba: false, day: "2026-09-04", que: "embudo" },
    (c) => { dePago.push(c); return Promise.resolve({ permitido: true, cuenta: 1 }); },
  );
  check("TOP-F", !dePago.some((c) => c.includes("prueba")),
    "una cuenta que paga no gasta el presupuesto de las cuentas en prueba");

  /* El diario es de la CUENTA y no del botón: contarlos por separado le daría a
     una cuenta Free el doble de generaciones que las que dice su número. */
  check("TOP-G",
    todas[1] === "ia-dig-dia:u1" && !todas[1].includes("embudo"),
    "los dos botones baratos comparten el techo diario de la cuenta");
}

losTopes().then(() => {
  console.log(fallos === 0
    ? "\nok — lo que devuelve el modelo se lima, y ninguna generación sale sin tope"
    : `\nFALLA — ${fallos} chequeo(s) del embudo con IA`);
  process.exit(fallos === 0 ? 0 : 1);
});
