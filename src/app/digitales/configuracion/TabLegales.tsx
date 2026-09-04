"use client";

import { Scale, AlertTriangle, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Seccion, BotonGuardar, Ayuda } from "./piezas";
import { MAX_LARGO_POLITICA } from "@/lib/politicas-tienda";

/** Las tres, en el orden en que alguien las escribe y en que se leen. */
export const DOCUMENTOS = [
  {
    clave: "devoluciones",
    titulo: "Devoluciones y reembolsos",
    bajada: "Lo primero que se mira cuando alguien duda antes de pagar.",
    ejemplo:
      "Si todavía no descargaste el archivo, podés arrepentirte dentro de los 10 días y te devuelvo el dinero completo. Escribime a mi correo con el número de tu compra.\n\n"
      + "Una vez descargado, por tratarse de un archivo digital de uso inmediato, no corresponde la devolución (art. 1116 inc. b del Código Civil y Comercial).\n\n"
      + "Si el archivo no abre, está incompleto o no es lo que describí, escribime y lo resolvemos: eso no es un arrepentimiento, es un problema mío.",
  },
  {
    clave: "terminos",
    titulo: "Términos y condiciones",
    bajada: "Qué estás vendiendo, qué se lleva quien compra y qué no.",
    ejemplo:
      "Qué comprás: un archivo digital descargable. No es un curso con clases en vivo ni incluye acompañamiento personalizado salvo que lo diga la página.\n\n"
      + "Uso personal: podés usar el material para vos. No podés revenderlo, regalarlo ni publicarlo.\n\n"
      + "Cómo lo recibís: el enlace de descarga llega por correo apenas se acredita el pago, y también queda a la vista en la pantalla de gracias.\n\n"
      + "Contacto: escribime a mi correo para cualquier reclamo. Respondo dentro de las 72 horas hábiles.",
  },
  {
    clave: "privacidad",
    titulo: "Política de privacidad",
    bajada: "Qué datos pedís, para qué, y qué hacés con ellos después.",
    ejemplo:
      "Qué datos guardo: tu correo y, si lo dejaste, tu nombre. Los necesito para mandarte el archivo y para poder contactarte por tu compra.\n\n"
      + "Para qué NO los uso: no te mando publicidad salvo que me lo pidas, no los vendo y no los comparto con nadie.\n\n"
      + "Cuánto los guardo: mientras los necesite para responder por tu compra.\n\n"
      + "Tus derechos: podés pedirme que te muestre, corrija o borre tus datos escribiéndome a mi correo (Ley 25.326).",
  },
] as const;

export type ClaveDoc = (typeof DOCUMENTOS)[number]["clave"];
export type Politica = { texto: string; visible: boolean };

type Props = {
  politicas: Record<ClaveDoc, Politica>;
  setPolitica: (clave: ClaveDoc, valor: Politica) => void;
  guardando: string | null;
  listo: string | null;
  guardar: (seccion: string, cuerpo: Record<string, unknown>) => void;
  /** Para ver cómo quedaron. `null` mientras no haya ningún producto cargado. */
  hrefLegales: string | null;
};

/**
 * La pestaña Legales: los documentos que publica QUIEN VENDE.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTA PANTALLA TENÍA QUE EXISTIR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 03/09/26 no existía, y el agujero no era que faltara una pantalla:
 * el pie de cada página de venta linkeaba a `/terminos` y `/privacidad`, o sea a
 * **los documentos de TiendaApps**. Quien compraba un ebook leía nuestros
 * términos creyendo que eran los de quien se lo vendía.
 *
 * Y eso contradice de frente lo que esos mismos términos dicen: "TiendaApps no
 * es parte de esa relación de consumo". En una denuncia gana lo que el comprador
 * vio, no lo que el contrato afirma.
 *
 * En tiendas nunca pasó: cada dueña escribe las suyas desde el primer día. Esto
 * es la misma función, con el mismo motor —las columnas viven en `Store` y una
 * cuenta digital ya tiene la suya—, y con una diferencia: son **tres y no
 * cuatro**. No hay envíos que declarar.
 *
 * ── Por qué hay ejemplos y no una plantilla que se guarda sola ──────────────
 *
 * Porque un documento legal que nadie leyó es peor que ninguno: se firma
 * prometiendo cosas que no se piensan cumplir. El ejemplo se ve, se puede
 * copiar de un toque, y hay que apretar Guardar — o sea que pasó por los ojos de
 * alguien. Es la misma línea que la plataforma ya sostiene con las tiendas: le
 * damos un borrador, no una firma.
 */
export default function TabLegales(p: Props) {
  const guardarUna = (clave: ClaveDoc) => {
    const v = p.politicas[clave];
    p.guardar(`legales-${clave}`, {
      politicas: { [clave]: v.texto, [`${clave}Visible`]: v.visible },
    });
  };

  return (
    <div className="space-y-5">
      {/* ⚠️ El aviso va PRIMERO y no se puede apagar: alguien que entra acá y ve
          tres campos vacíos no tiene forma de saber que hoy su página está
          mostrando documentos ajenos. */}
      <div className="rounded-2xl border border-amber-200 panel-oscuro:border-amber-500/30 bg-amber-50 panel-oscuro:bg-amber-500/10 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900 panel-oscuro:text-amber-200">
              Estos documentos son tuyos, no nuestros
            </p>
            <p className="text-sm text-amber-800 panel-oscuro:text-amber-300/90 mt-1 leading-relaxed">
              Quien te compra tiene derecho a saber con quién está tratando y bajo qué
              condiciones — y quien responde por esa venta sos vos, no TiendaApps.
              Mientras no escribas nada, tu página no muestra ninguno.
            </p>
            {p.hrefLegales && (
              <a
                href={p.hrefLegales}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-bold text-amber-900 panel-oscuro:text-amber-200 underline underline-offset-2"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ver cómo los ve quien compra
              </a>
            )}
          </div>
        </div>
      </div>

      {DOCUMENTOS.map(({ clave, titulo, bajada, ejemplo }) => {
        const v = p.politicas[clave];
        const vacia = v.texto.trim().length === 0;
        return (
          <Seccion key={clave} Icono={Scale} titulo={titulo} bajada={bajada}>
            <textarea
              value={v.texto}
              onChange={(e) => p.setPolitica(clave, { ...v, texto: e.target.value })}
              /* El mismo tope que corta el servidor. Puesto sólo allá, el campo
                 deja escribir de más y el texto se recorta sin avisar — a mitad
                 de una oración de un documento legal. */
              maxLength={MAX_LARGO_POLITICA}
              rows={9}
              placeholder="Escribilo con tus palabras. Abajo hay un ejemplo para arrancar."
              className="w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 px-3.5 py-3 text-sm text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 panel-oscuro:focus:ring-orange-500/20 resize-y leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
              <span className="text-[11px] text-gray-400 tabular-nums">
                {v.texto.length}/{MAX_LARGO_POLITICA}
              </span>
              {/* Un renglón que empieza con guión sale como lista en la página
                  pública. Se dice acá porque si no, nadie lo descubre. */}
              <span className="text-[11px] text-gray-400">
                Un renglón que arranca con “-” queda como viñeta.
              </span>
            </div>

            {vacia && (
              <div className="mt-3 rounded-xl border border-dashed border-gray-200 panel-oscuro:border-gray-700 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Un ejemplo para arrancar
                </p>
                <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                  {ejemplo}
                </p>
                <button
                  type="button"
                  onClick={() => p.setPolitica(clave, { ...v, texto: ejemplo })}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-600 panel-oscuro:text-gray-300 hover:border-orange-300 hover:text-orange-600 transition-colors"
                >
                  Copiarlo al campo
                </button>
                {/* ⚠️ Que quede claro que es un punto de partida. Un documento
                    legal copiado sin leer promete cosas que no se piensan
                    cumplir, y quien responde por esa promesa es quien vende. */}
                <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                  Es un borrador para editar, no un documento listo. Lo que quede escrito te
                  obliga a vos.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <BotonGuardar
                id={`legales-${clave}`}
                onClick={() => guardarUna(clave)}
                guardando={p.guardando}
                listo={p.listo}
              />
              {/* El interruptor. Sin texto no se dibuja: apagar algo que no
                  existe no significa nada, y el botón daría a entender que hay
                  un documento escondido. */}
              {!vacia && (
                <button
                  type="button"
                  onClick={() => p.setPolitica(clave, { ...v, visible: !v.visible })}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                    v.visible
                      ? "border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-300"
                      : "border-amber-300 bg-amber-50 panel-oscuro:bg-amber-500/10 text-amber-700 panel-oscuro:text-amber-300"
                  }`}
                >
                  {v.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {v.visible ? "Se ve en tu página" : "Oculta"}
                </button>
              )}
            </div>

            {!v.visible && !vacia && (
              <Ayuda>
                Está escrita pero no se muestra. Acordate de darle a Guardar después de
                cambiar el interruptor.
              </Ayuda>
            )}
          </Seccion>
        );
      })}

      {/* El botón de arrepentimiento no es un documento que se escribe: es un
          formulario, lo exige la Resolución 424/2020 y no se puede apagar. Se
          nombra acá para que nadie lo busque entre los tres de arriba. */}
      <div className="rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-5">
        <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
          El botón de arrepentimiento ya está puesto
        </p>
        <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-1 leading-relaxed">
          Lo exige la Resolución 424/2020 y no hay nada que escribir: es un formulario que
          aparece solo en tu página, junto a estos documentos. Cuando alguien lo usa, la
          solicitud te llega con un número de constancia.
        </p>
      </div>
    </div>
  );
}
