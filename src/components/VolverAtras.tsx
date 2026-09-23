import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * El "volver" de las pantallas de acceso: `/login` y los dos pasos de `/registro`.
 *
 * ── Por qué hacía falta ──────────────────────────────────────────────────────
 * Esas tres pantallas se abren muchísimas veces SIN pestaña anterior —desde un
 * link de un aviso, desde el mail de confirmación, desde la app instalada— así
 * que la flecha del navegador viene apagada. Lo único que volvía al inicio era
 * tocar el logo, y eso hay que adivinarlo: no se ve como un botón.
 *
 * ── Es un destino fijo, no `history.back()` ──────────────────────────────────
 * Mismo criterio que el `BotonVolver` del panel de digitales: la historia del
 * navegador puede venir de cualquier lado, y "atrás" podría sacar a la persona
 * del sitio. Éste siempre lleva al mismo lugar.
 *
 * Con `href` es un link (se puede abrir en otra pestaña); con `onClick` es un
 * botón, para el paso 2 del registro, donde volver no cambia de página sino de
 * paso.
 */
export function VolverAtras({
  href,
  onClick,
  children = "Volver al inicio",
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  /* El mismo gris de "Volver a todas las cuentas", que ya vivía en el paso 1 del
     registro: son el mismo gesto y tienen que verse igual. */
  const estilo = `group inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors ${className}`;
  const flecha = <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />;

  if (href) {
    return (
      <Link href={href} className={estilo}>
        {flecha}
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={estilo}>
      {flecha}
      {children}
    </button>
  );
}
