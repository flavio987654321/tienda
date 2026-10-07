"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSesion } from "@/components/AuthProvider";

/**
 * Los favoritos de los templates de autos (06/10/26, grupo 5.4 de la auditoría).
 *
 * Antes el corazón, sin sesión, sacaba al comprador a /login de golpe — también
 * en la previa del editor. Ahora:
 * - Sin sesión se guardan en este navegador y se avisa UNA vez que, iniciando
 *   sesión, se tienen en todos lados.
 * - Al iniciar sesión, los del navegador pasan a la cuenta (sin duplicar).
 * - En la previa del editor viven sólo en memoria: ni la base ni el navegador.
 * - Doble click no manda dos pedidos (la API alterna: dos seguidos se anulan).
 */
const CLAVE = "storefront_favorites";
const CLAVE_AVISO = "storefront_favorites_aviso";

function leerLocal(): string[] {
  try {
    const l = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(l) ? l.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
  } catch {
    return [];
  }
}
function guardarLocal(ids: string[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(ids)); } catch { /* sin almacenamiento: quedan en memoria */ }
}

export function useFavoritosVehiculos(isPreview = false) {
  const { cargando, logueado } = useSesion();
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const enCurso = useRef(new Set<string>());

  useEffect(() => {
    if (isPreview || cargando) return;
    let vivo = true;
    if (!logueado) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lo guardado en el navegador sólo se lee en el cliente
      setFavoritos(leerLocal());
      return;
    }
    (async () => {
      try {
        const r = await fetch("/api/favoritos");
        const data: { productId: string }[] = r.ok ? await r.json() : [];
        let ids = Array.isArray(data) ? data.map((f) => f.productId) : [];
        // Los que juntó sin sesión pasan a la cuenta. La API alterna: sólo se
        // mandan los que la cuenta todavía no tiene.
        const sueltos = leerLocal().filter((id) => !ids.includes(id));
        if (sueltos.length) {
          const subidos = await Promise.all(sueltos.map((productId) =>
            fetch("/api/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) })
              .then((x) => (x.ok ? productId : null)).catch(() => null)));
          ids = [...ids, ...subidos.filter((x): x is string => !!x)];
          guardarLocal([]);
        }
        if (vivo) setFavoritos(ids);
      } catch { /* sin conexión: se ven vacíos, nada se pierde */ }
    })();
    return () => { vivo = false; };
  }, [isPreview, cargando, logueado]);

  const alternar = useCallback(async (id: string) => {
    if (enCurso.current.has(id)) return;
    const estaba = favoritos.includes(id);
    const nuevos = estaba ? favoritos.filter((f) => f !== id) : [...favoritos, id];
    setFavoritos(nuevos);
    if (isPreview) return;
    if (!logueado) {
      guardarLocal(nuevos);
      if (!estaba) {
        let visto = false;
        try { visto = localStorage.getItem(CLAVE_AVISO) === "1"; localStorage.setItem(CLAVE_AVISO, "1"); } catch { /* se avisa igual */ }
        if (!visto) setAviso("Guardado en este dispositivo. Iniciá sesión para tenerlo en todos lados.");
      }
      return;
    }
    enCurso.current.add(id);
    try {
      const r = await fetch("/api/favoritos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: id }) });
      if (!r.ok) throw new Error();
      const { favorited } = (await r.json()) as { favorited?: boolean };
      // Lo que dice el servidor manda (otra pestaña pudo cambiarlo).
      if (typeof favorited === "boolean" && favorited === estaba) {
        setFavoritos((prev) => (favorited ? [...prev.filter((f) => f !== id), id] : prev.filter((f) => f !== id)));
      }
    } catch {
      setFavoritos((prev) => (estaba ? [...prev.filter((f) => f !== id), id] : prev.filter((f) => f !== id)));
      setAviso("No se pudo guardar. Revisá la conexión y probá de nuevo.");
    } finally {
      enCurso.current.delete(id);
    }
  }, [favoritos, isPreview, logueado]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4500);
    return () => clearTimeout(t);
  }, [aviso]);

  return { favoritos, esFavorito: (id: string) => favoritos.includes(id), alternar, aviso, cerrarAviso: () => setAviso(null) };
}
