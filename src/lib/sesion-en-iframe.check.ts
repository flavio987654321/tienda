// Verificación de que la previa de la landing sigue siendo a la vez SEGURA y
// capaz de cargar. Corre con:
//   npx tsx src/lib/sesion-en-iframe.check.ts
//
// ── Por qué este archivo existe ──────────────────────────────────────────────
//
// Porque el arreglo fácil de este problema es el que hay que impedir.
//
// La previa muestra la página de venta adentro de un `iframe` con
// `sandbox="allow-scripts"` y SIN `allow-same-origin`. Eso es deliberado: lo que
// corre adentro es el HTML que subió la vendedora, y darle nuestro origen sería
// darle nuestras cookies de sesión.
//
// El costo de esa decisión es que el documento de adentro queda en un origen
// opaco: leer `document.cookie` o `sessionStorage` ahí no devuelve vacío, TIRA
// `SecurityError`. Y `AuthProvider` vive en el layout raíz, así que se montaba
// también en esa página pública y armaba un cliente de Supabase — cuyo
// constructor lee `sessionStorage` tres capas abajo, en el socket de `phoenix`.
// El error salía durante el render y se llevaba puesta la página entera: la
// previa mostraba "Se nos rompió algo".
//
// Quien se encuentre ese error de nuevo va a tener a mano una solución de una
// palabra: agregarle `allow-same-origin` al iframe. Anda al toque, y convierte
// un archivo subido por un tercero en código con acceso a nuestro origen.
//
// De ahí los dos casos de abajo: uno cuida que la previa no se rompa, el otro
// que no se "arregle" por el lado equivocado.

import { readFileSync } from "node:fs";

let failed = 0;
function check(id: string, ok: boolean, desc: string) {
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${id.padEnd(8)} ${desc}`);
}

const PANEL = "src/app/digitales/productos/[id]/landing/LandingClient.tsx";
const panel = readFileSync(PANEL, "utf8");
const proveedor = readFileSync("src/components/AuthProvider.tsx", "utf8");
const cliente = readFileSync("src/lib/supabase/client.ts", "utf8");

// ── Que la previa siga estando encerrada ────────────────────────────────────
{
  check("IFR-A", /sandbox="allow-scripts"/.test(panel),
    "la previa encierra el archivo de la vendedora en un iframe con sandbox");

  /* EL caso importante de este archivo. `allow-same-origin` junto con
     `allow-scripts` es lo mismo que no tener sandbox: el HTML de adentro pasa a
     compartir nuestro origen, y desde ahí llega a las cookies de sesión de quien
     esté mirando. */
  check("IFR-B", !/allow-same-origin/.test(panel),
    "y NUNCA con allow-same-origin: sería darle nuestras cookies a un archivo ajeno");
}

// ── Que la sesión no reviente adentro de ese encierro ───────────────────────
{
  check("IFR-C", /sePuedeGuardarEnElNavegador/.test(cliente),
    "hay una forma de preguntar si este documento puede guardar algo");

  /* Preguntar y recién después armar. Al revés no sirve de nada: el error es del
     constructor, no de algo que se pueda atrapar más tarde. */
  check("IFR-D", /sePuedeGuardarEnElNavegador\(\)\s*\?\s*createSupabaseBrowserClient\(\)/.test(proveedor),
    "y AuthProvider pregunta ANTES de armar el cliente, no después");

  check("IFR-E", /if\s*\(!supabase\)/.test(proveedor),
    "y sabe seguir sin cliente en vez de asumir que siempre hay uno");

  /* Sin esto el estado se queda en "loading" para siempre y todo menú de cuenta
     se queda esperando una respuesta que no va a llegar. Ver `useSesion`: los
     tres estados existen justamente para que "todavía no sé" y "no hay nadie" no
     se confundan. */
  check("IFR-F", /setStatus\("unauthenticated"\)/.test(proveedor),
    "y contesta \"no hay nadie\", que es la verdad, en vez de quedarse cargando");
}

console.log(failed === 0 ? "\n✅ La previa está encerrada y no se rompe." : `\n❌ ${failed} caso(s) fallan.`);
process.exit(failed === 0 ? 0 : 1);
