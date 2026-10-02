/**
 * Lo que se ve mientras carga una pantalla del panel de Productos Digitales.
 *
 * ⚠️ No existía. Todas las pantallas del panel se arman en el servidor, y sin un
 * `loading.tsx` tocar algo del menú NO HACÍA NADA hasta que la pantalla nueva
 * estaba entera: con señal lenta parecía colgado, y la gente tocaba dos o tres
 * veces. Con esto la respuesta es inmediata —la barra lateral queda, y el
 * contenido muestra la forma de lo que viene— y los datos llegan después.
 * Encontrado en la auditoría del 03/10/26.
 *
 * Cuatro formas, una por tipo de pantalla, para que al llegar los datos no
 * salte todo de lugar:
 *   - `inicio`: título, cuatro números y dos bloques (inicio, estadísticas).
 *   - `lista`: título y renglones (ventas, clientes, productos, carritos).
 *   - `formulario`: título, pestañas y campos (configuración, mi cuenta).
 *   - `editor`: dos columnas, la de la derecha es la previa (página, ebook).
 *
 * Va sin JavaScript (componente de servidor) y con `motion-safe:`: a quien
 * pidió menos movimiento en su sistema no se le hace titilar la pantalla.
 */

type Forma = "inicio" | "lista" | "formulario" | "editor";

const ANCHOS = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
} as const;

/* Un bloque gris que late. El color sigue el tema del panel. */
function B({ className = "" }: { className?: string }) {
  return <div className={`rounded-lg bg-gray-200 panel-oscuro:bg-gray-800 motion-safe:animate-pulse ${className}`} />;
}

function Tarjeta({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-gray-200 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-4 ${className}`}>
      {children}
    </div>
  );
}

export default function EsqueletoDelPanel({ forma, ancho = "3xl" }: { forma: Forma; ancho?: keyof typeof ANCHOS }) {
  if (forma === "editor") {
    return (
      <div role="status" aria-live="polite" className="p-4 sm:p-6 lg:p-8">
        <span className="sr-only">Cargando…</span>
        <B className="mb-5 h-4 w-32" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <B className="h-7 w-56" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Tarjeta key={i} className="space-y-3">
                <B className="h-4 w-40" />
                <B className="h-10 w-full" />
              </Tarjeta>
            ))}
          </div>
          {/* La previa: alta, como la página que se va a ver ahí. */}
          <Tarjeta className="hidden min-h-[70vh] lg:block">
            <B className="h-full min-h-[66vh] w-full" />
          </Tarjeta>
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={`mx-auto w-full ${ANCHOS[ancho]} px-4 sm:px-6 py-8`}>
      <span className="sr-only">Cargando…</span>

      {/* El título y su bajada: está en todas las pantallas. */}
      <B className="h-8 w-48" />
      <B className="mt-2 mb-6 h-4 w-72 max-w-full" />

      {forma === "inicio" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Tarjeta key={i} className="space-y-2">
                <B className="h-3 w-16" />
                <B className="h-7 w-20" />
              </Tarjeta>
            ))}
          </div>
          <Tarjeta className="mt-4 h-56">
            <B className="h-full w-full" />
          </Tarjeta>
          <Tarjeta className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <B key={i} className="h-10 w-full" />)}
          </Tarjeta>
        </>
      )}

      {forma === "lista" && (
        <Tarjeta className="divide-y divide-gray-100 panel-oscuro:divide-gray-800 p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <B className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <B className="h-4 w-2/3" />
                <B className="h-3 w-1/3" />
              </div>
              <B className="h-6 w-16 shrink-0" />
            </div>
          ))}
        </Tarjeta>
      )}

      {forma === "formulario" && (
        <>
          <div className="mb-5 flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => <B key={i} className="h-9 w-24 shrink-0 rounded-xl" />)}
          </div>
          <Tarjeta className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <B className="h-4 w-36" />
                <B className="h-11 w-full rounded-xl" />
              </div>
            ))}
            <B className="h-11 w-40 rounded-xl" />
          </Tarjeta>
        </>
      )}
    </div>
  );
}
