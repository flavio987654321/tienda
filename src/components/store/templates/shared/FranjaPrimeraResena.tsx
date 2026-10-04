"use client";

/* ══════════════════════════════════════════════════════════════════════════
   LA FRANJA "¿YA COMPRASTE ACÁ?" (reseñas, tienda publicada sin ninguna)
   ══════════════════════════════════════════════════════════════════════════

   Va en lugar del bloque de reseñas cuando la tienda publicada todavía no
   tiene ninguna (ver `vacioEnTienda` en useHomeReviews). Antes el bloque
   entero aparecía con "Todavía nadie dejó su opinión", y un cliente nuevo
   leía "acá no compra nadie" (Flavio, 04/10/26).

   Es finita y en positivo: no dice que no hay reseñas, invita a dejar la
   primera. El botón abre el mismo formulario de siempre, así una tienda nueva
   igual tiene de dónde arrancar. Cómo se ve (colores, letra, botón) lo pone
   cada template. */
export function FranjaPrimeraResena({ onOpinar, fondo, tinta, suave, linea, estiloTitulo, estiloBoton, isMobile }: {
  onOpinar: () => void;
  fondo: string;
  tinta: string;
  suave: string;
  /** La línea finita de arriba y de abajo. */
  linea: string;
  estiloTitulo?: React.CSSProperties;
  estiloBoton: React.CSSProperties;
  isMobile: boolean;
}) {
  return (
    <section style={{ background:fondo, borderTop:`1px solid ${linea}`, borderBottom:`1px solid ${linea}`, padding: isMobile ? "22px 20px" : "26px 40px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", gap: isMobile ? 14 : 28,
        flexDirection: isMobile ? "column" : "row", textAlign: isMobile ? "center" : "left" }}>
        <div style={{ minWidth:0 }}>
          <p style={{ margin:"0 0 4px", fontSize: isMobile ? 16 : 18, fontWeight:700, color:tinta, ...estiloTitulo }}>¿Ya compraste acá?</p>
          <p style={{ margin:0, fontSize:13.5, lineHeight:1.55, color:suave }}>Contá cómo te fue: tu opinión ayuda a quien compra por primera vez.</p>
        </div>
        <button type="button" onClick={onOpinar} style={{ flexShrink:0, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", ...estiloBoton }}>
          Dejá tu opinión
        </button>
      </div>
    </section>
  );
}

/** El aviso del editor cuando la portada de la tienda publicada no va a tener
 *  reseñas (`enPortada` 0): le explica a la dueña que, aunque el bloque esté
 *  activado, ahí no aparece y va la franja. Sin el "son de ejemplo", que cada
 *  template ya dice a su manera antes. */
export function avisoResenasVacias(total: number): React.ReactNode {
  return total === 0
    ? <>Tu tienda todavía no tiene ninguna. En tu tienda publicada este bloque <strong>no aparece hasta que llegue la primera</strong>, aunque lo tengas activado: tus clientes ven solo una franja finita para dejar su opinión.</>
    : <>Tenés <strong>{total} {total === 1 ? "reseña" : "reseñas"}</strong>, pero ninguna de 4★ o 5★ con comentario, que son las que suben a la portada. Hasta que haya una, en tu tienda publicada este bloque <strong>no aparece</strong>, aunque lo tengas activado: tus clientes ven solo una franja para dejar su opinión.</>;
}
