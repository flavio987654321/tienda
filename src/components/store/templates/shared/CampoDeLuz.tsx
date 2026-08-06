"use client";
import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// La escena de fondo: luz de verdad, calculada por la placa de video.
//
// Es lo que hace que Aurora y Lumen se sientan distintos a los otros diez
// templates. No es un GIF ni un degradado CSS: son tres centros de luz que se
// mueven despacio y se mezclan, pintados píxel por píxel en la GPU.
//
// POR QUÉ NO THREE.JS
//
// Three.js pesa ~150 KB y sirve para renderizar geometría — modelos 3D. Acá no
// hay modelos ni los va a haber: las vendedoras suben fotos del celular. Lo que
// sí hace falta es una escena con luz y profundidad, y eso es un shader: un
// programa de ~40 líneas que corre en la GPU. Sin librería, sin dependencia
// nueva, y el archivo entero pesa menos que una foto de producto.
//
// LO QUE NO PUEDE PASAR
//
// Esto es decoración. Si falla, la tienda tiene que seguir vendiendo:
//
//   · Si el navegador no da contexto WebGL (celular viejo, GPU bloqueada,
//     máquina virtual), no se dibuja nada y queda el degradado CSS de abajo.
//     Nunca un cuadro negro ni un error.
//   · Si la persona pidió "reducir movimiento" en su sistema, se pinta UN
//     cuadro y se corta la animación. La escena existe, pero quieta.
//   · Mientras no se ve, no se dibuja. Sin esto, una tienda abierta en una
//     pestaña de fondo le come la batería al celular todo el día.
//   · Se limita a 30 cuadros por segundo y a 1.5x de densidad de píxel. En un
//     fondo que se mueve así de lento, 60fps y 3x no se notan — el calor del
//     teléfono sí.
// ─────────────────────────────────────────────────────────────────────────────

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// `mediump` a propósito: en móviles `highp` puede no existir en el fragment
// shader y el programa no compila. Para luz difusa, la precisión media sobra.
const FRAG = `
precision mediump float;
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uA;
uniform vec3  uB;
uniform vec3  uC;
uniform vec3  uBase;
/** 1.0 = fondo oscuro (la luz se suma) · 0.0 = fondo claro (la luz tiñe). */
uniform float uOscuro;

/* Ruido barato para el grano. Sin grano, un degradado grande se ve "bandeado":
   escalones de color en vez de una transición suave. */
float ruido(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  // Coordenada centrada y con la proporción corregida, para que los círculos de
  // luz sean redondos y no óvalos en pantallas anchas.
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);

  float t = uTime * 0.05;

  // Deformación del espacio antes de medir distancias. Sin esto, cada luz es un
  // disco perfecto y se lee como "tres círculos borrosos"; con esto los bordes
  // ondulan y el conjunto parece humo o tela. Es lo que separa un degradado de
  // una escena.
  p += 0.09 * vec2(sin(p.y * 2.7 + t * 1.7), cos(p.x * 2.3 - t * 1.3));

  // Tres centros que orbitan a velocidades sin múltiplos comunes, así el
  // conjunto no se repite de forma reconocible.
  vec2 c1 = vec2(sin(t * 1.10) * 0.55, cos(t * 0.90) * 0.40);
  vec2 c2 = vec2(cos(t * 0.70) * 0.62, sin(t * 1.30) * 0.45);
  vec2 c3 = vec2(sin(t * 0.50 + 2.0) * 0.45, cos(t * 0.60 + 1.0) * 0.58);

  // Radios grandes y caída larga: las luces se superponen casi siempre, que es
  // lo que hace que se lean como UNA atmósfera y no como tres manchas. Antes los
  // radios eran chicos y ademas se elevaba al cuadrado, que apreta el brillo
  // contra el centro — de ahí el punto quemado.
  float s1 = 1.0 - smoothstep(0.0, 1.25, length(p - c1));
  float s2 = 1.0 - smoothstep(0.0, 1.35, length(p - c2));
  float s3 = 1.0 - smoothstep(0.0, 1.15, length(p - c3));

  float peso = s1 + s2 + s3;

  vec3 col;
  if (uOscuro > 0.5) {
    // El color se acumula y después se COMPRIME. Sumando a secas, donde dos
    // luces se cruzan el canal se pasa de 1.0 y el resultado es blanco: se
    // perdía el color justo en la parte más brillante. La compresión de Reinhard
    // —x/(1+x)— nunca llega a blanco puro, así que el centro de la luz sigue
    // teniendo tono.
    vec3 hdr = uBase + (uA * s1 + uB * s2 + uC * s3) * 1.9;
    col = hdr / (1.0 + hdr);
  } else {
    // Sobre fondo claro no se suma NADA: se tiñe. El color es el promedio
    // ponderado de las luces —no la suma—, y se mezcla con el fondo con fuerza
    // baja. Sumando tres pasteles el resultado siempre era blanco puro y la
    // escena entera desaparecía.
    vec3 tono = (uA * s1 + uB * s2 + uC * s3) / max(peso, 0.001);
    col = mix(uBase, tono, clamp(peso, 0.0, 1.0) * 0.45);
  }

  // Viñeta: oscurece apenas los bordes y empuja la vista al centro, que es
  // donde va el contenido.
  float vig = 1.0 - 0.25 * length(uv - 0.5);
  col *= mix(1.0, vig, uOscuro);

  // Grano fino, más marcado en oscuro (donde el bandeado se nota).
  float g = (ruido(gl_FragCoord.xy) - 0.5) * mix(0.015, 0.045, uOscuro);
  col += g;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string) {
  const sh = gl.createShader(tipo);
  if (!sh) return null;
  gl.shaderSource(sh, fuente);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** "#rrggbb" → [r, g, b] de 0 a 1. Devuelve negro si el color no se entiende. */
function aRGB(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export type CampoDeLuzProps = {
  modo: "oscuro" | "claro";
  /** Los tres colores de luz. Salen del acento de la tienda, no están clavados. */
  colores: [string, string, string];
  /** El color de fondo sobre el que se apoya la luz. */
  base: string;
  className?: string;
  style?: React.CSSProperties;
};

export function CampoDeLuz({ modo, colores, base, className, style }: CampoDeLuzProps) {
  // Los tres colores se desarman en variables sueltas a propósito. Como
  // dependencia del efecto, el ARRAY es una referencia nueva en cada render del
  // padre: se tiraba el contexto WebGL y se recompilaban los shaders sesenta
  // veces por segundo. Con los tres strings, el efecto corre sólo si de verdad
  // cambió un color.
  const [cA, cB, cC] = colores;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contRef = useRef<HTMLDivElement>(null);
  // Arranca en `false` y sólo pasa a `true` cuando WebGL respondió. Así el
  // degradado CSS es lo que se ve siempre, y el canvas se le superpone recién
  // cuando de verdad hay algo que mostrar — si falla, no se nota nada.
  const [anda, setAnda] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cont = contRef.current;
    if (!canvas || !cont) return;

    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const gl = (canvas.getContext("webgl", { antialias: false, depth: false, alpha: false, powerPreference: "low-power" })
      || canvas.getContext("experimental-webgl", { antialias: false, depth: false, alpha: false })) as WebGLRenderingContext | null;
    if (!gl) return; // queda el degradado CSS

    const vs = compilar(gl, gl.VERTEX_SHADER, VERT);
    const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // Dos triángulos que tapan la pantalla. Es toda la geometría que hace falta:
    // el dibujo lo hace el shader, no la malla.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    gl.uniform3fv(gl.getUniformLocation(prog, "uA"), aRGB(cA));
    gl.uniform3fv(gl.getUniformLocation(prog, "uB"), aRGB(cB));
    gl.uniform3fv(gl.getUniformLocation(prog, "uC"), aRGB(cC));
    gl.uniform3fv(gl.getUniformLocation(prog, "uBase"), aRGB(base));
    gl.uniform1f(gl.getUniformLocation(prog, "uOscuro"), modo === "oscuro" ? 1 : 0);

    // Tope de 1.5x: en un celular con pantalla 3x, dibujar a resolución completa
    // es nueve veces más píxeles para un fondo borroso donde no se distingue.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let ancho = 0, alto = 0;
    const medir = () => {
      const w = Math.max(1, Math.round(cont.clientWidth * dpr));
      const h = Math.max(1, Math.round(cont.clientHeight * dpr));
      if (w === ancho && h === alto) return;
      ancho = w; alto = h;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };
    medir();

    const pintar = (t: number) => {
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Un cuadro siempre, aunque después no se anime: es lo que hace que
    // "reducir movimiento" muestre la escena quieta en vez de nada.
    pintar(0);
    setAnda(true);

    if (quieto) {
      return () => { gl.deleteProgram(prog); gl.deleteBuffer(buf); };
    }

    let raf = 0;
    let ultimo = 0;
    let visible = true;
    const inicio = performance.now();
    const MS_POR_CUADRO = 1000 / 30;

    const bucle = (ahora: number) => {
      raf = requestAnimationFrame(bucle);
      if (!visible || ahora - ultimo < MS_POR_CUADRO) return;
      ultimo = ahora;
      medir();
      pintar((ahora - inicio) / 1000);
    };
    raf = requestAnimationFrame(bucle);

    // Mientras el hero está fuera de pantalla no se dibuja. La tienda se scrollea
    // enseguida, así que esto es casi todo el tiempo de la visita.
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(cont);

    // Y si la pestaña se va a segundo plano tampoco. `requestAnimationFrame` ya
    // se frena solo en la mayoría de los navegadores, pero no en todos.
    const onVis = () => { if (document.hidden) visible = false; };
    document.addEventListener("visibilitychange", onVis);

    const ro = new ResizeObserver(() => medir());
    ro.observe(cont);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [modo, cA, cB, cC, base]);

  // El degradado CSS es el piso: se ve mientras WebGL arranca, y se queda para
  // siempre si no arranca nunca. Por eso lleva los mismos colores que el shader.
  const respaldo = modo === "oscuro"
    ? `radial-gradient(120% 90% at 20% 15%, ${cA}55, transparent 60%),
       radial-gradient(100% 80% at 80% 30%, ${cB}44, transparent 60%),
       radial-gradient(110% 90% at 50% 90%, ${cC}33, transparent 60%), ${base}`
    : `radial-gradient(120% 90% at 20% 15%, ${cA}33, transparent 65%),
       radial-gradient(100% 80% at 80% 30%, ${cB}2b, transparent 65%),
       radial-gradient(110% 90% at 50% 90%, ${cC}22, transparent 65%), ${base}`;

  return (
    <div ref={contRef} className={className} style={{ position: "absolute", inset: 0, overflow: "hidden", background: respaldo, ...style }} aria-hidden="true">
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", opacity: anda ? 1 : 0, transition: "opacity .6s ease" }}
      />
    </div>
  );
}

export default CampoDeLuz;
