"use client";
/**
 * El campo de teléfono de toda la plataforma (08/10/26): característica con
 * buscador + número. La lógica está en `lib/caracteristicas`.
 *
 * Se usa igual en todas partes: `value` es lo guardado (`+54 9 341 555-1234`,
 * o un número viejo escrito a mano, que se separa solo) y `onChange` devuelve
 * el valor nuevo ya armado. Cada formulario le pone su vestido con `estiloCampo`
 * (estilos en línea, como las tiendas) o `claseCampo` (Tailwind, como el panel).
 *
 * Si alguien pega o escribe el número completo en la parte del número, la
 * característica se completa sola. "Otro país" pasa a un campo libre.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  armarTelefono, buscarCaracteristica, caracteristicaValida, largoDelNumero, lugarDe, queFalta, separarTelefono,
  type Caracteristica,
} from "@/lib/caracteristicas";

/* La bandera dibujada y no con emoji: Windows no dibuja banderas, muestra "AR". */
function Bandera() {
  return (
    <svg width={20} height={14} viewBox="0 0 20 14" aria-hidden="true" style={{ flexShrink: 0, borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>
      <rect width="20" height="14" fill="#74acdf" />
      <rect y="4.67" width="20" height="4.67" fill="#fff" />
      <circle cx="10" cy="7" r="1.6" fill="#f6b40e" />
    </svg>
  );
}

type Props = {
  value: string;
  onChange: (valor: string) => void;
  /** El id del input del número: para el `<label htmlFor>` del formulario. */
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  estiloCampo?: CSSProperties;
  claseCampo?: string;
  /** Color de lo seleccionado en la lista (el acento de la tienda). */
  acento?: string;
  /** Mostrar "Faltan 2 números" debajo. Por defecto sí. */
  ayuda?: boolean;
  /** Etiqueta para lectores de pantalla si el formulario no tiene <label>. */
  etiqueta?: string;
};

export default function CampoTelefono({
  value, onChange, id, name, required, disabled, estiloCampo, claseCampo, acento = "#4f46e5", ayuda = true, etiqueta = "Teléfono",
}: Props) {
  const [inicial] = useState(() => separarTelefono(value));
  const [pais, setPais] = useState<"AR" | "otro">(inicial.pais);
  const [codigo, setCodigo] = useState(inicial.pais === "AR" ? inicial.codigo : "");
  const [numero, setNumero] = useState(inicial.pais === "AR" ? inicial.numero : "");
  const [libre, setLibre] = useState(inicial.pais === "otro" ? inicial.texto : "");
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [tocado, setTocado] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const numeroRef = useRef<HTMLInputElement>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const idNumero = id ?? `tel-${autoId}`;
  const idLista = `tel-lista-${autoId}`;

  /* Si el formulario vacía el campo desde afuera (después de enviar), se vacía acá también. */
  const [ultimo, setUltimo] = useState(value);
  if (value !== ultimo) {
    setUltimo(value);
    if (!value) { setNumero(""); setLibre(""); }
  }

  const emitir = (c: string, n: string) => { const v = armarTelefono(c, n); setUltimo(v); onChange(v); };

  const resultados = useMemo(() => buscarCaracteristica(q), [q]);
  const digitosQ = q.trim().replace(/^0+/, "");
  const aMano = /^\d+$/.test(digitosQ) && caracteristicaValida(digitosQ) && !lugarDe(digitosQ) ? digitosQ : null;
  type Opcion = { tipo: "car"; c: Caracteristica } | { tipo: "mano"; codigo: string } | { tipo: "otro" };
  const opciones: Opcion[] = [
    ...(aMano ? [{ tipo: "mano" as const, codigo: aMano }] : []),
    ...resultados.map((c) => ({ tipo: "car" as const, c })),
    { tipo: "otro" as const },
  ];

  useEffect(() => {
    if (!abierto) return;
    buscador.current?.focus();
    const fuera = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  function elegir(o: Opcion) {
    setAbierto(false);
    setQ("");
    if (o.tipo === "otro") {
      setPais("otro");
      const v = libre || "+";
      setLibre(v);
      onChange(v === "+" ? "" : v);
      return;
    }
    const c = o.tipo === "car" ? o.c.codigo : o.codigo;
    setCodigo(c);
    emitir(c, numero);
    setTimeout(() => numeroRef.current?.focus(), 0);
  }

  function escribirNumero(texto: string) {
    const d = texto.replace(/\D/g, "");
    /* Escribió o pegó el número entero (con característica): se separa solo. */
    if (d.length >= 10 && (!codigo || d.length > largoDelNumero(codigo) + 2)) {
      const p = separarTelefono(texto);
      if (p.pais === "AR" && p.codigo) { setCodigo(p.codigo); setNumero(p.numero); emitir(p.codigo, p.numero); return; }
      if (p.pais === "otro") { setPais("otro"); setLibre(p.texto); onChange(p.texto); return; }
    }
    const n = texto.replace(/[^\d\s-]/g, "").slice(0, 14);
    setNumero(n);
    emitir(codigo, n);
  }

  const aviso = pais === "AR" && tocado ? queFalta(codigo, numero) : null;
  const caja: CSSProperties = { minWidth: 0, boxSizing: "border-box", ...estiloCampo };

  if (pais === "otro") {
    return (
      <div ref={raiz} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <button type="button" disabled={disabled} onClick={() => { setPais("AR"); setLibre(""); emitir(codigo, numero); }}
          className={claseCampo} style={{ ...caja, flex: "0 0 auto", width: "auto", cursor: "pointer", whiteSpace: "nowrap", textAlign: "left" }}
          aria-label="Volver a un número de Argentina">
          <Bandera /> ↩
        </button>
        <input id={idNumero} name={name} type="tel" inputMode="tel" autoComplete="tel" required={required} disabled={disabled}
          value={libre} maxLength={30} placeholder="+598 99 123 456" aria-label={id ? undefined : etiqueta}
          onChange={(e) => { const v = e.target.value.replace(/[^\d+()\-.\s]/g, ""); setLibre(v); setUltimo(v); onChange(v); }}
          className={claseCampo} style={{ ...caja, flex: "1 1 0", width: 0 }} />
      </div>
    );
  }

  const lugar = codigo ? lugarDe(codigo) : null;
  return (
    <div ref={raiz} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <button type="button" disabled={disabled} onClick={() => { setAbierto((v) => !v); setMarcado(0); }}
          aria-haspopup="listbox" aria-expanded={abierto} aria-controls={idLista}
          aria-label={codigo ? `Característica ${codigo}${lugar ? `, ${lugar}` : ""}. Cambiar` : "Elegir característica"}
          className={claseCampo}
          style={{ ...caja, flex: "0 0 auto", width: "auto", maxWidth: "46%", display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            whiteSpace: "nowrap", overflow: "hidden", textAlign: "left" }}>
          <Bandera />
          {codigo
            ? <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}><strong style={{ fontWeight: 700 }}>{codigo}</strong>{lugar && <span style={{ opacity: 0.6 }}> · {lugar}</span>}</span>
            : <span style={{ opacity: 0.6 }}>Caract.</span>}
          <span aria-hidden="true" style={{ marginLeft: "auto", opacity: 0.5, fontSize: "0.8em" }}>▾</span>
        </button>
        <input ref={numeroRef} id={idNumero} name={name} type="tel" inputMode="numeric" autoComplete="tel-national" required={required} disabled={disabled}
          value={numero} aria-label={id ? undefined : etiqueta} aria-invalid={!!aviso || undefined}
          placeholder={codigo ? `${"5".repeat(largoDelNumero(codigo) - 4)}-1234` : "Número"}
          onChange={(e) => escribirNumero(e.target.value)} onBlur={() => setTocado(true)}
          className={claseCampo} style={{ ...caja, flex: "1 1 0", width: 0 }} />
      </div>

      {ayuda && aviso && (
        <p role="status" style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.4, color: "#b45309" }}>{aviso}</p>
      )}

      {abierto && (
        <div style={{ position: "absolute", zIndex: 60, top: "calc(100% + 6px)", left: 0, width: "min(340px, 100%)", minWidth: 240,
          background: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 16px 40px rgba(15,23,42,0.16)", overflow: "hidden",
          fontFamily: "inherit", textAlign: "left" }}>
          <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
            <input ref={buscador} value={q} onChange={(e) => { setQ(e.target.value); setMarcado(0); }} placeholder="Ciudad o característica"
              role="combobox" aria-controls={idLista} aria-expanded="true" aria-autocomplete="list"
              aria-activedescendant={`${idLista}-${marcado}`} aria-label="Buscar característica"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, opciones.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); if (opciones[marcado]) elegir(opciones[marcado]); }
                if (e.key === "Escape") { e.preventDefault(); setAbierto(false); }
              }}
              style={{ width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px", border: "1px solid #e5e7eb", borderRadius: 8,
                fontSize: 16, outline: "none", color: "#111827", background: "#fff", fontFamily: "inherit" }} />
          </div>
          <ul id={idLista} role="listbox" aria-label="Características" style={{ listStyle: "none", margin: 0, padding: 4, maxHeight: 260, overflowY: "auto" }}>
            {opciones.map((o, i) => {
              const sel = i === marcado;
              const elegido = o.tipo === "car" && o.c.codigo === codigo;
              return (
                <li key={o.tipo === "car" ? o.c.codigo : o.tipo === "mano" ? `m${o.codigo}` : "otro"} id={`${idLista}-${i}`} role="option" aria-selected={elegido}
                  onPointerDown={(e) => e.preventDefault()} onClick={() => elegir(o)} onMouseEnter={() => setMarcado(i)}
                  style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40, padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 14,
                    background: sel ? "#f1f5f9" : "transparent", borderTop: o.tipo === "otro" ? "1px solid #f1f5f9" : undefined, marginTop: o.tipo === "otro" ? 4 : 0 }}>
                  {o.tipo === "car" && <>
                    <strong style={{ minWidth: 42, fontVariantNumeric: "tabular-nums", color: elegido ? acento : "#111827" }}>{o.c.codigo}</strong>
                    <span style={{ flex: 1, color: "#475569" }}>{o.c.lugar}</span>
                    {elegido && <span aria-hidden="true" style={{ color: acento }}>✓</span>}
                  </>}
                  {o.tipo === "mano" && <><strong style={{ minWidth: 42 }}>{o.codigo}</strong><span style={{ color: "#475569" }}>Usar esta característica</span></>}
                  {o.tipo === "otro" && <span style={{ color: "#475569" }}>🌎 Otro país</span>}
                </li>
              );
            })}
            {resultados.length === 0 && !aMano && (
              <li role="presentation" style={{ padding: "10px", fontSize: 13, color: "#64748b" }}>
                No la encontramos. Escribí los números de la característica, sin el 0.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
