# Prompt para el video demo de TiendaApps (HyperFrames)

> Copiá y pegá todo lo que está debajo de la línea. Está armado con los colores, textos y
> secciones reales que están hoy en el código (`src/app/page.tsx`, `src/lib/templateRegistry.ts`,
> `src/lib/planLimits.ts`, `src/components/dashboard/AsistentePersonaje.tsx`).

---

Hacé un video demo de **TiendaApps** con HyperFrames.

## Qué es el producto

TiendaApps es una plataforma argentina donde cualquiera arma su tienda online en menos de una
hora: elige entre 10 diseños profesionales, personaliza colores/logo/contenido, cobra con Mercado
Pago desde el día uno y — cuando quiere escalar — suma afiliados que venden con su propio link.
Incluye a **Sasha**, una asistente de IA dentro del panel.

- Público: emprendedores y emprendedoras de Argentina, sin conocimientos técnicos.
- Tono: cercano, directo, rioplatense con **voseo** (“creá”, “vendé”, “arrancá”, “tenés”).
  Nada de español neutro ni de “tú”. Sin jerga de startup, sin inglés innecesario.
- Idioma de todo el video: **español rioplatense**.
- Promesa central: *“Tu marca. Lista para vender.”*

## Formato

- **16:9, 1920×1080, 30 fps, 45 segundos.**
- Sin voz en off: todo se cuenta con tipografía en movimiento, UI animada y música.
- Subtítulos no hacen falta (no hay locución), pero el texto en pantalla tiene que ser legible
  en celular: mínimo 28 px de altura de x en el render final.
- Entregá además un recorte **9:16 de 20 s** con las escenas 1, 4 y 7 (versión para stories).

## Sistema visual (respetalo al pie de la letra)

**Colores de marca**

| Rol | Hex |
|---|---|
| Naranja primario (CTA, acentos) | `#ea580c` |
| Naranja claro (hover, brillo) | `#f97316` |
| Ámbar (secundario, afiliados) | `#f59e0b` |
| Rosa/rojo (cierre del degradado) | `#e11d48` |
| Fondo base | `#ffffff` |
| Fondo de secciones alternas | `#f9fafb` |
| Títulos | `#030712` |
| Texto corrido | `#6b7280` |
| Bordes | `#e5e7eb` |

**Degradado de marca** (para las palabras destacadas de los títulos, animado):
`linear-gradient(135deg, #f97316, #f59e0b, #e11d48, #f97316)` con `background-size: 300% 300%`
y el fondo desplazándose 0% → 100% → 0% en un ciclo de 4 s (`ease`, infinito).

**Barra superior / franjas**: `linear-gradient(90deg, #ea580c, #e11d48)`.

**Colores por herramienta** (usalos como color de acento de cada escena):
Tu tienda `#ea580c` · Pagos `#0d9488` · Pedidos `#e11d48` · Sasha IA `#7c3aed` ·
Afiliados `#f59e0b` · Cupones `#16a34a` · Notificaciones `#3b82f6` · Estadísticas `#6366f1`.

**Fondo firma (grid-bg)** — aparece detrás de casi todas las escenas:
grilla de 48×48 px con líneas de `rgba(249,115,22,.05)` en X e Y, más 2–3 “blobs” circulares
muy difuminados (`blur` fuerte, 380–600 px) en `rgba(254,215,170,.4)` naranja,
`rgba(254,205,211,.3)` rosa y `rgba(254,243,199,.3)` ámbar, flotando lentísimo.

**Tipografía**: grotesca geométrica tipo Inter / Geist.
Títulos en **900 (black)**, `letter-spacing: -0.02em`, `line-height: 1.05`.
Antetítulos en 600, MAYÚSCULAS, `letter-spacing: .15em`, en `#ea580c`.
Texto corrido en 400/500. (Ojo: el sitio real todavía usa la pila del sistema Arial/Helvetica —
para el video usá la grotesca, que se ve mucho mejor en movimiento, pero mantené los pesos.)

**Formas**: esquinas muy redondeadas — botones `16px`, tarjetas `24px`, bloques grandes `40px`.
Sombras suaves y teñidas de naranja (`0 20px 40px rgba(249,115,22,.25)`), nunca sombras negras duras.

## Lenguaje de movimiento

- Entrada base de todo elemento: `opacity 0→1` + `y: 28px→0` en **0.55 s**, `ease-out`,
  con **stagger de 0.1 s** entre hermanos. Es la firma del sitio: usala en todas partes.
- Modales / tarjetas que aparecen en primer plano: resorte `stiffness 280, damping 22`,
  desde `scale .9, y: 20`.
- Elementos flotantes (mockup de celular, chips, badges): deriva vertical de ±10 px,
  ciclo de 3.5–5 s, `easeInOut`, infinito y desfasado entre elementos.
- Transición entre escenas: deslizamiento horizontal — la saliente se va a `-40%` con
  `opacity 0`, la entrante llega desde `100%`, `0.5 s ease-in-out`. Consistente en todo el video.
- Tarjetas con inclinación 3D sutil (±10° en X/Y, `perspective`, `preserve-3d`) cuando un
  cursor virtual las recorre.
- Nada de rebotes exagerados ni de rotaciones payasas. Es una marca cálida pero seria.

## Guion escena por escena

**Escena 1 — Apertura (0:00–0:05)**
Fondo blanco con el grid naranja y los blobs. Entra el logo (isotipo naranja + wordmark
“TiendaApps” en 700) al centro y se recoge hacia arriba a la izquierda.
Título, palabra por palabra, con el stagger firma:

> **Tu marca.**
> **Lista**
> **para vender.**

“Lista” y “vender” en el degradado de marca animado. Después de 1 s, “vender” cambia por
sustitución (fundido de 0.5 s) a **crecer** → **todo** → **despegar**, cada 1.2 s, y vuelve a
“vender”. Debajo, en `#6b7280`:
*Tienda online + Mercado Pago + afiliados que venden por vos.*

**Escena 2 — La tienda en el celular (0:05–0:11)**
Entra desde la derecha (`x: 40px`, 0.8 s) un mockup de celular: marco negro de 6 px, radio 45 px,
notch. Adentro, una tienda real: banner de moda con degradado oscuro encima, la URL
`tiendaapps.com/lunamoda` en 9 px versalitas blancas al 70 %, el nombre **Luna Moda** en 900,
y abajo una grilla de dos productos (“Vestido floral · $9.900”, “Jean cargo · $7.500”) con el
precio en `#ea580c` y un botón naranja lleno: *Ver tienda completa →*.
El celular flota (±10 px, 5 s). Aparecen dos badges orbitando:
- arriba a la derecha, tarjeta blanca: **“Nueva venta 🎉”** / *Tu tienda está activa*
- abajo a la izquierda, pastilla naranja `#ea580c`: **“8 afiliados activos”** / *vendiendo ahora mismo*

**Escena 3 — Franja marquesina (0:11–0:13)**
Corte a una banda naranja `#ea580c` de borde a borde que barre el encuadre. Texto blanco al 90 %,
600, desplazándose a la izquierda en loop continuo:
*✦ Tienda personalizable ✦ Afiliados sin sueldos fijos ✦ Comisiones automáticas ✦ Sin inversión
inicial ✦ Mercado Pago ✦ Panel en tiempo real ✦ Gratis para empezar ✦*
Duración corta, funciona como respiración entre bloques.

**Escena 4 — Los 10 diseños (0:13–0:21)**
Antetítulo `DISEÑO SEGÚN TU RUBRO`, título **“Tu tienda, con identidad propia.”**
Entra una grilla de tarjetas-navegador (barra gris con tres puntitos rosa/ámbar/verde-agua y la
etiqueta “DEMO”), cada una con la miniatura del diseño y sus tres círculos de paleta. Las diez,
apareciendo en cascada con el stagger firma, con la inclinación 3D:

| Diseño | Rubro | Paleta |
|---|---|---|
| Fashion Noir | Moda — lujo, oscuro, editorial | `#0a0a0a` `#c9a84c` `#f0ebe3` |
| Boho Terra | Moda — orgánico, natural, cálido | `#faf7f2` `#b5652a` `#2c2218` |
| Urban Pulse | Moda — deportivo, energético | `#0f0f0f` `#d4ff00` `#f5f5f5` |
| Chic Paris | Moda — editorial, limpio | `#ffffff` `#c0392b` `#111111` |
| Auto Motor | Autos — oscuro, premium | `#0a0a0a` `#e8a020` `#1a1a1a` |
| Auto Drive | Autos — claro, marketplace | `#f0f4f8` `#2563eb` `#0f172a` |
| Electro Prime | Tecnología — confianza, cuotas | `#ffffff` `#ea580c` `#111827` |
| Tech Nova | Tecnología — vibrante | `#fafaff` `#7c3aed` `#0f0f1a` |
| Home Studio | Hogar — cálido, editorial | `#faf8f4` `#b5652a` `#2c2218` |
| Casa Clara | Hogar — minimalista, blanco | `#ffffff` `#0f172a` `#444444` |

Cierre de la escena: la cámara se acerca a una sola tarjeta y sus colores cambian tres veces
(0.3 s cada uno) mientras aparecen chips flotando: *Colores · Logo · Banner · WhatsApp ·
Redes sociales · Envío y cobro · SEO*.

**Escena 5 — Todo en un panel (0:21–0:28)**
Antetítulo `LA PLATAFORMA COMPLETA`, título **“Todo lo que necesitás, en un solo lugar.”**
Fila de pastillas-pestaña que se van encendiendo una a una (0.7 s cada una): la activa se pinta
con su color de acento, sombra `0 4px 14px <color>44`, texto blanco; las inactivas quedan blancas
con borde `#e5e7eb`. En cada encendido, el panel de abajo se desliza y muestra ícono + titular:

1. **Tu tienda** `#ea580c` — *Una tienda que enamora desde el primer click*
2. **Pagos** `#0d9488` — *Cobrá sin complicaciones, desde el día uno*
3. **Pedidos** `#e11d48` — *Cada pedido, bajo control*
4. **Cupones** `#16a34a` — *Descuentos que generan urgencia*
5. **Notificaciones** `#3b82f6` — *Llegá a tus clientes cuando más importa*
6. **Estadísticas** `#6366f1` — *Datos reales para decisiones inteligentes*

Ritmo ágil: no leemos las viñetas, se sienten como un barrido de capacidades.

**Escena 6 — Sasha, la asistente de IA (0:28–0:35)**
Cambio de temperatura: fondo `#f9fafb`, acento violeta `#7c3aed` conviviendo con el naranja.
A la izquierda, título **“Alguien que cuida tu tienda cuando vos no podés.”**
Alrededor, burbujas blancas con borde gris que aparecen y se desvanecen flotando (ciclo de 5 s,
desfasadas 0.75 s, deriva de +7 → -9 px), cada una con un ícono de chat naranja:
*“¿Cuánto vendí esta semana?” · “Armame un cupón para el Hot Sale” · “¿Qué productos se venden
más?” · “Tengo un pedido sin confirmar” · “¿Cómo conecto Mercado Pago?” · “Ideas para el Día del Padre”*

A la derecha, una ventana de chat blanca de radio 24 px que flota suave. En el encabezado va
**Sasha** — un personaje SVG simple: **círculo con degradado `#fbbf24 → #f97316`**, dos ojos
blancos ovalados con pupila `#1c1917`, cejas rectas redondeadas `#7c2d12` y una boca curva
trazada en `#7c2d12`; parpadea cada 4–6 s. Al lado, *Tu asistente de TiendaApps* y un punto
verde `#10b981` pulsando con **En línea**.
La conversación se escribe en tiempo real, burbuja por burbuja:

- Sasha (burbuja blanca): *¡Hola! Tenés 3 pedidos sin confirmar y se acerca el Día de la Madre —
  buen momento para armar algo especial.*
- Usuaria (burbuja naranja `#ea580c`, texto blanco): *armame un cupón de descuento para esa fecha*
- Sasha: *Listo, te explico: andá a **Panel → Cupones → Nuevo**…* (el camino en negrita naranja)
- Termina con los tres puntitos de “escribiendo” rebotando (desfase 0/150/300 ms).

**Escena 7 — Afiliados (0:35–0:40)**
Fondo con degradado cálido `linear-gradient(150deg, #fffbeb 0%, #fff7ed 50%, #fff1f2 100%)`.
Título **“Representá marcas que te gustan.”** Tres pasos numerados que se dibujan de arriba abajo,
unidos por una línea vertical ámbar que se traza sola, cada número en un círculo naranja de 40 px:

- **01 · Elegís la tienda**
- **02 · Compartís tu link**
- **03 · Seguís todo desde tu panel**

A la derecha, un collage de tres fotos con marco blanco de 5 px, rotadas -3°, +2° y -1.5°,
entrando escalonadas (delay 0.1 / 0.22 / 0.34 s).

**Escena 8 — Cierre (0:40–0:45)**
Todo se recoge hacia un bloque central de radio 40 px con
`linear-gradient(to bottom right, #ea580c, #ea580c, #e11d48)` y la grilla invertida al 20 % encima.
En blanco 900, enorme:

> **Arrancá hoy.**
> **Sin vueltas.**

Debajo, en `#ffedd5`: *Probá la plataforma completa durante 7 días. Sin tarjeta, sin letra chica.*
Dos botones: uno blanco con texto `#c2410c` — **Crear mi tienda gratis →** — y otro fantasma con
borde blanco al 40 % — **Quiero ser afiliado**. La flecha del primero se desplaza 4 px a la derecha
en loop suave.
Último frame, 1.5 s en negro… no: en blanco, con el logo, el wordmark **TiendaApps** y
**tiendaapps.com** en `#6b7280`. Debajo, chico: *7 días gratis · sin tarjeta · cancelás cuando quieras*.

## Datos que podés usar como refuerzo en pantalla

- Contadores del hero: **24hs** *Primera venta* · **50+** *Afiliados gratis* · **$0** *Para arrancar*
  (animá los números subiendo).
- Sellos de confianza: *Pago seguro · Mercado Pago incluido · 7 días gratis, sin tarjeta ·
  Cancelás cuando quieras*.
- Planes, si hace falta un frame de precios: **Tienda Pro $20.000/mes** (o $180.000/año) ·
  **Premium $25.000/mes** (o $225.000/año) · **Afiliado, gratis para siempre**. Moneda en formato
  argentino (`$20.000`, punto como separador de miles).

## Reglas duras

- Todo número de precio va en pesos argentinos con punto de miles.
- Nunca escribas “tú”, “tienes”, “crea tu tienda”. Siempre voseo.
- El naranja `#ea580c` es el único color de acción: los botones de conversión no cambian de color
  aunque la escena tenga otro acento.
- Ningún texto en pantalla más de 2 líneas ni más de 12 palabras.
- Nada de fotos de stock con marca de agua ni logos de terceros salvo Mercado Pago, y si aparece,
  solo el nombre en texto, no el isotipo.
- El video tiene que poder verse sin audio y entenderse igual.

## Música

Instrumental optimista y moderno, tempo medio-alto (≈110 bpm), base electrónica cálida con
percusión suave — nada épico ni corporativo genérico. Golpes marcados en el corte a la escena 3
(marquesina) y en la entrada de la escena 8 (cierre), y bajada de intensidad durante la escena 6
(Sasha) para que el chat se lea tranquilo.
