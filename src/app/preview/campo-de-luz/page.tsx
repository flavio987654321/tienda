"use client";
// Banco de pruebas de los bloques nuevos, antes de meterlos en el template.
// Es temporal: se borra cuando Aurora y Lumen estén cerrados.
import { Coverflow, type PiezaCoverflow } from "@/components/store/templates/shared/Coverflow";

const BASE = "#06070d";
const TINTA = "#f2f2f7";
const ACENTO = "#8b5cf6";

const PRODUCTOS: PiezaCoverflow[] = [
  { id: "1", imagen: "https://picsum.photos/seed/av-1/700/900", titulo: "Vestido de lino",     subtitulo: "$45.000", etiqueta: "Vestidos" },
  { id: "2", imagen: "https://picsum.photos/seed/av-2/700/900", titulo: "Camisa oversize",     subtitulo: "$32.000", etiqueta: "Camisas" },
  { id: "3", imagen: "https://picsum.photos/seed/av-3/700/900", titulo: "Pantalón wide leg",   subtitulo: "$51.000", etiqueta: "Pantalones" },
  { id: "4", imagen: "https://picsum.photos/seed/av-4/700/900", titulo: "Campera de cuero",    subtitulo: "$98.000", etiqueta: "Abrigos" },
  { id: "5", imagen: "https://picsum.photos/seed/av-5/700/900", titulo: "Sweater de lana",     subtitulo: "$41.000", etiqueta: "Sweaters" },
  { id: "6", imagen: "https://picsum.photos/seed/av-6/700/900", titulo: "Falda midi plisada",  subtitulo: "$37.000", etiqueta: "Faldas" },
];

export default function BancoDePruebas() {
  return (
    <div style={{ background: BASE, minHeight: "100vh" }}>
      <div style={{ padding: "22px 26px 10px" }}>
        <p style={{ margin: 0, fontSize: 10, letterSpacing: 5, textTransform: "uppercase", color: "rgba(242,242,247,.45)" }}>
          Bloque 1 · Coverflow
        </p>
      </div>
      <Coverflow
        piezas={PRODUCTOS}
        acento={ACENTO}
        base={BASE}
        tinta={TINTA}
        onElegir={(id) => console.log("elegido", id)}
      />
      <div style={{ height: 120 }} />
    </div>
  );
}
