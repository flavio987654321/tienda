import type { ReactNode } from "react";
import type { MarcaNav as Modo } from "@/types/store-config";

/**
 * La marca de la barra de arriba: el nombre escrito, el logo, o los dos (15/10/26).
 *
 * Lo elige la dueña en Diseño → Configuración avanzada → "Barra de arriba". Sin
 * elegir, el nombre, que es como estaban todas las tiendas: nadie amanece con la
 * barra distinta.
 *
 * El NOMBRE lo sigue dibujando cada template, con su tipografía (`children`):
 * esto sólo decide si va, y pone el logo al lado o en su lugar. Así cada
 * template conserva su letra y el logo no se ve igual en todos.
 *
 * `insignia` es el dibujito genérico que algunos templates ponen al lado del
 * nombre (Aire, Drive) haciendo de logo. Con el logo de verdad, sobra.
 *
 * Si eligió logo y no hay ninguno subido, queda el nombre: una barra sin marca
 * es peor que la de antes.
 */
export function modoDeMarca(modo: Modo | undefined, logo: string | null | undefined): Modo {
  if (!logo) return "nombre";
  return modo === "logo" || modo === "ambos" ? modo : "nombre";
}

export default function MarcaNav({
  modo, logo, nombre, alto = "clamp(28px, 7vw, 38px)", anchoMax = "min(180px, 42vw)", gap = 10,
  insignia, enFila = false, nombreDesde = 480, children,
}: {
  modo: Modo | undefined;
  logo: string | null | undefined;
  /** Para el `alt` del logo: el lector de pantalla lee el nombre de la tienda. */
  nombre: string;
  /** Alto del logo. El ancho sale solo, respetando la proporción. */
  alto?: string | number;
  /** Tope de ancho, para que un logo apaisado no empuje el menú. */
  anchoMax?: string | number;
  gap?: number;
  /** El dibujito que hace de logo cuando no hay logo. Sólo se muestra con el nombre solo. */
  insignia?: ReactNode;
  /**
   * El que contiene esto ya es una fila flex con su `gap`: el logo y el nombre
   * van sueltos, como hermanos, y no adentro de otra caja.
   */
  enFila?: boolean;
  /**
   * Con "Logo y nombre", desde qué ancho de pantalla entra el nombre al lado del
   * logo. Más angosto, queda el logo solo. Los templates con el menú completo a
   * lo ancho (Hogar y Tecno) piden más: ahí el nombre se partía en renglones.
   */
  nombreDesde?: number;
  /** El nombre, tal como lo dibuja el template. */
  children: ReactNode;
}) {
  const m = modoDeMarca(modo, logo);
  if (m === "nombre") return <>{insignia}{children}</>;
  const img = (
    // <img> y no next/image: el logo viene de Supabase con su medida, y el alto
    // fijo con ancho automático es lo que lo deja entrar en cualquier barra.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo!}
      alt={nombre}
      decoding="async"
      style={{ height: alto, width: "auto", maxWidth: anchoMax, objectFit: "contain", display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    />
  );
  if (m === "logo") return img;
  /* "Logo y nombre" en un celular no entra: con un logo apaisado al lado, el
     nombre se cortaba en "MI …" o se partía en cuatro renglones (medido a 360).
     Por debajo de `nombreDesde` queda el logo solo, que es lo que identifica. */
  const clase = `marca-nav-nombre-${nombreDesde}`;
  const estilo = <style>{`@media (max-width: ${nombreDesde - 1}px) { .${clase} { display: none !important; } }`}</style>;
  if (enFila) return <>{estilo}{img}<span className={clase} style={{ display: "contents" }}>{children}</span></>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, minWidth: 0, maxWidth: "100%" }}>
      {estilo}
      {img}
      <span className={clase} style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{children}</span>
    </span>
  );
}
