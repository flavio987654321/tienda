"use client";

import { useRouter } from "next/navigation";
import SelectorDesplegable from "./SelectorDesplegable";

/**
 * El desplegable del celular para filtros que son ENLACES (`?p=`, `?rango=`,
 * `?orden=`): elegir una opción navega a esa dirección, igual que tocar la
 * ficha en la compu. Las fichas siguen existiendo arriba de `sm`, y son las
 * que andan sin JavaScript y se pueden compartir; esto sólo reemplaza la fila
 * que en el celular se deslizaba de costado con una barrita. Ver
 * `SelectorDesplegable`.
 */
export default function DesplegableDeEnlaces({ opciones, actual, queSeElige, acento, className }: {
  opciones: { href: string; label: string }[];
  /** El `href` de la opción elegida ahora. */
  actual: string;
  queSeElige: string;
  acento?: "naranja" | "indigo";
  className?: string;
}) {
  const router = useRouter();
  return (
    <SelectorDesplegable
      className={className}
      acento={acento}
      queSeElige={queSeElige}
      opciones={opciones.map((o) => ({ id: o.href, label: o.label }))}
      valor={actual}
      elegir={(href) => router.push(href, { scroll: false })}
    />
  );
}
