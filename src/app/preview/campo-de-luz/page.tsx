"use client";
// Banco de pruebas de los bloques nuevos, antes de meterlos en el template.
// Es temporal: se borra cuando Aurora y Lumen estén cerrados.
import { useRef, useState } from "react";
import { Coverflow, type MazoCoverflow } from "@/components/store/templates/shared/Coverflow";
import { GrillaProfunda, PiezaQueLlega } from "@/components/store/templates/shared/GrillaProfunda";
import { FichaEnVuelo, type Apertura, type PiezaFicha, type Seleccion } from "@/components/store/templates/shared/FichaEnVuelo";
import { Inclinable, vidrio } from "@/components/store/templates/shared/Materia";

const BASE = "#06070d";
const TINTA = "#f2f2f7";
const ACENTO = "#8b5cf6";
const MID = "rgba(242,242,247,.45)";

const OPCIONES = [
  {
    nombre: "Color",
    valores: [
      { valor: "Negro", color: "#17171c" },
      { valor: "Arena", color: "#d6c7ae" },
      { valor: "Violeta", color: "#8b5cf6" },
      { valor: "Oliva", color: "#5d6b4a", agotado: true },
    ],
  },
  {
    nombre: "Talle",
    valores: [{ valor: "S" }, { valor: "M" }, { valor: "L" }, { valor: "XL", agotado: true }],
  },
];

const PRODUCTOS = [
  { id: "1", foto: "https://picsum.photos/seed/av-1/700/900", nombre: "Vestido de lino",    precio: "$45.000", cat: "Vestidos" },
  { id: "2", foto: "https://picsum.photos/seed/av-2/700/900", nombre: "Camisa oversize",    precio: "$32.000", cat: "Camisas" },
  { id: "3", foto: "https://picsum.photos/seed/av-3/700/900", nombre: "Pantalón wide leg",  precio: "$51.000", cat: "Pantalones" },
  { id: "4", foto: "https://picsum.photos/seed/av-4/700/900", nombre: "Campera de cuero",   precio: "$98.000", cat: "Abrigos" },
  { id: "5", foto: "https://picsum.photos/seed/av-5/700/900", nombre: "Sweater de lana",    precio: "$41.000", cat: "Sweaters" },
  { id: "6", foto: "https://picsum.photos/seed/av-6/700/900", nombre: "Falda midi plisada", precio: "$37.000", cat: "Faldas" },
  { id: "7", foto: "https://picsum.photos/seed/av-7/700/900", nombre: "Blusa de seda",      precio: "$39.000", cat: "Camisas" },
  { id: "8", foto: "https://picsum.photos/seed/av-8/700/900", nombre: "Jean recto",         precio: "$46.000", cat: "Pantalones" },
];

const MAZOS: MazoCoverflow[] = [
  {
    id: "destacados", etiqueta: "Destacados",
    onElegir: (id) => console.log("abrir ficha", id),
    piezas: PRODUCTOS.slice(0, 6).map(p => ({ id: p.id, imagen: p.foto, titulo: p.nombre, subtitulo: p.precio, etiqueta: p.cat })),
  },
  {
    id: "categorias", etiqueta: "Categorías",
    onElegir: (id) => console.log("catálogo filtrado", id),
    piezas: [
      { id: "vestidos",   imagen: "https://picsum.photos/seed/av-1/700/900", titulo: "Vestidos",   subtitulo: "12 productos" },
      { id: "camisas",    imagen: "https://picsum.photos/seed/av-2/700/900", titulo: "Camisas",    subtitulo: "8 productos" },
      { id: "pantalones", imagen: "https://picsum.photos/seed/av-3/700/900", titulo: "Pantalones", subtitulo: "15 productos" },
      { id: "abrigos",    imagen: "https://picsum.photos/seed/av-4/700/900", titulo: "Abrigos",    subtitulo: "6 productos" },
      { id: "sweaters",   imagen: "https://picsum.photos/seed/av-5/700/900", titulo: "Sweaters",   subtitulo: "9 productos" },
    ],
  },
];

// Stock de mentira pero con la forma del real: algunas combinaciones no existen,
// otras están al límite. Sin eso no se puede ver si la ficha avisa bien.
const STOCK: Record<string, number> = {
  "Negro|S": 12, "Negro|M": 2, "Negro|L": 0,
  "Arena|S": 5, "Arena|M": 8, "Arena|L": 1,
  "Violeta|S": 0, "Violeta|M": 3, "Violeta|L": 7,
};
function stockDe(_p: PiezaFicha, s: Seleccion): number | null {
  const clave = `${s["Color"]}|${s["Talle"]}`;
  return STOCK[clave] ?? 0;
}

function Rotulo({ n, texto }: { n: number; texto: string }) {
  return (
    <p style={{ margin: "0 0 18px", fontSize: 10, letterSpacing: 5, textTransform: "uppercase", color: MID }}>
      Bloque {n} · {texto}
    </p>
  );
}

function Tarjeta({
  p, indice, onAbrir,
}: {
  p: (typeof PRODUCTOS)[number];
  indice: number;
  onAbrir: (pieza: PiezaFicha, desde: HTMLElement) => void;
}) {
  // El ref va en la FOTO, no en la tarjeta entera: es la foto la que vuela, y
  // tiene que salir del rectángulo exacto donde ya se estaba viendo.
  const fotoRef = useRef<HTMLDivElement>(null);

  const abrir = () => {
    if (fotoRef.current) {
      onAbrir(
        {
          id: p.id, foto: p.foto, nombre: p.nombre, precio: p.precio, categoria: p.cat,
          descripcion: "Corte holgado, caída suave. Tejido de origen nacional, prelavado para que no encoja.",
          opciones: OPCIONES,
        },
        fotoRef.current,
      );
    }
  };

  return (
    <PiezaQueLlega indice={indice}>
      <Inclinable grados={5} style={{ borderRadius: 18 }}>
        <article
          onClick={abrir}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } }}
          role="button"
          tabIndex={0}
          style={{ ...vidrio("oscuro"), borderRadius: 18, overflow: "hidden", cursor: "pointer" }}
        >
          <div ref={fotoRef} style={{ aspectRatio: "3/4", overflow: "hidden", background: "#0e0f1a", borderRadius: "18px 18px 0 0" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- banco de pruebas temporal */}
            <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ padding: "16px 18px 20px" }}>
            <p style={{ margin: "0 0 7px", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: MID }}>{p.cat}</p>
            <p style={{ margin: "0 0 10px", fontSize: 15, color: TINTA, letterSpacing: "-0.01em" }}>{p.nombre}</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: TINTA }}>{p.precio}</p>
          </div>
        </article>
      </Inclinable>
    </PiezaQueLlega>
  );
}

export default function BancoDePruebas() {
  const [apertura, setApertura] = useState<Apertura | null>(null);

  return (
    <div style={{ background: BASE, minHeight: "100vh" }}>
      <div style={{ padding: "22px 26px 10px" }}>
        <Rotulo n={1} texto="Coverflow · dos mazos" />
      </div>
      <Coverflow mazos={MAZOS} acento={ACENTO} base={BASE} tinta={TINTA} />

      <div style={{ padding: "70px 26px 120px", maxWidth: 1180, margin: "0 auto" }}>
        <Rotulo n={3} texto="Catálogo · las piezas llegan desde el fondo" />
        <p style={{ margin: "0 0 8px", fontSize: 13, color: MID }}>
          Scrolleá despacio: entran giradas y desenfocadas, y se enderezan al apoyarse.
        </p>
        <p style={{ margin: "0 0 34px", fontSize: 13, color: MID }}>
          <strong style={{ color: TINTA, fontWeight: 500 }}>Bloque 4:</strong> tocá cualquier tarjeta — la foto sale de ahí y crece.
        </p>
        <GrillaProfunda min={230}>
          {PRODUCTOS.map((p, i) => (
            <Tarjeta key={p.id} p={p} indice={i} onAbrir={(pieza, desde) => setApertura({ pieza, desde })} />
          ))}
        </GrillaProfunda>
      </div>

      <FichaEnVuelo
        apertura={apertura}
        onCerrar={() => setApertura(null)}
        onAgregar={(p, s) => console.log("agregar", p.nombre, s)}
        stockDe={stockDe}
        acento={ACENTO}
        tinta={TINTA}
      />
    </div>
  );
}
