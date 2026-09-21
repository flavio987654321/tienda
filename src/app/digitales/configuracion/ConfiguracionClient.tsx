"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, CreditCard, BarChart3, Globe, Scale, ArrowRight } from "lucide-react";
import type { TierDigital } from "@/lib/planes-digitales";
import {
  normalizarSlug, validarSlug, validarNombre, validarCheckoutName, validarEmail,
  validarContextoIA,
} from "@/lib/configuracion-digital";
import { validarGaId, validarPixelId, validarClarityId } from "@/lib/tracking-ids";
import { Seccion } from "./piezas";
import TabGeneral, { MAX_LOGO_MB } from "./TabGeneral";
import TabPagos from "./TabPagos";
import TabMeta from "./TabMeta";
import TabLegales, { type ClaveDoc, type Politica } from "./TabLegales";
import { aplicarTema, temaGuardado, type Tema } from "@/lib/tema-digitales";

type Props = {
  tier: TierDigital;
  nombre: string;
  checkoutName: string;
  slug: string;
  logo: string | null;
  supportEmail: string;
  /** Un mail a la cuenta por cada venta cobrada (Configuración → Avisos). */
  avisoMailVentas: boolean;
  pixelId: string;
  gaId: string;
  clarityId: string;
  iaProducto: string;
  iaDescripcion: string;
  cobroConectado: boolean;
  conectadoEl: string | null;
  publicados: number;
  base: string;
  politicas: Record<ClaveDoc, Politica>;
  hrefLegales: string | null;
  /** Cómo volvió de Mercado Pago. Lo lee el servidor de la URL. */
  avisoMp: "connected" | "error" | null;
  /**
   * Con qué solapa abrir, si vino pedida por la dirección (`?tab=pagos`).
   *
   * Lo usan los primeros pasos del inicio, que llevan derecho a Pagos: el
   * sentido de ese paso es dejar a la persona donde se hace la tarea, no en la
   * puerta de Configuración para que la busque. El servidor ya la comparó contra
   * la lista, así que acá no puede llegar una inventada.
   */
  abrirEn: "general" | "pagos" | "meta" | "legales" | null;
};

/**
 * Las pestañas, en el orden que pidió Flavio.
 *
 * Dominio no se configura acá: el dominio propio cuelga de cada producto
 * (`Product.dominioPropio`, desde el 04/09/26) y se conecta desde "Cambiar la
 * dirección" del producto. La pestaña queda para que quien lo busque acá lo
 * encuentre: dice dónde está y lleva. Hasta el 21/09/26 decía "viene después",
 * cuando ya existía hacía dos semanas.
 */
const PESTANAS = [
  { id: "general", label: "General", Icon: Settings, lista: true },
  { id: "pagos", label: "Pagos", Icon: CreditCard, lista: true },
  { id: "meta", label: "Meta / Tracking", Icon: BarChart3, lista: true },
  /* Legales va DESPUES de lo que hace falta para vender y ANTES de Dominio: no
     es lo primero que alguien viene a hacer, pero tiene que estar antes de la
     primera venta. */
  { id: "legales", label: "Legales", Icon: Scale, lista: true },
  { id: "dominio", label: "Dominio", Icon: Globe, lista: true },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

/**
 * Configuración.
 *
 * ── Por qué cada sección guarda lo suyo ──────────────────────────────────────
 * La competencia tiene un "Guardar cambios" arriba de todo Y un "Guardar
 * contexto" abajo, en la sección de la IA. Nadie puede saber cuál guarda qué.
 * Acá cada sección manda sólo sus campos y el servidor sólo escribe lo que vino,
 * así que además de entenderse, tocar el contexto no puede pisar el nombre con
 * un valor viejo que quedó cargado en otra pestaña.
 *
 * ── El cerrojo ──────────────────────────────────────────────────────────────
 * Uno solo para toda la pantalla, y es un ref y no estado: el estado se ve
 * recién en el dibujo siguiente, así que dos clics en el mismo cuadro leen los
 * dos el valor viejo y salen dos pedidos. Acá se nota sobre todo en la
 * dirección: el segundo pedido choca contra el primero y devuelve "ya está
 * usada", o sea que le rechazan la dirección que ella misma acaba de guardar.
 */
export default function ConfiguracionClient(p: Props) {
  /* Si volvés de Mercado Pago, la pantalla abre en Pagos: es donde está el
     cartel que dice cómo salió. Abrir en General obligaría a buscarlo. */
  /* El aviso de Mercado Pago gana: si la persona vuelve de conectar, lo primero
     que tiene que ver es cómo salió, aunque haya pedido otra solapa. */
  const [pestana, setPestana] = useState<Pestana>(p.avisoMp ? "pagos" : (p.abrirEn ?? "general"));

  const [nom, setNom] = useState(p.nombre);
  const [checkout, setCheckout] = useState(p.checkoutName);
  const [dir, setDir] = useState(p.slug);
  const [img, setImg] = useState<string | null>(p.logo);
  const [mail, setMail] = useState(p.supportEmail);
  const [mailPorVenta, setMailPorVenta] = useState(p.avisoMailVentas);
  const [iaProd, setIaProd] = useState(p.iaProducto);
  const [iaDesc, setIaDesc] = useState(p.iaDescripcion);
  const [pixel, setPixel] = useState(p.pixelId);
  const [ga, setGa] = useState(p.gaId);
  const [clarity, setClarity] = useState(p.clarityId);

  /* El tema vive en el navegador y no en la base: es una preferencia de ESTE
     aparato, igual que en la competencia. El script del layout ya lo pintó antes
     del primer dibujo; acá sólo se lee para saber qué botón marcar.
     Arranca en "auto" y se corrige apenas monta, porque en el servidor no existe
     `localStorage`: leerlo durante el primer dibujo daría una pantalla distinta
     a la que llegó del servidor. */
  const [tema, setTemaEstado] = useState<Tema>("auto");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage (sistema externo)
    setTemaEstado(temaGuardado());
  }, []);

  function setTema(t: Tema) {
    setTemaEstado(t);
    aplicarTema(t);
  }

  const [guardando, setGuardando] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pols, setPols] = useState(p.politicas);
  const [subiendo, setSubiendo] = useState(false);
  const enVuelo = useRef(false);

  /* El `?mp=` se saca de la barra de direcciones una vez leído: recargar no
     tiene por qué volver a felicitarte, y ese parámetro pegado es justo lo que
     la gente termina compartiendo.
     Sólo toca la historia del navegador y NO el estado: el cartel ya vino
     decidido del servidor, y un `setState` acá dispararía un segundo dibujo
     completo por algo que no cambió nada. */
  useEffect(() => {
    if (p.avisoMp) window.history.replaceState({}, "", window.location.pathname);
  }, [p.avisoMp]);

  /* Las MISMAS funciones que aplica el servidor. No lo reemplazan —lo que valida
     el navegador no protege nada— pero dicen qué está mal al lado del campo en
     vez de después del viaje.
     Los campos vacíos no se revisan: un formulario recién abierto no tiene por
     qué retarte por algo que todavía no tocaste. Lo que impide guardar de menos
     es el botón apagado, no un reto. */
  const problemaNombre = nom.trim() === "" ? null : validarNombre(nom);
  const problemaCheckout = validarCheckoutName(checkout);
  const problemaDir = dir.trim() === "" ? null : validarSlug(dir);
  const problemaMail = validarEmail(mail);
  const problemaIA = validarContextoIA({ producto: iaProd, descripcion: iaDesc });
  const problemaPixel = validarPixelId(pixel);
  const problemaGa = validarGaId(ga);
  const problemaClarity = validarClarityId(clarity);

  const dirLimpia = normalizarSlug(dir);

  /* Contesta si quedó guardado: el casillero del mail por venta se marca al
     tocarlo y tiene que volver atrás si el servidor dijo que no. */
  async function guardar(seccion: string, cuerpo: Record<string, unknown>): Promise<boolean> {
    if (enVuelo.current) return false;
    enVuelo.current = true;
    setError("");
    setListo(null);
    setGuardando(seccion);
    try {
      const r = await fetch("/api/digitales/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "No pudimos guardar.");
        return false;
      }
      /* La dirección se relee de la respuesta: el servidor la normaliza, así que
         lo que quedó guardado puede no ser lo que se escribió. Sin esto, la
         pantalla sigue mostrando "Mis Guías" y la base dice "mis-guias". */
      if (typeof data.slug === "string") setDir(data.slug);
      setListo(seccion);
      return true;
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
      return false;
    } finally {
      enVuelo.current = false;
      setGuardando(null);
    }
  }

  async function subirLogo(file: File) {
    if (enVuelo.current) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Eso no es una imagen.");
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setError(`El logo no puede pesar más de ${MAX_LOGO_MB} MB.`);
      return;
    }
    enVuelo.current = true;
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) {
        setError(data.error ?? "No pudimos subir el logo.");
        return;
      }
      setImg(data.url as string);
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    } finally {
      enVuelo.current = false;
      setSubiendo(false);
    }
  }

  async function desconectarCobro() {
    if (enVuelo.current) return;
    if (!window.confirm(
      "Si desconectás Mercado Pago dejás de poder cobrar: tus páginas publicadas no van a poder tomar ninguna compra. Lo podés volver a conectar cuando quieras."
    )) return;
    enVuelo.current = true;
    setGuardando("cobro");
    try {
      const r = await fetch("/api/mp/oauth/disconnect", { method: "POST" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? "No pudimos desconectarlo.");
        enVuelo.current = false;
        setGuardando(null);
        return;
      }
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos.");
      enVuelo.current = false;
      setGuardando(null);
    }
  }

  return (
    <div>
      {/* ── Las pestañas ───────────────────────────────────────────────────
          Se van para los costados en el celular en vez de apilarse: apiladas
          se comen la pantalla entera antes de llegar al primer campo. */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 mb-5 overflow-x-auto">
        <div className="flex items-center gap-2 w-max">
          {PESTANAS.map(({ id, label, Icon, lista }) => {
            const activa = pestana === id;
            return (
              <button
                key={id}
                onClick={() => setPestana(id)}
                className={`inline-flex items-center gap-2 shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  activa
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white panel-oscuro:bg-gray-900 text-gray-600 panel-oscuro:text-gray-400 border-gray-200 panel-oscuro:border-gray-700 hover:border-gray-300 panel-oscuro:hover:border-gray-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {!lista && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${activa ? "bg-white panel-oscuro:bg-gray-900/50" : "bg-gray-300"}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 panel-oscuro:border-red-500/30 bg-red-50 panel-oscuro:bg-red-500/10 px-5 py-4 mb-5">
          <p className="text-sm font-medium text-red-700 panel-oscuro:text-red-300 break-words">{error}</p>
        </div>
      )}

      {pestana === "general" && (
        <TabGeneral
          nom={nom} setNom={setNom}
          checkout={checkout} setCheckout={setCheckout}
          dir={dir} setDir={setDir}
          mail={mail} setMail={setMail}
          mailPorVenta={mailPorVenta} setMailPorVenta={setMailPorVenta}
          img={img} setImg={setImg}
          iaProd={iaProd} setIaProd={setIaProd}
          iaDesc={iaDesc} setIaDesc={setIaDesc}
          tema={tema} setTema={setTema}
          guardando={guardando}
          listo={listo}
          subiendo={subiendo}
          guardar={guardar}
          subirLogo={subirLogo}
          nombreOriginal={p.nombre}
          slugOriginal={p.slug}
          dirLimpia={dirLimpia}
          publicados={p.publicados}
          base={p.base}
          problemaNombre={problemaNombre}
          problemaCheckout={problemaCheckout}
          problemaDir={problemaDir}
          problemaMail={problemaMail}
          problemaIA={problemaIA}
        />
      )}

      {pestana === "pagos" && (
        <TabPagos
          tier={p.tier}
          cobroConectado={p.cobroConectado}
          conectadoEl={p.conectadoEl}
          avisoMp={p.avisoMp}
          guardando={guardando}
          desconectar={desconectarCobro}
        />
      )}

      {pestana === "legales" && (
        <TabLegales
          politicas={pols}
          setPolitica={(clave, valor) => setPols((prev) => ({ ...prev, [clave]: valor }))}
          guardando={guardando}
          listo={listo}
          guardar={guardar}
          hrefLegales={p.hrefLegales}
        />
      )}

      {pestana === "meta" && (
        <TabMeta
          pixel={pixel} setPixel={setPixel}
          ga={ga} setGa={setGa}
          clarity={clarity} setClarity={setClarity}
          problemaClarity={problemaClarity}
          guardando={guardando}
          listo={listo}
          guardar={guardar}
          problemaPixel={problemaPixel}
          problemaGa={problemaGa}
        />
      )}

      {pestana === "dominio" && (
        <Seccion
          Icono={Globe}
          titulo="Dominio propio"
          bajada="Que tu página viva en tu propia dirección (mecanicafacil.com) en vez de colgar de la nuestra."
        >
          <p className="text-sm leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
            El dominio va <strong className="font-bold">por producto</strong>, no por cuenta: cada página de
            venta puede tener el suyo. Se conecta desde el producto, en{" "}
            <strong className="font-bold">Cambiar la dirección</strong>. Es de los planes Pro.
          </p>
          <div className="mt-4">
            <Link
              href="/digitales/productos"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-500"
            >
              Ir a tus productos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Seccion>
      )}
    </div>
  );
}
