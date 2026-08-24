"use client";
import { useEffect, useRef, useState } from "react";
import { FadeImage } from "@/components/store/templates/shared/FadeImage";
import { useEditContext } from "@/contexts/EditContext";
import { CAPAS } from "@/lib/capas-tienda";
import {
  leerModo, leerElegidos, escribirElegidos, MAX_ELEGIDOS,
  type ModoVitrina,
} from "@/lib/vitrina";

/**
 * El engranaje que decide QUÉ productos muestra el bloque de la portada.
 *
 * Aparece sólo en modo edición, al lado del "Ver todo" del bloque. Se resuelve
 * SOBRE el bloque y no en el panel de la derecha a propósito: es una decisión que
 * se toma mirando la vitrina llena —"así no, poné la campera adelante"— y en el
 * panel lateral se elige a ciegas. Mismo criterio que el selector de producto de
 * Urban Pulse y el cambiador de íconos de las garantías.
 *
 * Lo que elige la dueña se guarda en dos `textOverrides`:
 *
 *   vitrinaModo  →  "recientes" | "elegidos" | "azar"
 *   vitrinaIds   →  los ids separados por coma, en el orden elegido
 *
 * Y no en un campo propio del `StoreConfig`. Es la misma mecánica que ya usan
 * `featuredProductId`, `featuredRotacion` y las baldosas de categoría: viaja con
 * "Guardar cambios" sin tocar el esquema, la validación ni la base. La contra —un
 * texto que en realidad es una lista— está acotada en `vitrina.ts`, que es el
 * único que la lee y la escribe, con el tope de 12 puesto por el límite de 500
 * caracteres del override.
 *
 * Es de la TIENDA y no de cada template: si mañana cambia de diseño, la vitrina
 * que armó se la lleva puesta. Por eso las claves no llevan prefijo del template.
 */
export function BotonVitrina({ products, cuantos, acento = "#6366f1" }: {
  /** El catálogo entero, para poder elegir de ahí. */
  products: { id: string; name: string; images: string[] }[];
  /** Cuántos lugares tiene ESTE bloque. Se le dice a la dueña, no se adivina. */
  cuantos: number;
  /** Color del template, para que el panel no se vea pegado de otro lado. */
  acento?: string;
}) {
  const { editMode, overrides, setOverride } = useEditContext();
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const caja = useRef<HTMLSpanElement>(null);

  const modo = leerModo(overrides["vitrinaModo"]?.text);
  const elegidos = leerElegidos(overrides["vitrinaIds"]?.text);

  /* Se cierra tocando afuera, y con Escape.
   *
   * Sin esto el panel quedaba abierto para siempre: tapaba media vitrina —que es
   * justo lo que hay que mirar para decidir— y la única forma de sacarlo era
   * volver a tocar el engranaje, que queda escondido atrás del propio panel.
   *
   * Va en un efecto y no en un `onBlur` porque adentro hay botones y un buscador:
   * cada vez que se pasa de uno a otro el foco se va un instante, y con `onBlur`
   * el panel se cerraba solo al tocar el buscador. */
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  if (!editMode) return null;

  const guardarModo = (m: ModoVitrina) => setOverride("vitrinaModo", { text: m });

  /* Cuántos se pueden elegir: los que ENTRAN en este bloque.
   *
   * Antes el tope era 12 —el del guardado— y se dejaba elegir de más "de
   * reserva", con un cartel explicando que los que sobraban no se veían. Estaba
   * mal: en un bloque de seis lugares, el séptimo tilde no hace nada, y un
   * control que acepta lo que después ignora es un control que miente. El tope de
   * 12 sigue existiendo en `vitrina.ts` para que el guardado no recorte solo,
   * pero acá manda el bloque. */
  const tope = Math.min(cuantos, MAX_ELEGIDOS);
  const lleno = elegidos.length >= tope;

  /* Tocar un producto lo agrega al final o lo saca. Al final y no al principio
     porque el orden ES la decisión: la dueña arma la vitrina de izquierda a
     derecha, y meter cada nuevo elegido adelante le daría vuelta la fila cada vez.

     Elegir uno prende solo el modo "elegidos". Sin eso, la dueña elige seis
     productos, no pasa nada en pantalla —porque el modo seguía en "recientes"— y
     la conclusión es que el engranaje no anda. */
  const alternar = (id: string) => {
    const ya = elegidos.includes(id);
    if (!ya && lleno) return; // el botón ya está apagado; esto es el cinturón
    const nuevos = ya ? elegidos.filter(x => x !== id) : [...elegidos, id].slice(0, tope);
    setOverride("vitrinaIds", { text: escribirElegidos(nuevos) });
    if (!ya && modo !== "elegidos") guardarModo("elegidos");
  };

  const etiqueta =
    modo === "elegidos" ? `${elegidos.length} elegidos` :
    modo === "azar"     ? "Al azar" :
    "Los últimos";

  const lista = products.filter(p =>
    p.name.toLowerCase().includes(busqueda.trim().toLowerCase()));

  const OPCIONES: { id: ModoVitrina; titulo: string; bajada: string }[] = [
    { id: "recientes", titulo: "Los últimos que cargué",
      bajada: "Se renueva solo cada vez que subís un producto nuevo." },
    { id: "elegidos", titulo: "Los que yo elija",
      bajada: `Elegí ${tope} de la lista de abajo. Se muestran en el orden en que los tocás.` },
    { id: "azar", titulo: "Al azar",
      bajada: "Cambia todos los días y no dentro del mismo día, así el que vuelve encuentra lo que vio." },
  ];

  return (
    <span ref={caja} style={{ position: "relative", display: "inline-flex" }}>
      <button type="button" onClick={() => setAbierto(o => !o)}
        title="Elegir qué productos se muestran acá"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: abierto ? acento : "rgba(20,22,26,0.72)", color: "#fff",
          border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: 7,
          padding: "5px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
        }}>
        ⚙ {etiqueta}
      </button>

      {abierto && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, width: 290,
          maxHeight: 420, overflowY: "auto", zIndex: CAPAS.navMenu,
          background: "rgba(17,17,17,0.97)", color: "#fff",
          border: "1px solid rgba(255,255,255,0.18)", borderRadius: 10,
          boxShadow: "0 12px 32px rgba(0,0,0,0.55)", padding: 12,
          backdropFilter: "blur(10px)", textAlign: "left",
        }}>
          <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            Qué se muestra acá
          </p>
          {/* La cantidad se dice, no se elige: sale de las columnas del template y
              cambiarla deja la última fila coja. */}
          <p style={{ margin: "0 0 10px", fontSize: 10.5, lineHeight: 1.45, color: "rgba(255,255,255,0.45)" }}>
            Este bloque tiene <strong style={{ color: "#fff" }}>{cuantos} lugares</strong>.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {OPCIONES.map(op => {
              const activo = modo === op.id;
              return (
                <button key={op.id} type="button" onClick={() => guardarModo(op.id)}
                  style={{
                    textAlign: "left", width: "100%", cursor: "pointer",
                    background: activo ? "rgba(99,102,241,0.28)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${activo ? acento : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 7, padding: "8px 10px", color: "#fff", fontFamily: "inherit",
                  }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 700 }}>
                    {activo ? "● " : "○ "}{op.titulo}
                  </span>
                  <span style={{ display: "block", fontSize: 10.5, lineHeight: 1.4, marginTop: 2, color: "rgba(255,255,255,0.55)" }}>
                    {op.bajada}
                  </span>
                </button>
              );
            })}
          </div>

          {modo === "elegidos" && (<>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "14px 0 7px" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                Cuáles
              </p>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: lleno ? acento : "rgba(255,255,255,0.45)" }}>
                {elegidos.length} de {tope}
              </span>
            </div>

            {/* Con los lugares llenos, el resto de la lista se apaga. Se dice qué
                hacer —sacar uno— en vez de dejar botones que no responden. */}
            {lleno && (
              <p style={{ margin: "0 0 8px", fontSize: 10.5, lineHeight: 1.45, color: "rgba(255,255,255,0.55)" }}>
                Llenaste los {tope} lugares. Para cambiar uno, tocá el que quieras sacar.
              </p>
            )}
            {elegidos.length > 0 && !lleno && (
              <p style={{ margin: "0 0 8px", fontSize: 10.5, lineHeight: 1.45, color: "rgba(255,255,255,0.55)" }}>
                {tope - elegidos.length === 1
                  ? "Falta 1 para llenar el bloque."
                  : `Faltan ${tope - elegidos.length} para llenar el bloque.`}{" "}
                Con menos, el bloque se achica.
              </p>
            )}

            {/* Buscador: una tienda con doscientos productos no se resuelve
                scrolleando. Mismo criterio que el selector de Urban Pulse. */}
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre…"
              style={{
                width: "100%", boxSizing: "border-box", marginBottom: 8,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6, padding: "6px 9px", fontSize: 11.5, color: "#fff",
                outline: "none", fontFamily: "inherit",
              }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {lista.length === 0 && (
                <p style={{ margin: "4px 0", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  {products.length === 0 ? "Todavía no cargaste productos." : "Ninguno se llama así."}
                </p>
              )}
              {lista.map(p => {
                const pos = elegidos.indexOf(p.id);
                const activo = pos >= 0;
                // Apagado, no escondido: si desaparecieran, la lista se movería
                // sola al elegir y sería imposible seguir dónde estaba una.
                const apagado = !activo && lleno;
                return (
                  <button key={p.id} type="button" onClick={() => alternar(p.id)}
                    disabled={apagado}
                    title={apagado ? `Ya elegiste los ${tope} que entran acá` : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
                      background: activo ? "rgba(99,102,241,0.28)" : "none", border: "none",
                      borderRadius: 6, padding: "5px 6px",
                      cursor: apagado ? "default" : "pointer", opacity: apagado ? 0.35 : 1,
                      color: "#fff", fontFamily: "inherit",
                    }}>
                    {/* El NÚMERO y no un tilde: en esta lista el orden es la mitad
                        de la decisión, y un tilde no dice en qué lugar quedó. */}
                    <span style={{
                      width: 18, height: 18, flexShrink: 0, borderRadius: "50%",
                      border: `1.5px solid ${activo ? acento : "rgba(255,255,255,0.25)"}`,
                      background: activo ? acento : "transparent",
                      display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800,
                    }}>
                      {activo ? pos + 1 : ""}
                    </span>
                    <span style={{ position: "relative", width: 26, height: 34, flexShrink: 0, background: "rgba(255,255,255,0.08)", overflow: "hidden", borderRadius: 3 }}>
                      {p.images[0] && <FadeImage src={p.images[0]} alt="" fill sizes="26px" style={{ objectFit: "cover" }} />}
                    </span>
                    <span style={{ fontSize: 11.5, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {elegidos.length > 0 && (
              <button type="button" onClick={() => setOverride("vitrinaIds", { text: "" })}
                style={{
                  width: "100%", marginTop: 9, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
                  padding: "6px 0", fontSize: 11, fontWeight: 700, color: "#fff",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                ↺ Empezar de nuevo
              </button>
            )}
          </>)}

          {/* "Listo" NO guarda: cada cosa que se toca ya quedó puesta y se ve en
              la vitrina de atrás en el momento. Este botón CIERRA.
              Existe igual porque sin él no había ninguna señal de que se podía
              terminar: un panel sin salida se lee como un formulario a medio
              llenar, y la duda razonable es "¿esto se guardó?". Lo dice el propio
              botón, abajo. Guardar de verdad —en la tienda— sigue siendo
              "Guardar cambios", arriba, igual que todo lo demás del editor. */}
          <button type="button" onClick={() => setAbierto(false)}
            style={{
              width: "100%", marginTop: 12, background: acento, color: "#fff",
              border: "none", borderRadius: 7, padding: "9px 0",
              fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}>
            Listo
          </button>
          <p style={{ margin: "8px 0 0", fontSize: 10, lineHeight: 1.45, color: "rgba(255,255,255,0.4)" }}>
            Se va aplicando solo mientras elegís. Para que quede en tu tienda, acordate de
            <strong style={{ color: "rgba(255,255,255,0.7)" }}> Guardar cambios</strong> arriba.
            Vale para toda la tienda: si cambiás de diseño, la vitrina te la llevás.
          </p>
        </div>
      )}
    </span>
  );
}
