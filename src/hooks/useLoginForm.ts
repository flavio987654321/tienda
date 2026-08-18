"use client";

import { useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { useTurnstile } from "@/components/Turnstile";

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

  /* El captcha del login, y por qué va acá y no en una ruta nuestra.
   *
   * El registro y la recuperación tienen su propio límite por IP porque pasan por
   * una API nuestra. El login NO pasa por el servidor de la plataforma: el
   * navegador le habla derecho a Supabase. Poner un límite nuestro delante de
   * este formulario no frenaría a nadie — el que quiere probar contraseñas no
   * usa esta pantalla, le pega directo al endpoint de Supabase, que es público.
   * Sería un cartel en una puerta que nadie usa.
   *
   * El token viaja adentro del pedido y lo verifica SUPABASE, no nosotros. Por
   * eso funciona: la verificación pasa a estar en el mismo lugar donde se prueba
   * la contraseña, y no hay forma de saltearla llamando por afuera.
   *
   * Mientras el captcha esté apagado en Supabase, el token se ignora y no cambia
   * nada. Ese es el orden seguro: primero sale este código, después se prende
   * allá. Al revés, todos los logins fallarían hasta que el deploy llegue.
   */
  const captcha = useTurnstile("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  /** Ya entró y se está yendo. La pantalla puede tapar el formulario con esto. */
  const [entrando, setEntrando] = useState(false);

  /* Candados sincrónicos contra el doble clic, igual que el `pendingRef` del botón
     de seguir y el `subiendo` de la carga de logo.

     El `disabled={loading}` del botón no alcanza: ese estado recién bloquea en el
     render SIGUIENTE, y dos toques rápidos —o un Enter mantenido en el teclado del
     celular— entran los dos antes. Eran dos intentos de login en paralelo contra
     Supabase por cada apuro.

     Son DOS candados y no uno compartido: con uno solo, alguien que tocaba
     "¿olvidaste tu contraseña?" y enseguida intentaba entrar se encontraba con que
     el botón de ingresar no hacía nada, sin ningún aviso, hasta que terminara el
     pedido del mail. Son dos acciones distintas y cada una se cuida sola. */
  const ingresando = useRef(false);
  const recuperando = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ingresando.current) return;
    ingresando.current = true;
    setLoading(true);
    setError("");
    setInfo("");

    // Todo camino que NO entra tiene que soltar el candado, si no el formulario
    // queda trabado para siempre después del primer intento fallido.
    /* El `captcha.reset()` acá no es por las dudas: el token de Turnstile MUERE
       al verificarse una vez. Sin esto, el segundo intento —que después de un
       error es lo más probable que pase— viaja con un token ya gastado y lo
       rechaza Supabase, así que a la contraseña equivocada le seguiría un error
       raro de captcha aunque la segunda vez la escribieran bien. */
    const fallar = (msg: string) => {
      setError(msg);
      setLoading(false);
      ingresando.current = false;
      captcha.reset();
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
      ({ error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
        // Vacío no: si el captcha está apagado o el widget no llegó a resolver,
        // se manda sin el campo en vez de con un token que no existe.
        ...(captcha.token ? { options: { captchaToken: captcha.token } } : {}),
      }));
    } catch {
      fallar("No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.");
      return;
    }

    if (loginError) {
      /* El captcha necesita su propio mensaje. Con uno solo para todo, alguien
         con la contraseña bien pero el captcha caído leía "Email o contraseña
         incorrectos" y se ponía a cambiar la contraseña de una cuenta que estaba
         perfecta. Son dos problemas distintos y la solución de cada uno también:
         uno se arregla escribiendo bien, el otro recargando. */
      const detalle = (loginError as { message?: string })?.message ?? "";
      fallar(
        /captcha/i.test(detalle)
          ? "No pudimos verificar que no seas un robot. Recargá la pantalla e intentá de nuevo."
          : "Email o contraseña incorrectos"
      );
      return;
    }

    // Acá el candado NO se suelta a propósito: se está yendo de esta pantalla y no
    // hay nada que reintentar.
    setEntrando(true);
    alEntrar();
  }

  async function handleForgotPassword() {
    // Su propio candado: sin esto, dos toques seguidos mandaban dos mails de
    // recuperación.
    if (recuperando.current) return;
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Ingresá tu email primero para enviarte el link de recuperación.");
      return;
    }

    recuperando.current = true;
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
      recuperando.current = false;
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    showPass, setShowPass,
    error, info, loading, resetting, entrando,
    handleSubmit, handleForgotPassword,
    /* Las dos pantallas dibujan `captcha.widget` y suman `!captcha.ready` al
       `disabled` del botón. `ready` da true cuando el captcha no está
       configurado, así que sin claves de Turnstile el formulario se comporta
       igual que antes. */
    captcha,
  };
}
