"use client";

import { BarChart3, LineChart, Info, MousePointerClick, HelpCircle } from "lucide-react";
import { Seccion, BotonGuardar, Etiqueta, Ayuda, CLASE_INPUT } from "./piezas";
import { LARGO_ID_MEDICION, extraerClarityId } from "@/lib/tracking-ids";

type Props = {
  pixel: string; setPixel: (v: string) => void;
  ga: string; setGa: (v: string) => void;
  clarity: string; setClarity: (v: string) => void;
  problemaClarity: string | null;
  guardando: string | null;
  listo: string | null;
  guardar: (seccion: string, cuerpo: Record<string, unknown>) => void;
  problemaPixel: string | null;
  problemaGa: string | null;
};

/**
 * La pestaña Meta / Tracking.
 *
 * ── Por qué SÍ se puede hacer hoy ────────────────────────────────────────────
 * Estuvo a punto de quedar apagada por un error mío: mezclé dos cosas que son
 * distintas.
 *
 *   1. **Elegir o crear un píxel desde nuestro panel**, hablándole a la API de
 *      Meta. Eso pide `ads_management`, un permiso que nunca se solicitó.
 *      Sigue trabado.
 *   2. **Pegar el ID de un píxel que ya tenés.** Eso no le pide nada a Meta: es
 *      un número que se escribe en un campo. Ya funciona en tiendas.
 *
 * Esta pantalla es la 2, así que no depende de ningún permiso. Lo que falta es
 * la comodidad, no la función.
 *
 * ── Lo que hay que mirar con cuidado ─────────────────────────────────────────
 * En el proyecto hay DOS píxeles de Meta: el de la plataforma y el de cada
 * vendedora. `fbq('track')` le pega a TODOS los que estén inicializados en la
 * página, así que si cargan juntos, el `Purchase` —con monto y mail hasheado del
 * comprador— entra a la cuenta de anuncios de TiendaApps. La separación es por
 * ruta (`RUTAS_EXCLUIDAS_PIXEL`), y `/tienda` ya está en esa lista.
 */
export default function TabMeta(p: Props) {
  return (
    <div className="space-y-5">
      <Seccion
        Icono={BarChart3}
        titulo="Píxel de Meta"
        bajada="Para medir tus ventas y volver a mostrarle tu producto a quien lo vio y no compró."
      >
        {/* El link de ayuda va ACÁ, pegado al campo, y no en una sección de
            ayuda aparte. Nadie sabe de memoria dónde está el ID del píxel, y la
            competencia lo resolvió igual: el momento en que se necesita la
            explicación es el momento en que se está mirando el campo vacío. */}
        <a
          href="/ayuda"
          className="inline-flex items-center gap-1.5 mb-3 text-xs font-bold text-orange-600 hover:text-orange-500 transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          ¿No sabés dónde encontrar tu ID?
        </a>

        <Etiqueta htmlFor="pixel" opcional>ID del píxel</Etiqueta>
        <input
          id="pixel"
          inputMode="numeric"
          value={p.pixel}
          maxLength={LARGO_ID_MEDICION}
          onChange={(e) => p.setPixel(e.target.value)}
          placeholder="1234567890123456"
          className={CLASE_INPUT}
        />
        <Ayuda>
          Son sólo números. Lo encontrás en el Administrador de eventos de Meta. Dejalo vacío si no
          usás anuncios.
        </Ayuda>
        {p.problemaPixel && (
          <p className="text-sm text-red-600 font-medium mt-2">{p.problemaPixel}</p>
        )}

        {/* Se dice de frente que hoy hay que traerlo de afuera, en vez de dejar
            que la persona busque un botón de "conectar" que no existe. */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 panel-oscuro:bg-gray-800/50 border border-gray-100 panel-oscuro:border-gray-800 px-4 py-3">
          <Info className="h-4 w-4 text-gray-400 panel-oscuro:text-gray-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 leading-relaxed">
            Por ahora el ID se pega a mano. Elegirlo o crearlo desde acá necesita un permiso de
            Meta que todavía no pedimos.
          </p>
        </div>
      </Seccion>

      <Seccion
        Icono={LineChart}
        titulo="Google Analytics"
        bajada="Para ver cuánta gente entra a tus páginas y de dónde viene."
      >
        <Etiqueta htmlFor="ga" opcional>ID de medición</Etiqueta>
        <input
          id="ga"
          value={p.ga}
          maxLength={LARGO_ID_MEDICION}
          onChange={(e) => p.setGa(e.target.value)}
          placeholder="G-XXXXXXXXXX"
          className={CLASE_INPUT}
        />
        <Ayuda>Empieza con “G-”. Está en Administrar → Flujos de datos, en tu cuenta de Analytics.</Ayuda>
        {p.problemaGa && <p className="text-sm text-red-600 font-medium mt-2">{p.problemaGa}</p>}
      </Seccion>

      {/* ── Microsoft Clarity ───────────────────────────────────────────────
          De las cuatro herramientas que tiene la competencia en esta pestaña,
          es la única que sumamos. Las otras dos —Utmify y UTMIFLOW— son
          servicios del ambiente de infoproductos brasileño; el texto de ayuda
          de ellos quedó en portugués, así que ni siquiera lo tradujeron.
          Clarity, en cambio, es gratis y sin límite, y para una página de venta
          ver a la persona bajar y dónde se planta vale más que cualquier
          número. */}
      <Seccion
        Icono={MousePointerClick}
        titulo="Microsoft Clarity"
        bajada="Grabaciones de pantalla y mapas de calor de tu página. Es gratis y sin límite."
      >
        <Etiqueta htmlFor="clarity" opcional>Project ID</Etiqueta>
        <input
          id="clarity"
          value={p.clarity}
          onChange={(e) => p.setClarity(e.target.value)}
          placeholder="Pegá el Project ID, o el script entero"
          className={CLASE_INPUT}
        />
        <Ayuda>
          Está en clarity.microsoft.com → Configuración → Instalación. Si pegás el script de
          instalación completo, sacamos el ID nosotros.
        </Ayuda>

        {/* Se muestra qué se va a guardar de verdad cuando pegaron el script:
            si no, la persona ve diez líneas en el campo y no sabe si entendimos. */}
        {p.clarity.trim() !== extraerClarityId(p.clarity) && p.problemaClarity === null && (
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1.5">
            Vamos a guardar:{" "}
            <span className="font-mono text-gray-700 panel-oscuro:text-gray-300">{extraerClarityId(p.clarity)}</span>
          </p>
        )}
        {p.problemaClarity && (
          <p className="text-sm text-red-600 font-medium mt-2">{p.problemaClarity}</p>
        )}
      </Seccion>

      <div className="flex justify-end">
        <BotonGuardar
          id="tracking"
          guardando={p.guardando}
          listo={p.listo}
          disabled={p.problemaPixel !== null || p.problemaGa !== null || p.problemaClarity !== null}
          onClick={() =>
            p.guardar("tracking", { pixelId: p.pixel, gaId: p.ga, clarityId: p.clarity })
          }
        />
      </div>
    </div>
  );
}
