/**
 * Chequeos del tema del panel de Productos Digitales. Se corre con:
 *
 *   npx tsx src/lib/tema-digitales.check.ts
 *
 * Lo que se prueba acá no es cosmética: el tema decide el color del fondo, del
 * texto y de los desplegables del navegador. Si "Automático" se equivoca, la
 * pantalla queda con texto claro sobre fondo claro y no se lee nada.
 *
 * El grueso son fakes del navegador, porque esto corre en Node y acá no hay
 * `window`, ni `document`, ni `localStorage`.
 */

import { readFileSync } from "fs";
import {
  TEMAS,
  CLAVE_TEMA,
  ATRIBUTO_TEMA,
  temaDe,
  resolverTema,
  aplicarTema,
  temaGuardado,
  escucharSistema,
  SCRIPT_TEMA,
} from "./tema-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── El navegador de mentira ──────────────────────────────────────────────── */

type Oyente = () => void;

/**
 * Arma un navegador falso y lo deja puesto en las variables globales. Devuelve
 * las perillas para moverlo desde la prueba.
 */
function montarNavegador(opciones: { oscuroSistema: boolean; conAddEventListener?: boolean }) {
  const { oscuroSistema, conAddEventListener = true } = opciones;

  const oyentes = new Set<Oyente>();
  const guardado = new Map<string, string>();
  const atributos = new Map<string, string>();
  const style = { colorScheme: "" };

  const mq: Record<string, unknown> = { matches: oscuroSistema };
  if (conAddEventListener) {
    mq.addEventListener = (_: string, cb: Oyente) => { oyentes.add(cb); };
    mq.removeEventListener = (_: string, cb: Oyente) => { oyentes.delete(cb); };
  } else {
    /* El Safari anterior al 14: sólo el `addListener` viejo. */
    mq.addListener = (cb: Oyente) => { oyentes.add(cb); };
    mq.removeListener = (cb: Oyente) => { oyentes.delete(cb); };
  }

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = { matchMedia: () => mq };
  g.document = { documentElement: { setAttribute: (k: string, v: string) => { atributos.set(k, v); }, style } };
  g.localStorage = {
    getItem: (k: string) => guardado.get(k) ?? null,
    setItem: (k: string, v: string) => { guardado.set(k, v); },
  };

  return {
    /** Simula que el sistema operativo cambió de tema. */
    cambiarSistema(aOscuro: boolean) {
      mq.matches = aOscuro;
      for (const cb of oyentes) cb();
    },
    pintado: () => atributos.get(ATRIBUTO_TEMA),
    colorScheme: () => style.colorScheme,
    oyentes: () => oyentes.size,
    guardar: (v: string) => { guardado.set(CLAVE_TEMA, v); },
  };
}

function desmontarNavegador() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.window;
  delete g.document;
  delete g.localStorage;
}

/* ── La lista de temas ────────────────────────────────────────────────────── */

check("TEMA-A", TEMAS.length === 3 && TEMAS.includes("auto"), "hay tres temas y uno es 'auto'");

/* ⚠️ Lo que se guarda viene de `localStorage`, o sea de un lado que la persona
   puede editar a mano desde las herramientas del navegador. Si un valor
   cualquiera entrara como tema, terminaría de atributo en el HTML. */
check("TEMA-B", [null, undefined, "", "dark", "AUTO", "auto ", 5, {}].every((v) => temaDe(v) === null),
  "cualquier cosa que no sea uno de los tres es null, no un valor por defecto");
check("TEMA-C", temaDe("oscuro") === "oscuro", "y uno válido pasa");

/* ── Resolver "auto" ──────────────────────────────────────────────────────── */

{
  const nav = montarNavegador({ oscuroSistema: true });

  check("RES-A", resolverTema("claro") === "claro" && resolverTema("oscuro") === "oscuro",
    "elegido a mano se respeta tal cual, sin preguntarle al sistema");
  check("RES-B", resolverTema("auto") === "oscuro", "'auto' con el sistema en oscuro da oscuro");

  nav.cambiarSistema(false);
  check("RES-C", resolverTema("auto") === "claro", "y con el sistema en claro da claro");
}

/* Sin `window` —o sea en el servidor— tiene que devolver algo y no reventar: se
   dibuja en claro y el script del layout lo corrige antes de que se vea. */
desmontarNavegador();
check("RES-D", resolverTema("auto") === "claro", "en el servidor, sin window, no tira: cae en claro");

/* ── Pintar ──────────────────────────────────────────────────────────────── */

{
  const nav = montarNavegador({ oscuroSistema: false });
  aplicarTema("oscuro");
  check("PIN-A", nav.pintado() === "oscuro", "pinta el atributo que lee la variante del CSS");

  /* ⚠️ Y NO toca el `color-scheme` en línea. Eso cuelga del atributo desde el
     CSS, porque `next-themes` escribe el suyo en línea sobre `<html>` y en línea
     le gana a cualquier JS que corra antes: el panel en claro quedaba con la
     barra de scroll y los desplegables oscuros. Dos mecanismos para lo mismo es
     lo que hacía que uno pisara al otro. */
  check("PIN-B", nav.colorScheme() === "",
    "y NO escribe el `color-scheme` en línea: eso lo pone el CSS, que no pierde la carrera");

  aplicarTema("claro");
  check("PIN-C", nav.pintado() === "claro", "y al revés también");

  /* ⚠️ Se guarda "auto", NO lo que se resolvió. Guardando "claro" al elegir
     "Automático", la preferencia dejaría de ser automática apenas se recarga. */
  aplicarTema("auto");
  check("PIN-D", temaGuardado() === "auto", "elegir 'Automático' guarda 'auto', no el color que salió");
  check("PIN-E", nav.pintado() === "claro", "pero pinta el color resuelto contra el sistema");
}

/* ── La escucha del sistema ──────────────────────────────────────────────── */

/* ⚠️ EL chequeo de este archivo. El script del layout lee `prefers-color-scheme`
   una sola vez, antes del primer dibujo. Windows y macOS cambian de tema solos
   por horario: un panel abierto a las 19:00 se quedaba en claro toda la noche. */
{
  const nav = montarNavegador({ oscuroSistema: false });
  aplicarTema("auto");
  const cortar = escucharSistema();

  check("ESC-A", nav.oyentes() === 1, "se suscribe al cambio de tema del sistema");

  nav.cambiarSistema(true);
  check("ESC-B", nav.pintado() === "oscuro", "el panel abierto se repinta cuando anochece");

  nav.cambiarSistema(false);
  check("ESC-C", nav.pintado() === "claro", "y vuelve solo a la mañana");

  cortar();
  check("ESC-D", nav.oyentes() === 0, "y se desuscribe cuando el panel se desmonta");

  nav.cambiarSistema(true);
  check("ESC-E", nav.pintado() === "claro", "después de cortar, un cambio del sistema ya no toca nada");
}

/* ⚠️ La preferencia de la persona gana. Si eligió "Claro" a mano, que anochezca
   NO le puede dar vuelta la pantalla. Por eso `escucharSistema` relee lo
   guardado en cada aviso en vez de mirarlo una vez al suscribirse. */
{
  const nav = montarNavegador({ oscuroSistema: false });
  aplicarTema("claro");
  const cortar = escucharSistema();

  nav.cambiarSistema(true);
  check("ESC-F", nav.pintado() === "claro",
    "con 'Claro' elegido a mano, el sistema no manda: la pantalla no se da vuelta sola");

  cortar();
}

/* Y el cambio de preferencia se toma en caliente, sin volver a suscribirse: la
   pantalla de Configuración llama a `aplicarTema` y nada más. */
{
  const nav = montarNavegador({ oscuroSistema: false });
  aplicarTema("claro");
  const cortar = escucharSistema();

  aplicarTema("auto");
  nav.cambiarSistema(true);
  check("ESC-G", nav.pintado() === "oscuro",
    "pasar a 'Automático' con el panel abierto ya deja escuchando, sin recargar");

  cortar();
}

/* El Safari viejo, que sólo tiene el `addListener` obsoleto. */
{
  const nav = montarNavegador({ oscuroSistema: false, conAddEventListener: false });
  aplicarTema("auto");
  const cortar = escucharSistema();

  nav.cambiarSistema(true);
  check("ESC-H", nav.pintado() === "oscuro", "en Safari viejo escucha por el camino de atrás");
  cortar();
  check("ESC-I", nav.oyentes() === 0, "y también se desuscribe");
}

/* Hay navegadores donde `matchMedia` tira —el almacenamiento bloqueado, por
   ejemplo—. El panel tiene que seguir andando: pierde la escucha, no la página. */
{
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = { matchMedia: () => { throw new Error("bloqueado"); } };
  let tiro = false;
  let cortar: (() => void) | null = null;
  try { cortar = escucharSistema(); } catch { tiro = true; }
  check("ESC-J", !tiro && typeof cortar === "function",
    "si `matchMedia` tira, devuelve una función que no hace nada en vez de romper");
  cortar?.();
}

desmontarNavegador();
check("ESC-K", typeof escucharSistema() === "function",
  "en el servidor, sin window, tampoco tira");

/* ── Que esté enchufado ──────────────────────────────────────────────────── */

/* ⚠️ Todo lo de arriba puede estar perfecto y no servir de nada si el
   componente no está montado. Y va en el LAYOUT y no en Configuración: el tema
   es de todo el panel, y parado en Configuración es justo donde menos falta
   hace que se actualice solo. */
{
  const layout = readFileSync("src/app/digitales/layout.tsx", "utf8");
  check("MONT-A", /<TemaDelPanel\s*\/>/.test(layout), "el layout del panel monta <TemaDelPanel />");
  check("MONT-B", /SCRIPT_TEMA/.test(layout), "y sigue pintando el tema antes del primer dibujo");

  const comp = readFileSync("src/app/digitales/TemaDelPanel.tsx", "utf8");
  check("MONT-C", /^"use client"/m.test(comp), "el componente es de cliente: sin eso el efecto nunca corre");
  check("MONT-D", /escucharSistema/.test(comp) && !/matchMedia/.test(comp),
    "y usa la regla compartida en vez de su propia copia de `matchMedia`");

  /* ⚠️ Al panel también se llega con un `Link` desde la web, y ahí no hay carga
     de página: React inserta el `<script>` del layout con innerHTML, y un script
     insertado así NO se ejecuta. Sin este pintado al montar, entrando por ese
     camino el atributo no se escribía y el tema oscuro se veía claro. */
  check("MONT-E", /aplicarTema\(temaGuardado\(\)\)/.test(comp),
    "pinta el tema al montar: entrando con un Link el script del layout no corre");

  /* ⚠️ Y lo saca al salir. El atributo vive en `<html>`, que es de todo el sitio:
     volviendo para atrás —que también es navegación de React— se quedaba pegado,
     y con él el `color-scheme` que le cuelga. */
  check("MONT-F", /removeAttribute\(ATRIBUTO_TEMA\)/.test(comp),
    "y levanta el atributo al salir del panel, para no dejárselo puesto al resto del sitio");
}

/* El script inline y el resto tienen que hablar del mismo atributo y la misma
   clave. Escritos a mano en cada lado, cambiar uno rompía los otros en silencio. */
check("SCR-A", SCRIPT_TEMA.includes(JSON.stringify(CLAVE_TEMA)), "el script usa la misma clave de guardado");
check("SCR-B", SCRIPT_TEMA.includes(JSON.stringify(ATRIBUTO_TEMA)), "y el mismo atributo");
check("SCR-C", /try\{/.test(SCRIPT_TEMA) && /catch/.test(SCRIPT_TEMA),
  "y va todo en un try: leer el almacenamiento bloqueado tira y dejaría la página a medio pintar");

/* ⚠️ Nadie escribe el `color-scheme` desde JS. Es una carrera perdida de
   antemano: `next-themes` lo pone en línea sobre `<html>` en su efecto, o sea
   DESPUÉS del script del tema, así que entrar al panel en claro dejaba las
   barras de scroll y los desplegables oscuros. Se acomodaba recién al tocar un
   botón de Apariencia, que es justo lo que uno hace al probarlo — por eso no se
   veía. */
const libTema = readFileSync("src/lib/tema-digitales.ts", "utf8");
check("SCR-E", !/style\.colorScheme/.test(libTema),
  "nadie escribe el color-scheme desde JS: pierde contra el estilo en línea de next-themes");

/* Que la variante del CSS lea el atributo que se está pintando de verdad. */
{
  const css = readFileSync("src/app/globals.css", "utf8");
  check("SCR-D", css.includes(`[${ATRIBUTO_TEMA}="oscuro"]`),
    "la variante `panel-oscuro:` mira el mismo atributo que se pinta");

  /* Y el `color-scheme` cuelga del atributo, con `!important` para ganarle al
     estilo en línea de `next-themes`. Sin el `!important` la regla existe y no
     hace nada, que es la peor de las dos formas de estar mal. */
  check("SCR-F",
    /\[data-panel-tema="claro"\][^}]*color-scheme:\s*light\s*!important/.test(css) &&
    /\[data-panel-tema="oscuro"\][^}]*color-scheme:\s*dark\s*!important/.test(css),
    "el color-scheme sale del CSS y lleva !important, si no pierde contra el estilo en línea");
}

console.log(fallos === 0
  ? "\nok — el tema del panel se pinta bien y el 'Automático' sigue vivo"
  : `\nFALLA — ${fallos} chequeo(s) del tema`);
process.exit(fallos === 0 ? 0 : 1);
