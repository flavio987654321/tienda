"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsPwa } from "@/hooks/useIsPwa";
import { CAPAS } from "@/lib/capas-tienda";

export default function VisitorBackButton() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  /* Adentro de la app instalada de la tienda esto no existe: ni el botón ni el
     gesto. Lleva a `/tiendas`, el listado de TODAS las tiendas de la plataforma
     — o sea que la app del comerciante mandaba a su propio cliente al catálogo de
     la competencia. Afuera de la app está bien: ahí el visitante llegó navegando
     TiendaApps y volver al listado es lo que quiere.
     De paso saca un choque en Android: en standalone el desliz desde el borde es
     el gesto de retroceso del sistema, y se pisaba con este. */
  const inPwa = useIsPwa();
  /* Sólo para quien LLEGÓ desde el listado de tiendas (05/10/26). Lo veía
     cualquiera —también el cliente que entró desde el Instagram de la tienda—
     y lo mandaba al catálogo de la competencia. Se recuerda en la sesión para
     que siga apareciendo mientras navega la tienda. */
  const [vieneDelListado, setVieneDelListado] = useState(false);
  useEffect(() => {
    try {
      // La marca la deja el listado de tiendas al mostrarse (TiendasClient):
      // el referrer no sirve, porque la navegación interna no lo actualiza.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura del navegador al montar
      setVieneDelListado(sessionStorage.getItem("vino-del-listado") === "1");
    } catch { /* sin storage: no se muestra */ }
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isMobile || inPwa || !vieneDelListado) return;
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (startX < 30 && dx > 60 && dy < 80) {
        router.push("/tiendas");
      }
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, inPwa, router, vieneDelListado]);

  if (isMobile || inPwa || !vieneDelListado) return null;

  return (
    <Link
      href="/tiendas"
      style={{
        /* Al borde izquierdo, a media altura (05/10/26). Arriba a la
           izquierda caía encima del logo y de la barra de anuncios de todos
           los templates; ningún encabezado vive a media pantalla. */
        position: "fixed",
        top: "50%",
        left: 8,
        marginTop: -20,
        zIndex: CAPAS.panel,
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "rgba(10,10,10,0.45)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
        transition: "background 0.2s, transform 0.2s",
        textDecoration: "none",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(10,10,10,0.72)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(10,10,10,0.45)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      title="Explorar tiendas"
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </Link>
  );
}
