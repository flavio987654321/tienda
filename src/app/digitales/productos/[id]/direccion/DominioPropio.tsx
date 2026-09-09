"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Loader2, Check, AlertTriangle, Globe, Lock, Copy, RefreshCw, Clock, ArrowRight,
} from "lucide-react";
import { validarDominio, normalizarDominio, LARGO_DOMINIO } from "@/lib/configuracion-digital";
import CampoAuto from "@/components/CampoAuto";

/**
 * El dominio propio del producto: `mecanicafacil.com`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE ESTA PANTALLA TIENE QUE DECIR ANTES QUE NADA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Que **conectarlo no es instantáneo y no es culpa de nadie**. Entre que se
 * carga el registro en el proveedor del dominio y que la página abre pasan
 * minutos, a veces horas: es el DNS propagándose por todo internet. Sin decirlo,
 * la persona carga el registro, entra al dominio, ve un error y da por hecho que
 * lo hizo mal — y lo vuelve a hacer, y lo rompe.
 *
 * Y que **la dirección de tiendaapps.com sigue andando igual**. El dominio se
 * suma, no reemplaza. Alguien que ya repartió links contra el subdominio tiene
 * que poder conectar un dominio sin miedo a perderlos.
 *
 * ── Por qué el estado se pide y no se adivina ──────────────────────────────
 *
 * Porque el DNS puede estar perfecto y la página igual no abrir: falta que se
 * emita el certificado, o falta verificar la propiedad. El único que sabe es
 * Vercel, así que se le pregunta a él. Decirle "listo" a alguien cuya página no
 * abre es peor que no decir nada.
 *
 * ⚠️ Y se le pregunta DESDE EL NAVEGADOR, no al dibujar la página. Preguntarle a
 * Vercel son dos llamadas de hasta diez segundos cada una: metidas en el render
 * dejarían la pantalla entera en blanco esperando algo que es un detalle de un
 * recuadro. Acá llega el dominio de nuestra base —que es instantáneo— y el
 * estado se completa apenas contesta.
 */

type Mirado = {
  andando: boolean;
  instruccion: { tipo: string; nombre: string; valor: string } | null;
  verificacion: { tipo: string; nombre: string; valor: string } | null;
  pudimosMirar: boolean;
};

function leerRespuesta(datos: Record<string, unknown> | null): Mirado {
  return {
    andando: datos?.andando === true,
    instruccion: (datos?.instruccion as Mirado["instruccion"]) ?? null,
    verificacion: (datos?.verificacion as Mirado["verificacion"]) ?? null,
    pudimosMirar: datos?.pudimosMirar !== false,
  };
}

export default function DominioPropio({
  productoId,
  esPro,
  dominioActual,
}: {
  productoId: string;
  esPro: boolean;
  dominioActual: string | null;
}) {
  const [dominio, setDominio] = useState<string | null>(dominioActual);
  /* `null` es "todavía no preguntamos", que NO es lo mismo que "no pudimos".
     Uno se dibuja como un cartel girando y el otro como un aviso. */
  const [mirado, setMirado] = useState<Mirado | null>(null);
  const [valor, setValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<null | "conectando" | "mirando" | "soltando">(null);
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  /* El doble clic: `trabajando` es estado y el estado se ve recién en el
     siguiente dibujo, así que dos clics en el mismo cuadro lo leen los dos en
     null. El ref cambia en el acto. Y acá cada clic de más es un alta contra la
     API de Vercel, que tiene su propio tope por hora para todo el equipo. */
  const enVuelo = useRef(false);

  const limpio = normalizarDominio(valor);
  /* Se valida mientras escribe, pero el cartel rojo aparece recién cuando hay
     algo escrito de verdad: retar por un campo vacío es retar por no empezar. */
  const problema = valor.trim().length > 0 ? validarDominio(valor) : null;

  /* Al entrar, si ya hay un dominio puesto se pregunta cómo va. */
  useEffect(() => {
    if (!esPro || !dominio || mirado) return;
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/digitales/productos/${productoId}/dominio`);
        const datos = await res.json().catch(() => null);
        if (!vivo) return;
        setMirado(res.ok ? leerRespuesta(datos) : { andando: false, instruccion: null, verificacion: null, pudimosMirar: false });
      } catch {
        if (vivo) setMirado({ andando: false, instruccion: null, verificacion: null, pudimosMirar: false });
      }
    })();
    return () => { vivo = false; };
  }, [esPro, dominio, mirado, productoId]);

  async function pedir(metodo: "POST" | "DELETE") {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(metodo === "POST" ? "conectando" : "soltando");
    setError(null);

    try {
      const res = await fetch(`/api/digitales/productos/${productoId}/dominio`, {
        method: metodo,
        ...(metodo === "POST"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dominio: limpio }) }
          : {}),
      });
      const datos = await res.json().catch(() => null);

      if (!res.ok) {
        setError(datos?.error ?? "No pudimos hacerlo. Probá de nuevo.");
        return;
      }

      if (metodo === "DELETE") {
        setDominio(null);
        setMirado(null);
        setConfirmando(false);
      } else {
        setDominio(datos?.dominio ?? null);
        setMirado(leerRespuesta(datos));
      }
      setValor("");
    } catch {
      setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      enVuelo.current = false;
      setTrabajando(null);
    }
  }

  async function volverAMirar() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando("mirando");
    setError(null);
    try {
      const res = await fetch(`/api/digitales/productos/${productoId}/dominio`);
      const datos = await res.json().catch(() => null);
      if (res.ok) setMirado(leerRespuesta(datos));
    } catch {
      /* Que no se pueda mirar no rompe nada: lo que hay dibujado sigue valiendo. */
    } finally {
      enVuelo.current = false;
      setTrabajando(null);
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(texto);
      setTimeout(() => setCopiado((c) => (c === texto ? null : c)), 1800);
    } catch {
      /* Sin permiso de portapapeles no se hace nada: el valor está a la vista y
         se puede seleccionar a mano. */
    }
  }

  /* ── Sin Pro ─────────────────────────────────────────────────────────────
     Se dibuja el hueco, no se esconde: el hueco dice algo que el botón solo no
     dice — que la dirección tiene dos escalones, y cuál es el de arriba. */
  if (!esPro) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 px-4 py-4">
        <p className="flex items-center gap-2 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300">
          <Lock className="h-3.5 w-3.5 text-gray-400" />
          Tu propio dominio
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Conectar un dominio tuyo —<strong>mecanicafacil.com</strong>— viene con el plan Pro. La
          dirección de arriba sigue funcionando igual: el dominio se suma, no la reemplaza.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Sirve sobre todo si pautás: un dominio tuyo lo podés verificar en tu Business Manager de
          Meta, y uno nuestro no.
        </p>
        <Link
          href="/digitales/mi-cuenta"
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-orange-600 hover:text-orange-500"
        >
          Ver el plan Pro <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  /* ── Con Pro y con dominio puesto ────────────────────────────────────────── */
  if (dominio) {
    return (
      <div className="mt-8 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-4">
        <p className="flex items-center gap-2 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300">
          <Globe className="h-3.5 w-3.5 text-gray-400" />
          Tu propio dominio
        </p>

        {/* `break-all`: un dominio largo en 360 empujaba la pantalla. */}
        <p className="mt-2 text-[15px] font-bold text-gray-900 panel-oscuro:text-gray-100 break-all">
          {dominio}
        </p>

        {!mirado && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-gray-500 panel-oscuro:text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fijándonos cómo va…
          </p>
        )}

        {mirado?.andando && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Andando
          </p>
        )}

        {mirado && !mirado.andando && (
          <div className="mt-3 rounded-xl border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-3">
            <p className="flex items-start gap-2 text-[12.5px] font-bold text-amber-900 panel-oscuro:text-amber-200">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {mirado.pudimosMirar
                ? "Falta cargar esto en tu proveedor de dominios"
                : "No pudimos consultarlo ahora. Probá con “Volver a chequear”."}
            </p>

            {mirado.pudimosMirar && mirado.instruccion && (
              <>
                <p className="mt-1.5 text-[12px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200/90">
                  Entrá donde compraste el dominio, buscá la parte de <strong>DNS</strong> y agregá
                  este registro:
                </p>

                <Renglon etiqueta="Tipo" valor={mirado.instruccion.tipo} copiar={copiar} copiado={copiado} />
                <Renglon etiqueta="Nombre" valor={mirado.instruccion.nombre} copiar={copiar} copiado={copiado} />
                <Renglon etiqueta="Apunta a" valor={mirado.instruccion.valor} copiar={copiar} copiado={copiado} />

                {mirado.verificacion && (
                  <>
                    <p className="mt-3 text-[12px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200/90">
                      Y este otro, para confirmar que el dominio es tuyo:
                    </p>
                    <Renglon etiqueta="Tipo" valor={mirado.verificacion.tipo} copiar={copiar} copiado={copiado} />
                    <Renglon etiqueta="Nombre" valor={mirado.verificacion.nombre} copiar={copiar} copiado={copiado} />
                    <Renglon etiqueta="Valor" valor={mirado.verificacion.valor} copiar={copiar} copiado={copiado} />
                  </>
                )}

                {/* ⚠️ Esto es lo que evita que lo vuelva a hacer y lo rompa. */}
                <p className="mt-3 text-[11.5px] leading-relaxed text-amber-800 panel-oscuro:text-amber-300/80">
                  Después de cargarlo puede tardar un rato largo en andar —a veces unas horas—. Es
                  normal y no lo apura nadie: es el cambio dando la vuelta por internet. No hace
                  falta que lo cargues de nuevo.
                </p>
              </>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-1.5 text-[12px] font-bold text-red-600">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={volverAMirar}
            disabled={trabajando !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {trabajando === "mirando"
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Volver a chequear
          </button>

          {confirmando ? (
            <>
              <button
                onClick={() => pedir("DELETE")}
                disabled={trabajando !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {trabajando === "soltando" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Sí, desconectarlo
              </button>
              <button
                onClick={() => setConfirmando(false)}
                disabled={trabajando !== null}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[13px] font-bold text-gray-500 panel-oscuro:text-gray-400 hover:text-gray-700 panel-oscuro:hover:text-gray-200 disabled:opacity-50"
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmando(true)}
              disabled={trabajando !== null}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-[13px] font-bold text-gray-500 panel-oscuro:text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Desconectar
            </button>
          )}
        </div>

        {/* ⚠️ Se pregunta antes de soltar, y se dice qué pasa. Desconectar deja
            de servir la página en ese dominio: los anuncios que apunten ahí caen
            en la nada. La dirección de tiendaapps sigue andando y por eso se
            nombra — es la red que queda abajo. */}
        {confirmando && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
            Al desconectarlo, <strong className="break-all">{dominio}</strong>{" "}
            <strong>deja de abrir tu página</strong> y los anuncios que apunten ahí dejan de llegar.
            Tu dirección de arriba sigue funcionando igual, y el dominio te queda libre para usarlo
            donde quieras.
          </p>
        )}
      </div>
    );
  }

  /* ── Con Pro y sin dominio ───────────────────────────────────────────────── */
  return (
    <div className="mt-8 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-4">
      <p className="flex items-center gap-2 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300">
        <Globe className="h-3.5 w-3.5 text-gray-400" />
        Tu propio dominio
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
        Si tenés un dominio comprado —<strong>mecanicafacil.com</strong>— podés apuntarlo a este
        producto. La dirección de arriba sigue funcionando igual: el dominio se suma, no la
        reemplaza.
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
        El dominio lo comprás vos donde quieras. Nosotros no lo vendemos ni lo cobramos.
      </p>

      {/* ⚠️ SIN ETIQUETA NO TENÍA NOMBRE. Arriba hay párrafos que explican el
          dominio, pero un párrafo no nombra a un campo: un lector de pantalla
          anunciaba "campo de texto" a secas, y tocar el texto no lo enfocaba. */}
      <label
        htmlFor="dominio-propio"
        className="mt-3 block text-[12.5px] font-bold text-gray-700 panel-oscuro:text-gray-300"
      >
        Tu dominio
      </label>

      {/* ⚠️ `CampoAuto` y no un `<input>`: éste acepta 253 caracteres —el largo
          máximo de un dominio— en un solo renglón, así que era el que peor se
          corría hacia la derecha de todo el panel. Un input no puede pasar a
          renglón nuevo; esto crece hacia abajo y sigue siendo un valor de una
          línea. */}
      <CampoAuto
        id="dominio-propio"
        value={valor}
        onChange={(v) => setValor(v.slice(0, LARGO_DOMINIO))}
        maxLength={LARGO_DOMINIO}
        disabled={trabajando !== null}
        placeholder="mecanicafacil.com"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        estilo="rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 px-3.5 py-2.5 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 disabled:opacity-60"
        className="mt-1.5"
      />

      {/* Lo que se va a conectar de verdad. La gente pega `https://…/` de la
          barra del navegador y tiene que ver que eso se limpia solo. */}
      {limpio && limpio !== valor.trim() && !problema && (
        <p className="mt-1.5 text-[11.5px] text-gray-500 panel-oscuro:text-gray-400">
          Se va a conectar <strong className="break-all">{limpio}</strong>
        </p>
      )}

      {(problema || error) && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12px] font-bold text-red-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {problema ?? error}
        </p>
      )}

      <button
        onClick={() => pedir("POST")}
        disabled={trabajando !== null || problema !== null || limpio.length === 0}
        className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 panel-oscuro:bg-gray-100 px-5 py-3 text-sm font-bold text-white panel-oscuro:text-gray-900 hover:bg-gray-800 panel-oscuro:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {trabajando === "conectando" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
        {trabajando === "conectando" ? "Conectando…" : "Conectar el dominio"}
      </button>

      <p className="mt-2 text-[11.5px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
        Después de conectarlo te vamos a decir qué cargar en tu proveedor de dominios. No pasa nada
        si te equivocás: se puede desconectar cuando quieras.
      </p>
    </div>
  );
}

/** Un renglón del registro de DNS, con su botón de copiar. */
function Renglon({
  etiqueta, valor, copiar, copiado,
}: {
  etiqueta: string;
  valor: string;
  copiar: (t: string) => void;
  copiado: string | null;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/70 panel-oscuro:bg-gray-950/50 px-2.5 py-1.5">
      <span className="shrink-0 w-[68px] text-[11px] font-bold uppercase tracking-wide text-amber-700 panel-oscuro:text-amber-400">
        {etiqueta}
      </span>
      {/* `break-all` + `min-w-0`: un TXT de verificación es larguísimo y en 360
          se llevaba puesto el botón de copiar. */}
      <code className="min-w-0 flex-1 break-all text-[12px] font-mono text-gray-800 panel-oscuro:text-gray-200">
        {valor}
      </code>
      <button
        type="button"
        onClick={() => copiar(valor)}
        aria-label={`Copiar ${etiqueta}`}
        className="shrink-0 rounded-md p-1.5 text-amber-700 panel-oscuro:text-amber-400 hover:bg-amber-100 panel-oscuro:hover:bg-amber-500/20 transition-colors"
      >
        {copiado === valor ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
