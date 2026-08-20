"use client";

import { useEffect, useState } from "react";
import AvisosDeSeccion from "./AvisosDeSeccion";
import type { Aviso } from "@/lib/avisos-tienda";

/**
 * Igual que `AvisosDeSeccion`, pero se trae los avisos por su cuenta.
 *
 * Para las pantallas que son componente de cliente y no pueden hacer el `await`
 * del servidor — hoy, Cupones. Pega al mismo endpoint que el menú lateral, así
 * que sale de la misma cuenta y no puede decir algo distinto.
 *
 * Si la consulta falla no se muestra nada: un aviso es información de más, no
 * puede convertirse en un error en pantalla.
 */
export default function AvisosDeSeccionCliente({ seccion }: { seccion: string }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    let vigente = true;
    fetch("/api/dashboard/warnings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vigente || !Array.isArray(d?.avisos)) return;
        setAvisos(
          (d.avisos as Aviso[])
            .filter((a) => a.seccion === seccion)
            .sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "rojo" ? -1 : 1))
        );
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [seccion]);

  return <AvisosDeSeccion avisos={avisos} />;
}
