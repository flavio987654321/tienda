"use client";

/* El "Volver a la tienda" de Aurora: una píldora de vidrio con la flecha.
   Lo usan el catálogo, Nosotros y Contacto. Antes Nosotros y Contacto usaban
   el `BotonVolver` compartido, y la misma tienda tenía dos botones de volver
   distintos según la pantalla. */
export function VolverAurora({ onClick, tinta, linea, texto = "Volver a la tienda" }: {
  onClick: () => void;
  tinta: string;
  linea: string;
  texto?: string;
}) {
  return (
    <button type="button" onClick={onClick}
      style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.05)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
        border:`1px solid ${linea}`, color:tinta, borderRadius:999, padding:"9px 16px 9px 12px", fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", fontWeight:600 }}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="15 18 9 12 15 6"/></svg>
      {texto}
    </button>
  );
}
