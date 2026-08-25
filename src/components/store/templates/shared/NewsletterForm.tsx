"use client";
import { useContext, useRef, useState } from "react";
import { useTurnstile } from "@/components/Turnstile";
import { EMAIL_MAX } from "@/lib/contacto-limites";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";

/**
 * El formulario de suscripción al newsletter.
 *
 * Toda la lógica vive acá —validación, doble click, honeypot, mensajes— y el
 * aspecto lo pone cada template por props. Es el mismo criterio que ya usan
 * `ContactForm` y el modal de producto: se comparte lo que tiene que funcionar
 * igual en los diez, no lo que tiene que verse distinto.
 *
 * Antes de esto el bloque era decoración: un input sin `onChange` y un botón sin
 * `onClick`, dentro de un `div` que ni siquiera era un `form`. El visitante
 * escribía su mail, apretaba, no pasaba nada y se iba creyendo que se había
 * suscripto.
 */

export type NewsletterTheme = {
  /** El contenedor del input + botón. */
  form?: React.CSSProperties;
  input?: React.CSSProperties;
  boton?: React.CSSProperties;
  /** Color del mensaje de "revisá tu mail". Si falta, hereda. */
  colorMensaje?: string;
  colorError?: string;
};

export function NewsletterForm({
  slug,
  isPreview = false,
  placeholder = "tu@email.com",
  boton = "Suscribirse",
  botonEnviando = "Enviando…",
  theme = {},
}: {
  slug?: string;
  /** En el editor no se manda nada: el dueño está mirando, no suscribiéndose. */
  isPreview?: boolean;
  placeholder?: string;
  boton?: string;
  botonEnviando?: string;
  theme?: NewsletterTheme;
}) {
  const [email, setEmail] = useState("");
  const [trampa, setTrampa] = useState("");
  const [estado, setEstado] = useState<"listo" | "yendo" | "hecho">("listo");
  const [error, setError] = useState<string | null>(null);
  // El estado de React no llega a bloquear el segundo click de un doble click;
  // el ref sí. Mismo candado que en el formulario de reseñas.
  const enViaje = useRef(false);

  /**
   * Captcha.
   *
   * El honeypot y el límite por IP frenan al bot solitario, pero no al ataque
   * que de verdad duele acá: alguien mete una lista de miles de direcciones
   * REALES y a cada persona le llega un mail de confirmación desde nuestro
   * dominio sin haberlo pedido. Con muchas IPs, el límite por IP no ve nada — y
   * el resultado son miles de denuncias de spam contra el dominio que comparten
   * todas las tiendas del proyecto.
   *
   * La diferencia con una reseña falsa: la reseña la borra el dueño; un mail que
   * ya salió no se puede deshacer.
   *
   * El `action` viaja adentro del token y el endpoint exige el mismo nombre, así
   * un token resuelto en el formulario de contacto no sirve para dar de alta
   * suscriptores.
   *
   * En la VISTA PREVIA no se dibuja. Acá no hay nada que asegurar —`enviar` sale
   * en la primera línea, no viaja nada— y estaba costando dos cosas: la caja de
   * Cloudflare aparecía metida en el medio del diseño de la dueña, y el botón
   * quedaba apagado esperando un token que no le sirve a nadie. O sea que la
   * dueña, en la pantalla que existe justamente para ver cómo le queda su
   * bloque, no lo veía como lo van a ver sus clientes: veía un botón gris y una
   * caja que ahí no va. El cartel de abajo ya explica que no envía.
   */
  const captcha = useTurnstile("newsletter");
  /** Sin captcha delante, el botón se muestra como en la tienda de verdad. */
  const esperandoCaptcha = !isPreview && !captcha.ready;
  const enDemoPublica = !!useContext(StoreConfigContext)?.demoPublica;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview) return;
    if (enViaje.current) return;

    const limpio = email.trim();
    // Chequeo mínimo del lado del navegador, para no gastar un viaje ni un
    // intento del límite por IP en un tipeo obvio. El que decide de verdad es el
    // servidor.
    if (!limpio || !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(limpio)) {
      setError("Revisá el correo, no parece válido.");
      return;
    }

    enViaje.current = true;
    setEstado("yendo");
    setError(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: limpio, website: trampa, turnstileToken: captcha.token }),
      });
      // El token es de un solo uso: sin reset, un reintento viaja con uno ya
      // gastado y el servidor lo rechaza sin que se entienda por qué.
      captcha.reset();
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No pudimos suscribirte. Probá de nuevo en un momento.");
        setEstado("listo");
        return;
      }
      setEstado("hecho");
      setEmail("");
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
      setEstado("listo");
    } finally {
      enViaje.current = false;
    }
  }

  if (estado === "hecho") {
    return (
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: theme.colorMensaje ?? "inherit" }}>
        ✓ Te mandamos un mail para confirmar. Revisá tu casilla (y el correo no deseado).
      </p>
    );
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div style={theme.form}>
        {/* Trampa para bots: invisible y fuera del recorrido del teclado y del
            lector de pantalla. Una persona no puede llenarlo; un bot que rellena
            todo lo que encuentra, sí — y el servidor le contesta que salió bien
            para que no aprenda cuál es el campo que lo delata. */}
        <input
          type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
          value={trampa} onChange={(e) => setTrampa(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={placeholder}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
          maxLength={EMAIL_MAX}
          aria-label="Tu correo electrónico"
          style={theme.input}
        />
        <button
          type="submit"
          disabled={estado === "yendo" || esperandoCaptcha}
          style={{ ...theme.boton, ...(estado === "yendo" || esperandoCaptcha ? { opacity: 0.65, cursor: "default" } : null) }}
        >
          {estado === "yendo" ? botonEnviando : boton}
        </button>
      </div>

      {/* El widget va abajo del campo y sólo aparece si hay clave configurada
          (`useTurnstile` devuelve null si no) — en local, donde no está, el
          bloque se ve exactamente igual que antes. En la previa tampoco: ver el
          comentario del captcha, arriba. */}
      {!isPreview && captcha.configured && <div style={{ marginTop: 10 }}>{captcha.widget}</div>}

      {error && (
        <p style={{ fontSize: 12, margin: "8px 0 0", lineHeight: 1.5, color: theme.colorError ?? "#dc2626" }}>
          {error}
        </p>
      )}
      {/* La demo pública de `/plantillas/[id]` también entra en `isPreview` —lo
          necesita para no mandar nada—, pero ahí no hay ningún "modo edición" del
          que hablar: el que mira todavía no tiene tienda. Sigue sin enviar; lo
          único que se calla es el cartel. */}
      {isPreview && !enDemoPublica && (
        <p style={{ fontSize: 11, margin: "8px 0 0", opacity: 0.6, color: theme.colorMensaje ?? "inherit" }}>
          Vista previa — el formulario no envía en modo edición.
        </p>
      )}
    </form>
  );
}
