/**
 * Los colores de los formularios compartidos de autos (consulta, tasación,
 * avisame si entra). Nacieron claros, con el blanco escrito a mano, y así se
 * ven en Auto Motor y Auto Drive. Auto Volt es oscuro de punta a punta y ahí
 * quedaban como ventanas blancas de otro template (13/10/26): con `oscuro`
 * usan esta otra paleta. La clara es EXACTAMENTE la de antes.
 */
export type PaletaFormulario = {
  /** Títulos y texto escrito. */
  tinta: string;
  /** Etiquetas de los campos. */
  etiqueta: string;
  /** "(opcional)" y textos de ayuda. */
  tenue: string;
  campoFondo: string;
  campoBorde: string;
  /** La caja que envuelve el formulario. */
  cajaFondo: string;
  cajaBorde: string;
  okFondo: string;
  okBorde: string;
  okTinta: string;
  error: string;
};

export const PALETA_CLARA: PaletaFormulario = {
  tinta: "#1a2744", etiqueta: "#555", tenue: "#999",
  campoFondo: "#fff", campoBorde: "#dcdcdc",
  cajaFondo: "#fafafa", cajaBorde: "#ececec",
  okFondo: "#f0fdf4", okBorde: "#bbf7d0", okTinta: "#166534",
  error: "#b91c1c",
};

export const PALETA_OSCURA: PaletaFormulario = {
  tinta: "#f1f4fb", etiqueta: "rgba(232,236,246,0.7)", tenue: "rgba(232,236,246,0.45)",
  campoFondo: "rgba(5,7,13,0.75)", campoBorde: "rgba(255,255,255,0.16)",
  cajaFondo: "rgba(255,255,255,0.03)", cajaBorde: "rgba(255,255,255,0.1)",
  okFondo: "rgba(34,197,94,0.1)", okBorde: "rgba(34,197,94,0.4)", okTinta: "#86efac",
  error: "#fb7185",
};

export const paletaFormulario = (oscuro?: boolean) => (oscuro ? PALETA_OSCURA : PALETA_CLARA);
