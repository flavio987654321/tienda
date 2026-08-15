"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { panelDeRol } from "@/lib/panel-de-rol";

type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
};

type AuthState = {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
  signOut: (callbackUrl?: string) => Promise<void>;
  /**
   * Cierra la sesión en TODOS los dispositivos, no sólo en este navegador.
   *
   * Va aparte del `signOut` de siempre porque son dos intenciones distintas:
   * "me voy de esta computadora" y "alguien más tiene mi cuenta abierta".
   * Mezclarlas en un solo botón obliga a que una de las dos se comporte mal.
   */
  signOutTodosLosDispositivos: (callbackUrl?: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const signingOut = useRef(false);

  async function loadUser(hasSession: boolean) {
    if (!hasSession) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const payload = await res.json();
    setUser(payload.user ?? null);
    setStatus(payload.user ? "authenticated" : "unauthenticated");
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    await loadUser(!!data.session);
  }

  /**
   * Cierra la sesión SOLO en este navegador.
   *
   * `scope: "local"` explícito, porque el default de Supabase es `"global"` y
   * revoca la sesión en todos los dispositivos. Con el default, cerrar sesión en
   * la computadora del trabajo te sacaba también del celular — un dispositivo
   * que no tocaste, sin ningún aviso.
   *
   * La expectativa de todo el mundo, y lo que hacen Google y el resto, es que
   * cerrar sesión sea de este aparato. Cuando alguien quiere lo otro, lo quiere
   * a propósito: para eso está `signOutTodosLosDispositivos`.
   *
   * Adentro del MISMO navegador sí se cierra en todas las pestañas, y eso no lo
   * cambia el scope: la sesión vive en una cookie que comparten.
   */
  async function signOut(callbackUrl = "/") {
    signingOut.current = true;
    setStatus("loading");
    try { await supabase.auth.signOut({ scope: "local" }); } catch {}
    window.location.href = callbackUrl;
  }

  /** Revoca la sesión en todos lados. Ver el tipo de arriba. */
  async function signOutTodosLosDispositivos(callbackUrl = "/") {
    signingOut.current = true;
    setStatus("loading");
    try { await supabase.auth.signOut({ scope: "global" }); } catch {}
    window.location.href = callbackUrl;
  }

  useEffect(() => {
    // Initial load: one getSession call
    supabase.auth.getSession().then(({ data }) => loadUser(!!data.session));

    // Subsequent auth changes: session provided by the event, no extra getSession call
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (signingOut.current) return;
      loadUser(!!session);
    });
    return () => data.subscription.unsubscribe();
  }, [signingOut, supabase]);

  return (
    <AuthContext.Provider value={{ user, status, refresh, signOut, signOutTodosLosDispositivos }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}

/**
 * La sesión tal como la necesita cualquier menú de cuenta.
 *
 * POR QUÉ EXISTE. `useAuth` devuelve `user` y `status` por separado, y trece
 * lugares —la home, el nav compartido y los once templates de tienda— leían
 * solo `user`. Mientras la sesión se resuelve `user` todavía es `null`, igual
 * que si no hubiera nadie: los trece AFIRMABAN "no estás logueado" y mostraban
 * "Iniciar sesión / Registrarse" durante los 2-3 segundos que tarda
 * `/api/auth/me`, para recién después saltar a "Hola, X". No estaban esperando,
 * estaban contestando mal.
 *
 * Que `user` sea `null` en dos situaciones distintas es la trampa. Este hook la
 * saca del medio: devuelve los tres estados con nombre —`cargando`, `logueado`,
 * `invitado`— así que quien escriba un menú nuevo tiene que elegir qué hace con
 * cada uno. El que solo contemple dos ya no puede confundirlos sin darse cuenta.
 *
 * Trae también a dónde va el botón, porque esa decisión venía copiada en los
 * mismos trece archivos (ver `panelDeRol`).
 */
export function useSesion() {
  const { user, status, signOut } = useAuth();
  const panel = panelDeRol(user?.role);
  return {
    /** Todavía no se sabe. No afirmar ninguna de las otras dos. */
    cargando: status === "loading",
    /** Hay sesión confirmada. */
    logueado: status === "authenticated" && !!user,
    /** Se confirmó que NO hay sesión. */
    invitado: status === "unauthenticated",
    user,
    /** El nombre de pila, para saludar en el nav ("Hola, Flavio"). */
    nombre: user?.name?.split(" ")[0] ?? null,
    /**
     * Cómo llamar a la persona en el menú de cuenta de una tienda: el nombre
     * completo, y si no cargó ninguno, la parte del mail antes del arroba.
     *
     * Vive acá porque los once templates lo calculaban igual, y porque tenerlo
     * ya resuelto evita que el menú tenga que tocar `user` —que es justo lo que
     * llevaba a confundir "todavía no sé" con "no hay nadie"—.
     */
    nombreMostrado: user ? user.name || user.email.split("@")[0] : null,
    panelHref: panel.href,
    panelLabel: panel.label,
    /** Se reexporta para que un menú de cuenta necesite un solo hook. */
    signOut,
  };
}
