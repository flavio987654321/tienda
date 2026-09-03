"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Lock, ShieldCheck, Package, Check, AlertTriangle } from "lucide-react";

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
  botonRedondo: string;
  tarjeta: string;
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function CheckoutClient(p: Props) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [yendo, setYendo] = useState(false);
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

    const pagas = p.totalBase + sumaUpsells;
    const valorTotal = p.regular + valorBonos + regularUpsells;
    return { pagas, valorTotal, ahorro: valorTotal > pagas ? valorTotal - pagas : 0 };
  }, [elegidos, p]);

  const mailValido = /^[^@\s]+@[^@\s]+\.[^@.\s]+$/.test(email.trim());

  async function pagar() {
    if (enVuelo.current) return;
    if (!mailValido) {
      setError("Escribí un correo válido: es a donde te mandamos el archivo.");
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

      {!p.puedeCobrar && (
        <div className={`mb-6 flex gap-3 bg-[color:var(--pv-fuerte)] p-4 ${p.tarjeta}`}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--pv-tinta)]" />
          <p className="text-sm text-[color:var(--pv-tinta)]">
            Quien vende todavía no terminó de configurar los cobros, así que esta compra
            no se puede completar ahora. Volvé a intentar más tarde.
          </p>
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

          {error && (
            <p role="alert" className="mt-4 bg-[color:var(--pv-fuerte)] px-3 py-2 text-sm font-medium text-[color:var(--pv-tinta)]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={pagar}
            disabled={yendo || !p.puedeCobrar}
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

          <div className="mt-4 border-t-2 border-[color:var(--pv-linea)] pt-3">
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
