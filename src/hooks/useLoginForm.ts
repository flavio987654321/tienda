"use client";

import { useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";

/* Todo lo que hace un formulario de login, una sola vez.
 *
 * Existe porque hay DOS pantallas que loguean —`/login`, que es la de la web con
 * su panel de marketing, y `PanelLogin`, que dibuja el panel cuando la app
 * instalada se queda sin sesión— y no pueden tener dos copias de esto. Ya pasó:
 * la primera versión de `PanelLogin` traía su propio `signInWithPassword` y su
 * propio `handleForgotPassword` copiados, que es exactamente la deuda que la
 * separación de pantallas venía a evitar.
 *
 * Lo único que cambia entre las dos es a dónde ir cuando la sesión ya está, y
 * eso entra por `alEntrar`: `/login` navega al panel que corresponda al rol,
 * `PanelLogin` recarga la misma url para quedarse donde estaba. La diferencia es
 * de destino, no de lógica.
 */
export function useLoginForm(alEntrar: () => void) {
  // `useMemo` y no una llamada suelta en el cuerpo: sin esto se arma un cliente
  // nuevo de Supabase en cada tecla que se escribe en el formulario.
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  /** Ya entró y se está yendo. La pantalla puede tapar el formulario con esto. */
  const [entrando, setEntrando] = useState(false);

  /* Candado sincrónico contra el doble clic, igual que el `pendingRef` del botón
     de seguir y el `subiendo` de la carga de logo.
     El `disabled={loading}` del botón no alcanza: ese estado recién bloquea en el
     render SIGUIENTE, y dos toques rápidos —o un Enter mantenido en el teclado del
     celular— entran los dos antes. Eran dos intentos de login en paralelo contra
     Supabase por cada apuro. */
  const enVuelo = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enVuelo.current) return;
    enVuelo.current = true;
    setLoading(true);
    setError("");
    setInfo("");

    // Todo camino que NO entra tiene que soltar el candado, si no el formulario
    // queda trabado para siempre después del primer intento fallido.
    const fallar = (msg: string) => {
      setError(msg);
      setLoading(false);
      enVuelo.current = false;
    };

    if (!hasSupabaseBrowserConfig()) {
      fallar("Falta configurar Supabase en las variables de entorno.");
      return;
    }

    /* El try no es de más: `signInWithPassword` RECHAZA si no hay red, no
       devuelve un error adentro del objeto. Sin esto, el catch nunca corría y
       `loading` se quedaba en true para siempre — el botón girando y el
       formulario bloqueado, sin manera de reintentar.
       Y se nota justo donde peor cae: `PanelLogin` es la pantalla de la app
       instalada, que no tiene links ni barra de direcciones para recargar. */
    let loginError: unknown = null;
    try {
      ({ error: loginError } = await supabase.auth.signInWithPassword({ email, password }));
    } catch {
      fallar("No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.");
      return;
    }

    if (loginError) {
      fallar("Email o contraseña incorrectos");
      return;
    }

    // Acá el candado NO se suelta a propósito: se está yendo de esta pantalla y no
    // hay nada que reintentar.
    setEntrando(true);
    alEntrar();
  }

  async function handleForgotPassword() {
    // El mismo candado: sin esto, dos toques seguidos mandaban dos mails de
    // recuperación.
    if (enVuelo.current) return;
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Ingresá tu email primero para enviarte el link de recuperación.");
      return;
    }

    enVuelo.current = true;
    setResetting(true);
    try {
      // Mismo motivo que arriba: sin red, `fetch` rechaza y `resetting` se
      // quedaba en true, con el botón diciendo "Enviando..." para siempre.
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setInfo("Te enviamos un link para recuperar tu contraseña. Revisá tu email.");
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setResetting(false);
      enVuelo.current = false;
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    showPass, setShowPass,
    error, info, loading, resetting, entrando,
    handleSubmit, handleForgotPassword,
  };
}
