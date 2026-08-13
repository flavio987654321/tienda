import Image from "next/image";
import { Heart, MessageCircle, Send, Bookmark, Search, Tag } from "lucide-react";

// Maqueta de "así se van a ver tus productos" para la ficha de Catálogo de Meta.
// Dibujada entera con CSS + los productos REALES del dueño: es mucho más
// convincente ver la propia remera etiquetada que una captura genérica de Meta,
// y además no hay que mantener screenshots cada vez que Facebook cambia su UI.
//
// Si la tienda todavía no tiene productos con foto, cae en bloques grises: la
// maqueta sigue explicando el concepto sin mostrar huecos rotos.

export type PreviewProduct = { id: string; name: string; price: number; image: string };

const plata = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export default function MetaCatalogPreview({
  storeName,
  products,
}: {
  storeName: string;
  products: PreviewProduct[];
}) {
  const destacado = products[0] ?? null;
  // La grilla de Facebook muestra 4; si hay menos se completa con placeholders.
  const grilla: (PreviewProduct | null)[] = Array.from({ length: 4 }, (_, i) => products[i] ?? null);
  const inicial = storeName.trim().charAt(0).toUpperCase() || "T";

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-5 py-7 sm:px-8">
      <div className="text-center mb-7">
        <h3 className="text-base font-black text-slate-900">Así se van a ver tus productos</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          {destacado
            ? "Con tus productos de verdad, los que ya tenés cargados en la tienda."
            : "Cuando cargues productos con foto, van a aparecer acá adentro."}
        </p>
      </div>

      {/* `items-stretch` + `flex-1` encadenados hasta la pantalla: así los dos
          marcos terminan a la misma altura aunque el contenido mida distinto, y
          las etiquetas de abajo quedan alineadas. */}
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-center gap-8 sm:gap-6">
        <Telefono etiqueta="Instagram">
          <PantallaInstagram producto={destacado} storeName={storeName} inicial={inicial} />
        </Telefono>
        <Telefono etiqueta="Facebook">
          <PantallaFacebook productos={grilla} storeName={storeName} inicial={inicial} />
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
        {/* Muesca superior */}
        <div className="relative h-4 shrink-0 bg-slate-900">
          <div className="absolute left-1/2 top-1 -translate-x-1/2 h-1.5 w-12 rounded-full bg-slate-700" />
        </div>
        {children}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{etiqueta}</span>
    </div>
  );
}

/* ── Post de Instagram con el producto etiquetado ───────────────────────────── */

function PantallaInstagram({
  producto,
  storeName,
  inicial,
}: {
  producto: PreviewProduct | null;
  storeName: string;
  inicial: string;
}) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Cabecera del post */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#FFDD55] via-[#FF543E] to-[#C837AB] p-[1.5px]">
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-[9px] font-black text-slate-700">
            {inicial}
          </div>
        </div>
        <span className="text-[10px] font-semibold text-slate-900 truncate">{storeName}</span>
      </div>

      {/* Foto con la etiqueta de producto */}
      <div className="relative aspect-square bg-slate-100">
        {producto ? (
          <Image
            src={producto.image}
            alt={producto.name}
            fill
            sizes="190px"
            className="object-cover"
          />
        ) : (
          <PlaceholderFoto />
        )}

        {/* La pastilla que Meta dibuja sobre la foto cuando el producto está etiquetado */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-1 shadow-md">
            <Tag className="h-2.5 w-2.5 text-slate-900 shrink-0" />
            <span className="text-[8px] font-bold text-slate-900 truncate">
              {producto ? producto.name : "Tu producto"}
            </span>
            <span className="text-[8px] font-black text-slate-900 shrink-0">
              {producto ? plata(producto.price) : "$—"}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <Heart className="h-3.5 w-3.5 text-slate-800" />
        <MessageCircle className="h-3.5 w-3.5 text-slate-800" />
        <Send className="h-3.5 w-3.5 text-slate-800" />
        <Bookmark className="h-3.5 w-3.5 text-slate-800 ml-auto" />
      </div>

      {/* Pie: el aviso que aparece cuando el post tiene productos */}
      <div className="mt-auto px-2.5 pb-3">
        <p className="text-[8px] text-slate-500 leading-tight">
          <span className="font-semibold text-slate-900">Ver productos</span> · Tocá para comprar
        </p>
      </div>
    </div>
  );
}

/* ── Pestaña Tienda de la página de Facebook ────────────────────────────────── */

function PantallaFacebook({
  productos,
  storeName,
  inicial,
}: {
  productos: (PreviewProduct | null)[];
  storeName: string;
  inicial: string;
}) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Cabecera de la página */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-slate-100">
        <div className="h-6 w-6 rounded-full bg-[#1877F2] flex items-center justify-center text-[9px] font-black text-white shrink-0">
          {inicial}
        </div>
        <span className="text-[10px] font-semibold text-slate-900 truncate flex-1">{storeName}</span>
        <Search className="h-3 w-3 text-slate-400 shrink-0" />
      </div>

      {/* Solapas, con Tienda activa */}
      <div className="flex items-center gap-3 px-2.5 pt-2">
        <span className="text-[9px] font-medium text-slate-400">Inicio</span>
        <span className="text-[9px] font-bold text-[#1877F2] border-b-2 border-[#1877F2] pb-1">Tienda</span>
        <span className="text-[9px] font-medium text-slate-400">Fotos</span>
      </div>

      {/* Grilla de productos */}
      <div className="grid grid-cols-2 gap-1.5 p-2 pt-2.5">
        {productos.map((p, i) => (
          <div key={p?.id ?? `vacio-${i}`}>
            <div className="relative aspect-square rounded-md overflow-hidden bg-slate-100">
              {p ? (
                <Image src={p.image} alt={p.name} fill sizes="95px" className="object-cover" />
              ) : (
                <PlaceholderFoto />
              )}
            </div>
            <p className="text-[8px] font-bold text-slate-900 mt-1 leading-none">
              {p ? plata(p.price) : "$—"}
            </p>
            <p className="text-[7px] text-slate-400 truncate leading-tight">
              {p ? p.name : "Tu producto"}
            </p>
          </div>
        ))}
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
