"use client";
import Link from "next/link";
import { ChevronLeft, Heart, ShoppingBag, User } from "lucide-react";
import { paletaDeTemplate } from "@/components/store/PromoDisplay";
import { ProductDetailBody, ProductDetailFooter, ProductDetailOverlays, resolveDetailTheme, editorParam, type DetailTheme, type ProductDetailViewProps } from "./shared";
import { CAPAS } from "@/lib/capas-tienda";

/**
 * La ficha de producto de Urban Pulse.
 *
 * Existe por lo mismo que la de Boho Terra: el template no estaba en la lista de
 * fichas con diseño propio y caía en la genérica —fondo blanco, botones violetas,
 * sin menú ni pie—. El cliente recorría una tienda negra con amarillo flúor,
 * tocaba un producto, y aterrizaba en una página que parecía de otro sitio y sin
 * forma de volver al catálogo ni abrir el carrito.
 *
 * Del template se toma la IDENTIDAD, no el acomodo: el gris casi blanco de la
 * página, el negro de tinta, la Inter en peso 900, las mayúsculas muy espaciadas
 * y el borde grueso. La disposición es la de una página —menú arriba, pie abajo,
 * ancho completo— y no la del modal, que es una ventanita con scroll adentro.
 */

const themeBase: DetailTheme = {
  // Los mismos valores que el template, no parecidos: salen de UrbanPulse.tsx.
  // Un #fff en vez del #f5f5f5 se nota al lado del menú.
  pageBg: "#f5f5f5",
  text: "#0f0f0f",
  muted: "#777777",
  accent: "#d4ff00",
  accentText: "#111111",
  accentReadable: "#0f0f0f",
  // Un gris de separador, no el negro de los bordes gruesos del template: acá
  // esto se usa para las rayitas entre reseñas y el marco de la calculadora de
  // envío, y una línea negra en cada renglón convierte la lista en una reja.
  cardBorder: "#d4d4d4",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  // Urban Pulse no tiene una tipografía aparte para los títulos: es la misma
  // Inter, pero mucho más pesada. Eso lo dice `vestido`, no una fuente distinta.
  headingFont: "'Inter','Helvetica Neue',Arial,sans-serif",
  // Casi cuadrado. El template usa radios chicos (2, 6) y reserva el círculo para
  // avatares y puntitos; nada con esquinas blandas.
  radius: 2,

  // Lo que este template cambia del acomodo. Lo que no diga, hereda.
  vestido: {
    // El gesto que más se repite en Urban Pulse: mayúsculas espaciadas en el peso
    // más pesado que hay. Es lo que hace que una sección "suene" a este template.
    tituloSeccion: {
      fontSize: 13,
      letterSpacing: 3,
      fontWeight: 900,
      textTransform: "uppercase",
    },
    // La rayita corta debajo del título es de Boho Terra. Acá el corte lo hace el
    // peso de la tipografía, no un adorno.
    tituloRayita: false,
    // El nombre del producto como los titulares del template: negro, enorme y
    // apretado ("MOVE FASTER. GO HARDER."). Con el peso 700 de la ficha genérica
    // se leía como un catálogo de otro sitio.
    nombre: { fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5 },

    // La misma paleta que el template ya usa en su portada y en el listado. Se
    // pide por la tabla y no se nombra la paleta derecho: así el día que alguien
    // cambie los colores de promo de Urban Pulse, la ficha lo sigue sola en vez
    // de quedar siendo la única pantalla con los viejos.
    // Sin esto salía con la clásica —violeta y azul— que no es de ningún template.
    paletaPromo: paletaDeTemplate("urban-pulse"),

    // La columna de compra como la losa blanca del modal: filo negro grueso a la
    // izquierda y fondo propio, recortada contra el gris de la página. Es lo que
    // más se mira de la ficha y lo que más la hacía parecer de cualquier template.
    // En celular las columnas se apilan y el filo pasa solo a estar arriba —
    // igual que hace el modal del template.
    panelCompra: {
      fondo: "#ffffff",
      filo: "#0f0f0f",
      filoGrosor: 3,
      padding: "28px 26px 30px",
    },

    // El modal marca la miniatura elegida con un filo negro grueso y apaga las
    // otras, en vez del borde de acento. El lima sobre una foto casi no se ve.
    miniaturaActiva: { borde: "#0f0f0f", grosor: 3 },

    // 28px peso 900, como en el panel del modal.
    precio: { fontSize: 28, fontWeight: 900 },

    // Las mismas 5 líneas que recorta el modal del template, y su "Leer todo".
    resenaComentario: { lineas: 5, desplegar: "Leer todo" },

    // ── La columna de compra ────────────────────────────────────────────────
    // "Tamaño" sirve para una heladera; esto es ropa deportiva.
    rotuloOpcion: { fontSize: 10, letterSpacing: 3, fontWeight: 800, textTransform: "uppercase" },
    chipTalleCuadrado: true,
    // El precio va en negro y no en el acento: el lima sobre el gris claro de la
    // página no se lee. (`resolveDetailTheme` ya lo resolvería cayendo al color de
    // texto, pero dejarlo dicho evita que alguien lo prenda pensando que se vería
    // amarillo.)
    precioAcento: false,
    botonCompraDestacado: true,
    // El template sí usa círculos —la campanita, los puntitos de aviso—, así que
    // la inicial de cada reseña queda redonda.
    avatarRedondo: true,
    // Igual que el bloque de opiniones de la tienda: primero el botón, el
    // formulario después. Desplegado son seis campos ocupando media pantalla para
    // algo que hace una de cada cien personas; lo que la mayoría quiere es LEER.
    resenaFormPlegado: true,
    // Se despliega abajo y no flotando: el modal es el gesto de Boho Terra. Acá el
    // bloque de opiniones de la tienda lo abre en la misma página.
    resenaFormModal: false,
    // Las dos frases salen de cómo habla el template en su bloque de opiniones.
    botonEscribirResena: "Dejá tu opinión",
    textoSinResenas: "Todavía nadie opinó sobre este producto. Si lo compraste, contanos cómo te fue.",
  },
};

export default function UrbanPulseDetail({ view }: { view: ProductDetailViewProps }) {
  const { slug, storeName, cartCount, catalogHref, whatsapp, product, cart, isPreview, accentOverride } = view;
  const theme = resolveDetailTheme(themeBase, accentOverride);
  const homeHref = `/tienda/${slug}${editorParam(isPreview)}`;

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg, fontFamily: theme.font, color: theme.text }}>
      {/* El menú repite el del catálogo: la marca en mayúsculas muy espaciadas y
          el filo grueso abajo, que es el borde que Urban Pulse usa en todos lados.
          Que sea el mismo es el punto — el que llega de Google tiene que sentir que
          ya está adentro de la tienda, y poder entrar al resto. */}
      <nav style={{
        borderBottom: `3px solid ${theme.text}`, padding: "0 20px",
        position: "sticky", top: 0, background: theme.pageBg, zIndex: CAPAS.navFicha,
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href={catalogHref} style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, letterSpacing: 3,
            fontWeight: 800, textTransform: "uppercase", color: theme.text, textDecoration: "none", flexShrink: 0,
          }}>
            <ChevronLeft size={14} /> Volver
          </Link>

          <Link href={homeHref} style={{
            fontWeight: 900, fontSize: 18, letterSpacing: 4, textTransform: "uppercase",
            color: theme.text, textDecoration: "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {storeName}
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <button onClick={() => { cart.setFavoritesOpen(true); cart.setCartOpen(false); }}
              style={{ color: theme.text, display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              aria-label="Favoritos"><Heart size={19} /></button>
            <Link href={homeHref} style={{ color: theme.text, display: "flex" }} aria-label="Mi cuenta"><User size={19} /></Link>
            <button onClick={() => { cart.setCartOpen(true); cart.setFavoritesOpen(false); }}
              style={{ color: theme.text, display: "flex", position: "relative", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              aria-label="Carrito">
              <ShoppingBag size={19} />
              {/* El contador va en el acento con filo negro, como los puntitos de
                  aviso del template. Cuadrado, no redondo: es un número. */}
              {cartCount > 0 && (
                <span style={{
                  position: "absolute", top: -7, right: -8, background: theme.accent, color: theme.accentText,
                  border: `2px solid ${theme.text}`, minWidth: 17, height: 17, padding: "0 3px",
                  fontSize: 9, fontWeight: 900,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <ProductDetailBody theme={theme} view={view} />

      {/* El pie va en el negro casi puro del template (#080808), no en el negro de
          la tinta: es el mismo corte que hace la tienda entre el cuerpo y el
          cierre. */}
      <ProductDetailFooter theme={theme} bg="#080808" view={view} />

      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Te consulto sobre ${product.name}`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: CAPAS.navFicha, background: "#25d366", color: "white", width: 56, height: 56,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(37,211,102,0.45)", textDecoration: "none" }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A8.86 8.86 0 0 0 12.07 3a8.86 8.86 0 0 0-7.65 13.43L3 21l4.74-1.24a8.86 8.86 0 0 0 4.33 1.1h.01c4.9 0 8.87-3.97 8.87-8.86 0-2.37-.92-4.6-2.35-6.68zm-5.53 13.63a7.37 7.37 0 0 1-3.76-1.03l-.27-.16-2.8.73.75-2.73-.18-.28a7.36 7.36 0 0 1-1.13-3.93c0-4.07 3.31-7.38 7.39-7.38a7.34 7.34 0 0 1 5.22 2.17 7.34 7.34 0 0 1 2.16 5.22c0 4.07-3.31 7.39-7.38 7.39zm4.04-5.53c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.16-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.11.22-.28.33-.42.11-.14.15-.24.22-.4.08-.16.04-.3-.04-.42-.08-.11-.5-1.2-.69-1.65-.18-.43-.37-.37-.51-.38-.13-.01-.28-.01-.43-.01-.15 0-.39.06-.6.28-.21.22-.8.78-.8 1.9 0 1.12.81 2.2.93 2.35.11.15 1.55 2.37 3.76 3.23 1.87.73 2.25.59 2.66.55.41-.04 1.3-.53 1.49-1.04.18-.51.18-.94.13-1.04-.06-.1-.22-.16-.44-.27z"/></svg>
        </a>
      )}

      <ProductDetailOverlays theme={theme} view={view} />
    </div>
  );
}
