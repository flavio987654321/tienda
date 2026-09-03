"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Link from "next/link";

/**
 * Avisar antes de irse de una pantalla con cambios sin guardar.
 *
 * ── El agujero que esto tapa ────────────────────────────────────────────────
 *
 * El editor de la página de venta ya avisaba, con `beforeunload`. Pero
 * `beforeunload` se dispara sólo cuando el navegador DESCARGA la página de
 * verdad: F5, cerrar la pestaña, escribir otra dirección. Tocar "Mi cuenta" en
 * la barra lateral no descarga nada —es un `<Link>` de Next, que navega del lado
 * del cliente— así que el aviso no aparecía nunca y el trabajo se perdía en
 * silencio. Encontrado a mano el 03/09/26, probando el panel botón por botón.
 *
 * O sea que la guarda existía y no cubría **la salida más usada de todas**.
 *
 * ── Por qué así y no con un interceptor de clics ────────────────────────────
 *
 * Éste es el patrón que documenta Next 16 para el App Router
 * (`docs/01-app/03-api-reference/02-components/link.md`, "Blocking navigation"):
 * un contexto que dice si hay que frenar, y un `<Link>` propio que le pregunta
 * en su `onNavigate` —donde `preventDefault()` cancela la navegación—.
 *
 * La alternativa era escuchar todos los clics del documento y adivinar cuáles
 * eran navegaciones. Anda, pero adivina: se come clics que no eran links, se
 * pelea con el menú del celular y hay que mantenerlo cada vez que Next cambia
 * cómo navega. Acá el que frena es el mismo componente que navega.
 *
 * ── Lo que NO tapa, y hay que saberlo ───────────────────────────────────────
 *
 * El botón "atrás" del navegador. No es un clic ni una descarga: es un
 * `popstate`, y para cuando se entera ya navegó. Taparlo obliga a empujar
 * entradas falsas en el historial, que rompe el "atrás" para todo lo demás. Se
 * dejó afuera a propósito.
 */

type Estado = {
  bloqueado: boolean;
  setBloqueado: (v: boolean) => void;
};

const Contexto = createContext<Estado>({ bloqueado: false, setBloqueado: () => {} });

export function ProveedorDeSalida({ children }: { children: React.ReactNode }) {
  const [bloqueado, setBloqueado] = useState(false);
  return (
    <Contexto.Provider value={{ bloqueado, setBloqueado }}>{children}</Contexto.Provider>
  );
}

/**
 * Lo usa la pantalla que tiene algo que perder.
 *
 * Devuelve `avisar` además del interruptor: sirve para los botones que salen sin
 * ser un `<Link>` —por ahora ninguno, pero el checkout va a tener varios—.
 */
export function useSalida() {
  const { bloqueado, setBloqueado } = useContext(Contexto);
  const avisar = useCallback(
    () => !bloqueado || window.confirm(AVISO),
    [bloqueado],
  );
  return { bloqueado, setBloqueado, avisar };
}

/* Dice qué se pierde, no "¿estás seguro?". El botón de guardar está a la vista
   mientras se lee esto, así que la salida es cancelar y guardar. */
const AVISO = "Tenés cambios sin guardar. Si salís ahora los perdés.\n\n¿Salir igual?";

/**
 * El `<Link>` de adentro del panel. Se usa en lugar del de Next en todo lo que
 * saque de una pantalla: la barra lateral y el botón de volver.
 *
 * Fuera del proveedor no rompe nada —el contexto arranca desbloqueado— así que
 * un link suelto se comporta como el de siempre.
 */
export function LinkDelPanel(props: React.ComponentProps<typeof Link>) {
  const { bloqueado } = useContext(Contexto);
  return (
    <Link
      {...props}
      onNavigate={(e) => {
        if (bloqueado && !window.confirm(AVISO)) {
          e.preventDefault();
          return;
        }
        props.onNavigate?.(e);
      }}
    />
  );
}
