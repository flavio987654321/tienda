"use client";

import { useEffect, useState, useRef, useMemo, useSyncExternalStore } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

type Step = {
  tourId: string;
  title: string;
  body: string;
};

const STEPS_DEFAULT: Step[] = [
  {
    tourId: "inicio",
    title: "Panel principal",
    body: "Acá ves el resumen de tu tienda: ventas, pedidos, afiliados y la guía de configuración inicial.",
  },
  {
    tourId: "productos",
    title: "Tus productos",
    body: "Agregá, editá o importá productos desde un CSV. Con al menos uno ya podés compartir tu tienda.",
  },
  {
    tourId: "pedidos",
    title: "Pedidos",
    body: "Cuando un cliente compre, el pedido aparece acá. Confirmá, marcá como enviado y entregado.",
  },
  {
    tourId: "cupones",
    title: "Cupones de descuento",
    body: "Creá códigos de descuento para tus clientes: monto fijo o porcentaje, límite de usos y fecha de vencimiento.",
  },
  {
    tourId: "carritos-abandonados",
    title: "Carritos abandonados",
    body: "Cuando alguien agrega productos pero no termina la compra, aparece acá. Podés enviarle un recordatorio automático por email.",
  },
  {
    tourId: "pagos",
    title: "Pagos y envíos",
    body: "Configurá cómo cobrar (CBU, alias o efectivo) y definí tus opciones de envío — precio fijo o 'a coordinar'. Los clientes ven todo esto al finalizar su compra.",
  },
  {
    tourId: "afiliados",
    title: "Afiliados",
    body: "Invitá vendedoras que promocionen tu tienda y cobrá por cada venta que generen. Requiere tener MercadoPago conectado — las comisiones se acreditan automáticamente.",
  },
  {
    tourId: "notificaciones",
    title: "Notificaciones push",
    body: "Enviá mensajes directos a visitantes que activaron notificaciones en tu tienda. Disponible en plan Premium.",
  },
  {
    tourId: "diseno",
    title: "Diseño de tu tienda",
    body: "Elegí una plantilla y personalizá colores, imágenes y textos para que tu tienda sea única.",
  },
  {
    tourId: "configuracion",
    title: "Configuración",
    body: "Subí tu logo, configurá el subdominio y conectá tu dominio propio si tenés plan Premium.",
  },
];

const STEPS_AUTOS: Step[] = [
  {
    tourId: "inicio",
    title: "Panel principal",
    body: "Acá ves el resumen de tu concesionaria: consultas recibidas, vehículos disponibles y la guía de configuración inicial.",
  },
  {
    tourId: "productos",
    title: "Tus vehículos",
    body: "Cargá autos, motos o camionetas con fotos, precio, ficha técnica y estado (Disponible / Reservado / Vendido).",
  },
  {
    tourId: "consultas",
    title: "Consultas de clientes",
    body: "Cuando alguien complete el formulario de contacto, la consulta aparece acá. Podés responder por WhatsApp desde el panel.",
  },
  {
    tourId: "pagos",
    title: "Legal y políticas",
    body: "Cargá tus términos y condiciones y política de devoluciones. Tus clientes pueden acceder desde el pie de página de tu sitio.",
  },
  {
    tourId: "afiliados",
    title: "Afiliados",
    body: "Invitá vendedores externos que traigan clientes. Vos definís la comisión por venta concretada. La comisión se acredita automáticamente cuando confirmás la consulta en el panel.",
  },
  {
    tourId: "notificaciones",
    title: "Notificaciones push",
    body: "Enviá novedades o alertas de nuevos vehículos a personas que activaron notificaciones en tu sitio. Disponible en plan Premium.",
  },
  {
    tourId: "diseno",
    title: "Diseño de tu sitio",
    body: "Elegí plantilla y personalizá colores, banners y textos para mostrar tu flota de manera profesional.",
  },
  {
    tourId: "configuracion",
    title: "Configuración",
    body: "Subí tu logo, configurá el subdominio y conectá tu dominio propio si tenés plan Premium.",
  },
];

function getSteps(storeType?: string | null): Step[] {
  return storeType === "AUTOS" ? STEPS_AUTOS : STEPS_DEFAULT;
}

export const TOUR_STORAGE_KEY = "tiendaapps_tour_done";

export default function TourGuide({ onDone, storeType }: { onDone: () => void; storeType?: string | null }) {
  const STEPS = useMemo(() => getSteps(storeType), [storeType]);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);

  /* Se pregunta el ancho en vez de guardarlo al montar.
     Era `useState(false)` más un efecto que lo corregía: un render entero de más,
     y encima el valor quedaba clavado en el del momento de abrir el tour — si
     girabas el teléfono o achicabas la ventana, el tour seguía dibujándose para el
     tamaño anterior. Así se entera de los dos. El `false` del final es lo que
     contesta el servidor, donde no hay `window`. */
  const isMobile = useSyncExternalStore(
    (avisar) => {
      window.addEventListener("resize", avisar);
      return () => window.removeEventListener("resize", avisar);
    },
    () => window.innerWidth < 1024,
    () => false,
  );

  // Track element position via rAF so tooltip follows sidebar animations (desktop only)
  useEffect(() => {
    if (isMobile) return;
    function track() {
      const el = document.querySelector(`[data-tour="${STEPS[step].tourId}"]`);
      if (el) setRect(el.getBoundingClientRect());
      frameRef.current = requestAnimationFrame(track);
    }
    frameRef.current = requestAnimationFrame(track);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [step, isMobile, STEPS]);

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  function finish() {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    onDone();
  }

  const current = STEPS[step];

  // Shared step controls rendered inline (not a nested component to avoid hooks rule)
  const controls = (
    <>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {step + 1} / {STEPS.length}
        </span>
        <button onClick={finish} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3 className="font-bold text-gray-900 text-sm mb-1">{current.title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{current.body}</p>
      <div className="flex items-center gap-1 mt-3 mb-3">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === step ? "bg-indigo-500 w-4" : "bg-gray-200 w-1.5 hover:bg-gray-300"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          disabled={step === 0}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-all"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Anterior
        </button>
        <button
          onClick={next}
          className="flex items-center gap-1 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          {step === STEPS.length - 1 ? "Finalizar" : "Siguiente"}
          {step < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </>
  );

  // Mobile: centered bottom sheet (sidebar elements are hidden on mobile)
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={finish} />
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-6">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-full max-w-sm mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {controls}
          </div>
        </div>
      </>
    );
  }

  // Desktop: anchored tooltip next to the highlighted sidebar element
  if (!rect) return null;

  const TOOLTIP_W = 272;
  const OFFSET = 14;
  const tooltipLeft = rect.right + OFFSET;
  const tooltipTopRaw = rect.top + rect.height / 2;
  const tooltipTop = Math.max(12, Math.min(tooltipTopRaw, window.innerHeight - 220));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={finish} />

      {/* Highlight ring */}
      <div
        className="fixed z-[9999] rounded-lg pointer-events-none transition-all duration-150"
        style={{
          top: rect.top - 3,
          left: rect.left - 3,
          width: rect.width + 6,
          height: rect.height + 6,
          boxShadow: "0 0 0 3px #6366f1, 0 0 0 6px rgba(99,102,241,0.25)",
        }}
      />

      {/* Tooltip bubble */}
      <div
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 transition-all duration-150"
        style={{ width: TOOLTIP_W, left: tooltipLeft, top: tooltipTop, transform: "translateY(-50%)" }}
      >
        {/* Arrow */}
        <div
          className="absolute"
          style={{
            left: -8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: "8px solid white",
          }}
        />
        {/* Arrow shadow layer */}
        <div
          className="absolute"
          style={{
            left: -10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "9px solid transparent",
            borderBottom: "9px solid transparent",
            borderRight: "9px solid #f3f4f6",
            zIndex: -1,
          }}
        />
        {controls}
      </div>
    </>
  );
}
