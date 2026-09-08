"use client";

import {
  Store as Tienda, Sparkles, Moon, Bell, AlertTriangle, Image as ImageIcon,
  Trash2, Loader2,
} from "lucide-react";
import {
  Seccion, BotonGuardar, Etiqueta, Ayuda, NotaPendiente, CLASE_INPUT,
} from "./piezas";
import {
  LARGO_NOMBRE, LARGO_CHECKOUT, LARGO_EMAIL, LARGO_IA_PRODUCTO, LARGO_IA_DESCRIPCION,
  SLUG_MAXIMO,
} from "@/lib/configuracion-digital";
import { TEMAS, COPY_TEMA, type Tema } from "@/lib/tema-digitales";

/** El tope real de `/api/upload`: lo pone la plataforma, no nosotros. */
export const MAX_LOGO_MB = 4;

type Props = {
  // Datos
  nom: string; setNom: (v: string) => void;
  checkout: string; setCheckout: (v: string) => void;
  dir: string; setDir: (v: string) => void;
  mail: string; setMail: (v: string) => void;
  img: string | null; setImg: (v: string | null) => void;
  // Contexto de la IA
  iaProd: string; setIaProd: (v: string) => void;
  iaDesc: string; setIaDesc: (v: string) => void;
  // Apariencia
  tema: Tema; setTema: (t: Tema) => void;
  // Estado compartido
  guardando: string | null;
  listo: string | null;
  subiendo: boolean;
  guardar: (seccion: string, cuerpo: Record<string, unknown>) => void;
  subirLogo: (f: File) => void;
  // Contexto de lectura
  nombreOriginal: string;
  slugOriginal: string;
  dirLimpia: string;
  publicados: number;
  base: string;
  // Problemas, calculados con las mismas funciones que aplica el servidor
  problemaNombre: string | null;
  problemaCheckout: string | null;
  problemaDir: string | null;
  problemaMail: string | null;
  problemaIA: string | null;
};

/**
 * La pestaña General.
 *
 * El orden de las secciones es el que pidió Flavio y es el de la competencia,
 * menos Idioma: nosotros vendemos en Argentina, así que un selector con una sola
 * opción sería un campo puesto por estar.
 *
 * Las cuatro últimas se dibujan apagadas a propósito. Ver `EtiquetaPendiente`:
 * lo que no está dibujado se olvida, pero lo que parece que anda y no anda es
 * peor que no tenerlo.
 */
export default function TabGeneral(p: Props) {
  const dirCambia = p.dirLimpia !== p.slugOriginal && p.dirLimpia.length > 0;
  const checkoutEfectivo = p.checkout.trim() || p.nom.trim() || "tu marca";

  return (
    <div className="space-y-5">
      {/* ── 1. Datos de la tienda ──────────────────────────────────────────── */}
      <Seccion
        Icono={Tienda}
        titulo="Tus datos"
        bajada="El nombre y la dirección con la que te encuentra quien te compra."
      >
        {/* El logo. Va primero porque es lo primero que se ve de una marca. */}
        <div className="flex items-start gap-4 mb-5">
          {p.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.img}
              alt=""
              className="w-20 h-20 shrink-0 rounded-2xl object-cover border border-gray-200 panel-oscuro:border-gray-700"
            />
          ) : (
            <div className="w-20 h-20 shrink-0 rounded-2xl bg-gray-100 panel-oscuro:bg-gray-800 border border-dashed border-gray-300 panel-oscuro:border-gray-600 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-gray-400 panel-oscuro:text-gray-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400">Logo</p>
            <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">Hasta {MAX_LOGO_MB} MB.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* ⚠️ `relative` no es de adorno: `sr-only` incluye
                  `position: absolute`, y sin un ancestro posicionado el input se
                  cuelga del DOCUMENTO, le agrega sobrante para scrollear y al
                  enfocarlo el navegador mueve la página entera. Ver el porqué
                  largo en el label del PDF de `ProductosClient`. */}
              <label className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 panel-oscuro:focus-within:ring-offset-gray-900">
                {p.subiendo
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <ImageIcon className="h-3.5 w-3.5" />}
                {p.subiendo ? "Subiendo..." : p.img ? "Cambiar" : "Subir logo"}
                {/* ⚠️ `sr-only` y NO `hidden`. `hidden` es `display:none`, y un
                    elemento así no recibe foco; el `<label>` que lo envuelve
                    tampoco está en el orden de tabulación. Con `hidden` este
                    botón era inalcanzable con el teclado. El anillo lo dibuja el
                    label con `focus-within`, porque el foco queda en el input
                    invisible. Mismo arreglo que en la pantalla de Productos,
                    08/09/26. */}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={p.subiendo}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    // Se limpia para que elegir el MISMO archivo dos veces
                    // seguidas vuelva a disparar el cambio.
                    e.target.value = "";
                    if (f) p.subirLogo(f);
                  }}
                />
              </label>
              {p.img && (
                <button
                  onClick={() => p.setImg(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 panel-oscuro:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Sacar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <Etiqueta htmlFor="nombre">Nombre</Etiqueta>
          <input
            id="nombre"
            value={p.nom}
            maxLength={LARGO_NOMBRE}
            onChange={(e) => p.setNom(e.target.value)}
            placeholder="Mis guías de mecánica"
            className={CLASE_INPUT}
          />
          <Ayuda>Se muestra en tu página de venta y en los mails que recibe quien te compra.</Ayuda>
          {p.problemaNombre && (
            <p className="text-sm text-red-600 font-medium mt-2">{p.problemaNombre}</p>
          )}
        </div>

        {/* ── Nombre en el checkout ─────────────────────────────────────────
            Separado del de la marca a propósito: es lo que la persona ve
            mientras paga y en el resumen de su tarjeta, donde la pregunta es
            "¿esto es lo que compré?" y la respuesta tiene que entrar de un
            vistazo. Vacío quiere decir "usá el de la marca", y por eso se
            muestra siempre cuál va a quedar: un campo vacío no dice nada. */}
        <div className="mb-4">
          <Etiqueta htmlFor="checkout" opcional>Nombre en el checkout</Etiqueta>
          <input
            id="checkout"
            value={p.checkout}
            maxLength={LARGO_CHECKOUT}
            onChange={(e) => p.setCheckout(e.target.value)}
            placeholder={p.nombreOriginal || "Mis guías"}
            className={CLASE_INPUT}
          />
          <Ayuda>
            Es el nombre que ve quien te compra mientras paga y en la página de descarga. No cambia
            los mails ni tu página de venta. Va a decir{" "}
            <span className="font-semibold text-gray-700 panel-oscuro:text-gray-300 break-words">{checkoutEfectivo}</span>.
          </Ayuda>
          {p.problemaCheckout && (
            <p className="text-sm text-red-600 font-medium mt-2">{p.problemaCheckout}</p>
          )}
        </div>

        {/* ── La dirección ──────────────────────────────────────────────────
            La competencia lo tiene como subdominio, con el ".impultienda.ar"
            pegado a la derecha del campo. Lo nuestro es una ruta, así que el
            pedazo fijo va a la IZQUIERDA. Misma idea: que se vea de una qué
            parte elegís vos y qué parte no. */}
        <div className="mb-4">
          <Etiqueta htmlFor="dir">Dirección</Etiqueta>
          <div className="flex items-stretch rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 overflow-hidden focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
            <span className="shrink-0 hidden sm:flex items-center px-3 bg-gray-50 panel-oscuro:bg-gray-800/50 border-r border-gray-200 panel-oscuro:border-gray-700 text-xs font-mono text-gray-500 panel-oscuro:text-gray-400">
              {p.base.replace(/^https?:\/\//, "")}/tienda/
            </span>
            <input
              id="dir"
              value={p.dir}
              maxLength={SLUG_MAXIMO}
              onChange={(e) => p.setDir(e.target.value)}
              placeholder="mis-guias"
              className="flex-1 min-w-0 px-4 py-3 text-sm text-gray-900 panel-oscuro:text-gray-100 outline-none"
            />
          </div>
          {/* Se muestra cómo va a quedar de verdad: la dirección se normaliza al
              guardar —se le sacan acentos, mayúsculas y espacios— y sin esto la
              persona se entera después, cuando ya la mandó. */}
          <Ayuda>
            Tus páginas van a estar en{" "}
            <span className="font-mono text-gray-700 panel-oscuro:text-gray-300 break-all">
              {p.base.replace(/^https?:\/\//, "")}/tienda/{p.dirLimpia || "..."}
            </span>
          </Ayuda>
          {p.problemaDir && <p className="text-sm text-red-600 font-medium mt-2">{p.problemaDir}</p>}

          {/* ⚠️ Sólo si hay algo publicado Y la dirección cambia de verdad. Un
              cartel de peligro permanente se vuelve invisible. */}
          {dirCambia && p.publicados > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-100 panel-oscuro:border-amber-500/25 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 panel-oscuro:text-amber-200 font-medium leading-relaxed">
                Tenés {p.publicados} página{p.publicados === 1 ? "" : "s"} publicada
                {p.publicados === 1 ? "" : "s"}. Si cambiás la dirección, los links que ya
                compartiste dejan de funcionar.
              </p>
            </div>
          )}
        </div>

        {/* ── El mail de soporte ────────────────────────────────────────────
            Es el único lugar donde alguien que pagó y no recibió el archivo
            puede reclamar, así que la ayuda lo dice con esas palabras. */}
        <div className="mb-5">
          <Etiqueta htmlFor="mail" opcional>Mail de soporte</Etiqueta>
          <input
            id="mail"
            type="email"
            inputMode="email"
            value={p.mail}
            maxLength={LARGO_EMAIL}
            onChange={(e) => p.setMail(e.target.value)}
            placeholder="hola@misguias.com"
            className={CLASE_INPUT}
          />
          <Ayuda>
            Aparece en el mail de entrega. Es a donde te escribe quien te compró si el archivo no
            le llegó.
          </Ayuda>
          {p.problemaMail && (
            <p className="text-sm text-red-600 font-medium mt-2">{p.problemaMail}</p>
          )}
        </div>

        <div className="flex justify-end">
          <BotonGuardar
            id="datos"
            guardando={p.guardando}
            listo={p.listo}
            disabled={
              p.nom.trim().length < 2 ||
              p.problemaNombre !== null ||
              p.problemaCheckout !== null ||
              p.problemaDir !== null ||
              p.problemaMail !== null
            }
            onClick={() =>
              p.guardar("datos", {
                nombre: p.nom,
                logo: p.img,
                checkoutName: p.checkout,
                supportEmail: p.mail,
                // La dirección sólo viaja si cambió: mandarla igual haría que el
                // servidor la comprobara contra las demás tiendas en cada
                // guardado del nombre, sin necesidad.
                ...(dirCambia ? { slug: p.dir } : {}),
              })
            }
          />
        </div>
      </Seccion>

      {/* ── 2. Contexto para la IA ─────────────────────────────────────────── */}
      <Seccion
        Icono={Sparkles}
        titulo="Contexto para la IA"
        bajada="Qué vendés. Es lo que la IA usa como referencia para todo lo que te genere."
      >
        {/* La caja que explica para qué sirve. Va arriba de los campos porque
            sin ella son dos cuadritos de texto más, y en realidad son la pieza
            de la que dependen el ebook, los bonos, los upsells y los textos de
            venta. */}
        <div className="rounded-2xl bg-gray-50 panel-oscuro:bg-gray-800/50 border border-gray-100 panel-oscuro:border-gray-800 px-4 py-3.5 mb-4">
          <p className="text-xs text-gray-600 panel-oscuro:text-gray-400 leading-relaxed">
            Estos dos textos son <span className="font-bold text-gray-900 panel-oscuro:text-gray-100">tu nicho</span>: la IA
            los usa como referencia de todo lo que genera — el ebook, los bonos, los upsells y los
            textos de venta. Si cambiás de tema, actualizalos acá; si no, lo próximo que generes va
            a salir con el tema anterior.
          </p>
        </div>

        <div className="mb-4">
          <Etiqueta htmlFor="iaprod">Producto principal</Etiqueta>
          <input
            id="iaprod"
            value={p.iaProd}
            maxLength={LARGO_IA_PRODUCTO}
            onChange={(e) => p.setIaProd(e.target.value)}
            placeholder="Mecánica del automotor — Guía práctica para entender y cuidar tu vehículo"
            className={CLASE_INPUT}
          />
          <Ayuda>Qué vendés hoy. La IA entiende cualquier palabra ambigua dentro de este tema.</Ayuda>
        </div>

        <div className="mb-5">
          <Etiqueta htmlFor="iadesc">Descripción corta</Etiqueta>
          <textarea
            id="iadesc"
            value={p.iaDesc}
            maxLength={LARGO_IA_DESCRIPCION}
            rows={4}
            onChange={(e) => p.setIaDesc(e.target.value)}
            placeholder="Una guía clara y práctica para principiantes: motor, frenos, combustible y eléctrico."
            className={`${CLASE_INPUT} resize-y`}
          />
          <Ayuda>
            Una o dos frases. {p.iaDesc.length.toLocaleString("es-AR")} /{" "}
            {LARGO_IA_DESCRIPCION.toLocaleString("es-AR")}
          </Ayuda>
          {p.problemaIA && <p className="text-sm text-red-600 font-medium mt-2">{p.problemaIA}</p>}
        </div>

        <div className="flex justify-end">
          <BotonGuardar
            id="ia"
            guardando={p.guardando}
            listo={p.listo}
            disabled={p.problemaIA !== null}
            onClick={() =>
              p.guardar("ia", { iaProducto: p.iaProd, iaDescripcion: p.iaDesc })
            }
          />
        </div>
      </Seccion>

      {/* ── 3. Apariencia ──────────────────────────────────────────────────── */}
      {/* Zona horaria salía acá y se sacó: vendemos en Argentina, así que era un
          selector con una sola respuesta posible. El corte del día de las
          estadísticas queda fijo en Buenos Aires. */}
      <Seccion
        Icono={Moon}
        titulo="Apariencia"
        bajada="Elegí cómo se ve tu panel. Se guarda en este aparato."
      >
        <div className="grid grid-cols-3 gap-2">
          {TEMAS.map((t) => {
            const activo = p.tema === t;
            return (
              <button
                key={t}
                onClick={() => p.setTema(t)}
                /* `px-2` y `text-[11px]`: a 360 px cada botón tiene unos 90, y
                   con el padding de antes "Automático" se partía al medio
                   ("Automátic / o"). Una palabra cortada se lee como que la
                   pantalla se rompió. */
                className={`px-2 py-3 rounded-xl border text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
                  activo
                    ? "border-orange-400 bg-orange-50 panel-oscuro:bg-orange-500/10 text-orange-700 panel-oscuro:text-orange-300 panel-oscuro:bg-orange-500/15 panel-oscuro:border-orange-500/40 panel-oscuro:text-orange-300"
                    : "border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-400 hover:border-gray-300 panel-oscuro:hover:border-gray-600 panel-oscuro:border-gray-700 panel-oscuro:text-gray-400 panel-oscuro:hover:border-gray-600"
                }`}
              >
                {COPY_TEMA[t]}
              </button>
            );
          })}
        </div>
        <Ayuda>
          Con <span className="font-semibold">Automático</span> seguimos lo que tenga configurado tu
          teléfono o tu computadora.
        </Ayuda>
      </Seccion>

      {/* ── 4. App y notificaciones ────────────────────────────────────────── */}
      <Seccion
        apagada
        Icono={Bell}
        titulo="App y avisos de ventas"
        bajada="Instalá el panel como app y recibí un aviso apenas se concreta una venta."
      >
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-bold text-gray-400 panel-oscuro:text-gray-500"
        >
          <Bell className="h-4 w-4" /> Activar avisos
        </button>
        <NotaPendiente>
          El panel ya se instala como app, pero a una cuenta digital todavía no le llega ningún
          aviso. Pedirte permiso ahora sería prometerte algo que no va a pasar: se prende cuando
          haya una venta que avisar.
        </NotaPendiente>
      </Seccion>

      {/* ── 5. Zona de peligro ─────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-red-200 panel-oscuro:border-red-500/30 bg-white panel-oscuro:bg-gray-900 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-red-600">Zona de peligro</h2>
            <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed">
              Cerrar tu cuenta y borrar todo lo que cargaste.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 min-w-0">
            Se borran tus productos, tus archivos y tu configuración.
          </p>
          <button
            disabled
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 panel-oscuro:border-red-500/30 text-sm font-bold text-red-300 cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" /> Cerrar mi cuenta
          </button>
        </div>

        {/* ⚠️ Esta es la que MENOS se puede apurar. De la cuenta cuelgan pedidos
            y permisos de descarga de gente que ya pagó: un borrado hecho de
            cualquier manera le saca a esa gente el acceso a lo que compró, y eso
            no se puede deshacer ni explicar. */}
        <NotaPendiente>
          Falta decidir qué pasa con lo que ya se vendió. De tu cuenta cuelgan pedidos y permisos de
          descarga de gente que te pagó: si se borra todo de una, esas personas pierden el acceso a
          lo que compraron. Se prende cuando esté resuelto.
        </NotaPendiente>
      </section>
    </div>
  );
}
