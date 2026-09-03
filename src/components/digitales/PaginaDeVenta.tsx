/* ══════════════════════════════════════════════════════════════════════════
   LA PÁGINA DE VENTA — la única pieza que la dibuja
   ══════════════════════════════════════════════════════════════════════════

   ⚠️ **Esto se usa en los dos lados**: la página pública que ve quien compra y
   la vista previa del panel. Si fueran dos componentes se separarían solos y la
   previa terminaría mintiendo — ya pasó con la previa de los templates de
   tienda, que apagaba los clics y mostraba algo que no era lo que se publicaba.

   No decide NADA. Las secciones, su orden y sus topes salen de
   `lib/pagina-venta`; el nombre, la imagen y el precio salen del producto. Acá
   sólo se dibuja.

   ── Por qué no se parece al panel ───────────────────────────────────────────

   El panel tiene barra lateral, tema claro/oscuro y densidad de tablero. Esto es
   lo contrario: una sola columna, ancha, clara, sin nada para tocar salvo el
   botón de comprar. Cada cosa que se pueda clickear y no sea comprar es una
   puerta de salida.

   Por eso tampoco sigue el tema del panel: la página pública es clara siempre.
   Quien la ve no tiene cuenta ni preferencia guardada. */

import {
  seDibuja, conFichas, buscarEstilo, buscarPaleta, buscarSeccion, buscarTipografia,
  ofertaVencida, COLORES_CLAROS, COLORES_OSCUROS,
  type PaginaVenta, type Estilo,
} from "@/lib/pagina-venta";
import BarraDeOferta from "./BarraDeOferta";

export type ProductoParaPagina = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  imagen: string | null;
};

export type DatosDePagina = {
  pagina: PaginaVenta;
  /** El principal. Su nombre, su imagen y su precio NO se copian al contenido. */
  producto: ProductoParaPagina;
  bonos: ProductoParaPagina[];
  /** Quién vende, para el pie. */
  vendedor: { nombre: string | null; contacto: string | null };
  /** El año en curso, para el copyright. Lo resuelve quien dibuja, no el texto. */
  anio: number;
  /** `true` en la vista previa: apaga el botón para no arrancar un pago. */
  esPrevia?: boolean;
  /**
   * Sólo en la previa del panel: al pasar el mouse marca cada sección y muestra
   * su nombre, y al tocarla avisa cuál fue.
   *
   * ⚠️ Va apagado en la página pública. Quien compra no tiene que ver recuadros
   * de edición ni poder tocar nada que no sea comprar.
   */
  alTocarSeccion?: (clave: string) => void;
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);
}


const texto = (c: Record<string, unknown>, k: string): string =>
  typeof c[k] === "string" ? (c[k] as string) : "";

const lista = (c: Record<string, unknown>, k: string): Array<Record<string, string>> =>
  Array.isArray(c[k]) ? (c[k] as Array<Record<string, string>>) : [];

/* ── Piezas repetidas ───────────────────────────────────────────────────────
 *
 * El botón de comprar aparece dos veces (portada y precio) a propósito: en el
 * celular la página es larga y volver arriba a buscar el botón es donde se
 * pierde la venta. Es el mismo componente, no dos copias. */

function BotonComprar({ children, esPrevia, estilo }: {
  children: string; esPrevia?: boolean; estilo: Estilo;
}) {
  /* El color sale de la paleta y la forma del estilo. Ninguno de los dos está
     escrito acá: si lo estuvieran, elegir otra paleta no cambiaría el botón —
     que es justo lo único que hay que mirar en esta página. */
  const clases =
    "inline-flex w-full max-w-md items-center justify-center px-6 py-5 " +
    "text-lg font-bold transition hover:brightness-110 sm:text-xl " +
    "bg-[color:var(--pv-acento)] text-[color:var(--pv-sobre)] " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
    "focus-visible:outline-[color:var(--pv-acento)] " + estilo.boton;

  /* En la previa no es un enlace: se ve igual pero no arranca un pago. */
  if (esPrevia) {
    return (
      <button type="button" disabled className={`${clases} cursor-default opacity-95`}>
        {children}
      </button>
    );
  }
  /* 🔲 El destino real es el checkout, que todavía no existe (Fase 5). */
  return <button type="button" className={clases}>{children}</button>;
}

function Titulo({ children, estilo }: { children: string; estilo: Estilo }) {
  if (!children) return null;
  return (
    <h2 className={`text-balance text-center text-2xl text-[color:var(--pv-tinta)] sm:text-3xl ${estilo.titulo}`}>
      {children}
    </h2>
  );
}

/* ── Los números de la oferta ───────────────────────────────────────────────
 *
 * El precio, el tachado, el ahorro y los bonos incluidos. Se dibujan en el
 * resumen de precio y otra vez en el cierre, y **es la misma pieza**: repetir la
 * oferta está bien —la página es larga y la persona se distrae—, pero tiene que
 * decir lo mismo en los dos lados.
 *
 * ⚠️ Todo sale del PRODUCTO. En la página de la competencia el cierre tiene sus
 * propias casillas de precio, así que el número vive en tres lugares; el día que
 * corrigen uno, la misma página muestra dos precios distintos. Acá no se puede. */
/**
 * La cuenta de la oferta, en UN solo lugar.
 *
 * ── Por qué una función y no la resta suelta en cada lado ───────────────────
 *
 * El descuento aparece en el sello, en el precio tachado, en el renglón verde
 * y en la barra de abajo. Con la resta escrita en cada uno, alcanza con tocar
 * uno para que la página muestre dos porcentajes distintos — que es justo lo
 * que le pasa a la de la competencia: su lista dice que el ebook sale 16.990
 * pero el 'valor total regular' de abajo sale de 84.950, así que **la lista no
 * suma el total que muestra**.
 *
 * ── Qué entra en el total ───────────────────────────────────────────────────
 *
 * El valor de lo que se lleva: el precio regular del ebook más el precio
 * regular de cada bono. Los bonos entran porque se los lleva de verdad y
 * porque la página YA dice GRATIS al lado de cada uno: si el ahorro no los
 * contara, ese GRATIS no valdría nada.
 *
 * Todos los números salen de lo que cargó quien vende. Acá no se inventa uno
 * solo: se suma y se resta.
 *
 * ── Por qué toma `datos` ENTERO y no `(producto, bonos)` ────────────────────
 *
 * La cuenta necesita tres cosas —el producto, los bonos y si la oferta con
 * fecha venció— y la leen cuatro lugares distintos: la ficha de precio, la
 * lista de lo que incluye, la portada y la barra fija. Con argumentos sueltos
 * alcanza con olvidarse uno en un solo lugar para que la barra diga un número y
 * la ficha diga otro. **Ya pasó una vez**: el editor y la página contaban los
 * bonos con reglas distintas y una decía $20.000 donde la otra decía $34.000.
 *
 * Con un solo argumento no hay nada que olvidar.
 */
function cuentaDeLaOferta(datos: DatosDePagina) {
  const { producto, bonos } = datos;
  /* Ver `ofertaVencida`: pasada la fecha, el descuento del producto deja de
     mostrarse. Los bonos siguen contando porque siguen viniendo. */
  const vencida = ofertaVencida(datos.pagina, Date.now());
  /* Sin precio tachado —o con la oferta ya terminada— el regular es el que se
     cobra: el ebook no aporta ahorro y el total es sólo lo que suman los bonos. */
  const regular = !vencida && producto.comparePrice && producto.comparePrice > producto.price
    ? producto.comparePrice
    : producto.price;
  const valorTotal = regular + valorDeLosBonos(bonos);
  const ahorro = valorTotal > producto.price ? valorTotal - producto.price : 0;
  return {
    /* Sale de acá y no se recalcula afuera. `LoQueIncluye` tenía su propia copia
       de estas tres líneas, así que el día que cambiara la regla —hoy— una se
       enteraba y la otra no. */
    regular,
    valorTotal,
    ahorro,
    porcentaje: ahorro > 0 ? Math.round((ahorro / valorTotal) * 100) : 0,
    /* Si el total incluye bonos, el número tachado NO es lo que costaba el
       ebook: es lo que vale el paquete. Y eso hay que decirlo con la palabra
       al lado, o se lee como un precio que alguien pagó alguna vez. */
    conBonos: valorDeLosBonos(bonos) > 0,
    vencida,
  };
}

function Numeros({ datos, estilo, listaAparte }: {
  datos: DatosDePagina; estilo: Estilo;
  /** `true` cuando al lado ya está la lista de lo que incluye: no se repite. */
  listaAparte?: boolean;
}) {
  const { producto, bonos } = datos;
  const { valorTotal, ahorro, porcentaje, conBonos } = cuentaDeLaOferta(datos);

  return (
    <div>
      {/* ⚠️ El sello sale de una RESTA, no de un texto que alguien escribe. Si no
          hay precio tachado no hay sello, así que no puede quedar un "50% OFF"
          arriba de un precio que nunca bajó. Es la diferencia entre esto y el
          cartel de la competencia, que es un campo libre. */}
      {porcentaje > 0 && (
        <p
          className={`mb-4 inline-block bg-[color:var(--pv-ok)] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[color:var(--pv-fondo)] ${estilo.sello}`}
        >
          {porcentaje}% de descuento
        </p>
      )}

      {/* El precio viejo va AL LADO del nuevo y no abajo: pegados, el ojo hace la
          resta solo y no hay que leer nada.

          Son dos `span` adentro de un `p` y no un flex a propósito: así siguen la
          alineación de donde estén —a la izquierda en la ficha del producto,
          centrados en la de precio— sin tener que pasarles por dónde van. */}
      <p>
        {ahorro > 0 ? (
          <>
            {conBonos && (
              <span className="mr-1.5 text-[11px] font-bold uppercase tracking-wide text-[color:var(--pv-tenue)]">
                valor total
              </span>
            )}
            <span className="mr-3 text-xl text-[color:var(--pv-tenue)] line-through sm:text-2xl">
              {money(valorTotal)}
            </span>
          </>
        ) : null}
        <span className={`text-4xl text-[color:var(--pv-tinta)] sm:text-5xl ${estilo.titulo}`}>
          {money(producto.price)}
        </span>
      </p>

      {/* Cuánta plata se ahorra es el dato que más empuja de la página, y estaba
          en letra chica gris al lado del tachado. Ahora es un renglón propio. */}
      {ahorro > 0 && (
        <p className="mt-2 text-lg font-extrabold text-[color:var(--pv-ok)] sm:text-xl">
          Ahorrás {money(ahorro)}
        </p>
      )}

      {bonos.length > 0 && !listaAparte && (
        <div className={`mt-5 bg-[color:var(--pv-fuerte)] px-4 py-3 text-left ${estilo.tarjeta}`}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--pv-tinta)]">
            Incluye {bonos.length} {bonos.length === 1 ? "bono gratis" : "bonos gratis"}
          </p>
          <ul className="mt-2 grid gap-1">
            {bonos.map((b) => (
              <li key={b.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 text-[color:var(--pv-tinta)]">{b.name}</span>
                <span className="shrink-0 font-bold text-[color:var(--pv-ok)]">
                  {b.comparePrice ? <s className="mr-2 font-normal opacity-60">{money(b.comparePrice)}</s> : null}
                  GRATIS
                </span>
              </li>
            ))}
          </ul>
          {valorDeLosBonos(bonos) > 0 && (
            <p className="mt-2 border-t border-[color:var(--pv-linea)] pt-2 text-sm font-bold text-[color:var(--pv-tinta)]">
              Todo esto vale {money(valorDeLosBonos(bonos))} y va incluido
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Lo que incluye la compra, renglón por renglón, con la cuenta abajo.
 *
 * ── Por qué es la parte que más rinde ───────────────────────────────────────
 *
 * Un precio suelto se compara contra nada. La misma plata al lado de una lista
 * de cuatro cosas con su valor cada una se compara contra el total, y ahí el
 * número de abajo parece chico. Es lo que hace toda vidriera.
 *
 * ── Y por qué la nuestra suma ───────────────────────────────────────────────
 *
 * ⚠️ En la página de la competencia la lista NO suma el total que muestra: el
 * ebook figura en 16.990 —el precio con descuento— pero el 'valor total
 * regular' de abajo dice 99.940, que sale de un 84.950 que no está en ninguna
 * fila. Nadie hace la cuenta, pero está mal.
 *
 * Acá cada renglón muestra el valor REGULAR de esa cosa, así que la columna
 * suma exactamente el total. Y el total es el mismo que usa el sello, el
 * tachado y la barra de abajo, porque los cuatro leen `cuentaDeLaOferta`.
 */
function LoQueIncluye({ datos, dias, estilo }: {
  datos: DatosDePagina;
  /** Los días de garantía, o `null` si esa sección no se va a ver. */
  dias: number | null;
  estilo: Estilo;
}) {
  const { producto, bonos } = datos;
  /* `regular` sale de la cuenta y ya NO se recalcula acá: tenía su propia copia
     de la fórmula, y con la oferta vencida las dos daban números distintos. */
  const { valorTotal, conBonos, regular } = cuentaDeLaOferta(datos);

  /* Sin bonos y sin garantía la lista tendría un solo renglón, que no compara
     con nada: ahí no aporta y el precio se muestra solo, como antes. */
  if (!conBonos && !dias) return null;

  return (
    <div className="w-full text-left">
      <ul>
        <Renglon nombre={producto.name} valor={money(regular)} estilo={estilo} />
        {bonos.map((b) => (
          <Renglon
            key={b.id}
            nombre={b.name}
            icono="🎁"
            valor={b.comparePrice ? money(b.comparePrice) : null}
            remate="GRATIS"
            estilo={estilo}
          />
        ))}
        {dias ? (
          <Renglon
            nombre={`Garantía de ${dias} días`}
            icono="🛡️"
            valor={null}
            remate="INCLUIDA"
            estilo={estilo}
          />
        ) : null}
      </ul>

      {conBonos && (
        <p className="mt-3 flex items-baseline justify-between gap-4 border-t border-[color:var(--pv-linea)] pt-3">
          <span className="text-sm font-bold uppercase tracking-wide text-[color:var(--pv-tenue)]">
            Valor total
          </span>
          <span className="shrink-0 text-lg font-extrabold text-[color:var(--pv-tinta)] line-through decoration-2">
            {money(valorTotal)}
          </span>
        </p>
      )}
    </div>
  );
}

/** Un renglón de la lista: tilde, qué es, y cuánto vale. */
function Renglon({ nombre, valor, remate, icono, estilo }: {
  nombre: string; valor: string | null; remate?: string; icono?: string; estilo: Estilo;
}) {
  return (
    <li className="flex items-start gap-3 border-b border-[color:var(--pv-linea)] py-3 last:border-b-0">
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--pv-ok)] text-[11px] font-bold text-[color:var(--pv-fondo)]"
      >
        ✓
      </span>
      <span className="min-w-0 flex-1 text-pretty text-sm font-semibold text-[color:var(--pv-tinta)]">
        {icono ? <span aria-hidden="true" className="mr-1">{icono}</span> : null}
        {nombre}
      </span>
      <span className="shrink-0 text-right text-sm">
        {valor && (
          <span
            className={
              remate
                ? "block text-xs text-[color:var(--pv-tenue)] line-through"
                : `block font-bold text-[color:var(--pv-tinta)] ${estilo.titulo}`
            }
          >
            {valor}
          </span>
        )}
        {remate && <span className="block font-extrabold text-[color:var(--pv-ok)]">{remate}</span>}
      </span>
    </li>
  );
}

/**
 * Lo que valen los bonos, sumado.
 *
 * ⚠️ Es una SUMA de números que cargó quien vende, no un número inventado: el
 * precio tachado de cada bono. Si no le puso ninguno, el bono no suma nada y el
 * renglón no aparece — preferimos no mostrar el total antes que rellenarlo con
 * un valor imaginado.
 */
function valorDeLosBonos(bonos: ProductoParaPagina[]): number {
  return bonos.reduce((t, b) => t + (b.comparePrice ?? 0), 0);
}

/* Los sellos de al lado del botón. Dicen sólo lo que podemos sostener: el cobro
   va por Mercado Pago y la entrega es por mail.
   🔲 "Al instante" NO está acá a propósito: con transferencia la entrega no es
   automática, y ese aviso va en el checkout, que todavía no existe. */
function Sellos({ dias }: { dias?: number | null }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-medium text-[color:var(--pv-tenue)]">
      <span>🔒 Pago seguro con Mercado Pago</span>
      <span>✉️ Lo recibís por mail</span>
      {/* ⚠️ El tercero aparece SÓLO si la sección de garantía se va a ver, y con
          los días que dice esa sección. Un sello de garantía en una página que no
          la tiene es una promesa que nadie escribió y que después hay que
          cumplir igual. */}
      {dias ? <span>🛡️ Garantía de {dias} días</span> : null}
    </p>
  );
}

/**
 * Los días de garantía, o `null` si esa sección no se va a ver.
 *
 * Pregunta por `seDibuja` y no por `visible` porque una sección encendida pero
 * vacía tampoco se dibuja: el sello tiene que decir lo mismo que la página.
 */
function diasDeGarantia(datos: DatosDePagina): number | null {
  const s = datos.pagina.secciones.find((x) => x.clave === "garantia");
  if (!s || !seDibuja(s, { hayBonos: datos.bonos.length > 0 })) return null;
  const d = s.campos.dias;
  return typeof d === "number" && d > 0 ? d : null;
}

/** La bajada de una sección. Vacía no dibuja nada. */
function Bajada({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p className="mx-auto mt-3 max-w-2xl text-pretty text-center text-[color:var(--pv-tenue)]">
      {children}
    </p>
  );
}

/* Los tres fondos, en el único lugar donde se traducen a una clase. Están
   escritas enteras porque Tailwind necesita ver la clase completa en el código:
   una armada pegando pedazos no existe y la sección sale sin fondo. */
const FONDO: Record<string, string> = {
  fondo: "",
  suave: "bg-[color:var(--pv-suave)]",
  fuerte: "bg-[color:var(--pv-fuerte)]",
};

function Seccion({ children, tono, estilo }: {
  children: React.ReactNode; tono?: string; estilo: Estilo;
}) {
  /* El aire lo pone el estilo. Es lo que más separa a los cinco de lejos: Suave
     respira el doble que Clásico, y eso se nota scrolleando aunque el color sea
     el mismo.

     El FONDO lo elige quien arma la página, sección por sección. Los tres salen
     de la paleta —no hay color escrito acá— así que cambiar de paleta cambia los
     tres juntos y no hay combinación fea posible. */
  return (
    <section className={FONDO[tono ?? "fondo"] ?? ""}>
      <div className={`mx-auto max-w-3xl px-5 sm:px-8 ${estilo.seccion}`}>{children}</div>
    </section>
  );
}

/* ── El dibujo de cada sección ──────────────────────────────────────────────
 *
 * Una sección encendida pero SIN CONTENIDO no se dibuja. Un título de "Además
 * te llevás gratis" sin ningún bono abajo es peor que no tener la sección. */

function Contenido({ clave, campos, tono, datos }: {
  clave: string;
  campos: Record<string, unknown>;
  /* Con qué fondo se dibuja. Viene de lo guardado, no de este `switch`: antes
     cada `case` traía el suyo escrito y la alternancia no se podía cambiar. */
  tono: string;
  datos: DatosDePagina;
}) {
  const { producto, bonos, vendedor, anio, esPrevia } = datos;
  const estilo = buscarEstilo(datos.pagina.estilo);

  switch (clave) {
    case "portada": {
      const titulo = texto(campos, "titulo");
      /* NO cae en la foto del producto si no hay una propia: esa foto es la
         estrella de la sección de abajo, y repetida dos veces seguidas pierde
         toda la fuerza. Igual que en la página de la competencia, donde el
         encabezado son sólo palabras. */
      const imagen = texto(campos, "imagen");
      const rotulo = texto(campos, "rotulo");
      return (
        <Seccion tono={tono} estilo={estilo}>
          <div className="flex flex-col items-center gap-6 text-center">
            {/* El rótulo va junto al título, no separado por el hueco de la
                columna: son una sola unidad de lectura. */}
            <div className="flex flex-col items-center gap-3">
              {rotulo && (
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[color:var(--pv-acento)]">
                  {rotulo}
                </p>
              )}
              <h1 className={`text-balance text-3xl leading-tight text-[color:var(--pv-tinta)] sm:text-4xl md:text-5xl ${estilo.titulo}`}>
                {titulo || producto.name}
              </h1>
            </div>
            {texto(campos, "subtitulo") && (
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-[color:var(--pv-tenue)] sm:text-lg">
                {texto(campos, "subtitulo")}
              </p>
            )}
            {imagen && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imagen}
                alt=""
                className="w-full max-w-md rounded-2xl border border-[color:var(--pv-linea)] object-cover shadow-sm"
              />
            )}
            {/* ⚠️ Los sellos van también acá, en la PRIMERA pantalla. Quien cae
                desde un anuncio no conoce la tienda, y las dos preguntas que se
                hace antes de bajar son si es seguro y cómo lo recibe. Contestarlas
                recién a mitad de página es contestarlas tarde. */}
            <BotonComprar esPrevia={esPrevia} estilo={estilo}>{texto(campos, "textoBoton")}</BotonComprar>
            <Sellos dias={diasDeGarantia(datos)} />
          </div>
        </Seccion>
      );
    }

    /* ⚠️ Ésta es LA sección de la página: la foto de un lado y la oferta entera
       del otro. Antes era una fichita con el nombre y la descripción, y la oferta
       aparecía recién mucho más abajo — o sea que quien entraba desde un anuncio
       tenía que scrollear para enterarse de cuánto sale.
       Sigue sin tener campos de precio: todo sale del producto. */
    case "producto":
      return (
        <Seccion tono={tono} estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <div className="mt-8 grid items-center gap-8 md:grid-cols-2 [&>*]:min-w-0">
            {producto.imagen ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={producto.imagen}
                alt=""
                className={`w-full object-cover ${estilo.tarjeta}`}
              />
            ) : null}

            <div className={producto.imagen ? "" : "mx-auto max-w-xl text-center md:col-span-2"}>
              <h3 className={`text-pretty text-xl text-[color:var(--pv-tinta)] sm:text-2xl ${estilo.titulo}`}>
                {producto.name}
              </h3>
              {producto.description && (
                <p className="mt-3 text-pretty leading-relaxed text-[color:var(--pv-tenue)]">
                  {producto.description}
                </p>
              )}
              <div className={`mt-6 bg-[color:var(--pv-tarjeta)] p-5 ${estilo.tarjeta}`}>
                <Numeros datos={datos} estilo={estilo} />
                <div className="mt-5 grid gap-3">
                  <BotonComprar esPrevia={esPrevia} estilo={estilo}>
                    {texto(campos, "textoBoton")}
                  </BotonComprar>
                  <Sellos dias={diasDeGarantia(datos)} />
                </div>
              </div>
            </div>
          </div>
        </Seccion>
      );

    case "bonos": {
      return (
        <Seccion tono={tono} estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          {texto(campos, "subtitulo") && (
            <p className="mt-3 text-center text-[color:var(--pv-tenue)]">{texto(campos, "subtitulo")}</p>
          )}
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {bonos.map((b) => (
              <li key={b.id} className={`bg-[color:var(--pv-tarjeta)] p-5 ${estilo.tarjeta}`}>
                <h3 className="font-semibold text-[color:var(--pv-tinta)]">{b.name}</h3>
                {b.description && (
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--pv-tenue)]">{b.description}</p>
                )}
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-base font-bold text-[color:var(--pv-ok)]">GRATIS</span>
                  {b.comparePrice ? (
                    <span className="text-sm text-[color:var(--pv-tenue)] line-through">{money(b.comparePrice)}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </Seccion>
      );
    }

    case "beneficios":
    case "dolores": {
      const items = lista(campos, "items").filter((i) => i.titulo || i.detalle);
      const esDolor = clave === "dolores";
      return (
        <Seccion tono={tono} estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <Bajada>{texto(campos, "subtitulo")}</Bajada>
          {/* Dos columnas en pantalla grande: con el detalle abajo de cada uno,
              en una sola columna la sección se hace larguísima. */}
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {items.map((i, n) => (
              <li
                key={n}
                className={`flex items-start gap-3 bg-[color:var(--pv-tarjeta)] p-4 ${estilo.tarjeta}`}
              >
                {/* El ícono que eligió quien vende, y si no eligió ninguno el de
                    siempre. Con ícono propio se saca el círculo de color: un
                    emoji adentro de una pastilla verde queda como un parche. */}
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    i.icono
                      ? "text-base"
                      : esDolor
                        ? "bg-rose-100 text-rose-600"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {i.icono || (esDolor ? "!" : "✓")}
                </span>
                <span className="min-w-0">
                  {i.titulo && (
                    <span className="block text-pretty font-semibold text-[color:var(--pv-tinta)]">
                      {i.titulo}
                    </span>
                  )}
                  {i.detalle && (
                    <span className="mt-1 block text-pretty text-sm leading-relaxed text-[color:var(--pv-tenue)]">
                      {i.detalle}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
      );
    }

    case "comoFunciona": {
      const pasos = lista(campos, "pasos").filter((p) => p.titulo || p.detalle);

      /* ⚠️ La fila sólo hasta CUATRO pasos, y no es una preferencia: con cinco,
         cada columna queda en unos 180 píxeles y el título se parte en cuatro
         renglones. Es el error que tiene la página de la competencia —su fila y
         su línea punteada se rompen justo al pasar de cuatro— y acá se evita
         solo, porque la decisión la toma la cantidad de pasos y no quien arma
         la página. Con cinco se apila, que es como se lee bien.

         Y la fila arranca recién en `lg`. En el celular una fila de círculos no
         existe: entrarían tres letras por columna. */
      const enFila = pasos.length > 1 && pasos.length <= 4;

      /* La mitad del círculo (h-9 = 36px), que es donde va la línea que une. */
      const alturaLinea = "top-[1.125rem]";

      return (
        <Seccion tono={tono} estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <Bajada>{texto(campos, "subtitulo")}</Bajada>
          <ol
            className={`mt-8 grid gap-6 ${
              enFila ? "lg:flex lg:items-start lg:gap-0" : "mx-auto max-w-2xl gap-4"
            }`}
          >
            {pasos.map((p, n) => (
              <li
                key={n}
                className={`relative flex items-start gap-4 ${
                  enFila ? "lg:flex-1 lg:flex-col lg:items-center lg:px-4 lg:text-center" : ""
                }`}
              >
                {/* La línea que une los círculos: media a la izquierda y media a
                    la derecha de cada uno. En dos mitades y no una línea sola de
                    punta a punta porque así se adapta a cualquier cantidad sin
                    medir nada — que es donde se rompe la de ellos. */}
                {enFila && n > 0 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-1/2 ${alturaLinea} hidden h-px bg-[color:var(--pv-linea)] lg:block`}
                  />
                )}
                {enFila && n < pasos.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 right-0 ${alturaLinea} hidden h-px bg-[color:var(--pv-linea)] lg:block`}
                  />
                )}

                {/* ⚠️ El número sale de la POSICIÓN, no de un campo. En el editor
                    de la competencia se escribe a mano —vimos un "1)" tipeado
                    adentro del título y un paso agregado que quedó sin número— y
                    ahí reordenar deja los números mintiendo. */}
                <span
                  aria-hidden="true"
                  className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--pv-acento)] font-bold text-[color:var(--pv-sobre)]"
                >
                  {n + 1}
                </span>
                <div className={`min-w-0 ${enFila ? "lg:mt-3" : ""}`}>
                  {p.titulo && <h3 className="text-pretty font-semibold text-[color:var(--pv-tinta)]">{p.titulo}</h3>}
                  {p.detalle && (
                    <p className="mt-1 text-pretty text-sm leading-relaxed text-[color:var(--pv-tenue)]">
                      {p.detalle}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Seccion>
      );
    }

    case "opiniones": {
      const items = lista(campos, "items").filter((i) => i.texto);
      return (
        <Seccion tono={tono} estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <Bajada>{texto(campos, "subtitulo")}</Bajada>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((i, n) => (
              <figure key={n} className={`bg-[color:var(--pv-tarjeta)] p-5 ${estilo.tarjeta}`}>
                <blockquote className="text-pretty leading-relaxed text-[color:var(--pv-tinta)]">
                  {i.texto}
                </blockquote>
                {i.nombre && (
                  <figcaption className="mt-3 text-sm font-medium text-[color:var(--pv-tenue)]">
                    {i.nombre}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </Seccion>
      );
    }

    case "precio": {
      /* ⚠️ La lista va ARRIBA del precio, no abajo. Un precio suelto se compara
         contra nada; leído después de cuatro renglones con su valor cada uno, se
         compara contra el total. El orden es la mitad del efecto. */
      const dias = diasDeGarantia(datos);
      return (
        <Seccion tono={tono} estilo={estilo}>
          <div className={`mx-auto flex max-w-xl flex-col items-center gap-5 bg-[color:var(--pv-suave)] px-5 py-10 text-center sm:px-8 ${estilo.tarjeta}`}>
            <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
            <LoQueIncluye datos={datos} dias={dias} estilo={estilo} />
            {/* El precio no se puede ocultar: `lib/pagina-venta` no le da botón
                de apagar, y mandar visible:false tampoco lo apaga. */}
            <Numeros datos={datos} estilo={estilo} listaAparte />
            <BotonComprar esPrevia={esPrevia} estilo={estilo}>{texto(campos, "textoBoton")}</BotonComprar>
            <Sellos dias={dias} />
            {texto(campos, "aclaracion") && (
              <p className="text-sm text-[color:var(--pv-tenue)]">{texto(campos, "aclaracion")}</p>
            )}
          </div>
        </Seccion>
      );
    }

    case "garantia": {
      /* `{dias}` sale del campo de al lado. El número vive en un solo lugar para
         que no quede un título que dice 7 con una garantía de 30. */
      const dias = typeof campos.dias === "number" ? campos.dias : null;
      return (
        <Seccion tono={tono} estilo={estilo}>
          <div className={`mx-auto max-w-2xl bg-[color:var(--pv-tarjeta)] p-6 text-center sm:p-8 ${estilo.tarjeta}`}>
            {/* El escudo. Un bloque de garantía sin nada que mirar se lee como
                un párrafo más y se saltea; con el sello arriba se frena el ojo.
                El círculo toma el verde de la página, no uno escrito acá. */}
            <span
              aria-hidden="true"
              className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[color:var(--pv-ok)]/10 text-3xl"
            >
              🛡️
            </span>
            <Titulo estilo={estilo}>{conFichas(texto(campos, "titulo"), campos)}</Titulo>
            <p className="mt-3 text-pretty leading-relaxed text-[color:var(--pv-tenue)]">
              {conFichas(texto(campos, "texto"), campos)}
            </p>
            {/* ⚠️ El sello dice lo que la persona puede HACER, con los días de al
                lado. El de la competencia dice que protege al comprador, y eso
                suena a que responde la plataforma — cuando acá la devolución la
                paga quien vende, de su bolsillo. No firmamos con nuestro nombre
                una promesa que cumple otro.

                Hay un chequeo que falla si esa frase vuelve a aparecer, así que
                acá está dicha con otras palabras a propósito. */}
            {dias ? (
              <p
                className={`mt-5 inline-block bg-[color:var(--pv-ok)] px-4 py-2 text-sm font-bold text-[color:var(--pv-fondo)] ${estilo.sello}`}
              >
                {dias} días para pedir la devolución
              </p>
            ) : null}
          </div>
        </Seccion>
      );
    }

    case "preguntas": {
      const items = lista(campos, "items").filter((i) => i.pregunta);
      return (
        <Seccion tono={tono} estilo={estilo}>
          <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
          <Bajada>{texto(campos, "subtitulo")}</Bajada>
          {/* `details` nativo: abre y cierra sin una línea de JavaScript, y
              funciona igual si el script no cargó. */}
          <div className="mx-auto mt-8 grid max-w-2xl gap-3">
            {items.map((i, n) => (
              <details
                key={n}
                className={`group bg-[color:var(--pv-tarjeta)] px-5 py-4 ${estilo.tarjeta}`}
              >
                <summary className="cursor-pointer list-none font-medium text-[color:var(--pv-tinta)] marker:content-none">
                  <span className="flex items-start justify-between gap-4">
                    <span className="text-pretty">{i.pregunta}</span>
                    <span aria-hidden="true" className="mt-0.5 shrink-0 text-[color:var(--pv-tenue)] transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                {i.respuesta && (
                  <p className="mt-3 text-pretty leading-relaxed text-[color:var(--pv-tenue)]">{i.respuesta}</p>
                )}
              </details>
            ))}
          </div>
        </Seccion>
      );
    }

    case "urgencia": {
      /* Sin fecha no hay cartel. Y si la fecha ya pasó tampoco: eso lo decide
         `BarraDeOferta`, que corre en el navegador — comparar contra "ahora"
         acá daría una barra congelada en el momento en que se dibujó la página,
         y con caché podría seguir anunciando una oferta ya vencida. */
      const hasta = typeof campos.hasta === "string" ? campos.hasta : null;
      if (!hasta) return null;
      return <BarraDeOferta texto={texto(campos, "texto")} hasta={hasta} />;
    }

    case "cierre":
      return (
        <Seccion tono={tono} estilo={estilo}>
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
            <Titulo estilo={estilo}>{texto(campos, "titulo")}</Titulo>
            <Numeros datos={datos} estilo={estilo} />
            <BotonComprar esPrevia={esPrevia} estilo={estilo}>{texto(campos, "textoBoton")}</BotonComprar>
            <Sellos dias={diasDeGarantia(datos)} />
          </div>
        </Seccion>
      );

    /* Fija abajo. Sale del flujo, así que no importa dónde esté en la lista. */
    case "barra": {
      const ahorroBarra = cuentaDeLaOferta(datos);
      return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)]/95 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            {/* ⚠️ El tachado sale de `cuentaDeLaOferta`, la misma que el sello y
                el renglón verde. Antes leía `comparePrice` por su cuenta, así que
                con bonos cargados la barra decía 20.000 y el resto de la página
                34.000 — dos números para lo mismo en la misma pantalla. */}
            <p className="min-w-0">
              {/* Qué se lleva, arriba del precio. Es la barra que queda a la vista
                  todo el scroll: sin esto dice un número sin decir de qué. */}
              {bonos.length > 0 && (
                <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-[color:var(--pv-tenue)]">
                  Ebook + {bonos.length} {bonos.length === 1 ? "bono" : "bonos"}
                </span>
              )}
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg font-extrabold leading-none text-[color:var(--pv-tinta)] sm:text-xl">
                  {money(producto.price)}
                </span>
                {ahorroBarra.ahorro > 0 ? (
                  <>
                    <span className="text-xs text-[color:var(--pv-tenue)] line-through">
                      {money(ahorroBarra.valorTotal)}
                    </span>
                    {/* El ahorro también acá: es el dato que más empuja y la barra
                        es lo único que se ve durante todo el scroll. Se esconde en
                        pantallas angostas, donde el botón necesita el lugar. */}
                    <span className="hidden text-xs font-bold text-[color:var(--pv-ok)] sm:inline">
                      Ahorrás {money(ahorroBarra.ahorro)}
                    </span>
                  </>
                ) : null}
              </span>
            </p>
            <span className="w-auto max-w-[60%] shrink-0 [&>button]:w-auto [&>button]:px-5 [&>button]:py-3 [&>button]:text-sm">
              <BotonComprar esPrevia={esPrevia} estilo={estilo}>{texto(campos, "textoBoton")}</BotonComprar>
            </span>
          </div>
        </div>
      );
    }

    case "pie":
      return (
        <footer className="border-t border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)]">
          <div className="mx-auto max-w-3xl px-5 py-10 text-center text-sm text-[color:var(--pv-tenue)] sm:px-8">
            {texto(campos, "texto") && (
              <p className="mb-4 text-pretty">{texto(campos, "texto")}</p>
            )}
            {vendedor.nombre && <p className="font-medium text-[color:var(--pv-tinta)]">{vendedor.nombre}</p>}
            {vendedor.contacto && <p className="mt-1">{vendedor.contacto}</p>}
            {texto(campos, "copyright") && (
              <p className="mt-4 text-xs">
                {conFichas(texto(campos, "copyright"), campos, { anio })}
              </p>
            )}
            {/* ⚠️ Los tres van FIJOS y no son campos: son obligaciones, no
                decoración. El de arrepentimiento lo pide la Resolución 424/2020
                y ya existe en el proyecto; en el pie de la competencia no está. */}
            <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
              <a href="/terminos" className="underline hover:text-[color:var(--pv-tinta)]">Términos</a>
              <a href="/privacidad" className="underline hover:text-[color:var(--pv-tinta)]">Privacidad</a>
              <a href="/arrepentimiento" className="underline hover:text-[color:var(--pv-tinta)]">
                Botón de arrepentimiento
              </a>
            </p>
          </div>
        </footer>
      );

    default:
      return null;
  }
}

/**
 * El recuadro que aparece al pasar el mouse por una sección, en la previa.
 *
 * Es un `button` de verdad y no un `div` con `onClick`: así se llega con el
 * teclado y se anuncia solo. Va con `sr-only` un texto que dice qué hace, porque
 * lo que se ve es apenas el nombre de la sección.
 */
function MarcaDeSeccion({ clave, alTocar, children }: {
  clave: string; alTocar: (clave: string) => void; children: React.ReactNode;
}) {
  const nombre = buscarSeccion(clave)?.nombre ?? clave;

  /* ⚠️ Se toca EL TEXTO, no un cartelito. Apuntarle a una chapita de 20 píxeles
     arriba a la derecha es puntería; tocar el párrafo que querés cambiar es lo
     que sale solo. El cartel queda como señal de qué sección es y como camino
     para el teclado.

     Lo que sí se respeta: si el clic cayó sobre algo que ya hace otra cosa —el
     botón de comprar, un enlace del pie, una pregunta que se abre— gana eso.
     Si no, la página se comería sus propios controles adentro de la previa. */
  const alClic = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest("button, a, summary, input, label, [role='button']")) return;
    alTocar(clave);
  };

  return (
    <div
      onClick={alClic}
      className="group/marca relative cursor-pointer outline-2 -outline-offset-2 outline-dashed outline-transparent transition-[outline-color] hover:outline-sky-500"
    >
      {children}
      <button
        type="button"
        onClick={() => alTocar(clave)}
        className="absolute right-3 top-3 z-20 hidden rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg group-hover/marca:block"
      >
        <span className="sr-only">Editar la sección </span>
        {nombre}
      </button>
    </div>
  );
}

export default function PaginaDeVenta(datos: DatosDePagina) {
  /* ⚠️ Qué se dibuja lo decide `seDibuja`, en `lib/pagina-venta`, y NO cada
     `case` de acá. Es la misma función que el editor usa para avisar "esta
     sección no se va a ver, y por qué". Si la regla viviera acá adentro, el
     panel diría una cosa y la página haría otra — que es la peor forma de
     enterarse de que tu página salió a medias. */
  const ctx = { hayBonos: datos.bonos.length > 0 };
  /* La barra está fija arriba de todo, así que tapa el final de la página. Sin
     este colchón, el último renglón del pie queda abajo del botón y no se lee. */
  const conBarra = datos.pagina.secciones.some((s) => s.clave === "barra" && seDibuja(s, ctx));

  /* ⚠️ La paleta entra como variables de CSS y no como clases de Tailwind.
     Tailwind necesita ver la clase ENTERA escrita en el código para generarla;
     una armada pegando pedazos —`bg-${color}-600`— no existe y la página sale
     sin color. Con variables, el mismo `bg-[color:var(--pv-acento)]` sirve para
     las seis paletas. */
  const paleta = buscarPaleta(datos.pagina.paleta);
  const estiloRaiz = buscarEstilo(datos.pagina.estilo);
  /* El estilo Nocturno es el único que toca los colores: da vuelta la tinta, el
     fondo y las tarjetas. El ACENTO no cambia — es lo que hace saltar el botón,
     y es el mismo color en las dos versiones. */
  const g = estiloRaiz.oscuro ? COLORES_OSCUROS : COLORES_CLAROS;
  const colores = {
    "--pv-tinta": g.tinta,
    "--pv-ok": g.ok,
    "--pv-tenue": g.tenue,
    "--pv-linea": g.linea,
    "--pv-tarjeta": g.tarjeta,
    "--pv-acento": estiloRaiz.oscuro ? paleta.acentoOscuro : paleta.acento,
    "--pv-sobre": estiloRaiz.oscuro ? paleta.sobreAcentoOscuro : paleta.sobreAcento,
    "--pv-fondo": estiloRaiz.oscuro ? COLORES_OSCUROS.fondo : paleta.fondo,
    "--pv-suave": estiloRaiz.oscuro ? COLORES_OSCUROS.suave : paleta.suave,
    "--pv-fuerte": estiloRaiz.oscuro ? paleta.fuerteOscuro : paleta.fuerte,
    /* La letra entra igual que los colores, por variable, y se hereda: con
       ponerla en la raíz vale para toda la página. Los archivos los declara
       `lib/fuentes-venta`, colgado más arriba por la página pública. */
    fontFamily: buscarTipografia(datos.pagina.tipografia).familia,
  } as React.CSSProperties;

  return (
    /* ⚠️ Las dos clases raras de acá tapan el mismo agujero, y es uno que vimos
       roto en la página de la competencia el 02/09/26: alguien pega un título sin
       espacios —"carasfsdfsdfsdfsdf…"— y la palabra no puede cortarse en ningún
       lado, así que empuja el ancho de la página. Resultado: barra de scroll
       horizontal, el título saliéndose de la pantalla y todo el contenido corrido.

       · `overflow-wrap: anywhere` deja cortar adentro de una palabra. Se pone UNA
         vez acá porque esa propiedad se hereda: vale para todos los textos de la
         página sin tener que acordarse en cada uno. Y de paso achica el ancho
         mínimo que las cajas piden, que es lo que rompía las columnas.
       · `overflow-x-clip` es la red: si algo igual se pasa, se recorta y no
         aparece la barra horizontal. Va `clip` y no `hidden` porque `hidden`
         convertiría el alto en un contenedor con scroll propio. */
    <div
      style={colores}
      className={`min-h-screen overflow-x-clip [overflow-wrap:anywhere] bg-[color:var(--pv-fondo)] text-[color:var(--pv-tinta)] antialiased ${conBarra ? "pb-24" : ""}`}
    >
      {datos.pagina.secciones.map((s) => {
        if (!seDibuja(s, ctx)) return null;
        const dibujo = <Contenido key={s.clave} clave={s.clave} campos={s.campos} tono={s.tono} datos={datos} />;
        /* La barra de compra no se marca: está pegada al borde de la ventana, así
           que su envoltorio no tiene alto y el cartelito quedaría en cualquier
           lado. Su nombre además es obvio: es el único botón flotante. */
        if (!datos.alTocarSeccion || s.clave === "barra") return dibujo;
        return (
          <MarcaDeSeccion key={s.clave} clave={s.clave} alTocar={datos.alTocarSeccion}>
            {dibujo}
          </MarcaDeSeccion>
        );
      })}
    </div>
  );
}
