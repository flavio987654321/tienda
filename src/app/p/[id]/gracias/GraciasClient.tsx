"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Download, CheckCircle2, Mail, AlertTriangle, Clock } from "lucide-react";
import { textoQueAcepto } from "@/lib/consentimiento-digital";
import { marcarCompraEnElNavegador } from "@/lib/medicion-digital";
import { precioDelUpsell, venceEnDelTokenDeUpsell, type OfertaDeUpsellEnPantalla } from "@/lib/oferta-upsell";
import { cuentaRegresiva } from "@/lib/oferta-salida";
import { useAhora } from "@/lib/reloj-compartido";

/**
 * Lo que se ve después de pagar: la espera, los archivos y una última oferta.
 *
 * ── La espera no es un adorno ───────────────────────────────────────────────
 *
 * Mercado Pago devuelve acá apenas aprueba, y los permisos de descarga los emite
 * el aviso de pago, que llega unos segundos después por otro camino. Así que
 * esta pantalla casi siempre arranca sin nada para mostrar. Preguntar el estado
 * cada dos segundos es lo que hace que los botones aparezcan solos, en vez de
 * pedirle a alguien que acaba de pagar que recargue a mano.
 *
 * ── Por qué los archivos son BOTONES y no descargas automáticas ─────────────
 *
 * Porque abrir la dirección de descarga **gasta una de las cinco**. Si la
 * pantalla las disparara sola al cargar, una recarga costaría una descarga de
 * cada archivo. Se baja lo que se toca.
 */

type Archivo = {
  nombre: string; producto: string; esBono: boolean;
  token: string; usadas: number; tope: number; vence: string;
};
type Upsell = {
  id: string; nombre: string; descripcion: string | null;
  precio: number; regular: number | null; imagen: string | null;
};
type Estado = "esperando" | "listo" | "cancelado" | "desconocido" | "demorado";

type Props = {
  productoId: string;
  nombre: string;
  ordenId: string | null;
  diasDelEnlace: number;
  maxDescargas: number;
  vendedor: string | null;
  diasDeGarantia: number | null;
  botonRedondo: string;
  tarjeta: string;
  upsells: Upsell[];
  /**
   * El reloj del upsell, que ARRANCÓ EN EL CHECKOUT y sigue corriendo acá.
   * Esta pantalla nunca firma uno nuevo: si la persona ya lo perdió, el
   * extra sale su precio de lista, igual que allá. Ver `lib/oferta-upsell`.
   */
  ofertaUpsell: OfertaDeUpsellEnPantalla | null;
};

const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/* Cada cuánto se pregunta, y hasta cuándo. Dos segundos es rápido sin ser una
   ametralladora, y dos minutos alcanza de sobra: el aviso de Mercado Pago suele
   llegar en menos de diez segundos. Pasado ese rato se deja de preguntar y se
   explica qué hacer, en vez de girar para siempre. */
const CADA_MS = 2000;
const HASTA_MS = 120_000;

export default function GraciasClient(p: Props) {
  const [estado, setEstado] = useState<Estado>(p.ordenId ? "esperando" : "desconocido");
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [yendo, setYendo] = useState<string | null>(null);
  const [errorUpsell, setErrorUpsell] = useState("");
  const enVuelo = useRef(false);

  /* ── El reloj del upsell ──────────────────────────────────────────────
     El mismo plazo del checkout, leído del token que el servidor ya
     verificó. Acá NO se guarda nada: esta pantalla continúa un reloj, no
     lo arranca (ver el comentario en `gracias/page.tsx`).

     `upsellRechazado` late igual que en el checkout: si el plazo se termina
     justo entre apretar "Agregarlo" y que el servidor lea el pedido, se
     acomoda el precio en pantalla en vez de cobrar de más a escondidas. */
  const [upsellRechazado, setUpsellRechazado] = useState(false);
  const ofertaUpsell = p.ofertaUpsell;
  const tokenDeUpsell = ofertaUpsell?.estado === "viva" ? ofertaUpsell.token : null;
  const upsellVenceEn = tokenDeUpsell ? venceEnDelTokenDeUpsell(tokenDeUpsell) : null;
  const ahoraUpsell = useAhora(upsellVenceEn);
  const hayOfertaDeUpsell = ofertaUpsell !== null;
  const upsellVivo =
    ofertaUpsell?.estado === "viva" && !upsellRechazado && upsellVenceEn !== null &&
    (ahoraUpsell === 0 || ahoraUpsell < upsellVenceEn);
  /** Lo que sale este extra ahora, con la MISMA función que usa la ruta al cobrar. */
  const precioAhora = (u: Upsell) =>
    precioDelUpsell({ price: u.precio, comparePrice: u.regular }, !hayOfertaDeUpsell || upsellVivo);

  useEffect(() => {
    if (!p.ordenId) return;
    let vivo = true;
    const arranque = Date.now();

    async function preguntar() {
      try {
        const r = await fetch(`/api/digitales/estado-compra/${p.ordenId}`);
        const d = await r.json().catch(() => ({}));
        if (!vivo) return;

        if (d.estado === "listo" && Array.isArray(d.archivos)) {
          setArchivos(d.archivos);
          setEstado("listo");
          /* La compra está confirmada: recién ahora se mide (Purchase en Meta,
             purchase en GA), una vez por orden en este navegador. */
          if (typeof d.total === "number") {
            marcarCompraEnElNavegador({ ordenId: p.ordenId!, productoId: p.productoId, total: d.total });
          }
          return; // se corta solo: ya no hay nada que esperar
        }
        if (d.estado === "cancelado" || d.estado === "desconocido") {
          setEstado(d.estado);
          return;
        }
        /* Sigue esperando. Si ya pasó el rato, se deja de preguntar: el mail va a
           llegar igual y girar en pantalla no lo acelera. */
        if (Date.now() - arranque > HASTA_MS) {
          setEstado("demorado");
          return;
        }
        setTimeout(preguntar, CADA_MS);
      } catch {
        /* Un error de red no corta la espera: puede ser un segundo sin señal. */
        if (vivo && Date.now() - arranque <= HASTA_MS) setTimeout(preguntar, CADA_MS);
        else if (vivo) setEstado("demorado");
      }
    }
    preguntar();
    return () => { vivo = false; };
  }, [p.ordenId, p.productoId]);

  async function sumar(upsellId: string) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setYendo(upsellId);
    setErrorUpsell("");
    try {
      const r = await fetch("/api/digitales/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* ⚠️ NO se manda el correo. Va el identificador de la compra que se acaba
           de pagar, y el servidor saca de ahí a quién pertenece. Es la diferencia
           entre "agregale esto a mi compra" y "agregale esto a la de cualquiera". */
        body: JSON.stringify({
          productoId: p.productoId,
          ordenPrevia: p.ordenId,
          upsells: [upsellId],
          /* La frase del art. 1116 está a la vista arriba del botón que se acaba
             de apretar, así que apretarlo ES la aceptación. Acá no hay casilla a
             propósito: una casilla más en la pantalla de después de pagar mata la
             oferta, y el valor legal es el mismo mientras la frase esté visible y
             no escondida atrás de un link. El texto que se guarda lo elige el
             servidor —el del agregado, no el del checkout—. */
          acepto: true,
          /* El plazo que arrancó en el checkout, para que el servidor cobre
             el precio que esta pantalla está mostrando. Sin él —o vencido—
             cobra el de lista, así que no mandarlo no abarata nada. */
          upsell: tokenDeUpsell ?? undefined,
          /* "Esta pantalla YA está mostrando el precio de después." Igual que
             en el checkout: el corte por reloj vencido sirve una vez, para
             que nadie pague más de lo que vio, y ninguna para trabar la
             compra. Sin esto el segundo intento chocaba para siempre. */
          upsellVencido: hayOfertaDeUpsell && !upsellVivo ? true : undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.initPoint) {
        setErrorUpsell(d.error ?? "No pudimos abrir el pago. Probá de nuevo.");
        if (d.upsellVencido) setUpsellRechazado(true);
        enVuelo.current = false;
        setYendo(null);
        return;
      }
      /* `assign` y no `replace` como en el checkout, ni `href =` — esa asignación
         la rechaza el compilador de React. Y `assign` a propósito: si vuelve con
         el botón atrás desde Mercado Pago, cae de nuevo acá y sus descargas
         siguen estando. En el checkout conviene lo contrario. */
      window.location.assign(d.initPoint);
    } catch {
      setErrorUpsell("No pudimos conectarnos. Probá de nuevo.");
      enVuelo.current = false;
      setYendo(null);
    }
  }


  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      {estado === "listo" ? (
        <Cabecera
          icono={<CheckCircle2 className="h-7 w-7 text-[color:var(--pv-ok)]" />}
          titulo="¡Listo! Ya es tuyo"
          bajada={`Bajalo acá abajo, y además te lo mandamos por mail para que lo tengas guardado.`}
        />
      ) : estado === "cancelado" ? (
        <Cabecera
          icono={<AlertTriangle className="h-7 w-7 text-[color:var(--pv-tinta)]" />}
          titulo="El pago no se completó"
          bajada="No se te cobró nada. Podés volver a intentarlo cuando quieras."
        />
      ) : estado === "demorado" ? (
        <Cabecera
          icono={<Mail className="h-7 w-7 text-[color:var(--pv-tinta)]" />}
          titulo="Estamos confirmando tu pago"
          bajada="Está tardando un poco más de lo normal. En cuanto se acredite te llega el archivo por mail — no hace falta que esperes acá."
        />
      ) : estado === "desconocido" ? (
        <Cabecera
          icono={<AlertTriangle className="h-7 w-7 text-[color:var(--pv-tinta)]" />}
          titulo="No encontramos esta compra"
          bajada="Si ya pagaste, revisá tu correo: el archivo llega ahí igual."
        />
      ) : (
        <Cabecera
          icono={<Loader2 className="h-7 w-7 animate-spin text-[color:var(--pv-acento)]" />}
          titulo="Confirmando tu pago…"
          bajada="Tarda unos segundos. No cierres esta pantalla."
        />
      )}

      {estado === "listo" && (
        <div className="mt-8 grid gap-3">
          {archivos.map((a) => (
            <div key={a.token} className={`flex flex-wrap items-center justify-between gap-3 border-2 border-[color:var(--pv-linea)] bg-[color:var(--pv-tarjeta)] p-4 ${p.tarjeta}`}>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[color:var(--pv-tinta)]">
                  {a.producto}
                  {a.esBono && (
                    <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider text-[color:var(--pv-ok)]">bono</span>
                  )}
                </p>
                <p className="mt-0.5 text-[12px] text-[color:var(--pv-tenue)]">
                  Te quedan {a.tope - a.usadas} de {a.tope} descargas
                </p>
              </div>
              {/* Un enlace, no un `fetch`: así el navegador lo trata como una
                  descarga de verdad y funciona igual en el celular. */}
              <a
                href={`/api/digitales/descargar/${a.token}`}
                className={`inline-flex shrink-0 items-center gap-2 bg-[color:var(--pv-acento)] px-5 py-3 text-sm font-bold text-[color:var(--pv-sobre)] transition hover:brightness-110 ${p.botonRedondo}`}
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
            </div>
          ))}

          <p className="mt-2 flex items-start gap-2 text-[12.5px] text-[color:var(--pv-tenue)]">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Tus enlaces valen {p.diasDelEnlace} días y {p.maxDescargas} descargas cada uno.
            Guardá el archivo apenas puedas.
          </p>
        </div>
      )}

      {/* ── La última oferta ──────────────────────────────────────────────
          Va DESPUÉS de los archivos, nunca antes. Primero se cumple lo que la
          persona pagó; recién ahí se le ofrece algo más. Al revés parece que el
          archivo está atrás de otra compra. */}
      {estado === "listo" && p.ordenId && p.upsells.length > 0 && (
        <div className="mt-10 border-t border-[color:var(--pv-linea)] pt-8">
          {/* El mismo reloj del checkout, continuado. `ahoraUpsell > 0` es
              "ya está en el navegador": en el servidor no hay reloj que leer
              y dibujar uno ahí rompe la hidratación. */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="shrink-0 text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--pv-tenue)]">
              Una cosa más, si te sirve
            </p>
            {upsellVivo && upsellVenceEn !== null && ahoraUpsell > 0 && ofertaUpsell?.estado === "viva" && (
              <p role="status" className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] font-bold text-[color:var(--pv-acento)]">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">{ofertaUpsell.texto}</span>
                <span className="shrink-0 tabular-nums">{cuentaRegresiva(upsellVenceEn, ahoraUpsell) ?? "0:00"}</span>
              </p>
            )}
          </div>
          {/* Se dice, no se esconde: el precio que ve acá puede no ser el que
              vio hace un minuto en la pantalla de pago. */}
          {hayOfertaDeUpsell && !upsellVivo && (
            <p role="status" className="mb-3 text-[12px] text-[color:var(--pv-tenue)]">
              La oferta se terminó: queda el precio de siempre.
            </p>
          )}
          {errorUpsell && (
            <p role="alert" className="mb-3 bg-[color:var(--pv-fuerte)] px-3 py-2 text-sm text-[color:var(--pv-tinta)]">
              {errorUpsell}
            </p>
          )}
          {p.upsells.map((u) => (
            <div key={u.id} className={`mb-3 border-2 border-[color:var(--pv-acento)] bg-[color:var(--pv-suave)] p-4 ${p.tarjeta}`}>
              {/* La tapa al lado del nombre, igual que en la pantalla de pago:
                  la misma oferta se tiene que ver igual en los dos lados. */}
              <div className="flex items-start gap-3">
                {u.imagen && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.imagen} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[color:var(--pv-tinta)]">{u.nombre}</p>
                  {u.descripcion && (
                    <p className="mt-1 text-[13px] text-[color:var(--pv-tenue)]">{u.descripcion}</p>
                  )}
                  {/* El tachado sale sólo si de verdad se está pagando menos: con
                      el reloj terminado, `sale` YA ES el precio de lista y
                      tacharlo al lado de sí mismo sería un descuento inventado. */}
                  <p className="mt-2 text-base font-extrabold text-[color:var(--pv-tinta)]">
                    {u.regular !== null && precioAhora(u) < u.regular && (
                      <s className="mr-2 text-sm font-normal opacity-55">{plata(u.regular)}</s>
                    )}
                    {plata(precioAhora(u))}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => sumar(u.id)}
                disabled={yendo !== null}
                className={`mt-3 flex w-full items-center justify-center gap-2 bg-[color:var(--pv-acento)] px-4 py-3 text-sm font-bold text-[color:var(--pv-sobre)] transition hover:brightness-110 disabled:opacity-50 ${p.botonRedondo}`}
              >
                {yendo === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {yendo === u.id ? "Abriendo el pago…" : "Agregarlo"}
              </button>
              {/* ⚠️ ARRIBA de nada y ABAJO del botón no da igual: tiene que estar
                  en la misma tarjeta y a la vista cuando se aprieta. Es lo que se
                  guarda como aceptado. */}
              <p className="mt-2 text-[11.5px] leading-relaxed text-[color:var(--pv-tenue)]">
                {textoQueAcepto(true, p.diasDeGarantia)}
              </p>
            </div>
          ))}
          {/* 🔲 Es un cobro nuevo, no un click. El "un click de verdad" necesita
              guardar la tarjeta (tokenización de Mercado Pago), que es una
              función aparte y bastante más delicada. Decidido el 03/09/26. */}
          <p className="text-[12px] text-[color:var(--pv-tenue)]">
            Es una compra aparte: te lleva a Mercado Pago de nuevo.
          </p>
        </div>
      )}

      <p className="mt-10 border-t border-[color:var(--pv-linea)] pt-4 text-center text-[11.5px] text-[color:var(--pv-tenue)]">
        ¿Algún problema con tu compra?{" "}
        {p.vendedor ? `Escribile a ${p.vendedor}.` : "Escribinos."}
      </p>
    </div>
  );
}

function Cabecera({ icono, titulo, bajada }: {
  icono: React.ReactNode; titulo: string; bajada: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--pv-suave)]">
        {icono}
      </div>
      <h1 className="text-balance text-2xl font-black text-[color:var(--pv-tinta)] sm:text-3xl">{titulo}</h1>
      <p className="mx-auto mt-2 max-w-md text-balance text-sm text-[color:var(--pv-tenue)]">{bajada}</p>
    </div>
  );
}
