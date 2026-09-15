"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { textoQueAcepto } from "@/lib/consentimiento-digital";
import { origenAnotado } from "@/lib/visitas-digitales";
import { descuentoDe, normalizarCodigo, type TipoDeCupon } from "@/lib/cupones-digitales";
import { vistaEnDelToken, venceEnTexto, type HorasDeOferta } from "@/lib/oferta-salida";
import CartelDeSalida from "@/components/digitales/CartelDeSalida";
import { Loader2, Lock, ShieldCheck, Package, Check, AlertTriangle, Ticket } from "lucide-react";

/**
 * El formulario de pago.
 *
 * ── Un solo campo obligatorio ───────────────────────────────────────────────
 *
 * El mail, y sólo porque es a donde va el archivo. La competencia pide cuatro
 * —mail, nombre, apellido y teléfono— y los cuatro obligatorios; para entregar
 * un PDF hace falta uno. Cada campo de más entre el botón y el pago es gente que
 * se va, y ninguno de los otros tres entrega nada.
 *
 * El nombre está y es opcional: se usa para saludar en el mail de entrega.
 *
 * ── Los números NO se calculan acá ──────────────────────────────────────────
 *
 * Bueno: casi. Acá se suma para MOSTRAR, y el servidor vuelve a sumar para
 * COBRAR, con la misma función. Si los dos números no coincidieran, manda el del
 * servidor — pero no pueden no coincidir, porque los precios de esta pantalla
 * los puso el servidor y lo único que viaja de vuelta son identificadores.
 */

/**
 * La oferta de salida, ya decidida por el servidor: qué se ofrece y el
 * token con la hora en que se mostró (ver `lib/oferta-salida`).
 */
export type OfertaEnElCheckout = {
  titulo: string; texto: string; boton: string; horas: HorasDeOferta; token: string;
} & (
  | { tipo: "DESCUENTO"; codigo: string; porcentaje: number; nombre: string; imagen: string | null }
  | { tipo: "PRODUCTO"; producto: { nombre: string; precio: number; descripcion: string | null; imagen: string | null; href: string } }
);

type Bono = { id: string; nombre: string; vale: number };
type Upsell = {
  id: string; nombre: string; descripcion: string | null;
  precio: number; regular: number | null; imagen: string | null;
};

type Props = {
  productoId: string;
  nombre: string;
  imagen: string | null;
  precio: number;
  regular: number;
  bonos: Bono[];
  upsells: Upsell[];
  totalBase: number;
  diasDeGarantia: number | null;
  diasDelEnlace: number;
  maxDescargas: number;
  vendedor: string | null;
  puedeCobrar: boolean;
  /**
   * Qué le falta, cuando la mira su dueña antes de poder vender.
   *
   * `null` para todo el mundo salvo ella: si el producto no se puede vender,
   * quien no es la dueña ni llega hasta acá.
   */
  avisoDePrevia: string | null;
  botonRedondo: string;
  tarjeta: string;
  /** Null = sin oferta de salida (apagada, sin plan, o no se puede vender). */
  oferta: OfertaEnElCheckout | null;
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function CheckoutClient(p: Props) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [error, setError] = useState("");
  /* Arranca APAGADA, siempre. Una casilla de consentimiento que viene marcada
     de fábrica no es consentimiento: es un cartel. */
  const [acepto, setAcepto] = useState(false);
  const [yendo, setYendo] = useState(false);
  /* El cupón: lo que se escribe, y lo que el servidor dijo que vale. El
     precio de abajo se calcula con `descuentoDe`, la misma función que va a
     usar la ruta al cobrar: la pantalla no puede prometer un número distinto. */
  const [codigo, setCodigo] = useState("");
  const [cupon, setCupon] = useState<{ codigo: string; tipo: TipoDeCupon; valor: number; texto: string } | null>(null);
  const [cuponError, setCuponError] = useState("");
  const [cuponMirando, setCuponMirando] = useState(false);
  /* ── La oferta de salida ──────────────────────────────────────────────
     `tokenDeOferta` es la hora en que ESTA persona la vio, firmada. Se
     guarda en el navegador la primera vez: recargar no reinicia el plazo. Al
     pagar viaja con el cupón para que el servidor lo haga cumplir. */
  const [cartel, setCartel] = useState<{ vence: string } | null>(null);
  const [tokenDeOferta, setTokenDeOferta] = useState<string | null>(null);
  const [ofertaError, setOfertaError] = useState("");
  const ofertaMostrada = useRef(false);
  /* ⚠️ El freno del doble click. `useState` no alcanza: dos clics seguidos leen
     el mismo `false` antes de que React vuelva a dibujar, y salen los dos. Con
     un `ref` el segundo ve el `true` en el mismo instante. Es el mismo patrón
     que el panel usa para publicar y borrar. */
  const enVuelo = useRef(false);

  const cuenta = useMemo(() => {
    const sumaUpsells = p.upsells
      .filter((u) => elegidos.includes(u.id))
      .reduce((s, u) => s + u.precio, 0);
    const valorBonos = p.bonos.reduce((s, b) => s + b.vale, 0);
    const regularUpsells = p.upsells
      .filter((u) => elegidos.includes(u.id))
      .reduce((s, u) => s + (u.regular ?? u.precio), 0);

    const sinCupon = p.totalBase + sumaUpsells;
    const descuento = cupon ? descuentoDe(cupon, sinCupon) : 0;
    const pagas = sinCupon - descuento;
    const valorTotal = p.regular + valorBonos + regularUpsells;
    return { sinCupon, descuento, pagas, valorTotal, ahorro: valorTotal > pagas ? valorTotal - pagas : 0 };
  }, [elegidos, p, cupon]);

  /**
   * Verifica un cupón contra el servidor y lo deja puesto. `oferta` es el
   * token de la oferta de salida: el cupón SALIDA-… no vale sin él.
   * Devuelve el error, o null si quedó aplicado.
   */
  async function verificarCupon(c: string, oferta: string | null): Promise<string | null> {
    try {
      const r = await fetch("/api/digitales/cupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: p.productoId, codigo: c, ...(oferta ? { oferta } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) return d.error ?? "Ese cupón no existe.";
      setCupon({ codigo: d.codigo, tipo: d.tipo, valor: d.valor, texto: d.texto });
      setCodigo(d.codigo);
      return null;
    } catch {
      return "No pudimos verificar el cupón. Probá de nuevo.";
    }
  }

  async function aplicarCupon() {
    const c = normalizarCodigo(codigo);
    if (!c || cuponMirando) return;
    setCuponMirando(true);
    setCuponError("");
    const problema = await verificarCupon(c, null);
    if (problema) { setCupon(null); setCuponError(problema); }
    setCuponMirando(false);
  }

  /* ── Cuándo aparece el cartel ─────────────────────────────────────────
     En computadora, cuando el mouse sale por arriba (va a cerrar la pestaña
     o a la barra). En el celular, al apretar atrás: se deja una entrada en
     el historial para que "atrás" primero muestre el cartel y recién el
     segundo "atrás" se vaya. Una sola vez por persona y producto: el
     navegador se acuerda. Nunca mientras está pagando ni en la previa de la
     dueña. Si ya tenía un cupón puesto y acepta, el de la oferta lo
     reemplaza: el resumen del precio lo muestra. */
  const oferta = p.oferta;
  useEffect(() => {
    if (!oferta || !p.puedeCobrar) return;
    const claveVista = `pv_salida_vista_${p.productoId}`;
    const claveToken = `pv_salida_token_${p.productoId}`;
    try { if (window.localStorage.getItem(claveVista)) return; } catch { /* sin almacenamiento se muestra igual */ }

    const mostrar = () => {
      if (ofertaMostrada.current || enVuelo.current) return;
      ofertaMostrada.current = true;
      /* El token más viejo que siga vivo: el guardado si lo hay, si no el de
         esta carga. Así recargar no reinicia el plazo. */
      let token = oferta.token;
      try {
        const guardado = window.localStorage.getItem(claveToken);
        const vistaEn = guardado ? vistaEnDelToken(guardado) : null;
        if (guardado && vistaEn && vistaEn + oferta.horas * 3_600_000 > Date.now()) token = guardado;
        window.localStorage.setItem(claveToken, token);
        window.localStorage.setItem(claveVista, "1");
      } catch { /* ídem */ }
      const vistaEn = vistaEnDelToken(token) ?? Date.now();
      setTokenDeOferta(token);
      setCartel({ vence: venceEnTexto(new Date(vistaEn + oferta.horas * 3_600_000)) });
    };

    const alSalir = (e: MouseEvent) => { if (e.clientY <= 0) mostrar(); };
    /* Si el cartel ya salió (por el mouse), la entrada extra del historial
       sigue ahí: este "atrás" la consume y hay que irse de verdad. */
    const alVolver = () => { if (ofertaMostrada.current) window.history.back(); else mostrar(); };
    document.documentElement.addEventListener("mouseleave", alSalir);
    window.history.pushState({ salida: true }, "", window.location.href);
    window.addEventListener("popstate", alVolver);
    return () => {
      document.documentElement.removeEventListener("mouseleave", alSalir);
      window.removeEventListener("popstate", alVolver);
    };
  }, [oferta, p.productoId, p.puedeCobrar]);

  /* Cerrar el cartel: si se abrió por "atrás", ya se consumió la entrada
     extra del historial; si se abrió por el mouse, sigue ahí y da igual. */
  function cerrarCartel() { setCartel(null); }

  async function aceptarOferta() {
    if (!oferta || oferta.tipo !== "DESCUENTO" || cuponMirando) return;
    setCuponMirando(true);
    setOfertaError("");
    const problema = await verificarCupon(oferta.codigo, tokenDeOferta);
    if (problema) setOfertaError(problema);
    else setCartel(null);
    setCuponMirando(false);
  }

  const mailValido = /^[^@\s]+@[^@\s]+\.[^@.\s]+$/.test(email.trim());

  async function pagar() {
    if (enVuelo.current) return;
    if (!mailValido) {
      setError("Escribí un correo válido: es a donde te mandamos el archivo.");
      return;
    }
    /* El botón ya está apagado sin la casilla; esto es por si alguien lo
       prende desde la consola. La ruta lo mira una tercera vez. */
    if (!acepto) {
      setError("Marcá la casilla para poder seguir.");
      return;
    }
    enVuelo.current = true;
    setYendo(true);
    setError("");
    try {
      const r = await fetch("/api/digitales/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: p.productoId,
          email: email.trim(),
          nombre: nombre.trim() || undefined,
          /* Sólo identificadores. Ningún precio viaja desde acá. */
          upsells: elegidos,
          /* El CÓDIGO del cupón, nunca el monto: cuánto vale lo decide el servidor. */
          cupon: cupon?.codigo,
          /* El plazo firmado, para que el servidor lo haga cumplir con el
             cupón de la oferta de salida. Con otro cupón no hace nada. */
          oferta: tokenDeOferta ?? undefined,
          /* Viaja el HECHO de haber aceptado, no el texto: el texto lo pone el
             servidor. Una prueba que la escribe el navegador no prueba nada. */
          acepto: true,
          /* De dónde vino, tal como lo anotó la página de venta al entrar. Crudo:
             la etiqueta la pone el servidor. Es sólo para Estadísticas; sin esto
             la compra sale igual. */
          origen: origenAnotado(p.productoId),
        }),
      });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok || !datos.initPoint) {
        setError(datos.error ?? "No pudimos abrir el pago. Probá de nuevo.");
        enVuelo.current = false;
        setYendo(false);
        return;
      }
      /* `replace` y no `href`: si la persona vuelve atrás desde Mercado Pago,
         que caiga en la página de venta y no en un checkout a medio llenar. */
      window.location.replace(datos.initPoint);
    } catch {
      setError("No pudimos conectarnos. Fijate la conexión y probá de nuevo.");
      enVuelo.current = false;
      setYendo(false);
    }
  }

  const campo =
    "w-full rounded-lg border-2 border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)] " +
    "px-4 py-3.5 text-base text-[color:var(--pv-tinta)] outline-none transition " +
    "placeholder:text-[color:var(--pv-tenue)] placeholder:opacity-60 " +
    "focus:border-[color:var(--pv-acento)]";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Qué se está comprando, siempre a la vista. Nadie tiene que acordarse. */}
      <div className="mb-7 flex items-center justify-between gap-4 border-b border-[color:var(--pv-linea)] pb-4">
        <p className="min-w-0 text-sm font-bold text-[color:var(--pv-tinta)]">{p.nombre}</p>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[color:var(--pv-tenue)]">
          <Lock className="h-3.5 w-3.5" /> Pago seguro
        </span>
      </div>

      {/* ⚠️ Este cartel lo ve SÓLO la dueña del producto: si todavía no se puede
          vender, quien no es ella ni llega a esta pantalla. Por eso está escrito
          para ella —dice qué le falta y dónde arreglarlo— y no para un comprador.
          Antes acá había un 404 pelado que no explicaba nada. */}
      {p.avisoDePrevia && (
        <div className={`mb-6 bg-[color:var(--pv-fuerte)] p-4 ${p.tarjeta}`}>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">
            Así lo van a ver — sólo lo ves vos
          </p>
          <div className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--pv-tinta)]" />
            <p className="text-sm text-[color:var(--pv-tinta)]">
              {p.avisoDePrevia}{" "}
              <span className="opacity-75">El botón de pagar está apagado hasta que se resuelva.</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* ── Los datos ────────────────────────────────────────────────── */}
        <div>
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">
            Adónde te lo mandamos
          </p>

          <label className="block">
            <span className="sr-only">Tu correo</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
              placeholder="vos@ejemplo.com"
              disabled={!p.puedeCobrar}
              className={campo}
            />
          </label>
          <p className="mt-2 text-[13px] text-[color:var(--pv-tenue)]">
            Ahí te llega el archivo apenas se acredita el pago. Revisá que esté bien escrito.
          </p>

          <div className="mt-5 border-t border-[color:var(--pv-linea)] pt-4">
            <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)] opacity-75">
              Opcional
            </p>
            <label className="block">
              <span className="sr-only">Tu nombre</span>
              <input
                type="text"
                autoComplete="given-name"
                maxLength={80}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                disabled={!p.puedeCobrar}
                className={`${campo} border py-2.5 text-sm`}
              />
            </label>
            <p className="mt-1.5 text-[12px] text-[color:var(--pv-tenue)]">Para saludarte por tu nombre en el mail.</p>
          </div>

          {/* ── La casilla del art. 1116 ──────────────────────────────────
              Es la única defensa contra "compré, bajé el PDF y pedí la plata de
              vuelta". Ver `lib/consentimiento-digital`.

              Va ARRIBA del botón y sin achicar: una prueba legal escondida en
              letra de 9 px o atrás de un link es una prueba que un juez de
              consumo descarta. Y el texto que se guarda lo elige el servidor,
              no esta pantalla. */}
          <label className="mt-5 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={acepto}
              onChange={(e) => { setAcepto(e.target.checked); if (error) setError(""); }}
              disabled={!p.puedeCobrar}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[color:var(--pv-acento)]"
            />
            <span className="text-[12.5px] leading-relaxed text-[color:var(--pv-tenue)]">
              {textoQueAcepto(false, p.diasDeGarantia)}
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-4 bg-[color:var(--pv-fuerte)] px-3 py-2 text-sm font-medium text-[color:var(--pv-tinta)]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={pagar}
            /* Se apaga sin la casilla, y además `pagar` lo vuelve a mirar: un
               `disabled` se saca desde la consola en dos segundos. */
            disabled={yendo || !p.puedeCobrar || !acepto}
            className={`mt-5 flex w-full items-center justify-center gap-2 bg-[color:var(--pv-acento)] px-6 py-4 text-lg font-bold text-[color:var(--pv-sobre)] transition hover:brightness-110 disabled:opacity-50 ${p.botonRedondo}`}
          >
            {yendo ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {yendo ? "Abriendo el pago…" : `Pagar ${plata(cuenta.pagas)}`}
          </button>

          <ul className="mt-4 grid gap-2">
            <Sello icono={<Lock className="h-3.5 w-3.5" />}>
              Pagás con Mercado Pago. Tus datos de tarjeta no pasan por acá.
            </Sello>
            {p.diasDeGarantia !== null && (
              <Sello icono={<ShieldCheck className="h-3.5 w-3.5" />}>
                {p.diasDeGarantia} días para pedir la devolución.
              </Sello>
            )}
            <Sello icono={<Package className="h-3.5 w-3.5" />}>
              El enlace de descarga te dura {p.diasDelEnlace} días, para {p.maxDescargas} descargas.
            </Sello>
          </ul>
        </div>

        {/* ── Lo que te llevás ─────────────────────────────────────────── */}
        <div className={`bg-[color:var(--pv-suave)] p-5 ${p.tarjeta}`}>
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">
            Lo que te llevás
          </p>

          <Renglon nombre={p.nombre} valor={plata(p.regular)} />
          {p.bonos.map((b) => (
            <Renglon
              key={b.id}
              nombre={b.nombre}
              valor={
                <>
                  {b.vale > 0 && <s className="mr-2 font-normal opacity-55">{plata(b.vale)}</s>}
                  <span className="text-[color:var(--pv-ok)]">GRATIS</span>
                </>
              }
            />
          ))}
          {p.upsells.filter((u) => elegidos.includes(u.id)).map((u) => (
            <Renglon key={u.id} nombre={u.nombre} valor={plata(u.regular ?? u.precio)} />
          ))}

          {/* El upsell antes de pagar y con un click: es la mejor ubicación que
              tiene, y es lo único que se copió de la competencia. Sin reloj al
              lado — el de ellos reinicia. */}
          {p.upsells.map((u) => {
            const puesto = elegidos.includes(u.id);
            return (
              <div key={u.id} className={`mt-4 border-2 border-dashed border-[color:var(--pv-acento)] p-3.5 ${p.tarjeta} ${puesto ? "bg-[color:var(--pv-fuerte)] border-solid" : "bg-[color:var(--pv-tarjeta)]"}`}>
                <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[color:var(--pv-acento)]">
                  Sumá a tu compra
                </p>
                <p className="text-sm font-bold text-[color:var(--pv-tinta)]">{u.nombre}</p>
                {u.descripcion && (
                  <p className="mt-1 text-[12.5px] text-[color:var(--pv-tenue)]">{u.descripcion}</p>
                )}
                <p className="mt-2 text-sm font-bold text-[color:var(--pv-tinta)]">
                  {u.regular && <s className="mr-2 font-normal opacity-55">{plata(u.regular)}</s>}
                  {plata(u.precio)}
                </p>
                <button
                  type="button"
                  onClick={() => setElegidos((v) => puesto ? v.filter((x) => x !== u.id) : [...v, u.id])}
                  aria-pressed={puesto}
                  className={`mt-2.5 flex w-full items-center justify-center gap-1.5 border-2 border-[color:var(--pv-acento)] px-3 py-2 text-[13px] font-bold transition ${p.botonRedondo} ${
                    puesto
                      ? "bg-[color:var(--pv-acento)] text-[color:var(--pv-sobre)]"
                      : "text-[color:var(--pv-acento)] hover:bg-[color:var(--pv-acento)] hover:text-[color:var(--pv-sobre)]"
                  }`}
                >
                  {puesto ? <><Check className="h-3.5 w-3.5" /> Agregado — sacar</> : "+ Agregar a tu compra"}
                </button>
              </div>
            );
          })}

          {/* ── El cupón ─────────────────────────────────────────────────
              Chico y abajo del detalle: quien tiene uno lo busca; quien no,
              no tiene que ver un campo vacío que le sugiera salir a buscarlo. */}
          <div className="mt-4">
            {cupon ? (
              <p className="flex items-center justify-between gap-2 text-[13px] text-[color:var(--pv-ok)]">
                <span className="inline-flex items-center gap-1.5 font-bold"><Ticket className="h-3.5 w-3.5" /> Cupón {cupon.codigo} · {cupon.texto}</span>
                <button type="button" onClick={() => { setCupon(null); setCodigo(""); }} className="text-[12px] underline underline-offset-2 text-[color:var(--pv-tenue)]">sacar</button>
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  aria-label="Código de cupón"
                  value={codigo}
                  onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setCuponError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicarCupon(); } }}
                  maxLength={20}
                  placeholder="¿Tenés un cupón?"
                  autoComplete="off"
                  className={`min-w-0 flex-1 border-2 border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)] px-3 py-2 text-[13px] uppercase text-[color:var(--pv-tinta)] outline-none focus:border-[color:var(--pv-acento)] ${p.botonRedondo}`}
                />
                <button
                  type="button"
                  onClick={aplicarCupon}
                  disabled={cuponMirando || !codigo.trim()}
                  className={`shrink-0 border-2 border-[color:var(--pv-acento)] px-3 py-2 text-[13px] font-bold text-[color:var(--pv-acento)] transition hover:bg-[color:var(--pv-acento)] hover:text-[color:var(--pv-sobre)] disabled:opacity-40 ${p.botonRedondo}`}
                >
                  {cuponMirando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                </button>
              </div>
            )}
            {cuponError && <p role="alert" className="mt-2 bg-[color:var(--pv-fuerte)] px-3 py-2 text-[12.5px] font-medium text-[color:var(--pv-tinta)]">{cuponError}</p>}
          </div>

          <div className="mt-4 border-t-2 border-[color:var(--pv-linea)] pt-3">
            {cuenta.descuento > 0 && (
              <p className="flex justify-between text-sm text-[color:var(--pv-tenue)]">
                <span>Cupón {cupon?.codigo}</span>
                <span className="tabular-nums">−{plata(cuenta.descuento)}</span>
              </p>
            )}
            {cuenta.valorTotal > cuenta.pagas && (
              <p className="flex justify-between text-sm text-[color:var(--pv-tenue)]">
                <span>Valor total</span>
                <s className="tabular-nums">{plata(cuenta.valorTotal)}</s>
              </p>
            )}
            <p className="flex justify-between pt-1 text-xl font-extrabold text-[color:var(--pv-tinta)]">
              <span>Pagás</span>
              <span className="tabular-nums">{plata(cuenta.pagas)}</span>
            </p>
            {cuenta.ahorro > 0 && (
              <p className="flex justify-between pt-1 text-sm font-extrabold text-[color:var(--pv-ok)]">
                <span>Ahorrás</span>
                <span className="tabular-nums">{plata(cuenta.ahorro)}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-8 border-t border-[color:var(--pv-linea)] pt-4 text-center text-[11.5px] text-[color:var(--pv-tenue)]">
        <a href="/terminos" className="underline underline-offset-2">Términos</a>
        {" · "}
        <a href="/privacidad" className="underline underline-offset-2">Privacidad</a>
        {p.vendedor ? ` · Vende ${p.vendedor} a través de TiendaApps` : " · A través de TiendaApps"}
      </p>

      {/* ── La oferta de salida ──────────────────────────────────────────
          Un solo cartel, el mismo componente que la vista previa del panel.
          Con descuento: aplica el cupón y cierra. Con producto más barato:
          el botón es un link a su pago. */}
      {cartel && oferta && (
        <div role="dialog" aria-modal="true" aria-label={oferta.titulo} className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <CartelDeSalida
            c={{
              titulo: oferta.titulo, texto: oferta.texto, boton: oferta.boton, vence: cartel.vence,
              imagen: oferta.tipo === "DESCUENTO" ? oferta.imagen : oferta.producto.imagen,
              oferta: oferta.tipo === "DESCUENTO"
                ? { tipo: "DESCUENTO", nombre: oferta.nombre, antes: cuenta.sinCupon, despues: cuenta.sinCupon - descuentoDe({ tipo: "PORCENTAJE", valor: oferta.porcentaje }, cuenta.sinCupon), porcentaje: oferta.porcentaje }
                : { tipo: "PRODUCTO", nombre: oferta.producto.nombre, precio: oferta.producto.precio, descripcion: oferta.producto.descripcion },
            }}
            tarjeta={p.tarjeta}
            botonRedondo={p.botonRedondo}
            onAceptar={aceptarOferta}
            onCerrar={cerrarCartel}
            yendo={cuponMirando}
            error={ofertaError}
            href={oferta.tipo === "PRODUCTO" ? oferta.producto.href : undefined}
          />
        </div>
      )}
    </div>
  );
}

function Sello({ icono, children }: { icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px] text-[color:var(--pv-tenue)]">
      <span className="mt-0.5 shrink-0 opacity-80">{icono}</span>
      {children}
    </li>
  );
}

function Renglon({ nombre, valor }: { nombre: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-[color:var(--pv-linea)] py-2.5 text-[13.5px] last:border-b-0">
      <span className="min-w-0 text-[color:var(--pv-tinta)]">{nombre}</span>
      <span className="whitespace-nowrap font-semibold tabular-nums text-[color:var(--pv-tinta)]">{valor}</span>
    </div>
  );
}
