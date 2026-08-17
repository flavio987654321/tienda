"use client";
import Link from "next/link";
import { ChevronLeft, Heart, ShoppingBag, User } from "lucide-react";
import { paletaDeTemplate } from "@/components/store/PromoDisplay";
import { ProductDetailBody, ProductDetailFooter, ProductDetailOverlays, resolveDetailTheme, editorParam, type DetailTheme, type ProductDetailViewProps } from "./shared";
import { CAPAS } from "@/lib/capas-tienda";

/**
 * La ficha de producto de Boho Terra.
 *
 * Existe porque el template no estaba en la lista de fichas con diseño propio, y
 * caía en la genérica: fondo blanco y botones violetas, sin el menú ni el pie de
 * la tienda. El cliente recorría una tienda con una identidad, tocaba un
 * producto o llegaba desde Google, y aterrizaba en una página que parecía de
 * otro sitio — justo donde decide comprar.
 *
 * Boho Terra lo usan tres de las cuatro tiendas activas, así que es la que más
 * gente ve.
 *
 * Del template se toma la IDENTIDAD, no el acomodo: los colores medidos, la
 * Georgia en itálica de los títulos, el ritmo de las mayúsculas espaciadas. La
 * disposición es la de una página —menú arriba, pie abajo, ancho completo— y no
 * la del modal, que es una ventanita con scroll adentro. Estirar un modal a
 * pantalla completa se nota.
 */

const themeBase: DetailTheme = {
  // Los mismos valores que el template, no parecidos: el crema y el topo salen
  // de BohoTerra.tsx. Un #fff en vez del #faf7f2 se ve al lado del menú.
  pageBg: "#faf7f2",
  text: "#2c2218",
  muted: "#9a8070",
  accent: "#b5652a",
  accentText: "#ffffff",
  accentReadable: "#b5652a",
  cardBorder: "#e6dcd0",
  font: "'Helvetica Neue', Arial, sans-serif",
  headingFont: "Georgia, 'Times New Roman', serif",
  // Boho Terra no usa esquinas redondeadas en ningún lado.
  radius: 0,

  // Lo que este template cambia del acomodo. Lo que no diga, hereda.
  vestido: {
    // Los títulos del template no son negritas grandes: son mayúsculas chiquitas
    // muy espaciadas, con una rayita corta debajo. Es el gesto que más se repite
    // en Boho Terra y lo que hace que una sección "suene" a este template.
    tituloSeccion: {
      fontSize: 9,
      letterSpacing: 3,
      fontWeight: 600,
      textTransform: "uppercase",
      opacity: 0.75,
    },
    tituloRayita: true,
    // "La pieza" y no "Descripción": es como le dice el modal. Hablarle distinto
    // al mismo contenido en dos pantallas de la misma tienda se nota.
    rotuloDescripcion: "La pieza",
    rotuloEspecificaciones: "Materiales",
    // El nombre en la Georgia itálica del template, como en el modal y como el
    // resto de los títulos de la tienda. Con la serif derecha se leía como una
    // ficha de catálogo de otro sitio.
    nombre: { fontStyle: "italic", fontWeight: 400 },
    // Boho Terra tiene su propia paleta de promos —terracota y tierras— y la
    // ficha era la única pantalla que seguía pintándolas con la clásica: el mismo
    // descuento salía terracota en la portada y FUCSIA al abrir el producto.
    paletaPromo: paletaDeTemplate("boho-terra"),
    // La columna de compra, igual que el panel del modal ─────────────────────
    rotuloOpcion: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase" },
    chipTalleCuadrado: true,
    precioAcento: true,
    botonCompraDestacado: true,
    // En toda la tienda no hay una esquina redondeada; el círculo de la inicial
    // de cada reseña era lo único.
    avatarRedondo: false,
    // Igual que en el modal: primero el botón, el formulario después. Desplegado
    // eran seis campos ocupando media pantalla antes de los productos similares.
    resenaFormPlegado: true,
    // Y se abre flotando, como en el modal del template.
    resenaFormModal: true,
    botonEscribirResena: "Escribí tu reseña",
    textoSinResenas: "Sé el primero en dejar una reseña.",
    rotuloSimilares: "Productos similares",
  },
};

export default function BohoTerraDetail({ view }: { view: ProductDetailViewProps }) {
  const { slug, storeName, cartCount, catalogHref, whatsapp, product, cart, isPreview, accentOverride } = view;
  const theme = resolveDetailTheme(themeBase, accentOverride);
  const homeHref = `/tienda/${slug}${editorParam(isPreview)}`;

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg, fontFamily: theme.font, color: theme.text }}>
      {/* El menú repite el del catálogo del template: la marca centrada en
          Georgia itálica espaciada, y los íconos a la derecha. Que sea el mismo
          es el punto — el que llega de Google tiene que sentir que ya está
          adentro de la tienda, y poder entrar al resto. */}
      <nav style={{
        borderBottom: `1px solid ${theme.cardBorder}`, padding: "0 24px",
        position: "sticky", top: 0, background: theme.pageBg, zIndex: CAPAS.navFicha,
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href={catalogHref} style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: 2,
            textTransform: "uppercase", color: theme.muted, textDecoration: "none", flexShrink: 0,
          }}>
            <ChevronLeft size={14} /> Volver
          </Link>

          <Link href={homeHref} style={{
            fontFamily: theme.headingFont, fontStyle: "italic", fontSize: 22, letterSpacing: 2,
            color: theme.text, textDecoration: "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {storeName}
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <button onClick={() => { cart.setFavoritesOpen(true); cart.setCartOpen(false); }}
              style={{ color: theme.muted, display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              aria-label="Favoritos"><Heart size={19} /></button>
            <Link href={homeHref} style={{ color: theme.muted, display: "flex" }} aria-label="Mi cuenta"><User size={19} /></Link>
            <button onClick={() => { cart.setCartOpen(true); cart.setFavoritesOpen(false); }}
              style={{ color: theme.muted, display: "flex", position: "relative", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              aria-label="Carrito">
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -7, background: theme.accent, color: theme.accentText,
                  borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <ProductDetailBody theme={theme} view={view} />

      {/* El pie va en el arena del template (#f0e9df) y no en blanco: es el
          mismo corte que hace la tienda entre el cuerpo y el cierre. */}
      <ProductDetailFooter theme={theme} bg="#f0e9df" view={view} />

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
