"use client";
// Página de prueba de las piezas nuevas: la escena de luz y la materia (vidrio,
// sombras, inclinación). Es temporal — se borra cuando todo esto viva adentro de
// Aurora y Lumen.
import { CampoDeLuz } from "@/components/store/templates/shared/CampoDeLuz";
import { Inclinable, vidrio, sombra, type Modo } from "@/components/store/templates/shared/Materia";

const FOTOS = [
  "https://picsum.photos/seed/aurora-1/600/750",
  "https://picsum.photos/seed/aurora-2/600/750",
  "https://picsum.photos/seed/aurora-3/600/750",
];

function Tarjeta({ modo, foto, nombre, precio }: { modo: Modo; foto: string; nombre: string; precio: string }) {
  const oscuro = modo === "oscuro";
  return (
    <Inclinable grados={7} style={{ borderRadius: 20 }}>
      <article style={{ ...vidrio(modo), borderRadius: 20, overflow: "hidden" }}>
        <div style={{ aspectRatio: "4/5", overflow: "hidden", background: oscuro ? "#15151f" : "#eceaf2" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- página de prueba temporal */}
          <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
        <div style={{ padding: "16px 18px 20px" }}>
          <p style={{ margin: 0, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: oscuro ? "rgba(255,255,255,.45)" : "rgba(20,20,30,.45)" }}>
            Colección
          </p>
          <h3 style={{ margin: "6px 0 10px", fontSize: 17, fontWeight: 500, letterSpacing: -0.2, color: oscuro ? "#f2f2f7" : "#15151f" }}>
            {nombre}
          </h3>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: oscuro ? "#fff" : "#15151f" }}>{precio}</p>
        </div>
      </article>
    </Inclinable>
  );
}

function Banda({ modo }: { modo: Modo }) {
  const oscuro = modo === "oscuro";
  const tinta = oscuro ? "#f2f2f7" : "#15151f";
  return (
    <section style={{ position: "relative", minHeight: "100vh", padding: "72px 40px" }}>
      <CampoDeLuz
        modo={modo}
        base={oscuro ? "#06070d" : "#fbfaf8"}
        colores={oscuro ? ["#7c3aed", "#2563eb", "#db2777"] : ["#f5b8c8", "#b9d4f0", "#e8dcc8"]}
      />
      <div style={{ position: "relative", maxWidth: 1120, margin: "0 auto" }}>
        <p style={{ margin: 0, fontSize: 10, letterSpacing: 6, textTransform: "uppercase", color: oscuro ? "rgba(255,255,255,.5)" : "rgba(20,20,30,.5)" }}>
          {oscuro ? "Aurora · oscuro" : "Lumen · claro"}
        </p>
        <h2 style={{ margin: "14px 0 8px", fontSize: 46, fontWeight: 300, letterSpacing: -1.2, color: tinta }}>
          Luz sobre la materia
        </h2>
        <p style={{ margin: "0 0 40px", fontSize: 14, color: oscuro ? "rgba(255,255,255,.55)" : "rgba(20,20,30,.55)" }}>
          Pasá el mouse por una tarjeta. En celular no se inclina — y está bien.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 26 }}>
          <Tarjeta modo={modo} foto={FOTOS[0]} nombre="Vestido de lino" precio="$45.000" />
          <Tarjeta modo={modo} foto={FOTOS[1]} nombre="Camisa oversize" precio="$32.000" />
          <Tarjeta modo={modo} foto={FOTOS[2]} nombre="Pantalón wide leg" precio="$51.000" />
        </div>

        {/* Comparación de las tres capas de sombra */}
        <div style={{ display: "flex", gap: 24, marginTop: 56, flexWrap: "wrap" }}>
          {([1, 2, 3] as const).map((n) => (
            <div key={n} style={{
              width: 150, height: 92, borderRadius: 14, display: "grid", placeItems: "center",
              background: oscuro ? "#111119" : "#fff", boxShadow: sombra(modo, n),
              color: oscuro ? "rgba(255,255,255,.5)" : "rgba(20,20,30,.5)", fontSize: 11, letterSpacing: 2,
            }}>
              SOMBRA {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PruebaMateria() {
  return (
    <div>
      <Banda modo="oscuro" />
      <Banda modo="claro" />
    </div>
  );
}
