import Image from "next/image";
import { ArrowLeft, Store, Video, Phone, Plus, Smile } from "lucide-react";
import type { PreviewProduct } from "./MetaCatalogPreview";

// Maqueta de "así se va a ver" para la ficha de Catálogo en WhatsApp.
//
// Mismo criterio que la de Meta (ver MetaCatalogPreview): dibujada con CSS y con
// los productos REALES del dueño, porque ver la propia remera adentro del chat
// convence mucho más que una captura genérica, y no hay que mantener screenshots
// cada vez que WhatsApp cambia su interfaz.
//
// Son dos pantallas porque son los dos momentos distintos que la dueña necesita
// entender: la vidriera que su cliente recorre solo, y el pedido que le llega al
// chat sin que ella tenga que escribir un precio.

const plata = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

// Verdes oficiales de WhatsApp: barra, burbuja propia y fondo del chat.
const VERDE_BARRA = "#075E54";
const VERDE_BURBUJA = "#DCF8C6";
const FONDO_CHAT = "#ECE5DD";

export default function WhatsAppCatalogPreview({
  storeName,
  products,
}: {
  storeName: string;
  products: PreviewProduct[];
}) {
  // La grilla del catálogo muestra 4; si hay menos se completa con placeholders.
  const grilla: (PreviewProduct | null)[] = Array.from({ length: 4 }, (_, i) => products[i] ?? null);
  const pedido = products.slice(0, 2);

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-emerald-50/40 to-white px-5 py-7 sm:px-8">
      <div className="text-center mb-7">
        <h3 className="text-base font-black text-slate-900">Así lo va a ver tu cliente</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          {products.length > 0
            ? "Con tus productos de verdad, los que ya tenés cargados en la tienda."
            : "Cuando cargues productos con foto, van a aparecer acá adentro."}
        </p>
      </div>

      {/* `items-stretch` + `flex-1` encadenados hasta la pantalla: los dos marcos
          terminan a la misma altura aunque el contenido mida distinto. */}
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-center gap-8 sm:gap-6">
        <Telefono etiqueta="Tu catálogo">
          <PantallaCatalogo productos={grilla} storeName={storeName} />
        </Telefono>
        <Telefono etiqueta="El pedido que te llega">
          <PantallaChat productos={pedido} />
        </Telefono>
      </div>
    </div>
  );
}

/* ── Marco del teléfono ─────────────────────────────────────────────────────── */

function Telefono({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex w-[190px] flex-1 flex-col rounded-[1.75rem] border-[5px] border-slate-900 bg-white shadow-xl overflow-hidden">
        <div className="relative h-4 shrink-0 bg-slate-900">
          <div className="absolute left-1/2 top-1 -translate-x-1/2 h-1.5 w-12 rounded-full bg-slate-700" />
        </div>
        {children}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{etiqueta}</span>
    </div>
  );
}

/* ── La vidriera dentro de WhatsApp ─────────────────────────────────────────── */

function PantallaCatalogo({
  productos,
  storeName,
}: {
  productos: (PreviewProduct | null)[];
  storeName: string;
}) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="flex items-center gap-2 px-2.5 py-2" style={{ backgroundColor: VERDE_BARRA }}>
        <ArrowLeft className="h-3 w-3 text-white/90 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-white truncate leading-tight">Catálogo</p>
          <p className="text-[7px] text-white/70 truncate leading-tight">{storeName}</p>
        </div>
        <Store className="h-3 w-3 text-white/90 shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-2">
        {productos.map((p, i) => (
          <div key={p?.id ?? `vacio-${i}`}>
            <div className="relative aspect-square rounded-md overflow-hidden bg-slate-100">
              {p ? (
                <Image src={p.image} alt={p.name} fill sizes="95px" className="object-cover" />
              ) : (
                <PlaceholderFoto />
              )}
            </div>
            <p className="text-[7px] text-slate-500 truncate leading-tight mt-1">
              {p ? p.name : "Tu producto"}
            </p>
            <p className="text-[8px] font-bold text-slate-900 leading-none mt-0.5">
              {p ? plata(p.price) : "$—"}
            </p>
          </div>
        ))}
      </div>

      {/* El botón que WhatsApp dibuja al pie del catálogo */}
      <div className="mt-auto px-2 pb-2.5 pt-1">
        <div
          className="rounded-full py-1.5 text-center text-[8px] font-bold text-white"
          style={{ backgroundColor: "#25D366" }}
        >
          Agregar al pedido
        </div>
      </div>

      <div className="h-1 shrink-0 bg-white">
        <div className="mx-auto h-0.5 w-10 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

/* ── El pedido llegando al chat ─────────────────────────────────────────────── */

function PantallaChat({ productos }: { productos: PreviewProduct[] }) {
  const total = productos.reduce((suma, p) => suma + p.price, 0);

  return (
    <div className="flex flex-1 flex-col" style={{ backgroundColor: FONDO_CHAT }}>
      <div className="flex items-center gap-1.5 px-2.5 py-2 shrink-0" style={{ backgroundColor: VERDE_BARRA }}>
        <ArrowLeft className="h-3 w-3 text-white/90 shrink-0" />
        {/* Avatar genérico, no la inicial de la tienda: esta pantalla es el chat
            CON una clienta, así que la foto de perfil es la de ella. */}
        <div className="h-5 w-5 shrink-0 rounded-full bg-white/25 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-white/80" fill="currentColor" aria-hidden="true">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold text-white truncate leading-tight">Cliente</p>
          <p className="text-[7px] text-white/70 leading-tight">en línea</p>
        </div>
        <Video className="h-2.5 w-2.5 text-white/90 shrink-0" />
        <Phone className="h-2.5 w-2.5 text-white/90 shrink-0" />
      </div>

      <div className="flex-1 px-2 py-2 space-y-1.5">
        {/* Mensaje del cliente */}
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg rounded-tl-none bg-white px-2 py-1 shadow-sm">
            <p className="text-[8px] text-slate-700 leading-snug">Hola! Vi tu catálogo 😍</p>
          </div>
        </div>

        {/* El pedido armado desde el catálogo */}
        <div className="flex justify-start">
          <div className="w-[85%] rounded-lg rounded-tl-none bg-white p-1.5 shadow-sm">
            <p className="text-[7px] font-bold uppercase tracking-wide text-slate-400 mb-1">Pedido</p>
            {productos.length > 0 ? (
              <>
                {productos.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 mb-1">
                    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded bg-slate-100">
                      <Image src={p.image} alt={p.name} fill sizes="24px" className="object-cover" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-[7px] text-slate-600 leading-tight">{p.name}</p>
                    <p className="text-[7px] font-bold text-slate-900 shrink-0">{plata(p.price)}</p>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1">
                  <span className="text-[7px] font-bold text-slate-500">Total</span>
                  <span className="text-[8px] font-black text-slate-900">{plata(total)}</span>
                </div>
              </>
            ) : (
              <p className="text-[7px] text-slate-400 leading-snug">
                Acá le llegan los productos que tu cliente eligió, con el total ya sumado.
              </p>
            )}
          </div>
        </div>

        {/* Tu respuesta */}
        <div className="flex justify-end">
          <div
            className="max-w-[80%] rounded-lg rounded-tr-none px-2 py-1 shadow-sm"
            style={{ backgroundColor: VERDE_BURBUJA }}
          >
            <p className="text-[8px] text-slate-700 leading-snug">
              Genial! Te lo preparo 💚
            </p>
          </div>
        </div>
      </div>

      {/* Barra de escritura */}
      <div className="flex items-center gap-1 px-1.5 py-1.5 shrink-0">
        <div className="flex flex-1 items-center gap-1 rounded-full bg-white px-2 py-1">
          <Smile className="h-2.5 w-2.5 text-slate-400 shrink-0" />
          <span className="text-[7px] text-slate-300 truncate">Mensaje</span>
          <Plus className="h-2.5 w-2.5 text-slate-400 shrink-0 ml-auto" />
        </div>
        <div
          className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#25D366" }}
        >
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="currentColor" aria-hidden="true">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PlaceholderFoto() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="currentColor" aria-hidden="true">
        <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
      </svg>
    </div>
  );
}
