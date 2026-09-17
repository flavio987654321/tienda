"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | null = null;

/**
 * ¿Este documento puede guardar cosas en el navegador?
 *
 * ── Por qué hay que preguntarlo antes de armar el cliente ───────────────────
 *
 * Porque armarlo **revienta** donde la respuesta es que no, y no con un error
 * que se pueda atrapar más adelante: tira adentro del constructor.
 *
 * El culpable está tres capas abajo. `new SupabaseClient(…)` llama a
 * `_initRealtimeClient`, que arma un socket de `phoenix`, y ese constructor
 * hace `global && global.sessionStorage` a pelo —una lectura suelta, sin
 * try/catch (`@supabase/phoenix`, Socket)—. En un documento de origen opaco esa
 * lectura no devuelve `null`: tira `SecurityError`.
 *
 * ── Dónde pasa esto de verdad ───────────────────────────────────────────────
 *
 * En la previa de la landing del panel de digitales. Ese `iframe` va con
 * `sandbox="allow-scripts"` y SIN `allow-same-origin` a propósito: adentro corre
 * el HTML que subió la vendedora, y darle el mismo origen que nosotros sería
 * darle nuestras cookies. El precio de esa decisión —correcta— es que el
 * documento de adentro queda en un origen opaco.
 *
 * Y como `AuthProvider` vive en el layout raíz, se monta también ahí: en una
 * página pública, que no necesita sesión para nada. El `SecurityError` salía del
 * `useMemo` durante el render, o sea arriba de todo, y se lo llevaba puesto el
 * `global-error`: la previa mostraba "Se nos rompió algo" en vez de la página.
 *
 * ⚠️ Sólo se ve en el build de producción. En desarrollo la misma previa carga
 * bien, así que esto no se encuentra programando: hay que mirar la consola del
 * sitio de verdad. Verificado a mano con `npm start` y un iframe sandboxed.
 *
 * ── Y para quien NO está en un iframe ───────────────────────────────────────
 *
 * Contesta que no también en un navegador con el almacenamiento bloqueado
 * (Safari con "bloquear todas las cookies", algunos modos privados). Ahí la
 * respuesta correcta es la misma: sin dónde guardar la sesión no puede haber
 * sesión, así que tratar a esa persona como visitante es la verdad, no un
 * parche.
 */
export function sePuedeGuardarEnElNavegador(): boolean {
  if (typeof window === "undefined") return false;
  try {
    void window.sessionStorage;
    void window.localStorage;
    void document.cookie;
    return true;
  } catch {
    return false;
  }
}

export function createSupabaseBrowserClient() {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder";
  instance = createBrowserClient(url, key);
  return instance;
}

export function hasSupabaseBrowserConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
