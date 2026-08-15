"use client";

import { useRef, useState } from "react";
import { MessageCircle, Link2, Search, DollarSign, Save, Check, Loader2 } from "lucide-react";

/* Las cuatro preferencias que antes vivían dentro del modal "Configuración
   avanzada" del editor de diseño. Se mudaron porque para cambiarlas había que
   entrar a Diseño, abrir una plantilla, entrar a editar y buscar el engranaje —
   y porque el editor está bloqueado abajo de 1024px, así que desde el celular no
   había forma de tocar el número de WhatsApp de la tienda.

   Cada tarjeta guarda lo suyo contra /api/configuracion/preferencias, que pisa
   solo las claves que le manda. Ninguna necesita conocer el diseño. */

type Whatsapp = { enabled: boolean; number: string; message?: string };
type SocialLinks = { instagram?: string; facebook?: string; tiktok?: string; youtube?: string; pinterest?: string };
type Seo = { enabled: boolean; title: string; description: string };

/** Guardado compartido: candado sincrónico, estado de carga y mensajes. */
function useGuardado() {
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  // El ref y no `guardando`: el estado recién bloquea en el render siguiente, y
  // dos clicks rápidos mandan los dos PATCH.
  const enviando = useRef(false);

  /** `true` si quedó guardado. El llamador lo usa para mover su punto de partida
      sólo cuando el servidor aceptó — moverlo igual haría que un guardado fallido
      se vea como si no hubiera nada pendiente. */
  async function guardar(payload: unknown): Promise<boolean> {
    if (enviando.current) return false;
    enviando.current = true;
    setGuardando(true);
    setGuardado(false);
    setError("");
    try {
      const res = await fetch("/api/configuracion/preferencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo guardar. Intentá de nuevo.");
        return false;
      }
      setGuardado(true);
      return true;
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      return false;
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return { guardar, guardando, guardado, error };
}

/* Los templates arman el link como `wa.me/` + los dígitos del número, sin
   agregarle nada. O sea que el número tiene que traer el código de país escrito,
   o el link no lleva a ninguna conversación — y el que se come el botón roto es
   el cliente que quiso escribir, no el dueño, así que puede estar así meses.

   Se acepta con "+" adelante (+54 9 2254 60-5521) o ya con el país pegado
   (5492254605521, 11 dígitos o más). Un número local suelto de 10 dígitos como
   "2254605521" es exactamente el caso roto y se rechaza. */
export function problemaDelTelefono(tel: string): string {
  const digitos = tel.replace(/\D/g, "");
  if (!digitos) return "Cargá el número para poder activarlo.";
  if (digitos.length < 8) return "Ese número es muy corto. Poné el número completo.";
  if (!tel.trim().startsWith("+") && digitos.length <= 10) {
    return "Falta el código de país: escribí +54 9 y después tu número, o el botón no abre ninguna conversación.";
  }
  return "";
}

/** ¿Cambió algo respecto de lo último guardado? Sirve para no ofrecer un
    "Guardar" que no guarda nada. */
function igual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* Pie de cada tarjeta: el aviso de guardado, el error y el botón.
   El "Guardado" NO se va solo a los dos segundos como antes. Se queda mientras
   lo que está en pantalla siga siendo lo último que se guardó, y desaparece en
   cuanto tocás algo. Con el cartel temporal, el que apretaba Guardar y miraba el
   teclado no llegaba a verlo nunca: veía el spinner y después un botón apagado,
   sin saber si había guardado o si se había roto. */
function PieDeTarjeta({ onClick, guardando, guardado, sinCambios, error, aviso }: {
  onClick: () => void;
  guardando: boolean;
  guardado: boolean;
  sinCambios: boolean;
  error?: string;
  aviso?: string;
}) {
  const confirmado = guardado && sinCambios && !error;
  return (
    <div className="space-y-3">
      {confirmado && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700">
          <Check className="h-4 w-4 shrink-0" />
          Listo, se guardó. Ya está aplicado en tu tienda.
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-red-500">{error || aviso}</span>
        <button
          onClick={onClick}
          disabled={guardando || sinCambios || !!aviso}
          className="flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : confirmado ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {guardando ? "Guardando..." : confirmado ? "Guardado" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5";

function Cabecera({ icon: Icono, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
      <Icono className="h-4 w-4 text-slate-400 shrink-0" />
      <h2 className="text-sm font-semibold text-slate-900">{children}</h2>
    </div>
  );
}

/* Aviso al pie de un campo, para lo que el título no dice y sorprende después.
   No se pone uno en cada campo a propósito: repetir con otras palabras lo que ya
   dice la etiqueta enseña que la ayuda es relleno, y el que aprende eso deja de
   leerla justo el día que el aviso importa. */
function Nota({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-slate-400">{children}</p>;
}

function Advertencia({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
      {children}
    </div>
  );
}

function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${value ? "bg-indigo-600" : "bg-slate-300"}`}
    >
      <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

/* ── WhatsApp ──────────────────────────────────────────────── */
export function WhatsappCard({ inicial }: { inicial: Whatsapp }) {
  const [wa, setWa] = useState<Whatsapp>(inicial);
  const [base, setBase] = useState<Whatsapp>(inicial);
  const { guardar, guardando, guardado, error } = useGuardado();

  const sinCambios = igual(wa, base);
  // Con el botón apagado el número no se usa, así que no se exige nada: se
  // guarda como está para que siga ahí cuando lo vuelvas a encender.
  const aviso = wa.enabled ? problemaDelTelefono(wa.number) : "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Cabecera icon={MessageCircle}>WhatsApp</Cabecera>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Botón flotante</p>
            <p className="text-xs text-slate-400 mt-0.5">Visible en todas las páginas de tu tienda</p>
          </div>
          <Switch value={wa.enabled} onChange={(v) => setWa({ ...wa, enabled: v })} label="Botón flotante de WhatsApp" />
        </div>

        {wa.enabled && (
          <>
            <div>
              <label className={labelCls}>Número</label>
              <input
                className={inputCls}
                value={wa.number}
                maxLength={25}
                inputMode="tel"
                placeholder="+54 9 11 0000-0000"
                /* Se filtran las letras al escribir, pero se dejan pasar el "+",
                   los espacios, los guiones y los paréntesis: son las formas en
                   que la gente escribe un teléfono, y los templates las limpian
                   solas. Filtrar de más obligaría a tipear el número corrido,
                   que es más fácil de equivocar y de releer mal. */
                onChange={(e) => setWa({ ...wa, number: e.target.value.replace(/[^\d+\s()-]/g, "") })}
              />
              {/* El formato libre es real: los templates arman el link con
                  `number.replace(/\D/g,"")`, o sea que espacios, guiones y
                  paréntesis se descartan solos. Lo que sí importa es el país. */}
              <Nota>Escribilo como quieras — los espacios y guiones se ignoran. Lo que no puede faltar es el código de país: <strong className="text-slate-500">+54</strong>.</Nota>
            </div>
            <div>
              <label className={labelCls}>Mensaje de bienvenida</label>
              <input
                className={inputCls}
                value={wa.message ?? ""}
                maxLength={300}
                placeholder="Hola! Me gustaría consultar sobre sus productos 😊"
                onChange={(e) => setWa({ ...wa, message: e.target.value })}
              />
              <p className="mt-1.5 text-xs text-slate-400">Se pre-carga cuando el cliente toca el botón.</p>
            </div>
          </>
        )}

        <PieDeTarjeta
          onClick={async () => { if (await guardar({ whatsapp: wa })) setBase(wa); }}
          guardando={guardando} guardado={guardado} sinCambios={sinCambios}
          error={error} aviso={aviso}
        />
      </div>
    </div>
  );
}

/* ── Redes sociales ────────────────────────────────────────── */
const REDES = [
  ["instagram", "Instagram", "https://instagram.com/tutienda"],
  ["facebook",  "Facebook",  "https://facebook.com/tutienda"],
  ["tiktok",    "TikTok",    "https://tiktok.com/@tutienda"],
  ["youtube",   "YouTube",   "https://youtube.com/@tutienda"],
  ["pinterest", "Pinterest", "https://pinterest.com/tutienda"],
] as const;

export function RedesCard({ inicial }: { inicial: SocialLinks }) {
  const [redes, setRedes] = useState<SocialLinks>(inicial);
  const [base, setBase] = useState<SocialLinks>(inicial);
  const { guardar, guardando, guardado, error } = useGuardado();

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Cabecera icon={Link2}>Redes sociales</Cabecera>
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-slate-500">Aparecen en el pie de tu tienda. Las que dejes vacías no se muestran.</p>
        {/* Se dice antes y no como error después: el servidor rechaza cualquier
            cosa que no sea una dirección web, y el motivo es que estos links se
            abren en el navegador de quien visita la tienda. */}
        <Nota>Pegá el link completo, arrancando con <strong className="text-slate-500">https://</strong> — no el nombre de usuario suelto.</Nota>
        <div className="space-y-3">
          {REDES.map(([key, label, ph]) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input
                className={inputCls}
                value={redes[key] ?? ""}
                maxLength={200}
                placeholder={ph}
                onChange={(e) => setRedes({ ...redes, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <PieDeTarjeta
          onClick={async () => { if (await guardar({ socialLinks: redes })) setBase(redes); }}
          guardando={guardando} guardado={guardado} sinCambios={igual(redes, base)}
          error={error}
        />
      </div>
    </div>
  );
}

/* ── Moneda ────────────────────────────────────────────────── */
export function MonedaCard({ inicial }: { inicial: "ARS" | "USD" }) {
  const [moneda, setMoneda] = useState(inicial);
  const [base, setBase] = useState(inicial);
  const { guardar, guardando, guardado, error } = useGuardado();

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Cabecera icon={DollarSign}>Moneda</Cabecera>
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-slate-500">Con la que se muestran los precios en tu tienda.</p>
        {/* La advertencia más importante de esta pantalla. Cambiar la moneda
            sólo cambia el símbolo: no hay conversión en ningún lado del código
            —ni acá, ni en los formateadores propios de los templates—, así que
            un producto cargado a 15000 pasa de "$15.000" a "USD 15.000" con el
            mismo número. Sin decirlo, el dueño cree que convirtió y publica una
            lista de precios ciento y pico de veces más cara. */}
        <Advertencia>
          Cambiar la moneda <strong>no convierte los precios</strong>: sólo cambia el símbolo.
          Un producto cargado a 15.000 pasa de mostrarse como $15.000 a USD 15.000.
          Si vas a vender en dólares, cargá de nuevo los precios de tus productos.
        </Advertencia>
        <div className="flex gap-2">
          {(["ARS", "USD"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMoneda(m)}
              className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                moneda === m ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {m === "ARS" ? "$ Pesos (ARS)" : "USD Dólares"}
            </button>
          ))}
        </div>
        <PieDeTarjeta
          onClick={async () => { if (await guardar({ currency: moneda })) setBase(moneda); }}
          guardando={guardando} guardado={guardado} sinCambios={moneda === base}
          error={error}
        />
      </div>
    </div>
  );
}

/* ── SEO ───────────────────────────────────────────────────── */
export function SeoCard({ inicial }: { inicial: Seo }) {
  const [seo, setSeo] = useState<Seo>(inicial);
  const [base, setBase] = useState<Seo>(inicial);
  const { guardar, guardando, guardado, error } = useGuardado();

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Cabecera icon={Search}>SEO / Google</Cabecera>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Activar SEO</p>
            <p className="text-xs text-slate-400 mt-0.5">El título y la descripción con los que aparecés en Google</p>
          </div>
          <Switch value={seo.enabled} onChange={(v) => setSeo({ ...seo, enabled: v })} label="Activar SEO" />
        </div>

        {/* Apagado NO deja la tienda sin datos en Google: se cae al nombre y a
            la descripción breve (ver el armado del título en la página pública
            de la tienda). Decirlo evita las dos confusiones: la de creer que sin
            esto no aparecés, y la de no entender de dónde sale lo que aparece. */}
        {!seo.enabled && (
          <Nota>
            Apagado no te deja afuera de Google: se usa el nombre de tu tienda y la{" "}
            <strong className="text-slate-500">descripción breve</strong> que cargaste en Identidad.
            Activalo sólo si querés escribir algo distinto.
          </Nota>
        )}

        {seo.enabled && (
          <>
            <div>
              <label className={labelCls}>Título</label>
              <input
                className={inputCls}
                value={seo.title}
                maxLength={120}
                placeholder="Mi Tienda - Ropa y Accesorios"
                onChange={(e) => setSeo({ ...seo, title: e.target.value })}
              />
              <p className="mt-1.5 text-xs text-slate-400">{seo.title.length}/120 · Google suele cortar cerca de los 60.</p>
            </div>
            <div>
              <label className={labelCls}>Descripción</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                value={seo.description}
                maxLength={320}
                placeholder="Encontrá los mejores productos en nuestra tienda..."
                onChange={(e) => setSeo({ ...seo, description: e.target.value })}
              />
              <p className="mt-1.5 text-xs text-slate-400">{seo.description.length}/320 · Google suele cortar cerca de los 160.</p>
            </div>
          </>
        )}

        <PieDeTarjeta
          onClick={async () => { if (await guardar({ seo })) setBase(seo); }}
          guardando={guardando} guardado={guardado} sinCambios={igual(seo, base)}
          error={error}
        />
      </div>
    </div>
  );
}
